'use client'

import { useAuth } from '@/hooks/use-auth'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard, Truck, MapPin, Route, Building2, Car, Users, Package,
  MapPinned, CircleDot, BarChart3, UserCog, ScrollText, LogOut, ChevronLeft, Menu, Zap
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
  { label: 'Xe vào / Xe ra', href: '/dashboard/trips/check-in', icon: Truck, permission: 'trips.check_in' },
  { label: 'Xe đang ở CT', href: '/dashboard/vehicles-onsite', icon: MapPin, permission: 'trips.view' },
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

  const sidebarContent = (
    <div className="flex flex-col h-full" style={{ background: '#1a365d' }}>
      {/* Header */}
      <div className="px-4 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded flex items-center justify-center flex-shrink-0 shadow" style={{ background: 'linear-gradient(135deg, #d69e2e 0%, #ecc94b 100%)' }}>
            <span className="text-sm font-black" style={{ color: '#1a365d', fontFamily: 'Georgia, serif' }}>HV</span>
          </div>
          {!collapsed && (
            <div>
              <div className="text-xs font-bold text-white tracking-wider">HỮU VỌNG</div>
              <div className="text-[10px] font-medium" style={{ color: '#d69e2e' }}>Quản lý Vận chuyển</div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 overflow-y-auto">
        {NAV_ITEMS.map((item, i) => {
          if ('type' in item) {
            return !collapsed ? (
              <div key={i} className="px-4 pt-4 pb-1">
                <span className="text-[10px] font-bold tracking-widest" style={{ color: 'rgba(255,255,255,0.35)' }}>{item.label}</span>
              </div>
            ) : <div key={i} className="my-1 mx-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }} />
          }

          if (item.permission && !hasPermission(item.permission)) return null

          const Icon = item.icon
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 mx-2 px-3 py-2 rounded text-sm transition-all ${
                isActive
                  ? 'text-white font-semibold'
                  : 'text-gray-300 hover:text-white'
              }`}
              style={{
                background: isActive ? 'rgba(255,255,255,0.12)' : 'transparent',
                borderLeft: isActive ? '3px solid #d69e2e' : '3px solid transparent',
              }}
            >
              {Icon && <Icon className="w-4 h-4 flex-shrink-0" style={{ color: isActive ? '#ecc94b' : 'rgba(255,255,255,0.5)' }} />}
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* User info & Logout */}
      <div className="border-t px-3 py-3" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
        {!collapsed && user && (
          <div className="mb-2 px-2">
            <div className="text-sm font-medium text-white truncate">{user.fullName}</div>
            <div className="text-[11px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
              {user.roles?.[0] === 'SUPER_ADMIN' ? 'Quản trị viên' :
               user.roles?.[0] === 'ADMIN' ? 'Quản lý' :
               user.roles?.[0] === 'SUPERVISOR' ? 'Giám sát' :
               user.roles?.[0] === 'GATE_STAFF' ? 'NV Cổng' :
               user.roles?.[0] === 'ACCOUNTANT' ? 'Kế toán' : user.roles?.[0]}
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded text-sm transition"
          style={{ color: 'rgba(255,255,255,0.6)', background: 'transparent' }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && <span>Đăng xuất</span>}
        </button>
      </div>

      {/* Collapse toggle - desktop only */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="hidden lg:flex items-center justify-center py-2 border-t transition"
        style={{ borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }}
        onMouseEnter={(e) => e.currentTarget.style.color = 'white'}
        onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
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
        className="lg:hidden fixed top-3 left-3 z-50 p-2 rounded"
        style={{ background: '#1a365d', color: 'white' }}
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="relative w-64 h-full">{sidebarContent}</div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className={`hidden lg:block h-screen sticky top-0 transition-all ${collapsed ? 'w-16' : 'w-60'}`}>
        {sidebarContent}
      </aside>
    </>
  )
}
