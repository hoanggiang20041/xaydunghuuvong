import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { PERMISSIONS } from '@/lib/permissions'
import { auditAction } from '@/lib/audit'
import { successResponse, unauthorizedResponse, forbiddenResponse, validationErrorResponse, notFoundResponse, serverErrorResponse } from '@/lib/api-response'
import { updateLocationSchema } from '@/lib/validation'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()
    if (!hasPermission(user, PERMISSIONS.LOCATIONS_VIEW)) return forbiddenResponse()

    const { id } = await params

    const location = await prisma.pickupLocation.findUnique({
      where: { id, deletedAt: null },
    })

    if (!location) return notFoundResponse('Điểm lấy hàng không tồn tại')

    return successResponse(location)
  } catch (error) {
    console.error('Get pickup location error:', error)
    return serverErrorResponse()
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()
    if (!hasPermission(user, PERMISSIONS.LOCATIONS_MANAGE)) return forbiddenResponse()

    const { id } = await params

    const existingLocation = await prisma.pickupLocation.findUnique({ where: { id, deletedAt: null } })
    if (!existingLocation) return notFoundResponse('Điểm lấy hàng không tồn tại')

    const body = await request.json()
    const parsed = updateLocationSchema.safeParse(body)
    if (!parsed.success) return validationErrorResponse(parsed.error.issues[0].message)

    const updatedLocation = await prisma.pickupLocation.update({
      where: { id },
      data: parsed.data,
    })

    await auditAction(user, 'UPDATE', 'pickup-locations', id, existingLocation, updatedLocation)
    return successResponse(updatedLocation)
  } catch (error) {
    console.error('Update pickup location error:', error)
    return serverErrorResponse()
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()
    if (!hasPermission(user, PERMISSIONS.LOCATIONS_MANAGE)) return forbiddenResponse()

    const { id } = await params

    const existingLocation = await prisma.pickupLocation.findUnique({ where: { id, deletedAt: null } })
    if (!existingLocation) return notFoundResponse('Điểm lấy hàng không tồn tại')

    const deletedLocation = await prisma.pickupLocation.update({
      where: { id },
      data: { deletedAt: new Date() },
    })

    await auditAction(user, 'DELETE', 'pickup-locations', id, existingLocation, { deletedAt: deletedLocation.deletedAt })
    return successResponse({ success: true })
  } catch (error) {
    console.error('Delete pickup location error:', error)
    return serverErrorResponse()
  }
}
