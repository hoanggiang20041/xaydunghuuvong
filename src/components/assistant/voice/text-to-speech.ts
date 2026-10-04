'use client'
/**
 * Browser-native text-to-speech (speechSynthesis), Vietnamese voice when available.
 */

export function ttsSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

let cachedVoice: SpeechSynthesisVoice | null | undefined

function pickVoice(): SpeechSynthesisVoice | null {
  if (cachedVoice !== undefined && cachedVoice !== null) return cachedVoice
  const voices = window.speechSynthesis.getVoices()
  const vi = voices.filter(v => v.lang?.toLowerCase().startsWith('vi'))
  // Prefer natural/online voices (Google, Microsoft "Online", Apple Linh)
  cachedVoice = vi.find(v => /google|online|natural|linh/i.test(v.name)) || vi[0] || null
  return cachedVoice
}

/** True once voices are loaded and a Vietnamese one exists. */
export function hasVietnameseVoice(): boolean {
  if (!ttsSupported()) return false
  return !!pickVoice()
}

/** iOS Safari only allows speech that starts from a user tap — call this inside the tap handler. */
export function unlockTts() {
  if (!ttsSupported()) return
  try {
    const u = new SpeechSynthesisUtterance(' ')
    u.volume = 0
    window.speechSynthesis.speak(u)
  } catch { /* ignore */ }
}

export function speak(text: string, onEnd?: () => void) {
  if (!ttsSupported() || !text) { onEnd?.(); return }
  const synth = window.speechSynthesis
  synth.cancel()
  const u = new SpeechSynthesisUtterance(
    // read "m³" naturally
    text.replace(/m³/g, 'mét khối'),
  )
  u.lang = 'vi-VN'
  const v = pickVoice()
  if (v) u.voice = v
  u.rate = 1.05
  u.onend = () => onEnd?.()
  u.onerror = () => onEnd?.()
  synth.speak(u)
}

export function stopSpeaking() {
  if (ttsSupported()) window.speechSynthesis.cancel()
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  // voices load asynchronously in Chrome
  window.speechSynthesis.onvoiceschanged = () => { cachedVoice = undefined }
}
