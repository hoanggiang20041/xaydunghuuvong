import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/permissions'
import { successResponse, unauthorizedResponse, forbiddenResponse, notFoundResponse, serverErrorResponse } from '@/lib/api-response'

export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()
    if (!hasPermission(user, PERMISSIONS.DRIVERS_MANAGE)) return forbiddenResponse()

    const { id } = await props.params
    const data = await request.json()

    const existing = await prisma.driver.findUnique({ where: { id } })
    if (!existing) return notFoundResponse('Không tìm thấy tài xế')

    const updated = await prisma.driver.update({
      where: { id },
      data: {
        fullName: data.fullName || existing.fullName,
        phone: data.phone,
        idNumber: data.idNumber,
        company: data.company,
        status: data.status,
        notes: data.notes,
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
    if (!hasPermission(user, PERMISSIONS.DRIVERS_MANAGE)) return forbiddenResponse()

    const { id } = await props.params
    await prisma.driver.update({
      where: { id },
      data: { status: 'INACTIVE', deletedAt: new Date() }
    })
    return successResponse({ deleted: true })
  } catch (error) {
    return serverErrorResponse(error)
  }
}
