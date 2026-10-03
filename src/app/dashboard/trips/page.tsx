'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { toast } from '@/components/ui/toaster'
import { TRIP_STATUS_LABELS, TRIP_STATUS_COLORS } from '@/lib/constants'
import { Route, Search, Filter, Loader2, Eye, Clock, Camera, X, Edit2, Trash2, Zap, Info, Ruler } from 'lucide-react'
import Link from 'next/link'
import { Modal } from '@/components/ui/modal'

export default function TripsPage() {
  const { hasPermission } = useAuth()
  const [trips, setTrips] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [date, setDate] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [viewImage, setViewImage] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [detailTrip, setDetailTrip] = useState<any>(null)

  // Edit logic
  const [editTrip, setEditTrip] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)
  const [editForm, setEditForm] = useState({
    projectId: '',
    materialId: '',
    vehicleId: '',
    pickupLocationId: '',
    driverId: '',
    dumpLocationId: '',
    expectedVolume: '',
    actualVolume: '',
    notes: ''
  })
  const [options, setOptions] = useState<any>({ drivers: [], dumpLocations: [], projects: [], materials: [], vehicles: [], pickupLocations: [] })

  const fetchOptions = async () => {
    try {
      const [dr, dl, pr, ma, ve, pl] = await Promise.all([
        fetch('/api/drivers').then(r => r.json()),
        fetch('/api/dump-locations').then(r => r.json()),
        fetch('/api/projects').then(r => r.json()),
        fetch('/api/materials').then(r => r.json()),
        fetch('/api/vehicles').then(r => r.json()),
        fetch('/api/pickup-locations').then(r => r.json())
      ])
      setOptions({
        drivers: dr.data || [],
        dumpLocations: dl.data || [],
        projects: pr.data || [],
        materials: ma.data || [],
        vehicles: ve.data || [],
        pickupLocations: pl.data || []
      })
    } catch (e) {
      console.error(e)
    }
  }

  const handleOpenEdit = (trip: any) => {
    setEditTrip(trip)
    setEditForm({
      projectId: trip.projectId || '',
      materialId: trip.materialId || '',
      vehicleId: trip.vehicleId || '',
      pickupLocationId: trip.pickupLocationId || '',
      driverId: trip.driverId || '',
      dumpLocationId: trip.dumpLocationId || '',
      expectedVolume: trip.expectedVolume ? String(trip.expectedVolume) : '',
      actualVolume: trip.actualVolume ? String(trip.actualVolume) : '',
      notes: trip.notes || ''
    })
    if (options.drivers.length === 0) fetchOptions()
  }

  const handleUpdateTrip = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editTrip) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/trips/${editTrip.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_info',
          projectId: editForm.projectId || null,
          materialId: editForm.materialId || null,
          vehicleId: editForm.vehicleId || null,
          pickupLocationId: editForm.pickupLocationId || null,
          driverId: editForm.driverId || null,
          dumpLocationId: editForm.dumpLocationId || null,
          expectedVolume: editForm.expectedVolume ? Number(editForm.expectedVolume) : null,
          actualVolume: editForm.actualVolume ? Number(editForm.actualVolume) : null,
          notes: editForm.notes
        })
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.message)
      toast({ title: 'Cập nhật thành công', variant: 'success' })
      setEditTrip(null)
      fetchTrips()
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.message, variant: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      const res = await fetch(`/api/trips/${deleteId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!data.success) throw new Error(data.error?.message || data.message || 'Lỗi hệ thống')
      toast({ title: 'Xóa chuyến xe thành công', variant: 'success' })
      setDeleteId(null)
      fetchTrips()
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.message, variant: 'error' })
    }
  }

  const fetchTrips = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: page.toString(), pageSize: '20' })
      if (search) params.set('search', search)
      if (status) params.set('status', status)
      if (date) {
        params.set('startDate', date)
        params.set('endDate', date)
      }

      const res = await fetch(`/api/trips?${params}`)
      const data = await res.json()
      if (data.success) {
        setTrips(data.data || [])
        setTotalPages(data.meta?.totalPages || 1)
        setTotal(data.meta?.total || 0)
      }
    } catch {
      toast({ title: 'Lỗi tải dữ liệu', variant: 'error' })
    } finally {
      setLoading(false)
    }
  }, [search, status, date, page])

  useEffect(() => { fetchTrips() }, [fetchTrips])

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <Route className="w-5 h-5 text-amber-500" />
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Chuyến xe</h1>
          <span className="text-sm text-slate-400">({total})</span>
        </div>
        <div className="flex items-center gap-2">
          {hasPermission('trips.check_in') && (
            <Link href="/dashboard/quick-action" className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition flex items-center gap-1">
              <Zap className="w-4 h-4" /> Thao tác nhanh
            </Link>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Tìm biển số, tài xế, mã chuyến..."
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition"
          />
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => { setDate(e.target.value); setPage(1) }}
          className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-slate-500"
        />
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1) }}
          className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
        >
          <option value="">Tất cả trạng thái</option>
          {Object.entries(TRIP_STATUS_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : trips.length === 0 ? (
          <div className="text-center py-12 text-slate-500"><p>Không có dữ liệu</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="px-4 py-3 w-12">STT</th>
                  <th className="px-4 py-3">Mã chuyến</th>
                  <th className="px-4 py-3">Công trình</th>
                  <th className="px-4 py-3">Biển số</th>
                  <th className="px-4 py-3 hidden md:table-cell">Tài xế</th>
                  <th className="px-4 py-3 hidden lg:table-cell">Vật liệu</th>
                  <th className="px-4 py-3">m³</th>
                  <th className="px-4 py-3 hidden xl:table-cell">Điểm đổ</th>
                  <th className="px-4 py-3 text-center">Ảnh</th>
                  <th className="px-4 py-3 whitespace-nowrap">Giờ vào</th>
                  <th className="px-4 py-3 whitespace-nowrap">Giờ ra</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {trips.map((trip: any, index: number) => (
                  <tr key={trip.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition cursor-pointer" onClick={() => setDetailTrip(trip)}>
                    <td className="px-4 py-3 text-xs text-slate-400">{(page - 1) * 20 + index + 1}</td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-slate-600 dark:text-slate-300">{trip.tripCode}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-slate-600 dark:text-slate-300">{trip.project?.name || '-'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono font-semibold text-slate-900 dark:text-white">{trip.vehicle?.plateNumber}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-slate-600 dark:text-slate-300">{trip.driver?.fullName}</td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="inline-flex px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-xs">{trip.material?.name}</span>
                    </td>
                    <td className="px-4 py-3 font-medium">
                      <div>
                        {Number(trip.volumeM3 || trip.actualVolume || trip.expectedVolume || 0).toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        {trip.calculationMethod === 'dimensions' && (
                          <span title={`${trip.lengthM}×${trip.widthM}×${trip.heightM}`}><Ruler className="w-3 h-3 text-blue-400 inline-block ml-1" /></span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell text-slate-500 text-xs">{trip.dumpLocation?.name || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-1">
                        {trip.checkInPhotoUrl && (
                          <button onClick={() => setViewImage(trip.checkInPhotoUrl)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors" title="Ảnh vào">
                            <Camera className="w-4 h-4" />
                          </button>
                        )}
                        {trip.checkOutPhotoUrl && (
                          <button onClick={() => setViewImage(trip.checkOutPhotoUrl)} className="p-1 text-amber-600 hover:bg-amber-50 rounded transition-colors" title="Ảnh ra">
                            <Camera className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {trip.checkInAt ? new Date(trip.checkInAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {trip.checkOutAt ? new Date(trip.checkOutAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${TRIP_STATUS_COLORS[trip.status] || ''}`}>
                        {TRIP_STATUS_LABELS[trip.status] || trip.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {hasPermission('trips.update') && (
                        <button onClick={(e) => { e.stopPropagation(); handleOpenEdit(trip) }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Bổ sung thông tin">
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      {hasPermission('trips.delete') && (
                        <button onClick={(e) => { e.stopPropagation(); setDeleteId(trip.id) }} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors ml-1" title="Xóa chuyến">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-800">
            <p className="text-xs text-slate-500">Trang {page}/{totalPages} · {total} kết quả</p>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1 border border-slate-200 dark:border-slate-700 rounded text-xs disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800 transition">←</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-3 py-1 border border-slate-200 dark:border-slate-700 rounded text-xs disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800 transition">→</button>
            </div>
          </div>
        )}
      </div>

      {viewImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4" onClick={() => setViewImage(null)}>
          <div className="relative max-w-4xl max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <button onClick={() => setViewImage(null)} className="absolute -top-12 right-0 p-2 text-white hover:text-slate-300 transition-colors">
              <X className="w-8 h-8" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={viewImage} className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" alt="Ảnh chuyến xe" />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Xác nhận xóa chuyến xe">
        <div className="p-1">
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
            Bạn có chắc chắn muốn xóa chuyến xe này? Hành động này không thể hoàn tác và chuyến xe sẽ bị đánh dấu đã xóa.
          </p>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setDeleteId(null)} className="px-5 py-2.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 rounded-lg text-sm font-medium transition-all">Hủy</button>
            <button onClick={handleDelete} className="px-5 py-2.5 bg-red-600 text-white hover:bg-red-700 rounded-lg text-sm font-medium transition-all shadow-sm">Xác nhận xóa</button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editTrip} onClose={() => !submitting && setEditTrip(null)} title={`Bổ sung thông tin: ${editTrip?.tripCode}`}>
        <form onSubmit={handleUpdateTrip} className="space-y-4">
          
          {/* Display Check-in Photo if available to help identify the trip */}
          {editTrip?.checkInPhotoUrl && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Ảnh xe vào (Nhấn để phóng to)</label>
              <div 
                className="relative rounded-lg overflow-hidden border border-slate-200 cursor-pointer hover:opacity-90 transition bg-black h-48 flex items-center justify-center"
                onClick={() => setViewImage(editTrip.checkInPhotoUrl)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={editTrip.checkInPhotoUrl} alt="Ảnh vào" className="max-w-full max-h-full object-contain" />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Công trình <span className="text-red-500">*</span></label>
              <select value={editForm.projectId} onChange={e => setEditForm(p => ({...p, projectId: e.target.value}))} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none text-sm" required>
                <option value="">-- Chọn công trình --</option>
                {options.projects?.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Vật liệu <span className="text-red-500">*</span></label>
              <select value={editForm.materialId} onChange={e => setEditForm(p => ({...p, materialId: e.target.value}))} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none text-sm" required>
                <option value="">-- Chọn vật liệu --</option>
                {options.materials?.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Xe vận chuyển <span className="text-red-500">*</span></label>
              <select value={editForm.vehicleId} onChange={e => setEditForm(p => ({...p, vehicleId: e.target.value}))} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none text-sm" required>
                <option value="">-- Chọn xe --</option>
                {options.vehicles?.map((v: any) => <option key={v.id} value={v.id}>{v.plateNumber}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tài xế</label>
              <select value={editForm.driverId} onChange={e => setEditForm(p => ({...p, driverId: e.target.value}))} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none text-sm">
                <option value="">-- Chọn tài xế --</option>
                {options.drivers?.map((d: any) => <option key={d.id} value={d.id}>{d.fullName}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Điểm lấy hàng</label>
              <select value={editForm.pickupLocationId} onChange={e => setEditForm(p => ({...p, pickupLocationId: e.target.value}))} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none text-sm">
                <option value="">-- Chọn điểm lấy --</option>
                {options.pickupLocations?.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Điểm đổ hàng</label>
              <select value={editForm.dumpLocationId} onChange={e => setEditForm(p => ({...p, dumpLocationId: e.target.value}))} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none text-sm">
                <option value="">-- Chọn điểm đổ --</option>
                {options.dumpLocations?.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Số m³ dự kiến</label>
              <input type="number" step="0.1" min="0" value={editForm.expectedVolume} onChange={e => setEditForm(p => ({...p, expectedVolume: e.target.value}))} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Số m³ thực tế</label>
              <input type="number" step="0.1" min="0" value={editForm.actualVolume} onChange={e => setEditForm(p => ({...p, actualVolume: e.target.value}))} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Ghi chú</label>
            <textarea value={editForm.notes} onChange={e => setEditForm(p => ({...p, notes: e.target.value}))} rows={2} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none"></textarea>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={() => setEditTrip(null)} disabled={submitting} className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition">Hủy</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Edit2 className="w-4 h-4" />}
              Lưu thay đổi
            </button>
          </div>
        </form>
      </Modal>

      {/* Trip Detail Modal */}
      <Modal isOpen={!!detailTrip} onClose={() => setDetailTrip(null)} title={`Chi tiết chuyến: ${detailTrip?.tripCode || ''}`}>
        {detailTrip && (
          <div className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                <span className="text-slate-500 text-xs block">Biển số</span>
                <span className="font-bold text-slate-900 dark:text-white">{detailTrip.vehicle?.plateNumber}</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                <span className="text-slate-500 text-xs block">Tài xế</span>
                <span className="font-medium text-slate-900 dark:text-white">{detailTrip.driver?.fullName || 'Không rõ'}</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                <span className="text-slate-500 text-xs block">Công trình</span>
                <span className="font-medium text-slate-900 dark:text-white">{detailTrip.project?.name}</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                <span className="text-slate-500 text-xs block">Vật liệu</span>
                <span className="font-medium text-slate-900 dark:text-white">{detailTrip.material?.name}</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                <span className="text-slate-500 text-xs block">Giờ vào</span>
                <span className="font-medium text-slate-900 dark:text-white">
                  {detailTrip.checkInAt ? new Date(detailTrip.checkInAt).toLocaleString('vi-VN') : '-'}
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                <span className="text-slate-500 text-xs block">Giờ ra</span>
                <span className="font-medium text-slate-900 dark:text-white">
                  {detailTrip.checkOutAt ? new Date(detailTrip.checkOutAt).toLocaleString('vi-VN') : '-'}
                </span>
              </div>
              {detailTrip.dumpLocation && (
                <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                  <span className="text-slate-500 text-xs block">Điểm đổ</span>
                  <span className="font-medium text-slate-900 dark:text-white">{detailTrip.dumpLocation.name}</span>
                </div>
              )}
              {detailTrip.pickupLocation && (
                <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                  <span className="text-slate-500 text-xs block">Điểm lấy hàng</span>
                  <span className="font-medium text-slate-900 dark:text-white">{detailTrip.pickupLocation.name}</span>
                </div>
              )}
            </div>

            {/* Volume / Dimensions */}
            <div className="border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <h4 className="text-sm font-bold text-blue-900 dark:text-blue-200 mb-3 flex items-center gap-2">
                <Ruler className="w-4 h-4" /> Thông tin khối lượng
              </h4>
              {detailTrip.calculationMethod === 'dimensions' && detailTrip.lengthM && detailTrip.widthM && detailTrip.heightM ? (
                <div className="space-y-2">
                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    Phương pháp: <span className="font-medium">Tính theo kích thước</span>
                  </div>
                  <table className="w-full text-sm">
                    <tbody>
                      <tr className="border-b border-blue-100 dark:border-blue-800">
                        <td className="py-1.5 text-slate-600 dark:text-slate-400">Dài</td>
                        <td className="py-1.5 text-right font-medium">{Number(detailTrip.lengthM).toFixed(2)} m</td>
                      </tr>
                      <tr className="border-b border-blue-100 dark:border-blue-800">
                        <td className="py-1.5 text-slate-600 dark:text-slate-400">Rộng</td>
                        <td className="py-1.5 text-right font-medium">{Number(detailTrip.widthM).toFixed(2)} m</td>
                      </tr>
                      <tr className="border-b border-blue-100 dark:border-blue-800">
                        <td className="py-1.5 text-slate-600 dark:text-slate-400">Cao</td>
                        <td className="py-1.5 text-right font-medium">{Number(detailTrip.heightM).toFixed(2)} m</td>
                      </tr>
                    </tbody>
                  </table>
                  <div className="text-xs text-slate-500 pt-1">
                    {Number(detailTrip.lengthM).toFixed(2)} × {Number(detailTrip.widthM).toFixed(2)} × {Number(detailTrip.heightM).toFixed(2)} =
                  </div>
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                    {Number(detailTrip.volumeM3 || 0).toFixed(2)} m³
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                    Phương pháp: <span className="font-medium">Nhập trực tiếp</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                    {Number(detailTrip.volumeM3 || detailTrip.actualVolume || detailTrip.expectedVolume || 0).toFixed(2)} m³
                  </div>
                </div>
              )}
            </div>

            {/* Photos */}
            {(detailTrip.checkInPhotoUrl || detailTrip.checkOutPhotoUrl) && (
              <div className="grid grid-cols-2 gap-3">
                {detailTrip.checkInPhotoUrl && (
                  <div>
                    <span className="text-xs text-slate-500 block mb-1">Ảnh vào</span>
                    <img 
                      src={detailTrip.checkInPhotoUrl} 
                      alt="Ảnh vào" 
                      className="w-full h-32 object-cover rounded-lg border cursor-pointer hover:opacity-80 transition" 
                      onClick={() => setViewImage(detailTrip.checkInPhotoUrl)}
                    />
                  </div>
                )}
                {detailTrip.checkOutPhotoUrl && (
                  <div>
                    <span className="text-xs text-slate-500 block mb-1">Ảnh ra</span>
                    <img 
                      src={detailTrip.checkOutPhotoUrl} 
                      alt="Ảnh ra" 
                      className="w-full h-32 object-cover rounded-lg border cursor-pointer hover:opacity-80 transition" 
                      onClick={() => setViewImage(detailTrip.checkOutPhotoUrl)}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            {detailTrip.notes && (
              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                <span className="text-slate-500 text-xs block">Ghi chú</span>
                <p className="text-sm text-slate-700 dark:text-slate-200 mt-1">{detailTrip.notes}</p>
              </div>
            )}

            {/* Status */}
            <div className="flex items-center justify-between pt-2 border-t">
              <span className={`inline-flex px-3 py-1.5 rounded-full text-xs font-medium ${TRIP_STATUS_COLORS[detailTrip.status] || ''}`}>
                {TRIP_STATUS_LABELS[detailTrip.status] || detailTrip.status}
              </span>
              <div className="flex gap-2">
                {hasPermission('trips.update') && (
                  <button onClick={() => { setDetailTrip(null); handleOpenEdit(detailTrip) }} className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 transition">
                    Bổ sung thông tin
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
