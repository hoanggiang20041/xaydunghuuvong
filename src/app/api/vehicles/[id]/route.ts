import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { PERMISSIONS } from '@/lib/permissions'
import { auditAction } from '@/lib/audit'
import { successResponse, unauthorizedResponse, forbiddenResponse, validationErrorResponse, notFoundResponse, serverErrorResponse } from '@/lib/api-response'
import { updateVehicleSchema } from '@/lib/validation'
import { normalizePlateNumber } from '@/lib/plate-utils'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()
    if (!hasPermission(user, PERMISSIONS.VEHICLES_VIEW)) return forbiddenResponse()

    const { id } = await params

    const vehicle = await prisma.vehicle.findUnique({
      where: { id, deletedAt: null },
      include: {
        defaultDriver: { select: { id: true, fullName: true, phone: true } },
      },
    })

    if (!vehicle) return notFoundResponse('Xe không tồn tại')

    return successResponse(vehicle)
  } catch (error) {
    console.error('Get vehicle error:', error)
    return serverErrorResponse()
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()
    if (!hasPermission(user, PERMISSIONS.VEHICLES_UPDATE)) return forbiddenResponse()

    const { id } = await params

    const existingVehicle = await prisma.vehicle.findUnique({ where: { id, deletedAt: null } })
    if (!existingVehicle) return notFoundResponse('Xe không tồn tại')

    const body = await request.json()
    const parsed = updateVehicleSchema.safeParse(body)
    if (!parsed.success) return validationErrorResponse(parsed.error.issues[0].message)

    let normalizedPlate = existingVehicle.plateNumber
    if (parsed.data.plateNumber) {
      normalizedPlate = normalizePlateNumber(parsed.data.plateNumber)
      if (normalizedPlate !== existingVehicle.plateNumber) {
        const plateExists = await prisma.vehicle.findFirst({
          where: { plateNumber: normalizedPlate, id: { not: id } },
        })
        if (plateExists) return validationErrorResponse('Biển số xe đã tồn tại')
      }
    }

    const updatedVehicle = await prisma.vehicle.update({
      where: { id },
      data: {
        ...parsed.data,
        ...(parsed.data.plateNumber && { plateNumber: normalizedPlate }),
      },
    })

    await auditAction(user, 'UPDATE', 'vehicles', id, existingVehicle, updatedVehicle)
    return successResponse(updatedVehicle)
  } catch (error) {
    console.error('Update vehicle error:', error)
    return serverErrorResponse()
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()
    if (!hasPermission(user, PERMISSIONS.VEHICLES_UPDATE)) return forbiddenResponse()

    const { id } = await params

    const existingVehicle = await prisma.vehicle.findUnique({ where: { id, deletedAt: null } })
    if (!existingVehicle) return notFoundResponse('Xe không tồn tại')

    const deletedVehicle = await prisma.vehicle.update({
      where: { id },
      data: { deletedAt: new Date() },
    })

    await auditAction(user, 'DELETE', 'vehicles', id, existingVehicle, { deletedAt: deletedVehicle.deletedAt })
    return successResponse({ success: true })
  } catch (error) {
    console.error('Delete vehicle error:', error)
    return serverErrorResponse()
  }
}
