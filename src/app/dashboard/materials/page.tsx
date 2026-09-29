'use client'
import { useState, useEffect } from 'react'
import { toast } from '@/components/ui/toaster'
import { Package, Loader2 } from 'lucide-react'

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    fetch('/api/materials?pageSize=100').then(r => r.json()).then(d => { if (d.success) setMaterials(d.data || []) }).catch(() => toast({ title: 'Lỗi', variant: 'error' })).finally(() => setLoading(false))
  }, [])
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2"><Package className="w-5 h-5 text-amber-500" /><h1 className="text-xl font-bold text-slate-900 dark:text-white">Vật liệu</h1></div>
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {loading ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div> : (
          <table className="w-full text-sm"><thead className="bg-slate-50 dark:bg-slate-800/50"><tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider"><th className="px-4 py-3">Mã</th><th className="px-4 py-3">Tên</th><th className="px-4 py-3">Đơn vị</th><th className="px-4 py-3">Trạng thái</th></tr></thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">{materials.map((m: any) => (<tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30"><td className="px-4 py-3 font-mono font-semibold text-slate-900 dark:text-white">{m.code}</td><td className="px-4 py-3">{m.name}</td><td className="px-4 py-3 text-slate-500">{m.unit}</td><td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${m.status === 'ACTIVE' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-gray-100 text-gray-800'}`}>{m.status === 'ACTIVE' ? 'Hoạt động' : 'Ngưng'}</span></td></tr>))}</tbody></table>
        )}
      </div>
    </div>
  )
}
