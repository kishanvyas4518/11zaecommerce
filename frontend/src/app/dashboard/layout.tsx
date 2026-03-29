'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Users, Webhook, LogOut, Zap, SlidersHorizontal, MessageSquare, Settings } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const navItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
    { href: '/dashboard/customers', icon: Users, label: 'Customers' },
    { href: '/dashboard/automations', icon: Zap, label: 'Live Automations' },
    { href: '/dashboard/rules', icon: SlidersHorizontal, label: 'Automation Rules' },
    { href: '/dashboard/templates', icon: MessageSquare, label: 'Templates Sync' },
    { href: '/setup', icon: Webhook, label: 'Webhook Config' },
    { href: '/dashboard/settings', icon: Settings, label: 'API Settings' },
  ]

  return (
    <div className="flex h-screen bg-[#050906] text-zinc-100 overflow-hidden relative">
      {/* Background flare */}
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-green-500/10 rounded-full blur-[100px] pointer-events-none -z-10"></div>
      
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/5 bg-[#0a0f0d]/80 backdrop-blur-md flex flex-col hidden md:flex z-10">
        <div className="h-20 flex items-center px-8 border-b border-white/5">
          <span className="font-bold text-xl tracking-wide flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]"></span>
            11za Commerce
          </span>
        </div>
        
        <nav className="flex-1 px-4 py-8 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive 
                    ? 'bg-green-500/10 text-green-400 border border-green-500/20 shadow-[inset_0_0_15px_rgba(34,197,94,0.05)]' 
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/5 border border-transparent'
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-white/5">
          <button 
            onClick={handleSignOut}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-sm font-medium text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto z-10 custom-scrollbar">
        {children}
      </main>
    </div>
  )
}
