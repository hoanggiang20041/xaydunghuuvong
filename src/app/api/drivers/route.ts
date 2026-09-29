import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { PERMISSIONS } from '@/lib/permissions'
import { auditAction } from '@/lib/audit'
import { successResponse, unauthorizedResponse, forbiddenResponse, validationErrorResponse, serverErrorResponse, parsePagination } from '@/lib/api-response'
import { createDriverSchema } from '@/lib/validation'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()
    if (!hasPermission(user, PERMISSIONS.DRIVERS_VIEW)) return forbiddenResponse()

    const { searchParams } = request.nextUrl
    const { page, pageSize, skip } = parsePagination(searchParams)
    const search = searchParams.get('search') || ''

    const where: Record<string, unknown> = { deletedAt: null }
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [drivers, total] = await Promise.all([
      prisma.driver.findMany({ where: where as any, orderBy: { createdAt: 'desc' }, skip, take: pageSize }),
      prisma.driver.count({ where: where as any }),
    ])

    return successResponse(drivers, { page, pageSize, total, totalPages: Math.ceil(total / pageSize) })
  } catch (error) {
    console.error('List drivers error:', error)
    return serverErrorResponse()
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()
    if (!hasPermission(user, PERMISSIONS.DRIVERS_CREATE)) return forbiddenResponse()

    const body = await request.json()
    const parsed = createDriverSchema.safeParse(body)
    if (!parsed.success) return validationErrorResponse(parsed.error.issues[0].message)

    const driver = await prisma.driver.create({
      data: { ...parsed.data, createdById: user.id },
    })

    await auditAction(user, 'CREATE', 'drivers', driver.id, null, { fullName: driver.fullName })
    return successResponse(driver)
  } catch (error) {
    console.error('Create driver error:', error)
    return serverErrorResponse()
  }
}

