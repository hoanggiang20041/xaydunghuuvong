import { z } from 'zod'

// ==========================================
// AUTH SCHEMAS
// ==========================================

export const loginSchema = z.object({
  username: z.string().min(1, 'Vui lòng nhập tên đăng nhập'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
  rememberMe: z.boolean().optional().default(false),
})

export const forgotPasswordSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
})

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự'),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
  newPassword: z.string().min(8, 'Mật khẩu mới phải có ít nhất 8 ký tự'),
})

// ==========================================
// USER SCHEMAS
// ==========================================

export const createUserSchema = z.object({
  username: z.string().min(3, 'Tên đăng nhập phải có ít nhất 3 ký tự').max(50).regex(/^[a-zA-Z0-9_]+$/, 'Tên đăng nhập chỉ chứa chữ cái, số và dấu gạch dưới'),
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự'),
  fullName: z.string().min(1, 'Vui lòng nhập họ tên').max(100),
  phone: z.string().max(20).optional().nullable(),
  roleIds: z.array(z.string().uuid()).min(1, 'Phải chọn ít nhất 1 vai trò'),
  projectIds: z.array(z.string().uuid()).optional().default([]),
})

export const updateUserSchema = z.object({
  email: z.string().email('Email không hợp lệ').optional(),
  fullName: z.string().min(1).max(100).optional(),
  phone: z.string().max(20).optional().nullable(),
  isActive: z.boolean().optional(),
  roleIds: z.array(z.string().uuid()).optional(),
  projectIds: z.array(z.string().uuid()).optional(),
})

// ==========================================
// PROJECT SCHEMAS
// ==========================================

export const createProjectSchema = z.object({
  code: z.string().min(1, 'Vui lòng nhập mã công trình').max(50),
  name: z.string().min(1, 'Vui lòng nhập tên công trình').max(200),
  address: z.string().optional().nullable(),
  investor: z.string().max(200).optional().nullable(),
  managerId: z.string().uuid().optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'PAUSED', 'COMPLETED', 'CLOSED']).optional().default('ACTIVE'),
  notes: z.string().optional().nullable(),
})

export const updateProjectSchema = createProjectSchema.partial()

// ==========================================
// VEHICLE SCHEMAS
// ==========================================

export const createVehicleSchema = z.object({
  plateNumber: z.string().min(1, 'Vui lòng nhập biển số xe').max(20),
  vehicleType: z.string().max(50).optional().nullable(),
  capacity: z.number().positive().optional().nullable(),
  volumeCapacity: z.number().positive().optional().nullable(),
  ownerName: z.string().max(100).optional().nullable(),
  defaultDriverId: z.string().uuid().optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional().default('ACTIVE'),
  notes: z.string().optional().nullable(),
})

export const updateVehicleSchema = createVehicleSchema.partial()

// ==========================================
// DRIVER SCHEMAS
// ==========================================

export const createDriverSchema = z.object({
  fullName: z.string().min(1, 'Vui lòng nhập họ tên tài xế').max(100),
  phone: z.string().max(20).optional().nullable(),
  idNumber: z.string().max(20).optional().nullable(),
  company: z.string().max(100).optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional().default('ACTIVE'),
  notes: z.string().optional().nullable(),
})

export const updateDriverSchema = createDriverSchema.partial()

// ==========================================
// MATERIAL SCHEMAS
// ==========================================

export const createMaterialSchema = z.object({
  code: z.string().min(1, 'Vui lòng nhập mã vật liệu').max(20),
  name: z.string().min(1, 'Vui lòng nhập tên vật liệu').max(100),
  unit: z.string().max(20).optional().default('m³'),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional().default('ACTIVE'),
})

export const updateMaterialSchema = createMaterialSchema.partial()

// ==========================================
// LOCATION SCHEMAS
// ==========================================

export const createLocationSchema = z.object({
  name: z.string().min(1, 'Vui lòng nhập tên địa điểm').max(200),
  address: z.string().optional().nullable(),
  contactPerson: z.string().max(100).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional().default('ACTIVE'),
  notes: z.string().optional().nullable(),
})

export const updateLocationSchema = createLocationSchema.partial()

// ==========================================
// TRIP SCHEMAS
// ==========================================

export const createTripSchema = z.object({
  projectId: z.string().uuid('Vui lòng chọn công trình'),
  vehicleId: z.string().uuid('Vui lòng chọn xe'),
  driverId: z.string().uuid('Vui lòng chọn tài xế'),
  materialId: z.string().uuid('Vui lòng chọn vật liệu'),
  pickupLocationId: z.string().uuid().optional().nullable(),
  dumpLocationId: z.string().uuid().optional().nullable(),
  expectedVolume: z.number().positive('Số khối phải lớn hơn 0').optional().nullable(),
  notes: z.string().optional().nullable(),
})

export const checkOutTripSchema = z.object({
  actualVolume: z.number().positive('Số khối thực tế phải lớn hơn 0').optional().nullable(),
  notes: z.string().optional().nullable(),
})

export const cancelTripSchema = z.object({
  reason: z.string().min(1, 'Vui lòng nhập lý do hủy'),
})

export const tripEditRequestSchema = z.object({
  fieldName: z.string().min(1),
  oldValue: z.string().optional().nullable(),
  newValue: z.string().min(1, 'Vui lòng nhập giá trị mới'),
  reason: z.string().min(1, 'Vui lòng nhập lý do chỉnh sửa'),
})

// ==========================================
// REPORT SCHEMAS
// ==========================================

export const reportFilterSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  projectId: z.string().uuid().optional(),
  vehicleId: z.string().uuid().optional(),
  driverId: z.string().uuid().optional(),
  materialId: z.string().uuid().optional(),
  dumpLocationId: z.string().uuid().optional(),
  status: z.string().optional(),
})

// ==========================================
// TYPE EXPORTS
// ==========================================

export type LoginInput = z.infer<typeof loginSchema>
export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
export type CreateProjectInput = z.infer<typeof createProjectSchema>
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>
export type CreateVehicleInput = z.infer<typeof createVehicleSchema>
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>
export type CreateDriverInput = z.infer<typeof createDriverSchema>
export type UpdateDriverInput = z.infer<typeof updateDriverSchema>
export type CreateMaterialInput = z.infer<typeof createMaterialSchema>
export type CreateLocationInput = z.infer<typeof createLocationSchema>
export type CreateTripInput = z.infer<typeof createTripSchema>
export type CheckOutTripInput = z.infer<typeof checkOutTripSchema>
export type TripEditRequestInput = z.infer<typeof tripEditRequestSchema>
