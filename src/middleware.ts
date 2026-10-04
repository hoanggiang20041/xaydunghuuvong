import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify, SignJWT } from 'jose'

// Inline JWT verification for Edge runtime (can't use Prisma here)
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-dev-secret-change-in-production-min32chars')
const JWT_REFRESH_SECRET = new TextEncoder().encode(process.env.JWT_REFRESH_SECRET || 'fallback-dev-refresh-secret')

// Paths that don't require authentication
const PUBLIC_PATHS = ['/login', '/forgot-password', '/reset-password']
const PUBLIC_API_PATHS = ['/api/auth/login', '/api/auth/forgot-password', '/api/auth/reset-password', '/api/health']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public paths
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p)) || PUBLIC_API_PATHS.some(p => pathname.startsWith(p))) {
    return addSecurityHeaders(NextResponse.next())
  }

  // Allow static files and Next.js internals
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname === '/') {
    return addSecurityHeaders(NextResponse.next())
  }

  const accessToken = request.cookies.get('access_token')?.value
  const refreshToken = request.cookies.get('refresh_token')?.value

  // Check authentication for API routes
  if (pathname.startsWith('/api/')) {
    if (!accessToken && !refreshToken) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập' } },
        { status: 401 }
      )
    }

    // Try access token first
    if (accessToken) {
      try {
        await jwtVerify(accessToken, JWT_SECRET)
        return addSecurityHeaders(NextResponse.next())
      } catch {
        // Access token expired, fall through to refresh
      }
    }

    // Try refresh token
    if (refreshToken) {
      try {
        const { payload } = await jwtVerify(refreshToken, JWT_REFRESH_SECRET)
        
        // Create new access token
        const newAccessToken = await new SignJWT({ 
          userId: payload.userId, 
          username: payload.username, 
          email: payload.email 
        })
          .setProtectedHeader({ alg: 'HS256' })
          .setIssuedAt()
          .setExpirationTime('1h')
          .sign(JWT_SECRET)
        
        const response = NextResponse.next()
        response.cookies.set('access_token', newAccessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60,
        })
        return addSecurityHeaders(response)
      } catch {
        // Refresh token also invalid
      }
    }
    
    return NextResponse.json(
      { success: false, error: { code: 'TOKEN_EXPIRED', message: 'Phiên đăng nhập hết hạn' } },
      { status: 401 }
    )
  }

  // Check authentication for dashboard pages
  if (pathname.startsWith('/dashboard')) {
    if (!accessToken && !refreshToken) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Try access token
    if (accessToken) {
      try {
        await jwtVerify(accessToken, JWT_SECRET)
        return addSecurityHeaders(NextResponse.next())
      } catch {
        // expired, try refresh below
      }
    }

    // Try refresh token — FIX: was missing this refresh logic for dashboard pages
    if (refreshToken) {
      try {
        const { payload } = await jwtVerify(refreshToken, JWT_REFRESH_SECRET)
        
        const newAccessToken = await new SignJWT({ 
          userId: payload.userId, 
          username: payload.username, 
          email: payload.email 
        })
          .setProtectedHeader({ alg: 'HS256' })
          .setIssuedAt()
          .setExpirationTime('1h')
          .sign(JWT_SECRET)
        
        const response = NextResponse.next()
        response.cookies.set('access_token', newAccessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60,
        })
        return addSecurityHeaders(response)
      } catch {
        // Both tokens invalid — redirect to login
        return NextResponse.redirect(new URL('/login', request.url))
      }
    }

    return NextResponse.redirect(new URL('/login', request.url))
  }

  return addSecurityHeaders(NextResponse.next())
}

function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=()')
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
