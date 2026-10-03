'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Eye, EyeOff, Loader2, AlertTriangle, CheckCircle2, Truck, ShieldCheck, ArrowRight } from 'lucide-react'

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
        setTimeout(() => window.location.href = '/dashboard', 500)
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
    <div className="min-h-screen flex bg-[#0f1b2d] overflow-hidden">
      
      {/* Left side: Premium Branding */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-16 relative">
        {/* Background decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-blue-900/20 blur-[120px]" />
          <div className="absolute top-[40%] -right-[10%] w-[60%] h-[60%] rounded-full bg-amber-600/10 blur-[100px]" />
          <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-[#0f1b2d] to-transparent z-10" />
        </div>

        <div className="relative z-20">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-xl shadow-amber-500/20 mb-8">
            <span className="text-3xl font-black text-[#0f1b2d]" style={{ fontFamily: 'Georgia, serif' }}>HV</span>
          </div>
          
          <h1 className="text-5xl font-bold text-white tracking-tight leading-[1.1] mb-6">
            Hệ thống<br />Quản lý Vận chuyển<br />
            <span className="text-amber-400">Chuyên nghiệp</span>
          </h1>
          <p className="text-lg text-slate-400 max-w-md leading-relaxed">
            Nền tảng quản lý xe công trình, theo dõi vật liệu, và tối ưu hóa vận hành dành riêng cho Công Ty TNHH Hữu Vọng.
          </p>
        </div>

        <div className="relative z-20 flex items-center gap-6">
          <div className="flex items-center gap-3 bg-white/5 backdrop-blur-md px-5 py-3 rounded-xl border border-white/10">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            <div>
              <div className="text-sm font-semibold text-white">Bảo mật cao</div>
              <div className="text-xs text-slate-400">Mã hóa dữ liệu 256-bit</div>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-white/5 backdrop-blur-md px-5 py-3 rounded-xl border border-white/10">
            <Truck className="w-6 h-6 text-blue-400" />
            <div>
              <div className="text-sm font-semibold text-white">Real-time</div>
              <div className="text-xs text-slate-400">Theo dõi thời gian thực</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side: Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 lg:p-24 bg-[#0a1120] relative border-l border-white/5">
        <div className="w-full max-w-[420px] relative z-20">
          
          {/* Mobile only logo */}
          <div className="lg:hidden text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-xl shadow-amber-500/20 mb-4">
              <span className="text-2xl font-black text-[#0f1b2d]" style={{ fontFamily: 'Georgia, serif' }}>HV</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">HỮU VỌNG</h1>
            <p className="text-sm text-slate-400">Quản lý Vận chuyển</p>
          </div>

          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-bold text-white mb-2">Đăng nhập</h2>
            <p className="text-slate-400">Nhập thông tin tài khoản của bạn để tiếp tục</p>
          </div>

          {error && (
            <div className="mb-6 flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-400 leading-relaxed">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Tên đăng nhập</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full px-4 py-3.5 bg-[#132035] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all font-medium"
                placeholder="Nhập username hoặc email"
                autoComplete="username"
                disabled={loading || success}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-slate-300">Mật khẩu</label>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-3.5 bg-[#132035] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all font-medium pr-12"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={loading || success}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || success}
              className="relative w-full h-14 mt-8 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-900 font-bold rounded-xl transition-all duration-300 flex items-center justify-center overflow-hidden shadow-lg shadow-amber-500/20 disabled:opacity-80 disabled:cursor-not-allowed group"
            >
              {success ? (
                <span className="flex items-center gap-2 text-white">
                  <CheckCircle2 className="w-5 h-5" /> Đăng nhập thành công
                </span>
              ) : loading ? (
                <Loader2 className="w-6 h-6 animate-spin text-slate-900" />
              ) : (
                <span className="flex items-center gap-2 text-lg">
                  Đăng nhập <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              )}
            </button>
          </form>
          
          <div className="mt-8 text-center text-xs text-slate-500">
            Phát triển bởi Nguyễn Hoàng Giang
          </div>
        </div>
      </div>
    </div>
  )
}
