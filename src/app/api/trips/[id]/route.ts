import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { hasPermission, hasProjectAccess } from '@/lib/permissions'
import { PERMISSIONS } from '@/lib/permissions'
import { auditAction } from '@/lib/audit'
import { successResponse, unauthorizedResponse, forbiddenResponse, notFoundResponse, validationErrorResponse, errorResponse, serverErrorResponse } from '@/lib/api-response'
import { checkOutTripSchema, cancelTripSchema } from '@/lib/validation'
import { isValidTransition } from '@/lib/constants'

// GET trip detail
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()
    if (!hasPermission(user, PERMISSIONS.TRIPS_VIEW)) return forbiddenResponse()

    const { id } = await params

    const trip = await prisma.trip.findFirst({
      where: { id, deletedAt: null },
      include: {
        project: { select: { id: true, code: true, name: true } },
        vehicle: { select: { id: true, plateNumber: true, vehicleType: true, volumeCapacity: true } },
        driver: { select: { id: true, fullName: true, phone: true } },
        material: { select: { id: true, name: true, unit: true, code: true } },
        pickupLocation: { select: { id: true, name: true, address: true } },
        dumpLocation: { select: { id: true, name: true, address: true } },
        createdBy: { select: { id: true, fullName: true, username: true } },
        checkedOutBy: { select: { id: true, fullName: true, username: true } },
        confirmedBy: { select: { id: true, fullName: true, username: true } },
        events: {
          orderBy: { createdAt: 'asc' },
          include: {
            performedBy: { select: { id: true, fullName: true } },
          },
        },
        editRequests: {
          orderBy: { createdAt: 'desc' },
          include: {
            requestedBy: { select: { id: true, fullName: true } },
            reviewedBy: { select: { id: true, fullName: true } },
          },
        },
      },
    })

    if (!trip) return notFoundResponse('Không tìm thấy chuyến xe')
    if (!hasProjectAccess(user, trip.projectId)) return forbiddenResponse()

    return successResponse(trip)
  } catch (error) {
    console.error('Get trip error:', error)
    return serverErrorResponse()
  }
}

// PUT update trip
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()
    if (!hasPermission(user, PERMISSIONS.TRIPS_UPDATE)) return forbiddenResponse()

    const { id } = await params
    const body = await request.json()
    const { action } = body

    const trip = await prisma.trip.findFirst({
      where: { id, deletedAt: null },
    })

    if (!trip) return notFoundResponse('Không tìm thấy chuyến xe')
    if (!hasProjectAccess(user, trip.projectId)) return forbiddenResponse()

    // Handle different actions
    if (action === 'check_out') {
      return handleCheckOut(trip, body, user)
    } else if (action === 'complete') {
      return handleComplete(trip, user)
    } else if (action === 'cancel') {
      return handleCancel(trip, body, user)
    }

    return errorResponse('INVALID_ACTION', 'Thao tác không hợp lệ')
  } catch (error) {
    console.error('Update trip error:', error)
    return serverErrorResponse()
  }
}

