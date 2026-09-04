'use client'

import { useState, useEffect, useRef } from 'react'

export interface Message {
  id: string
  sender_id: string
  message_type: 'text' | 'image' | 'video'
  message: string | null
  file_path: string | null
  file_type: string | null
  deleted_for_everyone: boolean
  created_at: string
  seen?: boolean
  reactions?: Record<string, string[]> // emoji -> array of user_ids or count
}

interface MessageBubbleProps {
  message: Message
  isOwn: boolean
  partnerUsername: string
  onDelete: (messageId: string, deleteType: 'for_me' | 'for_everyone') => void
  onReply?: (message: Message) => void
  onReact?: (messageId: string, emoji: string) => void
}

export default function MessageBubble({
  message,
  isOwn,
  partnerUsername,
  onDelete,
  onReply,
  onReact,
}: MessageBubbleProps) {
  const [showSheet, setShowSheet] = useState(false)
  const [mediaUrl, setMediaUrl] = useState<string | null>(null)
  const [loadingMedia, setLoadingMedia] = useState(false)
  const [copied, setCopied] = useState(false)
  const [activeReaction, setActiveReaction] = useState<string | null>(null)

  // Audio player state
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioDuration, setAudioDuration] = useState(0)
  const [audioProgress, setAudioProgress] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const isAudio = message.file_type?.startsWith('audio/') || false

  const time = new Date(message.created_at).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })

  // Load media URL
  useEffect(() => {
    if (
      (message.message_type === 'image' ||
        message.message_type === 'video' ||
        isAudio) &&
      message.file_path &&
      !message.deleted_for_everyone
    ) {
      setLoadingMedia(true)
      fetch(`/api/media/${message.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.url) setMediaUrl(data.url)
        })
        .catch(() => {})
        .finally(() => setLoadingMedia(false))
    }
  }, [message.id, message.message_type, message.file_path, message.deleted_for_everyone, isAudio])

  // Handle Audio duration and updates
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setAudioProgress(audioRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setAudioDuration(audioRef.current.duration)
    }
  }

  const toggleAudioPlay = () => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play()
      setIsPlaying(true)
    }
  }

  const handleCopyText = async () => {
    if (parsedContent.text) {
      await navigator.clipboard.writeText(parsedContent.text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
    setShowSheet(false)
  }

  const handleReactionSelect = (emoji: string) => {
    setActiveReaction(emoji === activeReaction ? null : emoji)
    if (onReact) onReact(message.id, emoji)
    setShowSheet(false)
  }

  // Parse quoted reply structure if encoded
  const parseMessageContent = (raw: string | null) => {
    if (!raw) return { reply: null, text: '' }
    if (raw.startsWith('{"reply":')) {
      try {
        const parsed = JSON.parse(raw)
        return { reply: parsed.reply, text: parsed.text }
      } catch {
        return { reply: null, text: raw }
      }
    }
    return { reply: null, text: raw }
  }

  const parsedContent = parseMessageContent(message.message)

  // Deleted for everyone message layout
  if (message.deleted_for_everyone) {
    return (
      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-1.5`}>
        <div
          className={`max-w-[85%] sm:max-w-[65%] px-4 py-2.5 rounded-2xl ${
            isOwn ? 'bg-slate-800/40 rounded-br-sm' : 'bg-slate-800/40 rounded-bl-sm'
          } border border-slate-700/30`}
        >
          <p className="text-slate-400 italic text-xs sm:text-sm flex items-center gap-1.5">
            <svg className="w-4 h-4 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
            This message was deleted
          </p>
          <p className="text-[10px] text-slate-500 mt-1 text-right">{time}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2 group relative`}>
      <div className="relative max-w-[85%] sm:max-w-[65%] select-text">
        {/* Message Bubble Container */}
        <div
          onClick={() => setShowSheet(true)}
          className={`px-3.5 py-2.5 rounded-2xl cursor-pointer transition-all ${
            isOwn
              ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-br-sm shadow-md shadow-indigo-950/20'
              : 'bg-slate-800/90 text-slate-100 rounded-bl-sm border border-slate-700/50 shadow-md'
          }`}
        >
          {/* Quoted Reply Banner inside Bubble */}
          {parsedContent.reply && (
            <div
              className={`mb-2 p-2 rounded-xl border-l-4 text-xs ${
                isOwn
                  ? 'bg-indigo-950/50 border-indigo-300 text-indigo-100'
                  : 'bg-slate-900/60 border-indigo-400 text-slate-300'
              }`}
            >
              <p className="font-semibold text-[11px] text-indigo-300 mb-0.5 truncate">
                Replying to {parsedContent.reply.username}
              </p>
              <p className="truncate text-slate-200 opacity-90">{parsedContent.reply.text}</p>
            </div>
          )}

          {/* Image & Video Content */}
          {(message.message_type === 'image' || message.message_type === 'video') && !isAudio && (
            <div className="mb-2 -mx-1 -mt-0.5 rounded-xl overflow-hidden bg-slate-900/40">
              {loadingMedia ? (
                <div className="w-full h-48 bg-slate-800/50 animate-pulse rounded-xl flex items-center justify-center">
                  <svg className="animate-spin h-6 w-6 text-indigo-400" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              ) : mediaUrl ? (
                message.message_type === 'image' ? (
                  <img
                    src={mediaUrl}
                    alt="Shared image"
                    className="max-w-full rounded-xl cursor-pointer hover:opacity-95 transition-opacity max-h-80 object-cover"
                    onClick={(e) => {
                      e.stopPropagation()
                      window.open(mediaUrl, '_blank')
                    }}
                  />
                ) : (
                  <video
                    src={mediaUrl}
                    controls
                    className="max-w-full rounded-xl max-h-80"
                    preload="metadata"
                    onClick={(e) => e.stopPropagation()}
                  />
                )
              ) : (
                <div className="w-full h-32 bg-slate-800/50 rounded-xl flex items-center justify-center">
                  <p className="text-slate-400 text-xs">Media unavailable</p>
                </div>
              )}
            </div>
          )}

          {/* Audio / Voice Note Player */}
          {isAudio && (
            <div className="my-1 min-w-[200px] sm:min-w-[240px]" onClick={(e) => e.stopPropagation()}>
              {mediaUrl ? (
                <div className="flex items-center gap-3 bg-slate-900/40 p-2.5 rounded-xl border border-slate-700/30">
                  <audio
                    ref={audioRef}
                    src={mediaUrl}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onEnded={() => setIsPlaying(false)}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={toggleAudioPlay}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shrink-0 ${
                      isOwn
                        ? 'bg-white text-indigo-600 hover:bg-indigo-50 shadow-md'
                        : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-md'
                    }`}
                  >
                    {isPlaying ? (
                      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 fill-current ml-0.5" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    )}
                  </button>

                  <div className="flex-1 min-w-0 space-y-1">
                    <input
                      type="range"
                      min={0}
                      max={audioDuration || 100}
                      value={audioProgress}
                      onChange={(e) => {
                        const newTime = Number(e.target.value)
                        setAudioProgress(newTime)
                        if (audioRef.current) audioRef.current.currentTime = newTime
                      }}
                      className="w-full h-1.5 bg-slate-700/60 rounded-lg appearance-none cursor-pointer accent-indigo-400"
                    />
                    <div className="flex justify-between items-center text-[10px] opacity-80">
                      <span>{formatAudioTime(audioProgress)}</span>
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3 text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                        </svg>
                        Voice note
                      </span>
                      <span>{formatAudioTime(audioDuration)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-10 bg-slate-800/40 animate-pulse rounded-xl flex items-center justify-center px-4">
                  <span className="text-xs text-slate-400">Loading voice note…</span>
                </div>
              )}
            </div>
          )}

          {/* Text Message Content */}
          {parsedContent.text && (
            <p className="text-sm whitespace-pre-wrap break-words leading-relaxed select-text">
              {parsedContent.text}
            </p>
          )}

          {/* Timestamp & Double Blue Ticks / Sent Status */}
          <div className="flex items-center justify-end gap-1 mt-1">
            <span className={`text-[10px] ${isOwn ? 'text-indigo-200/80' : 'text-slate-400'}`}>
              {time}
            </span>
            {isOwn && (
              message.seen ? (
                <span className="text-[12px] text-sky-300 font-bold flex items-center tracking-tighter" title="Seen by partner">
                  ✓✓
                </span>
              ) : (
                <span className="text-[12px] text-slate-400 font-semibold" title="Sent">
                  ✓
                </span>
              )
            )}
          </div>
        </div>

        {/* Reaction Pills on message bubble */}
        {(() => {
          const reactionsMap = message.reactions || {}
          const activeEmojis = Object.entries(reactionsMap)
            .filter(([_, userIds]) => Array.isArray(userIds) && userIds.length > 0)
            .map(([emoji, userIds]) => ({ emoji, count: userIds.length }))

          if (activeEmojis.length === 0 && !activeReaction) return null

          return (
            <div
              className={`absolute -bottom-2.5 ${
                isOwn ? 'right-2' : 'left-2'
              } flex items-center gap-1 bg-slate-900 border border-slate-700/70 rounded-full px-2 py-0.5 text-xs shadow-lg z-10`}
            >
              {activeEmojis.length > 0
                ? activeEmojis.map(({ emoji, count }) => (
                    <span key={emoji} className="flex items-center gap-0.5 select-none">
                      <span>{emoji}</span>
                      {count > 1 && <span className="text-[10px] text-slate-300 font-semibold">{count}</span>}
                    </span>
                  ))
                : activeReaction && <span className="select-none">{activeReaction}</span>}
            </div>
          )
        })()}

        {/* Action Trigger Button on Hover / Touch */}
        <button
          type="button"
          onClick={() => setShowSheet(true)}
          className={`absolute top-1 ${
            isOwn ? '-left-8' : '-right-8'
          } p-1.5 text-slate-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-lg hover:bg-slate-800/60`}
          title="Message options"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
          </svg>
        </button>
      </div>

      {/* 📱 WHATSAPP-STYLE BOTTOM ACTION SHEET FOR MOBILE & DESKTOP */}
      {showSheet && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setShowSheet(false)}
        >
          <div
            className="w-full sm:max-w-xs bg-slate-900 border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-4 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Quick Emoji Reactions Bar */}
            <div className="flex justify-between items-center bg-slate-800/80 p-2.5 rounded-2xl border border-slate-700/50">
              {['👍', '❤️', '😂', '😮', '😢', '🙏'].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleReactionSelect(emoji)}
                  className="text-2xl hover:scale-125 transition-transform active:scale-95"
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="space-y-1">
              {onReply && (
                <button
                  type="button"
                  onClick={() => {
                    onReply(message)
                    setShowSheet(false)
                  }}
                  className="w-full px-4 py-3 rounded-xl flex items-center gap-3 text-sm text-slate-200 hover:bg-slate-800 transition-colors font-medium"
                >
                  <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
                  </svg>
                  Reply
                </button>
              )}

              {parsedContent.text && (
                <button
                  type="button"
                  onClick={handleCopyText}
                  className="w-full px-4 py-3 rounded-xl flex items-center gap-3 text-sm text-slate-200 hover:bg-slate-800 transition-colors font-medium"
                >
                  <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5" />
                  </svg>
                  {copied ? 'Copied to Clipboard!' : 'Copy Text'}
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  onDelete(message.id, 'for_me')
                  setShowSheet(false)
                }}
                className="w-full px-4 py-3 rounded-xl flex items-center gap-3 text-sm text-slate-300 hover:bg-slate-800 transition-colors font-medium"
              >
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
                Delete for me
              </button>

              {isOwn && (
                <button
                  type="button"
                  onClick={() => {
                    onDelete(message.id, 'for_everyone')
                    setShowSheet(false)
                  }}
                  className="w-full px-4 py-3 rounded-xl flex items-center gap-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors font-medium border-t border-slate-800"
                >
                  <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.008v.008H12v-.008Z" />
                  </svg>
                  Delete for everyone
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowSheet(false)}
              className="w-full py-3 text-center text-sm font-semibold text-slate-400 hover:text-white bg-slate-800/60 rounded-xl"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function formatAudioTime(seconds: number) {
  if (!seconds || isNaN(seconds)) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`
}
