import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { hasPermission, getAccessibleProjectIds, hasProjectAccess } from '@/lib/permissions'
import { PERMISSIONS } from '@/lib/permissions'
import { auditAction } from '@/lib/audit'
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse, notFoundResponse, validationErrorResponse, serverErrorResponse, parsePagination } from '@/lib/api-response'
import { createTripSchema } from '@/lib/validation'
import { generateTripCode, startOfDay, endOfDay } from '@/lib/date-utils'
import { normalizePlateNumber } from '@/lib/plate-utils'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()
    if (!hasPermission(user, PERMISSIONS.TRIPS_VIEW)) return forbiddenResponse()

    const { searchParams } = request.nextUrl
    const { page, pageSize, skip } = parsePagination(searchParams)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const projectId = searchParams.get('projectId') || ''
    const materialId = searchParams.get('materialId') || ''
    const driverId = searchParams.get('driverId') || ''
    const vehicleId = searchParams.get('vehicleId') || ''
    const dumpLocationId = searchParams.get('dumpLocationId') || ''
    const startDate = searchParams.get('startDate') || ''
    const endDate = searchParams.get('endDate') || ''
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc'

    // Project scope
    const accessibleProjects = getAccessibleProjectIds(user)

    // Build where clause
    const where: Record<string, unknown> = { deletedAt: null }

    if (accessibleProjects !== null) {
      where.projectId = { in: accessibleProjects }
    }

    if (search) {
      where.OR = [
        { tripCode: { contains: search, mode: 'insensitive' } },
        { vehicle: { plateNumber: { contains: search, mode: 'insensitive' } } },
        { driver: { fullName: { contains: search, mode: 'insensitive' } } },
      ]
    }

    if (status) where.status = status
    if (projectId) where.projectId = projectId
    if (materialId) where.materialId = materialId
    if (driverId) where.driverId = driverId
    if (vehicleId) where.vehicleId = vehicleId
    if (dumpLocationId) where.dumpLocationId = dumpLocationId

    if (startDate || endDate) {
      where.checkInAt = {}
      if (startDate) (where.checkInAt as Record<string, unknown>).gte = new Date(startDate)
      if (endDate) (where.checkInAt as Record<string, unknown>).lte = new Date(endDate + 'T23:59:59.999Z')
    }

    // Allowed sort fields
    const allowedSorts = ['createdAt', 'checkInAt', 'checkOutAt', 'tripCode', 'status']
    const orderField = allowedSorts.includes(sortBy) ? sortBy : 'createdAt'

    const [trips, total] = await Promise.all([
      prisma.trip.findMany({
        where: where as any,
        include: {
          project: { select: { id: true, code: true, name: true } },
          vehicle: { select: { id: true, plateNumber: true, vehicleType: true } },
          driver: { select: { id: true, fullName: true, phone: true } },
          material: { select: { id: true, name: true, unit: true } },
          pickupLocation: { select: { id: true, name: true } },
          dumpLocation: { select: { id: true, name: true } },
          createdBy: { select: { id: true, fullName: true } },
          checkedOutBy: { select: { id: true, fullName: true } },
          confirmedBy: { select: { id: true, fullName: true } },
        },
        orderBy: { [orderField]: sortOrder },
        skip,
        take: pageSize,
      }),
      prisma.trip.count({ where: where as any }),
    ])

    return successResponse(trips, {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    })
  } catch (error) {
    console.error('List trips error:', error)
    return serverErrorResponse()
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()
    if (!hasPermission(user, PERMISSIONS.TRIPS_CREATE)) return forbiddenResponse()

    const body = await request.json()
    const parsed = createTripSchema.safeParse(body)
    if (!parsed.success) {
      return validationErrorResponse(parsed.error.issues[0].message)
    }

    const data = parsed.data
    
    let expectedVolume = data.expectedVolume
    let volumeM3 = data.volumeM3

    if (data.calculationMethod === 'dimensions' && data.lengthM !== undefined && data.widthM !== undefined && data.heightM !== undefined && data.lengthM !== null && data.widthM !== null && data.heightM !== null) {
      volumeM3 = data.lengthM * data.widthM * data.heightM
      expectedVolume = volumeM3
    } else if (data.calculationMethod === 'manual' && data.volumeM3 !== undefined && data.volumeM3 !== null) {
      expectedVolume = data.volumeM3
    }

    // Check project access
    if (!hasProjectAccess(user, data.projectId)) {
      return forbiddenResponse('Bạn không có quyền truy cập công trình này')
    }

    let vehicleId = data.vehicleId;
    if (!vehicleId && data.plateNumber) {
      const plateUpper = normalizePlateNumber(data.plateNumber);
      let vehicle = await prisma.vehicle.findUnique({
        where: { plateNumber: plateUpper }
      });
      if (!vehicle) {
        vehicle = await prisma.vehicle.create({
          data: {
            plateNumber: plateUpper,
            vehicleType: 'Khác',
            createdById: user.id
          }
        });
        await auditAction(user, 'CREATE', 'vehicles', vehicle.id, null, { plateNumber: plateUpper });
      }
      vehicleId = vehicle.id;
    }

    if (!vehicleId) {
      return validationErrorResponse('Không xác định được xe');
    }

    // Check if vehicle has an open trip
    const openTrip = await prisma.trip.findFirst({
      where: {
        vehicleId: vehicleId,
        status: { in: ['CHECKED_IN', 'IN_PROGRESS'] },
        deletedAt: null,
      },
    })

    if (openTrip) {
      return errorResponse(
        'VEHICLE_HAS_OPEN_TRIP',
        'Xe này đang có chuyến chưa hoàn thành. Vui lòng hoàn thành chuyến hiện tại trước.',
        409
      )
    }

    // Generate trip code
    const todayStart = startOfDay()
    const todayEnd = endOfDay()
    const todayCount = await prisma.trip.count({
      where: {
        createdAt: { gte: todayStart, lte: todayEnd },
      },
    })
    const tripCode = generateTripCode(todayCount + 1)

    // Create trip in transaction
    const trip = await prisma.$transaction(async (tx) => {
      const newTrip = await tx.trip.create({
        data: {
          tripCode,
          projectId: data.projectId,
          vehicleId: vehicleId,
          driverId: data.driverId,
          materialId: data.materialId,
          pickupLocationId: data.pickupLocationId,
          dumpLocationId: data.dumpLocationId,
          expectedVolume: expectedVolume,
          lengthM: data.lengthM,
          widthM: data.widthM,
          heightM: data.heightM,
          volumeM3: volumeM3,
          calculationMethod: data.calculationMethod,
          checkInPhotoUrl: data.checkInPhotoUrl,
          checkInAt: new Date(), // Server timestamp
          status: 'CHECKED_IN',
          notes: data.notes,
          createdById: user.id,
        },
        include: {
          project: { select: { id: true, code: true, name: true } },
          vehicle: { select: { id: true, plateNumber: true } },
          driver: { select: { id: true, fullName: true } },
          material: { select: { id: true, name: true, unit: true } },
          pickupLocation: { select: { id: true, name: true } },
          dumpLocation: { select: { id: true, name: true } },
          createdBy: { select: { id: true, fullName: true } },
        },
      })

      // Create trip event
      await tx.tripEvent.create({
        data: {
          tripId: newTrip.id,
          eventType: 'CHECKED_IN',
          newStatus: 'CHECKED_IN',
          performedById: user.id,
          notes: 'Xe vào công trình',
        },
      })

      return newTrip
    })

    // Audit log (outside transaction to not block)
    await auditAction(user, 'CREATE', 'trips', trip.id, null, {
      tripCode: trip.tripCode,
      vehicleId: vehicleId,
      driverId: data.driverId,
      materialId: data.materialId,
      expectedVolume: data.expectedVolume,
    })

    return successResponse(trip)
  } catch (error) {
    console.error('Create trip error:', error)
    return serverErrorResponse()
  }
}

