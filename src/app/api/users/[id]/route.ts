import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { PERMISSIONS } from '@/lib/permissions'
import { auditAction } from '@/lib/audit'
import { successResponse, unauthorizedResponse, forbiddenResponse, validationErrorResponse, notFoundResponse, serverErrorResponse } from '@/lib/api-response'
import { updateUserSchema } from '@/lib/validation'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()
    if (!hasPermission(user, PERMISSIONS.USERS_VIEW)) return forbiddenResponse()

    const { id } = await params

    const targetUser = await prisma.user.findUnique({
      where: { id, deletedAt: null },
      select: {
        id: true, username: true, email: true, fullName: true, phone: true,
        isActive: true, isLocked: true, twoFactorEnabled: true,
        lastLoginAt: true, createdAt: true,
        userRoles: { include: { role: { select: { id: true, name: true, displayName: true } } } },
        userProjects: { include: { project: { select: { id: true, name: true, code: true } } } },
      },
    })

    if (!targetUser) return notFoundResponse('Người dùng không tồn tại')

    return successResponse(targetUser)
  } catch (error) {
    console.error('Get user error:', error)
    return serverErrorResponse()
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()
    if (!hasPermission(user, PERMISSIONS.USERS_UPDATE)) return forbiddenResponse()

    const { id } = await params

    const targetUser = await prisma.user.findUnique({ where: { id, deletedAt: null } })
    if (!targetUser) return notFoundResponse('Người dùng không tồn tại')

    // Prevent modifying super admin unless the current user is a super admin
    if (targetUser.username === 'superadmin' && !user.isSuperAdmin) {
      return forbiddenResponse('Không thể sửa thông tin Super Admin')
    }

    const body = await request.json()
    const parsed = updateUserSchema.safeParse(body)
    if (!parsed.success) return validationErrorResponse(parsed.error.issues[0].message)

    if (parsed.data.email && parsed.data.email !== targetUser.email) {
      const existingEmail = await prisma.user.findFirst({
        where: { email: parsed.data.email, id: { not: id } },
      })
      if (existingEmail) return validationErrorResponse('Email đã tồn tại')
    }

    let roleIdsToAssign: string[] = []
    if (parsed.data.roles) {
      const dbRoles = await prisma.role.findMany({
        where: { name: { in: parsed.data.roles.map(r => r.toUpperCase()) } }
      })

      if (!user.isSuperAdmin) {
        const superAdminRole = dbRoles.find(r => r.name === 'SUPER_ADMIN')
        if (superAdminRole) {
          return forbiddenResponse('Không thể gán quyền Super Admin')
        }
      }
      roleIdsToAssign = dbRoles.map(r => r.id)
    }

    const updatedUser = await prisma.$transaction(async (tx) => {
      const updateData: any = { ...parsed.data }
      delete updateData.roles
      delete updateData.projectIds
      
      const updated = await tx.user.update({
        where: { id },
        data: updateData,
      })

      if (parsed.data.roles) {
        await tx.userRole.deleteMany({ where: { userId: id } })
        for (const roleId of roleIdsToAssign) {
          await tx.userRole.create({
            data: { userId: id, roleId, assignedBy: user.id },
          })
        }
      }

      if (parsed.data.projectIds) {
        await tx.userProject.deleteMany({ where: { userId: id } })
        for (const projectId of parsed.data.projectIds) {
          await tx.userProject.create({
            data: { userId: id, projectId, assignedBy: user.id },
          })
        }
      }

      return updated
    })

    await auditAction(user, 'UPDATE', 'users', id, targetUser, updatedUser)
    
    return successResponse(updatedUser)
  } catch (error) {
    console.error('Update user error:', error)
    return serverErrorResponse()
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()
    if (!hasPermission(user, PERMISSIONS.USERS_DELETE)) return forbiddenResponse()

    const { id } = await params

    const targetUser = await prisma.user.findUnique({ where: { id, deletedAt: null } })
    if (!targetUser) return notFoundResponse('Người dùng không tồn tại')

    if (targetUser.username === 'superadmin') {
      return forbiddenResponse('Không thể xóa Super Admin')
    }
    
    if (targetUser.id === user.id) {
      return forbiddenResponse('Không thể tự xóa tài khoản của mình')
    }

    const deletedUser = await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    })

    await auditAction(user, 'DELETE', 'users', id, targetUser, { deletedAt: deletedUser.deletedAt })
    
    return successResponse({ success: true })
  } catch (error) {
    console.error('Delete user error:', error)
    return serverErrorResponse()
  }
}
