import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/permissions'
import { successResponse, unauthorizedResponse, forbiddenResponse, notFoundResponse, serverErrorResponse } from '@/lib/api-response'

export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()
    if (!hasPermission(user, PERMISSIONS.VEHICLES_MANAGE)) return forbiddenResponse()

    const { id } = await props.params
    const data = await request.json()

    const existing = await prisma.vehicle.findUnique({ where: { id } })
    if (!existing) return notFoundResponse('Không tìm thấy xe')

    const updated = await prisma.vehicle.update({
      where: { id },
      data: {
        plateNumber: data.plateNumber || existing.plateNumber,
        vehicleType: data.vehicleType,
        volumeCapacity: data.volumeCapacity,
        ownerName: data.ownerName,
        phone: data.phone,
        status: data.status,
      }
    })

    return successResponse(updated)
  } catch (error) {
    return serverErrorResponse(error)
  }
}

export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()
    if (!hasPermission(user, PERMISSIONS.VEHICLES_MANAGE)) return forbiddenResponse()

    const { id } = await props.params
    await prisma.vehicle.update({
      where: { id },
      data: { status: 'INACTIVE', deletedAt: new Date() }
    })
    return successResponse({ deleted: true })
  } catch (error) {
    return serverErrorResponse(error)
  }
}
