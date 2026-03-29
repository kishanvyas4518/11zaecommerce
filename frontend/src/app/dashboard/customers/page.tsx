'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, UserCircle, Calendar, Mail, Phone, ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react'

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  
  const supabase = createClient()

  useEffect(() => {
    async function fetchCustomers() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('customers')
        .select(`
          *,
          events (id)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (data && !error) {
        setCustomers(data)
      }
      setLoading(false)
    }

    fetchCustomers()
  }, [supabase])

  const filteredCustomers = customers.filter(c => 
    (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (c.phone && c.phone.includes(searchTerm)) ||
    (c.first_name && c.first_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (c.last_name && c.last_name.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  // Calculate Pagination
  const totalItems = filteredCustomers.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  
  // Enforce page bounds if simple search filters down the list
  if (currentPage > totalPages) setCurrentPage(totalPages)
  if (currentPage < 1) setCurrentPage(1)

  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  if (loading) {
    return <div className="p-8 text-green-500 animate-pulse font-light">Loading identities...</div>
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 relative">
      <div className="absolute top-[-150px] right-[-150px] w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none -z-10"></div>
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-4 border-b border-white/5">
        <div className="space-y-2">
          <p className="text-emerald-500 text-sm font-medium tracking-widest uppercase mb-4">
            {'{ IDENTITY RESOLUTION }'}
          </p>
          <h1 className="text-2xl font-light text-zinc-300 md:leading-relaxed max-w-2xl">
            View isolated entities captured instantly over the <span className="text-emerald-500 font-medium">data ingestion layer</span>.
          </h1>
        </div>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-500" />
          <input 
            type="text" 
            placeholder="Search details..." 
            className="pl-12 pr-4 py-3 bg-[#0a0f0d]/80 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 w-full md:w-72 transition-all font-light"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setCurrentPage(1) // Reset to page 1 on new search
            }}
          />
        </div>
      </div>

      <div className="glass-card overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left bg-transparent">
            <thead className="bg-white/5 border-b border-white/10 text-zinc-400 text-sm font-medium">
              <tr>
                <th className="px-6 py-5">Customer Profile</th>
                <th className="px-6 py-5">Contact Vector</th>
                <th className="px-6 py-5 text-center">Event Volume</th>
                <th className="px-6 py-5 text-right">Engagement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {paginatedCustomers.length > 0 ? (
                paginatedCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                           <UserCircle className="h-6 w-6 text-emerald-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-zinc-100">
                            {customer.first_name || customer.last_name 
                              ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
                              : 'Unidentified Entity'
                            }
                          </p>
                          <p className="text-xs text-zinc-500 font-mono mt-1 opacity-70 cursor-help" title={customer.id}>{customer.id.substring(0, 8)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="space-y-1.5 font-light">
                        {customer.email && (
                          <div className="flex items-center gap-2 text-sm text-zinc-300">
                            <Mail className="h-3.5 w-3.5 text-emerald-500/70" />
                            {customer.email}
                          </div>
                        )}
                        {customer.phone && (
                          <div className="flex items-center gap-2 text-sm text-zinc-300">
                            <Phone className="h-3.5 w-3.5 text-emerald-500/70" />
                            {customer.phone}
                          </div>
                        )}
                        {!customer.email && !customer.phone && (
                          <span className="text-sm text-zinc-600 italic">No contact vectors isolated</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className="inline-flex items-center justify-center px-3 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-sm font-medium border border-emerald-500/20 shadow-[inset_0_0_10px_rgba(16,185,129,0.05)]">
                        {customer.events?.length || 0} pings
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex flex-col items-end gap-1 font-light">
                        {customer.message_count > 0 ? (
                           <>
                             <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20 flex items-center gap-1">
                               <MessageSquare className="h-3 w-3" /> {customer.message_count} DELIVERED
                             </span>
                             <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
                               Last: {customer.last_message_at ? new Date(customer.last_message_at).toLocaleString() : 'N/A'}
                             </span>
                           </>
                        ) : (
                           <span className="text-xs text-zinc-600 italic px-2">Pending automation</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-zinc-500 font-light">
                    {searchTerm ? 'No identities match your search matrix.' : 'No active identities isolated yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Section */}
        {totalItems > 0 && (
          <div className="bg-[#0a0f0d]/90 border-t border-white/5 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm text-zinc-500 font-light">Show</span>
              <select 
                className="bg-white/5 border border-white/10 rounded-lg text-sm text-zinc-300 px-2 py-1.5 focus:outline-none focus:border-emerald-500/50"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value))
                  setCurrentPage(1)
                }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-sm text-zinc-500 font-light">per page</span>
              
              <span className="hidden sm:inline-block text-sm text-zinc-500 font-light ml-4 px-2 border-l border-white/10">
                Showing {Math.min((currentPage - 1) * pageSize + 1, totalItems)} to {Math.min(currentPage * pageSize, totalItems)} of {totalItems} entries
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Previous Page"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-md border border-emerald-500/20">
                  {currentPage}
                </span>
                <span className="text-sm text-zinc-600 px-1">/</span>
                <span className="text-sm text-zinc-500 pr-1">{totalPages}</span>
              </div>
              
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Next Page"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
