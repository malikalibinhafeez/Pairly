'use client'

import { useState, useEffect, useRef } from 'react'

interface Message {
  id: string
  sender_id: string
  message_type: 'text' | 'image' | 'video'
  message: string | null
  file_path: string | null
  file_type: string | null
  deleted_for_everyone: boolean
  created_at: string
  seen?: boolean
}

interface MessageBubbleProps {
  message: Message
  isOwn: boolean
  onDelete: (messageId: string, deleteType: 'for_me' | 'for_everyone') => void
}

export default function MessageBubble({ message, isOwn, onDelete }: MessageBubbleProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [mediaUrl, setMediaUrl] = useState<string | null>(null)
  const [loadingMedia, setLoadingMedia] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const time = new Date(message.created_at).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMenu])

  // Load media URL
  useEffect(() => {
    if ((message.message_type === 'image' || message.message_type === 'video') && message.file_path && !message.deleted_for_everyone) {
      setLoadingMedia(true)
      fetch(`/api/media/${message.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.url) setMediaUrl(data.url)
        })
        .catch(() => {})
        .finally(() => setLoadingMedia(false))
    }
  }, [message.id, message.message_type, message.file_path, message.deleted_for_everyone])

  // Deleted for everyone
  if (message.deleted_for_everyone) {
    return (
      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-1`}>
        <div className={`max-w-[75%] sm:max-w-[60%] px-4 py-2.5 rounded-2xl ${
          isOwn
            ? 'bg-slate-700/30 rounded-br-md'
            : 'bg-slate-700/30 rounded-bl-md'
        } border border-slate-700/30`}>
          <p className="text-slate-500 italic text-sm flex items-center gap-1.5">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
            This message was deleted
          </p>
          <p className="text-[10px] text-slate-600 mt-1 text-right">{time}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-1 group`}>
      <div className="relative max-w-[75%] sm:max-w-[60%]" ref={menuRef}>
        {/* Message bubble */}
        <div
          className={`px-4 py-2.5 rounded-2xl ${
            isOwn
              ? 'bg-indigo-600/80 text-white rounded-br-md'
              : 'bg-slate-700/60 text-slate-100 rounded-bl-md'
          } shadow-sm`}
        >
          {/* Media content */}
          {(message.message_type === 'image' || message.message_type === 'video') && (
            <div className="mb-2 -mx-1 -mt-0.5 rounded-xl overflow-hidden">
              {loadingMedia ? (
                <div className="w-full h-48 bg-slate-800/50 animate-pulse rounded-xl flex items-center justify-center">
                  <svg className="animate-spin h-6 w-6 text-slate-500" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              ) : mediaUrl ? (
                message.message_type === 'image' ? (
                  <img
                    src={mediaUrl}
                    alt="Shared image"
                    className="max-w-full rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => window.open(mediaUrl, '_blank')}
                  />
                ) : (
                  <video
                    src={mediaUrl}
                    controls
                    className="max-w-full rounded-xl"
                    preload="metadata"
                  />
                )
              ) : (
                <div className="w-full h-32 bg-slate-800/50 rounded-xl flex items-center justify-center">
                  <p className="text-slate-500 text-xs">Media unavailable</p>
                </div>
              )}
            </div>
          )}

          {/* Text content */}
          {message.message && (
            <p className="text-sm whitespace-pre-wrap break-words">{message.message}</p>
          )}

          {/* Timestamp & Seen status */}
          <div className="flex items-center justify-end gap-1.5 mt-1">
            <span className={`text-[10px] ${isOwn ? 'text-indigo-300/70' : 'text-slate-400'}`}>
              {time}
            </span>
            {isOwn && (
              message.seen ? (
                <span className="text-[11px] text-sky-400 font-bold flex items-center gap-0.5" title="Seen">
                  ✓✓ <span className="text-[9px] font-normal opacity-90">Seen</span>
                </span>
              ) : (
                <span className="text-[11px] text-slate-400 font-semibold" title="Sent">
                  ✓
                </span>
              )
            )}
          </div>
        </div>

        {/* Three-dot menu button */}
        <button
          onClick={() => setShowMenu(!showMenu)}
          className={`absolute top-1 ${isOwn ? '-left-8' : '-right-8'} p-1 text-slate-600 hover:text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg hover:bg-slate-700/50`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
          </svg>
        </button>

        {/* Context Menu */}
        {showMenu && (
          <div className={`absolute top-0 ${isOwn ? '-left-44' : '-right-44'} z-50 w-40 bg-slate-800 border border-slate-700/50 rounded-xl shadow-xl overflow-hidden`}>
            <button
              onClick={() => {
                onDelete(message.id, 'for_me')
                setShowMenu(false)
              }}
              className="w-full px-4 py-2.5 text-left text-sm text-slate-300 hover:bg-slate-700/50 transition-colors"
            >
              Delete for me
            </button>
            {isOwn && (
              <button
                onClick={() => {
                  onDelete(message.id, 'for_everyone')
                  setShowMenu(false)
                }}
                className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-slate-700/50 transition-colors border-t border-slate-700/30"
              >
                Delete for everyone
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
