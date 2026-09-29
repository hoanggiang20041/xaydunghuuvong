'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Building2, Eye, EyeOff, Loader2, AlertTriangle, ShieldCheck } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !password) { setError('Vui lòng nhập đầy đủ thông tin'); return }
    setError(''); setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (data.success) {
        login(data.data.user)
        router.push('/dashboard')
      } else {
        setError(data.error?.message || 'Đăng nhập thất bại')
      }
    } catch {
      setError('Không thể kết nối đến máy chủ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(180deg, #f7f8fa 0%, #edf2f7 100%)' }}>
      {/* Top navy bar */}
      <div className="w-full h-1.5" style={{ background: 'linear-gradient(90deg, #1a365d 0%, #2c5282 50%, #d69e2e 100%)' }} />
      
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Logo & Title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-lg mb-4" style={{ background: '#1a365d' }}>
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-xl font-bold" style={{ color: '#1a365d' }}>
              HỆ THỐNG QUẢN LÝ VẬN CHUYỂN
            </h1>
            <h2 className="text-lg font-semibold" style={{ color: '#d69e2e' }}>
              CÔNG TRÌNH XÂY DỰNG
            </h2>
            <p className="text-sm mt-1" style={{ color: '#718096' }}>
              Phần mềm quản lý xe ra/vào công trình
            </p>
          </div>

          {/* Login Card */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            {/* Card Header */}
            <div className="px-6 py-4 border-b border-gray-100" style={{ background: '#fafbfc' }}>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" style={{ color: '#1a365d' }} />
                <span className="text-sm font-semibold" style={{ color: '#1a365d' }}>ĐĂNG NHẬP HỆ THỐNG</span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {error && (
                <div className="flex items-start gap-2 p-3 rounded border" style={{ background: '#fff5f5', borderColor: '#feb2b2' }}>
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#e53e3e' }} />
                  <span className="text-sm" style={{ color: '#c53030' }}>{error}</span>
                </div>
              )}

              <div>
                <label className="form-label">Tên đăng nhập <span style={{ color: '#e53e3e' }}>*</span></label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Nhập tên đăng nhập"
                  className="form-input"
                  autoComplete="username"
                  autoFocus
                />
              </div>

              <div>
                <label className="form-label">Mật khẩu <span style={{ color: '#e53e3e' }}>*</span></label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Nhập mật khẩu"
                    className="form-input pr-10"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: '#a0aec0' }}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded font-semibold text-white text-sm transition disabled:opacity-60"
                style={{ background: loading ? '#4a5568' : '#1a365d' }}
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Đang xử lý...</>
                ) : (
                  'ĐĂNG NHẬP'
                )}
              </button>
            </form>
          </div>

          {/* Footer */}
          <div className="text-center mt-6 space-y-1">
            <p className="text-xs" style={{ color: '#a0aec0' }}>
              © 2024 Hệ thống Quản lý Vận chuyển Công trình
            </p>
            <p className="text-xs" style={{ color: '#cbd5e0' }}>
              Phiên bản 1.0 | Bảo mật bởi JWT + RBAC
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
