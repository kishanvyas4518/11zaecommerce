const supabase = require('./services/supabase');

// Run every 60 seconds
const POLLING_INTERVAL = 60000;
// Run cleanup every 24 hours
const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000;

async function executePendingAutomations() {
    try {
        const now = new Date().toISOString();

        // Find all scheduled jobs that are due
        const { data: jobs, error } = await supabase
            .from('automation_logs')
            .select('*')
            .eq('status', 'SCHEDULED')
            .lte('scheduled_for', now);

        if (error) {
            console.error('[Scheduler] Error fetching pending jobs:', error);
            return;
        }

        if (!jobs || jobs.length === 0) {
            return; // Nothing to execute
        }

        console.log(`[Scheduler] Found ${jobs.length} pending jobs preparing for execution.`);

        for (const job of jobs) {
            // Check if customer is blocked (safety net in case of race conditions)
            const { data: customerState } = await supabase
                .from('customer_states')
                .select('blocked_until')
                .eq('customer_id', job.customer_id)
                .single();

            const isBlocked = customerState?.blocked_until && new Date(customerState.blocked_until) > new Date();

            if (isBlocked) {
                // If blocked, cancel it instead of sending
                await supabase
                    .from('automation_logs')
                    .update({ status: 'CANCELLED', executed_at: new Date() })
                    .eq('id', job.id);
                console.log(`[Scheduler] Cancelled Job ${job.id} - Customer is blocked.`);
                continue;
            }

            // ============================================
            // 🚀 HERE IT WOULD HIT THE 11ZA WHATSAPP API
            // ============================================
            console.log(`[WhatsApp API] Preparing Template ${job.template_id} for Customer ${job.customer_id}...`);

            const { data: userSettings } = await supabase.from('user_settings').select('*').eq('user_id', job.user_id).single();
            if (!userSettings || !userSettings.auth_token) {
                console.error(`[Scheduler] Cancelled Job ${job.id} - Missing 11Za API AuthToken in Admin Settings.`);
                await supabase.from('automation_logs').update({ status: 'FAILED', executed_at: new Date() }).eq('id', job.id);
                continue;
            }

            let variableValues = {};
            let ruleTag = 'automated_reach';
            let customerPhone = '';
            let customerFirstName = 'Customer';
            let customerIdToUpdate = job.customer_id;
            let currentMessageCount = 0;
            let resolvedTemplateName = job.template_id;

            if (job.rule_id) {
                const { data: rule } = await supabase.from('automation_rules').select('template_variables_config, template_tag').eq('id', job.rule_id).single();
                const { data: customer } = await supabase.from('customers').select('*').eq('id', job.customer_id).single();
                const { data: recentEvents } = await supabase.from('events').select('payload').eq('customer_id', job.customer_id).order('created_at', { ascending: false }).limit(3);
                const latestEvent = recentEvents && recentEvents.length > 0 ? recentEvents[0] : null;
                const { data: wTemplate } = await supabase.from('whatsapp_templates').select('template_name, category, body').eq('template_id', job.template_id).single();

                if (wTemplate && wTemplate.template_name) {
                    resolvedTemplateName = wTemplate.template_name;
                }

                if (rule && rule.template_variables_config && customer) {
                    customerPhone = customer.phone;
                    customerFirstName = customer.first_name || 'Customer';
                    currentMessageCount = customer.message_count || 0;
                    ruleTag = rule.template_tag || 'automated_reach';

                    const config = rule.template_variables_config;
                    const vars = Object.keys(config).sort();

                    for (const varKey of vars) {
                        const mapping = config[varKey];

                        if (varKey.startsWith('button_')) {
                            let resolvedUrl = '';
                            if (mapping.source === 'EVENT_URL' && latestEvent && latestEvent.payload) {
                                const p = latestEvent.payload;
                                resolvedUrl = p?.eventVal?.checkout_url || p?.checkout_url || p?.eventVal?.product_url || p?.product_url || p?.url || '';
                            }
                            if (!resolvedUrl || String(resolvedUrl).trim() === '') {
                                resolvedUrl = mapping.fallback || '';
                            }
                            variableValues[varKey] = resolvedUrl;
                        } else {
                            // Handle Body Variable (starts with body_ or is just a number from legacy)
                            let resolvedVal = '';
                            if (mapping.source === 'DATABASE') {
                                if (mapping.field === 'last_event_type') {
                                    resolvedVal = customerState.last_event_type;
                                } else {
                                    resolvedVal = customer[mapping.field];
                                }
                            } else if (mapping.source === 'AI') {
                                // Determine which AI provider to use from user settings
                                const provider = userSettings?.ai_provider || 'gemini';
                                const aiApiKey = userSettings?.ai_api_key || process.env.GOOGLE_GEMINI_API_KEY;

                                if (aiApiKey) {
                                    try {
                                        // Build cart context from recent events
                                        let cartDetails = '';
                                        if (recentEvents) {
                                            const items = recentEvents.map(e => e.payload?.eventVal?.title || e.payload?.title || '').filter(Boolean);
                                            if (items.length > 0) cartDetails = `Customer recently interacted with: ${[...new Set(items)].join(', ')}`;
                                        }

                                        // Build strategy instruction
                                        let strategyInstruction = mapping.prompt || '';
                                        if (mapping.ai_strategy) {
                                            switch (mapping.ai_strategy) {
                                                case 'GREETING': strategyInstruction = `Write a friendly 1-sentence greeting. ${mapping.prompt || ''}`; break;
                                                case 'CART_REMINDER': strategyInstruction = `Write a 1-sentence reminder about their abandoned cart. Do not be pushy.`; break;
                                                case 'URGENCY': strategyInstruction = `Write a 1-sentence urgent marketing hook (e.g. stock running out or cart expiring).`; break;
                                                case 'DISCOUNT': strategyInstruction = `Write a 1-sentence offer including this discount: ${mapping.prompt || ''}.`; break;
                                                case 'TRUST': strategyInstruction = `Write a 1-sentence trust-building line regarding secure checkout or fast shipping.`; break;
                                                case 'HUMOROUS': strategyInstruction = `Write a 1-sentence funny or creative hook regarding their cart.`; break;
                                                case 'CUSTOM': strategyInstruction = mapping.prompt || ''; break;
                                            }
                                        }

                                        const systemPrompt = `SYSTEM INSTRUCTIONS:
You are an expert copywriter filling in a specific variable for a WhatsApp Message.
Target Variable Index: {{${varKey.replace('body_', '')}}}
Customer Name: ${customer.first_name || 'there'} ${customer.last_name || ''}
Intent Triggered: ${customerState.last_event_type}
${cartDetails}

Template Category: ${wTemplate?.category || 'UTILITY'}
Template Body Context:
"${wTemplate?.body || 'No template body found.'}"

CRITICAL RULES:
1. If Category is UTILITY: DO NOT generate marketing sentences, discounts, upselling, or promotional language.
2. If Category is MARKETING: Feel free to be persuasive, use emojis sensibly.
3. Keep it VERY short, only output the exact text to replace the variable. DO NOT use markdown or asterisks.

TASK / STRATEGY: 
${strategyInstruction}`;

                                        // ===== PROVIDER ROUTING =====
                                        if (provider === 'groq') {
                                            // Groq API (llama3-70b-8192 - stable model)
                                            const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                                                method: 'POST',
                                                headers: {
                                                    'Content-Type': 'application/json',
                                                    'Authorization': `Bearer ${aiApiKey}`
                                                },
                                                body: JSON.stringify({
                                                    model: 'llama-3.3-70b-versatile',
                                                    messages: [{ role: 'user', content: systemPrompt }],
                                                    max_tokens: 100,
                                                    temperature: 0.7
                                                })
                                            });
                                            const data = await resp.json();
                                            console.log(`[Groq] Raw Response:`, JSON.stringify(data).substring(0, 300));
                                            if (data.choices && data.choices[0]?.message?.content) {
                                                resolvedVal = data.choices[0].message.content.trim().replace(/\n/g, ' ');
                                                console.log(`[Groq] Generated value for ${varKey}:`, resolvedVal);
                                            } else if (data.error) {
                                                console.error(`[Groq] API Error:`, data.error.message);
                                            }
                                        } else {
                                            // Gemini API (Default)
                                            const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${aiApiKey}`, {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                    contents: [{ parts: [{ text: systemPrompt }] }],
                                                    generationConfig: { maxOutputTokens: 100, temperature: 0.7 }
                                                })
                                            });
                                            const data = await resp.json();
                                            if (data.candidates && data.candidates[0]?.content) {
                                                resolvedVal = data.candidates[0].content.parts[0].text.trim().replace(/\n/g, ' ');
                                            }
                                        }
                                        // ===========================

                                    } catch (e) {
                                        console.error(`[AI/${provider}] Generation failed for variable ${varKey}:`, e.message);
                                    }
                                } else {
                                    console.warn(`[AI] No API Key found in settings. Skipping AI generation for ${varKey}.`);
                                }
                            }

                            if (!resolvedVal || String(resolvedVal).trim() === '') {
                                resolvedVal = mapping.fallback || '';
                            }
                            variableValues[varKey] = resolvedVal;
                        }
                    }
                }
            }

            console.log(`[WhatsApp API] Payload Variables Resolved:`, variableValues);

            // Extract exact number of variables required by the 11za template
            let maxVarCount = 0;
            let wTemplateBody = "";

            // Re-fetch template body if it was scoped out, or we can just fetch it again to be safe
            // Actually, wTemplate is not available here due to scope, let's fetch it quickly
            const { data: wTempDoc } = await supabase.from('whatsapp_templates').select('body').eq('template_id', job.template_id).single();
            if (wTempDoc && wTempDoc.body) {
                wTemplateBody = wTempDoc.body;
                const matches = wTemplateBody.match(/\{\{(\d+)\}\}/g);
                if (matches) {
                    matches.forEach(m => {
                        const num = parseInt(m.match(/\d+/)[0]);
                        if (num > maxVarCount) maxVarCount = num;
                    });
                }
            }

            // Construct exactly sized array
            const dataVars = [];
            for (let i = 1; i <= maxVarCount; i++) {
                // Handle new 'body_1' format or legacy '1' format. Or default to space blank if missing.
                const val = variableValues[`body_${i}`] || variableValues[`${i}`] || " ";
                dataVars.push(val);
            }

            let btnVar = '';
            const btnKeys = Object.keys(variableValues).filter(k => k.startsWith('button_'));
            if (btnKeys.length > 0) {
                btnVar = variableValues[btnKeys[0]];
            }
            // Strict fallback for dynamic buttons: 11Za expects a valid button URL if the template has a URL variable
            if (!btnVar || typeof btnVar !== 'string' || btnVar.trim() === '') {
                btnVar = userSettings.origin_website || "https://tulsiresin.com";
            }

            const rawPhone = String(customerPhone || '').replace(/\D/g, '');

            if (!rawPhone || rawPhone.length < 10) {
                console.log(`[Scheduler] Dropping Job ${job.id} - Invalid Phone Number (${rawPhone})`);
                await supabase.from('automation_logs').update({ status: 'FAILED', executed_at: new Date() }).eq('id', job.id);
                continue;
            }

            const apiPayload = {
                authToken: userSettings.auth_token,
                name: customerFirstName,
                sendto: rawPhone,
                originWebsite: userSettings.origin_website || "https://example.com",
                templateName: resolvedTemplateName,
                language: "en",
                tags: ruleTag,
                data: dataVars,
                buttonValue: btnVar
            };

            console.log(`[WhatsApp API] Calling 11Za Payload for Job ${job.id}...`);

            try {
                const response = await fetch('https://api.11za.in/apis/template/sendTemplate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(apiPayload)
                });

                const json = await response.json().catch(() => null);
                console.log(`[WhatsApp API] Response from 11Za:`, json || response.statusText);

                if ((json && json.Status === 200) || response.ok) {
                    await supabase.from('automation_logs').update({ status: 'SENT', executed_at: new Date() }).eq('id', job.id);
                    await supabase.from('customers').update({
                        message_count: currentMessageCount + 1,
                        last_message_at: new Date().toISOString()
                    }).eq('id', customerIdToUpdate);

                    const blockDate = new Date();
                    blockDate.setHours(blockDate.getHours() + 24);
                    await supabase.from('customer_states').update({ blocked_until: blockDate }).eq('customer_id', customerIdToUpdate);
                    console.log(`[Scheduler] Executed Job ${job.id} Successfully & applied 24h block.`);
                } else {
                    await supabase.from('automation_logs').update({ status: 'FAILED', executed_at: new Date() }).eq('id', job.id);
                }
            } catch (err) {
                console.error(`[WhatsApp API] Network Error:`, err);
                await supabase.from('automation_logs').update({ status: 'FAILED', executed_at: new Date() }).eq('id', job.id);
            }
        }
    } catch (err) {
        console.error('[Scheduler] Generic Execution Error:', err);
    }
}

async function cleanOldData() {
    try {
        console.log('[Scheduler] Running Database Cleanup Job...');

        const now = new Date();

        // 1. Delete events older than 7 days
        const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000)).toISOString();
        const { error: eventErr } = await supabase
            .from('events')
            .delete()
            .lt('created_at', sevenDaysAgo);

        if (eventErr) console.error('[Cleanup] Events Error:', eventErr);
        else console.log(`[Cleanup] Processed old 'events' deletion.`);

        // 2. Delete automation logs older than 15 days (SENT or CANCELLED)
        const fifteenDaysAgo = new Date(now.getTime() - (15 * 24 * 60 * 60 * 1000)).toISOString();
        const { error: logErr } = await supabase
            .from('automation_logs')
            .delete()
            .in('status', ['SENT', 'CANCELLED', 'FAILED'])
            .lt('created_at', fifteenDaysAgo);

        if (logErr) console.error('[Cleanup] Automation Logs Error:', logErr);
        else console.log(`[Cleanup] Processed completed 'automation_logs' deletion.`);

        // 3. Delete NEW customer states older than 30 days
        const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000)).toISOString();
        const { error: stateErr } = await supabase
            .from('customer_states')
            .delete()
            .eq('customer_type', 'NEW')
            .lt('updated_at', thirtyDaysAgo);

        if (stateErr) console.error('[Cleanup] Customer States Error:', stateErr);
        else console.log(`[Cleanup] Processed stale 'customer_states' deletion.`);

        console.log('[Scheduler] Database Cleanup finished.');
    } catch (err) {
        console.error('[Scheduler] Database Cleanup Error:', err);
    }
}

function startScheduler() {
    console.log('[Scheduler] Cron job initialized. Polling every 60s...');
    // Initial Run
    setTimeout(executePendingAutomations, 5000);
    // Recurring
    setInterval(executePendingAutomations, POLLING_INTERVAL);

    console.log('[Scheduler] Cleanup job scheduled to run every 24h.');
    // Run cleanup soon after startup (e.g. 10 seconds), then every 24 hours
    setTimeout(cleanOldData, 10000);
    setInterval(cleanOldData, CLEANUP_INTERVAL);
}

module.exports = { startScheduler };
