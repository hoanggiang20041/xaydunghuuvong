'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Mic, Square, Send, X, Volume2, VolumeX, RotateCcw, Loader2, AudioLines } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { sttSupported, startListening, sttErrorMessage } from './voice/speech-to-text'
import { ttsSupported, speak, stopSpeaking, unlockTts } from './voice/text-to-speech'

type Phase = 'idle' | 'listening' | 'querying' | 'speaking' | 'done' | 'error'

interface Turn {
  question: string
  answer: string
  headline?: string
  status: string
}

const SUGGESTIONS = [
  'Hôm nay bao nhiêu chuyến chở đất?',
  'Hôm nay tổng bao nhiêu khối?',
  'So với hôm qua thế nào?',
  'Xe nào chưa ra khỏi công trình?',
]

const VOICE_KEY = 'hv-assistant-voice'

export function VoiceAssistant() {
  const { user, hasPermission } = useAuth()
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState<Phase>('idle')
  const [interim, setInterim] = useState('')
  const [input, setInput] = useState('')
  const [current, setCurrent] = useState<Turn | null>(null)
  const [history, setHistory] = useState<Turn[]>([])
  const [voiceOn, setVoiceOn] = useState(true)
  const [notice, setNotice] = useState('')
  const [canListen, setCanListen] = useState(false)

  const contextRef = useRef<unknown>(null)     // last structured query only (tiny, for follow-ups)
  const listenerRef = useRef<{ stop: () => void } | null>(null)
  const busyRef = useRef(false)

  useEffect(() => {
    setCanListen(sttSupported())
    const saved = localStorage.getItem(VOICE_KEY)
    if (saved === 'off') setVoiceOn(false)
  }, [])

  const stopAll = useCallback(() => {
    listenerRef.current?.stop()
    listenerRef.current = null
    stopSpeaking()
    setPhase(p => (p === 'listening' || p === 'speaking' ? (current ? 'done' : 'idle') : p))
  }, [current])

  useEffect(() => () => { listenerRef.current?.stop(); stopSpeaking() }, [])

  const ask = useCallback(async (question: string) => {
    const q = question.trim()
    if (!q || busyRef.current) return
    busyRef.current = true
    setNotice('')
    setInterim('')
    setPhase('querying')
    if (current) setHistory(h => [current, ...h].slice(0, 5))
    setCurrent({ question: q, answer: '', status: 'PENDING' })

    let turn: Turn
    try {
      const res = await fetch('/api/assistant/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, context: contextRef.current }),
      })
      const json = await res.json()
      const d = json?.data
      if (!res.ok || !d) throw new Error()
      if (d.query) contextRef.current = d.query
      turn = { question: q, answer: d.answer, headline: d.headline, status: d.status }
    } catch {
      turn = { question: q, answer: 'Không thể lấy dữ liệu lúc này. Vui lòng thử lại.', status: 'DATABASE_ERROR' }
    }
    busyRef.current = false
    setCurrent(turn)

    if (voiceOn && ttsSupported()) {
      setPhase('speaking')
      speak(turn.answer, () => setPhase(p => (p === 'speaking' ? 'done' : p)))
    } else {
      setPhase('done')
    }
  }, [current, voiceOn])

  const listen = useCallback(() => {
    if (phase === 'listening') { listenerRef.current?.stop(); return }
    if (!canListen) {
      setNotice('Trình duyệt của bạn không hỗ trợ Voice Assistant. Bạn có thể nhập câu hỏi bằng văn bản.')
      return
    }
    stopSpeaking()
    unlockTts() // must happen inside the tap (iOS)
    setNotice('')
    setInterim('')
    setPhase('listening')
    try {
      listenerRef.current = startListening({
        onInterim: t => setInterim(t),
        onFinal: t => { listenerRef.current = null; ask(t) },
        onError: code => {
          const msg = sttErrorMessage(code)
          if (msg) setNotice(msg)
        },
        onEnd: () => {
          listenerRef.current = null
          setPhase(p => (p === 'listening' ? (current ? 'done' : 'idle') : p))
        },
      })
    } catch {
      setPhase('idle')
      setNotice('Không mở được micro. Bạn có thể gõ câu hỏi.')
    }
  }, [phase, canListen, ask, current])

  const toggleVoice = () => {
    const next = !voiceOn
    setVoiceOn(next)
    localStorage.setItem(VOICE_KEY, next ? 'on' : 'off')
    if (!next) { stopSpeaking(); setPhase(p => (p === 'speaking' ? 'done' : p)) }
  }

  const submitText = (e: React.FormEvent) => {
    e.preventDefault()
    unlockTts()
    const q = input
    setInput('')
    ask(q)
  }

  if (!user || !hasPermission('trips.view')) return null

  const statusLine: Record<Phase, string> = {
    idle: 'Hỏi bằng giọng nói hoặc gõ câu hỏi',
    listening: 'Đang nghe…',
    querying: 'Đang tra cứu dữ liệu…',
    speaking: 'Đang đọc kết quả',
    done: 'Xong',
    error: 'Có lỗi',
  }

  return (
    <>
      {/* Floating trigger */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Mở trợ lý tra cứu bằng giọng nói"
          className="fixed z-40 bottom-5 right-5 w-14 h-14 rounded-full flex items-center justify-center shadow-xl shadow-black/40 border border-amber-300/40 transition-transform active:scale-95 hover:scale-105"
          style={{ background: 'linear-gradient(135deg, #d69e2e 0%, #ecc94b 100%)' }}
        >
          <Mic className="w-6 h-6 text-[#0f1b2d]" />
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-label="Trợ lý tra cứu"
          className="fixed z-50 inset-x-2 bottom-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[400px] rounded-2xl border border-white/10 shadow-2xl shadow-black/60 overflow-hidden flex flex-col max-h-[85vh]"
          style={{ background: '#0f1b2d' }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-500/15 border border-amber-500/30">
              <AudioLines className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-white">Tra cứu nhanh</div>
              <div className="text-xs text-slate-400 truncate" aria-live="polite">{statusLine[phase]}</div>
            </div>
            <button
              onClick={toggleVoice}
              title={voiceOn ? 'Tắt đọc kết quả' : 'Bật đọc kết quả'}
              className="p-2 rounded-lg text-slate-300 hover:bg-white/5"
            >
              {voiceOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>
            <button
              onClick={() => { stopAll(); setOpen(false) }}
              title="Đóng"
              className="p-2 rounded-lg text-slate-300 hover:bg-white/5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {phase === 'listening' && (
              <div className="flex flex-col items-center py-4">
                <div className="relative w-16 h-16 mb-3">
                  <span className="absolute inset-0 rounded-full bg-amber-500/25 animate-ping" />
                  <span className="relative w-16 h-16 rounded-full bg-amber-500 flex items-center justify-center">
                    <Mic className="w-7 h-7 text-[#0f1b2d]" />
                  </span>
                </div>
                <div className="text-base font-medium text-white">Đang nghe…</div>
                <div className="text-sm text-slate-400 mt-1 text-center min-h-[1.25rem]">
                  {interim ? `“${interim}”` : 'Hãy nói câu hỏi của bạn'}
                </div>
              </div>
            )}

            {phase !== 'listening' && !current && (
              <div>
                <div className="text-sm text-slate-300 mb-3">Bấm <span className="text-amber-400 font-medium">micro</span> rồi hỏi, ví dụ:</div>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => { unlockTts(); ask(s) }}
                      className="text-xs px-3 py-1.5 rounded-full border border-white/10 text-slate-300 hover:border-amber-500/50 hover:text-white transition"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {phase !== 'listening' && current && (
              <div className="space-y-3">
                <div className="text-xs text-slate-400">
                  Bạn hỏi: <span className="text-slate-200">“{current.question}”</span>
                </div>
                {phase === 'querying' ? (
                  <div className="flex items-center gap-2 text-sm text-slate-300 py-3">
                    <Loader2 className="w-4 h-4 animate-spin text-amber-400" /> Đang tra cứu dữ liệu…
                  </div>
                ) : (
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    {current.headline && (
                      <div className="text-2xl font-bold text-amber-400 leading-tight mb-1">{current.headline}</div>
                    )}
                    <div className={`text-sm leading-relaxed ${current.status === 'DATABASE_ERROR' || current.status === 'PERMISSION_DENIED' ? 'text-red-300' : 'text-slate-200'}`}>
                      {current.answer}
                    </div>
                  </div>
                )}
                {(phase === 'done' || phase === 'speaking') && (
                  <div className="flex gap-2">
                    {phase === 'speaking' ? (
                      <button onClick={stopAll} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white/5 text-slate-200 hover:bg-white/10">
                        <Square className="w-3 h-3" /> Dừng đọc
                      </button>
                    ) : voiceOn && ttsSupported() ? (
                      <button onClick={() => { setPhase('speaking'); speak(current.answer, () => setPhase('done')) }} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white/5 text-slate-200 hover:bg-white/10">
                        <Volume2 className="w-3 h-3" /> Đọc lại
                      </button>
                    ) : null}
                    <button onClick={() => ask(current.question)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white/5 text-slate-200 hover:bg-white/10">
                      <RotateCcw className="w-3 h-3" /> Hỏi lại
                    </button>
                  </div>
                )}
              </div>
            )}

            {notice && (
              <div className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">{notice}</div>
            )}

            {history.length > 0 && phase !== 'listening' && (
              <div className="pt-2 border-t border-white/5">
                <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-2">Vừa hỏi</div>
                <ul className="space-y-2">
                  {history.map((t, i) => (
                    <li key={i} className="text-xs">
                      <div className="text-slate-500 truncate">“{t.question}”</div>
                      <div className="text-slate-300">{t.headline || t.answer}</div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Footer: text + mic share the same backend */}
          <form onSubmit={submitText} className="flex items-center gap-2 px-3 py-3 border-t border-white/10">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Hoặc gõ câu hỏi…"
              maxLength={300}
              disabled={phase === 'querying'}
              className="flex-1 min-w-0 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60"
            />
            {input.trim() ? (
              <button type="submit" disabled={phase === 'querying'} aria-label="Gửi" className="w-11 h-11 rounded-xl bg-amber-500 hover:bg-amber-400 flex items-center justify-center disabled:opacity-50">
                <Send className="w-4 h-4 text-[#0f1b2d]" />
              </button>
            ) : (
              <button
                type="button"
                onClick={phase === 'speaking' ? stopAll : listen}
                disabled={phase === 'querying'}
                aria-label={phase === 'listening' ? 'Dừng nghe' : phase === 'speaking' ? 'Dừng đọc' : 'Bấm để nói'}
                className={`w-11 h-11 rounded-xl flex items-center justify-center transition disabled:opacity-50 ${
                  phase === 'listening' || phase === 'speaking' ? 'bg-red-500 hover:bg-red-400' : canListen ? 'bg-amber-500 hover:bg-amber-400' : 'bg-white/10'
                }`}
              >
                {phase === 'listening' || phase === 'speaking'
                  ? <Square className="w-4 h-4 text-white" />
                  : <Mic className={`w-5 h-5 ${canListen ? 'text-[#0f1b2d]' : 'text-slate-500'}`} />}
              </button>
            )}
          </form>
        </div>
      )}
    </>
  )
}
