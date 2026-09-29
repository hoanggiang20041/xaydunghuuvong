'use client'
import { useState, useEffect } from 'react'
import { toast } from '@/components/ui/toaster'
import { CircleDot, Loader2, Plus } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'

export default function DumpLocationsPage() {
  const { hasPermission } = useAuth()
  const [locations, setLocations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ name: '', address: '', contactPerson: '', phone: '' })
  const [saving, setSaving] = useState(false)

  const fetchData = () => { fetch('/api/dump-locations?pageSize=100').then(r => r.json()).then(d => { if (d.success) setLocations(d.data || []) }).catch(() => {}).finally(() => setLoading(false)) }
  useEffect(() => { fetchData() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    try {
      const res = await fetch('/api/dump-locations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) })
      const data = await res.json()
      if (data.success) { toast({ title: 'Thêm thành công', variant: 'success' }); setShowForm(false); setFormData({ name: '', address: '', contactPerson: '', phone: '' }); fetchData() }
      else toast({ title: data.error?.message || 'Lỗi', variant: 'error' })
    } catch { toast({ title: 'Lỗi', variant: 'error' }) } finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><div className="flex items-center gap-2"><CircleDot className="w-5 h-5 text-amber-500" /><h1 className="text-xl font-bold text-slate-900 dark:text-white">Điểm đổ hàng</h1></div>
      {hasPermission('locations.manage') && <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition flex items-center gap-1"><Plus className="w-4 h-4" />Thêm</button>}</div>
      {showForm && (<form onSubmit={handleCreate} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4"><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tên *</label><input value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-sm" required /></div><div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Địa chỉ</label><input value={formData.address} onChange={e => setFormData(p => ({...p, address: e.target.value}))} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-sm" /></div><div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Người liên hệ</label><input value={formData.contactPerson} onChange={e => setFormData(p => ({...p, contactPerson: e.target.value}))} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-sm" /></div><div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">SĐT</label><input value={formData.phone} onChange={e => setFormData(p => ({...p, phone: e.target.value}))} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-sm" /></div></div><div className="flex gap-2"><button type="submit" disabled={saving} className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium disabled:opacity-50">{saving ? 'Đang lưu...' : 'Lưu'}</button><button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm">Hủy</button></div></form>)}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {loading ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div> : locations.length === 0 ? <div className="text-center py-12 text-slate-500">Không có dữ liệu</div> : (
          <table className="w-full text-sm"><thead className="bg-slate-50 dark:bg-slate-800/50"><tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider"><th className="px-4 py-3">Tên</th><th className="px-4 py-3 hidden md:table-cell">Địa chỉ</th><th className="px-4 py-3 hidden lg:table-cell">Người liên hệ</th><th className="px-4 py-3">Trạng thái</th></tr></thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">{locations.map((l: any) => (<tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30"><td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{l.name}</td><td className="px-4 py-3 hidden md:table-cell text-slate-500 text-xs">{l.address || '-'}</td><td className="px-4 py-3 hidden lg:table-cell text-slate-500">{l.contactPerson || '-'}</td><td className="px-4 py-3"><span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Hoạt động</span></td></tr>))}</tbody></table>
        )}
      </div>
    </div>
  )
}
