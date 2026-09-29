'use client'
import { useState, useEffect, useCallback } from 'react'
import { toast } from '@/components/ui/toaster'
import { ScrollText, Search, Loader2 } from 'lucide-react'

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [module, setModule] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: page.toString(), pageSize: '30' })
      if (search) params.set('search', search)
      if (module) params.set('module', module)
      const res = await fetch(`/api/audit-logs?${params}`)
      const data = await res.json()
      if (data.success) { setLogs(data.data || []); setTotalPages(data.meta?.totalPages || 1) }
    } catch { toast({ title: 'Lỗi', variant: 'error' }) }
    finally { setLoading(false) }
  }, [search, module, page])
  useEffect(() => { fetchLogs() }, [fetchLogs])

  const actionColors: Record<string, string> = { CREATE: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20', UPDATE: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20', DELETE: 'text-red-600 bg-red-50 dark:bg-red-900/20', LOGIN_SUCCESS: 'text-green-600 bg-green-50 dark:bg-green-900/20', LOGIN_FAILED: 'text-red-600 bg-red-50 dark:bg-red-900/20', CHECK_OUT: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20', COMPLETE: 'text-green-600 bg-green-50 dark:bg-green-900/20', CANCEL: 'text-red-600 bg-red-50 dark:bg-red-900/20', LOGOUT: 'text-slate-600 bg-slate-50 dark:bg-slate-800' }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2"><ScrollText className="w-5 h-5 text-amber-500" /><h1 className="text-xl font-bold text-slate-900 dark:text-white">Nhật ký hệ thống</h1></div>
      <div className="flex gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Tìm theo user, record..." className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50" /></div>
        <select value={module} onChange={e => { setModule(e.target.value); setPage(1) }} className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"><option value="">Tất cả module</option><option value="auth">Auth</option><option value="trips">Chuyến xe</option><option value="users">Người dùng</option><option value="projects">Công trình</option><option value="vehicles">Xe</option><option value="drivers">Tài xế</option></select>
      </div>
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {loading ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div> : logs.length === 0 ? <div className="text-center py-12 text-slate-500">Không có dữ liệu</div> : (
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 dark:bg-slate-800/50"><tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider"><th className="px-4 py-3">Thời gian</th><th className="px-4 py-3">User</th><th className="px-4 py-3">Hành động</th><th className="px-4 py-3">Module</th><th className="px-4 py-3 hidden md:table-cell">Record</th><th className="px-4 py-3 hidden lg:table-cell">IP</th></tr></thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">{logs.map((l: any) => (<tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30"><td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{new Date(l.createdAt).toLocaleString('vi-VN')}</td><td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-medium text-xs">{l.username}</td><td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${actionColors[l.action] || 'text-slate-600 bg-slate-50'}`}>{l.action}</span></td><td className="px-4 py-3 text-xs text-slate-500">{l.module}</td><td className="px-4 py-3 hidden md:table-cell font-mono text-xs text-slate-400">{l.recordId ? l.recordId.substring(0, 8) + '...' : '-'}</td><td className="px-4 py-3 hidden lg:table-cell text-xs text-slate-400">{l.ipAddress}</td></tr>))}</tbody></table></div>
        )}
        {totalPages > 1 && (<div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-800"><p className="text-xs text-slate-500">Trang {page}/{totalPages}</p><div className="flex gap-1"><button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page <= 1} className="px-3 py-1 border rounded text-xs disabled:opacity-50">←</button><button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page >= totalPages} className="px-3 py-1 border rounded text-xs disabled:opacity-50">→</button></div></div>)}
      </div>
    </div>
  )
}
