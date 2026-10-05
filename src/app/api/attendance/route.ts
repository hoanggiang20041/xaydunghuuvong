import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { vnToday } from '@/lib/date-utils'
import { successResponse, unauthorizedResponse, forbiddenResponse, validationErrorResponse, serverErrorResponse } from '@/lib/api-response'

/** Chấm công online — chỉ Super Admin. Role được lấy từ session, không tin frontend. */
async function requireSuperAdmin() {
  const user = await getCurrentUser()
  if (!user) return { error: unauthorizedResponse() }
  if (!user.isSuperAdmin) return { error: forbiddenResponse('Chỉ Super Admin được dùng chấm công') }
  return { user }
}

const DAY = /^\d{4}-\d{2}-\d{2}$/
const MONTH = /^\d{4}-\d{2}$/
const MAX_AMOUNT = 1_000_000_000

function validDay(d: unknown): d is string {
  if (typeof d !== 'string' || !DAY.test(d)) return false
  const t = new Date(d + 'T00:00:00Z')
  return !isNaN(t.getTime()) && t.toISOString().slice(0, 10) === d
}

async function monthData(userId: string, month: string) {
  const items = await prisma.attendance.findMany({
    where: { userId, date: { startsWith: month } },
    orderBy: { date: 'asc' },
    select: { date: true, amount: true, note: true },
  })
  const agg = await prisma.attendance.aggregate({
    where: { userId, date: { startsWith: month } },
    _sum: { amount: true },
    _count: true,
  })
  const last = await prisma.attendance.findFirst({ where: { userId }, orderBy: { updatedAt: 'desc' }, select: { amount: true } })
  return { month, today: vnToday(), items, total: agg._sum.amount ?? 0, days: agg._count, lastAmount: last?.amount ?? 0 }
}

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireSuperAdmin()
    if (error) return error
    const month = request.nextUrl.searchParams.get('month') || vnToday().slice(0, 7)
    if (!MONTH.test(month)) return validationErrorResponse('Tháng không hợp lệ')
    return successResponse(await monthData(user.id, month))
  } catch (e) {
    console.error('attendance GET', e)
    return serverErrorResponse()
  }
}

/** Điểm danh (hoặc sửa số tiền) cho 1 ngày — cho phép bù ngày trước, không cho ngày tương lai. */
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireSuperAdmin()
    if (error) return error
    const body = await request.json().catch(() => ({}))
    const { date } = body
    const amount = Math.round(Number(body.amount))
    const note = typeof body.note === 'string' ? body.note.trim().slice(0, 255) || null : null

    if (!validDay(date)) return validationErrorResponse('Ngày không hợp lệ')
    if (date > vnToday()) return validationErrorResponse('Không thể điểm danh ngày chưa tới')
    if (!Number.isFinite(amount) || amount < 0 || amount > MAX_AMOUNT) return validationErrorResponse('Số tiền không hợp lệ')

    await prisma.attendance.upsert({
      where: { userId_date: { userId: user.id, date } },
      create: { userId: user.id, date, amount, note },
      update: { amount, note },
    })
    return successResponse(await monthData(user.id, date.slice(0, 7)))
  } catch (e) {
    console.error('attendance POST', e)
    return serverErrorResponse()
  }
}

/** Huỷ điểm danh 1 ngày. */
export async function DELETE(request: NextRequest) {
  try {
    const { user, error } = await requireSuperAdmin()
    if (error) return error
    const date = request.nextUrl.searchParams.get('date')
    if (!validDay(date)) return validationErrorResponse('Ngày không hợp lệ')
    await prisma.attendance.deleteMany({ where: { userId: user.id, date } })
    return successResponse(await monthData(user.id, date.slice(0, 7)))
  } catch (e) {
    console.error('attendance DELETE', e)
    return serverErrorResponse()
  }
}
