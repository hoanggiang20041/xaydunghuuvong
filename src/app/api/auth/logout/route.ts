import { clearAuthCookies, getCurrentUser } from '@/lib/auth'
import { successResponse, serverErrorResponse } from '@/lib/api-response'
import { createAuditLog } from '@/lib/audit'

export async function POST() {
  try {
    const user = await getCurrentUser()
    
    if (user) {
      await createAuditLog({
        userId: user.id,
        username: user.username,
        action: 'LOGOUT',
        module: 'auth',
        result: 'SUCCESS',
      })
    }

    await clearAuthCookies()
    return successResponse({ message: 'Đăng xuất thành công' })
  } catch (error) {
    console.error('Logout error:', error)
    await clearAuthCookies()
    return serverErrorResponse()
  }
}
