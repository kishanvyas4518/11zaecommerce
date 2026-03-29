'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SlidersHorizontal, Save, Plus, Trash2, Power, PowerOff, Sparkles, Database } from 'lucide-react'

// Helper to extract variables from generic template bodies
const extractVariables = (text: string) => {
  if (!text) return [];
  const matches = text.match(/(?:\{\{)(\d+)(?:\}\})/g);
  if (!matches) return [];
  return Array.from(new Set(matches.map(m => m.replace(/[\{\}]/g, '')))).sort((a,b)=> Number(a) - Number(b));
}

// Helper to extract variables from button URLs
const extractButtonVariables = (buttonsJson: any[]) => {
  if (!Array.isArray(buttonsJson)) return [];
  const vars: string[] = [];
  buttonsJson.forEach(btn => {
     if (btn.type === 'URL' && btn.url) {
         const matches = btn.url.match(/(?:\{\{)(\d+)(?:\}\})/g);
         if (matches) {
            vars.push(...matches.map((m: string) => m.replace(/[\{\}]/g, '')));
         }
     }
  });
  return Array.from(new Set(vars)).sort((a,b)=> Number(a) - Number(b));
}

// Default Permutations based on User's Excel sheet
const DEFAULT_PERMUTATIONS = [
  { customer_type: 'NEW', last_event_type: 'VIEW', has_hie: false, delay_minutes: 2880, template_id: '' },
  { customer_type: 'NEW', last_event_type: 'CART', has_hie: false, delay_minutes: 1440, template_id: '' },
  // Existing View without HIE doesn't send anything usually, so we skip or mark inactive
  { customer_type: 'EXISTING', last_event_type: 'CART', has_hie: false, delay_minutes: 2880, template_id: '' },
  { customer_type: 'NEW', last_event_type: 'HIE', has_hie: true, delay_minutes: 30, template_id: '' },
  { customer_type: 'EXISTING', last_event_type: 'HIE', has_hie: true, delay_minutes: 30, template_id: '' },
  { customer_type: 'NEW', last_event_type: 'VIEW', has_hie: true, delay_minutes: 30, template_id: '' },
  { customer_type: 'NEW', last_event_type: 'CART', has_hie: true, delay_minutes: 120, template_id: '' },
  { customer_type: 'EXISTING', last_event_type: 'VIEW', has_hie: true, delay_minutes: 60, template_id: '' },
  { customer_type: 'EXISTING', last_event_type: 'CART', has_hie: true, delay_minutes: 120, template_id: '' }
]

