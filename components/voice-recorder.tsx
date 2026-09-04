'use client'

import { useState, useRef, useEffect } from 'react'

interface VoiceRecorderProps {
  onAudioRecorded: (file: File) => void
  disabled?: boolean
}

export default function VoiceRecorder({ onAudioRecorded, disabled }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [supported, setSupported] = useState(true)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    // Check if browser supports microphone
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setSupported(false)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      // Clean up stream on unmount
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  // Pick the best supported MIME type
  function getSupportedMimeType(): string {
    const types = [
      'audio/mp4',
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg',
    ]
    for (const type of types) {
      try {
        if (MediaRecorder.isTypeSupported(type)) return type
      } catch {
        // ignore
      }
    }
    return '' // browser will pick default
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      audioChunksRef.current = []

      const mimeType = getSupportedMimeType()
      const options = mimeType ? { mimeType } : {}
      const mediaRecorder = new MediaRecorder(stream, options)
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data)
        }
      }

      // Request data every 250ms so we always have chunks
      mediaRecorder.start(250)
      setIsRecording(true)
      setRecordingTime(0)

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    } catch (err) {
      console.error('Microphone error:', err)
      alert('Microphone access is required. Please allow microphone permission and try again.')
    }
  }

  function stopAndSend() {
    const mediaRecorder = mediaRecorderRef.current
    if (!mediaRecorder || !isRecording) return

    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    // Request any remaining buffered data before stopping
    try { mediaRecorder.requestData() } catch { /* ignore */ }

    mediaRecorder.onstop = () => {
      // Stop all tracks
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null

      const chunks = audioChunksRef.current
      if (chunks.length === 0) {
        setIsRecording(false)
        setRecordingTime(0)
        return
      }

      const usedMimeType = mediaRecorder.mimeType || 'audio/webm'
      const audioBlob = new Blob(chunks, { type: usedMimeType })

      // Pick file extension based on MIME type
      let ext = 'webm'
      if (usedMimeType.includes('mp4')) ext = 'm4a'
      else if (usedMimeType.includes('ogg')) ext = 'ogg'

      const audioFile = new File([audioBlob], `voice-note-${Date.now()}.${ext}`, {
        type: usedMimeType,
      })

      onAudioRecorded(audioFile)
      audioChunksRef.current = []
      setIsRecording(false)
      setRecordingTime(0)
    }

    mediaRecorder.stop()
  }

  function cancelRecording() {
    const mediaRecorder = mediaRecorderRef.current
    if (!mediaRecorder || !isRecording) return

    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    mediaRecorder.onstop = () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      audioChunksRef.current = []
      setIsRecording(false)
      setRecordingTime(0)
    }

    try { mediaRecorder.stop() } catch { /* ignore */ }
  }

  function formatTime(seconds: number) {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`
  }

  // Browser does not support recording
  if (!supported) return null

  // Recording in progress — show waveform UI
  if (isRecording) {
    return (
      <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700/60 rounded-2xl px-3 py-2 text-white w-full">
        {/* Pulsing recording dot */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="relative flex h-3 w-3 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
          </span>
          <span className="font-mono text-sm font-semibold text-red-400">
            {formatTime(recordingTime)}
          </span>
          <span className="text-xs text-slate-400 truncate hidden sm:inline">
            Recording…
          </span>
        </div>

        {/* Cancel */}
        <button
          type="button"
          onClick={cancelRecording}
          className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-slate-700/50 transition-colors shrink-0"
          title="Cancel recording"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Send */}
        <button
          type="button"
          onClick={stopAndSend}
          className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md shrink-0 flex items-center justify-center min-w-[40px] min-h-[40px]"
          title="Send voice note"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
          </svg>
        </button>
      </div>
    )
  }

  // Idle state — mic button
  return (
    <button
      type="button"
      onClick={startRecording}
      disabled={disabled}
      className="p-2.5 sm:p-3 rounded-2xl bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/40 text-slate-300 hover:text-white disabled:opacity-40 transition-all shrink-0 active:scale-95 flex items-center justify-center min-w-[44px] min-h-[44px]"
      title="Record Voice Note"
    >
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
      </svg>
    </button>
  )
}
