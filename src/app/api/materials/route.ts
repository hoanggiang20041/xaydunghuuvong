import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { PERMISSIONS } from '@/lib/permissions'
import { auditAction } from '@/lib/audit'
import { successResponse, unauthorizedResponse, forbiddenResponse, validationErrorResponse, serverErrorResponse, parsePagination } from '@/lib/api-response'
import { createMaterialSchema } from '@/lib/validation'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()
    if (!hasPermission(user, PERMISSIONS.MATERIALS_VIEW)) return forbiddenResponse()

    const { searchParams } = request.nextUrl
    const { page, pageSize, skip } = parsePagination(searchParams)

    const [materials, total] = await Promise.all([
      prisma.material.findMany({ orderBy: { createdAt: 'asc' }, skip, take: pageSize }),
      prisma.material.count(),
    ])

    return successResponse(materials, { page, pageSize, total, totalPages: Math.ceil(total / pageSize) })
  } catch (error) {
    console.error('List materials error:', error)
    return serverErrorResponse()
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()
    if (!hasPermission(user, PERMISSIONS.MATERIALS_MANAGE)) return forbiddenResponse()

    const body = await request.json()
    const parsed = createMaterialSchema.safeParse(body)
    if (!parsed.success) return validationErrorResponse(parsed.error.issues[0].message)

    const existing = await prisma.material.findUnique({ where: { code: parsed.data.code } })
    if (existing) return validationErrorResponse('Mã vật liệu đã tồn tại')

    const material = await prisma.material.create({ data: parsed.data })
    await auditAction(user, 'CREATE', 'materials', material.id, null, { code: material.code, name: material.name })
    return successResponse(material)
  } catch (error) {
    console.error('Create material error:', error)
    return serverErrorResponse()
  }
}

