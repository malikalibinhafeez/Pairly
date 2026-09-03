'use client'

import { useRef } from 'react'

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
  'video/quicktime',
]

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

interface FileUploadProps {
  onFileSelect: (file: File) => void
  disabled?: boolean
}

export default function FileUpload({ onFileSelect, disabled }: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleClick() {
    fileInputRef.current?.click()
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      alert('File type not supported. Allowed: JPG, PNG, WEBP, GIF, MP4, WEBM, MOV')
      return
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      alert('File size must be 10 MB or less.')
      return
    }

    onFileSelect(file)

    // Reset input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
        className="hidden"
        onChange={handleChange}
      />
      <button
        onClick={handleClick}
        disabled={disabled}
        className="p-3 text-slate-400 hover:text-indigo-400 rounded-2xl hover:bg-slate-700/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
        title="Attach photo or video"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
        </svg>
      </button>
    </>
  )
}