export default function RulesPage() {
  const [rules, setRules] = useState<any[]>([])
  const [availableTemplates, setAvailableTemplates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function loadRules() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [rulesResponse, templatesResponse] = await Promise.all([
        supabase.from('automation_rules').select('*').eq('user_id', user.id).order('customer_type', { ascending: false }),
        supabase.from('whatsapp_templates').select('template_name, template_id, body, buttons_json').eq('user_id', user.id)
      ])

      if (templatesResponse.data && templatesResponse.data.length > 0) {
        setAvailableTemplates(templatesResponse.data)
      }

      if (rulesResponse.data && rulesResponse.data.length > 0) {
        setRules(rulesResponse.data)
      } else {
        // Hydrate default rules for new SaaS clients
        const newRules = DEFAULT_PERMUTATIONS.map(p => ({
          ...p,
          user_id: user.id,
          is_active: true
        }))
        const { data: insertedData } = await supabase.from('automation_rules').insert(newRules).select()
        if (insertedData) setRules(insertedData)
      }
      setLoading(false)
    }
    loadRules()
  }, [supabase])

  const updateRule = (id: string, field: string, value: any) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
  }

  const updateVariableConfig = (ruleId: string, varNum: string, field: string, value: any) => {
    setRules(prev => prev.map(r => {
      if (r.id === ruleId) {
        const config = { ...(r.template_variables_config || {}) };
        config[varNum] = { ...(config[varNum] || { source: 'DATABASE', field: 'first_name', prompt: '' }), [field]: value };
        return { ...r, template_variables_config: config };
      }
      return r;
    }))
  }

  const saveChanges = async () => {
    setSaving(true)
    for (const rule of rules) {
      await supabase.from('automation_rules')
        .update({ 
          delay_minutes: rule.delay_minutes, 
          template_id: String(rule.template_id),
          is_active: rule.is_active,
          template_variables_config: rule.template_variables_config || {},
          template_tag: rule.template_tag || null
        })
        .eq('id', rule.id)
    }
    setSaving(false)
    alert("Configuration Saved Successfully!")
  }

  if (loading) return <div className="p-8 text-green-500 animate-pulse font-light">Loading rule engine...</div>

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 relative">
      <div className="absolute top-[-100px] left-[-150px] w-[600px] h-[600px] bg-green-500/10 rounded-full blur-[120px] pointer-events-none -z-10"></div>
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-4 border-b border-white/5">
        <div className="space-y-2">
          <p className="flex items-center gap-2 text-green-500 text-sm font-medium tracking-widest uppercase mb-4">
            <SlidersHorizontal className="h-4 w-4" />
            {'{ POLICY ADMIN PANEL }'}
          </p>
          <h1 className="text-2xl font-light text-zinc-300 md:leading-relaxed max-w-2xl">
            Configure the specific timing and message bindings for your <span className="text-green-500 font-medium">automated targeting permutations</span>.
          </h1>
        </div>
        <button 
          onClick={saveChanges}
          disabled={saving}
          className="glass-card-green px-6 py-3 flex items-center gap-2 text-green-400 hover:bg-green-500/20 transition-all font-semibold"
        >
          <Save className="h-5 w-5" />
          {saving ? 'Updating Database...' : 'Save All Policies'}
        </button>
      </div>

      <div className="grid gap-4">
        <div className="grid grid-cols-12 gap-4 px-6 text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-2">
           <div className="col-span-2">Audience</div>
           <div className="col-span-2">Intent Touched</div>
           <div className="col-span-2">Delay (Min)</div>
           <div className="col-span-2">WhatsApp Template ID</div>
           <div className="col-span-3 text-emerald-500/60">Assigned Tag (11Za)</div>
           <div className="col-span-1 text-center">Tog</div>
        </div>

        {rules.map((rule) => {
          const selectedTemplateObj = availableTemplates.find(t => String(t.template_id) === String(rule.template_id) || t.template_name === String(rule.template_id));
          const variables = selectedTemplateObj ? extractVariables(selectedTemplateObj.body) : [];

          return (
            <div key={rule.id} className={`glass-card p-6 flex flex-col gap-4 transition-all ${!rule.is_active ? 'opacity-50' : 'hover:border-green-500/30'}`}>
              
              <div className="grid grid-cols-12 gap-4 items-center">
                <div className="col-span-2">
                <span className={`px-3 py-1 text-xs font-bold rounded-full ${rule.customer_type === 'NEW' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
                   {rule.customer_type}
                </span>
              </div>
              
              <div className="col-span-2 flex flex-col items-start gap-1">
                 <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${rule.has_hie ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
                   {rule.has_hie ? '+ CheckOut' : 'No Intent'}
                 </span>
                 <div className="font-mono text-[10px] text-zinc-500 pl-1">{rule.last_event_type}</div>
              </div>

              <div className="col-span-2">
                 <div className="flex items-center w-full bg-[#0a0f0d]/80 border border-white/10 rounded-lg overflow-hidden focus-within:border-green-500/50">
                   <button 
                     onClick={() => updateRule(rule.id, 'delay_minutes', Math.max(0, rule.delay_minutes - 5))}
                     className="px-2 py-2 text-zinc-400 hover:text-white hover:bg-white/5 transition-colors border-r border-white/5"
                   >-</button>
                   <input 
                     type="number"
                     className="w-full bg-transparent text-center text-white focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-sm"
                     value={rule.delay_minutes}
                     onChange={(e) => updateRule(rule.id, 'delay_minutes', parseInt(e.target.value) || 0)}
                   />
                   <button 
                     onClick={() => updateRule(rule.id, 'delay_minutes', rule.delay_minutes + 5)}
                     className="px-2 py-2 text-zinc-400 hover:text-white hover:bg-white/5 transition-colors border-l border-white/5"
                   >+</button>
                 </div>
              </div>

              <div className="col-span-2">
                 {availableTemplates.length > 0 ? (
                   <select 
                     className="w-full bg-[#0a0f0d]/80 border border-white/10 rounded-lg px-2 py-2 text-white font-mono focus:outline-none focus:border-green-500/50 appearance-none cursor-pointer text-xs"
                     value={availableTemplates.some(t => t.template_id === rule.template_id || t.template_name === rule.template_id) ? rule.template_id : ""}
                     onChange={(e) => updateRule(rule.id, 'template_id', e.target.value)}
                   >
                     <option value="" disabled>Select Template</option>
                     {availableTemplates.map(t => (
                       <option key={t.template_name} value={t.template_id || t.template_name}>
                         {t.template_name}
                       </option>
                     ))}
                   </select>
                 ) : (
                   <input 
                     type="text"
                     className="w-full bg-[#0a0f0d]/80 border border-white/10 rounded-lg px-2 py-2 text-white font-mono focus:outline-none focus:border-green-500/50 text-xs"
                     value={rule.template_id}
                     onChange={(e) => updateRule(rule.id, 'template_id', e.target.value)}
                     title="No templates synced yet. Go to Templates page."
                   />
                 )}
              </div>

              <div className="col-span-3">
                 <input 
                   type="text"
                   className="w-full bg-[#0a0f0d]/80 border border-emerald-500/20 rounded-lg px-3 py-2 text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 text-xs shadow-[0_0_10px_rgba(16,185,129,0.02)]"
                   placeholder="e.g. cart_abandonment"
                   value={rule.template_tag || ''}
                   onChange={(e) => updateRule(rule.id, 'template_tag', e.target.value)}
                 />
              </div>

              <div className="col-span-1 flex justify-center">
                 <button 
                   onClick={() => updateRule(rule.id, 'is_active', !rule.is_active)}
                   className={`p-1.5 rounded-lg transition-colors border ${rule.is_active ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-red-500/10 text-red-500 border-red-500/30'}`}
                 >
                   {rule.is_active ? <Power className="h-4 w-4" /> : <PowerOff className="h-4 w-4" />}
                 </button>
              </div>
              </div>

              {/* Vairables UI */}
              {(variables.length > 0 || (selectedTemplateObj && extractButtonVariables(selectedTemplateObj.buttons_json).length > 0)) && rule.is_active && (
                 <div className="mt-2 pt-4 border-t border-white/5 space-y-3">
                   <h4 className="text-xs font-semibold text-green-500/70 tracking-wider uppercase flex items-center gap-2">
                     <Database className="h-3 w-3" /> Dynamic Field Mapping
                   </h4>
                   <div className="grid gap-3 pl-2">
                      {/* Body Variables */}
                      {variables.map(v => {
                         const varKey = `body_${v}`;
                         const vConfig = rule.template_variables_config?.[varKey] || rule.template_variables_config?.[v] || { source: 'DATABASE', field: 'first_name', prompt: '', fallback: '' };
                         return (
                           <div key={varKey} className="flex flex-col gap-2 bg-[#0a0f0d]/50 p-3 rounded border border-white/5">
                              <div className="flex flex-wrap gap-4 items-center">
                                <div className="text-sm font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-1 rounded" title="Body Variable">
                                  B{'{{'}{v}{'}}'}
                                </div>
                                <select 
                                   className="bg-black/50 border border-white/10 rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-green-500/50"
                                   value={vConfig.source}
                                   onChange={(e) => updateVariableConfig(rule.id, varKey, 'source', e.target.value)}
                                >
                                  <option value="DATABASE">Database Field</option>
                                  <option value="AI">AI Generate</option>
                                </select>
                                
                                {vConfig.source === 'DATABASE' ? (
                                  <select 
                                     className="flex-1 min-w-[200px] bg-black/50 border border-white/10 rounded px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-green-500/50"
                                     value={vConfig.field}
                                     onChange={(e) => updateVariableConfig(rule.id, varKey, 'field', e.target.value)}
                                  >
                                     <option value="first_name">Customer First Name</option>
                                     <option value="last_name">Customer Last Name</option>
                                     <option value="email">Customer Email Address</option>
                                     <option value="phone">Customer Phone Number</option>
                                     <option value="last_event_type">Last Event Triggered (Intent)</option>
                                  </select>
                                ) : (
                                  <div className="flex-1 min-w-[300px] flex flex-col gap-2">
                                     <div className="flex items-center gap-2">
                                       <select 
                                         className="bg-[#0a0f0d]/80 border border-amber-500/20 rounded-md px-3 py-2 text-amber-500 text-xs focus:outline-none focus:border-amber-500/50 shadow-[inset_0_0_10px_rgba(245,158,11,0.05)] w-40"
                                         value={vConfig.ai_strategy || 'CUSTOM'}
                                         onChange={(e) => updateVariableConfig(rule.id, varKey, 'ai_strategy', e.target.value)}
                                       >
                                          <option value="CUSTOM">Custom Instruction</option>
                                          <option value="GREETING">Friendly Greeting</option>
                                          <option value="CART_REMINDER">Cart Reminder</option>
                                          <option value="URGENCY">Urgency / FOMO</option>
                                          <option value="DISCOUNT">Discount Offer</option>
                                          <option value="TRUST">Trust Building</option>
                                          <option value="HUMOROUS">Funny / Creative</option>
                                       </select>
                                       
                                       <div className="flex-1 flex items-center bg-[#0a0f0d]/50 border border-amber-500/20 rounded-md overflow-hidden focus-within:border-amber-500/50">
                                          <div className="px-3 text-amber-500/70 border-r border-amber-500/20">
                                             <Sparkles className="h-4 w-4" />
                                          </div>
                                          <input 
                                            type="text"
                                            placeholder={
                                               vConfig.ai_strategy === 'DISCOUNT' ? "e.g. 10% OFF or CODE: SAVE20" :
                                               vConfig.ai_strategy === 'GREETING' ? "Optional: Casual or formal tone?" :
                                               vConfig.ai_strategy === 'CUSTOM' || !vConfig.ai_strategy ? "e.g. Write a friendly 1-sentence greeting..." :
                                               "Automated AI strategy applied."
                                            }
                                            className="w-full bg-transparent border-none text-zinc-300 text-xs px-3 py-2 focus:outline-none focus:ring-0 placeholder:text-zinc-600 font-light disabled:opacity-30 disabled:cursor-not-allowed"
                                            value={vConfig.prompt || ''}
                                            onChange={(e) => updateVariableConfig(rule.id, varKey, 'prompt', e.target.value)}
                                            disabled={vConfig.ai_strategy && !['CUSTOM', 'DISCOUNT', 'GREETING'].includes(vConfig.ai_strategy)}
                                          />
                                       </div>
                                     </div>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-4 pl-[4.5rem]">
                                 <span className="text-xs text-zinc-500">Fallback:</span>
                                 <input 
                                   type="text"
                                   placeholder="If empty/fails, use this (e.g. 'Valued Customer')"
                                   className="flex-1 bg-black/30 border border-white/5 rounded px-3 py-1.5 text-xs text-zinc-400 focus:outline-none focus:border-zinc-500"
                                   value={vConfig.fallback || ''}
                                   onChange={(e) => updateVariableConfig(rule.id, varKey, 'fallback', e.target.value)}
                                 />
                              </div>
                           </div>
                         )
                      })}

                      {/* Button Variables */}
                      {selectedTemplateObj && extractButtonVariables(selectedTemplateObj.buttons_json).map(v => {
                         const varKey = `button_${v}`;
                         const vConfig = rule.template_variables_config?.[varKey] || { source: 'EVENT_URL', fallback: '' };
                         return (
                           <div key={varKey} className="flex flex-col gap-2 bg-blue-950/10 p-3 rounded border border-blue-500/10">
                              <div className="flex flex-wrap gap-4 items-center">
                                <div className="text-sm font-mono text-blue-400 font-bold bg-blue-500/10 px-2 py-1 rounded" title="Button Link Variable">
                                  🔗{'{{'}{v}{'}}'}
                                </div>
                                <select 
                                   className="bg-black/50 border border-white/10 rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500/50"
                                   value={vConfig.source}
                                   onChange={(e) => updateVariableConfig(rule.id, varKey, 'source', e.target.value)}
                                >
                                  <option value="EVENT_URL">Dynamic Event Payload URL</option>
                                  <option value="STATIC">Static Fallback Only</option>
                                </select>
                                <span className="text-xs text-zinc-500 italic">
                                  {vConfig.source === 'EVENT_URL' ? 'Extracts triggered action link (e.g. Cart URL)' : 'Always uses fallback link below'}
                                </span>
                              </div>
                              <div className="flex items-center gap-4 pl-[4.5rem]">
                                 <span className="text-xs text-zinc-500">Default URL Link:</span>
                                 <input 
                                   type="text"
                                   placeholder="e.g. https://www.mywebsite.com"
                                   className="flex-1 bg-black/30 border border-blue-500/20 rounded px-3 py-1.5 text-xs text-blue-200 focus:outline-none focus:border-blue-500"
                                   value={vConfig.fallback || ''}
                                   onChange={(e) => updateVariableConfig(rule.id, varKey, 'fallback', e.target.value)}
                                 />
                              </div>
                           </div>
                         )
                      })}
                   </div>
                 </div>
              )}

            </div>
          )
        })}
      </div>
    </div>
  )
}
