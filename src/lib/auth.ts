import { SignJWT, jwtVerify, type JWTPayload } from 'jose'
import { cookies } from 'next/headers'
import { prisma } from './prisma'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-dev-secret-change-in-production')
const JWT_REFRESH_SECRET = new TextEncoder().encode(process.env.JWT_REFRESH_SECRET || 'fallback-dev-refresh-secret')

const ACCESS_TOKEN_EXPIRY = process.env.JWT_EXPIRY || '15m'
const REFRESH_TOKEN_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d'

export interface TokenPayload extends JWTPayload {
  userId: string
  username: string
  email: string
}

export async function createAccessToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(JWT_SECRET)
}

export async function createRefreshToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .sign(JWT_REFRESH_SECRET)
}

export async function verifyAccessToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as TokenPayload
  } catch {
    return null
  }
}

export async function verifyRefreshToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_REFRESH_SECRET)
    return payload as TokenPayload
  } catch {
    return null
  }
}

export async function setAuthCookies(accessToken: string, refreshToken: string) {
  const cookieStore = await cookies()
  
  cookieStore.set('access_token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 15 * 60, // 15 minutes
  })

  cookieStore.set('refresh_token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  })
}

export async function clearAuthCookies() {
  const cookieStore = await cookies()
  cookieStore.delete('access_token')
  cookieStore.delete('refresh_token')
}

export async function getAuthFromCookies(): Promise<TokenPayload | null> {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('access_token')?.value
  
  if (!accessToken) return null
  
  return verifyAccessToken(accessToken)
}

export async function getCurrentUser() {
  const payload = await getAuthFromCookies()
  if (!payload) return null

  const user = await prisma.user.findUnique({
    where: { id: payload.userId, deletedAt: null, isActive: true },
    select: {
      id: true,
      username: true,
      email: true,
      fullName: true,
      phone: true,
      isActive: true,
      isLocked: true,
      twoFactorEnabled: true,
      lastLoginAt: true,
      createdAt: true,
      userRoles: {
        select: {
          role: {
            select: {
              id: true,
              name: true,
              displayName: true,
              rolePermissions: {
                select: {
                  permission: {
                    select: {
                      code: true,
                      module: true,
                      action: true,
                    }
                  }
                }
              }
            }
          }
        }
      },
      userProjects: {
        select: {
          projectId: true,
          project: {
            select: {
              id: true,
              code: true,
              name: true,
              status: true,
            }
          }
        }
      }
    }
  })

  if (!user || !user.isActive || user.isLocked) return null

  // Flatten permissions
  const permissions = new Set<string>()
  const roles: string[] = []
  
  for (const ur of user.userRoles) {
    roles.push(ur.role.name)
    for (const rp of ur.role.rolePermissions) {
      permissions.add(rp.permission.code)
    }
  }

  const isSuperAdmin = roles.includes('SUPER_ADMIN')
  const projectIds = isSuperAdmin 
    ? null // null means all projects
    : user.userProjects.map(up => up.projectId)

  return {
    ...user,
    roles,
    permissions: Array.from(permissions),
    isSuperAdmin,
    projectIds,
    userRoles: undefined,
    userProjects: undefined,
  }
}

export type AuthUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>
