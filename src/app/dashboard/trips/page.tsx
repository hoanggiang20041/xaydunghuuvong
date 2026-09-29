'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { toast } from '@/components/ui/toaster'
import { TRIP_STATUS_LABELS, TRIP_STATUS_COLORS } from '@/lib/constants'
import { Route, Search, Filter, Loader2, Eye, Clock, Camera, X, Edit2 } from 'lucide-react'
import Link from 'next/link'
import { Modal } from '@/components/ui/modal'

export default function TripsPage() {
  const { hasPermission } = useAuth()
  const [trips, setTrips] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [viewImage, setViewImage] = useState<string | null>(null)

  // Edit logic
  const [editTrip, setEditTrip] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)
  const [editForm, setEditForm] = useState({
    driverId: '',
    dumpLocationId: '',
    expectedVolume: '',
    actualVolume: '',
    notes: ''
  })
  const [options, setOptions] = useState({ drivers: [], dumpLocations: [] })

  const fetchOptions = async () => {
    try {
      const [dr, dl] = await Promise.all([
        fetch('/api/drivers').then(r => r.json()),
        fetch('/api/dump-locations').then(r => r.json())
      ])
      setOptions({
        drivers: dr.data || [],
        dumpLocations: dl.data || []
      })
    } catch (e) {
      console.error(e)
    }
  }

  const handleOpenEdit = (trip: any) => {
    setEditTrip(trip)
    setEditForm({
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

  const fetchTrips = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: page.toString(), pageSize: '20' })
      if (search) params.set('search', search)
      if (status) params.set('status', status)

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
  }, [search, status, page])

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
            <Link href="/dashboard/trips/check-in" className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition">
              + Xe vào
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
                  <th className="px-4 py-3">Mã chuyến</th>
                  <th className="px-4 py-3">Biển số</th>
                  <th className="px-4 py-3 hidden md:table-cell">Tài xế</th>
                  <th className="px-4 py-3 hidden lg:table-cell">Vật liệu</th>
                  <th className="px-4 py-3">m³</th>
                  <th className="px-4 py-3 hidden xl:table-cell">Điểm đổ</th>
                  <th className="px-4 py-3 text-center">Ảnh</th>
                  <th className="px-4 py-3 hidden md:table-cell">Giờ vào</th>
                  <th className="px-4 py-3 hidden lg:table-cell">Giờ ra</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {trips.map((trip: any) => (
                  <tr key={trip.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-slate-600 dark:text-slate-300">{trip.tripCode}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono font-semibold text-slate-900 dark:text-white">{trip.vehicle?.plateNumber}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-slate-600 dark:text-slate-300">{trip.driver?.fullName}</td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="inline-flex px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-xs">{trip.material?.name}</span>
                    </td>
                    <td className="px-4 py-3 font-medium">{Number(trip.actualVolume || trip.expectedVolume || 0).toLocaleString('vi-VN')}</td>
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
                    <td className="px-4 py-3 hidden md:table-cell text-xs text-slate-500">
                      {trip.checkInAt ? new Date(trip.checkInAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : '-'}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-slate-500">
                      {trip.checkOutAt ? new Date(trip.checkOutAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${TRIP_STATUS_COLORS[trip.status] || ''}`}>
                        {TRIP_STATUS_LABELS[trip.status] || trip.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {hasPermission('trips.update') && (
                        <button onClick={() => handleOpenEdit(trip)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Bổ sung thông tin">
                          <Edit2 className="w-4 h-4" />
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

      {/* Edit Modal */}
      <Modal isOpen={!!editTrip} onClose={() => !submitting && setEditTrip(null)} title={`Bổ sung thông tin: ${editTrip?.tripCode}`}>
        <form onSubmit={handleUpdateTrip} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Tài xế</label>
              <select value={editForm.driverId} onChange={e => setEditForm(p => ({...p, driverId: e.target.value}))} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none text-sm">
                <option value="">-- Chọn tài xế --</option>
                {options.drivers.map((d: any) => <option key={d.id} value={d.id}>{d.fullName}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Điểm đổ hàng</label>
              <select value={editForm.dumpLocationId} onChange={e => setEditForm(p => ({...p, dumpLocationId: e.target.value}))} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none text-sm">
                <option value="">-- Chọn điểm đổ --</option>
                {options.dumpLocations.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
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
    </div>
  )
}
