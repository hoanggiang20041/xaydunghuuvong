'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'
import Link from 'next/link'
import {
  Truck, TrendingUp, ArrowDownToLine, ArrowUpFromLine, MapPin,
  Package, Clock, Loader2, RefreshCw, AlertCircle, Sun, Cloud, CloudRain, Search, X, Moon
} from 'lucide-react'
import { toast } from '@/components/ui/toaster'

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
  const [weather, setWeather] = useState<{ temp: number, description: string, icon: React.ReactNode } | null>(null)
  const [hourlyWeather, setHourlyWeather] = useState<{ time: string, temp: number, icon: React.ReactNode }[]>([])
  const [locationName, setLocationName] = useState('Đồng Nai')
  const [searchLoc, setSearchLoc] = useState('')
  const [isSearchLocOpen, setIsSearchLocOpen] = useState(false)

  const getWeatherIcon = (code: number, isDay: boolean) => {
    if (code >= 51 && code <= 67) return <CloudRain className="w-6 h-6 text-blue-400" />
    if (code >= 1 && code <= 3) return <Cloud className="w-6 h-6 text-slate-400" />
    if (code >= 71) return <CloudRain className="w-6 h-6 text-blue-600" />
    return isDay ? <Sun className="w-6 h-6 text-yellow-500" /> : <Moon className="w-6 h-6 text-slate-300" />
  }

  const fetchWeather = useCallback((lat: number, lon: number, locName: string) => {
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,weather_code,precipitation_probability&forecast_days=2&timezone=auto`)
      .then(r => r.json())
      .then(d => {
        const w = d.current_weather
        if (w) {
          const icon = getWeatherIcon(w.weathercode, w.is_day === 1)
          let desc = w.is_day === 0 ? "Trời quang mây" : "Trời nắng"
          if (w.weathercode >= 51 && w.weathercode <= 67) desc = "Có mưa"
          else if (w.weathercode >= 1 && w.weathercode <= 3) desc = "Nhiều mây"
          else if (w.weathercode >= 71) desc = "Mưa lớn"

          const currentHour = new Date().getHours()
          const probs = d.hourly?.precipitation_probability || []
          let willRain = false
          for(let i = currentHour; i < Math.min(currentHour + 12, probs.length); i++) {
            if (probs[i] > 50) willRain = true
          }
          if (willRain) desc += " · Sắp mưa"
          else desc += " · Không mưa"

          setWeather({ temp: w.temperature, description: desc, icon })
          setLocationName(locName)

          if (d.hourly && d.hourly.time) {
            const now = new Date()
            const currentIsoHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours()).toISOString().substring(0, 13) + ":00"
            const startIndex = d.hourly.time.findIndex((t: string) => t === currentIsoHour)
            
            if (startIndex !== -1) {
              const next24h = []
              for (let i = startIndex; i < startIndex + 24 && i < d.hourly.time.length; i++) {
                const timeStr = d.hourly.time[i]
                const hour = new Date(timeStr).getHours()
                const isDay = hour >= 6 && hour < 18
                next24h.push({
                  time: `${hour}:00`,
                  temp: Math.round(d.hourly.temperature_2m[i]),
                  icon: getWeatherIcon(d.hourly.weather_code[i], isDay)
                })
              }
              setHourlyWeather(next24h)
            }
          }
        }
      }).catch(() => {})
  }, [])

  useEffect(() => {


    const defaultLat = 10.9493
    const defaultLon = 106.8166
    const defaultLocName = 'Đồng Nai'

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude
          const lon = position.coords.longitude
          fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=vi`)
            .then(res => res.json())
            .then(data => {
              const loc = data.address?.village || data.address?.town || data.address?.city || data.address?.county || 'Vị trí hiện tại'
              fetchWeather(lat, lon, loc)
            })
            .catch(() => fetchWeather(lat, lon, 'Vị trí hiện tại'))
        },
        () => fetchWeather(defaultLat, defaultLon, defaultLocName),
        { timeout: 10000 }
      )
    } else {
      fetchWeather(defaultLat, defaultLon, defaultLocName)
    }
  }, [fetchWeather])

  const handleSearchWeather = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchLoc.trim()) return
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchLoc)}&format=json&limit=1&accept-language=vi`)
      const data = await res.json()
      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0]
        const shortName = display_name.split(',')[0]
        fetchWeather(lat, lon, shortName)
        setIsSearchLocOpen(false)
        setSearchLoc('')
      } else {
        toast({ title: 'Không tìm thấy địa điểm', variant: 'error' })
      }
    } catch {
      toast({ title: 'Lỗi tìm kiếm địa điểm', variant: 'error' })
    }
  }

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {greeting()}, <span className="text-blue-600 dark:text-blue-400">{user?.fullName || 'bạn'}</span>! 👋
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
            </p>
          </div>
          {weather && (
            <div className="hidden sm:flex items-center gap-4 pl-4 ml-4 border-l border-slate-200 dark:border-slate-700 relative group">
              <div className="flex items-center gap-3">
                {weather.icon}
                <div className="flex flex-col">
                  <div className="text-sm font-bold text-slate-900 dark:text-white">{weather.temp}°C</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    {weather.description} tại {locationName}
                    <button onClick={() => setIsSearchLocOpen(!isSearchLocOpen)} className="text-blue-500 hover:text-blue-700 p-0.5" title="Thay đổi địa điểm">
                      <Search className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Hourly Weather Dropdown/Tooltip */}
              {hourlyWeather.length > 0 && (
                <div className="absolute top-full right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-xl p-3 z-40 hidden group-hover:block w-[400px]">
                  <div className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Dự báo 24h tới</div>
                  <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
                    {hourlyWeather.map((hw, idx) => (
                      <div key={idx} className="flex flex-col items-center gap-1 min-w-[40px]">
                        <span className="text-xs text-slate-500">{hw.time}</span>
                        {hw.icon}
                        <span className="text-sm font-bold">{hw.temp}°</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
                
              {isSearchLocOpen && (
                <form onSubmit={handleSearchWeather} className="absolute top-full left-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg rounded-lg p-2 z-50 flex gap-2 w-64">
                  <input 
                    autoFocus
                    type="text" 
                    value={searchLoc}
                    onChange={e => setSearchLoc(e.target.value)}
                    placeholder="Tên phường/xã, huyện..." 
                    className="flex-1 px-2 py-1 text-sm border rounded dark:bg-slate-900 dark:border-slate-700 outline-none focus:border-blue-500"
                  />
                  <button type="submit" className="bg-blue-600 text-white px-2 py-1 rounded text-sm hover:bg-blue-700">Tìm</button>
                </form>
              )}
            </div>
          )}
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
