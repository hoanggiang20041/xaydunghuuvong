'use client'

import { useAuth } from '@/hooks/use-auth'
import { Bell, User, X } from 'lucide-react'
import { useEffect, useState, useCallback } from 'react'

interface Notification {
  id: string
  title: string
  message: string
  time: string
  read: boolean
}

export function Header() {
  const { user } = useAuth()
  const [now, setNow] = useState('')
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])

  useEffect(() => {
    const update = () => setNow(new Date().toLocaleString('vi-VN', {
      weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }))
    update()
    const timer = setInterval(update, 60000)
    return () => clearInterval(timer)
  }, [])

  // Fetch recent activity as notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/trips?limit=5&sort=createdAt&order=desc')
      const data = await res.json()
      if (data.success && data.data) {
        const notifs: Notification[] = data.data.map((trip: any) => ({
          id: trip.id,
          title: trip.status === 'CHECKED_IN' ? 'Xe vào công trình' : 
                 trip.status === 'CHECKED_OUT' || trip.status === 'COMPLETED' ? 'Xe ra công trình' : 
                 'Cập nhật chuyến',
          message: `${trip.vehicle?.plateNumber || 'Xe'} — ${trip.material?.name || 'Vật liệu'}${trip.volumeM3 ? ` — ${Number(trip.volumeM3).toFixed(1)} m³` : ''}`,
          time: new Date(trip.createdAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }),
          read: false,
        }))
        setNotifications(notifs)
      }
    } catch {
      // Silently fail
    }
  }, [])

  useEffect(() => {
    if (user) fetchNotifications()
  }, [user, fetchNotifications])

  const unreadCount = notifications.filter(n => !n.read).length

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  return (
    <>
      <header className="h-14 border-b flex items-center justify-between px-4 lg:px-6 bg-slate-900 border-slate-700/50">
        {/* Left: System name */}
        <div className="flex items-center gap-3 pl-10 lg:pl-0">
          <div>
            <h1 className="text-sm font-bold tracking-wide hidden sm:block text-slate-100">
              CÔNG TY TNHH HỮU VỌNG — Quản lý Vận chuyển
            </h1>
            <h1 className="text-xs font-bold tracking-wide sm:hidden text-slate-100">
              HỮU VỌNG — QL Vận chuyển
            </h1>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Date/time */}
          <span className="hidden md:block text-xs mr-2 text-slate-400">{now}</span>

          {/* Notifications */}
          <div className="relative">
            <button 
              onClick={() => { setShowNotifications(!showNotifications); if (!showNotifications) fetchNotifications() }}
              className="p-2 rounded transition text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notification dropdown */}
            {showNotifications && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                <div className="absolute right-0 top-full mt-2 w-80 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
                    <h3 className="text-sm font-bold text-white">Thông báo</h3>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <button onClick={markAllRead} className="text-[10px] text-blue-400 hover:text-blue-300">
                          Đánh dấu đã đọc
                        </button>
                      )}
                      <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-white">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center">
                        <Bell className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                        <p className="text-sm text-slate-400">Chưa có thông báo mới</p>
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div 
                          key={notif.id} 
                          className={`px-4 py-3 border-b border-slate-700/50 hover:bg-slate-700/50 transition cursor-pointer ${!notif.read ? 'bg-slate-700/30' : ''}`}
                          onClick={() => setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n))}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-medium ${!notif.read ? 'text-white' : 'text-slate-300'}`}>{notif.title}</p>
                              <p className="text-xs text-slate-400 mt-0.5 truncate">{notif.message}</p>
                            </div>
                            <span className="text-[10px] text-slate-500 ml-2 whitespace-nowrap">{notif.time}</span>
                          </div>
                          {!notif.read && <div className="w-1.5 h-1.5 bg-blue-400 rounded-full absolute right-3 top-3" />}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* User */}
          <div className="flex items-center gap-2 ml-1 pl-2 border-l border-slate-700">
            <div className="w-8 h-8 rounded flex items-center justify-center text-white text-xs font-bold bg-blue-600">
              {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="hidden sm:block">
              <div className="text-xs font-semibold text-slate-200">{user?.fullName}</div>
              <div className="text-[10px] text-slate-400">{user?.username}</div>
            </div>
          </div>
        </div>
      </header>
    </>
  )
}
