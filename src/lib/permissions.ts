import { type AuthUser } from './auth'

// ==========================================
// PERMISSION CONSTANTS
// ==========================================
export const PERMISSIONS = {
  // Users
  USERS_VIEW: 'users.view',
  USERS_CREATE: 'users.create',
  USERS_UPDATE: 'users.update',
  USERS_DELETE: 'users.delete',
  
  // Roles
  ROLES_MANAGE: 'roles.manage',
  
  // Projects
  PROJECTS_VIEW: 'projects.view',
  PROJECTS_CREATE: 'projects.create',
  PROJECTS_UPDATE: 'projects.update',
  PROJECTS_DELETE: 'projects.delete',
  
  // Vehicles
  VEHICLES_VIEW: 'vehicles.view',
  VEHICLES_CREATE: 'vehicles.create',
  VEHICLES_UPDATE: 'vehicles.update',
  
  // Drivers
  DRIVERS_VIEW: 'drivers.view',
  DRIVERS_CREATE: 'drivers.create',
  DRIVERS_UPDATE: 'drivers.update',
  
  // Materials
  MATERIALS_VIEW: 'materials.view',
  MATERIALS_MANAGE: 'materials.manage',
  
  // Locations
  LOCATIONS_VIEW: 'locations.view',
  LOCATIONS_MANAGE: 'locations.manage',
  
  // Trips
  TRIPS_VIEW: 'trips.view',
  TRIPS_CREATE: 'trips.create',
  TRIPS_UPDATE: 'trips.update',
  TRIPS_CHECK_IN: 'trips.check_in',
  TRIPS_CHECK_OUT: 'trips.check_out',
  TRIPS_COMPLETE: 'trips.complete',
  TRIPS_CANCEL: 'trips.cancel',
  TRIPS_APPROVE_EDIT: 'trips.approve_edit',
  TRIPS_DELETE: 'trips.delete',
  TRIPS_EXPORT: 'trips.export',
  
  // Reports
  REPORTS_VIEW: 'reports.view',
  REPORTS_EXPORT: 'reports.export',
  
  // Audit
  AUDIT_VIEW: 'audit.view',
  
  // Notifications
  NOTIFICATIONS_VIEW: 'notifications.view',
  
  // Settings
  SETTINGS_MANAGE: 'settings.manage',
} as const

export type PermissionCode = typeof PERMISSIONS[keyof typeof PERMISSIONS]

// ==========================================
// PERMISSION CHECKING
// ==========================================

export function hasPermission(user: AuthUser, permission: PermissionCode): boolean {
  if (user.isSuperAdmin) return true
  return user.permissions.includes(permission)
}

export function hasAnyPermission(user: AuthUser, permissions: PermissionCode[]): boolean {
  if (user.isSuperAdmin) return true
  return permissions.some(p => user.permissions.includes(p))
}

export function hasAllPermissions(user: AuthUser, permissions: PermissionCode[]): boolean {
  if (user.isSuperAdmin) return true
  return permissions.every(p => user.permissions.includes(p))
}

// ==========================================
// PROJECT SCOPE CHECKING
// ==========================================

export function hasProjectAccess(user: AuthUser, projectId: string): boolean {
  // Super admin has access to all projects
  if (user.isSuperAdmin || user.projectIds === null) return true
  return user.projectIds.includes(projectId)
}

export function getAccessibleProjectIds(user: AuthUser): string[] | null {
  // null means all projects (super admin)
  if (user.isSuperAdmin || user.projectIds === null) return null
  return user.projectIds
}

// ==========================================
// API GUARD HELPERS
// ==========================================

export function requirePermission(user: AuthUser, permission: PermissionCode): void {
  if (!hasPermission(user, permission)) {
    throw new PermissionError(`Bạn không có quyền thực hiện thao tác này (${permission})`)
  }
}

export function requireProjectAccess(user: AuthUser, projectId: string): void {
  if (!hasProjectAccess(user, projectId)) {
    throw new PermissionError('Bạn không có quyền truy cập công trình này')
  }
}

