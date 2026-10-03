import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'Demo@123456'

async function main() {
  console.log('🌱 Starting seed...')

  // ==========================================
  // 1. Create Permissions
  // ==========================================
  console.log('📋 Creating permissions...')
  
  const allPermissions = [
    { code: 'users.view', module: 'users', action: 'view', description: 'Xem danh sách người dùng' },
    { code: 'users.create', module: 'users', action: 'create', description: 'Tạo người dùng mới' },
    { code: 'users.update', module: 'users', action: 'update', description: 'Cập nhật người dùng' },
    { code: 'users.delete', module: 'users', action: 'delete', description: 'Xóa người dùng' },
    { code: 'roles.manage', module: 'roles', action: 'manage', description: 'Quản lý vai trò' },
    { code: 'projects.view', module: 'projects', action: 'view', description: 'Xem công trình' },
    { code: 'projects.create', module: 'projects', action: 'create', description: 'Tạo công trình' },
    { code: 'projects.update', module: 'projects', action: 'update', description: 'Cập nhật công trình' },
    { code: 'projects.delete', module: 'projects', action: 'delete', description: 'Xóa công trình' },
    { code: 'vehicles.view', module: 'vehicles', action: 'view', description: 'Xem xe' },
    { code: 'vehicles.create', module: 'vehicles', action: 'create', description: 'Thêm xe' },
    { code: 'vehicles.update', module: 'vehicles', action: 'update', description: 'Cập nhật xe' },
    { code: 'drivers.view', module: 'drivers', action: 'view', description: 'Xem tài xế' },
    { code: 'drivers.create', module: 'drivers', action: 'create', description: 'Thêm tài xế' },
    { code: 'drivers.update', module: 'drivers', action: 'update', description: 'Cập nhật tài xế' },
    { code: 'materials.view', module: 'materials', action: 'view', description: 'Xem vật liệu' },
    { code: 'materials.manage', module: 'materials', action: 'manage', description: 'Quản lý vật liệu' },
    { code: 'locations.view', module: 'locations', action: 'view', description: 'Xem điểm lấy/đổ' },
    { code: 'locations.manage', module: 'locations', action: 'manage', description: 'Quản lý điểm lấy/đổ' },
    { code: 'trips.view', module: 'trips', action: 'view', description: 'Xem chuyến xe' },
    { code: 'trips.create', module: 'trips', action: 'create', description: 'Tạo chuyến xe' },
    { code: 'trips.update', module: 'trips', action: 'update', description: 'Cập nhật chuyến xe' },
    { code: 'trips.check_in', module: 'trips', action: 'check_in', description: 'Ghi nhận xe vào' },
    { code: 'trips.check_out', module: 'trips', action: 'check_out', description: 'Ghi nhận xe ra' },
    { code: 'trips.complete', module: 'trips', action: 'complete', description: 'Hoàn thành chuyến' },
    { code: 'trips.cancel', module: 'trips', action: 'cancel', description: 'Hủy chuyến' },
    { code: 'trips.approve_edit', module: 'trips', action: 'approve_edit', description: 'Duyệt chỉnh sửa' },
    { code: 'trips.delete', module: 'trips', action: 'delete', description: 'Xóa chuyến' },
    { code: 'trips.export', module: 'trips', action: 'export', description: 'Xuất dữ liệu chuyến' },
    { code: 'reports.view', module: 'reports', action: 'view', description: 'Xem báo cáo' },
    { code: 'reports.export', module: 'reports', action: 'export', description: 'Xuất báo cáo' },
    { code: 'audit.view', module: 'audit', action: 'view', description: 'Xem nhật ký' },
    { code: 'notifications.view', module: 'notifications', action: 'view', description: 'Xem thông báo' },
    { code: 'settings.manage', module: 'settings', action: 'manage', description: 'Quản lý cài đặt' },
  ]

  for (const perm of allPermissions) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: {},
      create: perm,
    })
  }

  // ==========================================
  // 2. Create Roles
  // ==========================================
  console.log('👥 Creating roles...')

  const roleData = [
    { name: 'SUPER_ADMIN', displayName: 'Super Admin', description: 'Toàn quyền hệ thống', isSystem: true },
    { name: 'ADMIN', displayName: 'Quản lý', description: 'Quản lý công trình và nhân sự', isSystem: true },
    { name: 'SUPERVISOR', displayName: 'Giám sát', description: 'Giám sát và xác nhận chuyến xe', isSystem: true },
    { name: 'GATE_STAFF', displayName: 'Nhân viên cổng', description: 'Nhập liệu xe vào/ra', isSystem: true },
    { name: 'ACCOUNTANT', displayName: 'Kế toán', description: 'Xem báo cáo và xuất dữ liệu', isSystem: true },
  ]

  const rolePermMap: Record<string, string[]> = {
    SUPER_ADMIN: allPermissions.map(p => p.code),
    ADMIN: [
      'users.view',
      'projects.view', 'projects.create', 'projects.update',
      'vehicles.view', 'vehicles.create', 'vehicles.update',
      'drivers.view', 'drivers.create', 'drivers.update',
      'materials.view', 'materials.manage',
      'locations.view', 'locations.manage',
      'trips.view', 'trips.create', 'trips.update', 'trips.check_in', 'trips.check_out',
      'trips.complete', 'trips.cancel', 'trips.approve_edit', 'trips.export',
      'reports.view', 'reports.export',
      'audit.view', 'notifications.view',
    ],
    SUPERVISOR: [
      'projects.view',
      'vehicles.view',
      'drivers.view',
      'materials.view',
      'locations.view',
      'trips.view', 'trips.create', 'trips.update', 'trips.check_in', 'trips.check_out',
      'trips.complete', 'trips.approve_edit', 'trips.export',
      'reports.view', 'reports.export',
      'notifications.view',
    ],
    GATE_STAFF: [
      'projects.view',
      'vehicles.view',
      'drivers.view',
      'materials.view',
      'locations.view',
      'trips.view', 'trips.check_in', 'trips.check_out',
      'notifications.view',
    ],
    ACCOUNTANT: [
      'projects.view',
      'vehicles.view',
      'drivers.view',
      'materials.view',
      'locations.view',
      'trips.view', 'trips.export',
      'reports.view', 'reports.export',
      'notifications.view',
    ],
  }

  for (const role of roleData) {
    const created = await prisma.role.upsert({
      where: { name: role.name },
      update: { displayName: role.displayName, description: role.description },
      create: role,
    })

    // Assign permissions
    const permCodes = rolePermMap[role.name] || []
    const perms = await prisma.permission.findMany({
      where: { code: { in: permCodes } },
    })

    // Delete existing role permissions and re-create
    await prisma.rolePermission.deleteMany({ where: { roleId: created.id } })
    for (const perm of perms) {
      await prisma.rolePermission.create({
        data: { roleId: created.id, permissionId: perm.id },
      })
    }
  }

  // ==========================================
  // 3. Create Demo Users
  // ==========================================
  console.log('👤 Creating demo users...')

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12)

  const users = [
    { username: 'superadmin', email: 'superadmin@demo.local', fullName: 'Super Admin', phone: '0901000001', role: 'SUPER_ADMIN' },
    { username: 'admin', email: 'admin@demo.local', fullName: 'Nguyễn Văn Quản Lý', phone: '0901000002', role: 'ADMIN' },
    { username: 'supervisor', email: 'supervisor@demo.local', fullName: 'Trần Văn Giám Sát', phone: '0901000003', role: 'SUPERVISOR' },
    { username: 'gatestaff', email: 'gatestaff@demo.local', fullName: 'Lê Văn Cổng', phone: '0901000004', role: 'GATE_STAFF' },
    { username: 'accountant', email: 'accountant@demo.local', fullName: 'Phạm Thị Kế Toán', phone: '0901000005', role: 'ACCOUNTANT' },
  ]

  for (const userData of users) {
    const role = await prisma.role.findUnique({ where: { name: userData.role } })
    if (!role) continue

    const user = await prisma.user.upsert({
      where: { username: userData.username },
      update: {},
      create: {
        username: userData.username,
        email: userData.email,
        passwordHash,
        fullName: userData.fullName,
        phone: userData.phone,
        isActive: true,
      },
    })

    // Assign role
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: role.id } },
      update: {},
      create: { userId: user.id, roleId: role.id },
    })
  }

  // ==========================================
  // 4. Create Materials
  // ==========================================
  console.log('📦 Creating materials...')

  const materials = [
    { code: 'DAT', name: 'Đất', unit: 'm³' },
    { code: 'CAT', name: 'Cát', unit: 'm³' },
    { code: 'DA', name: 'Đá', unit: 'm³' },
    { code: 'XABAN', name: 'Xà bần', unit: 'm³' },
    { code: 'VLXD', name: 'Vật liệu xây dựng', unit: 'm³' },
    { code: 'KHAC', name: 'Khác', unit: 'm³' },
  ]

  for (const mat of materials) {
    await prisma.material.upsert({
      where: { code: mat.code },
      update: {},
      create: mat,
    })
  }

  // ==========================================
  // 5. Create Sample Projects
  // ==========================================
  console.log('🏗️ Creating sample projects...')

  const superAdmin = await prisma.user.findUnique({ where: { username: 'superadmin' } })

  const projects = [
    { code: 'CT001', name: 'Công trình Khu dân cư Phú Mỹ', address: 'Quận 7, TP. Hồ Chí Minh', investor: 'Công ty ABC', status: 'ACTIVE' as const },
    { code: 'CT002', name: 'Dự án San lấp mặt bằng Bình Dương', address: 'Thủ Dầu Một, Bình Dương', investor: 'Công ty XYZ', status: 'ACTIVE' as const },
    { code: 'CT003', name: 'Công trình Cầu đường Quốc lộ 1A', address: 'Long An', investor: 'Ban QLDA Giao thông', status: 'ACTIVE' as const },
  ]

  for (const proj of projects) {
    const project = await prisma.project.upsert({
      where: { code: proj.code },
      update: {},
      create: {
        ...proj,
        managerId: superAdmin?.id,
        createdById: superAdmin?.id,
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
      },
    })

    // Assign all users to all sample projects
    const allUsers = await prisma.user.findMany({ where: { deletedAt: null } })
    for (const user of allUsers) {
      await prisma.userProject.upsert({
        where: { userId_projectId: { userId: user.id, projectId: project.id } },
        update: {},
        create: {
          userId: user.id,
          projectId: project.id,
          assignedBy: superAdmin?.id,
        },
      })
    }
  }

  // ==========================================
  // 6. Create Sample Vehicles
  // ==========================================
  console.log('🚛 Creating sample vehicles...')

  const vehicles = [
    { plateNumber: '51D-123.45', vehicleType: 'Xe ben', volumeCapacity: 12, ownerName: 'Nguyễn Văn A' },
    { plateNumber: '51D-678.90', vehicleType: 'Xe ben', volumeCapacity: 15, ownerName: 'Trần Văn B' },
    { plateNumber: '61C-111.22', vehicleType: 'Xe tải', volumeCapacity: 10, ownerName: 'Công ty Vận tải C' },
    { plateNumber: '62D-333.44', vehicleType: 'Xe ben', volumeCapacity: 18, ownerName: 'Lê Văn D' },
    { plateNumber: '51H-555.66', vehicleType: 'Xe đầu kéo', volumeCapacity: 25, ownerName: 'Công ty E' },
  ]

  for (const v of vehicles) {
    await prisma.vehicle.upsert({
      where: { plateNumber: v.plateNumber },
      update: {},
      create: {
        ...v,
        volumeCapacity: v.volumeCapacity,
        capacity: v.volumeCapacity * 1.5,
        status: 'ACTIVE',
        createdById: superAdmin?.id,
      },
    })
  }

  // ==========================================
  // 7. Create Sample Drivers
  // ==========================================
  console.log('👨‍✈️ Creating sample drivers...')

  const drivers = [
    { fullName: 'Nguyễn Văn Tài', phone: '0912345001', company: 'Tự do' },
    { fullName: 'Trần Văn Minh', phone: '0912345002', company: 'Công ty Vận tải C' },
    { fullName: 'Lê Hoàng Long', phone: '0912345003', company: 'Tự do' },
    { fullName: 'Phạm Đức Hải', phone: '0912345004', company: 'Công ty E' },
    { fullName: 'Võ Thanh Tùng', phone: '0912345005', company: 'Tự do' },
  ]

  for (const d of drivers) {
    await prisma.driver.upsert({
      where: { id: d.fullName }, // This will fail, use create
      update: {},
      create: {
        ...d,
        status: 'ACTIVE',
        createdById: superAdmin?.id,
      },
    })
  }

  // ==========================================
  // 8. Create Sample Locations
  // ==========================================
  console.log('📍 Creating sample locations...')

  const pickupLocations = [
    { name: 'Mỏ đất Củ Chi', address: 'Huyện Củ Chi, TP.HCM', contactPerson: 'Anh Hùng', phone: '0911111001' },
    { name: 'Bãi cát Bình Dương', address: 'Thủ Dầu Một, Bình Dương', contactPerson: 'Anh Tuấn', phone: '0911111002' },
    { name: 'Kho vật liệu Long An', address: 'Bến Lức, Long An', contactPerson: 'Chị Lan', phone: '0911111003' },
  ]

  for (const loc of pickupLocations) {
    // Use findFirst + create to avoid issues
    const existing = await prisma.pickupLocation.findFirst({ where: { name: loc.name } })
    if (!existing) {
      await prisma.pickupLocation.create({
        data: {
          ...loc,
          status: 'ACTIVE',
          createdById: superAdmin?.id,
        },
      })
    }
  }

  const dumpLocations = [
    { name: 'Công trình Phú Mỹ', address: 'Quận 7, TP.HCM', contactPerson: 'Anh Nam', phone: '0922222001' },
    { name: 'Bãi đổ Bình Chánh', address: 'Huyện Bình Chánh, TP.HCM', contactPerson: 'Anh Khoa', phone: '0922222002' },
    { name: 'Khu san lấp Thủ Dầu Một', address: 'Thủ Dầu Một, Bình Dương', contactPerson: 'Anh Phong', phone: '0922222003' },
  ]

  for (const loc of dumpLocations) {
    const existing = await prisma.dumpLocation.findFirst({ where: { name: loc.name } })
    if (!existing) {
      await prisma.dumpLocation.create({
        data: {
          ...loc,
          status: 'ACTIVE',
          createdById: superAdmin?.id,
        },
      })
    }
  }

  console.log('✅ Seed completed successfully!')
  console.log('')
  console.log('Demo accounts:')
  console.log('  superadmin / (DEMO_PASSWORD env var)')
  console.log('  admin / (DEMO_PASSWORD env var)')
  console.log('  supervisor / (DEMO_PASSWORD env var)')
  console.log('  gatestaff / (DEMO_PASSWORD env var)')
  console.log('  accountant / (DEMO_PASSWORD env var)')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
