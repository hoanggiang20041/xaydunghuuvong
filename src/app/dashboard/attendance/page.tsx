'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { toast } from '@/components/ui/toaster'
import { Modal } from '@/components/ui/modal'
import { CalendarCheck, ChevronLeft, ChevronRight, Loader2, Lock, Trash2, Wallet } from 'lucide-react'

interface Item { date: string; amount: number; note: string | null }
interface MonthData { month: string; today: string; items: Item[]; total: number; days: number; lastAmount: number }

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
const DAY_NAMES = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy']
const QUICK = [200_000, 300_000, 400_000, 500_000]

const vnd = (n: number) => n.toLocaleString('vi-VN')
const shortVnd = (n: number) => {
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(n % 1_000_000 ? 1 : 0)}tr`
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`
  return String(n)
}
const todayVN = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date())
const shiftMonth = (m: string, d: number) => {
  const [y, mo] = m.split('-').map(Number)
  const t = new Date(Date.UTC(y, mo - 1 + d, 1))
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}`
}

/** Số tiền chạy lên/xuống mượt khi tổng thay đổi. */
function useCountUp(value: number, ms = 600) {
  const [shown, setShown] = useState(value)
  const from = useRef(value)
  useEffect(() => {
    const start = performance.now()
    const a = from.current
    let raf = 0
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / ms)
      const v = Math.round(a + (value - a) * (1 - Math.pow(1 - p, 3)))
      setShown(v)
      from.current = v
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, ms])
  return shown
}

function RedX({ animate }: { animate: boolean }) {
  return (
    <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {animate && <span className="att-ring absolute w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-red-500" />}
      <svg viewBox="0 0 32 32" className={`w-8 h-8 sm:w-10 sm:h-10 drop-shadow-[0_0_6px_rgba(239,68,68,0.55)] ${animate ? 'att-x-anim' : ''}`}>
        <line x1="7" y1="7" x2="25" y2="25" stroke="#ef4444" strokeWidth="4.5" strokeLinecap="round" />
        <line x1="25" y1="7" x2="7" y2="25" stroke="#ef4444" strokeWidth="4.5" strokeLinecap="round" />
      </svg>
    </span>
  )
}

export default function AttendancePage() {
  const { user } = useAuth()
  const [month, setMonth] = useState(() => todayVN().slice(0, 7))
  const [data, setData] = useState<MonthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)
  const [amountText, setAmountText] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [justMarked, setJustMarked] = useState<string | null>(null)
  const [bump, setBump] = useState(0)
  const busy = useRef(false)

  const load = useCallback(async (m: string, quiet = false) => {
    if (!quiet) setLoading(true)
    try {
      const res = await fetch(`/api/attendance?month=${m}`, { cache: 'no-store' })
      const json = await res.json()
      if (json.success && !busy.current) setData(json.data)
      else if (!json.success && !quiet) toast({ title: json.error?.message || json.message || 'Không tải được dữ liệu', variant: 'error' })
    } catch {
      if (!quiet) toast({ title: 'Lỗi kết nối', variant: 'error' })
    } finally {
      if (!quiet) setLoading(false)
    }
  }, [])

  useEffect(() => { if (user?.isSuperAdmin) load(month) }, [month, user?.isSuperAdmin, load])

  // Đồng bộ thời gian thực giữa các thiết bị: tải lại khi quay lại tab + mỗi 20 giây
  useEffect(() => {
    if (!user?.isSuperAdmin) return
    const refresh = () => { if (document.visibilityState === 'visible') load(month, true) }
    const id = setInterval(refresh, 20_000)
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('focus', refresh)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', refresh); window.removeEventListener('focus', refresh) }
  }, [month, user?.isSuperAdmin, load])

  const today = data?.today || todayVN()
  const byDate = useMemo(() => new Map((data?.items || []).map(i => [i.date, i])), [data])
  const total = useCountUp(data?.total ?? 0)

  const cells = useMemo(() => {
    const [y, m] = month.split('-').map(Number)
    const lead = (new Date(y, m - 1, 1).getDay() + 6) % 7
    const count = new Date(y, m, 0).getDate()
    return [
      ...Array.from({ length: lead }, () => null),
      ...Array.from({ length: count }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`),
    ]
  }, [month])

  const openDay = (date: string) => {
    if (date > today) { toast({ title: 'Chưa tới ngày này', variant: 'error' }); return }
    const it = byDate.get(date)
    const amt = it?.amount ?? data?.lastAmount ?? 0
    setAmountText(amt ? vnd(amt) : '')
    setNote(it?.note || '')
    setSelected(date)
  }

  /** Cập nhật ngay trên giao diện, sau đó đồng bộ với server (lỗi thì hoàn tác). */
  const applyLocal = (date: string, item: Item | null) => {
    setData(d => {
      if (!d) return d
      const items = d.items.filter(i => i.date !== date)
      if (item) items.push(item)
      items.sort((a, b) => a.date.localeCompare(b.date))
      return { ...d, items, total: items.reduce((s, i) => s + i.amount, 0), days: items.length, lastAmount: item?.amount ?? d.lastAmount }
    })
    setBump(b => b + 1)
  }

  const save = async () => {
    if (!selected || saving) return
    const amount = Number(amountText.replace(/\D/g, '')) || 0
    const date = selected
    const wasMarked = byDate.has(date)
    const prev = data
    setSaving(true); busy.current = true
    applyLocal(date, { date, amount, note: note.trim() || null })
    if (!wasMarked) { setJustMarked(date); setTimeout(() => setJustMarked(j => (j === date ? null : j)), 1200) }
    setSelected(null)
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, amount, note }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error?.message || json.message || 'Không lưu được')
      if (json.data.month === month) setData(json.data)
      toast({ title: wasMarked ? 'Đã cập nhật' : `Đã điểm danh ${date.slice(8)}/${date.slice(5, 7)}`, variant: 'success' })
    } catch (e: any) {
      setData(prev)
      toast({ title: e?.message || 'Lỗi kết nối', variant: 'error' })
    } finally {
      setSaving(false); busy.current = false
    }
  }

  const remove = async () => {
    if (!selected || saving) return
    const date = selected
    const prev = data
    setSaving(true); busy.current = true
    applyLocal(date, null)
    setSelected(null)
    try {
      const res = await fetch(`/api/attendance?date=${date}`, { method: 'DELETE' })
      const json = await res.json()
      if (!json.success) throw new Error(json.error?.message || json.message || 'Không huỷ được')
      if (json.data.month === month) setData(json.data)
      toast({ title: 'Đã huỷ điểm danh', variant: 'success' })
    } catch (e: any) {
      setData(prev)
      toast({ title: e?.message || 'Lỗi kết nối', variant: 'error' })
    } finally {
      setSaving(false); busy.current = false
    }
  }

  if (user && !user.isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Lock className="w-10 h-10 text-slate-500 mb-3" />
        <p className="text-slate-300 font-medium">Chỉ Super Admin được dùng tính năng chấm công.</p>
      </div>
    )
  }

  const [y, m] = month.split('-')
  const isCurrentMonth = month === today.slice(0, 7)
  const todayMarked = byDate.has(today)
  const sel = selected ? new Date(selected + 'T00:00:00') : null

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarCheck className="w-5 h-5 text-amber-500" />
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Chấm công</h1>
        </div>
        {isCurrentMonth && !todayMarked && !loading && (
          <button onClick={() => openDay(today)} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition">
            Điểm danh hôm nay
          </button>
        )}
      </div>

      {/* Tổng tiền tháng */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <button onClick={() => setMonth(shiftMonth(month, -1))} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition" aria-label="Tháng trước">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <div className="text-base sm:text-lg font-bold text-white">Tháng {Number(m)}/{y}</div>
            {!isCurrentMonth && (
              <button onClick={() => setMonth(today.slice(0, 7))} className="text-xs text-amber-400 hover:underline">Về tháng này</button>
            )}
          </div>
          <button
            onClick={() => setMonth(shiftMonth(month, 1))}
            disabled={isCurrentMonth}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition disabled:opacity-30 disabled:hover:bg-transparent"
            aria-label="Tháng sau"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <div className="mt-3 flex items-end justify-between gap-3 border-t border-slate-800 pt-3">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400"><Wallet className="w-3.5 h-3.5" /> Tổng tiền tháng</div>
            <div key={bump} className={`text-2xl sm:text-3xl font-bold text-amber-400 tabular-nums ${bump ? 'att-bump' : ''}`}>
              {vnd(total)} <span className="text-base font-semibold text-amber-500/80">đ</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-400">Ngày công</div>
            <div className="text-2xl sm:text-3xl font-bold text-white tabular-nums">{data?.days ?? 0}</div>
          </div>
        </div>
      </div>

      {/* Lịch */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-2 sm:p-4">
        <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-1">
          {WEEKDAYS.map(d => (
            <div key={d} className={`text-center text-[11px] sm:text-xs font-semibold py-1 ${d === 'CN' ? 'text-red-400' : 'text-slate-500'}`}>{d}</div>
          ))}
        </div>
        {loading && !data ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : (
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {cells.map((date, i) => {
              if (!date) return <div key={`e${i}`} />
              const it = byDate.get(date)
              const future = date > today
              const isToday = date === today
              const sunday = i % 7 === 6
              return (
                <button
                  key={date}
                  onClick={() => openDay(date)}
                  disabled={future}
                  className={`relative aspect-square sm:aspect-[5/4] rounded-lg border text-left transition select-none
                    ${it ? 'border-red-500/40 bg-red-500/[0.07] hover:bg-red-500/[0.12]' : 'border-slate-800 bg-slate-800/40 hover:border-slate-600 hover:bg-slate-800'}
                    ${isToday ? 'ring-2 ring-amber-500 ring-offset-1 ring-offset-slate-900' : ''}
                    ${future ? 'opacity-30 cursor-not-allowed hover:bg-slate-800/40 hover:border-slate-800' : 'active:scale-95'}`}
                >
                  <span className={`absolute top-1 left-1.5 text-[11px] sm:text-sm font-semibold ${isToday ? 'text-amber-400' : sunday ? 'text-red-400' : 'text-slate-300'}`}>
                    {Number(date.slice(8))}
                  </span>
                  {it && <RedX animate={justMarked === date} />}
                  {it && it.amount > 0 && (
                    <span className="absolute bottom-0.5 inset-x-0 text-center text-[9px] sm:text-xs font-semibold text-amber-300 tabular-nums">
                      {shortVnd(it.amount)}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
        <p className="mt-3 text-[11px] sm:text-xs text-slate-500 text-center">
          Bấm vào ngày để điểm danh. Ngày trước chưa điểm danh có thể bấm để điểm danh bù.
        </p>
      </div>

      {/* Hộp điểm danh */}
      <Modal
        isOpen={!!selected}
        onClose={() => !saving && setSelected(null)}
        title={sel ? `${DAY_NAMES[sel.getDay()]}, ${selected!.slice(8)}/${selected!.slice(5, 7)}/${selected!.slice(0, 4)}` : ''}
      >
        <div className="space-y-4">
          {selected && selected < today && !byDate.has(selected) && (
            <div className="text-xs px-3 py-2 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20">Điểm danh bù cho ngày đã qua</div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Số tiền (đ)</label>
            <input
              autoFocus
              inputMode="numeric"
              value={amountText}
              onChange={e => { const n = e.target.value.replace(/\D/g, '').slice(0, 10); setAmountText(n ? vnd(Number(n)) : '') }}
              onKeyDown={e => { if (e.key === 'Enter') save() }}
              placeholder="0"
              className="w-full px-3 py-3 bg-slate-800 border border-slate-700 rounded-lg text-2xl font-bold text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {[...new Set([data?.lastAmount || 0, ...QUICK])].filter(Boolean).map(v => (
                <button key={v} type="button" onClick={() => setAmountText(vnd(v))}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-700 text-slate-300 hover:border-amber-500 hover:text-amber-300 transition">
                  {shortVnd(v)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Ghi chú</label>
            <input
              value={note}
              onChange={e => setNote(e.target.value.slice(0, 255))}
              placeholder="Không bắt buộc"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>
          <div className="flex gap-2 pt-1">
            {selected && byDate.has(selected) && (
              <button onClick={remove} disabled={saving}
                className="px-4 py-3 rounded-lg border border-slate-700 text-slate-300 hover:text-red-400 hover:border-red-500/50 transition flex items-center gap-1.5 text-sm font-medium">
                <Trash2 className="w-4 h-4" /> Huỷ
              </button>
            )}
            <button onClick={save} disabled={saving}
              className="flex-1 py-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold transition disabled:opacity-60 flex items-center justify-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {selected && byDate.has(selected) ? 'Lưu thay đổi' : 'Điểm danh'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
