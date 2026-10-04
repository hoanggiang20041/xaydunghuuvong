import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { successResponse, unauthorizedResponse, serverErrorResponse } from '@/lib/api-response'
import { checkRateLimit } from '@/lib/rate-limit'
import { answerQuestion } from '@/lib/assistant/engine'
import { FIXED } from '@/lib/assistant/ai/response-generator'

/**
 * POST /api/assistant/query
 * Body: { question: string, context?: StructuredQuery }
 * Shared by voice (browser speech-to-text) and typed questions.
 * The user / role / project scope always come from the session — never from the client.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()

    const rl = checkRateLimit(`assistant:${user.id}`, { windowMs: 60_000, maxRequests: 30 })
    if (!rl.allowed) return successResponse({ status: 'RATE_LIMITED', answer: FIXED.rateLimited })

    const body = await request.json().catch(() => ({}))
    const question = typeof body?.question === 'string' ? body.question : ''
    const result = await answerQuestion(user, question, body?.context)
    return successResponse(result)
  } catch (error) {
    console.error('Assistant error:', error)
    return serverErrorResponse()
  }
}
