'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from '@/components/ui/toaster'
import { Camera, Truck, ArrowRightToLine, ArrowLeftFromLine, Loader2, Search } from 'lucide-react'
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
  const [expectedVolume, setExpectedVolume] = useState('')
  
  // Quick search results
  const [suggestions, setSuggestions] = useState<any[]>([])
  
  // Checkout data
  const [activeTrip, setActiveTrip] = useState<any>(null)
  const [actualVolume, setActualVolume] = useState('')

  const [photo, setPhoto] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Fetch materials and projects for Check In
    fetch('/api/materials').then(res => res.json()).then(data => setMaterials(data.data || []))
    fetch('/api/projects').then(res => res.json()).then(data => {
      const projs = data.data || []
      setProjects(projs)
      if (projs.length === 1) setSelectedProject(projs[0].id)
    })
  }, [])

  const [onsiteTrips, setOnsiteTrips] = useState<any[]>([])

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

  // Search vehicles for checkin
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

    // Resize image via canvas to reduce size (max 800px)
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
        
        // Convert to Base64 jpeg (quality 0.7)
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

        const payload = {
          plateNumber: plateNumber,
          projectId: selectedProject,
          materialId: selectedMaterial,
          expectedVolume: expectedVolume ? parseFloat(expectedVolume) : null,
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

      // Reset
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
  }

  if (!mode) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-8 p-4">
        <h1 className="text-2xl md:text-3xl font-bold text-navy-900 dark:text-white text-center uppercase">
          Thao Tác Nhanh
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
          <button 
            onClick={() => setMode('checkin')}
            className="flex flex-col items-center justify-center gap-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl p-12 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all"
          >
            <ArrowRightToLine className="w-24 h-24" />
            <span className="text-3xl font-bold">XE VÀO</span>
          </button>
          <button 
            onClick={() => setMode('checkout')}
            className="flex flex-col items-center justify-center gap-4 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl p-12 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all"
          >
            <ArrowLeftFromLine className="w-24 h-24" />
            <span className="text-3xl font-bold">XE RA</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className={`text-2xl font-bold flex items-center gap-2 ${mode === 'checkin' ? 'text-blue-600' : 'text-amber-500'}`}>
          {mode === 'checkin' ? <ArrowRightToLine className="w-8 h-8" /> : <ArrowLeftFromLine className="w-8 h-8" />}
          {mode === 'checkin' ? 'ĐĂNG KÝ XE VÀO' : 'XÁC NHẬN XE RA'}
        </h2>
        <button onClick={resetForm} className="text-slate-400 hover:text-slate-600 underline text-sm">
          Hủy & Quay lại
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Photo Capture */}
        <div>
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">Chụp ảnh xe (Bắt buộc) *</label>
          {photo ? (
            <div className="relative rounded-xl overflow-hidden border-2 border-green-500 aspect-video bg-black flex items-center justify-center">
              <img src={photo} alt="Captured" className="w-full h-full object-cover" />
              <button 
                onClick={() => setPhoto(null)} 
                className="absolute top-2 right-2 bg-black/60 text-white px-3 py-1 rounded-full text-sm hover:bg-black"
              >
                Chụp lại
              </button>
            </div>
          ) : (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl aspect-video flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <Camera className="w-12 h-12 text-slate-400" />
              <span className="text-slate-500 font-medium">Bấm vào đây để mở Camera</span>
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
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">
            {mode === 'checkout' ? 'Chọn xe đang ở công trình *' : 'Biển số xe *'}
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
              className="w-full px-4 py-4 text-xl font-bold bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:border-amber-500 focus:outline-none"
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
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400" />
              <input 
                type="text" 
                value={plateNumber}
                onChange={e => setPlateNumber(e.target.value.toUpperCase())}
                onBlur={() => setPlateNumber(normalizePlateNumber(plateNumber))}
                placeholder="VD: 51C-123.45"
                className="w-full pl-12 pr-4 py-4 text-xl font-bold bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:border-blue-500 focus:outline-none uppercase"
              />
            </div>
          )}
          
          {/* Suggestions for Check In */}
          {mode === 'checkin' && suggestions.length > 0 && !activeTrip && (
            <div className="mt-2 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-800 shadow-sm">
              {suggestions.map(s => (
                <div 
                  key={s.id} 
                  className="px-4 py-3 border-b last:border-0 border-slate-100 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer flex justify-between items-center"
                  onClick={() => {
                    setPlateNumber(s.plateNumber || s.vehicle?.plateNumber)
                    setSuggestions([])
                  }}
                >
                  <span className="font-bold text-lg">{s.plateNumber || s.vehicle?.plateNumber}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Check In Fields */}
        {mode === 'checkin' && (
          <>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">Vật liệu *</label>
              <select 
                required
                value={selectedMaterial} 
                onChange={e => setSelectedMaterial(e.target.value)}
                className="w-full px-4 py-4 text-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:border-amber-500 focus:outline-none"
              >
                <option value="">-- Chọn vật liệu --</option>
                {materials.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            
            {projects.length > 1 && (
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">Công trình *</label>
                <select 
                  required
                  value={selectedProject} 
                  onChange={e => setSelectedProject(e.target.value)}
                  className="w-full px-4 py-4 text-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:border-amber-500 focus:outline-none"
                >
                  <option value="">-- Chọn công trình --</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">Số khối (m³)</label>
              <input 
                type="number" 
                step="0.1"
                min="0"
                value={expectedVolume}
                onChange={e => setExpectedVolume(e.target.value)}
                placeholder="Ví dụ: 15.5 (có thể để trống)"
                className="w-full px-4 py-4 text-xl font-bold bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:border-amber-500 focus:outline-none"
              />
            </div>
          </>
        )}

        {/* Check Out Fields */}
        {mode === 'checkout' && activeTrip && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">Giờ vào:</span>
              <span className="font-medium text-slate-900 dark:text-white">
                {new Date(activeTrip.checkInAt).toLocaleTimeString('vi-VN')}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">Vật liệu:</span>
              <span className="font-medium text-slate-900 dark:text-white">{activeTrip.material?.name}</span>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">Số khối (m³) thực tế</label>
              <input 
                type="number" 
                step="0.1"
                min="0"
                value={actualVolume}
                onChange={e => setActualVolume(e.target.value)}
                placeholder="Ví dụ: 15.5 (không bắt buộc)"
                className="w-full px-4 py-4 text-xl font-bold bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-2 border-blue-300 dark:border-blue-700 rounded-xl focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button 
          type="submit"
          disabled={loading}
          className={`w-full py-5 rounded-xl font-bold text-xl text-white shadow-lg transition-transform hover:-translate-y-1 active:translate-y-0 flex items-center justify-center gap-2 ${
            mode === 'checkin' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-amber-500 hover:bg-amber-600'
          }`}
        >
          {loading ? <Loader2 className="w-8 h-8 animate-spin" /> : (
            mode === 'checkin' ? 'XÁC NHẬN XE VÀO' : 'XÁC NHẬN XE RA'
          )}
        </button>
      </form>
    </div>
  )
}
