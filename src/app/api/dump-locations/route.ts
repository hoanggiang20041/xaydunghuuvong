import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { PERMISSIONS } from '@/lib/permissions'
import { auditAction } from '@/lib/audit'
import { successResponse, unauthorizedResponse, forbiddenResponse, validationErrorResponse, serverErrorResponse, parsePagination } from '@/lib/api-response'
import { createLocationSchema } from '@/lib/validation'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()
    if (!hasPermission(user, PERMISSIONS.LOCATIONS_VIEW)) return forbiddenResponse()

    const { searchParams } = request.nextUrl
    const { page, pageSize, skip } = parsePagination(searchParams)
    const search = searchParams.get('search') || ''

    const where: Record<string, unknown> = { deletedAt: null }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [locations, total] = await Promise.all([
      prisma.dumpLocation.findMany({ where: where as any, orderBy: { createdAt: 'desc' }, skip, take: pageSize }),
      prisma.dumpLocation.count({ where: where as any }),
    ])

    return successResponse(locations, { page, pageSize, total, totalPages: Math.ceil(total / pageSize) })
  } catch (error) {
    console.error('List dump locations error:', error)
    return serverErrorResponse()
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()
    if (!hasPermission(user, PERMISSIONS.LOCATIONS_MANAGE)) return forbiddenResponse()

    const body = await request.json()
    const parsed = createLocationSchema.safeParse(body)
    if (!parsed.success) return validationErrorResponse(parsed.error.issues[0].message)

    const location = await prisma.dumpLocation.create({
      data: { ...parsed.data, createdById: user.id },
    })

    await auditAction(user, 'CREATE', 'dump_locations', location.id, null, { name: location.name })
    return successResponse(location)
  } catch (error) {
    console.error('Create dump location error:', error)
    return serverErrorResponse()
  }
}

