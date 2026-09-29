'use client'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { toast } from '@/components/ui/toaster'
import { Users, Search, Plus, Loader2, Edit2, Trash2 } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

export default function DriversPage() {
  const { hasPermission } = useAuth()
  const [drivers, setDrivers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ fullName: '', phone: '', company: '', idNumber: '', status: 'ACTIVE', notes: '' })
  const [submitting, setSubmitting] = useState(false)

  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)

  const fetchDrivers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ pageSize: '50' })
      if (search) params.set('search', search)
      const res = await fetch(`/api/drivers?${params}`)
      const data = await res.json()
      if (data.success) setDrivers(data.data || [])
    } catch { toast({ title: 'Lỗi tải dữ liệu', variant: 'error' }) }
    finally { setLoading(false) }
  }, [search])
  
  useEffect(() => { fetchDrivers() }, [fetchDrivers])

  const handleOpenAdd = () => {
    setEditingId(null)
    setFormData({ fullName: '', phone: '', company: '', idNumber: '', status: 'ACTIVE', notes: '' })
    setIsModalOpen(true)
  }

  const handleOpenEdit = (d: any) => {
    setEditingId(d.id)
    setFormData({ 
      fullName: d.fullName, 
      phone: d.phone || '', 
      company: d.company || '', 
      idNumber: d.idNumber || '',
      status: d.status || 'ACTIVE',
      notes: d.notes || ''
    })
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const url = editingId ? `/api/drivers/${editingId}` : '/api/drivers'
      const method = editingId ? 'PUT' : 'POST'
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      const data = await res.json()
      
      if (!data.success) throw new Error(data.message || data.error?.message)
      toast({ title: 'Thành công', variant: 'success' })
      setIsModalOpen(false)
      fetchDrivers()
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.message, variant: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/drivers/${deleteId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!data.success) throw new Error(data.message)
      toast({ title: 'Đã xóa', variant: 'success' })
      setDeleteId(null)
      fetchDrivers()
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.message, variant: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    if (!confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.length} mục đã chọn?`)) return
    setIsBulkDeleting(true)
    try {
      await Promise.all(selectedIds.map(id => fetch(`/api/drivers/${id}`, { method: 'DELETE' })))
      toast({ title: 'Đã xóa các mục đã chọn', variant: 'success' })
      setSelectedIds([])
      fetchDrivers()
    } catch (err: any) {
      toast({ title: 'Lỗi khi xóa', description: err.message, variant: 'error' })
    } finally {
      setIsBulkDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Users className="w-5 h-5 text-amber-500" /><h1 className="text-xl font-bold text-slate-900 dark:text-white">Tài xế</h1></div>
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <button onClick={handleBulkDelete} disabled={isBulkDeleting} className="flex items-center gap-2 bg-red-100 text-red-600 hover:bg-red-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              {isBulkDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Xóa {selectedIds.length} mục
            </button>
          )}
          {hasPermission('drivers.create') && (
            <button onClick={handleOpenAdd} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition flex items-center gap-1">
              <Plus className="w-4 h-4" />Thêm mới
            </button>
          )}
        </div>
      </div>

      <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm tài xế..." className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50" /></div>
      
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {loading ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div> : drivers.length === 0 ? <div className="text-center py-12 text-slate-500">Không có dữ liệu</div> : (
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 dark:bg-slate-800/50"><tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
            <th className="px-4 py-3 w-10">
              <input type="checkbox" checked={drivers.length > 0 && selectedIds.length === drivers.length} onChange={e => setSelectedIds(e.target.checked ? drivers.map((d: any) => d.id) : [])} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
            </th>
            <th className="px-4 py-3">Họ tên</th><th className="px-4 py-3">SĐT</th><th className="px-4 py-3 hidden md:table-cell">CCCD</th><th className="px-4 py-3 hidden md:table-cell">Nhà xe</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3 text-right">Thao tác</th></tr></thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">{drivers.map((d: any) => (
            <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
              <td className="px-4 py-3">
                <input type="checkbox" checked={selectedIds.includes(d.id)} onChange={e => setSelectedIds(prev => e.target.checked ? [...prev, d.id] : prev.filter(id => id !== d.id))} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
              </td>
              <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{d.fullName}</td>
              <td className="px-4 py-3 text-slate-500">{d.phone || '-'}</td>
              <td className="px-4 py-3 hidden md:table-cell text-slate-500">{d.idNumber || '-'}</td>
              <td className="px-4 py-3 hidden md:table-cell text-slate-500">{d.company || '-'}</td>
              <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${d.status === 'ACTIVE' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'}`}>{d.status === 'ACTIVE' ? 'Hoạt động' : 'Ngưng'}</span></td>
              <td className="px-4 py-3 flex justify-end gap-2">
                <button onClick={() => handleOpenEdit(d)} className="p-1 text-slate-400 hover:text-blue-600 transition-colors"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => setDeleteId(d.id)} className="p-1 text-slate-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
              </td>
            </tr>
          ))}</tbody></table></div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => !submitting && setIsModalOpen(false)} title={editingId ? 'Sửa Tài xế' : 'Thêm Tài xế'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Họ tên *</label>
            <input required value={formData.fullName} onChange={e => setFormData(p => ({...p, fullName: e.target.value}))} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Số điện thoại</label>
            <input value={formData.phone} onChange={e => setFormData(p => ({...p, phone: e.target.value}))} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">CCCD</label>
            <input value={formData.idNumber} onChange={e => setFormData(p => ({...p, idNumber: e.target.value}))} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Nhà xe</label>
            <input value={formData.company} onChange={e => setFormData(p => ({...p, company: e.target.value}))} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Trạng thái</label>
            <select value={formData.status} onChange={e => setFormData(p => ({...p, status: e.target.value}))} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="ACTIVE">Hoạt động (ACTIVE)</option>
              <option value="INACTIVE">Ngưng sử dụng (INACTIVE)</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 rounded-lg text-sm font-medium">Hủy</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center">
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Lưu'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog 
        isOpen={!!deleteId} 
        onClose={() => !submitting && setDeleteId(null)} 
        onConfirm={handleDelete}
        title="Xóa tài xế"
        message="Bạn có chắc chắn muốn xóa tài xế này? Thao tác này không thể hoàn tác."
        loading={submitting}
      />
    </div>
  )
}
