'use client'

import { useRef, useState } from 'react'

interface FileUploadProps {
  onFileSelected: (file: File) => void
  uploading: boolean
}

const ALLOWED = ['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime']
const MAX_SIZE = 10 * 1024 * 1024

export default function FileUpload({ onFileSelected, uploading }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!ALLOWED.includes(file.type)) {
      setError('Only images (JPG, PNG, WEBP, GIF) and videos (MP4, WEBM, MOV) are allowed.')
      if (inputRef.current) inputRef.current.value = ''
      setTimeout(() => setError(null), 4000)
      return
    }

    if (file.size > MAX_SIZE) {
      setError('File must be under 10 MB.')
      if (inputRef.current) inputRef.current.value = ''
      setTimeout(() => setError(null), 4000)
      return
    }

    setError(null)
    onFileSelected(file)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        id="file-input"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
        onChange={handleChange}
        className="sr-only"
        disabled={uploading}
      />
      <button
        id="attach-btn"
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/40 text-slate-400 hover:text-indigo-400 hover:bg-slate-700/60 hover:border-indigo-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        title="Attach image or video"
      >
        {uploading ? (
          <svg className="animate-spin h-5 w-5 text-indigo-400" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
          </svg>
        )}
      </button>
      {error && (
        <div className="absolute bottom-14 left-0 w-64 p-3 rounded-xl bg-red-900/80 border border-red-500/30 text-red-300 text-xs shadow-xl backdrop-blur-sm z-50">
          {error}
        </div>
      )}
    </div>
  )
}
