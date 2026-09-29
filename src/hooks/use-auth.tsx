'use client'

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'

interface UserRole {
  name: string
  displayName: string
}

interface AuthUser {
  id: string
  username: string
  email: string
  fullName: string
  phone?: string
  roles: string[]
  permissions: string[]
  isSuperAdmin: boolean
  projectIds: string[] | null
}

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  login: (user: AuthUser) => void
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  hasPermission: (permission: string) => boolean
  hasProjectAccess: (projectId: string) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me')
      if (res.ok) {
        const data = await res.json()
        if (data.success && data.data?.user) {
          setUser(data.data.user)
        } else {
          setUser(null)
        }
      } else {
        setUser(null)
      }
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshUser()
  }, [refreshUser])

  const login = (userData: AuthUser) => {
    setUser(userData)
  }

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // Ignore errors
    }
    setUser(null)
    window.location.href = '/login'
  }

  const hasPermission = (permission: string): boolean => {
    if (!user) return false
    if (user.isSuperAdmin) return true
    return user.permissions.includes(permission)
  }

  const hasProjectAccess = (projectId: string): boolean => {
    if (!user) return false
    if (user.isSuperAdmin || user.projectIds === null) return true
    return user.projectIds.includes(projectId)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser, hasPermission, hasProjectAccess }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
