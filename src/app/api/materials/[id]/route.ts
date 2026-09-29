import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { PERMISSIONS } from '@/lib/permissions'
import { auditAction } from '@/lib/audit'
import { successResponse, unauthorizedResponse, forbiddenResponse, validationErrorResponse, notFoundResponse, serverErrorResponse } from '@/lib/api-response'
import { updateMaterialSchema } from '@/lib/validation'

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()
    if (!hasPermission(user, PERMISSIONS.MATERIALS_VIEW)) return forbiddenResponse()

    const { id } = await props.params

    const material = await prisma.material.findUnique({
      where: { id },
    })

    if (!material) return notFoundResponse('Vật liệu không tồn tại')

    return successResponse(material)
  } catch (error) {
    console.error('Get material error:', error)
    return serverErrorResponse()
  }
}

export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()
    if (!hasPermission(user, PERMISSIONS.MATERIALS_MANAGE)) return forbiddenResponse()

    const { id } = await props.params

    const existingMaterial = await prisma.material.findUnique({ where: { id } })
    if (!existingMaterial) return notFoundResponse('Vật liệu không tồn tại')

    const body = await request.json()
    const parsed = updateMaterialSchema.safeParse(body)
    if (!parsed.success) return validationErrorResponse(parsed.error.issues[0].message)

    if (parsed.data.code && parsed.data.code !== existingMaterial.code) {
      const codeExists = await prisma.material.findFirst({
        where: { code: parsed.data.code, id: { not: id } },
      })
      if (codeExists) return validationErrorResponse('Mã vật liệu đã tồn tại')
    }

    const updatedMaterial = await prisma.material.update({
      where: { id },
      data: parsed.data,
    })

    await auditAction(user, 'UPDATE', 'materials', id, existingMaterial, updatedMaterial)
    return successResponse(updatedMaterial)
  } catch (error) {
    console.error('Update material error:', error)
    return serverErrorResponse()
  }
}

export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()
    if (!hasPermission(user, PERMISSIONS.MATERIALS_MANAGE)) return forbiddenResponse()

    const { id } = await props.params

    const existingMaterial = await prisma.material.findUnique({ where: { id } })
    if (!existingMaterial) return notFoundResponse('Vật liệu không tồn tại')

    const deletedMaterial = await prisma.material.update({
      where: { id },
      data: { status: 'INACTIVE' },
    })

    await auditAction(user, 'DELETE', 'materials', id, existingMaterial, { status: 'INACTIVE' })
    return successResponse({ success: true })
  } catch (error) {
    console.error('Delete material error:', error)
    return serverErrorResponse()
  }
}
