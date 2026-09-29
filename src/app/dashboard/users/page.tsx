'use client'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { toast } from '@/components/ui/toaster'
import { UserCog, Search, Loader2, Plus, Edit2, Trash2 } from 'lucide-react'
import { ROLE_LABELS } from '@/lib/constants'
import { Modal } from '@/components/ui/modal'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

export default function UsersPage() {
  const { user } = useAuth()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ username: '', fullName: '', email: '', password: '', role: 'GATE_STAFF' })
  const [submitting, setSubmitting] = useState(false)

  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)

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

  const handleOpenAdd = () => {
    setEditingId(null)
    setFormData({ username: '', fullName: '', email: '', password: '', role: 'GATE_STAFF' })
    setIsModalOpen(true)
  }

  const handleOpenEdit = (u: any) => {
    setEditingId(u.id)
    const role = u.userRoles?.[0]?.role?.name || 'GATE_STAFF'
    setFormData({ username: u.username, fullName: u.fullName, email: u.email || '', password: '', role })
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const url = editingId ? `/api/users/${editingId}` : '/api/users'
      const method = editingId ? 'PUT' : 'POST'
      const payload = { ...formData, roles: [formData.role] }
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      
      if (!data.success) throw new Error(data.error?.message || data.message || 'Lỗi không xác định')
      toast({ title: 'Thành công', variant: 'success' })
      setIsModalOpen(false)
      fetchUsers()
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
      const res = await fetch(`/api/users/${deleteId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!data.success) throw new Error(data.error?.message || data.message || 'Lỗi không xác định')
      toast({ title: 'Đã xóa', variant: 'success' })
      setDeleteId(null)
      fetchUsers()
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.message, variant: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    if (!confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.length} người dùng đã chọn?`)) return
    setIsBulkDeleting(true)
    try {
      await Promise.all(selectedIds.map(id => fetch(`/api/users/${id}`, { method: 'DELETE' })))
      toast({ title: 'Đã xóa các mục đã chọn', variant: 'success' })
      setSelectedIds([])
      fetchUsers()
    } catch (err: any) {
      toast({ title: 'Lỗi khi xóa', description: err.message, variant: 'error' })
    } finally {
      setIsBulkDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UserCog className="w-5 h-5 text-amber-500" />
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Người dùng</h1>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <button onClick={handleBulkDelete} disabled={isBulkDeleting} className="flex items-center gap-2 bg-red-100 text-red-600 hover:bg-red-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              {isBulkDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Xóa {selectedIds.length} mục
            </button>
          )}
          <button onClick={handleOpenAdd} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> Thêm mới
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm người dùng..." className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50" />
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {loading ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div> : (
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 dark:bg-slate-800/50"><tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
            <th className="px-4 py-3 w-10">
              <input type="checkbox" checked={users.length > 0 && selectedIds.length === users.length} onChange={e => setSelectedIds(e.target.checked ? users.map((u: any) => u.id) : [])} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
            </th>
            <th className="px-4 py-3">Username</th><th className="px-4 py-3">Họ tên</th><th className="px-4 py-3 hidden md:table-cell">Email</th><th className="px-4 py-3">Vai trò</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3 text-right">Thao tác</th></tr></thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {users.map((u: any) => (
              <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                <td className="px-4 py-3">
                  <input type="checkbox" checked={selectedIds.includes(u.id)} onChange={e => setSelectedIds(p => e.target.checked ? [...p, u.id] : p.filter(id => id !== u.id))} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                </td>
                <td className="px-4 py-3 font-mono text-slate-900 dark:text-white">{u.username}</td>
                <td className="px-4 py-3 font-medium">{u.fullName}</td>
                <td className="px-4 py-3 hidden md:table-cell text-slate-500 text-xs">{u.email}</td>
                <td className="px-4 py-3">{u.userRoles?.map((ur: any) => <span key={ur.role.name} className="inline-flex mr-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs font-medium">{ROLE_LABELS[ur.role.name] || ur.role.displayName}</span>)}</td>
                <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${u.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800'}`}>{u.isActive ? 'Hoạt động' : 'Khóa'}</span></td>
                <td className="px-4 py-3 flex justify-end gap-2">
                  <button onClick={() => handleOpenEdit(u)} className="p-1 text-slate-400 hover:text-blue-600 transition-colors"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => setDeleteId(u.id)} className="p-1 text-slate-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody></table></div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => !submitting && setIsModalOpen(false)} title={editingId ? 'Sửa Người dùng' : 'Thêm Người dùng'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
              Username <span className="text-red-500">*</span>
            </label>
            <input required value={formData.username} onChange={e => setFormData(p => ({...p, username: e.target.value}))} className="w-full px-3 py-2 border border-slate-300 rounded-lg dark:bg-slate-800 dark:border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
              Họ tên <span className="text-red-500">*</span>
            </label>
            <input required value={formData.fullName} onChange={e => setFormData(p => ({...p, fullName: e.target.value}))} className="w-full px-3 py-2 border border-slate-300 rounded-lg dark:bg-slate-800 dark:border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
              Email <span className="text-red-500">*</span>
            </label>
            <input type="email" required value={formData.email} onChange={e => setFormData(p => ({...p, email: e.target.value}))} className="w-full px-3 py-2 border border-slate-300 rounded-lg dark:bg-slate-800 dark:border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
              Mật khẩu {editingId && '(Bỏ trống nếu không đổi)'} <span className={!editingId ? 'text-red-500' : 'hidden'}>*</span>
            </label>
            <input type="password" minLength={8} required={!editingId} value={formData.password} onChange={e => setFormData(p => ({...p, password: e.target.value}))} placeholder="Tối thiểu 8 ký tự" className="w-full px-3 py-2 border border-slate-300 rounded-lg dark:bg-slate-800 dark:border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
              Vai trò <span className="text-red-500">*</span>
            </label>
            <select required value={formData.role} onChange={e => setFormData(p => ({...p, role: e.target.value}))} className="w-full px-3 py-2 border border-slate-300 rounded-lg dark:bg-slate-800 dark:border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all bg-white dark:bg-slate-800">
              <option value="GATE_STAFF">Bảo vệ cổng (Gate Staff)</option>
              <option value="SUPERVISOR">Giám sát (Supervisor)</option>
              <option value="ACCOUNTANT">Kế toán (Accountant)</option>
              <option value="ADMIN">Quản lý (Admin)</option>
              {user?.isSuperAdmin && <option value="SUPER_ADMIN">Quản trị tối cao (Super Admin)</option>}
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
        title="Xóa người dùng"
        message="Bạn có chắc chắn muốn xóa người dùng này? Thao tác này không thể hoàn tác."
        loading={submitting}
      />
    </div>
  )
}
