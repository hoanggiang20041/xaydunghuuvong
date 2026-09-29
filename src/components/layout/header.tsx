'use client'

import { useAuth } from '@/hooks/use-auth'
import { useTheme } from 'next-themes'
import { Sun, Moon, Bell, User } from 'lucide-react'
import { useEffect, useState } from 'react'

export function Header() {
  const { user } = useAuth()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [now, setNow] = useState('')

  useEffect(() => {
    setMounted(true)
    const update = () => setNow(new Date().toLocaleString('vi-VN', {
      weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }))
    update()
    const timer = setInterval(update, 60000)
    return () => clearInterval(timer)
  }, [])

  return (
    <header className="h-14 border-b flex items-center justify-between px-4 lg:px-6" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
      {/* Left: System name */}
      <div className="flex items-center gap-3 pl-10 lg:pl-0">
        <div>
          <h1 className="text-sm font-bold tracking-wide hidden sm:block" style={{ color: 'var(--primary)' }}>
            HỆ THỐNG QUẢN LÝ VẬN CHUYỂN CÔNG TRÌNH
          </h1>
          <h1 className="text-xs font-bold tracking-wide sm:hidden" style={{ color: 'var(--primary)' }}>
            QL VẬN CHUYỂN CT
          </h1>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Date/time */}
        <span className="hidden md:block text-xs mr-2" style={{ color: 'var(--muted)' }}>{now}</span>

        {/* Theme toggle */}
        {mounted && (
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded transition"
            style={{ color: 'var(--muted)' }}
            title={theme === 'dark' ? 'Chế độ sáng' : 'Chế độ tối'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        )}

        {/* Notifications */}
        <button className="p-2 rounded relative transition" style={{ color: 'var(--muted)' }}>
          <Bell className="w-4 h-4" />
        </button>

        {/* User */}
        <div className="flex items-center gap-2 ml-1 pl-2 border-l" style={{ borderColor: 'var(--border)' }}>
          <div className="w-8 h-8 rounded flex items-center justify-center text-white text-xs font-bold" style={{ background: 'var(--primary)' }}>
            {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="hidden sm:block">
            <div className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>{user?.fullName}</div>
            <div className="text-[10px]" style={{ color: 'var(--muted)' }}>{user?.username}</div>
          </div>
        </div>
      </div>
    </header>
  )
}
