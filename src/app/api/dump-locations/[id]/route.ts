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

    const location = await prisma.dumpLocation.findUnique({
      where: { id, deletedAt: null },
    })

    if (!location) return notFoundResponse('Điểm đổ hàng không tồn tại')

    return successResponse(location)
  } catch (error) {
    console.error('Get dump location error:', error)
    return serverErrorResponse()
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()
    if (!hasPermission(user, PERMISSIONS.LOCATIONS_MANAGE)) return forbiddenResponse()

    const { id } = await params

    const existingLocation = await prisma.dumpLocation.findUnique({ where: { id, deletedAt: null } })
    if (!existingLocation) return notFoundResponse('Điểm đổ hàng không tồn tại')

    const body = await request.json()
    const parsed = updateLocationSchema.safeParse(body)
    if (!parsed.success) return validationErrorResponse(parsed.error.issues[0].message)

    const updatedLocation = await prisma.dumpLocation.update({
      where: { id },
      data: parsed.data,
    })

    await auditAction(user, 'UPDATE', 'dump-locations', id, existingLocation, updatedLocation)
    return successResponse(updatedLocation)
  } catch (error) {
    console.error('Update dump location error:', error)
    return serverErrorResponse()
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()
    if (!hasPermission(user, PERMISSIONS.LOCATIONS_MANAGE)) return forbiddenResponse()

    const { id } = await params

    const existingLocation = await prisma.dumpLocation.findUnique({ where: { id, deletedAt: null } })
    if (!existingLocation) return notFoundResponse('Điểm đổ hàng không tồn tại')

    const deletedLocation = await prisma.dumpLocation.update({
      where: { id },
      data: { deletedAt: new Date() },
    })

    await auditAction(user, 'DELETE', 'dump-locations', id, existingLocation, { deletedAt: deletedLocation.deletedAt })
    return successResponse({ success: true })
  } catch (error) {
    console.error('Delete dump location error:', error)
    return serverErrorResponse()
  }
}