export class PermissionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PermissionError'
  }
}

// ==========================================
// DEFAULT ROLE PERMISSIONS
// ==========================================

export const DEFAULT_ROLE_PERMISSIONS: Record<string, PermissionCode[]> = {
  SUPER_ADMIN: Object.values(PERMISSIONS),
  
  ADMIN: [
    PERMISSIONS.USERS_VIEW,
    PERMISSIONS.USERS_CREATE,
    PERMISSIONS.USERS_UPDATE,
    PERMISSIONS.PROJECTS_VIEW,
    PERMISSIONS.PROJECTS_CREATE,
    PERMISSIONS.PROJECTS_UPDATE,
    PERMISSIONS.VEHICLES_VIEW,
    PERMISSIONS.VEHICLES_CREATE,
    PERMISSIONS.VEHICLES_UPDATE,
    PERMISSIONS.DRIVERS_VIEW,
    PERMISSIONS.DRIVERS_CREATE,
    PERMISSIONS.DRIVERS_UPDATE,
    PERMISSIONS.MATERIALS_VIEW,
    PERMISSIONS.MATERIALS_MANAGE,
    PERMISSIONS.LOCATIONS_VIEW,
    PERMISSIONS.LOCATIONS_MANAGE,
    PERMISSIONS.TRIPS_VIEW,
    PERMISSIONS.TRIPS_CREATE,
    PERMISSIONS.TRIPS_UPDATE,
    PERMISSIONS.TRIPS_CHECK_IN,
    PERMISSIONS.TRIPS_CHECK_OUT,
    PERMISSIONS.TRIPS_COMPLETE,
    PERMISSIONS.TRIPS_CANCEL,
    PERMISSIONS.TRIPS_APPROVE_EDIT,
    PERMISSIONS.TRIPS_EXPORT,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_EXPORT,
    PERMISSIONS.AUDIT_VIEW,
    PERMISSIONS.NOTIFICATIONS_VIEW,
  ],
  
  SUPERVISOR: [
    PERMISSIONS.PROJECTS_VIEW,
    PERMISSIONS.VEHICLES_VIEW,
    PERMISSIONS.DRIVERS_VIEW,
    PERMISSIONS.DRIVERS_CREATE,
    PERMISSIONS.DRIVERS_UPDATE,
    PERMISSIONS.MATERIALS_VIEW,
    PERMISSIONS.LOCATIONS_VIEW,
    PERMISSIONS.TRIPS_VIEW,
    PERMISSIONS.TRIPS_CREATE,
    PERMISSIONS.TRIPS_UPDATE,
    PERMISSIONS.TRIPS_CHECK_IN,
    PERMISSIONS.TRIPS_CHECK_OUT,
    PERMISSIONS.TRIPS_COMPLETE,
    PERMISSIONS.TRIPS_CANCEL,
    PERMISSIONS.TRIPS_APPROVE_EDIT,
    PERMISSIONS.TRIPS_EXPORT,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_EXPORT,
    PERMISSIONS.NOTIFICATIONS_VIEW,
  ],
  
  GATE_STAFF: [
    PERMISSIONS.PROJECTS_VIEW,
    PERMISSIONS.VEHICLES_VIEW,
    PERMISSIONS.DRIVERS_VIEW,
    PERMISSIONS.MATERIALS_VIEW,
    PERMISSIONS.LOCATIONS_VIEW,
    PERMISSIONS.TRIPS_VIEW,
    PERMISSIONS.TRIPS_CREATE,
    PERMISSIONS.TRIPS_CHECK_IN,
    PERMISSIONS.TRIPS_CHECK_OUT,
    PERMISSIONS.NOTIFICATIONS_VIEW,
  ],
  
  ACCOUNTANT: [
    PERMISSIONS.PROJECTS_VIEW,
    PERMISSIONS.VEHICLES_VIEW,
    PERMISSIONS.DRIVERS_VIEW,
    PERMISSIONS.MATERIALS_VIEW,
    PERMISSIONS.LOCATIONS_VIEW,
    PERMISSIONS.TRIPS_VIEW,
    PERMISSIONS.TRIPS_EXPORT,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_EXPORT,
    PERMISSIONS.NOTIFICATIONS_VIEW,
  ],
}

