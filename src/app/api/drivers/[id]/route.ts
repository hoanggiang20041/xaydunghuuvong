import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { PERMISSIONS } from '@/lib/permissions'
import { auditAction } from '@/lib/audit'
import { successResponse, unauthorizedResponse, forbiddenResponse, validationErrorResponse, notFoundResponse, serverErrorResponse } from '@/lib/api-response'
import { updateDriverSchema } from '@/lib/validation'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()
    if (!hasPermission(user, PERMISSIONS.DRIVERS_VIEW)) return forbiddenResponse()

    const { id } = await params

    const driver = await prisma.driver.findUnique({
      where: { id, deletedAt: null },
    })

    if (!driver) return notFoundResponse('Tài xế không tồn tại')

    return successResponse(driver)
  } catch (error) {
    console.error('Get driver error:', error)
    return serverErrorResponse()
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()
    if (!hasPermission(user, PERMISSIONS.DRIVERS_UPDATE)) return forbiddenResponse()

    const { id } = await params

    const existingDriver = await prisma.driver.findUnique({ where: { id, deletedAt: null } })
    if (!existingDriver) return notFoundResponse('Tài xế không tồn tại')

    const body = await request.json()
    const parsed = updateDriverSchema.safeParse(body)
    if (!parsed.success) return validationErrorResponse(parsed.error.issues[0].message)

    const updatedDriver = await prisma.driver.update({
      where: { id },
      data: parsed.data,
    })

    await auditAction(user, 'UPDATE', 'drivers', id, existingDriver, updatedDriver)
    return successResponse(updatedDriver)
  } catch (error) {
    console.error('Update driver error:', error)
    return serverErrorResponse()
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()
    if (!hasPermission(user, PERMISSIONS.DRIVERS_UPDATE)) return forbiddenResponse()

    const { id } = await params

    const existingDriver = await prisma.driver.findUnique({ where: { id, deletedAt: null } })
    if (!existingDriver) return notFoundResponse('Tài xế không tồn tại')

    const deletedDriver = await prisma.driver.update({
      where: { id },
      data: { deletedAt: new Date() },
    })

    await auditAction(user, 'DELETE', 'drivers', id, existingDriver, { deletedAt: deletedDriver.deletedAt })
    return successResponse({ success: true })
  } catch (error) {
    console.error('Delete driver error:', error)
    return serverErrorResponse()
  }
}
