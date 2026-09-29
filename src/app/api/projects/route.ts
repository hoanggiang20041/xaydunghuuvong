import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { hasPermission, getAccessibleProjectIds } from '@/lib/permissions'
import { PERMISSIONS } from '@/lib/permissions'
import { auditAction } from '@/lib/audit'
import { successResponse, unauthorizedResponse, forbiddenResponse, validationErrorResponse, serverErrorResponse, parsePagination } from '@/lib/api-response'
import { createProjectSchema } from '@/lib/validation'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()
    if (!hasPermission(user, PERMISSIONS.PROJECTS_VIEW)) return forbiddenResponse()

    const { searchParams } = request.nextUrl
    const { page, pageSize, skip } = parsePagination(searchParams)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''

    const accessibleProjects = getAccessibleProjectIds(user)
    const where: Record<string, unknown> = { deletedAt: null }

    if (accessibleProjects !== null) {
      where.id = { in: accessibleProjects }
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (status) where.status = status

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where: where as any,
        include: {
          manager: { select: { id: true, fullName: true } },
          _count: { select: { trips: true, userProjects: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.project.count({ where: where as any }),
    ])

    return successResponse(projects, { page, pageSize, total, totalPages: Math.ceil(total / pageSize) })
  } catch (error) {
    console.error('List projects error:', error)
    return serverErrorResponse()
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()
    if (!hasPermission(user, PERMISSIONS.PROJECTS_CREATE)) return forbiddenResponse()

    const body = await request.json()
    const parsed = createProjectSchema.safeParse(body)
    if (!parsed.success) return validationErrorResponse(parsed.error.issues[0].message)

    const existing = await prisma.project.findUnique({ where: { code: parsed.data.code } })
    if (existing) return validationErrorResponse('Mã công trình đã tồn tại')

    const project = await prisma.project.create({
      data: {
        ...parsed.data,
        startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : null,
        endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
        createdById: user.id,
      },
    })

    await auditAction(user, 'CREATE', 'projects', project.id, null, { code: project.code, name: project.name })
    return successResponse(project)
  } catch (error) {
    console.error('Create project error:', error)
    return serverErrorResponse()
  }
}

