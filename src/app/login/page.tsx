'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Eye, EyeOff, Loader2, AlertTriangle, ShieldCheck, CheckCircle2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

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
        setSuccess(true)
        login(data.data.user)
        setTimeout(() => router.push('/dashboard'), 800)
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
      {/* Top bar */}
      <div className="w-full h-1.5" style={{ background: 'linear-gradient(90deg, #1a365d 0%, #2c5282 50%, #d69e2e 100%)' }} />
      
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Company Logo - text based, NOT icon */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-lg mb-4 shadow-lg" style={{ background: 'linear-gradient(135deg, #1a365d 0%, #2c5282 100%)' }}>
              <span className="text-2xl font-black text-white tracking-tighter" style={{ fontFamily: 'Georgia, serif' }}>HV</span>
            </div>
            <h1 className="text-lg font-bold uppercase tracking-wide" style={{ color: '#1a365d' }}>
              Công Ty TNHH Hữu Vọng
            </h1>
            <h2 className="text-base font-semibold mt-1" style={{ color: '#d69e2e' }}>
              Hệ thống Quản lý Vận chuyển
            </h2>
            <p className="text-xs mt-1" style={{ color: '#718096' }}>
              Phần mềm quản lý xe ra/vào công trình
            </p>
          </div>

          {/* Success animation overlay */}
          {success && (
            <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(26,54,93,0.85)' }}>
              <div className="text-center animate-bounce-in">
                <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: '#38a169', animation: 'scale-check 0.5s ease-out' }}>
                  <CheckCircle2 className="w-10 h-10 text-white" />
                </div>
                <p className="text-white text-lg font-bold">Đăng nhập thành công!</p>
                <p className="text-white/70 text-sm mt-1">Đang chuyển hướng...</p>
              </div>
            </div>
          )}

          {/* Login Card */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-6 py-3.5 border-b border-gray-100" style={{ background: '#fafbfc' }}>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" style={{ color: '#1a365d' }} />
                <span className="text-sm font-semibold" style={{ color: '#1a365d' }}>ĐĂNG NHẬP HỆ THỐNG</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {error && (
                <div className="flex items-start gap-2 p-3 rounded border animate-shake" style={{ background: '#fff5f5', borderColor: '#feb2b2' }}>
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
                disabled={loading || success}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded font-semibold text-white text-sm transition-all disabled:opacity-60"
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
              © 2024 Công Ty TNHH Hữu Vọng — Phát triển bởi Nguyễn Hoàng Giang
            </p>
            <p className="text-xs" style={{ color: '#cbd5e0' }}>
              Phiên bản 1.0 | Bảo mật bởi JWT + RBAC
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes scale-check {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-bounce-in {
          animation: bounce-in 0.6s ease-out;
        }
        @keyframes bounce-in {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.05); }
          70% { transform: scale(0.95); }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }
      `}</style>
    </div>
  )
}
