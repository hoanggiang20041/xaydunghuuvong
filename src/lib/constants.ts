export const APP_NAME = 'Quản lý Vận chuyển'
export const APP_DESCRIPTION = 'Hệ thống quản lý xe vận chuyển công trình'

// Trip status labels in Vietnamese
export const TRIP_STATUS_LABELS: Record<string, string> = {
  CREATED: 'Đã tạo',
  CHECKED_IN: 'Đang ở công trình',
  IN_PROGRESS: 'Đang vận chuyển',
  CHECKED_OUT: 'Đã ra cổng',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
  DISPUTED: 'Có tranh chấp',
}

export const TRIP_STATUS_COLORS: Record<string, string> = {
  CREATED: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  CHECKED_IN: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  CHECKED_OUT: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  DISPUTED: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
}

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Đang hoạt động',
  PAUSED: 'Tạm dừng',
  COMPLETED: 'Hoàn thành',
  CLOSED: 'Đã đóng',
}

export const PROJECT_STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  PAUSED: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  COMPLETED: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  CLOSED: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
}

export const ENTITY_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Hoạt động',
  INACTIVE: 'Ngưng hoạt động',
}

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Quản lý',
  SUPERVISOR: 'Giám sát',
  GATE_STAFF: 'Nhân viên cổng',
  ACCOUNTANT: 'Kế toán',
}

// Valid state transitions
export const VALID_TRIP_TRANSITIONS: Record<string, string[]> = {
  CREATED: ['CHECKED_IN', 'CANCELLED'],
  CHECKED_IN: ['IN_PROGRESS', 'CHECKED_OUT', 'CANCELLED'],
  IN_PROGRESS: ['CHECKED_OUT', 'CANCELLED'],
  CHECKED_OUT: ['COMPLETED'],
  COMPLETED: ['DISPUTED'],
  CANCELLED: [],
  DISPUTED: ['COMPLETED'],
}

export function isValidTransition(currentStatus: string, newStatus: string): boolean {
  const validNext = VALID_TRIP_TRANSITIONS[currentStatus]
  return validNext ? validNext.includes(newStatus) : false
}

// Sidebar navigation
export const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard', permission: null },
  { label: 'Xe vào / Xe ra', href: '/dashboard/trips/check-in', icon: 'Truck', permission: 'trips.check_in' },
  { label: 'Xe đang ở CT', href: '/dashboard/vehicles-onsite', icon: 'MapPin', permission: 'trips.view' },
  { label: 'Chuyến xe', href: '/dashboard/trips', icon: 'Route', permission: 'trips.view' },
  { label: 'Công trình', href: '/dashboard/projects', icon: 'Building2', permission: 'projects.view' },
  { label: 'Xe', href: '/dashboard/vehicles', icon: 'Car', permission: 'vehicles.view' },
  { label: 'Tài xế', href: '/dashboard/drivers', icon: 'Users', permission: 'drivers.view' },
  { label: 'Vật liệu', href: '/dashboard/materials', icon: 'Package', permission: 'materials.view' },
  { label: 'Điểm lấy hàng', href: '/dashboard/locations/pickup', icon: 'MapPinned', permission: 'locations.view' },
  { label: 'Điểm đổ hàng', href: '/dashboard/locations/dump', icon: 'CircleDot', permission: 'locations.view' },
  { label: 'Báo cáo', href: '/dashboard/reports', icon: 'BarChart3', permission: 'reports.view' },
  { label: 'Người dùng', href: '/dashboard/users', icon: 'UserCog', permission: 'users.view' },
  { label: 'Nhật ký', href: '/dashboard/audit-logs', icon: 'ScrollText', permission: 'audit.view' },
]
