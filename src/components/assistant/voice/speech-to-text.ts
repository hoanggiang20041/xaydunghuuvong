'use client'
/**
 * Browser-native speech-to-text (Web Speech API).
 * Audio stays on the device/browser vendor — nothing is uploaded to our server.
 * Supported: Chrome / Edge (desktop + Android), Safari iOS 14.5+ / macOS.
 */

type Rec = any

export function sttSupported(): boolean {
  if (typeof window === 'undefined') return false
  return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
}

export interface SttHandlers {
  onInterim: (text: string) => void
  onFinal: (text: string) => void
  onError: (code: string) => void
  onEnd: () => void
}

export function startListening(h: SttHandlers): { stop: () => void } {
  const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  const rec: Rec = new Ctor()
  rec.lang = 'vi-VN'
  rec.interimResults = true   // streaming partial transcript
  rec.continuous = false      // stop automatically after the sentence
  rec.maxAlternatives = 1

  let finalText = ''
  let delivered = false

  rec.onresult = (e: any) => {
    let interim = ''
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i]
      if (r.isFinal) finalText += r[0].transcript
      else interim += r[0].transcript
    }
    h.onInterim((finalText + interim).trim())
  }
  rec.onerror = (e: any) => h.onError(e?.error || 'unknown')
  rec.onend = () => {
    if (!delivered && finalText.trim()) { delivered = true; h.onFinal(finalText.trim()) }
    h.onEnd()
  }

  rec.start()
  return {
    stop: () => { try { rec.stop() } catch { /* ignore */ } },
  }
}

export function sttErrorMessage(code: string): string {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Chưa được cấp quyền micro. Hãy cho phép micro trong cài đặt trình duyệt.'
    case 'no-speech':
      return 'Không nghe thấy gì. Bấm micro và nói lại nhé.'
    case 'audio-capture':
      return 'Không tìm thấy micro trên thiết bị.'
    case 'network':
      return 'Mất kết nối mạng khi nhận giọng nói.'
    case 'aborted':
      return ''
    default:
      return 'Không nhận được giọng nói. Bạn có thể gõ câu hỏi.'
  }
}
