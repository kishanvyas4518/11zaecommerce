'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Webhook, ShoppingCart, CreditCard, Activity } from 'lucide-react'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts'

export default function DashboardPage() {
  const [events, setEvents] = useState<any[]>([])
  const [config, setConfig] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    let subscription: any

    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: conf } = await supabase
        .from('configurations')
        .select('*')
        .eq('user_id', user.id)
        .single()
      
      setConfig(conf)

      const { data: initialEvents } = await supabase
        .from('events')
        .select(`*, customers(email, phone)`)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100)

      if (initialEvents) {
        setEvents(initialEvents)
      }
      setLoading(false)

      subscription = supabase
        .channel('public:events')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'events', filter: `user_id=eq.${user.id}` },
          (payload) => {
            setEvents((prev) => [payload.new, ...prev].slice(0, 100))
          }
        )
        .subscribe()
    }

    loadData()

    return () => {
      if (subscription) supabase.removeChannel(subscription)
    }
  }, [supabase])

  const totalEvents = events.length
  const addToCartCount = events.filter(e => e.event_type === 'add_to_cart').length
  const checkoutCount = events.filter(e => e.event_type === 'checkout').length
  const pageViews = events.filter(e => e.event_type === 'page_view').length
  
  const activityData = events.reduce((acc: any, event) => {
    const date = new Date(event.created_at).toLocaleDateString()
    const existing = acc.find((val: any) => val.date === date)
    if (existing) {
      existing.count += 1
    } else {
      acc.push({ date, count: 1 })
    }
    return acc
  }, []).reverse().slice(-7)

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="animate-spin h-8 w-8 border-2 border-green-500 rounded-full border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10 relative">
      <div className="absolute top-[-150px] left-[-150px] w-[500px] h-[500px] bg-green-500/20 rounded-full blur-[120px] pointer-events-none -z-10"></div>
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-4 border-b border-white/5">
        <div className="space-y-2">
          <p className="text-green-500 text-sm font-medium tracking-widest uppercase mb-4">
            {'{ NITRO COMMERCE SECTOR }'}
          </p>
          <h1 className="text-2xl font-light text-zinc-300 md:leading-relaxed max-w-2xl">
            You are tracking the <span className="text-green-500 font-medium">real-time webhook flow</span> for your massive eCommerce platform, which is growing exceptionally fast.
          </h1>
        </div>
        
        {config && (
          <div className="glass-card px-5 py-3 flex items-center gap-3">
            <Webhook className="w-5 h-5 text-green-500" />
            <code className="text-sm font-medium text-zinc-200">
              {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/webhook/{config.webhook_id}
            </code>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Large green card */}
        <div className="lg:col-span-2 glass-card-green p-8 flex flex-col justify-center relative bg-grid-pattern overflow-hidden">
          <div className="absolute top-10 right-10 w-40 h-40 bg-green-500/10 rounded-full blur-[50px]"></div>
          <p className="text-zinc-300 text-lg mb-2 z-10">Events ingested to a colossal</p>
          <div className="flex items-end gap-3 z-10">
            <span className="text-6xl font-bold text-green-400 drop-shadow-[0_0_15px_rgba(74,222,128,0.5)]">
              {totalEvents.toLocaleString()}+
            </span>
            <span className="text-xl text-zinc-300 mb-2">overall events</span>
          </div>
        </div>
        
        <div className="glass-card p-8 flex flex-col justify-center">
          <h3 className="text-4xl font-bold text-green-400 mb-2">{addToCartCount}</h3>
          <p className="text-zinc-300">items added to cart showcasing highly engaged shoppers</p>
        </div>

        <div className="glass-card p-8">
          <h3 className="text-3xl font-bold text-green-400 mb-2">{checkoutCount} <span className="text-sm text-zinc-400 font-normal">Checkouts</span></h3>
          <p className="text-zinc-400 text-sm mt-3">successful order completions and checkout initiations</p>
        </div>

        <div className="glass-card p-8 bg-green-950/10 border-green-900/20">
          <h3 className="text-3xl font-bold text-green-400 mb-2">{pageViews} <span className="text-sm text-zinc-400 font-normal">Page Views</span></h3>
          <p className="text-zinc-400 text-sm mt-3">overall product discovery size and growing continuously</p>
        </div>
        
        <div className="glass-card p-8">
          <h3 className="text-3xl font-bold text-green-400 mb-2">{events.length > 0 ? new Date(events[0].created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</h3>
          <p className="text-zinc-400 text-sm mt-3">latest digital commerce pulse synchronized</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-8">
        <div className="lg:col-span-2 glass-card p-8">
          <h3 className="text-xl font-medium text-white mb-8">Activity Velocity</h3>
          <div className="h-72 w-full">
            {activityData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activityData}>
                  <defs>
                    <linearGradient id="colorGreen" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="date" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px' }}
                    itemStyle={{ color: '#22c55e', fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="count" stroke="#4ade80" strokeWidth={4} fillOpacity={1} fill="url(#colorGreen)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-zinc-600">
                Awaiting inbound webhook data...
              </div>
            )}
          </div>
        </div>

        <div className="glass-card p-6 flex flex-col h-[400px]">
          <h3 className="text-lg font-medium text-white mb-6">Recent Pulses</h3>
          <div className="flex-1 overflow-y-auto pr-3 space-y-4 custom-scrollbar">
            {events.slice(0, 8).map((event) => (
              <div key={event.id} className="p-4 rounded-xl bg-[#0e1410] border border-green-900/30 hover:border-green-500/50 transition-colors">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-semibold text-green-400 truncate pr-2">
                    {event.event_type}
                  </span>
                  <span className="text-xs text-zinc-500 whitespace-nowrap">
                    {new Date(event.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <span className="text-xs text-zinc-400 block truncate">
                  {event.customers?.phone || event.payload?.eventVal?.customer?.phone || 'No identity detected'}
                </span>
              </div>
            ))}
            {events.length === 0 && (
              <p className="text-zinc-600 text-sm text-center py-10">No recent activity</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
