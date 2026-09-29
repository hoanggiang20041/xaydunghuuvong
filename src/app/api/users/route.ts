import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { PERMISSIONS } from '@/lib/permissions'
import { auditAction } from '@/lib/audit'
import { hashPassword } from '@/lib/password'
import { successResponse, unauthorizedResponse, forbiddenResponse, validationErrorResponse, serverErrorResponse, parsePagination } from '@/lib/api-response'
import { createUserSchema } from '@/lib/validation'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()
    if (!hasPermission(user, PERMISSIONS.USERS_VIEW)) return forbiddenResponse()

    const { searchParams } = request.nextUrl
    const { page, pageSize, skip } = parsePagination(searchParams)
    const search = searchParams.get('search') || ''

    const where: Record<string, unknown> = { deletedAt: null }
    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { fullName: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: where as any,
        select: {
          id: true, username: true, email: true, fullName: true, phone: true,
          isActive: true, isLocked: true, twoFactorEnabled: true,
          lastLoginAt: true, createdAt: true,
          userRoles: { include: { role: { select: { name: true, displayName: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.user.count({ where: where as any }),
    ])

    return successResponse(users, { page, pageSize, total, totalPages: Math.ceil(total / pageSize) })
  } catch (error) {
    console.error('List users error:', error)
    return serverErrorResponse()
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()
    if (!hasPermission(user, PERMISSIONS.USERS_CREATE)) return forbiddenResponse()

    const body = await request.json()
    const parsed = createUserSchema.safeParse(body)
    if (!parsed.success) return validationErrorResponse(parsed.error.issues[0].message)

    // Check uniqueness
    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ username: parsed.data.username }, { email: parsed.data.email }] },
    })
    if (existingUser) return validationErrorResponse('Tên đăng nhập hoặc email đã tồn tại')

    // Prevent non-super-admin from assigning SUPER_ADMIN role
    if (!user.isSuperAdmin) {
      const superAdminRole = await prisma.role.findUnique({ where: { name: 'SUPER_ADMIN' } })
      if (superAdminRole && parsed.data.roleIds.includes(superAdminRole.id)) {
        return forbiddenResponse('Không thể gán quyền Super Admin')
      }
    }

    const passwordHash = await hashPassword(parsed.data.password)

    const newUser = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          username: parsed.data.username,
          email: parsed.data.email,
          passwordHash,
          fullName: parsed.data.fullName,
          phone: parsed.data.phone,
          createdById: user.id,
        },
      })

      // Assign roles
      for (const roleId of parsed.data.roleIds) {
        await tx.userRole.create({
          data: { userId: created.id, roleId, assignedBy: user.id },
        })
      }

      // Assign projects
      for (const projectId of parsed.data.projectIds) {
        await tx.userProject.create({
          data: { userId: created.id, projectId, assignedBy: user.id },
        })
      }

      return created
    })

    await auditAction(user, 'CREATE', 'users', newUser.id, null, { username: newUser.username, fullName: newUser.fullName })
    
    return successResponse({
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      fullName: newUser.fullName,
    })
  } catch (error) {
    console.error('Create user error:', error)
    return serverErrorResponse()
  }
}

