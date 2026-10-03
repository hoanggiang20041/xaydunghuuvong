'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'
import Link from 'next/link'
import {
  Truck, TrendingUp, ArrowDownToLine, ArrowUpFromLine, MapPin,
  Package, Clock, RefreshCw, AlertCircle
} from 'lucide-react'

interface Stats {
  totalTrips: number
  completedTrips: number
  onsiteVehicles: number
  totalVolume: number
  volumeByMaterial: { name: string; total: number; unit: string }[]
  todayTrips: number
}

export default function DashboardPage() {
  const { user, hasPermission } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentTrips, setRecentTrips] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('today')
  const [date, setDate] = useState('')
  const [error, setError] = useState('')

  const fetchStats = useCallback(async () => {
    if (!user) return
    try {
      setLoading(true)
      const res = await fetch(`/api/dashboard/stats?period=${period}&date=${date}`)
      const data = await res.json()
      if (data.success) { 
        setStats(data.data)
        setError('') 
      }
      else setError(data.error?.message || 'Lỗi tải dữ liệu')
    } catch {
      setError('Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối database.')
    } finally { 
      setLoading(false) 
    }
  }, [period, date, user])

  const range = (stats as any)?.range as { from: string; to: string } | undefined

  const fetchRecentTrips = useCallback(async () => {
    if (!user || !range) return
    try {
      const params = new URLSearchParams({ pageSize: '10', startDate: range.from, endDate: range.to })
      const res = await fetch(`/api/trips?${params}`)
      const data = await res.json()
      if (data.success) setRecentTrips(data.data || [])
    } catch {}
  }, [user, range?.from, range?.to])

  useEffect(() => { 
    fetchStats() 
  }, [fetchStats])

  useEffect(() => {
    fetchRecentTrips()
    const interval = setInterval(fetchRecentTrips, 15000)
    return () => clearInterval(interval)
  }, [fetchRecentTrips])

  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Chào buổi sáng'
    if (h < 18) return 'Chào buổi chiều'
    return 'Chào buổi tối'
  }

  const getHeaderText = () => {
    if (!mounted) return 'Đang tải ngày tháng...'
    if (date) {
      const d = new Date(date)
      if (!isNaN(d.getTime())) return `Ngày ${d.toLocaleDateString('vi-VN')}`
    }
    const now = new Date()
    switch (period) {
      case 'yesterday':
        const y = new Date(now)
        y.setDate(y.getDate() - 1)
        return `Hôm qua, ${y.toLocaleDateString('vi-VN')}`
      case 'week':
        return '7 ngày qua'
      case 'month':
        return `Tháng ${now.getMonth() + 1}/${now.getFullYear()}`
      case 'today':
      default:
        return `Hôm nay, ${now.toLocaleDateString('vi-VN')}`
    }
  }

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen p-4 md:p-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            {mounted ? greeting() : 'Xin chào'}, <span className="text-blue-600">{user?.fullName || 'bạn'}</span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {getHeaderText()}
          </p>
        </div>

        {/* Period filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
            {[
              { key: 'today', label: 'Hôm nay' },
              { key: 'yesterday', label: 'Hôm qua' },
              { key: 'week', label: '7 ngày' },
              { key: 'month', label: 'Tháng này' },
            ].map(p => (
              <button
                key={p.key}
                onClick={() => { setPeriod(p.key); setDate(''); setLoading(true) }}
                className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors border-r border-slate-200 last:border-r-0 ${
                  period === p.key && !date
                    ? 'bg-slate-100 text-slate-900' 
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="relative">
             <input type="date" value={date} onChange={(e) => { setDate(e.target.value); setPeriod(e.target.value ? '' : 'today'); setLoading(true) }} className="px-3 py-1.5 sm:py-2 w-full bg-white border border-slate-200 rounded-lg text-sm shadow-sm text-slate-700 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500" />
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-white border border-red-200 rounded-lg p-4 flex items-start gap-3 shadow-sm border-t-4 border-t-red-500">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700">Lỗi hệ thống</p>
            <p className="text-sm mt-1 text-slate-600">{error}</p>
            <button 
              onClick={() => { setLoading(true); fetchStats() }} 
              className="text-sm mt-3 flex items-center gap-1 font-medium text-red-600 hover:text-red-700"
            >
              <RefreshCw className="w-4 h-4" /> Thử lại
            </button>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      {hasPermission('trips.check_in') && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link href="/dashboard/quick-action" className="bg-white border border-slate-200 rounded-lg p-4 flex items-center gap-4 hover:bg-slate-50 transition border-l-4 border-l-blue-500 shadow-sm">
            <div className="w-10 h-10 rounded bg-blue-50 flex items-center justify-center">
              <ArrowDownToLine className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900">GHI NHẬN XE VÀO / RA</div>
              <div className="text-xs text-slate-500 mt-1">Thao tác nhanh cho xe công trình</div>
            </div>
          </Link>
        </div>
      )}

      {/* Stats Cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm h-24 animate-pulse flex flex-col justify-between">
              <div className="h-4 bg-slate-200 rounded w-1/2"></div>
              <div className="h-8 bg-slate-200 rounded w-1/3"></div>
            </div>
          ))}
        </div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm border-t-2 border-t-blue-500">
              <div className="flex items-center gap-2 mb-3">
                <Truck className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-500">TỔNG CHUYẾN</span>
              </div>
              <div className="text-3xl font-semibold text-slate-900">{stats.totalTrips}</div>
            </div>
            
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm border-t-2 border-t-emerald-500">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-500">HOÀN THÀNH</span>
              </div>
              <div className="text-3xl font-semibold text-slate-900">{stats.completedTrips}</div>
            </div>
            
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm border-t-2 border-t-amber-500">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-500">ĐANG Ở CT</span>
              </div>
              <div className="text-3xl font-semibold text-slate-900">{stats.onsiteVehicles}</div>
            </div>
            
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm border-t-2 border-t-indigo-500">
              <div className="flex items-center gap-2 mb-3">
                <Package className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-500">TỔNG M³</span>
              </div>
              <div className="text-3xl font-semibold text-slate-900">
                {Number(stats.totalVolume || 0).toLocaleString('vi-VN')}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Trips Table */}
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-500" />
                  <span className="text-base font-semibold text-slate-900">
                    Hoạt động gần đây
                  </span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-3 font-medium">Thời gian</th>
                      <th className="px-5 py-3 font-medium">Biển số</th>
                      <th className="px-5 py-3 font-medium">Vật liệu</th>
                      <th className="px-5 py-3 font-medium text-right">Khối lượng</th>
                      <th className="px-5 py-3 font-medium text-center">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTrips.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                          Chưa có hoạt động nào gần đây
                        </td>
                      </tr>
                    ) : (
                      recentTrips.map((t: any) => (
                        <tr key={t.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                          <td className="px-5 py-3 text-slate-500">
                            {t.checkInAt ? new Date(t.checkInAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '-'}
                          </td>
                          <td className="px-5 py-3 font-medium text-slate-900">{t.vehicle?.plateNumber}</td>
                          <td className="px-5 py-3 text-slate-600">{t.material?.name || '-'}</td>
                          <td className="px-5 py-3 text-slate-900 text-right font-medium">
                            {Number(t.expectedVolume || 0)} m³
                          </td>
                          <td className="px-5 py-3 text-center">
                            {t.status === 'onsite' ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                Đang ở CT
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Hoàn thành
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Volume by Material Table */}
            {stats.volumeByMaterial && stats.volumeByMaterial.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden h-fit">
                <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2">
                  <Package className="w-4 h-4 text-slate-500" />
                  <span className="text-base font-semibold text-slate-900">Khối lượng theo vật liệu</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-5 py-3 font-medium w-16">STT</th>
                        <th className="px-5 py-3 font-medium">Vật liệu</th>
                        <th className="px-5 py-3 font-medium text-right">Khối lượng</th>
                        <th className="px-5 py-3 font-medium w-24">Đơn vị</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.volumeByMaterial.map((m, i) => (
                        <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                          <td className="px-5 py-3 text-slate-500">{i + 1}</td>
                          <td className="px-5 py-3 font-medium text-slate-900">{m.name}</td>
                          <td className="px-5 py-3 text-right font-semibold text-slate-900">
                            {Number(m.total).toLocaleString('vi-VN')}
                          </td>
                          <td className="px-5 py-3 text-slate-500">{m.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  )
}
