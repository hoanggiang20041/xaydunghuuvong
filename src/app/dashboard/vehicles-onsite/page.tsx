'use client'
import { useState, useEffect } from 'react'
import { toast } from '@/components/ui/toaster'
import { MapPin, Search, Loader2, Clock, ArrowUpFromLine } from 'lucide-react'
import Link from 'next/link'

export default function VehiclesOnsitePage() {
  const [trips, setTrips] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const params = new URLSearchParams()
        if (search) params.set('search', search)
        const res = await fetch(`/api/trips/onsite?${params}`)
        const data = await res.json()
        if (data.success) setTrips(data.data || [])
      } catch { toast({ title: 'Lỗi', variant: 'error' }) }
      finally { setLoading(false) }
    }
    fetch_()
    const interval = setInterval(fetch_, 10000)
    return () => clearInterval(interval)
  }, [search])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><MapPin className="w-5 h-5 text-amber-500" /><h1 className="text-xl font-bold text-slate-900 dark:text-white">🚛 Xe đang ở công trình</h1><span className="px-2 py-0.5 bg-amber-500 text-white rounded-full text-xs font-bold">{trips.length}</span></div>
        <Link href="/dashboard/trips/check-out" className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition flex items-center gap-1"><ArrowUpFromLine className="w-4 h-4" />Xe ra</Link>
      </div>
      <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input value={search} onChange={e => setSearch(e.target.value.toUpperCase())} placeholder="Tìm biển số..." className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50" /></div>
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {loading ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div> : trips.length === 0 ? <div className="text-center py-12 text-slate-500">Không có xe nào ở công trình</div> : (
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 dark:bg-slate-800/50"><tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider"><th className="px-4 py-3">Biển số</th><th className="px-4 py-3">Tài xế</th><th className="px-4 py-3 hidden sm:table-cell">Vật liệu</th><th className="px-4 py-3">m³</th><th className="px-4 py-3 hidden md:table-cell">Giờ vào</th><th className="px-4 py-3 hidden lg:table-cell">Điểm đổ</th><th className="px-4 py-3 hidden lg:table-cell">Công trình</th></tr></thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">{trips.map((t: any) => (<tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30"><td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white">{t.vehicle?.plateNumber}</td><td className="px-4 py-3 text-slate-600 dark:text-slate-300">{t.driver?.fullName}</td><td className="px-4 py-3 hidden sm:table-cell"><span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-xs">{t.material?.name}</span></td><td className="px-4 py-3 font-medium">{Number(t.expectedVolume || 0)}</td><td className="px-4 py-3 hidden md:table-cell text-slate-500 text-xs"><Clock className="w-3 h-3 inline mr-1" />{t.checkInAt ? new Date(t.checkInAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}</td><td className="px-4 py-3 hidden lg:table-cell text-slate-500 text-xs">{t.dumpLocation?.name || '-'}</td><td className="px-4 py-3 hidden lg:table-cell text-slate-500 text-xs">{t.project?.name || '-'}</td></tr>))}</tbody></table></div>
        )}
      </div>
    </div>
  )
}
