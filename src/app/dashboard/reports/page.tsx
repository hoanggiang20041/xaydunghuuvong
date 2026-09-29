'use client'
import { BarChart3 } from 'lucide-react'

export default function ReportsPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2"><BarChart3 className="w-5 h-5 text-amber-500" /><h1 className="text-xl font-bold text-slate-900 dark:text-white">Báo cáo</h1></div>
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 text-center">
        <BarChart3 className="w-12 h-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
        <h3 className="font-medium text-slate-700 dark:text-slate-300 mb-2">Báo cáo vận chuyển</h3>
        <p className="text-sm text-slate-500">Xem dashboard để xem thống kê tổng hợp. Chức năng xuất Excel/PDF sẽ được cập nhật.</p>
      </div>
    </div>
  )
}
