import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { hasPermission, getAccessibleProjectIds } from '@/lib/permissions'
import { PERMISSIONS } from '@/lib/permissions'
import { successResponse, unauthorizedResponse, forbiddenResponse, serverErrorResponse } from '@/lib/api-response'
import { resolvePeriod, vnStart, vnEnd } from '@/lib/date-utils'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()

    const { searchParams } = request.nextUrl
    const period = searchParams.get('period') || 'today'
    const dateParam = searchParams.get('date') || ''
    const projectId = searchParams.get('projectId') || ''

    // Calculate date range (Vietnam time)
    const customStart = searchParams.get('startDate')
    const customEnd = searchParams.get('endDate')
    const resolved = resolvePeriod(period, dateParam)
    const range = {
      from: customStart || resolved.from,
      to: customEnd || resolved.to,
    }
    const dateStart = vnStart(range.from)
    const dateEnd = vnEnd(range.to)

    // Build scope filter
    const accessibleProjects = getAccessibleProjectIds(user)
    const scopeFilter: Record<string, unknown> = { deletedAt: null }
    
    if (accessibleProjects !== null) {
      scopeFilter.projectId = { in: accessibleProjects }
    }
    if (projectId) {
      scopeFilter.projectId = projectId
    }

    const dateFilter = {
      ...scopeFilter,
      createdAt: { gte: dateStart, lte: dateEnd },
    }

    // Query all stats in parallel
    const [
      totalTrips,
      checkedInCount,
      completedCount,
      cancelledCount,
      onsiteCount,
      materialVolumes,
      totalVolume,
    ] = await Promise.all([
      // Total trips in period
      prisma.trip.count({ where: dateFilter as any }),
      
      // Checked in today
      prisma.trip.count({
        where: { ...dateFilter, checkInAt: { not: null } } as any,
      }),
      
      // Completed
      prisma.trip.count({
        where: { ...dateFilter, status: 'COMPLETED' } as any,
      }),
      
      // Cancelled
      prisma.trip.count({
        where: { ...dateFilter, status: 'CANCELLED' } as any,
      }),
      
      // Currently on-site (regardless of date filter)
      prisma.trip.count({
        where: {
          ...scopeFilter,
          status: { in: ['CHECKED_IN', 'IN_PROGRESS'] },
        } as any,
      }),
      
      // Volume by material
      prisma.trip.groupBy({
        by: ['materialId'],
        where: {
          ...dateFilter,
          status: { in: ['COMPLETED', 'CHECKED_OUT'] },
        } as any,
        _sum: { actualVolume: true, expectedVolume: true, volumeM3: true },
        _count: true,
      }),
      
      // Total volume
      prisma.trip.aggregate({
        where: {
          ...dateFilter,
          status: { in: ['COMPLETED', 'CHECKED_OUT'] },
        } as any,
        _sum: { actualVolume: true, expectedVolume: true, volumeM3: true },
      }),
    ])

    // Get material names
    const materialIds = materialVolumes.map(mv => mv.materialId)
    const materials = await prisma.material.findMany({
      where: { id: { in: materialIds } },
      select: { id: true, name: true, code: true, unit: true },
    })

    const materialMap = new Map(materials.map(m => [m.id, m]))

    const volumeByMaterial = materialVolumes.map(mv => {
      const mat = materialMap.get(mv.materialId) || { name: 'Unknown', unit: 'm³' }
      return {
        name: mat.name,
        total: Number(mv._sum.actualVolume || mv._sum.expectedVolume || 0),
        volumeM3: Number(mv._sum.volumeM3 || 0),
        unit: mat.unit,
      }
    })

    return successResponse({
      totalTrips,
      completedTrips: completedCount,
      onsiteVehicles: onsiteCount,
      totalVolume: Number(totalVolume._sum.actualVolume || totalVolume._sum.expectedVolume || 0),
      totalVolumeM3: Number(totalVolume._sum.volumeM3 || 0),
      todayTrips: checkedInCount,
      volumeByMaterial,
      range,
    })
  } catch (error) {
    console.error('Dashboard stats error:', error)
    return serverErrorResponse()
  }
}
