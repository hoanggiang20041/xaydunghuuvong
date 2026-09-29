import { prisma } from './prisma'
import { type AuthUser } from './auth'
import { headers } from 'next/headers'

interface AuditLogInput {
  userId?: string | null
  username: string
  action: string
  module: string
  recordId?: string | null
  oldValues?: Record<string, unknown> | null
  newValues?: Record<string, unknown> | null
  result?: string
}

export async function createAuditLog(input: AuditLogInput) {
  try {
    const headersList = await headers()
    const ipAddress = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() 
      || headersList.get('x-real-ip') 
      || 'unknown'
    const userAgent = headersList.get('user-agent') || 'unknown'

    await prisma.auditLog.create({
      data: {
        userId: input.userId,
        username: input.username,
        action: input.action,
        module: input.module,
        recordId: input.recordId,
        oldValues: input.oldValues ? (input.oldValues as object) : undefined,
        newValues: input.newValues ? (input.newValues as object) : undefined,
        ipAddress,
        userAgent,
        result: input.result || 'SUCCESS',
      },
    })
  } catch (error) {
    // Don't let audit log failures break the main flow
    console.error('Failed to create audit log:', error)
  }
}

export async function auditAction(
  user: AuthUser,
  action: string,
  module: string,
  recordId?: string | null,
  oldValues?: Record<string, unknown> | null,
  newValues?: Record<string, unknown> | null,
) {
  return createAuditLog({
    userId: user.id,
    username: user.username,
    action,
    module,
    recordId,
    oldValues,
    newValues,
  })
}

// Helper to compute changed fields
export function getChangedFields(
  oldObj: Record<string, unknown>,
  newObj: Record<string, unknown>,
  fields: string[]
): { oldValues: Record<string, unknown>; newValues: Record<string, unknown> } | null {
  const oldValues: Record<string, unknown> = {}
  const newValues: Record<string, unknown> = {}
  let hasChanges = false

  for (const field of fields) {
    const oldVal = oldObj[field]
    const newVal = newObj[field]
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      oldValues[field] = oldVal
      newValues[field] = newVal
      hasChanges = true
    }
  }

  return hasChanges ? { oldValues, newValues } : null
}
