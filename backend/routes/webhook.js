const express = require('express');
const router = express.Router();
const supabase = require('../services/supabase');

// Webhook ingestion endpoint
router.post('/:webhook_id', async (req, res) => {
    try {
        const { webhook_id } = req.params;
        const payload = req.body;

        const { data: config, error: configError } = await supabase
            .from('configurations')
            .select('user_id')
            .eq('webhook_id', webhook_id)
            .single();

        if (configError || !config) {
            return res.status(401).json({ error: 'Invalid or missing webhook ID' });
        }

        const userId = config.user_id;
        res.status(200).json({ status: 'received' });

        processWebhookEvent(userId, payload).catch(err => {
            console.error('Error processing webhook event:', err);
        });

    } catch (err) {
        console.error('Webhook endpoint error:', err);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
});

async function processWebhookEvent(userId, payload) {
    let customerId = null;
    let email = payload?.eventVal?.customer?.email || payload?.customer?.email || payload?.email || null;
    let phone = payload?.eventVal?.customer?.phone || payload?.customer?.phone || payload?.phone || null;

    let fullName = payload?.eventVal?.customer?.name || payload?.customer?.name || null;
    let firstName = payload?.eventVal?.customer?.first_name || payload?.customer?.first_name || payload?.first_name || null;
    let lastName = payload?.eventVal?.customer?.last_name || payload?.customer?.last_name || payload?.last_name || null;

    if (fullName && !firstName && !lastName) {
        const parts = fullName.trim().split(' ');
        firstName = parts[0];
        if (parts.length > 1) {
            lastName = parts.slice(1).join(' ');
        }
    }

    // 🔴 Validation: Ignore events that don't have a phone number
    if (!phone) {
        return; 
    }

    let eventType = payload?.eventName || payload?.event_type || payload?.type || 'custom_event';

    const allowedEvents = [
        "addtocart", "category_view", "checkout", "hiu_tagged", 
        "orders/paid", "product_view", "removefromcart", "view"
    ];

    if (!allowedEvents.includes(eventType)) {
        return; 
    }

    // Identify / Upsert Customer
    if (email || phone) {
        let matchQuery = supabase.from('customers').select('id').eq('user_id', userId);

        if (email && phone) {
            matchQuery = matchQuery.or(`email.eq.${email},phone.eq.${phone}`);
        } else if (email) {
            matchQuery = matchQuery.eq('email', email);
        } else {
            matchQuery = matchQuery.eq('phone', phone);
        }

        const { data: existingCustomers, error: findError } = await matchQuery.limit(1);

        if (!findError && existingCustomers && existingCustomers.length > 0) {
            customerId = existingCustomers[0].id;
        } else {
            const { data: newCustomer, error: insertError } = await supabase
                .from('customers')
                .insert([{
                    user_id: userId, email, phone, first_name: firstName, last_name: lastName
                }])
                .select('id')
                .single();

            if (!insertError && newCustomer) {
                customerId = newCustomer.id;
            }
        }
    }

    // Store the raw event
    const { error: eventError } = await supabase
        .from('events')
        .insert([{
            user_id: userId,
            customer_id: customerId,
            event_type: eventType,
            payload: payload
        }]);

    if (eventError) {
        console.error('Failed to insert event object into database:', eventError);
    }

    // Run Automation State Engine
    if (customerId) {
        await evaluateAutomationState(userId, customerId, eventType);
    }
}

async function evaluateAutomationState(userId, customerId, eventType) {
    try {
        // 1. Fetch current state
        let { data: state, error: stateErr } = await supabase
            .from('customer_states')
            .select('*')
            .eq('customer_id', customerId)
            .single();
            
        if (stateErr || !state) {
            state = {
                customer_id: customerId,
                user_id: userId,
                customer_type: 'NEW',
                last_event_type: 'VIEW',
                has_hie: false,
                order_count: 0
            };
            await supabase.from('customer_states').insert([state]);
        }
        
        // 2. Check Time Blocks
        const now = new Date();
        const isBlocked = state.blocked_until && new Date(state.blocked_until) > now;

        // 3. Paid Event -> Block 10 days, Upgrade Type, Cancel Pending
        if (eventType === 'orders/paid') {
            const blockDate = new Date();
            blockDate.setDate(blockDate.getDate() + 10); // 10 Days cool-down
            
            await supabase.from('customer_states')
                .update({
                    customer_type: 'EXISTING',
                    order_count: (state.order_count || 0) + 1,
                    blocked_until: blockDate,
                    updated_at: new Date()
                })
                .eq('customer_id', customerId);
                
            // Purge all pending scheduled logs
            await supabase.from('automation_logs')
                .update({ status: 'CANCELLED' })
                .eq('customer_id', customerId)
                .eq('status', 'SCHEDULED');
                
            return; // Halt automation engine
        }
        
        // 4. Transform Intent String
        let newLastEventType = 'VIEW';
        if (['addtocart', 'removefromcart'].includes(eventType)) {
            newLastEventType = 'CART';
        } else if (['checkout', 'hiu_tagged'].includes(eventType)) {
            newLastEventType = 'HIE';
        }
        
        const newHasHie = state.has_hie || newLastEventType === 'HIE';
        
        // Update Customer State Log
        await supabase.from('customer_states')
            .update({
                last_event_type: newLastEventType,
                has_hie: newHasHie,
                updated_at: new Date()
            })
            .eq('customer_id', customerId);
            
        // If blocked by message delay, we updated their intent above, but do NOT schedule
        if (isBlocked) return;
        
        // 5. Query Rule Engine
        const { data: rule } = await supabase
            .from('automation_rules')
            .select('*')
            .eq('user_id', userId)
            .eq('customer_type', state.customer_type) // NEW or EXISTING
            .eq('last_event_type', newLastEventType)  // VIEW, CART, HIE
            .eq('has_hie', newHasHie)
            .eq('is_active', true)
            .single();
            
        if (rule) {
            // Cancel older pending schedules since this new event overrides intent
            await supabase.from('automation_logs')
                .update({ status: 'CANCELLED' })
                .eq('customer_id', customerId)
                .eq('status', 'SCHEDULED');
                
            // Schedule the job based on delay_minutes
            const scheduleDate = new Date();
            scheduleDate.setMinutes(scheduleDate.getMinutes() + rule.delay_minutes);
            
            await supabase.from('automation_logs')
                .insert([{
                    user_id: userId,
                    customer_id: customerId,
                    rule_id: rule.id,
                    status: 'SCHEDULED',
                    template_id: rule.template_id,
                    scheduled_for: scheduleDate
                }]);
                
            console.log(`[Engine] Scheduled Template ${rule.template_id} for Customer ${customerId} at ${scheduleDate}`);
        }

    } catch (err) {
         console.error('[Engine] Automation State Evaluation Error:', err);
    }
}

module.exports = router;
