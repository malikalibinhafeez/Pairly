'use client'

import { useState, useRef, useEffect } from 'react'

interface VoiceRecorderProps {
  onAudioRecorded: (file: File) => void
  disabled?: boolean
}

export default function VoiceRecorder({ onAudioRecorded, disabled }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioChunksRef.current = []

      // Pick MIME type supported by browser
      let mimeType = 'audio/webm'
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4'
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
          mimeType = 'audio/ogg'
        }
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = () => {
        // Stop stream tracks
        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorder.start(100)
      setIsRecording(true)
      setRecordingTime(0)

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    } catch (err) {
      console.error('Microphone permission or recording error:', err)
      alert('Microphone access is required to record voice notes.')
    }
  }

  function stopAndSend() {
    if (!mediaRecorderRef.current || !isRecording) return

    if (timerRef.current) clearInterval(timerRef.current)

    const mediaRecorder = mediaRecorderRef.current
    mediaRecorder.onstop = () => {
      mediaRecorder.stream.getTracks().forEach((track) => track.stop())

      const audioBlob = new Blob(audioChunksRef.current, {
        type: mediaRecorder.mimeType || 'audio/webm',
      })
      const ext = mediaRecorder.mimeType.includes('mp4') ? 'm4a' : 'webm'
      const audioFile = new File([audioBlob], `voice-note-${Date.now()}.${ext}`, {
        type: audioBlob.type,
      })

      onAudioRecorded(audioFile)
      setIsRecording(false)
      setRecordingTime(0)
    }

    mediaRecorder.stop()
  }

  function cancelRecording() {
    if (!mediaRecorderRef.current || !isRecording) return

    if (timerRef.current) clearInterval(timerRef.current)

    const mediaRecorder = mediaRecorderRef.current
    mediaRecorder.onstop = () => {
      mediaRecorder.stream.getTracks().forEach((track) => track.stop())
      setIsRecording(false)
      setRecordingTime(0)
      audioChunksRef.current = []
    }

    mediaRecorder.stop()
  }

  function formatTime(seconds: number) {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`
  }

  if (isRecording) {
    return (
      <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700/60 rounded-2xl px-3 py-2 text-white animate-fade-in w-full">
        {/* Recording pulsing dot */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
          <span className="font-mono text-sm font-semibold text-red-400">
            {formatTime(recordingTime)}
          </span>
          <span className="text-xs text-slate-400 truncate hidden sm:inline">
            Recording voice note…
          </span>
        </div>

        {/* Cancel Recording */}
        <button
          type="button"
          onClick={cancelRecording}
          className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-slate-700/50 transition-colors shrink-0"
          title="Cancel recording"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
          </svg>
        </button>

        {/* Send Recording */}
        <button
          type="button"
          onClick={stopAndSend}
          className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md shrink-0 flex items-center justify-center"
          title="Send voice note"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
          </svg>
        </button>
      </div>
    )
  }

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
