'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Zap, Clock, CheckCircle2, XCircle } from 'lucide-react'

export default function LiveAutomationsPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    let subscription: any

    async function fetchLogs() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Load initial latest logs
      const { data, error } = await supabase
        .from('automation_logs')
        .select(`
          *,
          customers(email, phone, first_name)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (data && !error) {
        setLogs(data)
      }
      setLoading(false)

      // Subscribe to real-time LIVE tracking
      subscription = supabase
        .channel('live-tracking')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'automation_logs', filter: `user_id=eq.${user.id}` },
          async (payload) => {
            // Need to fetch full customer details for the new log
            const { data: newLog } = await supabase
              .from('automation_logs')
              .select(`*, customers(email, phone, first_name)`)
              .eq('id', payload.new.id)
              .single()
            
            if (newLog) {
              setLogs((prev) => [newLog, ...prev].slice(0, 50))
            }
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'automation_logs', filter: `user_id=eq.${user.id}` },
          (payload) => {
             setLogs((prev) => prev.map(log => log.id === payload.new.id ? { ...log, ...payload.new } : log))
          }
        )
        .subscribe()
    }

    fetchLogs()

    return () => {
      if (subscription) supabase.removeChannel(subscription)
    }
  }, [supabase])

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'SCHEDULED': return <Clock className="h-4 w-4 text-amber-500 animate-pulse" />
      case 'SENT': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
      case 'CANCELLED': return <XCircle className="h-4 w-4 text-zinc-500" />
      default: return <Zap className="h-4 w-4 text-green-500" />
    }
  }

  const getStatusClass = (status: string) => {
     switch(status) {
      case 'SCHEDULED': return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
      case 'SENT': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      case 'CANCELLED': return 'bg-zinc-800 text-zinc-400 border-zinc-700'
      default: return 'bg-green-500/10 text-green-400 border-green-500/20'
    }
  }

  if (loading) {
    return <div className="p-8 text-green-500 animate-pulse font-light">Connecting to live automation stream...</div>
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 relative">
      <div className="absolute top-[-150px] right-[-150px] w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none -z-10"></div>
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-4 border-b border-white/5">
        <div className="space-y-2">
          <p className="flex items-center gap-2 text-amber-500 text-sm font-medium tracking-widest uppercase mb-4">
            <span className="h-2 w-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)] animate-pulse"></span>
            {'{ LIVE TRACKING ENGINE }'}
          </p>
          <h1 className="text-2xl font-light text-zinc-300 md:leading-relaxed max-w-2xl">
            Watch the <span className="text-amber-500 font-medium">automated AI pipeline</span> detect intent, queue campaigns, and cancel hooks in real-time.
          </h1>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="bg-[#0e1410] p-4 border-b border-green-900/30 flex items-center justify-between">
           <h3 className="text-sm font-medium text-green-400 flex items-center gap-2">
             <Zap className="h-4 w-4" /> Operations Stream
           </h3>
           <span className="text-xs text-zinc-500 font-mono">Listening for intent updates...</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left bg-transparent">
            <thead className="bg-white/5 border-b border-white/10 text-zinc-400 text-sm font-medium">
              <tr>
                <th className="px-6 py-5">Target Entity</th>
                <th className="px-6 py-5">Rule Triggered</th>
                <th className="px-6 py-5 text-center">Status</th>
                <th className="px-6 py-5 text-right">Scheduled Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {logs.length > 0 ? (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-5">
                      <div className="font-light">
                        <p className="text-sm text-zinc-200">
                          {log.customers?.first_name || log.customers?.email || log.customers?.phone || 'Unknown'}
                        </p>
                        <p className="text-xs text-zinc-500 font-mono mt-0.5">{log.customer_id.substring(0,8)}</p>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                       <span className="inline-block px-2.5 py-1 rounded bg-zinc-800 text-zinc-300 text-xs font-mono border border-zinc-700">
                         Template T{log.template_id}
                       </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex justify-center">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${getStatusClass(log.status)}`}>
                          {getStatusIcon(log.status)}
                          {log.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="text-sm text-zinc-300 font-light">
                        {new Date(log.scheduled_for).toLocaleString(undefined, {
                           month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </div>
                      {log.status === 'SENT' && log.executed_at && (
                        <div className="text-xs text-emerald-500/70 mt-1">
                          Exec: {new Date(log.executed_at).toLocaleTimeString()}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-20 text-center text-zinc-500 font-light">
                    <div className="flex flex-col items-center gap-3">
                      <Clock className="h-8 w-8 text-zinc-700 mb-2" />
                      <p>Queue is currently idle.</p>
                      <p className="text-xs text-zinc-600">Waiting for webhook ingress to trigger automation rules.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
