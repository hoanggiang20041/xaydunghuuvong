'use client'
import { useState, useEffect, useCallback } from 'react'
import { toast } from '@/components/ui/toaster'
import { Users, Search, Plus, Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'

export default function DriversPage() {
  const { hasPermission } = useAuth()
  const [drivers, setDrivers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ fullName: '', phone: '', company: '' })
  const [saving, setSaving] = useState(false)

  const fetchDrivers = useCallback(async () => {
    setLoading(true)
    try { const res = await fetch(`/api/drivers?pageSize=50${search ? `&search=${search}` : ''}`); const data = await res.json(); if (data.success) setDrivers(data.data || []) }
    catch { toast({ title: 'Lỗi', variant: 'error' }) } finally { setLoading(false) }
  }, [search])
  useEffect(() => { fetchDrivers() }, [fetchDrivers])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    try {
      const res = await fetch('/api/drivers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) })
      const data = await res.json()
      if (data.success) { toast({ title: 'Thêm tài xế thành công', variant: 'success' }); setShowForm(false); setFormData({ fullName: '', phone: '', company: '' }); fetchDrivers() }
      else toast({ title: data.error?.message || 'Lỗi', variant: 'error' })
    } catch { toast({ title: 'Lỗi', variant: 'error' }) } finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Users className="w-5 h-5 text-amber-500" /><h1 className="text-xl font-bold text-slate-900 dark:text-white">Tài xế</h1></div>
      {hasPermission('drivers.create') && <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition flex items-center gap-1"><Plus className="w-4 h-4" />Thêm</button>}</div>
      {showForm && (<form onSubmit={handleCreate} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4"><div className="grid grid-cols-1 md:grid-cols-3 gap-4"><div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Họ tên *</label><input value={formData.fullName} onChange={e => setFormData(p => ({...p, fullName: e.target.value}))} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50" required /></div><div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">SĐT</label><input value={formData.phone} onChange={e => setFormData(p => ({...p, phone: e.target.value}))} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-sm" /></div><div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nhà xe</label><input value={formData.company} onChange={e => setFormData(p => ({...p, company: e.target.value}))} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-sm" /></div></div><div className="flex gap-2"><button type="submit" disabled={saving} className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium disabled:opacity-50">{saving ? 'Đang lưu...' : 'Lưu'}</button><button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm">Hủy</button></div></form>)}
      <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm tài xế..." className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50" /></div>
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {loading ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div> : drivers.length === 0 ? <div className="text-center py-12 text-slate-500">Không có dữ liệu</div> : (
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 dark:bg-slate-800/50"><tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider"><th className="px-4 py-3">Họ tên</th><th className="px-4 py-3">SĐT</th><th className="px-4 py-3 hidden md:table-cell">Nhà xe</th><th className="px-4 py-3">Trạng thái</th></tr></thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">{drivers.map((d: any) => (<tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30"><td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{d.fullName}</td><td className="px-4 py-3 text-slate-500">{d.phone || '-'}</td><td className="px-4 py-3 hidden md:table-cell text-slate-500">{d.company || '-'}</td><td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${d.status === 'ACTIVE' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-gray-100 text-gray-800'}`}>{d.status === 'ACTIVE' ? 'Hoạt động' : 'Ngưng'}</span></td></tr>))}</tbody></table></div>)}
      </div>
    </div>
  )
}
