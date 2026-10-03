import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const allPermissions = [
      { code: 'users.view', module: 'users', action: 'view', description: 'Xem danh sách người dùng' },
      { code: 'users.create', module: 'users', action: 'create', description: 'Tạo người dùng mới' },
      { code: 'users.update', module: 'users', action: 'update', description: 'Cập nhật người dùng' },
      { code: 'users.delete', module: 'users', action: 'delete', description: 'Xóa người dùng' },

      { code: 'projects.view', module: 'projects', action: 'view', description: 'Xem danh sách công trình' },
      { code: 'projects.create', module: 'projects', action: 'create', description: 'Thêm công trình' },
      { code: 'projects.update', module: 'projects', action: 'update', description: 'Cập nhật công trình' },
      { code: 'projects.delete', module: 'projects', action: 'delete', description: 'Xóa công trình' },

      { code: 'vehicles.view', module: 'vehicles', action: 'view', description: 'Xem danh sách xe' },
      { code: 'vehicles.create', module: 'vehicles', action: 'create', description: 'Thêm xe mới' },
      { code: 'vehicles.update', module: 'vehicles', action: 'update', description: 'Cập nhật thông vị trí xe' },
      { code: 'vehicles.delete', module: 'vehicles', action: 'delete', description: 'Xóa xe' },

      { code: 'drivers.view', module: 'drivers', action: 'view', description: 'Xem danh sách tài xế' },
      { code: 'drivers.create', module: 'drivers', action: 'create', description: 'Thêm tài xế' },
      { code: 'drivers.update', module: 'drivers', action: 'update', description: 'Cập nhật tài xế' },
      { code: 'drivers.delete', module: 'drivers', action: 'delete', description: 'Xóa tài xế' },

      { code: 'materials.view', module: 'materials', action: 'view', description: 'Xem danh sách vật liệu' },
      { code: 'materials.manage', module: 'materials', action: 'manage', description: 'Quản lý vật liệu (Thêm, Sửa, Xóa)' },

      { code: 'locations.view', module: 'locations', action: 'view', description: 'Xem danh sách điểm lấy/đổ hàng' },
      { code: 'locations.manage', module: 'locations', action: 'manage', description: 'Quản lý điểm lấy/đổ hàng' },

      { code: 'trips.view', module: 'trips', action: 'view', description: 'Xem danh sách chuyến xe' },
      { code: 'trips.create', module: 'trips', action: 'create', description: 'Tạo chuyến xe thủ công' },
      { code: 'trips.update', module: 'trips', action: 'update', description: 'Sửa thông tin chuyến xe' },
      { code: 'trips.check_in', module: 'trips', action: 'check_in', description: 'Ghi nhận xe vào' },
      { code: 'trips.check_out', module: 'trips', action: 'check_out', description: 'Ghi nhận xe ra' },
      { code: 'trips.complete', module: 'trips', action: 'complete', description: 'Xác nhận hoàn thành chuyến' },
      { code: 'trips.cancel', module: 'trips', action: 'cancel', description: 'Hủy chuyến xe' },
      { code: 'trips.approve_edit', module: 'trips', action: 'approve_edit', description: 'Duyệt yêu cầu sửa chuyến' },
      { code: 'trips.export', module: 'trips', action: 'export', description: 'Xuất dữ liệu chuyến xe' },

      { code: 'reports.view', module: 'reports', action: 'view', description: 'Xem báo cáo thống kê' },
      { code: 'reports.export', module: 'reports', action: 'export', description: 'Xuất báo cáo' },

      { code: 'audit.view', module: 'audit', action: 'view', description: 'Xem nhật ký hệ thống' },
      { code: 'notifications.view', module: 'notifications', action: 'view', description: 'Xem thông báo' },
    ]

    for (const perm of allPermissions) {
      await prisma.permission.upsert({
        where: { code: perm.code },
        update: { description: perm.description },
        create: perm,
      })
    }

    const roleData = [
      { name: 'SUPER_ADMIN', displayName: 'Quản trị tối cao', description: 'Toàn quyền hệ thống', isSystem: true },
      { name: 'DIRECTOR', displayName: 'Giám đốc', description: 'Theo dõi tổng quan và báo cáo', isSystem: true },
      { name: 'ADMIN', displayName: 'Quản lý', description: 'Quản lý vận hành chung', isSystem: true },
      { name: 'SUPERVISOR', displayName: 'Giám sát', description: 'Giám sát và quản lý chuyến xe', isSystem: true },
      { name: 'GATE_STAFF', displayName: 'Bảo vệ cổng', description: 'Ghi nhận xe ra vào công trình', isSystem: true },
      { name: 'ACCOUNTANT', displayName: 'Kế toán', description: 'Xem báo cáo và xuất dữ liệu', isSystem: true },
    ]

    const rolePermMap: Record<string, string[]> = {
      SUPER_ADMIN: allPermissions.map(p => p.code),
      DIRECTOR: [
        'projects.view', 'vehicles.view', 'drivers.view', 'materials.view', 'locations.view',
        'trips.view', 'trips.export', 'reports.view', 'reports.export', 'audit.view', 'notifications.view',
      ],
      ADMIN: [
        'users.view', 'projects.view', 'projects.create', 'projects.update',
        'vehicles.view', 'vehicles.create', 'vehicles.update',
        'drivers.view', 'drivers.create', 'drivers.update',
        'materials.view', 'materials.manage', 'locations.view', 'locations.manage',
        'trips.view', 'trips.create', 'trips.update', 'trips.check_in', 'trips.check_out',
        'trips.complete', 'trips.cancel', 'trips.approve_edit', 'trips.export',
        'reports.view', 'reports.export', 'audit.view', 'notifications.view',
      ],
      SUPERVISOR: [
        'projects.view', 'vehicles.view', 'drivers.view', 'materials.view', 'locations.view',
        'trips.view', 'trips.create', 'trips.update', 'trips.check_in', 'trips.check_out',
        'trips.complete', 'trips.approve_edit', 'trips.export',
        'reports.view', 'reports.export', 'notifications.view',
      ],
      GATE_STAFF: [
        'projects.view', 'vehicles.view', 'drivers.view', 'materials.view', 'locations.view',
        'trips.view', 'trips.check_in', 'trips.check_out', 'notifications.view',
      ],
      ACCOUNTANT: [
        'projects.view', 'vehicles.view', 'drivers.view', 'materials.view', 'locations.view',
        'trips.view', 'trips.export', 'reports.view', 'reports.export', 'notifications.view',
      ],
    }

    for (const role of roleData) {
      const created = await prisma.role.upsert({
        where: { name: role.name },
        update: { displayName: role.displayName, description: role.description },
        create: role,
      })

      const permCodes = rolePermMap[role.name] || []
      const perms = await prisma.permission.findMany({
        where: { code: { in: permCodes } },
      })

      await prisma.rolePermission.deleteMany({ where: { roleId: created.id } })
      for (const perm of perms) {
        await prisma.rolePermission.create({
          data: { roleId: created.id, permissionId: perm.id },
        })
      }
    }
    return NextResponse.json({ success: true, message: 'Seeded successfully on production DB!' })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message })
  }
}
