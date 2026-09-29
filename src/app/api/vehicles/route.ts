import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { PERMISSIONS } from '@/lib/permissions'
import { auditAction } from '@/lib/audit'
import { successResponse, unauthorizedResponse, forbiddenResponse, validationErrorResponse, serverErrorResponse, parsePagination } from '@/lib/api-response'
import { createVehicleSchema } from '@/lib/validation'
import { normalizePlateNumber } from '@/lib/plate-utils'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()
    if (!hasPermission(user, PERMISSIONS.VEHICLES_VIEW)) return forbiddenResponse()

    const { searchParams } = request.nextUrl
    const { page, pageSize, skip } = parsePagination(searchParams)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''

    const where: Record<string, unknown> = { deletedAt: null }
    if (search) {
      where.OR = [
        { plateNumber: { contains: search, mode: 'insensitive' } },
        { ownerName: { contains: search, mode: 'insensitive' } },
        { vehicleType: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (status) where.status = status

    const [vehicles, total] = await Promise.all([
      prisma.vehicle.findMany({
        where: where as any,
        include: {
          defaultDriver: { select: { id: true, fullName: true, phone: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.vehicle.count({ where: where as any }),
    ])

    return successResponse(vehicles, { page, pageSize, total, totalPages: Math.ceil(total / pageSize) })
  } catch (error) {
    console.error('List vehicles error:', error)
    return serverErrorResponse()
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()
    if (!hasPermission(user, PERMISSIONS.VEHICLES_CREATE)) return forbiddenResponse()

    const body = await request.json()
    const parsed = createVehicleSchema.safeParse(body)
    if (!parsed.success) return validationErrorResponse(parsed.error.issues[0].message)

    const normalizedPlate = normalizePlateNumber(parsed.data.plateNumber)
    const existing = await prisma.vehicle.findUnique({ where: { plateNumber: normalizedPlate } })
    if (existing) return validationErrorResponse('Biển số xe đã tồn tại trong hệ thống')

    const vehicle = await prisma.vehicle.create({
      data: {
        ...parsed.data,
        plateNumber: normalizedPlate,
        createdById: user.id,
      },
    })

    await auditAction(user, 'CREATE', 'vehicles', vehicle.id, null, { plateNumber: normalizedPlate })
    return successResponse(vehicle)
  } catch (error) {
    console.error('Create vehicle error:', error)
    return serverErrorResponse()
  }
}

