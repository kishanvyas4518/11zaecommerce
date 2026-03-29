'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, Save, CheckCircle2, MessageSquare, AlertCircle, Trash2, ExternalLink, Image as ImageIcon } from 'lucide-react'

// --- Helper Components ---

const WhatsAppBubble = ({ template, renderBody }: { template: any, renderBody: (text: string) => React.ReactNode }) => {
  const [imgError, setImgError] = useState(false);
  const isSyncingFromApi = !!template.localizations;
  const loc = isSyncingFromApi ? template.localizations?.[0] : null;
  const components = isSyncingFromApi ? loc?.components : null;

  // Extract parts based on source (API vs DB)
  const headerType = isSyncingFromApi 
    ? components?.find((c: any) => c.type === 'HEADER')?.format 
    : template.header_type;
  
  const headerText = isSyncingFromApi 
    ? components?.find((c: any) => c.type === 'HEADER')?.text 
    : template.header_text;

  const headerUrl = isSyncingFromApi 
    ? (components?.find((c: any) => c.type === 'HEADER')?.example?.url || components?.find((c: any) => c.type === 'HEADER')?.example?.fileHandle)
    : template.header_url;

  const bodyText = isSyncingFromApi 
    ? (components?.find((c: any) => c.type === 'BODY')?.text || '') 
    : (template.body || '');

  const footerText = isSyncingFromApi 
    ? components?.find((c: any) => c.type === 'FOOTER')?.text 
    : template.footer_text;

  const buttons = isSyncingFromApi 
    ? (components?.find((c: any) => c.type === 'BUTTONS')?.buttons || []) 
    : (template.buttons_json || []);

  const status = isSyncingFromApi ? loc?.status : template.status;
  const category = isSyncingFromApi ? template.category : template.category;

  return (
    <div className="bg-[#1e2321] rounded-b-xl rounded-tr-xl border border-white/5 shadow-lg text-sm text-zinc-200 relative max-w-[95%] overflow-hidden flex flex-col">
      <div className="absolute top-0 -left-2 w-0 h-0 border-t-[10px] border-t-[#1e2321] border-l-[10px] border-l-transparent"></div>
      
      {/* Header */}
      {headerType === 'IMAGE' && headerUrl && (
        <div className="w-full h-32 bg-zinc-800 overflow-hidden relative group flex items-center justify-center">
          {!imgError ? (
            <img 
              src={headerUrl} 
              alt="Header" 
              className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 text-zinc-600">
               <ImageIcon className="h-8 w-8 opacity-20" />
               <span className="text-[10px] uppercase tracking-widest opacity-40">IMAGE_NOT_FOUND</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#1e2321] to-transparent pointer-events-none"></div>
        </div>
      )}
      
      <div className="p-4 space-y-3">
        {/* Status Badges */}
        <div className="flex gap-2">
           <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/20">
             {status || 'APPROVED'}
           </span>
           <span className="text-zinc-500 text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider">
             {(category || 'UTILITY').replace('_', ' ')}
           </span>
        </div>

        {headerType === 'TEXT' && headerText && (
          <div className="font-bold text-zinc-100 mb-1">{headerText}</div>
        )}

        {/* Body */}
        <div className="whitespace-pre-wrap leading-relaxed">
          {renderBody(bodyText)}
        </div>

        {/* Footer */}
        {footerText && (
          <div className="text-[11px] text-zinc-500 pt-1 border-t border-white/5">
            {footerText}
          </div>
        )}
      </div>

      {/* Buttons */}
      {buttons.length > 0 && (
        <div className="border-t border-white/5 divide-y divide-white/5">
          {buttons.map((btn: any, i: number) => (
            <div key={i} className="py-2.5 px-4 flex items-center justify-center gap-2 text-emerald-400 font-medium text-xs hover:bg-white/5 transition-colors cursor-default">
              {btn.type === 'URL' && <ExternalLink className="h-3 w-3" />}
              {btn.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default function TemplatesSyncPage() {
  const [authToken, setAuthToken] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [templates, setTemplates] = useState<any[]>([])
  const [syncedTemplates, setSyncedTemplates] = useState<any[]>([])
  const [syncedTemplateNames, setSyncedTemplateNames] = useState<Set<string>>(new Set())
  const [error, setError] = useState('')
  const [syncing, setSyncing] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    // Load existing synced templates to prevent duplicates
    async function loadSyncedTemplates() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      const { data } = await supabase
        .from('whatsapp_templates')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        
      if (data) {
        setSyncedTemplates(data)
        setSyncedTemplateNames(new Set(data.map(t => t.template_name)))
      }
    }
    loadSyncedTemplates()
  }, [supabase])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!authToken || !search) {
      setError('Auth Token and Template Name are required')
      return
    }
    
    setLoading(true)
    setError('')
    setTemplates([])

    try {
      const response = await fetch("https://api.11za.in/apis/template/getTemplatesAll", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authToken: authToken,
          limit: 10,
          page: 1,
          search: search
        })
      })

      const data = await response.json()
      // According to 11za response mapping
      const fetchedTemplates = data?.Data?.docs || [];
      
      if (Array.isArray(fetchedTemplates) && fetchedTemplates.length > 0) {
        setTemplates(fetchedTemplates)
      } else {
        setError('No templates found matching your search.')
      }
    } catch (err: any) {
      setError('Failed to fetch templates. Please check your Auth Token and network.')
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async (template: any) => {
    setSyncing(template.name)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const loc = template.localizations?.[0] || {}
      const components = loc.components || []
      
      let bodyText = ''
      let headerType = null
      let headerText = null
      let headerUrl = null
      let footerText = null
      let buttons: any[] = []
      
      let lang = loc.language || 'en'
      
      // Detailed extraction
      components.forEach((c: any) => {
        if (c.type === 'BODY') bodyText = c.text
        if (c.type === 'HEADER') {
          headerType = c.format
          if (c.format === 'TEXT') headerText = c.text
          if (c.format === 'IMAGE' || c.format === 'VIDEO' || c.format === 'DOCUMENT') {
            headerUrl = c.example?.url || c.example?.fileHandle
          }
        }
        if (c.type === 'FOOTER') footerText = c.text
        if (c.type === 'BUTTONS') buttons = c.buttons || []
      })

      const newDbTemplate = {
          user_id: user.id,
          template_name: template.name,
          template_id: template._id || template.id || template.name,
          category: template.category || 'UTILITY',
          status: loc.status || 'APPROVED',
          body: bodyText,
          language: lang,
          header_type: headerType,
          header_text: headerText,
          header_url: headerUrl,
          footer_text: footerText,
          buttons_json: buttons
      }

      const { data: inserted, error: insertErr } = await supabase
        .from('whatsapp_templates')
        .insert([newDbTemplate]).select().single()

      if (insertErr) throw insertErr

      // Add to synced set
      setSyncedTemplateNames(prev => new Set(prev).add(template.name))
      setSyncedTemplates(prev => [inserted, ...prev])
    } catch (err: any) {
      console.error(err)
      alert("Failed to sync template. Check if it already exists or if schema is updated.")
    } finally {
      setSyncing(null)
    }
  }

  const handleDelete = async (templateId: string, templateName: string) => {
    if (!confirm(`Are you sure you want to remove "${templateName}" from your synced library?`)) return

    try {
      const { error } = await supabase
        .from('whatsapp_templates')
        .delete()
        .eq('id', templateId)

      if (error) throw error

      setSyncedTemplates(prev => prev.filter(t => t.id !== templateId))
      setSyncedTemplateNames(prev => {
        const next = new Set(prev)
        next.delete(templateName)
        return next
      })
    } catch (err: any) {
      alert("Failed to delete template")
    }
  }

  // Helper to format body text with variable highlighting
  const renderBody = (text: string) => {
    if (!text) return 'No body text found.'
    // Highlight {{1}}, {{2}} etc.
    const parts = text.split(/(\{\{\d+\}\})/g)
    return parts.map((part, i) => {
      if (part.match(/\{\{\d+\}\}/)) {
        const num = part.replace(/[\{\}]/g, '')
        return <span key={i} className="bg-green-500/20 text-green-400 px-1 rounded font-mono text-sm">VARIABLE_{num}</span>
      }
      return <span key={i}>{part}</span>
    })
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 relative">
      <div className="absolute top-[-100px] right-[-150px] w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none -z-10"></div>
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-4 border-b border-white/5">
        <div className="space-y-2">
          <p className="flex items-center gap-2 text-emerald-500 text-sm font-medium tracking-widest uppercase mb-4">
            <MessageSquare className="h-4 w-4" />
            {'{ TEMPLATE REPOSITORY }'}
          </p>
          <h1 className="text-2xl font-light text-zinc-300 md:leading-relaxed max-w-2xl">
            Fetch, preview and sync your <span className="text-emerald-500 font-medium">WhatsApp Templates</span> from 11za.
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Search Panel */}
        <div className="lg:col-span-1 space-y-4">
          <div className="glass-card p-6 space-y-6 form-group">
            <h3 className="text-lg font-medium text-emerald-400">11za Connect</h3>
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-zinc-400 block">Auth Token</label>
                <input 
                  type="password"
                  value={authToken}
                  onChange={(e) => setAuthToken(e.target.value)}
                  className="w-full bg-[#0a0f0d]/80 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50"
                  placeholder="Paste your 11za Auth Token"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-zinc-400 block">Template Name</label>
                <input 
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-[#0a0f0d]/80 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50"
                  placeholder="e.g. hiu_tagged"
                />
              </div>
              <button 
                type="submit"
                disabled={loading}
                className="w-full glass-card-green px-6 py-3 flex items-center justify-center gap-2 text-emerald-400 hover:bg-emerald-500/20 transition-all font-semibold mt-4"
              >
                {loading ? <div className="h-5 w-5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" /> : <Search className="h-5 w-5" />}
                {loading ? 'Fetching...' : 'Search Template'}
              </button>
            </form>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2 space-y-6">
          {templates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {templates.map((template, idx) => {
                const isSynced = syncedTemplateNames.has(template.name)
                const isSyncing = syncing === template.name
                
                const loc = template.localizations?.[0] || {}
                let bodyText = ''
                if (Array.isArray(loc.components)) {
                  bodyText = loc.components.find((c: any) => c.type === 'BODY')?.text || ''
                } else {
                  bodyText = template.body || 'Unable to load preview text.'
                }

                return (
                  <div key={idx} className="glass-card flex flex-col overflow-hidden border-emerald-500/10">
                    <div className="bg-[#0e1410] p-4 border-b border-emerald-900/30 flex items-center justify-between">
                      <div className="font-mono text-sm text-emerald-400 break-all">{template.name}</div>
                    </div>
                    
                    <div className="p-4 bg-[url('https://sw-chat-assets.s3.ap-south-1.amazonaws.com/wa-bg.png')] bg-cover relative flex-1 min-h-[250px] flex items-start justify-center">
                      <WhatsAppBubble template={template} renderBody={renderBody} />
                    </div>

                    <div className="p-4 bg-[#0a0f0d]/50 border-t border-white/5 flex justify-end">
                       {isSynced ? (
                         <div className="flex items-center gap-2 text-emerald-500/70 text-sm font-medium px-4 py-2">
                           <CheckCircle2 className="h-4 w-4" /> Synced to Account
                         </div>
                       ) : (
                         <button 
                           onClick={() => handleSync(template)}
                           disabled={isSyncing}
                           className="glass-card-green px-4 py-2 flex items-center gap-2 text-emerald-400 hover:bg-emerald-500/20 transition-all font-medium text-sm"
                         >
                           {isSyncing ? 'Syncing...' : <><Save className="h-4 w-4" /> Sync Template</>}
                         </button>
                       )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="glass-card h-full min-h-[400px] flex flex-col items-center justify-center p-8 text-center border-dashed border-white/10">
              <MessageSquare className="h-10 w-10 text-emerald-500/20 mb-4" />
              <p className="text-zinc-300 font-light text-lg">No templates loaded</p>
              <p className="text-sm text-zinc-600 mt-2 max-w-sm">
                Enter your Auth Token and search for a template name to preview its contents before pushing it to your automation engine.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* Synced Library Panel */}
      <div className="pt-8 mt-8 border-t border-white/5 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-light text-zinc-300">Your Synced Templates <span className="ml-2 text-emerald-500 font-mono text-sm">({syncedTemplates.length})</span></h2>
        </div>
        
        {syncedTemplates.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {syncedTemplates.map((t) => (
              <div key={t.id} className="glass-card flex flex-col border-emerald-500/10 hover:border-emerald-500/30 transition-all group">
                <div className="bg-[#0e1410] p-4 border-b border-emerald-900/30 flex items-center justify-between">
                  <div className="font-mono text-sm text-emerald-400 break-all">{t.template_name}</div>
                  <button 
                    onClick={() => handleDelete(t.id, t.template_name)}
                    className="p-2 text-zinc-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    title="Delete Template"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                
                <div className="p-4 bg-[url('https://sw-chat-assets.s3.ap-south-1.amazonaws.com/wa-bg.png')] bg-cover relative flex-1 min-h-[250px] flex items-start justify-center">
                  <WhatsAppBubble template={t} renderBody={renderBody} />
                </div>

                <div className="p-3 bg-[#0a0f0d]/50 border-t border-white/5 flex justify-between items-center px-4">
                  <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">{t.language}</span>
                  <div className="flex gap-1.5 items-center">
                     {t.header_type && <span title={`Header: ${t.header_type}`} className="flex"><ImageIcon className="h-3 w-3 text-emerald-500/40" /></span>}
                     {t.buttons_json?.length > 0 && <span title={`${t.buttons_json.length} Buttons`} className="flex"><ExternalLink className="h-3 w-3 text-emerald-500/40" /></span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-zinc-500 italic">No templates synced to your account yet. Use the search to find and sync your first template!</div>
        )}
      </div>

    </div>
  )
}
