'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { toast } from '@/components/ui/toaster'
import { 
  ArrowDownToLine, Search, Truck, Loader2, CheckCircle2, AlertTriangle, X, Camera
} from 'lucide-react'

export default function CheckInPage() {
  const router = useRouter()
  const { user } = useAuth()
  const plateRef = useRef<HTMLInputElement>(null)

  const [plateNumber, setPlateNumber] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [photo, setPhoto] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [selectedVehicle, setSelectedVehicle] = useState<any>(null)
  const [projects, setProjects] = useState<any[]>([])
  const [materials, setMaterials] = useState<any[]>([])
  const [drivers, setDrivers] = useState<any[]>([])
  const [pickupLocations, setPickupLocations] = useState<any[]>([])
  const [dumpLocations, setDumpLocations] = useState<any[]>([])

  const [formData, setFormData] = useState({
    projectId: '',
    driverId: '',
    materialId: '',
    expectedVolume: '',
    pickupLocationId: '',
    dumpLocationId: '',
    notes: '',
  })

  const [submitting, setSubmitting] = useState(false)
  const [duplicateWarning, setDuplicateWarning] = useState('')
  const [success, setSuccess] = useState(false)

  // Load reference data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [projRes, matRes, driverRes, pickupRes, dumpRes] = await Promise.all([
          fetch('/api/projects?pageSize=100'),
          fetch('/api/materials?pageSize=100'),
          fetch('/api/drivers?pageSize=100'),
          fetch('/api/pickup-locations?pageSize=100'),
          fetch('/api/dump-locations?pageSize=100'),
        ])
        
        const [projData, matData, driverData, pickupData, dumpData] = await Promise.all([
          projRes.json(), matRes.json(), driverRes.json(), pickupRes.json(), dumpRes.json(),
        ])

        if (projData.success) setProjects(projData.data || [])
        if (matData.success) setMaterials(matData.data || [])
        if (driverData.success) setDrivers(driverData.data || [])
        if (pickupData.success) setPickupLocations(pickupData.data || [])
        if (dumpData.success) setDumpLocations(dumpData.data || [])
      } catch (error) {
        console.error('Failed to load reference data:', error)
      }
    }
    loadData()
  }, [])

  // Search vehicle by plate
  useEffect(() => {
    if (plateNumber.length < 3) {
      setSearchResults([])
      return
    }

    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/vehicles/search?q=${encodeURIComponent(plateNumber)}`)
        const data = await res.json()
        if (data.success) {
          setSearchResults(data.data || [])
        }
      } catch (error) {
        console.error('Search failed:', error)
      } finally {
        setSearching(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [plateNumber])

  const selectVehicle = (vehicle: any) => {
    setSelectedVehicle(vehicle)
    setPlateNumber(vehicle.plateNumber)
    setSearchResults([])
    if (vehicle.defaultDriver) {
      setFormData(prev => ({ ...prev, driverId: vehicle.defaultDriver.id }))
    }
  }

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const MAX_WIDTH = 800
        const scaleSize = MAX_WIDTH / img.width
        canvas.width = MAX_WIDTH
        canvas.height = img.height * scaleSize
        const ctx = canvas.getContext('2d')
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height)
        setPhoto(canvas.toDataURL('image/jpeg', 0.7))
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedVehicle && !plateNumber) return

    setSubmitting(true)
    setDuplicateWarning('')

    try {
      const payload = {
        vehicleId: selectedVehicle?.id,
        projectId: formData.projectId,
        driverId: formData.driverId,
        materialId: formData.materialId,
        expectedVolume: formData.expectedVolume ? parseFloat(formData.expectedVolume) : null,
        pickupLocationId: formData.pickupLocationId || null,
        dumpLocationId: formData.dumpLocationId || null,
        notes: formData.notes || null,
        checkInPhotoUrl: photo || null,
      }

      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (data.success) {
        setSuccess(true)
        toast({ title: 'Xe vào thành công!', description: `${plateNumber} đã được ghi nhận`, variant: 'success' })
        
        // Reset form after 2 seconds
        setTimeout(() => {
          setSuccess(false)
          setPlateNumber('')
          setSelectedVehicle(null)
          setFormData({
            projectId: formData.projectId, // Keep project selected
            driverId: '',
            materialId: '',
            expectedVolume: '',
            pickupLocationId: '',
            dumpLocationId: '',
            notes: '',
          })
          setPhoto(null)
          plateRef.current?.focus()
        }, 2000)
      } else {
        if (data.error?.code === 'VEHICLE_HAS_OPEN_TRIP') {
          setDuplicateWarning(data.error.message)
        } else {
          toast({ title: 'Lỗi', description: data.error?.message || 'Không thể tạo chuyến', variant: 'error' })
        }
      }
    } catch (error) {
      toast({ title: 'Lỗi kết nối', description: 'Vui lòng thử lại', variant: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="max-w-lg mx-auto mt-12 text-center">
        <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4 animate-in zoom-in duration-300">
          <CheckCircle2 className="w-10 h-10 text-emerald-500" />
        </div>
        <h2 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">XE VÀO THÀNH CÔNG!</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-1 font-mono text-xl">{plateNumber}</p>
        <p className="text-sm text-slate-400">Trạng thái: ĐANG Ở CÔNG TRÌNH</p>
        <p className="text-xs text-slate-400 mt-4">Chuẩn bị cho xe tiếp theo...</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center text-white">
          <ArrowDownToLine className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">XE VÀO CÔNG TRÌNH</h1>
          <p className="text-sm text-slate-500">Ghi nhận xe vào · Giờ vào tự động</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Photo Capture */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Ảnh xe vào *</label>
          {photo ? (
            <div className="relative rounded-xl overflow-hidden border-2 border-emerald-500 aspect-video bg-black flex items-center justify-center mb-4">
              <img src={photo} alt="Captured" className="w-full h-full object-cover" />
              <button 
                type="button"
                onClick={() => setPhoto(null)} 
                className="absolute top-2 right-2 bg-black/60 text-white px-3 py-1 rounded-full text-sm hover:bg-black"
              >
                Chụp lại
              </button>
            </div>
          ) : (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl aspect-video flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors mb-4"
            >
              <Camera className="w-10 h-10 text-slate-400" />
              <span className="text-slate-500 font-medium text-sm">Bấm để chụp ảnh</span>
              <input 
                type="file" 
                accept="image/*" 
                capture="environment" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handlePhotoCapture}
              />
            </div>
          )}
        </div>

        {/* Plate Number Search */}
        <div className="relative">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Biển số xe *
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              ref={plateRef}
              type="text"
              value={plateNumber}
              onChange={(e) => {
                const val = e.target.value.toUpperCase()
                setPlateNumber(val)
                setSelectedVehicle(null)
                setDuplicateWarning('')
              }}
              placeholder="Nhập biển số xe (VD: 51D12345)"
              className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-xl text-lg font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition"
              autoFocus
              autoComplete="off"
            />
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 animate-spin" />
            )}
          </div>

          {/* Search results dropdown */}
          {searchResults.length > 0 && !selectedVehicle && (
            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg max-h-48 overflow-y-auto">
              {searchResults.map((v: any) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => selectVehicle(v)}
                  className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition border-b border-slate-100 dark:border-slate-700 last:border-0"
                >
                  <span className="font-mono font-semibold text-slate-900 dark:text-white">{v.plateNumber}</span>
                  <span className="text-sm text-slate-500 ml-2">
                    {v.vehicleType} · {v.ownerName || 'N/A'}
                  </span>
                  {v.defaultDriver && (
                    <span className="text-xs text-slate-400 block">
                      Tài xế: {v.defaultDriver.fullName}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {selectedVehicle && (
            <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
              <Truck className="w-4 h-4 text-emerald-600" />
              <span className="text-sm text-emerald-700 dark:text-emerald-300">
                {selectedVehicle.vehicleType} · {selectedVehicle.ownerName || ''}
              </span>
              <button type="button" onClick={() => { setSelectedVehicle(null); setPlateNumber('') }} className="ml-auto">
                <X className="w-4 h-4 text-slate-400 hover:text-red-500" />
              </button>
            </div>
          )}
        </div>

        {/* Duplicate warning */}
        {duplicateWarning && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-xl text-amber-800 dark:text-amber-300 text-sm">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>{duplicateWarning}</span>
          </div>
        )}

        {/* Project */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Công trình *</label>
          <select
            value={formData.projectId}
            onChange={(e) => setFormData(prev => ({ ...prev, projectId: e.target.value }))}
            className="w-full px-4 py-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition"
            required
          >
            <option value="">Chọn công trình</option>
            {projects.map((p: any) => (
              <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
            ))}
          </select>
        </div>

        {/* Driver */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tài xế *</label>
          <select
            value={formData.driverId}
            onChange={(e) => setFormData(prev => ({ ...prev, driverId: e.target.value }))}
            className="w-full px-4 py-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition"
            required
          >
            <option value="">Chọn tài xế</option>
            {drivers.map((d: any) => (
              <option key={d.id} value={d.id}>{d.fullName} {d.phone ? `(${d.phone})` : ''}</option>
            ))}
          </select>
        </div>

        {/* Material + Volume in row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Vật liệu *</label>
            <select
              value={formData.materialId}
              onChange={(e) => setFormData(prev => ({ ...prev, materialId: e.target.value }))}
              className="w-full px-4 py-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition"
              required
            >
              <option value="">Chọn vật liệu</option>
              {materials.map((m: any) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Số m³</label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={formData.expectedVolume}
              onChange={(e) => setFormData(prev => ({ ...prev, expectedVolume: e.target.value }))}
              placeholder="VD: 12"
              className="w-full px-4 py-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition"
            />
          </div>
        </div>

        {/* Pickup + Dump locations */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Điểm lấy hàng</label>
            <select
              value={formData.pickupLocationId}
              onChange={(e) => setFormData(prev => ({ ...prev, pickupLocationId: e.target.value }))}
              className="w-full px-4 py-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition"
            >
              <option value="">Chọn điểm lấy</option>
              {pickupLocations.map((l: any) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Điểm đổ hàng</label>
            <select
              value={formData.dumpLocationId}
              onChange={(e) => setFormData(prev => ({ ...prev, dumpLocationId: e.target.value }))}
              className="w-full px-4 py-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition"
            >
              <option value="">Chọn điểm đổ</option>
              {dumpLocations.map((l: any) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Ghi chú</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Ghi chú thêm (tùy chọn)"
            rows={2}
            className="w-full px-4 py-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition resize-none"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting || !selectedVehicle || !formData.projectId || !formData.driverId || !formData.materialId}
          className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white font-bold text-lg rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 disabled:shadow-none"
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Đang xử lý...
            </>
          ) : (
            <>
              <ArrowDownToLine className="w-5 h-5" />
              GHI NHẬN XE VÀO
            </>
          )}
        </button>
      </form>
    </div>
  )
}
