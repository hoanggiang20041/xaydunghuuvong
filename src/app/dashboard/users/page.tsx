'use client'
import { useState, useEffect, useCallback } from 'react'
import { toast } from '@/components/ui/toaster'
import { UserCog, Search, Loader2 } from 'lucide-react'
import { ROLE_LABELS } from '@/lib/constants'

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ pageSize: '50' })
      if (search) params.set('search', search)
      const res = await fetch(`/api/users?${params}`)
      const data = await res.json()
      if (data.success) setUsers(data.data || [])
    } catch { toast({ title: 'Lỗi', variant: 'error' }) }
    finally { setLoading(false) }
  }, [search])
  useEffect(() => { fetchUsers() }, [fetchUsers])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2"><UserCog className="w-5 h-5 text-amber-500" /><h1 className="text-xl font-bold text-slate-900 dark:text-white">Người dùng</h1></div>
      <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm người dùng..." className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50" /></div>
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {loading ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div> : (
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 dark:bg-slate-800/50"><tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider"><th className="px-4 py-3">Username</th><th className="px-4 py-3">Họ tên</th><th className="px-4 py-3 hidden md:table-cell">Email</th><th className="px-4 py-3">Vai trò</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3 hidden lg:table-cell">Đăng nhập cuối</th></tr></thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">{users.map((u: any) => (<tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30"><td className="px-4 py-3 font-mono text-slate-900 dark:text-white">{u.username}</td><td className="px-4 py-3 font-medium">{u.fullName}</td><td className="px-4 py-3 hidden md:table-cell text-slate-500 text-xs">{u.email}</td><td className="px-4 py-3">{u.userRoles?.map((ur: any) => <span key={ur.role.name} className="inline-flex mr-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs font-medium">{ROLE_LABELS[ur.role.name] || ur.role.displayName}</span>)}</td><td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${u.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800'}`}>{u.isActive ? 'Hoạt động' : 'Khóa'}</span></td><td className="px-4 py-3 hidden lg:table-cell text-slate-500 text-xs">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('vi-VN') : 'Chưa đăng nhập'}</td></tr>))}</tbody></table></div>
        )}
      </div>
    </div>
  )
}
