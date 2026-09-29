import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { hasPermission, getAccessibleProjectIds } from '@/lib/permissions'
import { PERMISSIONS } from '@/lib/permissions'
import { auditAction } from '@/lib/audit'
import { successResponse, unauthorizedResponse, forbiddenResponse, validationErrorResponse, notFoundResponse, serverErrorResponse } from '@/lib/api-response'
import { updateProjectSchema } from '@/lib/validation'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()
    if (!hasPermission(user, PERMISSIONS.PROJECTS_VIEW)) return forbiddenResponse()

    const { id } = await params
    const accessibleProjects = getAccessibleProjectIds(user)

    if (accessibleProjects !== null && !accessibleProjects.includes(id)) {
      return forbiddenResponse('Bạn không có quyền truy cập công trình này')
    }

    const project = await prisma.project.findUnique({
      where: { id, deletedAt: null },
      include: {
        manager: { select: { id: true, fullName: true } },
      },
    })

    if (!project) return notFoundResponse('Công trình không tồn tại')

    return successResponse(project)
  } catch (error) {
    console.error('Get project error:', error)
    return serverErrorResponse()
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()
    if (!hasPermission(user, PERMISSIONS.PROJECTS_UPDATE)) return forbiddenResponse()

    const { id } = await params
    const accessibleProjects = getAccessibleProjectIds(user)

    if (accessibleProjects !== null && !accessibleProjects.includes(id)) {
      return forbiddenResponse('Bạn không có quyền truy cập công trình này')
    }

    const existingProject = await prisma.project.findUnique({ where: { id, deletedAt: null } })
    if (!existingProject) return notFoundResponse('Công trình không tồn tại')

    const body = await request.json()
    const parsed = updateProjectSchema.safeParse(body)
    if (!parsed.success) return validationErrorResponse(parsed.error.issues[0].message)

    if (parsed.data.code && parsed.data.code !== existingProject.code) {
      const codeExists = await prisma.project.findFirst({
        where: { code: parsed.data.code, id: { not: id } },
      })
      if (codeExists) return validationErrorResponse('Mã công trình đã tồn tại')
    }

    const updateData: any = { ...parsed.data }
    if (parsed.data.startDate !== undefined) {
      updateData.startDate = parsed.data.startDate ? new Date(parsed.data.startDate) : null
    }
    if (parsed.data.endDate !== undefined) {
      updateData.endDate = parsed.data.endDate ? new Date(parsed.data.endDate) : null
    }

    const updatedProject = await prisma.project.update({
      where: { id },
      data: updateData,
    })

    await auditAction(user, 'UPDATE', 'projects', id, existingProject, updatedProject)
    return successResponse(updatedProject)
  } catch (error) {
    console.error('Update project error:', error)
    return serverErrorResponse()
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()
    if (!hasPermission(user, PERMISSIONS.PROJECTS_DELETE)) return forbiddenResponse()

    const { id } = await params
    const accessibleProjects = getAccessibleProjectIds(user)

    if (accessibleProjects !== null && !accessibleProjects.includes(id)) {
      return forbiddenResponse('Bạn không có quyền truy cập công trình này')
    }

    const existingProject = await prisma.project.findUnique({ where: { id, deletedAt: null } })
    if (!existingProject) return notFoundResponse('Công trình không tồn tại')

    const deletedProject = await prisma.project.update({
      where: { id },
      data: { deletedAt: new Date() },
    })

    await auditAction(user, 'DELETE', 'projects', id, existingProject, { deletedAt: deletedProject.deletedAt })
    return successResponse({ success: true })
  } catch (error) {
    console.error('Delete project error:', error)
    return serverErrorResponse()
  }
}
