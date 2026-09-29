'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { toast } from '@/components/ui/toaster'
import { ArrowUpFromLine, Search, Loader2, CheckCircle2, Clock, Package } from 'lucide-react'

export default function CheckOutPage() {
  const { user } = useAuth()
  const searchRef = useRef<HTMLInputElement>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [onsiteTrips, setOnsiteTrips] = useState<any[]>([])
  const [filteredTrips, setFilteredTrips] = useState<any[]>([])
  const [selectedTrip, setSelectedTrip] = useState<any>(null)
  const [actualVolume, setActualVolume] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  // Load on-site trips
  useEffect(() => {
    const fetchOnsite = async () => {
      try {
        const res = await fetch('/api/trips/onsite')
        const data = await res.json()
        if (data.success) {
          setOnsiteTrips(data.data || [])
          setFilteredTrips(data.data || [])
        }
      } catch (error) {
        console.error('Failed to load:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchOnsite()
  }, [])

  // Filter trips
  useEffect(() => {
    if (!searchQuery) {
      setFilteredTrips(onsiteTrips)
      return
    }
    const q = searchQuery.toUpperCase()
    setFilteredTrips(
      onsiteTrips.filter(t =>
        t.vehicle?.plateNumber?.toUpperCase().includes(q) ||
        t.driver?.fullName?.toUpperCase().includes(q) ||
        t.tripCode?.toUpperCase().includes(q)
      )
    )
  }, [searchQuery, onsiteTrips])

  const selectTrip = (trip: any) => {
    setSelectedTrip(trip)
    setActualVolume(trip.expectedVolume?.toString() || '')
  }

  const handleCheckOut = async () => {
    if (!selectedTrip) return
    setSubmitting(true)

    try {
      const res = await fetch(`/api/trips/${selectedTrip.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'check_out',
          actualVolume: actualVolume ? parseFloat(actualVolume) : null,
          notes,
        }),
      })

      const data = await res.json()

      if (data.success) {
        setSuccess(true)
        toast({ title: 'Xe ra thành công!', description: `${selectedTrip.vehicle?.plateNumber} đã hoàn thành`, variant: 'success' })

        setTimeout(() => {
          setSuccess(false)
          setSelectedTrip(null)
          setActualVolume('')
          setNotes('')
          setSearchQuery('')
          // Remove from list
          setOnsiteTrips(prev => prev.filter(t => t.id !== selectedTrip.id))
          searchRef.current?.focus()
        }, 2000)
      } else {
        toast({ title: 'Lỗi', description: data.error?.message || 'Không thể xử lý', variant: 'error' })
      }
    } catch (error) {
      toast({ title: 'Lỗi kết nối', variant: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  if (success && selectedTrip) {
    return (
      <div className="max-w-lg mx-auto mt-12 text-center">
        <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4 animate-in zoom-in duration-300">
          <CheckCircle2 className="w-10 h-10 text-blue-500" />
        </div>
        <h2 className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-2">XE RA THÀNH CÔNG!</h2>
        <p className="text-slate-500 dark:text-slate-400 font-mono text-xl mb-1">{selectedTrip.vehicle?.plateNumber}</p>
        <p className="text-sm text-slate-400">Trạng thái: HOÀN THÀNH</p>
        <p className="text-xs text-slate-400 mt-4">Chuẩn bị cho xe tiếp theo...</p>
      </div>
    )
  }

  // Show selected trip detail
  if (selectedTrip) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center text-white">
            <ArrowUpFromLine className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">XÁC NHẬN XE RA</h1>
            <p className="text-sm text-slate-500">Kiểm tra thông tin · Giờ ra tự động</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          {/* Trip info */}
          <div className="grid grid-cols-2 gap-4">
            <InfoRow label="Mã chuyến" value={selectedTrip.tripCode} />
            <InfoRow label="Biển số" value={selectedTrip.vehicle?.plateNumber} mono />
            <InfoRow label="Tài xế" value={selectedTrip.driver?.fullName} />
            <InfoRow label="Vật liệu" value={selectedTrip.material?.name} />
            <InfoRow label="Số m³ dự kiến" value={`${selectedTrip.expectedVolume || 0} m³`} />
            <InfoRow label="Điểm đổ" value={selectedTrip.dumpLocation?.name || 'N/A'} />
            <InfoRow
              label="Giờ vào"
              value={selectedTrip.checkInAt ? new Date(selectedTrip.checkInAt).toLocaleString('vi-VN') : 'N/A'}
            />
            <InfoRow label="Công trình" value={selectedTrip.project?.name || 'N/A'} />
          </div>

          <hr className="border-slate-100 dark:border-slate-800" />

          {/* Actual volume */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Số m³ thực tế
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={actualVolume}
              onChange={(e) => setActualVolume(e.target.value)}
              className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition"
              placeholder="Nhập số khối thực tế"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Ghi chú</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition resize-none"
              placeholder="Ghi chú (tùy chọn)"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => setSelectedTrip(null)}
              className="flex-1 py-3 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition font-medium"
            >
              Quay lại
            </button>
            <button
              onClick={handleCheckOut}
              disabled={submitting}
              className="flex-[2] py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25"
            >
              {submitting ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Đang xử lý...</>
              ) : (
                <><ArrowUpFromLine className="w-5 h-5" /> XÁC NHẬN XE RA</>
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Main: search for trip to check out
  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center text-white">
          <ArrowUpFromLine className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">XE RA KHỎI CÔNG TRÌNH</h1>
          <p className="text-sm text-slate-500">Tìm xe để ghi nhận xe ra</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          ref={searchRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
          placeholder="Tìm biển số xe, tên tài xế..."
          className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition"
          autoFocus
        />
      </div>

      {/* On-site trips list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : filteredTrips.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Không tìm thấy xe</p>
          <p className="text-sm mt-1">
            {searchQuery ? 'Thử tìm biển số khác' : 'Không có xe nào đang ở công trình'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-slate-500 mb-2">
            {filteredTrips.length} xe đang ở công trình · Chọn xe để ghi nhận ra
          </p>
          {filteredTrips.map((trip: any) => (
            <button
              key={trip.id}
              onClick={() => selectTrip(trip)}
              className="w-full text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm transition"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                    <ArrowUpFromLine className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-mono font-bold text-slate-900 dark:text-white text-lg">
                      {trip.vehicle?.plateNumber}
                    </p>
                    <p className="text-sm text-slate-500">
                      {trip.driver?.fullName} · {trip.material?.name} · {trip.expectedVolume || 0} m³
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-sm text-slate-400">
                    <Clock className="w-3 h-3" />
                    {trip.checkInAt ? new Date(trip.checkInAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{trip.dumpLocation?.name || ''}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`text-sm font-medium text-slate-900 dark:text-white ${mono ? 'font-mono' : ''}`}>
        {value}
      </p>
    </div>
  )
}
