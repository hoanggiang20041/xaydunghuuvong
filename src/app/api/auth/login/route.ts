import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword, hashPassword } from '@/lib/password'
import { createAccessToken, createRefreshToken, setAuthCookies, clearAuthCookies } from '@/lib/auth'
import { loginSchema } from '@/lib/validation'
import { successResponse, errorResponse, unauthorizedResponse, rateLimitResponse, serverErrorResponse } from '@/lib/api-response'
import { createAuditLog } from '@/lib/audit'
import { loginRateLimit } from '@/lib/rate-limit'
import { headers } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const headersList = await headers()
    const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() || headersList.get('x-real-ip') || 'unknown'
    
    const rateCheck = loginRateLimit(ip)
    if (!rateCheck.allowed) {
      return rateLimitResponse()
    }

    // Parse and validate body
    const body = await request.json()
    const parsed = loginSchema.safeParse(body)
    
    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', parsed.error.issues[0].message, 422)
    }

    const { username, password } = parsed.data

    // Find user
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: username },
          { email: username },
        ],
        deletedAt: null,
      },
    })

    if (!user) {
      // Log failed attempt
      await prisma.loginAttempt.create({
        data: { username, ipAddress: ip, success: false, failureReason: 'USER_NOT_FOUND' },
      })
      await createAuditLog({
        username,
        action: 'LOGIN_FAILED',
        module: 'auth',
        result: 'FAILURE',
      })
      return unauthorizedResponse('Tên đăng nhập hoặc mật khẩu không đúng')
    }

    // Check if locked
    if (user.isLocked) {
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000)
        await prisma.loginAttempt.create({
          data: { username, ipAddress: ip, success: false, failureReason: 'ACCOUNT_LOCKED', userId: user.id },
        })
        return errorResponse('ACCOUNT_LOCKED', `Tài khoản bị khóa. Vui lòng thử lại sau ${minutesLeft} phút.`, 423)
      } else {
        // Unlock if lockout period has passed
        await prisma.user.update({
          where: { id: user.id },
          data: { isLocked: false, lockedUntil: null, failedLoginCount: 0 },
        })
      }
    }

    // Check if active
    if (!user.isActive) {
      return errorResponse('ACCOUNT_DISABLED', 'Tài khoản đã bị vô hiệu hóa. Liên hệ quản trị viên.', 403)
    }

    // Verify password
    const passwordValid = await verifyPassword(password, user.passwordHash)
    
    if (!passwordValid) {
      const failedCount = user.failedLoginCount + 1
      const maxAttempts = parseInt(process.env.LOGIN_RATE_LIMIT_MAX || '10')
      const lockoutMinutes = parseInt(process.env.LOGIN_LOCKOUT_MINUTES || '30')

      const updateData: Record<string, unknown> = { failedLoginCount: failedCount }
      
      if (failedCount >= maxAttempts) {
        updateData.isLocked = true
        updateData.lockedUntil = new Date(Date.now() + lockoutMinutes * 60 * 1000)
      }

      await prisma.user.update({
        where: { id: user.id },
        data: updateData,
      })

      await prisma.loginAttempt.create({
        data: { username, ipAddress: ip, success: false, failureReason: 'WRONG_PASSWORD', userId: user.id },
      })

      await createAuditLog({
        userId: user.id,
        username: user.username,
        action: 'LOGIN_FAILED',
        module: 'auth',
        result: 'FAILURE',
      })

      if (failedCount >= maxAttempts) {
        return errorResponse('ACCOUNT_LOCKED', `Đăng nhập sai ${maxAttempts} lần. Tài khoản bị khóa ${lockoutMinutes} phút.`, 423)
      }

      return unauthorizedResponse(`Mật khẩu không đúng. Còn ${maxAttempts - failedCount} lần thử.`)
    }

    // Check 2FA
    if (user.twoFactorEnabled) {
      // For 2FA, return a temporary token that requires verification
      const tempToken = await createAccessToken({
        userId: user.id,
        username: user.username,
        email: user.email,
      })
      
      return successResponse({
        requiresTwoFactor: true,
        tempToken,
      })
    }

    // Success - create tokens
    const accessToken = await createAccessToken({
      userId: user.id,
      username: user.username,
      email: user.email,
    })

    const refreshToken = await createRefreshToken({
      userId: user.id,
      username: user.username,
      email: user.email,
    })

    // Set cookies
    await setAuthCookies(accessToken, refreshToken)

    // Update user
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        failedLoginCount: 0,
        isLocked: false,
        lockedUntil: null,
      },
    })

    // Log success
    await prisma.loginAttempt.create({
      data: { username, ipAddress: ip, success: true, userId: user.id },
    })

    await createAuditLog({
      userId: user.id,
      username: user.username,
      action: 'LOGIN_SUCCESS',
      module: 'auth',
      result: 'SUCCESS',
    })

    // Get user info (without sensitive data)
    const userRoles = await prisma.userRole.findMany({
      where: { userId: user.id },
      include: { role: { select: { name: true, displayName: true } } },
    })

    return successResponse({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        roles: userRoles.map(ur => ur.role),
      },
    })

  } catch (error) {
    console.error('Login error:', error)
    return serverErrorResponse()
  }
}

