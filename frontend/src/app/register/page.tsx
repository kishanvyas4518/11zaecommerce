'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Rocket } from 'lucide-react'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050906] relative overflow-hidden px-4">
      <div className="absolute inset-0 bg-grid-pattern opacity-20"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-teal-500/10 rounded-full blur-[100px] pointer-events-none z-0"></div>

      <div className="max-w-md w-full glass-card p-10 z-10 shadow-2xl shadow-teal-900/10">
        <div className="text-center">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-teal-500/10 flex items-center justify-center mb-6 border border-teal-500/20 shadow-[inset_0_0_15px_rgba(20,184,166,0.1)]">
            <Rocket className="h-6 w-6 text-teal-400" />
          </div>
          <h2 className="text-3xl font-semibold text-white tracking-tight">Start Tracking</h2>
          <p className="text-zinc-400 mt-2 font-light">Deploy your real-time webhook dashboard</p>
        </div>

        <form className="mt-10 space-y-6" onSubmit={handleRegister}>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Email address</label>
              <input
                type="email"
                required
                className="w-full px-4 py-3 bg-[#0a0f0d]/80 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-all font-light"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Password</label>
              <input
                type="password"
                required
                className="w-full px-4 py-3 bg-[#0a0f0d]/80 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-all font-light"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && <div className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 p-4 rounded-xl">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-xl bg-teal-500 hover:bg-teal-400 hover:shadow-[0_0_20px_rgba(20,184,166,0.3)] text-[#050906] font-bold text-lg transition-all focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Booting Access...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-zinc-400 mt-8 font-light">
          Already deployed?{' '}
          <Link href="/login" className="font-semibold text-teal-400 hover:text-teal-300 transition-colors drop-shadow-[0_0_8px_rgba(20,184,166,0.3)]">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  )
}
