'use client'

import { useAuth } from '@/hooks/use-auth'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard, Truck, MapPin, Route, Building2, Car, Users, Package,
  MapPinned, CircleDot, BarChart3, UserCog, ScrollText, LogOut, ChevronLeft, Menu, Zap, Shield
} from 'lucide-react'
import { useState } from 'react'
import type { LucideIcon } from 'lucide-react'

type NavLink = { label: string; href: string; icon: LucideIcon; permission: string | null }
type NavDivider = { type: 'divider'; label: string }
type NavItem = NavLink | NavDivider

const NAV_ITEMS: NavItem[] = [
  { label: 'Tổng quan', href: '/dashboard', icon: LayoutDashboard, permission: null },
  { type: 'divider', label: 'VẬN HÀNH' },
  { label: 'Thao tác nhanh', href: '/dashboard/quick-action', icon: Zap, permission: 'trips.check_in' },
  { label: 'Danh sách chuyến', href: '/dashboard/trips', icon: Route, permission: 'trips.view' },
  { type: 'divider', label: 'DANH MỤC' },
  { label: 'Công trình', href: '/dashboard/projects', icon: Building2, permission: 'projects.view' },
  { label: 'Phương tiện', href: '/dashboard/vehicles', icon: Car, permission: 'vehicles.view' },
  { label: 'Tài xế', href: '/dashboard/drivers', icon: Users, permission: 'drivers.view' },
  { label: 'Vật liệu', href: '/dashboard/materials', icon: Package, permission: 'materials.view' },
  { label: 'Điểm lấy hàng', href: '/dashboard/locations/pickup', icon: MapPinned, permission: 'locations.view' },
  { label: 'Điểm đổ hàng', href: '/dashboard/locations/dump', icon: CircleDot, permission: 'locations.view' },
  { type: 'divider', label: 'HỆ THỐNG' },
  { label: 'Báo cáo', href: '/dashboard/reports', icon: BarChart3, permission: 'reports.view' },
  { label: 'Người dùng', href: '/dashboard/users', icon: UserCog, permission: 'users.view' },
  { label: 'Nhật ký', href: '/dashboard/audit-logs', icon: ScrollText, permission: 'audit.view' },
]

