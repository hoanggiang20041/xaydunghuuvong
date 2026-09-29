import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/permissions'
import { successResponse, unauthorizedResponse, forbiddenResponse, notFoundResponse, serverErrorResponse } from '@/lib/api-response'
import { hashPassword } from '@/lib/password'

export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()
    if (!hasPermission(user, PERMISSIONS.USERS_MANAGE)) return forbiddenResponse()

    const { id } = await props.params
    const data = await request.json()

    const existingUser = await prisma.user.findUnique({ where: { id } })
    if (!existingUser) return notFoundResponse('Không tìm thấy người dùng')

    const updateData: any = {
      username: data.username,
      fullName: data.fullName,
      email: data.email || null,
      isActive: data.isActive !== undefined ? data.isActive : existingUser.isActive,
    }

    if (data.password) {
      updateData.passwordHash = await hashPassword(data.password)
    }

    const updatedUser = await prisma.$transaction(async (tx) => {
      const u = await tx.user.update({
        where: { id },
        data: updateData,
      })

      if (data.roles && Array.isArray(data.roles)) {
        await tx.userRole.deleteMany({ where: { userId: id } })
        for (const roleName of data.roles) {
          const role = await tx.role.findUnique({ where: { name: roleName } })
          if (role) {
            await tx.userRole.create({
              data: { userId: id, roleId: role.id }
            })
          }
        }
      }
      return u
    })

    return successResponse(updatedUser)
  } catch (error) {
    return serverErrorResponse(error)
  }
}

export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()
    if (!hasPermission(user, PERMISSIONS.USERS_MANAGE)) return forbiddenResponse()

    const { id } = await props.params
    if (id === user.id) return serverErrorResponse(new Error('Không thể tự xóa tài khoản của mình'))

    await prisma.user.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date() }
    })
    return successResponse({ deleted: true })
  } catch (error) {
    return serverErrorResponse(error)
  }
}
