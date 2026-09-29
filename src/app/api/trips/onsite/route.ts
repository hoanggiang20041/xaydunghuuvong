import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { hasPermission, getAccessibleProjectIds } from '@/lib/permissions'
import { PERMISSIONS } from '@/lib/permissions'
import { successResponse, unauthorizedResponse, forbiddenResponse, serverErrorResponse } from '@/lib/api-response'

// GET vehicles currently on-site (CHECKED_IN or IN_PROGRESS)
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()
    if (!hasPermission(user, PERMISSIONS.TRIPS_VIEW)) return forbiddenResponse()

    const { searchParams } = request.nextUrl
    const projectId = searchParams.get('projectId') || ''
    const search = searchParams.get('search') || ''

    const accessibleProjects = getAccessibleProjectIds(user)
    
    const where: Record<string, unknown> = {
      status: { in: ['CHECKED_IN', 'IN_PROGRESS'] },
      deletedAt: null,
    }

    if (accessibleProjects !== null) {
      where.projectId = { in: accessibleProjects }
    }

    if (projectId) {
      where.projectId = projectId
    }

    if (search) {
      where.OR = [
        { vehicle: { plateNumber: { contains: search, mode: 'insensitive' } } },
        { driver: { fullName: { contains: search, mode: 'insensitive' } } },
        { tripCode: { contains: search, mode: 'insensitive' } },
      ]
    }

    const trips = await prisma.trip.findMany({
      where: where as any,
      include: {
        project: { select: { id: true, code: true, name: true } },
        vehicle: { select: { id: true, plateNumber: true, vehicleType: true } },
        driver: { select: { id: true, fullName: true, phone: true } },
        material: { select: { id: true, name: true, unit: true } },
        dumpLocation: { select: { id: true, name: true } },
        createdBy: { select: { id: true, fullName: true } },
      },
      orderBy: { checkInAt: 'desc' },
    })

    return successResponse(trips)
  } catch (error) {
    console.error('Get onsite vehicles error:', error)
    return serverErrorResponse()
  }
}
