'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Settings, RefreshCw } from 'lucide-react'

export default function SetupPage() {
  const [storeName, setStoreName] = useState('')
  const [webhookName, setWebhookName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function checkExistingConfig() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('configurations')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (data && !error) {
        router.push('/dashboard')
      } else {
        setChecking(false)
      }
    }
    checkExistingConfig()
  }, [supabase, router])

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      setError('Identity not found. Please log in again.')
      setLoading(false)
      return
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id,
          store_name: storeName,
          webhook_name: webhookName || 'Nitro Shopify Hook',
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to initialize infrastructure')
      }

      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-[#050906] flex items-center justify-center">
        <RefreshCw className="h-8 w-8 text-green-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050906] relative overflow-hidden px-4">
      <div className="absolute inset-0 bg-grid-pattern opacity-20"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-green-500/10 rounded-full blur-[100px] pointer-events-none z-0"></div>

      <div className="max-w-xl w-full glass-card p-10 z-10 shadow-2xl shadow-green-900/10">
        <div className="text-center">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-green-500/10 flex items-center justify-center mb-6 border border-green-500/20 shadow-[inset_0_0_15px_rgba(34,197,94,0.1)]">
            <Settings className="h-6 w-6 text-green-400" />
          </div>
          <h2 className="text-3xl font-semibold text-white tracking-tight">System Configuration</h2>
          <p className="text-zinc-400 mt-2 font-light text-lg">Initialize your commerce data pipeline architecture.</p>
        </div>

        <form className="mt-10 space-y-6" onSubmit={handleSetup}>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Commerce Platform Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Acme Clothing"
                className="w-full px-4 py-3 bg-[#0a0f0d]/80 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all font-light"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Endpoint Identifier <span className="text-emerald-500/50 text-xs font-normal">(Optional)</span></label>
              <input
                type="text"
                placeholder="e.g. Nitro Integration Node"
                className="w-full px-4 py-3 bg-[#0a0f0d]/80 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all font-light"
                value={webhookName}
                onChange={(e) => setWebhookName(e.target.value)}
              />
            </div>
          </div>

          {error && <div className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 p-4 rounded-xl">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-xl bg-green-500 hover:bg-green-400 hover:shadow-[0_0_20px_rgba(34,197,94,0.3)] text-[#050906] font-bold text-lg transition-all focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed mt-4"
          >
            {loading ? 'Initializing Pipeline...' : 'Deploy Endpoint'}
          </button>
        </form>
      </div>
    </div>
  )
}
