'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from '@/components/ui/toaster'
import { Camera, ArrowRightToLine, ArrowLeftFromLine, Loader2, Search, Calculator, CheckSquare } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { normalizePlateNumber } from '@/lib/plate-utils'

export default function QuickActionPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [mode, setMode] = useState<'checkin' | 'checkout' | null>(null)
  
  const [plateNumber, setPlateNumber] = useState('')
  const [materials, setMaterials] = useState<any[]>([])
  const [selectedMaterial, setSelectedMaterial] = useState('')
  const [projects, setProjects] = useState<any[]>([])
  const [selectedProject, setSelectedProject] = useState('')
  
  // Volume calculation states
  const [calculationMethod, setCalculationMethod] = useState<'manual' | 'dimensions'>('manual')
  const [expectedVolume, setExpectedVolume] = useState('') // Manual volume
  const [lengthM, setLengthM] = useState('')
  const [widthM, setWidthM] = useState('')
  const [heightM, setHeightM] = useState('')
  const [calculatedVolume, setCalculatedVolume] = useState(0)
  
  // Quick search results
  const [suggestions, setSuggestions] = useState<any[]>([])
  
  // Checkout data
  const [activeTrip, setActiveTrip] = useState<any>(null)
  const [actualVolume, setActualVolume] = useState('')

  const [photo, setPhoto] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/materials').then(res => res.json()).then(data => setMaterials(data.data || []))
    fetch('/api/projects').then(res => res.json()).then(data => {
      const projs = data.data || []
      setProjects(projs)
      if (projs.length === 1) setSelectedProject(projs[0].id)
    })
  }, [])

  const [onsiteTrips, setOnsiteTrips] = useState<any[]>([])

  useEffect(() => {
    if (mode === 'checkout') {
      fetch(`/api/trips/onsite`)
        .then(res => res.json())
        .then(data => {
          if (data.success) setOnsiteTrips(data.data || [])
        })
    }
  }, [mode])

  // Calculate volume automatically
  useEffect(() => {
    if (calculationMethod === 'dimensions') {
      const l = parseFloat(lengthM) || 0
      const w = parseFloat(widthM) || 0
      const h = parseFloat(heightM) || 0
      setCalculatedVolume(l * w * h)
    }
  }, [lengthM, widthM, heightM, calculationMethod])

  useEffect(() => {
    if (mode === 'checkin' && plateNumber.length > 2) {
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
      }, 500)
      return () => clearTimeout(delay)
    }
  }, [plateNumber, mode])

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

        let finalVolume = null
        if (calculationMethod === 'dimensions') {
          if (!lengthM || !widthM || !heightM) throw new Error('Vui lòng nhập đầy đủ 3 kích thước')
          if (parseFloat(lengthM) <= 0 || parseFloat(widthM) <= 0 || parseFloat(heightM) <= 0) {
            throw new Error('Kích thước phải lớn hơn 0')
          }
          finalVolume = calculatedVolume
        } else {
          if (expectedVolume) {
            if (parseFloat(expectedVolume) <= 0) throw new Error('Khối lượng phải lớn hơn 0')
            finalVolume = parseFloat(expectedVolume)
          }
        }

        const payload = {
          plateNumber: plateNumber,
          projectId: selectedProject,
          materialId: selectedMaterial,
          expectedVolume: finalVolume,
          volumeM3: finalVolume,
          calculationMethod: calculationMethod,
          lengthM: calculationMethod === 'dimensions' ? parseFloat(lengthM) : null,
          widthM: calculationMethod === 'dimensions' ? parseFloat(widthM) : null,
          heightM: calculationMethod === 'dimensions' ? parseFloat(heightM) : null,
          checkInPhotoUrl: photo
        }

        const res = await fetch('/api/trips', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        const data = await res.json()
        if (!data.success) throw new Error(data.error?.message || data.message || 'Lỗi hệ thống')
        
        toast({ title: '✅ XE VÀO THÀNH CÔNG', variant: 'success' })
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
        
        toast({ title: '✅ XE RA THÀNH CÔNG', variant: 'success' })
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
    setSuggestions([])
    setActiveTrip(null)
    setActualVolume('')
    setExpectedVolume('')
    setLengthM('')
    setWidthM('')
    setHeightM('')
    setCalculatedVolume(0)
  }

  if (!mode) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-8 p-4 bg-slate-50">
        <div className="text-center">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 uppercase">
            Thao Tác Nhanh
          </h1>
          <p className="text-slate-500 mt-2">Chọn tác vụ bạn muốn thực hiện</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
          <button 
            onClick={() => setMode('checkin')}
            className="flex flex-col items-center justify-center gap-4 bg-white border border-slate-200 text-slate-900 rounded-lg p-10 shadow-sm hover:border-blue-500 hover:shadow-md transition-all group"
          >
            <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center group-hover:bg-blue-600 transition-colors">
              <ArrowRightToLine className="w-10 h-10 text-blue-600 group-hover:text-white transition-colors" />
            </div>
            <span className="text-2xl font-semibold">XE VÀO</span>
          </button>
          
          <button 
            onClick={() => setMode('checkout')}
            className="flex flex-col items-center justify-center gap-4 bg-white border border-slate-200 text-slate-900 rounded-lg p-10 shadow-sm hover:border-emerald-500 hover:shadow-md transition-all group"
          >
            <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-600 transition-colors">
              <ArrowLeftFromLine className="w-10 h-10 text-emerald-600 group-hover:text-white transition-colors" />
            </div>
            <span className="text-2xl font-semibold">XE RA</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 py-6 px-4">
      <div className="max-w-xl mx-auto bg-white rounded-lg shadow-sm border border-slate-200 p-6 md:p-8">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
          <h2 className="text-xl font-semibold flex items-center gap-3 text-slate-900">
            {mode === 'checkin' ? (
              <>
                <div className="p-2 bg-blue-50 rounded-lg"><ArrowRightToLine className="w-6 h-6 text-blue-600" /></div>
                ĐĂNG KÝ XE VÀO
              </>
            ) : (
              <>
                <div className="p-2 bg-emerald-50 rounded-lg"><ArrowLeftFromLine className="w-6 h-6 text-emerald-600" /></div>
                XÁC NHẬN XE RA
              </>
            )}
          </h2>
          <button onClick={resetForm} className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
            Quay lại
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Photo Capture */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">Chụp ảnh xe (Bắt buộc) <span className="text-red-500">*</span></label>
            {photo ? (
              <div className="relative rounded-lg overflow-hidden border border-slate-200 aspect-video bg-slate-100 flex items-center justify-center shadow-sm">
                <img src={photo} alt="Captured" className="w-full h-full object-cover" />
                <button 
                  type="button"
                  onClick={() => setPhoto(null)} 
                  className="absolute top-3 right-3 bg-white/90 text-slate-900 px-3 py-1.5 rounded-md text-sm font-medium shadow-sm hover:bg-white border border-slate-200"
                >
                  Chụp lại
                </button>
              </div>
            ) : (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 rounded-lg aspect-video flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-slate-50 hover:border-slate-400 transition-colors bg-slate-50/50"
              >
                <Camera className="w-10 h-10 text-slate-400" />
                <span className="text-sm text-slate-600 font-medium">Bấm vào đây để mở Camera</span>
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

          {/* Plate Number */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              {mode === 'checkout' ? 'Chọn xe đang ở công trình' : 'Biển số xe'} <span className="text-red-500">*</span>
            </label>
            
            {mode === 'checkout' ? (
              <select
                required
                value={activeTrip?.id || ''}
                onChange={e => {
                  const trip = onsiteTrips.find(t => t.id === e.target.value)
                  setActiveTrip(trip || null)
                  if (trip) setPlateNumber(trip.vehicle?.plateNumber || '')
                }}
                className="w-full px-4 py-3 text-base bg-white text-slate-900 border border-slate-300 rounded-lg focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none shadow-sm"
              >
                <option value="">-- Chọn xe --</option>
                {onsiteTrips.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.vehicle?.plateNumber} - {t.driver?.fullName || 'Khách'}
                  </option>
                ))}
              </select>
            ) : (
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  type="text" 
                  required
                  value={plateNumber}
                  onChange={e => setPlateNumber(e.target.value.toUpperCase())}
                  onBlur={() => setPlateNumber(normalizePlateNumber(plateNumber))}
                  placeholder="VD: 51C-123.45"
                  className="w-full pl-11 pr-4 py-3 text-lg font-medium bg-white text-slate-900 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none uppercase shadow-sm placeholder:normal-case placeholder:font-normal placeholder:text-slate-400"
                />
              </div>
            )}
            
            {/* Suggestions for Check In */}
            {mode === 'checkin' && suggestions.length > 0 && !activeTrip && (
              <div className="mt-2 border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm absolute z-10 w-full max-w-xl">
                {suggestions.map(s => (
                  <div 
                    key={s.id} 
                    className="px-4 py-3 border-b last:border-0 border-slate-100 hover:bg-slate-50 cursor-pointer flex justify-between items-center"
                    onClick={() => {
                      setPlateNumber(s.plateNumber || s.vehicle?.plateNumber)
                      setSuggestions([])
                    }}
                  >
                    <span className="font-medium text-slate-900">{s.plateNumber || s.vehicle?.plateNumber}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Check In Fields */}
          {mode === 'checkin' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">Vật liệu <span className="text-red-500">*</span></label>
                  <select 
                    required
                    value={selectedMaterial} 
                    onChange={e => setSelectedMaterial(e.target.value)}
                    className="w-full px-4 py-3 text-base bg-white text-slate-900 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none shadow-sm"
                  >
                    <option value="">-- Chọn vật liệu --</option>
                    {materials.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
                
                {projects.length > 1 && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-2">Công trình <span className="text-red-500">*</span></label>
                    <select 
                      required
                      value={selectedProject} 
                      onChange={e => setSelectedProject(e.target.value)}
                      className="w-full px-4 py-3 text-base bg-white text-slate-900 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none shadow-sm"
                    >
                      <option value="">-- Chọn công trình --</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              
              {/* Volume Input Section */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-semibold text-slate-900">Tính khối lượng</label>
                  <div className="flex bg-white rounded-md border border-slate-200 p-0.5">
                    <button
                      type="button"
                      onClick={() => setCalculationMethod('dimensions')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-sm flex items-center gap-1.5 transition-colors ${calculationMethod === 'dimensions' ? 'bg-slate-100 text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      <Calculator className="w-3.5 h-3.5" />
                      Nhập kích thước
                    </button>
                    <button
                      type="button"
                      onClick={() => setCalculationMethod('manual')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-sm flex items-center gap-1.5 transition-colors ${calculationMethod === 'manual' ? 'bg-slate-100 text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      <CheckSquare className="w-3.5 h-3.5" />
                      Nhập trực tiếp
                    </button>
                  </div>
                </div>

                {calculationMethod === 'dimensions' ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Dài (m)</label>
                        <input 
                          type="number" step="0.01" min="0" required
                          value={lengthM} onChange={e => setLengthM(e.target.value)}
                          className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Rộng (m)</label>
                        <input 
                          type="number" step="0.01" min="0" required
                          value={widthM} onChange={e => setWidthM(e.target.value)}
                          className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Cao (m)</label>
                        <input 
                          type="number" step="0.01" min="0" required
                          value={heightM} onChange={e => setHeightM(e.target.value)}
                          className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                        />
                      </div>
                    </div>
                    <div className="bg-white border border-blue-100 bg-blue-50/50 rounded-md p-3 flex items-center justify-between">
                      <span className="text-sm text-slate-600 font-medium">Khối lượng tính toán:</span>
                      <span className="text-lg font-bold text-blue-700">{calculatedVolume > 0 ? calculatedVolume.toFixed(2) : '0.00'} m³</span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Số khối (m³)</label>
                    <input 
                      type="number" 
                      step="0.01" min="0"
                      value={expectedVolume}
                      onChange={e => setExpectedVolume(e.target.value)}
                      placeholder="Ví dụ: 15.5"
                      className="w-full px-4 py-3 text-base font-medium bg-white border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none shadow-sm"
                    />
                  </div>
                )}
              </div>
            </>
          )}

          {/* Check Out Fields */}
          {mode === 'checkout' && activeTrip && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 space-y-4">
              <div className="flex justify-between items-center text-sm border-b border-slate-200 pb-3">
                <span className="text-slate-500">Giờ vào:</span>
                <span className="font-semibold text-slate-900">
                  {new Date(activeTrip.checkInAt).toLocaleTimeString('vi-VN')}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-slate-200 pb-3">
                <span className="text-slate-500">Vật liệu:</span>
                <span className="font-semibold text-slate-900">{activeTrip.material?.name || '-'}</span>
              </div>
              <div className="pt-2">
                <label className="block text-sm font-semibold text-slate-900 mb-2">Số khối (m³) thực tế</label>
                <input 
                  type="number" 
                  step="0.1"
                  min="0"
                  value={actualVolume}
                  onChange={e => setActualVolume(e.target.value)}
                  placeholder="Ví dụ: 15.5 (không bắt buộc)"
                  className="w-full px-4 py-3 text-base font-medium bg-white border border-slate-300 rounded-lg focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none shadow-sm"
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button 
            type="submit"
            disabled={loading}
            className={`w-full py-3.5 rounded-lg font-semibold text-white shadow-sm flex items-center justify-center gap-2 transition-colors focus:ring-2 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed ${
              mode === 'checkin' 
                ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-600' 
                : 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-600'
            }`}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
              mode === 'checkin' ? 'XÁC NHẬN XE VÀO' : 'XÁC NHẬN XE RA'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
