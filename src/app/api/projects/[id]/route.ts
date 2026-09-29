import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/permissions'
import { successResponse, unauthorizedResponse, forbiddenResponse, notFoundResponse, serverErrorResponse } from '@/lib/api-response'

export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()
    if (!hasPermission(user, PERMISSIONS.PROJECTS_MANAGE)) return forbiddenResponse()

    const { id } = await props.params
    const data = await request.json()

    const existing = await prisma.project.findUnique({ where: { id } })
    if (!existing) return notFoundResponse('Không tìm thấy công trình')

    const updated = await prisma.project.update({
      where: { id },
      data: {
        code: data.code || existing.code,
        name: data.name || existing.name,
        address: data.address,
        investor: data.investor,
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
    if (!hasPermission(user, PERMISSIONS.PROJECTS_MANAGE)) return forbiddenResponse()

    const { id } = await props.params
    await prisma.project.update({
      where: { id },
      data: { status: 'SUSPENDED', deletedAt: new Date() }
    })
    return successResponse({ deleted: true })
  } catch (error) {
    return serverErrorResponse(error)
  }
}
