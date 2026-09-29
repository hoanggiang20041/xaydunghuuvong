'use client'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { toast } from '@/components/ui/toaster'
import { Building2, Search, Plus, Loader2 } from 'lucide-react'
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS } from '@/lib/constants'

export default function ProjectsPage() {
  const { hasPermission } = useAuth()
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ code: '', name: '', address: '', investor: '', status: 'ACTIVE', notes: '' })
  const [saving, setSaving] = useState(false)

  const fetchProjects = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ pageSize: '50' })
      if (search) params.set('search', search)
      const res = await fetch(`/api/projects?${params}`)
      const data = await res.json()
      if (data.success) setProjects(data.data || [])
    } catch { toast({ title: 'Lỗi tải dữ liệu', variant: 'error' }) }
    finally { setLoading(false) }
  }, [search])
  useEffect(() => { fetchProjects() }, [fetchProjects])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    try {
      const res = await fetch('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) })
      const data = await res.json()
      if (data.success) { toast({ title: 'Tạo công trình thành công', variant: 'success' }); setShowForm(false); setFormData({ code: '', name: '', address: '', investor: '', status: 'ACTIVE', notes: '' }); fetchProjects() }
      else toast({ title: data.error?.message || 'Lỗi', variant: 'error' })
    } catch { toast({ title: 'Lỗi kết nối', variant: 'error' }) }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Building2 className="w-5 h-5 text-amber-500" /><h1 className="text-xl font-bold text-slate-900 dark:text-white">Công trình</h1></div>
        {hasPermission('projects.create') && <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition flex items-center gap-1"><Plus className="w-4 h-4" />Thêm mới</button>}
      </div>
      {showForm && (
        <form onSubmit={handleCreate} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Mã CT *</label><input value={formData.code} onChange={e => setFormData(p => ({...p, code: e.target.value}))} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50" required /></div>
            <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tên CT *</label><input value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50" required /></div>
            <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Địa chỉ</label><input value={formData.address} onChange={e => setFormData(p => ({...p, address: e.target.value}))} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50" /></div>
            <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Chủ đầu tư</label><input value={formData.investor} onChange={e => setFormData(p => ({...p, investor: e.target.value}))} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50" /></div>
          </div>
          <div className="flex gap-2"><button type="submit" disabled={saving} className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 disabled:opacity-50 transition">{saving ? 'Đang lưu...' : 'Lưu'}</button><button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition">Hủy</button></div>
        </form>
      )}
      <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm công trình..." className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50" /></div>
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {loading ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div> : projects.length === 0 ? <div className="text-center py-12 text-slate-500">Không có dữ liệu</div> : (
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 dark:bg-slate-800/50"><tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider"><th className="px-4 py-3">Mã</th><th className="px-4 py-3">Tên công trình</th><th className="px-4 py-3 hidden md:table-cell">Địa chỉ</th><th className="px-4 py-3 hidden lg:table-cell">Chủ đầu tư</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3 hidden md:table-cell">Chuyến</th></tr></thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">{projects.map((p: any) => (
            <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30"><td className="px-4 py-3 font-mono font-semibold text-slate-900 dark:text-white">{p.code}</td><td className="px-4 py-3 text-slate-700 dark:text-slate-200">{p.name}</td><td className="px-4 py-3 hidden md:table-cell text-slate-500 text-xs">{p.address || '-'}</td><td className="px-4 py-3 hidden lg:table-cell text-slate-500 text-xs">{p.investor || '-'}</td><td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${PROJECT_STATUS_COLORS[p.status] || ''}`}>{PROJECT_STATUS_LABELS[p.status] || p.status}</span></td><td className="px-4 py-3 hidden md:table-cell text-slate-500">{p._count?.trips || 0}</td></tr>
          ))}</tbody></table></div>
        )}
      </div>
    </div>
  )
}
