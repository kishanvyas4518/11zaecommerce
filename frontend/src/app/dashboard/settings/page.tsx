'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Settings, Save, Key, Globe, ShieldCheck, Bot, ChevronDown, CheckCircle2 } from 'lucide-react'

const AI_PROVIDERS = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    model: 'gemini-2.5-flash',
    description: 'Best for general-purpose generation. Free tier available.',
    color: 'blue',
    keyPlaceholder: 'AIzaSy...',
    keyLink: 'https://aistudio.google.com/app/apikey',
    keyLabel: 'Get from Google AI Studio →'
  },
  {
    id: 'groq',
    name: 'Groq (Llama 3.1)',
    model: 'llama-3.1-70b-versatile',
    description: 'Ultra fast inference. Very generous free tier.',
    color: 'orange',
    keyPlaceholder: 'gsk_...',
    keyLink: 'https://console.groq.com/keys',
    keyLabel: 'Get from Groq Console →'
  }
]

export default function SettingsPage() {
  const [authToken, setAuthToken] = useState('')
  const [originWebsite, setOriginWebsite] = useState('')
  const [aiProvider, setAiProvider] = useState('gemini')
  const [aiApiKey, setAiApiKey] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  
  const supabase = createClient()

  useEffect(() => {
    async function loadSettings() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (data && !error) {
        setAuthToken(data.auth_token || '')
        setOriginWebsite(data.origin_website || '')
        setAiProvider(data.ai_provider || 'gemini')
        setAiApiKey(data.ai_api_key || '')
      }
      setLoading(false)
    }
    loadSettings()
  }, [supabase])

  const handleSave = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      const payload = {
        auth_token: authToken,
        origin_website: originWebsite,
        ai_provider: aiProvider,
        ai_api_key: aiApiKey,
        updated_at: new Date().toISOString()
      }

      const { data: existing } = await supabase
          .from('user_settings')
          .select('id')
          .eq('user_id', user.id)
          .single()

      if (existing) {
         await supabase.from('user_settings').update(payload).eq('user_id', user.id)
      } else {
         await supabase.from('user_settings').insert([{ user_id: user.id, ...payload }])
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
    setSaving(false)
  }

  const selectedProvider = AI_PROVIDERS.find(p => p.id === aiProvider) || AI_PROVIDERS[0]

  if (loading) return <div className="p-8 text-emerald-500 animate-pulse font-light">Loading configurations...</div>

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 relative">
      <div className="absolute top-[-150px] left-[-150px] w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none -z-10"></div>
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-4 border-b border-white/5">
        <div className="space-y-2">
          <p className="flex items-center gap-2 text-emerald-500 text-sm font-medium tracking-widest uppercase mb-4">
            <Settings className="h-4 w-4" />
            {'{ SYSTEM CONFIGURATION }'}
          </p>
          <h1 className="text-2xl font-light text-zinc-300 md:leading-relaxed max-w-2xl">
            Configure your <span className="text-emerald-500 font-medium">11Za WhatsApp API</span> and AI generation settings.
          </h1>
        </div>
      </div>

      {/* 11Za API Credentials */}
      <div className="glass-card p-8 space-y-8">
         <div className="flex items-center gap-4 border-b border-white/5 pb-4">
            <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20">
               <ShieldCheck className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
               <h2 className="text-lg font-medium text-zinc-100">11Za WhatsApp API Credentials</h2>
               <p className="text-sm text-zinc-500 font-light mt-1">Used to send WhatsApp template messages via the 11Za platform.</p>
            </div>
         </div>

         <div className="space-y-6 max-w-2xl">
            <div className="space-y-2">
               <label className="flex items-center gap-2 text-sm font-medium text-emerald-500">
                  <Key className="h-4 w-4" /> Auth Token
               </label>
               <input 
                  type="password"
                  value={authToken}
                  onChange={(e) => setAuthToken(e.target.value)}
                  placeholder="U2FsdGVkX1..."
                  className="w-full bg-[#0a0f0d]/80 border border-white/10 rounded-xl px-4 py-3 text-white font-mono focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
               />
               <p className="text-xs text-zinc-500 italic">Your secure 11Za token used for template delivery requests.</p>
            </div>

            <div className="space-y-2">
               <label className="flex items-center gap-2 text-sm font-medium text-blue-500">
                  <Globe className="h-4 w-4" /> Origin Website
               </label>
               <input 
                  type="url"
                  value={originWebsite}
                  onChange={(e) => setOriginWebsite(e.target.value)}
                  placeholder="https://tulsiresin.com"
                  className="w-full bg-[#0a0f0d]/80 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
               />
               <p className="text-xs text-zinc-500 italic">The domain assigned to your 11Za account templates.</p>
            </div>
         </div>
      </div>

      {/* AI Provider Selection */}
      <div className="glass-card p-8 space-y-8">
         <div className="flex items-center gap-4 border-b border-white/5 pb-4">
            <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20">
               <Bot className="h-5 w-5 text-amber-400" />
            </div>
            <div>
               <h2 className="text-lg font-medium text-zinc-100">AI Content Generation</h2>
               <p className="text-sm text-zinc-500 font-light mt-1">Select the AI provider used to generate dynamic template variables.</p>
            </div>
         </div>

         {/* Provider Toggle */}
         <div className="grid grid-cols-2 gap-4 max-w-2xl">
           {AI_PROVIDERS.map((provider) => (
             <button
               key={provider.id}
               onClick={() => setAiProvider(provider.id)}
               className={`relative p-4 rounded-xl border text-left transition-all ${
                 aiProvider === provider.id
                   ? provider.id === 'gemini'
                     ? 'border-blue-500/40 bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.1)]'
                     : 'border-orange-500/40 bg-orange-500/10 shadow-[0_0_20px_rgba(249,115,22,0.1)]'
                   : 'border-white/10 bg-white/5 hover:bg-white/[0.07]'
               }`}
             >
               {aiProvider === provider.id && (
                 <div className={`absolute top-3 right-3 ${provider.id === 'gemini' ? 'text-blue-400' : 'text-orange-400'}`}>
                   <CheckCircle2 className="h-4 w-4" />
                 </div>
               )}
               <div className={`text-sm font-bold mb-1 ${
                 aiProvider === provider.id
                   ? provider.id === 'gemini' ? 'text-blue-300' : 'text-orange-300'
                   : 'text-zinc-300'
               }`}>
                 {provider.name}
               </div>
               <div className="text-[10px] font-mono text-zinc-500 mb-2">Model: {provider.model}</div>
               <div className="text-xs text-zinc-400 font-light">{provider.description}</div>
             </button>
           ))}
         </div>

         {/* API Key Input */}
         <div className="space-y-2 max-w-2xl">
            <div className="flex items-center justify-between">
               <label className={`flex items-center gap-2 text-sm font-medium ${
                 aiProvider === 'gemini' ? 'text-blue-400' : 'text-orange-400'
               }`}>
                  <Key className="h-4 w-4" /> {selectedProvider.name} API Key
               </label>
               <a
                 href={selectedProvider.keyLink}
                 target="_blank"
                 rel="noopener noreferrer"
                 className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors underline underline-offset-2"
               >
                 {selectedProvider.keyLabel}
               </a>
            </div>
            <input 
               type="password"
               value={aiApiKey}
               onChange={(e) => setAiApiKey(e.target.value)}
               placeholder={selectedProvider.keyPlaceholder}
               className={`w-full bg-[#0a0f0d]/80 border rounded-xl px-4 py-3 text-white font-mono focus:outline-none transition-all ${
                 aiProvider === 'gemini'
                   ? 'border-blue-500/20 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20'
                   : 'border-orange-500/20 focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20'
               }`}
            />
            <p className="text-xs text-zinc-500 italic">
              This key is stored securely and used only during message scheduling.
            </p>
         </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center gap-4">
         <button 
           onClick={handleSave}
           disabled={saving}
           className={`px-8 py-3 flex items-center gap-2 font-semibold rounded-xl transition-all ${
             saved
               ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
               : 'glass-card-green text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)] hover:bg-emerald-500/20'
           }`}
         >
           {saved ? <CheckCircle2 className="h-5 w-5" /> : <Save className="h-5 w-5" />}
           {saving ? 'Saving...' : saved ? 'Saved!' : 'Save All Settings'}
         </button>
         {saved && <span className="text-xs text-emerald-500 font-light">All settings saved successfully.</span>}
      </div>
    </div>
  )
}
