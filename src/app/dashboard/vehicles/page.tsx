'use client'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { toast } from '@/components/ui/toaster'
import { Car, Search, Plus, Loader2 } from 'lucide-react'

export default function VehiclesPage() {
  const { hasPermission } = useAuth()
  const [vehicles, setVehicles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ plateNumber: '', vehicleType: 'Xe ben', volumeCapacity: '', ownerName: '', phone: '' })
  const [saving, setSaving] = useState(false)

  const fetchVehicles = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ pageSize: '50' })
      if (search) params.set('search', search)
      const res = await fetch(`/api/vehicles?${params}`)
      const data = await res.json()
      if (data.success) setVehicles(data.data || [])
    } catch { toast({ title: 'Lỗi', variant: 'error' }) }
    finally { setLoading(false) }
  }, [search])
  useEffect(() => { fetchVehicles() }, [fetchVehicles])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    try {
      const res = await fetch('/api/vehicles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...formData, volumeCapacity: formData.volumeCapacity ? parseFloat(formData.volumeCapacity) : null }) })
      const data = await res.json()
      if (data.success) { toast({ title: 'Thêm xe thành công', variant: 'success' }); setShowForm(false); setFormData({ plateNumber: '', vehicleType: 'Xe ben', volumeCapacity: '', ownerName: '', phone: '' }); fetchVehicles() }
      else toast({ title: data.error?.message || 'Lỗi', variant: 'error' })
    } catch { toast({ title: 'Lỗi', variant: 'error' }) }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Car className="w-5 h-5 text-amber-500" /><h1 className="text-xl font-bold text-slate-900 dark:text-white">Quản lý Xe</h1></div>
        {hasPermission('vehicles.create') && <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition flex items-center gap-1"><Plus className="w-4 h-4" />Thêm xe</button>}
      </div>
      {showForm && (
        <form onSubmit={handleCreate} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Biển số *</label><input value={formData.plateNumber} onChange={e => setFormData(p => ({...p, plateNumber: e.target.value.toUpperCase()}))} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/50" required /></div>
            <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Loại xe</label><select value={formData.vehicleType} onChange={e => setFormData(p => ({...p, vehicleType: e.target.value}))} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-sm"><option>Xe ben</option><option>Xe tải</option><option>Xe đầu kéo</option><option>Xe bồn</option><option>Khác</option></select></div>
            <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Dung tích (m³)</label><input type="number" step="0.1" value={formData.volumeCapacity} onChange={e => setFormData(p => ({...p, volumeCapacity: e.target.value}))} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50" /></div>
            <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Chủ xe</label><input value={formData.ownerName} onChange={e => setFormData(p => ({...p, ownerName: e.target.value}))} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50" /></div>
            <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">SĐT</label><input value={formData.phone} onChange={e => setFormData(p => ({...p, phone: e.target.value}))} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50" /></div>
          </div>
          <div className="flex gap-2"><button type="submit" disabled={saving} className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium disabled:opacity-50">{saving ? 'Đang lưu...' : 'Lưu'}</button><button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm">Hủy</button></div>
        </form>
      )}
      <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm biển số, chủ xe..." className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50" /></div>
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {loading ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div> : vehicles.length === 0 ? <div className="text-center py-12 text-slate-500">Không có dữ liệu</div> : (
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 dark:bg-slate-800/50"><tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider"><th className="px-4 py-3">Biển số</th><th className="px-4 py-3">Loại xe</th><th className="px-4 py-3 hidden md:table-cell">Dung tích</th><th className="px-4 py-3 hidden md:table-cell">Chủ xe</th><th className="px-4 py-3 hidden lg:table-cell">Tài xế mặc định</th><th className="px-4 py-3">Trạng thái</th></tr></thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">{vehicles.map((v: any) => (
            <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30"><td className="px-4 py-3 font-mono font-semibold text-slate-900 dark:text-white">{v.plateNumber}</td><td className="px-4 py-3 text-slate-600 dark:text-slate-300">{v.vehicleType || '-'}</td><td className="px-4 py-3 hidden md:table-cell">{v.volumeCapacity ? `${Number(v.volumeCapacity)} m³` : '-'}</td><td className="px-4 py-3 hidden md:table-cell text-slate-500">{v.ownerName || '-'}</td><td className="px-4 py-3 hidden lg:table-cell text-slate-500">{v.defaultDriver?.fullName || '-'}</td><td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${v.status === 'ACTIVE' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'}`}>{v.status === 'ACTIVE' ? 'Hoạt động' : 'Ngưng'}</span></td></tr>
          ))}</tbody></table></div>
        )}
      </div>
    </div>
  )
}
