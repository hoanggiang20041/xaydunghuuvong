import { successResponse } from '@/lib/api-response'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return successResponse({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
    })
  } catch {
    return Response.json(
      { success: false, status: 'unhealthy', database: 'disconnected' },
      { status: 503 }
    )
  }
}
