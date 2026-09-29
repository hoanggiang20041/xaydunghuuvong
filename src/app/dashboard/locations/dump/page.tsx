'use client'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { toast } from '@/components/ui/toaster'
import { CircleDot, Search, Plus, Loader2, Edit2, Trash2 } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

export default function DumpLocationsPage() {
  const { hasPermission } = useAuth()
  const [locations, setLocations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ name: '', address: '', contactPerson: '', phone: '', status: 'ACTIVE', notes: '' })
  const [submitting, setSubmitting] = useState(false)

  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)

  const fetchLocations = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ pageSize: '50' })
      if (search) params.set('search', search)
      const res = await fetch(`/api/dump-locations?${params}`)
      const data = await res.json()
      if (data.success) setLocations(data.data || [])
    } catch { toast({ title: 'Lỗi tải dữ liệu', variant: 'error' }) }
    finally { setLoading(false) }
  }, [search])
  
  useEffect(() => { fetchLocations() }, [fetchLocations])

  const handleOpenAdd = () => {
    setEditingId(null)
    setFormData({ name: '', address: '', contactPerson: '', phone: '', status: 'ACTIVE', notes: '' })
    setIsModalOpen(true)
  }

  const handleOpenEdit = (l: any) => {
    setEditingId(l.id)
    setFormData({ 
      name: l.name, 
      address: l.address || '', 
      contactPerson: l.contactPerson || '', 
      phone: l.phone || '',
      status: l.status || 'ACTIVE',
      notes: l.notes || ''
    })
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const url = editingId ? `/api/dump-locations/${editingId}` : '/api/dump-locations'
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
      fetchLocations()
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
      const res = await fetch(`/api/dump-locations/${deleteId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!data.success) throw new Error(data.message)
      toast({ title: 'Đã xóa', variant: 'success' })
      setDeleteId(null)
      fetchLocations()
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
      await Promise.all(selectedIds.map(id => fetch(`/api/dump-locations/${id}`, { method: 'DELETE' })))
      toast({ title: 'Đã xóa các mục đã chọn', variant: 'success' })
      setSelectedIds([])
      fetchLocations()
    } catch (err: any) {
      toast({ title: 'Lỗi khi xóa', description: err.message, variant: 'error' })
    } finally {
      setIsBulkDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><CircleDot className="w-5 h-5 text-amber-500" /><h1 className="text-xl font-bold text-slate-900 dark:text-white">Điểm đổ hàng</h1></div>
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <button onClick={handleBulkDelete} disabled={isBulkDeleting} className="flex items-center gap-2 bg-red-100 text-red-600 hover:bg-red-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              {isBulkDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Xóa {selectedIds.length} mục
            </button>
          )}
          {hasPermission('locations.manage') && (
            <button onClick={handleOpenAdd} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition flex items-center gap-1">
              <Plus className="w-4 h-4" />Thêm mới
            </button>
          )}
        </div>
      </div>

      <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm điểm đổ hàng..." className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50" /></div>
      
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {loading ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div> : locations.length === 0 ? <div className="text-center py-12 text-slate-500">Không có dữ liệu</div> : (
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 dark:bg-slate-800/50"><tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
            <th className="px-4 py-3 w-10">
              <input type="checkbox" checked={locations.length > 0 && selectedIds.length === locations.length} onChange={e => setSelectedIds(e.target.checked ? locations.map((l: any) => l.id) : [])} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
            </th>
            <th className="px-4 py-3">Tên</th><th className="px-4 py-3 hidden md:table-cell">Địa chỉ</th><th className="px-4 py-3 hidden lg:table-cell">Người liên hệ</th><th className="px-4 py-3 hidden lg:table-cell">SĐT</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3 text-right">Thao tác</th></tr></thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">{locations.map((l: any) => (
            <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
              <td className="px-4 py-3">
                <input type="checkbox" checked={selectedIds.includes(l.id)} onChange={e => setSelectedIds(prev => e.target.checked ? [...prev, l.id] : prev.filter(id => id !== l.id))} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
              </td>
              <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{l.name}</td>
              <td className="px-4 py-3 hidden md:table-cell text-slate-500 text-xs">{l.address || '-'}</td>
              <td className="px-4 py-3 hidden lg:table-cell text-slate-500">{l.contactPerson || '-'}</td>
              <td className="px-4 py-3 hidden lg:table-cell text-slate-500">{l.phone || '-'}</td>
              <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${l.status === 'ACTIVE' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'}`}>{l.status === 'ACTIVE' ? 'Hoạt động' : 'Ngưng'}</span></td>
              <td className="px-4 py-3 flex justify-end gap-2">
                <button onClick={() => handleOpenEdit(l)} className="p-1 text-slate-400 hover:text-blue-600 transition-colors"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => setDeleteId(l.id)} className="p-1 text-slate-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
              </td>
            </tr>
          ))}</tbody></table></div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => !submitting && setIsModalOpen(false)} title={editingId ? 'Sửa Điểm đổ hàng' : 'Thêm Điểm đổ hàng'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
              Tên địa điểm <span className="text-red-500">*</span>
            </label>
            <input required value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} className="w-full px-3 py-2 border border-slate-300 rounded-lg dark:bg-slate-800 dark:border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Địa chỉ</label>
            <input value={formData.address} onChange={e => setFormData(p => ({...p, address: e.target.value}))} className="w-full px-3 py-2 border border-slate-300 rounded-lg dark:bg-slate-800 dark:border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Người liên hệ</label>
            <input value={formData.contactPerson} onChange={e => setFormData(p => ({...p, contactPerson: e.target.value}))} className="w-full px-3 py-2 border border-slate-300 rounded-lg dark:bg-slate-800 dark:border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">SĐT liên hệ</label>
            <input value={formData.phone} onChange={e => setFormData(p => ({...p, phone: e.target.value}))} className="w-full px-3 py-2 border border-slate-300 rounded-lg dark:bg-slate-800 dark:border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Trạng thái</label>
            <select value={formData.status} onChange={e => setFormData(p => ({...p, status: e.target.value}))} className="w-full px-3 py-2 border border-slate-300 rounded-lg dark:bg-slate-800 dark:border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all bg-white dark:bg-slate-800">
              <option value="ACTIVE">Hoạt động (ACTIVE)</option>
              <option value="INACTIVE">Ngưng sử dụng (INACTIVE)</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 mt-8 border-t border-slate-100 dark:border-slate-800 pt-5">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 rounded-lg text-sm font-medium transition-all">Hủy</button>
            <button type="submit" disabled={submitting} className="px-5 py-2.5 bg-[#1a365d] hover:bg-[#1a365d]/90 text-white rounded-lg text-sm font-medium flex items-center transition-all shadow-sm">
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Lưu thông tin'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog 
        isOpen={!!deleteId} 
        onClose={() => !submitting && setDeleteId(null)} 
        onConfirm={handleDelete}
        title="Xóa điểm đổ hàng"
        message="Bạn có chắc chắn muốn xóa địa điểm này? Thao tác này không thể hoàn tác."
        loading={submitting}
      />
    </div>
  )
}