const ROLE_DISPLAY: Record<string, { label: string; color: string; bg: string }> = {
  SUPER_ADMIN: { label: 'Super Admin', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  DIRECTOR: { label: 'Giám đốc', color: '#ecc94b', bg: 'rgba(236,201,75,0.15)' },
  ADMIN: { label: 'Quản lý', color: '#60a5fa', bg: 'rgba(96,165,250,0.15)' },
  SUPERVISOR: { label: 'Giám sát', color: '#34d399', bg: 'rgba(52,211,153,0.15)' },
  GATE_STAFF: { label: 'NV Cổng', color: '#a78bfa', bg: 'rgba(167,139,250,0.15)' },
  ACCOUNTANT: { label: 'Kế toán', color: '#fb923c', bg: 'rgba(251,146,60,0.15)' },
}

export function AppSidebar() {
  const { user, hasPermission, logout } = useAuth()
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = async () => {
    try { await fetch('/api/auth/logout', { method: 'POST' }) } catch {}
    logout()
    window.location.href = '/login'
  }

  const roleName = user?.roles?.[0] || ''
  const roleInfo = ROLE_DISPLAY[roleName] || { label: roleName, color: '#94a3b8', bg: 'rgba(148,163,184,0.15)' }

  const sidebarContent = (
    <div className="flex flex-col h-full" style={{ background: 'linear-gradient(180deg, #0f1b2d 0%, #1a365d 40%, #1e3a5f 100%)' }}>
      {/* Header */}
      <div className="px-4 py-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 shadow-lg bg-white border-2" style={{ borderColor: '#d69e2e' }}>
            <img src="/logo.jpg" alt="Hữu Vọng" className="w-full h-full object-cover scale-125" />
          </div>
          {!collapsed && (
            <div>
              <div className="text-sm font-bold text-white tracking-wider">HỮU VỌNG</div>
              <div className="text-[10px] font-medium" style={{ color: '#d69e2e' }}>Quản lý Vận chuyển</div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {NAV_ITEMS.map((item, i) => {
          if ('type' in item) {
            // Hide "DANH MỤC" and "HỆ THỐNG" dividers for GATE_STAFF
            if (roleName === 'GATE_STAFF' && (item.label === 'DANH MỤC' || item.label === 'HỆ THỐNG')) return null
            // Hide "DANH MỤC" divider for ACCOUNTANT
            if (roleName === 'ACCOUNTANT' && item.label === 'DANH MỤC') return null
            // Hide "DANH MỤC" for DIRECTOR
            if (roleName === 'DIRECTOR' && item.label === 'DANH MỤC') return null

            return !collapsed ? (
              <div key={i} className="px-4 pt-5 pb-2">
                <span className="text-[10px] font-extrabold tracking-[0.2em] uppercase" style={{ color: 'rgba(255,255,255,0.25)' }}>{item.label}</span>
              </div>
            ) : <div key={i} className="my-2 mx-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }} />
          }

          // Special UI hiding logic (keep backend permissions intact)
          if (roleName === 'GATE_STAFF' && ['projects.view', 'vehicles.view', 'drivers.view', 'materials.view', 'locations.view', 'reports.view', 'users.view', 'audit.view'].includes(item.permission || '')) return null
          
          if (roleName === 'ACCOUNTANT' && ['projects.view', 'vehicles.view', 'drivers.view', 'materials.view', 'locations.view'].includes(item.permission || '')) return null

          if (roleName === 'DIRECTOR' && ['vehicles.view', 'drivers.view', 'materials.view', 'locations.view'].includes(item.permission || '')) return null

          if (roleName === 'SUPERVISOR' && ['projects.view', 'vehicles.view', 'drivers.view', 'materials.view', 'locations.view'].includes(item.permission || '')) return null

          if (item.permission && !hasPermission(item.permission)) return null

          const Icon = item.icon
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href))
          const isQuickAction = item.href === '/dashboard/quick-action'

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-sm transition-all ${
                isActive
                  ? 'text-white font-bold'
                  : isQuickAction
                    ? 'text-amber-300 hover:text-amber-200 font-semibold'
                    : 'text-gray-300/80 hover:text-white'
              }`}
              style={{
                background: isActive 
                  ? 'linear-gradient(90deg, rgba(214,158,46,0.2) 0%, rgba(255,255,255,0.08) 100%)' 
                  : isQuickAction && !isActive
                    ? 'rgba(214,158,46,0.08)'
                    : 'transparent',
                borderLeft: isActive ? '3px solid #ecc94b' : '3px solid transparent',
              }}
            >
              {Icon && (
                <Icon 
                  className={`w-[18px] h-[18px] flex-shrink-0 ${isQuickAction && !isActive ? 'animate-pulse' : ''}`} 
                  style={{ color: isActive ? '#ecc94b' : isQuickAction ? '#d69e2e' : 'rgba(255,255,255,0.4)' }} 
                />
              )}
              {!collapsed && (
                <span className={isQuickAction && !isActive ? 'flex items-center gap-2' : ''}>
                  {item.label}
                  {isQuickAction && !isActive && (
                    <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-amber-500/20 text-amber-400">HOT</span>
                  )}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* User info & Logout */}
      <div className="border-t px-3 py-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        {!collapsed && user && (
          <div className="mb-3 mx-1 p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ background: roleInfo.color }}>
                {user.fullName?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white truncate">{user.fullName}</div>
                <span 
                  className="inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold"
                  style={{ color: roleInfo.color, background: roleInfo.bg }}
                >
                  <Shield className="w-2.5 h-2.5" />
                  {roleInfo.label}
                </span>
              </div>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition hover:bg-red-500/10"
          style={{ color: 'rgba(255,255,255,0.5)' }}
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && <span>Đăng xuất</span>}
        </button>
      </div>

      {/* Collapse toggle - desktop only */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="hidden lg:flex items-center justify-center py-2.5 border-t transition"
        style={{ borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.3)' }}
        onMouseEnter={(e) => e.currentTarget.style.color = 'white'}
        onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
      >
        <ChevronLeft className={`w-4 h-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
      </button>
    </div>
  )

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-50 p-2.5 rounded-lg shadow-lg"
        style={{ background: '#1a365d', color: 'white' }}
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="relative w-64 h-full shadow-2xl">{sidebarContent}</div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className={`hidden lg:block h-screen sticky top-0 transition-all ${collapsed ? 'w-16' : 'w-60'}`}>
        {sidebarContent}
      </aside>
    </>
  )
}
