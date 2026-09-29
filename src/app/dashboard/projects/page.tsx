'use client'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { toast } from '@/components/ui/toaster'
import { Building2, Search, Plus, Loader2, Edit2, Trash2 } from 'lucide-react'
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS } from '@/lib/constants'
import { Modal } from '@/components/ui/modal'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

export default function ProjectsPage() {
  const { hasPermission } = useAuth()
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ code: '', name: '', address: '', investor: '', status: 'ACTIVE', notes: '' })
  const [submitting, setSubmitting] = useState(false)

  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)

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

  const handleOpenAdd = () => {
    setEditingId(null)
    setFormData({ code: '', name: '', address: '', investor: '', status: 'ACTIVE', notes: '' })
    setIsModalOpen(true)
  }

  const handleOpenEdit = (p: any) => {
    setEditingId(p.id)
    setFormData({ 
      code: p.code, 
      name: p.name, 
      address: p.address || '', 
      investor: p.investor || '', 
      status: p.status || 'ACTIVE',
      notes: p.notes || ''
    })
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const url = editingId ? `/api/projects/${editingId}` : '/api/projects'
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
      fetchProjects()
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
      const res = await fetch(`/api/projects/${deleteId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!data.success) throw new Error(data.message)
      toast({ title: 'Đã xóa', variant: 'success' })
      setDeleteId(null)
      fetchProjects()
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
      await Promise.all(selectedIds.map(id => fetch(`/api/projects/${id}`, { method: 'DELETE' })))
      toast({ title: 'Đã xóa các mục đã chọn', variant: 'success' })
      setSelectedIds([])
      fetchProjects()
    } catch (err: any) {
      toast({ title: 'Lỗi khi xóa', description: err.message, variant: 'error' })
    } finally {
      setIsBulkDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Building2 className="w-5 h-5 text-amber-500" /><h1 className="text-xl font-bold text-slate-900 dark:text-white">Công trình</h1></div>
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <button onClick={handleBulkDelete} disabled={isBulkDeleting} className="flex items-center gap-2 bg-red-100 text-red-600 hover:bg-red-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              {isBulkDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Xóa {selectedIds.length} mục
            </button>
          )}
          {hasPermission('projects.create') && (
            <button onClick={handleOpenAdd} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition flex items-center gap-1">
              <Plus className="w-4 h-4" />Thêm mới
            </button>
          )}
        </div>
      </div>

      <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm công trình..." className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50" /></div>
      
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {loading ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div> : projects.length === 0 ? <div className="text-center py-12 text-slate-500">Không có dữ liệu</div> : (
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 dark:bg-slate-800/50"><tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
            <th className="px-4 py-3 w-10">
              <input type="checkbox" checked={projects.length > 0 && selectedIds.length === projects.length} onChange={e => setSelectedIds(e.target.checked ? projects.map((p: any) => p.id) : [])} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
            </th>
            <th className="px-4 py-3">Mã</th><th className="px-4 py-3">Tên công trình</th><th className="px-4 py-3 hidden md:table-cell">Địa chỉ</th><th className="px-4 py-3 hidden lg:table-cell">Chủ đầu tư</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3 hidden md:table-cell">Chuyến</th><th className="px-4 py-3 text-right">Thao tác</th></tr></thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">{projects.map((p: any) => (
            <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
              <td className="px-4 py-3">
                <input type="checkbox" checked={selectedIds.includes(p.id)} onChange={e => setSelectedIds(prev => e.target.checked ? [...prev, p.id] : prev.filter(id => id !== p.id))} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
              </td>
              <td className="px-4 py-3 font-mono font-semibold text-slate-900 dark:text-white">{p.code}</td>
              <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{p.name}</td>
              <td className="px-4 py-3 hidden md:table-cell text-slate-500 text-xs">{p.address || '-'}</td>
              <td className="px-4 py-3 hidden lg:table-cell text-slate-500 text-xs">{p.investor || '-'}</td>
              <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${PROJECT_STATUS_COLORS[p.status] || ''}`}>{PROJECT_STATUS_LABELS[p.status] || p.status}</span></td>
              <td className="px-4 py-3 hidden md:table-cell text-slate-500">{p._count?.trips || 0}</td>
              <td className="px-4 py-3 flex justify-end gap-2">
                <button onClick={() => handleOpenEdit(p)} className="p-1 text-slate-400 hover:text-blue-600 transition-colors"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => setDeleteId(p.id)} className="p-1 text-slate-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
              </td>
            </tr>
          ))}</tbody></table></div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => !submitting && setIsModalOpen(false)} title={editingId ? 'Sửa Công trình' : 'Thêm Công trình'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Mã công trình *</label>
            <input required value={formData.code} onChange={e => setFormData(p => ({...p, code: e.target.value.toUpperCase()}))} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none uppercase font-mono" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Tên công trình *</label>
            <input required value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Địa chỉ</label>
            <input value={formData.address} onChange={e => setFormData(p => ({...p, address: e.target.value}))} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Chủ đầu tư</label>
            <input value={formData.investor} onChange={e => setFormData(p => ({...p, investor: e.target.value}))} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Trạng thái</label>
            <select value={formData.status} onChange={e => setFormData(p => ({...p, status: e.target.value}))} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="ACTIVE">Đang thi công (ACTIVE)</option>
              <option value="COMPLETED">Đã hoàn thành (COMPLETED)</option>
              <option value="SUSPENDED">Tạm ngưng (SUSPENDED)</option>
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
        title="Xóa công trình"
        message="Bạn có chắc chắn muốn xóa công trình này? Thao tác này không thể hoàn tác."
        loading={submitting}
      />
    </div>
  )
}