// ==========================================
// ALL PERMISSIONS LIST (for seeding)
// ==========================================

export const ALL_PERMISSIONS = [
  { code: 'users.view', module: 'users', action: 'view', description: 'Xem danh sách người dùng' },
  { code: 'users.create', module: 'users', action: 'create', description: 'Tạo người dùng mới' },
  { code: 'users.update', module: 'users', action: 'update', description: 'Cập nhật người dùng' },
  { code: 'users.delete', module: 'users', action: 'delete', description: 'Xóa người dùng' },
  { code: 'roles.manage', module: 'roles', action: 'manage', description: 'Quản lý vai trò và phân quyền' },
  { code: 'projects.view', module: 'projects', action: 'view', description: 'Xem công trình' },
  { code: 'projects.create', module: 'projects', action: 'create', description: 'Tạo công trình mới' },
  { code: 'projects.update', module: 'projects', action: 'update', description: 'Cập nhật công trình' },
  { code: 'projects.delete', module: 'projects', action: 'delete', description: 'Xóa công trình' },
  { code: 'vehicles.view', module: 'vehicles', action: 'view', description: 'Xem danh sách xe' },
  { code: 'vehicles.create', module: 'vehicles', action: 'create', description: 'Thêm xe mới' },
  { code: 'vehicles.update', module: 'vehicles', action: 'update', description: 'Cập nhật thông tin xe' },
  { code: 'drivers.view', module: 'drivers', action: 'view', description: 'Xem danh sách tài xế' },
  { code: 'drivers.create', module: 'drivers', action: 'create', description: 'Thêm tài xế mới' },
  { code: 'drivers.update', module: 'drivers', action: 'update', description: 'Cập nhật thông tin tài xế' },
  { code: 'materials.view', module: 'materials', action: 'view', description: 'Xem danh mục vật liệu' },
  { code: 'materials.manage', module: 'materials', action: 'manage', description: 'Quản lý vật liệu' },
  { code: 'locations.view', module: 'locations', action: 'view', description: 'Xem điểm lấy/đổ hàng' },
  { code: 'locations.manage', module: 'locations', action: 'manage', description: 'Quản lý điểm lấy/đổ hàng' },
  { code: 'trips.view', module: 'trips', action: 'view', description: 'Xem danh sách chuyến xe' },
  { code: 'trips.create', module: 'trips', action: 'create', description: 'Tạo chuyến xe mới' },
  { code: 'trips.update', module: 'trips', action: 'update', description: 'Cập nhật chuyến xe' },
  { code: 'trips.check_in', module: 'trips', action: 'check_in', description: 'Ghi nhận xe vào' },
  { code: 'trips.check_out', module: 'trips', action: 'check_out', description: 'Ghi nhận xe ra' },
  { code: 'trips.complete', module: 'trips', action: 'complete', description: 'Hoàn thành chuyến xe' },
  { code: 'trips.cancel', module: 'trips', action: 'cancel', description: 'Hủy chuyến xe' },
  { code: 'trips.approve_edit', module: 'trips', action: 'approve_edit', description: 'Duyệt yêu cầu chỉnh sửa' },
  { code: 'trips.delete', module: 'trips', action: 'delete', description: 'Xóa chuyến xe' },
  { code: 'trips.export', module: 'trips', action: 'export', description: 'Xuất dữ liệu chuyến xe' },
  { code: 'reports.view', module: 'reports', action: 'view', description: 'Xem báo cáo' },
  { code: 'reports.export', module: 'reports', action: 'export', description: 'Xuất báo cáo' },
  { code: 'audit.view', module: 'audit', action: 'view', description: 'Xem nhật ký hệ thống' },
  { code: 'notifications.view', module: 'notifications', action: 'view', description: 'Xem thông báo' },
  { code: 'settings.manage', module: 'settings', action: 'manage', description: 'Quản lý cài đặt hệ thống' },
]
