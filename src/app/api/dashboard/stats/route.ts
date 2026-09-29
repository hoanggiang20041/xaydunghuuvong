import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { hasPermission, getAccessibleProjectIds } from '@/lib/permissions'
import { PERMISSIONS } from '@/lib/permissions'
import { successResponse, unauthorizedResponse, forbiddenResponse, serverErrorResponse } from '@/lib/api-response'
import { startOfDay, endOfDay } from '@/lib/date-utils'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()

    const { searchParams } = request.nextUrl
    const period = searchParams.get('period') || 'today'
    const projectId = searchParams.get('projectId') || ''

    // Calculate date range
    let dateStart: Date
    let dateEnd: Date = endOfDay()
    const now = new Date()

    switch (period) {
      case 'yesterday':
        const yesterday = new Date(now)
        yesterday.setDate(yesterday.getDate() - 1)
        dateStart = startOfDay(yesterday)
        dateEnd = endOfDay(yesterday)
        break
      case '7days':
        const weekAgo = new Date(now)
        weekAgo.setDate(weekAgo.getDate() - 7)
        dateStart = startOfDay(weekAgo)
        break
      case '30days':
        const monthAgo = new Date(now)
        monthAgo.setDate(monthAgo.getDate() - 30)
        dateStart = startOfDay(monthAgo)
        break
      case 'month':
        dateStart = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1))
        break
      case 'lastmonth':
        dateStart = startOfDay(new Date(now.getFullYear(), now.getMonth() - 1, 1))
        dateEnd = endOfDay(new Date(now.getFullYear(), now.getMonth(), 0))
        break
      default: // today
        dateStart = startOfDay()
        break
    }

    // Custom date range
    const customStart = searchParams.get('startDate')
    const customEnd = searchParams.get('endDate')
    if (customStart) dateStart = new Date(customStart)
    if (customEnd) dateEnd = new Date(customEnd + 'T23:59:59.999Z')

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
        _sum: { actualVolume: true, expectedVolume: true },
        _count: true,
      }),
      
      // Total volume
      prisma.trip.aggregate({
        where: {
          ...dateFilter,
          status: { in: ['COMPLETED', 'CHECKED_OUT'] },
        } as any,
        _sum: { actualVolume: true, expectedVolume: true },
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
        unit: mat.unit,
      }
    })

    return successResponse({
      totalTrips,
      completedTrips: completedCount,
      onsiteVehicles: onsiteCount,
      totalVolume: Number(totalVolume._sum.actualVolume || totalVolume._sum.expectedVolume || 0),
      todayTrips: checkedInCount,
      volumeByMaterial,
    })
  } catch (error) {
    console.error('Dashboard stats error:', error)
    return serverErrorResponse()
  }
}
