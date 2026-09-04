'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import MessageBubble, { Message } from '@/components/message-bubble'
import FileUpload from '@/components/file-upload'
import VoiceRecorder from '@/components/voice-recorder'
import AutoLogoutListener from '@/components/auto-logout-listener'

interface Props {
  chatId: string
  currentUserId: string
  partnerUsername: string
  initialMessages: Message[]
  unlockCodes?: string[]
}

export default function ChatClient({
  chatId,
  currentUserId,
  partnerUsername,
  initialMessages,
}: Props) {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [text, setText] = useState('')
  const [uploading, setUploading] = useState(false)
  const [isPartnerOnline, setIsPartnerOnline] = useState(false)

  // Reply State
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // 🔄 Auto-refresh sync interval so browser content updates automatically without manual reload
  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh()
    }, 3000)

    return () => clearInterval(interval)
  }, [router])

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 🔴 1. REALTIME PRESENCE TRACKING (ONLINE / OFFLINE)
  useEffect(() => {
    const channel = supabase.channel(`presence:chat:${chatId}`, {
      config: { presence: { key: currentUserId } },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const userIds = Object.keys(state)
        const partnerActive = userIds.some((id) => id !== currentUserId)
        setIsPartnerOnline(partnerActive)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString() })
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [chatId, currentUserId, supabase])

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  // 👁️ 2. MARK MESSAGES AS SEEN (READ RECEIPTS)
  const markMessagesAsSeen = useCallback(async () => {
    const hasUnread = messages.some(
      (m) => m.sender_id !== currentUserId && !m.seen
    )

    if (hasUnread) {
      setMessages((prev) =>
        prev.map((m) =>
          m.sender_id !== currentUserId ? { ...m, seen: true } : m
        )
      )

      // Broadcast to partner in real-time
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'messages_read',
          payload: { readerId: currentUserId },
        })
      }

      await fetch('/api/messages/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId }),
      })
    }
  }, [chatId, currentUserId, messages])

  useEffect(() => {
    markMessagesAsSeen()
  }, [messages.length, markMessagesAsSeen])

  // 📡 3. REALTIME MESSAGES, SEEN RECEIPTS, & REACTIONS SUBSCRIPTION
  useEffect(() => {
    const channel = supabase.channel(`chat:${chatId}`, {
      config: { broadcast: { self: true } },
    })

    channelRef.current = channel

    channel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMsg = payload.new as Message
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev
              const tempIdx = prev.findIndex(
                (m) =>
                  m.id.startsWith('temp-') &&
                  m.sender_id === newMsg.sender_id &&
                  m.message === newMsg.message
              )
              if (tempIdx !== -1) {
                const updated = [...prev]
                updated[tempIdx] = newMsg
                return updated
              }
              return [...prev, newMsg]
            })
          } else if (payload.eventType === 'UPDATE') {
            setMessages((prev) =>
              prev.map((m) => (m.id === payload.new.id ? { ...m, ...payload.new } : m))
            )
          }
        }
      )
      .on('broadcast', { event: 'messages_read' }, (payload) => {
        const { readerId } = payload.payload || {}
        if (readerId && readerId !== currentUserId) {
          // Partner has read our messages -> mark sent messages as seen = true (sky blue ✓✓)
          setMessages((prev) =>
            prev.map((m) => (m.sender_id === currentUserId ? { ...m, seen: true } : m))
          )
        }
      })
      .on('broadcast', { event: 'message_reaction' }, (payload) => {
        const { messageId, emoji, userId } = payload.payload || {}
        if (messageId && emoji && userId) {
          setMessages((prev) =>
            prev.map((m) => {
              if (m.id === messageId) {
                const currentReactions = m.reactions || {}
                const userList = currentReactions[emoji] || []
                const updatedList = userList.includes(userId)
                  ? userList.filter((id) => id !== userId)
                  : [...userList, userId]
                return {
                  ...m,
                  reactions: {
                    ...currentReactions,
                    [emoji]: updatedList,
                  },
                }
              }
              return m
            })
          )
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [chatId, currentUserId, supabase])

  // Send Text Message (with optional Quoted Reply)
  async function sendText(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return

    let finalMessagePayload = trimmed

    if (replyingTo) {
      // Parse replying to text preview
      let replyPreviewText = replyingTo.message || ''
      if (replyPreviewText.startsWith('{"reply":')) {
        try {
          replyPreviewText = JSON.parse(replyPreviewText).text
        } catch {
          // fallback
        }
      }
      if (!replyPreviewText) {
        replyPreviewText = replyingTo.file_type?.startsWith('audio/')
          ? 'Voice note'
          : replyingTo.message_type === 'image'
          ? 'Image'
          : 'Media'
      }

      finalMessagePayload = JSON.stringify({
        reply: {
          id: replyingTo.id,
          username: replyingTo.sender_id === currentUserId ? 'You' : `@${partnerUsername}`,
          text: replyPreviewText.length > 60 ? replyPreviewText.substring(0, 60) + '…' : replyPreviewText,
        },
        text: trimmed,
      })
    }

    const tempId = `temp-${Date.now()}-${Math.random()}`
    const tempMsg: Message = {
      id: tempId,
      sender_id: currentUserId,
      message_type: 'text',
      message: finalMessagePayload,
      file_path: null,
      file_type: null,
      deleted_for_everyone: false,
      created_at: new Date().toISOString(),
      seen: false,
    }

    // ⚡ Optimistic Update: Instant UI update
    setMessages((prev) => [...prev, tempMsg])
    setText('')
    setReplyingTo(null)

    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, message: finalMessagePayload }),
      })

      if (!res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== tempId))
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
    }
  }

  // File Upload (Images / Videos)
  async function handleFileSelected(file: File) {
    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('chatId', chatId)

    const res = await fetch('/api/messages/upload', {
      method: 'POST',
      body: formData,
    })

    if (!res.ok) {
      console.error('Upload failed')
    }
    setUploading(false)
  }

  // Voice Note Upload
  async function handleAudioRecorded(audioFile: File) {
    setUploading(true)
    const formData = new FormData()
    formData.append('file', audioFile)
    formData.append('chatId', chatId)

    const res = await fetch('/api/messages/upload', {
      method: 'POST',
      body: formData,
    })

    if (!res.ok) {
      console.error('Voice note upload failed')
    }
    setUploading(false)
  }

  // Delete Message ('for_me' or 'for_everyone')
  const handleDelete = useCallback(
    async (messageId: string, deleteType: 'for_me' | 'for_everyone') => {
      if (deleteType === 'for_me') {
        setMessages((prev) => prev.filter((m) => m.id !== messageId))
      } else {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId ? { ...m, deleted_for_everyone: true } : m
          )
        )
      }

      await fetch('/api/messages/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, deleteType }),
      })
    },
    []
  )

  // React to message with emoji
  const handleReact = useCallback(
    async (messageId: string, emoji: string) => {
      // 1. Optimistic local UI update
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id === messageId) {
            const currentReactions = m.reactions || {}
            const userList = currentReactions[emoji] || []
            const updatedList = userList.includes(currentUserId)
              ? userList.filter((id) => id !== currentUserId)
              : [...userList, currentUserId]
            return {
              ...m,
              reactions: {
                ...currentReactions,
                [emoji]: updatedList,
              },
            }
          }
          return m
        })
      )

      // 2. Broadcast reaction to partner instantly via Realtime
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'message_reaction',
          payload: { messageId, emoji, userId: currentUserId },
        })
      }

      // 3. Persist reaction to DB
      try {
        await fetch('/api/messages/reaction', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messageId, emoji, chatId }),
        })
      } catch {
        // ignore
      }
    },
    [chatId, currentUserId]
  )

  return (
    <div className="flex flex-col h-[100dvh] bg-slate-950 overflow-hidden relative select-none">
      {/* Top Header */}
      <header className="shrink-0 border-b border-slate-800/60 bg-slate-950/90 backdrop-blur-xl z-20 sticky top-0">
        <div className="max-w-3xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center gap-3">
          <Link
            href="/dashboard"
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all shrink-0 active:scale-95"
            title="Back to Dashboard"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
          </Link>

          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-indigo-500/40 to-violet-600/40 border border-indigo-500/20 flex items-center justify-center shrink-0 relative">
              <span className="text-sm font-bold text-indigo-300">
                {partnerUsername[0]?.toUpperCase()}
              </span>
              {isPartnerOnline && (
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-slate-950" />
              )}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-white text-sm sm:text-base truncate leading-tight">@{partnerUsername}</p>
              {isPartnerOnline ? (
                <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                  Online
                </p>
              ) : (
                <p className="text-[11px] text-slate-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500 inline-block" />
                  Offline
                </p>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Messages Scrollable Container */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 touch-pan-y">
        <div className="max-w-3xl mx-auto space-y-1">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-800/60 flex items-center justify-center mb-4 border border-slate-700/40">
                <svg className="w-7 h-7 text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
                </svg>
              </div>
              <p className="text-slate-300 text-sm font-semibold">Start the conversation</p>
              <p className="text-slate-500 text-xs mt-1">Send a message or voice note to @{partnerUsername}</p>
            </div>
          )}
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isOwn={msg.sender_id === currentUserId}
              partnerUsername={partnerUsername}
              onDelete={handleDelete}
              onReply={(m) => setReplyingTo(m)}
              onReact={handleReact}
            />
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Bottom Input Area */}
      <div className="shrink-0 border-t border-slate-800/60 bg-slate-950/95 backdrop-blur-xl z-20 pb-[env(safe-area-inset-bottom)]">
        {/* Quoted Reply Banner above input */}
        {replyingTo && (
          <div className="max-w-3xl mx-auto px-3 sm:px-4 pt-2">
            <div className="bg-slate-900 border-l-4 border-indigo-500 rounded-xl p-2.5 flex items-center justify-between gap-3 text-xs">
              <div className="min-w-0">
                <p className="font-semibold text-indigo-400 truncate">
                  Replying to {replyingTo.sender_id === currentUserId ? 'yourself' : `@${partnerUsername}`}
                </p>
                <p className="text-slate-300 truncate">
                  {replyingTo.message?.startsWith('{"reply":')
                    ? JSON.parse(replyingTo.message).text
                    : replyingTo.message || (replyingTo.file_type?.startsWith('audio/') ? 'Voice Note' : 'Media')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReplyingTo(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        <div className="max-w-3xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3">
          <form onSubmit={sendText} className="flex items-end gap-2">
            {/* Media File Upload Button */}
            <FileUpload onFileSelected={handleFileSelected} uploading={uploading} />

            {/* Voice Recorder Button */}
            <VoiceRecorder onAudioRecorded={handleAudioRecorded} disabled={uploading} />

            {/* Message Input Field */}
            <div className="flex-1 relative min-w-0">
              <textarea
                id="message-input"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    sendText(e as unknown as React.FormEvent)
                  }
                }}
                placeholder={`Message @${partnerUsername}…`}
                rows={1}
                className="w-full px-4 py-3 rounded-2xl bg-slate-800/70 border border-slate-700/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all text-base sm:text-sm resize-none max-h-36 leading-relaxed"
              />
            </div>

            {/* Send Button */}
            <button
              id="send-btn"
              type="submit"
              disabled={!text.trim()}
              className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:from-indigo-600 hover:to-violet-700 transition-all shadow-lg shadow-indigo-500/20 active:scale-95 shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
              title="Send Message"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
