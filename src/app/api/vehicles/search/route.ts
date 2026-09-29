import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { PERMISSIONS } from '@/lib/permissions'
import { successResponse, unauthorizedResponse, forbiddenResponse, serverErrorResponse } from '@/lib/api-response'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()
    if (!hasPermission(user, PERMISSIONS.VEHICLES_VIEW)) return forbiddenResponse()

    const q = request.nextUrl.searchParams.get('q') || ''
    if (q.length < 2) return successResponse([])

    const vehicles = await prisma.vehicle.findMany({
      where: {
        plateNumber: { contains: q, mode: 'insensitive' },
        status: 'ACTIVE',
        deletedAt: null,
      },
      include: {
        defaultDriver: { select: { id: true, fullName: true, phone: true } },
      },
      take: 10,
      orderBy: { plateNumber: 'asc' },
    })

    return successResponse(vehicles)
  } catch (error) {
    console.error('Search vehicles error:', error)
    return serverErrorResponse()
  }
}
