'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Settings, Save, Key, Globe, ShieldCheck } from 'lucide-react'

export default function SettingsPage() {
  const [authToken, setAuthToken] = useState('')
  const [originWebsite, setOriginWebsite] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
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
      }
      setLoading(false)
    }
    loadSettings()
  }, [supabase])

  const handleSave = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      // Upsert using user_id
      const { data: existing } = await supabase
          .from('user_settings')
          .select('id')
          .eq('user_id', user.id)
          .single()

      if (existing) {
         await supabase.from('user_settings').update({
             auth_token: authToken,
             origin_website: originWebsite,
             updated_at: new Date().toISOString()
         }).eq('user_id', user.id)
      } else {
         await supabase.from('user_settings').insert([{
             user_id: user.id,
             auth_token: authToken,
             origin_website: originWebsite
         }])
      }
      alert('API Configuration Saved Successfully!')
    }
    setSaving(false)
  }

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
            Configure your <span className="text-emerald-500 font-medium">11Za WhatsApp API</span> connection keys and origins.
          </h1>
        </div>
      </div>

      <div className="glass-card p-8 space-y-8">
         <div className="flex items-center gap-4 border-b border-white/5 pb-4">
            <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20">
               <ShieldCheck className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
               <h2 className="text-lg font-medium text-zinc-100">API Credentials</h2>
               <p className="text-sm text-zinc-500 font-light mt-1">These details are securely injected into the backend automation hooks.</p>
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

         <div className="pt-6 border-t border-white/5">
            <button 
              onClick={handleSave}
              disabled={saving}
              className="glass-card-green px-8 py-3 flex items-center gap-2 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)] hover:bg-emerald-500/20 transition-all font-semibold rounded-xl"
            >
              <Save className="h-5 w-5" />
              {saving ? 'Encrypting & Saving...' : 'Save Configuration'}
            </button>
         </div>
      </div>
    </div>
  )
}
