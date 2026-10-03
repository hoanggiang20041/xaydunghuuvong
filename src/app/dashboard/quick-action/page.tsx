'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from '@/components/ui/toaster'
import { Camera, ArrowRightToLine, ArrowLeftFromLine, Loader2, Search, Truck, CheckCircle2, ArrowLeft } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { normalizePlateNumber } from '@/lib/plate-utils'

// Map vehicle type to material name for auto-selection
const VEHICLE_TYPE_TO_MATERIAL: Record<string, string> = {
  'Xe chở Đất': 'Đất',
  'Xe chở Cát': 'Cát',
  'Xe chở Đá': 'Đá',
  'Xe chở Xà bần': 'Xà bần',
  'Xe chở VLXD': 'Vật liệu xây dựng',
  'Xe chở Khác': '',
}

export default function QuickActionPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [mode, setMode] = useState<'checkin' | 'checkout' | null>(null)
  
  const [plateNumber, setPlateNumber] = useState('')
  const [materials, setMaterials] = useState<any[]>([])
  const [selectedMaterial, setSelectedMaterial] = useState('')
  const [projects, setProjects] = useState<any[]>([])
  const [selectedProject, setSelectedProject] = useState('')
  
  // Volume calculator
  const [calcMode, setCalcMode] = useState<'dimensions' | 'manual'>('manual')
  const [lengthM, setLengthM] = useState('')
  const [widthM, setWidthM] = useState('')
  const [heightM, setHeightM] = useState('')
  const [manualVolume, setManualVolume] = useState('')
  
  // Quick search results
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null)
  
  // Checkout data
  const [activeTrip, setActiveTrip] = useState<any>(null)
  const [actualVolume, setActualVolume] = useState('')
  const [onsiteTrips, setOnsiteTrips] = useState<any[]>([])

  const [photo, setPhoto] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Computed volume
  const computedVolume = calcMode === 'dimensions' 
    ? (parseFloat(lengthM) > 0 && parseFloat(widthM) > 0 && parseFloat(heightM) > 0 
        ? parseFloat(lengthM) * parseFloat(widthM) * parseFloat(heightM) 
        : 0)
    : (parseFloat(manualVolume) > 0 ? parseFloat(manualVolume) : 0)

  useEffect(() => {
    fetch('/api/materials').then(res => res.json()).then(data => setMaterials(data.data || []))
    fetch('/api/projects').then(res => res.json()).then(data => {
      const projs = data.data || []
      setProjects(projs)
      if (projs.length === 1) setSelectedProject(projs[0].id)
    })
  }, [])

  // Fetch active trips when in checkout mode
  useEffect(() => {
    if (mode === 'checkout') {
      fetch(`/api/trips/onsite`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setOnsiteTrips(data.data || [])
          }
        })
    }
  }, [mode])

  // Search vehicles for checkin with debounce
  useEffect(() => {
    if (mode === 'checkin' && plateNumber.length > 1) {
      const delay = setTimeout(() => {
        fetch(`/api/vehicles/search?q=${plateNumber}`)
          .then(res => res.json())
          .then(data => {
            if (data.success && data.data.length > 0) {
              setSuggestions(data.data)
            } else {
              setSuggestions([])
            }
          })
      }, 400)
      return () => clearTimeout(delay)
    } else {
      setSuggestions([])
    }
  }, [plateNumber, mode])

  // Auto-select material when vehicle is selected (based on vehicle type)
  const handleSelectVehicle = useCallback((vehicle: any) => {
    setPlateNumber(vehicle.plateNumber)
    setSelectedVehicle(vehicle)
    setSuggestions([])
    
    // Auto-select material based on vehicle type
    const vehicleType = vehicle.vehicleType || ''
    const materialName = VEHICLE_TYPE_TO_MATERIAL[vehicleType]
    if (materialName && materials.length > 0) {
      const matchedMaterial = materials.find(m => m.name === materialName)
      if (matchedMaterial) {
        setSelectedMaterial(matchedMaterial.id)
      }
    }
  }, [materials])

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
        const base64 = canvas.toDataURL('image/jpeg', 0.7)
        setPhoto(base64)
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!plateNumber) return toast({ title: 'Vui lòng nhập biển số xe', variant: 'error' })
    if (!photo) return toast({ title: 'Bắt buộc phải chụp ảnh xe', variant: 'error' })

    setLoading(true)
    try {
      if (mode === 'checkin') {
        if (!selectedMaterial) throw new Error('Vui lòng chọn loại vật liệu')
        if (!selectedProject) throw new Error('Vui lòng chọn công trình')

        const volumeM3 = computedVolume > 0 ? Math.round(computedVolume * 100) / 100 : null

        const payload: any = {
          plateNumber: plateNumber,
          projectId: selectedProject,
          materialId: selectedMaterial,
          expectedVolume: volumeM3,
          checkInPhotoUrl: photo,
        }

        // Add dimension fields
        if (calcMode === 'dimensions' && volumeM3 && volumeM3 > 0) {
          payload.lengthM = parseFloat(lengthM)
          payload.widthM = parseFloat(widthM)
          payload.heightM = parseFloat(heightM)
          payload.volumeM3 = volumeM3
          payload.calculationMethod = 'dimensions'
        } else if (calcMode === 'manual' && volumeM3 && volumeM3 > 0) {
          payload.volumeM3 = volumeM3
          payload.calculationMethod = 'manual'
        }

        const res = await fetch('/api/trips', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        const data = await res.json()
        if (!data.success) throw new Error(data.error?.message || data.message || 'Lỗi hệ thống')
        
        toast({ title: 'XE VÀO THÀNH CÔNG', variant: 'success' })
      } else {
        if (!activeTrip) throw new Error('Vui lòng chọn chuyến xe đang ở trong công trình')

        const res = await fetch(`/api/trips/${activeTrip.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action: 'check_out',
            actualVolume: actualVolume ? parseFloat(actualVolume) : null,
            checkOutPhotoUrl: photo
          })
        })
        const data = await res.json()
        if (!data.success) throw new Error(data.error?.message || data.message || 'Lỗi hệ thống')
        
        toast({ title: 'XE RA THÀNH CÔNG', variant: 'success' })
      }

      resetForm()
    } catch (error: any) {
      toast({ title: 'Lỗi', description: error.message, variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setMode(null)
    setPlateNumber('')
    setPhoto(null)
    setSelectedMaterial('')
    setSelectedVehicle(null)
    setSuggestions([])
    setActiveTrip(null)
    setActualVolume('')
    setCalcMode('manual')
    setLengthM('')
    setWidthM('')
    setHeightM('')
    setManualVolume('')
  }

  // ==========================================
  // MODE SELECTION — Big, clear buttons
  // ==========================================
  if (!mode) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[75vh] gap-10 p-4">
        <div className="text-center">
          <Truck className="w-16 h-16 text-blue-400 mx-auto mb-4" />
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
            THAO TÁC NHANH
          </h1>
          <p className="text-lg text-slate-400 mt-2">Chọn thao tác bạn muốn thực hiện</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-2xl">
          <button 
            onClick={() => setMode('checkin')}
            className="flex flex-col items-center justify-center gap-5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl p-10 md:p-14 shadow-2xl shadow-blue-600/30 hover:shadow-blue-500/40 hover:-translate-y-1 transition-all active:translate-y-0 border-2 border-blue-500"
          >
            <ArrowRightToLine className="w-20 h-20 md:w-28 md:h-28" strokeWidth={1.5} />
            <span className="text-3xl md:text-4xl font-black tracking-wide">XE VÀO</span>
            <span className="text-sm text-blue-200">Ghi nhận xe vào công trình</span>
          </button>
          <button 
            onClick={() => setMode('checkout')}
            className="flex flex-col items-center justify-center gap-5 bg-amber-500 hover:bg-amber-400 text-white rounded-2xl p-10 md:p-14 shadow-2xl shadow-amber-500/30 hover:shadow-amber-400/40 hover:-translate-y-1 transition-all active:translate-y-0 border-2 border-amber-400"
          >
            <ArrowLeftFromLine className="w-20 h-20 md:w-28 md:h-28" strokeWidth={1.5} />
            <span className="text-3xl md:text-4xl font-black tracking-wide">XE RA</span>
            <span className="text-sm text-amber-200">Xác nhận xe rời công trình</span>
          </button>
        </div>
      </div>
    )
  }

  // ==========================================
  // FORM — Large inputs, clear labels, step by step
  // ==========================================
  return (
    <div className="max-w-lg mx-auto pb-8">
      {/* Header with back button */}
      <div className="flex items-center gap-3 mb-6">
        <button 
          onClick={resetForm} 
          className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h2 className={`text-2xl font-black flex items-center gap-2 ${mode === 'checkin' ? 'text-blue-400' : 'text-amber-400'}`}>
            {mode === 'checkin' ? <ArrowRightToLine className="w-7 h-7" /> : <ArrowLeftFromLine className="w-7 h-7" />}
            {mode === 'checkin' ? 'XE VÀO' : 'XE RA'}
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            {mode === 'checkin' ? 'Đăng ký xe vào công trình' : 'Xác nhận xe rời công trình'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        
        {/* ==================== STEP 1: PHOTO ==================== */}
        <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
          <label className="flex items-center gap-2 text-base font-bold text-white mb-3">
            <span className="w-7 h-7 rounded-full bg-blue-600 text-white text-sm flex items-center justify-center font-bold">1</span>
            Chụp ảnh xe
            <span className="text-red-400 text-sm">(bắt buộc)</span>
          </label>
          {photo ? (
            <div className="relative rounded-xl overflow-hidden border-2 border-green-500 aspect-video bg-black flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo} alt="Ảnh xe" className="w-full h-full object-cover" />
              <div className="absolute top-2 right-2 flex gap-2">
                <button 
                  type="button"
                  onClick={() => setPhoto(null)} 
                  className="bg-black/70 text-white px-4 py-2 rounded-full text-sm font-bold hover:bg-black transition"
                >
                  Chụp lại
                </button>
              </div>
              <div className="absolute bottom-2 left-2">
                <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Đã chụp
                </span>
              </div>
            </div>
          ) : (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-600 rounded-xl aspect-video flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-slate-700/50 hover:border-blue-500 transition-all"
            >
              <Camera className="w-16 h-16 text-slate-500" />
              <span className="text-lg font-bold text-slate-400">BẤM VÀO ĐÂY ĐỂ CHỤP ẢNH</span>
              <span className="text-xs text-slate-500">Hoặc chọn ảnh từ thư viện</span>
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

        {/* ==================== STEP 2: PLATE / TRIP ==================== */}
        <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
          <label className="flex items-center gap-2 text-base font-bold text-white mb-3">
            <span className="w-7 h-7 rounded-full bg-blue-600 text-white text-sm flex items-center justify-center font-bold">2</span>
            {mode === 'checkout' ? 'Chọn xe đang ở công trình' : 'Nhập biển số xe'}
          </label>
          
          {mode === 'checkout' ? (
            <>
              <select
                required
                value={activeTrip?.id || ''}
                onChange={e => {
                  const trip = onsiteTrips.find(t => t.id === e.target.value)
                  setActiveTrip(trip || null)
                  if (trip) setPlateNumber(trip.vehicle?.plateNumber || '')
                }}
                className="w-full px-4 py-4 text-xl font-bold bg-slate-900 text-white border-2 border-slate-600 rounded-xl focus:border-amber-500 focus:outline-none"
              >
                <option value="">-- Bấm vào đây để chọn xe --</option>
                {onsiteTrips.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.vehicle?.plateNumber} — {t.material?.name} — {t.driver?.fullName || 'Không rõ tài xế'}
                  </option>
                ))}
              </select>
              {onsiteTrips.length === 0 && (
                <p className="text-sm text-slate-500 mt-2">Hiện không có xe nào đang ở công trình</p>
              )}
            </>
          ) : (
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-500" />
              <input 
                type="text" 
                value={plateNumber}
                onChange={e => { setPlateNumber(e.target.value.toUpperCase()); setSelectedVehicle(null) }}
                onBlur={() => setPlateNumber(normalizePlateNumber(plateNumber))}
                placeholder="Gõ biển số, VD: 51C12345"
                className="w-full pl-14 pr-4 py-4 text-2xl font-black bg-slate-900 text-white border-2 border-slate-600 rounded-xl focus:border-blue-500 focus:outline-none uppercase tracking-wider"
              />
            </div>
          )}
          
          {/* Vehicle suggestions */}
          {mode === 'checkin' && suggestions.length > 0 && !selectedVehicle && (
            <div className="mt-3 border border-slate-600 rounded-xl overflow-hidden bg-slate-900">
              <div className="px-3 py-2 text-xs text-slate-500 bg-slate-800 font-medium">Xe tìm thấy — bấm để chọn:</div>
              {suggestions.map(s => (
                <div 
                  key={s.id} 
                  className="px-4 py-4 border-b last:border-0 border-slate-700 hover:bg-blue-900/30 cursor-pointer flex justify-between items-center transition"
                  onClick={() => handleSelectVehicle(s)}
                >
                  <div>
                    <span className="font-black text-xl text-white tracking-wider">{s.plateNumber}</span>
                    <span className="ml-3 text-sm text-slate-400">{s.vehicleType}</span>
                  </div>
                  <span className="text-xs text-blue-400 font-medium">Chọn →</span>
                </div>
              ))}
            </div>
          )}
          
          {/* Selected vehicle info */}
          {selectedVehicle && (
            <div className="mt-3 bg-green-900/30 border border-green-700 rounded-xl p-3 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
              <div className="text-sm">
                <span className="font-bold text-green-300">{selectedVehicle.plateNumber}</span>
                <span className="text-green-400/70 mx-2">—</span>
                <span className="text-green-400/70">{selectedVehicle.vehicleType}</span>
                {selectedVehicle.ownerName && <span className="text-green-400/70"> — {selectedVehicle.ownerName}</span>}
              </div>
            </div>
          )}
        </div>

        {/* ==================== STEP 3: CHECKIN DETAILS ==================== */}
        {mode === 'checkin' && (
          <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 space-y-4">
            <label className="flex items-center gap-2 text-base font-bold text-white mb-1">
              <span className="w-7 h-7 rounded-full bg-blue-600 text-white text-sm flex items-center justify-center font-bold">3</span>
              Thông tin chuyến
            </label>
            
            {/* Material */}
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2">Vật liệu chở <span className="text-red-400">*</span></label>
              <select 
                required
                value={selectedMaterial} 
                onChange={e => setSelectedMaterial(e.target.value)}
                className="w-full px-4 py-3.5 text-lg font-semibold bg-slate-900 text-white border-2 border-slate-600 rounded-xl focus:border-blue-500 focus:outline-none"
              >
                <option value="">-- Chọn vật liệu --</option>
                {materials.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              {selectedVehicle && selectedMaterial && (
                <p className="text-xs text-blue-400 mt-1.5">
                  Tự động chọn theo loại xe: {selectedVehicle.vehicleType}
                </p>
              )}
            </div>
            
            {/* Project */}
            {projects.length > 1 && (
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">Công trình <span className="text-red-400">*</span></label>
                <select 
                  required
                  value={selectedProject} 
                  onChange={e => setSelectedProject(e.target.value)}
                  className="w-full px-4 py-3.5 text-lg font-semibold bg-slate-900 text-white border-2 border-slate-600 rounded-xl focus:border-blue-500 focus:outline-none"
                >
                  <option value="">-- Chọn công trình --</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Volume Calculator */}
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2">Khối lượng (m³)</label>
              
              {/* Toggle dimensions vs manual */}
              <div className="flex gap-2 mb-3">
                <button 
                  type="button"
                  onClick={() => setCalcMode('manual')}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition ${
                    calcMode === 'manual' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  Nhập trực tiếp
                </button>
                <button 
                  type="button"
                  onClick={() => setCalcMode('dimensions')}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition ${
                    calcMode === 'dimensions' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  Tính Dài × Rộng × Cao
                </button>
              </div>

              {calcMode === 'manual' ? (
                <input 
                  type="number" 
                  step="0.1"
                  min="0"
                  value={manualVolume}
                  onChange={e => setManualVolume(e.target.value)}
                  placeholder="VD: 15.5 (có thể để trống)"
                  className="w-full px-4 py-3.5 text-xl font-bold bg-slate-900 text-white border-2 border-slate-600 rounded-xl focus:border-blue-500 focus:outline-none"
                />
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1 text-center">Dài (m)</label>
                      <input 
                        type="number" step="0.1" min="0"
                        value={lengthM} onChange={e => setLengthM(e.target.value)}
                        placeholder="0.0"
                        className="w-full px-3 py-3 text-lg font-bold bg-slate-900 text-white border-2 border-slate-600 rounded-xl focus:border-blue-500 focus:outline-none text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1 text-center">Rộng (m)</label>
                      <input 
                        type="number" step="0.1" min="0"
                        value={widthM} onChange={e => setWidthM(e.target.value)}
                        placeholder="0.0"
                        className="w-full px-3 py-3 text-lg font-bold bg-slate-900 text-white border-2 border-slate-600 rounded-xl focus:border-blue-500 focus:outline-none text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1 text-center">Cao (m)</label>
                      <input 
                        type="number" step="0.1" min="0"
                        value={heightM} onChange={e => setHeightM(e.target.value)}
                        placeholder="0.0"
                        className="w-full px-3 py-3 text-lg font-bold bg-slate-900 text-white border-2 border-slate-600 rounded-xl focus:border-blue-500 focus:outline-none text-center"
                      />
                    </div>
                  </div>
                  {parseFloat(lengthM) > 0 && parseFloat(widthM) > 0 && parseFloat(heightM) > 0 && (
                    <div className="text-center text-sm text-slate-400">
                      {parseFloat(lengthM).toFixed(1)} × {parseFloat(widthM).toFixed(1)} × {parseFloat(heightM).toFixed(1)} =
                    </div>
                  )}
                </div>
              )}

              {/* Volume result */}
              {computedVolume > 0 && (
                <div className="mt-3 bg-blue-900/40 border border-blue-700 rounded-xl p-4 text-center">
                  <span className="text-sm text-blue-300">Khối lượng:</span>
                  <div className="text-3xl font-black text-blue-300 mt-1">
                    {computedVolume.toFixed(2)} m³
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== STEP 3 CHECKOUT: TRIP INFO ==================== */}
        {mode === 'checkout' && activeTrip && (
          <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 space-y-4">
            <label className="flex items-center gap-2 text-base font-bold text-white mb-1">
              <span className="w-7 h-7 rounded-full bg-amber-500 text-white text-sm flex items-center justify-center font-bold">3</span>
              Thông tin chuyến
            </label>
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-slate-900 p-3 rounded-lg">
                <span className="text-slate-500 text-xs block">Giờ vào</span>
                <span className="font-bold text-white">{new Date(activeTrip.checkInAt).toLocaleTimeString('vi-VN')}</span>
              </div>
              <div className="bg-slate-900 p-3 rounded-lg">
                <span className="text-slate-500 text-xs block">Vật liệu</span>
                <span className="font-bold text-white">{activeTrip.material?.name}</span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2">Số khối (m³) thực tế</label>
              <input 
                type="number" 
                step="0.1"
                min="0"
                value={actualVolume}
                onChange={e => setActualVolume(e.target.value)}
                placeholder="VD: 15.5 (không bắt buộc)"
                className="w-full px-4 py-3.5 text-xl font-bold bg-slate-900 text-white border-2 border-amber-600 rounded-xl focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* ==================== SUBMIT BUTTON ==================== */}
        <button 
          type="submit"
          disabled={loading}
          className={`w-full py-6 rounded-xl font-black text-2xl text-white shadow-xl transition-all active:translate-y-0 flex items-center justify-center gap-3 ${
            loading ? 'opacity-70 cursor-not-allowed' : 'hover:-translate-y-1'
          } ${
            mode === 'checkin' ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30' : 'bg-amber-500 hover:bg-amber-400 shadow-amber-500/30'
          }`}
        >
          {loading ? (
            <Loader2 className="w-8 h-8 animate-spin" />
          ) : (
            <>
              {mode === 'checkin' ? <ArrowRightToLine className="w-8 h-8" /> : <ArrowLeftFromLine className="w-8 h-8" />}
              {mode === 'checkin' ? 'XÁC NHẬN XE VÀO' : 'XÁC NHẬN XE RA'}
            </>
          )}
        </button>
      </form>
    </div>
  )
}