async function handleCheckOut(trip: any, body: any, user: any) {
  if (!hasPermission(user, PERMISSIONS.TRIPS_CHECK_OUT)) return forbiddenResponse()

  // Validate state transition
  if (!isValidTransition(trip.status, 'CHECKED_OUT')) {
    return errorResponse(
      'INVALID_STATE_TRANSITION',
      `Không thể chuyển trạng thái từ ${trip.status} sang CHECKED_OUT`
    )
  }

  const parsed = checkOutTripSchema.safeParse(body)
  if (!parsed.success) {
    return validationErrorResponse(parsed.error.issues[0].message)
  }

  // Optimistic locking
  const updated = await prisma.$transaction(async (tx) => {
    const current = await tx.trip.findFirst({
      where: { id: trip.id, version: trip.version },
    })

    if (!current) {
      throw new Error('CONCURRENT_MODIFICATION')
    }

    const updatedTrip = await tx.trip.update({
      where: { id: trip.id },
      data: {
        status: 'COMPLETED', // Check-out + complete in one step for fast flow
        checkOutAt: new Date(), // Server timestamp
        actualVolume: parsed.data.actualVolume || trip.expectedVolume,
        checkedOutById: user.id,
        confirmedById: user.id,
        notes: parsed.data.notes || trip.notes,
        version: { increment: 1 },
      },
      include: {
        vehicle: { select: { plateNumber: true } },
        driver: { select: { fullName: true } },
        material: { select: { name: true } },
      },
    })

    // Create events
    await tx.tripEvent.create({
      data: {
        tripId: trip.id,
        eventType: 'CHECKED_OUT',
        oldStatus: trip.status,
        newStatus: 'CHECKED_OUT',
        performedById: user.id,
        notes: 'Xe ra cổng',
        metadata: { actualVolume: parsed.data.actualVolume },
      },
    })

    await tx.tripEvent.create({
      data: {
        tripId: trip.id,
        eventType: 'COMPLETED',
        oldStatus: 'CHECKED_OUT',
        newStatus: 'COMPLETED',
        performedById: user.id,
        notes: 'Hoàn thành chuyến',
      },
    })

    return updatedTrip
  })

  await auditAction(user, 'CHECK_OUT', 'trips', trip.id, 
    { status: trip.status, actualVolume: trip.actualVolume },
    { status: 'COMPLETED', actualVolume: updated.actualVolume, checkOutAt: updated.checkOutAt }
  )

  return successResponse(updated)
}

async function handleComplete(trip: any, user: any) {
  if (!hasPermission(user, PERMISSIONS.TRIPS_COMPLETE)) return forbiddenResponse()

  if (!isValidTransition(trip.status, 'COMPLETED')) {
    return errorResponse(
      'INVALID_STATE_TRANSITION',
      `Không thể hoàn thành chuyến ở trạng thái ${trip.status}`
    )
  }

  const updated = await prisma.$transaction(async (tx) => {
    const updatedTrip = await tx.trip.update({
      where: { id: trip.id },
      data: {
        status: 'COMPLETED',
        confirmedById: user.id,
        version: { increment: 1 },
      },
    })

    await tx.tripEvent.create({
      data: {
        tripId: trip.id,
        eventType: 'COMPLETED',
        oldStatus: trip.status,
        newStatus: 'COMPLETED',
        performedById: user.id,
        notes: 'Hoàn thành chuyến',
      },
    })

    return updatedTrip
  })

  await auditAction(user, 'COMPLETE', 'trips', trip.id,
    { status: trip.status },
    { status: 'COMPLETED' }
  )

  return successResponse(updated)
}

async function handleCancel(trip: any, body: any, user: any) {
  if (!hasPermission(user, PERMISSIONS.TRIPS_CANCEL)) return forbiddenResponse()

  if (!isValidTransition(trip.status, 'CANCELLED')) {
    return errorResponse(
      'INVALID_STATE_TRANSITION',
      `Không thể hủy chuyến ở trạng thái ${trip.status}`
    )
  }

  const parsed = cancelTripSchema.safeParse(body)
  if (!parsed.success) {
    return validationErrorResponse(parsed.error.issues[0].message)
  }

  const updated = await prisma.$transaction(async (tx) => {
    const updatedTrip = await tx.trip.update({
      where: { id: trip.id },
      data: {
        status: 'CANCELLED',
        notes: `[HỦY] ${parsed.data.reason}\n${trip.notes || ''}`.trim(),
        version: { increment: 1 },
      },
    })

    await tx.tripEvent.create({
      data: {
        tripId: trip.id,
        eventType: 'CANCELLED',
        oldStatus: trip.status,
        newStatus: 'CANCELLED',
        performedById: user.id,
        notes: parsed.data.reason,
      },
    })

    return updatedTrip
  })

  await auditAction(user, 'CANCEL', 'trips', trip.id,
    { status: trip.status },
    { status: 'CANCELLED', reason: parsed.data.reason }
  )

  return successResponse(updated)
}
