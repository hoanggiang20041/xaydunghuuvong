import { getCurrentUser } from '@/lib/auth'
import { successResponse, unauthorizedResponse, serverErrorResponse } from '@/lib/api-response'

export async function GET() {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return unauthorizedResponse()
    }

    return successResponse({ user })
  } catch (error) {
    console.error('Get current user error:', error)
    return serverErrorResponse()
  }
}
