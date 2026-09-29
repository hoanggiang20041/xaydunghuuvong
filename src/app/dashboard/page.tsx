'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'
import Link from 'next/link'
import {
  Truck, TrendingUp, ArrowDownToLine, ArrowUpFromLine, MapPin,
  Package, Clock, Loader2, RefreshCw, AlertCircle
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
  const [onsiteTrips, setOnsiteTrips] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('today')
  const [error, setError] = useState('')

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`/api/dashboard/stats?period=${period}`)
      const data = await res.json()
      if (data.success) { setStats(data.data); setError('') }
      else setError(data.error?.message || 'Lỗi tải dữ liệu')
    } catch {
      setError('Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối database.')
    } finally { setLoading(false) }
  }, [period])

  const fetchOnsite = useCallback(async () => {
    try {
      const res = await fetch('/api/trips/onsite')
      const data = await res.json()
      if (data.success) setOnsiteTrips(data.data || [])
    } catch {}
  }, [])

  useEffect(() => { fetchStats() }, [fetchStats])
  useEffect(() => {
    fetchOnsite()
    const interval = setInterval(fetchOnsite, 15000)
    return () => clearInterval(interval)
  }, [fetchOnsite])

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Chào buổi sáng'
    if (h < 18) return 'Chào buổi chiều'
    return 'Chào buổi tối'
  }

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>
            {greeting()}, {user?.fullName}
          </h2>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
          </p>
        </div>

        {/* Period filter */}
        <div className="flex border rounded overflow-hidden" style={{ borderColor: 'var(--border)' }}>
          {[
            { key: 'today', label: 'Hôm nay' },
            { key: 'yesterday', label: 'Hôm qua' },
            { key: 'week', label: '7 ngày' },
            { key: 'month', label: 'Tháng' },
          ].map(p => (
            <button
              key={p.key}
              onClick={() => { setPeriod(p.key); setLoading(true) }}
              className="px-3 py-1.5 text-xs font-medium transition"
              style={{
                background: period === p.key ? 'var(--primary)' : 'var(--card)',
                color: period === p.key ? 'white' : 'var(--muted)',
                borderRight: '1px solid var(--border)',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="card p-4 flex items-start gap-3" style={{ borderColor: '#e53e3e', borderLeftWidth: '3px' }}>
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#e53e3e' }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: '#e53e3e' }}>Lỗi hệ thống</p>
            <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>{error}</p>
            <button onClick={() => { setLoading(true); fetchStats() }} className="text-xs mt-2 flex items-center gap-1 font-medium" style={{ color: 'var(--primary)' }}>
              <RefreshCw className="w-3 h-3" /> Thử lại
            </button>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      {hasPermission('trips.check_in') && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link href="/dashboard/trips/check-in" className="card p-4 flex items-center gap-4 hover:shadow-md transition group" style={{ borderLeft: '4px solid var(--success)' }}>
            <div className="w-12 h-12 rounded flex items-center justify-center" style={{ background: 'rgba(56, 161, 105, 0.1)' }}>
              <ArrowDownToLine className="w-6 h-6" style={{ color: 'var(--success)' }} />
            </div>
            <div>
              <div className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>GHI NHẬN XE VÀO</div>
              <div className="text-xs" style={{ color: 'var(--muted)' }}>Đăng ký xe vào công trình</div>
            </div>
          </Link>
          <Link href="/dashboard/trips/check-out" className="card p-4 flex items-center gap-4 hover:shadow-md transition group" style={{ borderLeft: '4px solid var(--info)' }}>
            <div className="w-12 h-12 rounded flex items-center justify-center" style={{ background: 'rgba(49, 130, 206, 0.1)' }}>
              <ArrowUpFromLine className="w-6 h-6" style={{ color: 'var(--info)' }} />
            </div>
            <div>
              <div className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>GHI NHẬN XE RA</div>
              <div className="text-xs" style={{ color: 'var(--muted)' }}>Xác nhận xe ra khỏi công trình</div>
            </div>
          </Link>
        </div>
      )}

      {/* Stats Cards */}
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--muted)' }} /></div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="card p-4 stat-border-blue">
              <div className="flex items-center gap-2 mb-2">
                <Truck className="w-4 h-4" style={{ color: 'var(--info)' }} />
                <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>TỔNG CHUYẾN</span>
              </div>
              <div className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>{stats.totalTrips}</div>
            </div>
            <div className="card p-4 stat-border-green">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4" style={{ color: 'var(--success)' }} />
                <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>HOÀN THÀNH</span>
              </div>
              <div className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>{stats.completedTrips}</div>
            </div>
            <div className="card p-4 stat-border-orange">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4" style={{ color: 'var(--warning)' }} />
                <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>ĐANG Ở CT</span>
              </div>
              <div className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>{stats.onsiteVehicles}</div>
            </div>
            <div className="card p-4 stat-border-gold">
              <div className="flex items-center gap-2 mb-2">
                <Package className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>TỔNG M³</span>
              </div>
              <div className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
                {Number(stats.totalVolume || 0).toLocaleString('vi-VN')}
              </div>
            </div>
          </div>

          {/* Volume by Material */}
          {stats.volumeByMaterial && stats.volumeByMaterial.length > 0 && (
            <div className="card">
              <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--border)' }}>
                <Package className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                <span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Khối lượng theo vật liệu</span>
              </div>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>STT</th>
                      <th>Vật liệu</th>
                      <th style={{ textAlign: 'right' }}>Khối lượng</th>
                      <th>Đơn vị</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.volumeByMaterial.map((m, i) => (
                      <tr key={i}>
                        <td style={{ color: 'var(--muted)' }}>{i + 1}</td>
                        <td className="font-medium">{m.name}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{Number(m.total).toLocaleString('vi-VN')}</td>
                        <td style={{ color: 'var(--muted)' }}>{m.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : null}

      {/* On-site Vehicles */}
      <div className="card">
        <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" style={{ color: 'var(--warning)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
              Xe đang ở công trình
            </span>
            <span className="badge badge-warning">{onsiteTrips.length}</span>
          </div>
          <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--muted)' }}>
            <Clock className="w-3 h-3" />
            <span>Tự động cập nhật</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          {onsiteTrips.length === 0 ? (
            <div className="text-center py-8 text-sm" style={{ color: 'var(--muted)' }}>
              Hiện không có xe nào ở công trình
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Biển số</th>
                  <th>Tài xế</th>
                  <th className="hidden sm:table-cell">Vật liệu</th>
                  <th>m³</th>
                  <th className="hidden md:table-cell">Giờ vào</th>
                  <th className="hidden lg:table-cell">Công trình</th>
                </tr>
              </thead>
              <tbody>
                {onsiteTrips.map((t: any) => (
                  <tr key={t.id}>
                    <td className="font-mono font-bold">{t.vehicle?.plateNumber}</td>
                    <td>{t.driver?.fullName}</td>
                    <td className="hidden sm:table-cell">{t.material?.name}</td>
                    <td className="font-medium">{Number(t.expectedVolume || 0)}</td>
                    <td className="hidden md:table-cell" style={{ color: 'var(--muted)' }}>
                      {t.checkInAt ? new Date(t.checkInAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}
                    </td>
                    <td className="hidden lg:table-cell" style={{ color: 'var(--muted)' }}>{t.project?.name || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
