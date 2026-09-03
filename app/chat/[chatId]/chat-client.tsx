'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import MessageBubble from '@/components/message-bubble'
import FileUpload from '@/components/file-upload'

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

interface Props {
  chatId: string
  currentUserId: string
  partnerUsername: string
  initialMessages: Message[]
  unlockCodes: string[] // Signup connection codes for both participants
}

export default function ChatClient({
  chatId,
  currentUserId,
  partnerUsername,
  initialMessages,
  unlockCodes,
}: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [text, setText] = useState('')
  const [uploading, setUploading] = useState(false)

  // Presence State (Online / Offline indicator)
  const [isPartnerOnline, setIsPartnerOnline] = useState(false)

  // Session Lock State (Locks every time tab/browser/app is closed & re-opened)
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false)
  const [codeInput, setCodeInput] = useState('')
  const [codeError, setCodeError] = useState<string | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Session-based Lock Check
  useEffect(() => {
    const unlockStatus = sessionStorage.getItem(`chat_unlocked_${chatId}`)
    if (unlockStatus === 'true') {
      setIsUnlocked(true)
    } else {
      setIsUnlocked(false)
    }
  }, [chatId])

  // 🔒 INSTANT AUTO-LOCK ON APP SWITCH, FLOATING WINDOW, TAB BLUR & SCREEN LOCK
  useEffect(() => {
    function lockChatOnSwitch() {
      sessionStorage.removeItem(`chat_unlocked_${chatId}`)
      setIsUnlocked(false)
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'hidden') {
        lockChatOnSwitch()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('blur', lockChatOnSwitch)
    window.addEventListener('pagehide', lockChatOnSwitch)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('blur', lockChatOnSwitch)
      window.removeEventListener('pagehide', lockChatOnSwitch)
    }
  }, [chatId])

  // Scroll to bottom when unlocked and new messages arrive
  useEffect(() => {
    if (isUnlocked) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isUnlocked])

  // 🔴 1. REALTIME PRESENCE TRACKING (ONLINE / OFFLINE)
  useEffect(() => {
    if (!isUnlocked) return

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
  }, [chatId, currentUserId, isUnlocked, supabase])

  // 👁️ 2. MARK MESSAGES AS SEEN (READ RECEIPTS)
  const markMessagesAsSeen = useCallback(async () => {
    if (!isUnlocked) return

    // Find any unread messages sent by partner
    const hasUnread = messages.some(
      (m) => m.sender_id !== currentUserId && !m.seen
    )

    if (hasUnread) {
      setMessages((prev) =>
        prev.map((m) =>
          m.sender_id !== currentUserId ? { ...m, seen: true } : m
        )
      )
      await fetch('/api/messages/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId }),
      })
    }
  }, [chatId, currentUserId, isUnlocked, messages])

  useEffect(() => {
    if (isUnlocked) {
      markMessagesAsSeen()
    }
  }, [isUnlocked, messages.length, markMessagesAsSeen])

  // 📡 3. REALTIME MESSAGES & UPDATES SUBSCRIPTION
  useEffect(() => {
    const channel = supabase
      .channel(`chat:${chatId}`)
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
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [chatId, supabase])

  // Unlock Chat Form Submit
  function handleUnlock(e: React.FormEvent) {
    e.preventDefault()
    setCodeError(null)

    const entered = codeInput.trim().toUpperCase()
    const formattedValidCodes = unlockCodes.map((c) => c.trim().toUpperCase())

    if (formattedValidCodes.includes(entered)) {
      sessionStorage.setItem(`chat_unlocked_${chatId}`, 'true')
      setIsUnlocked(true)
      setCodeInput('')
    } else {
      setCodeError('Incorrect Connection Code! Enter the signup code of either user.')
    }
  }

  async function sendText(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return

    const tempId = `temp-${Date.now()}-${Math.random()}`
    const tempMsg: Message = {
      id: tempId,
      sender_id: currentUserId,
      message_type: 'text',
      message: trimmed,
      file_path: null,
      file_type: null,
      deleted_for_everyone: false,
      created_at: new Date().toISOString(),
      seen: false,
    }

    // ⚡ Optimistic Update: Instant UI update
    setMessages((prev) => [...prev, tempMsg])
    setText('')

    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, message: trimmed }),
      })

      if (!res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== tempId))
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
    }
  }

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

  return (
    <div className="flex flex-col h-[100dvh] bg-slate-950 overflow-hidden relative select-none">

      {/* 🔒 SIGNUP CONNECTION CODE LOCK SCREEN */}
      {!isUnlocked && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-2xl flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-600/20 border border-indigo-500/30 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-indigo-500/10">
              <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
            </div>

            <h2 className="text-xl font-bold text-white mb-1">Chat Locked 🔒</h2>
            <p className="text-slate-400 text-xs mb-6">
              Enter the 12-character Connection Code (signup code of either user) to open this chat with @{partnerUsername}.
            </p>

            {codeError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                {codeError}
              </div>
            )}

            <form onSubmit={handleUnlock} className="space-y-4">
              <input
                type="text"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                maxLength={12}
                placeholder="12-CHAR CODE"
                className="w-full px-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700/60 text-white text-center font-mono tracking-widest uppercase placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-base"
                autoFocus
              />
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-semibold hover:from-indigo-600 hover:to-violet-700 transition-all text-sm shadow-lg shadow-indigo-500/20"
              >
                Unlock Chat
              </button>
            </form>

            <Link href="/dashboard" className="block mt-4 text-xs text-slate-500 hover:text-slate-400">
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="shrink-0 border-b border-slate-800/60 bg-slate-950/90 backdrop-blur-xl z-10">
        <div className="max-w-3xl mx-auto px-3 sm:px-4 py-3 flex items-center gap-3">
          <Link
            href="/dashboard"
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all shrink-0"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
          </Link>

          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500/40 to-violet-600/40 border border-indigo-500/20 flex items-center justify-center shrink-0 relative">
              <span className="text-sm font-bold text-indigo-300">
                {partnerUsername[0]?.toUpperCase()}
              </span>
              {isPartnerOnline && (
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-950" />
              )}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-white text-sm truncate">@{partnerUsername}</p>
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-4">
        <div className="max-w-3xl mx-auto space-y-1">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-800/60 flex items-center justify-center mb-4">
                <svg className="w-7 h-7 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
                </svg>
              </div>
              <p className="text-slate-400 text-sm font-medium">No messages yet</p>
              <p className="text-slate-600 text-xs mt-1">Say hi to @{partnerUsername}!</p>
            </div>
          )}
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isOwn={msg.sender_id === currentUserId}
              onDelete={handleDelete}
            />
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input bar */}
      <div className="shrink-0 border-t border-slate-800/60 bg-slate-950/90 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3">
          <form onSubmit={sendText} className="flex items-end gap-2 sm:gap-3">
            <FileUpload onFileSelected={handleFileSelected} uploading={uploading} />
            <div className="flex-1 relative">
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
                className="w-full px-4 py-3 rounded-2xl bg-slate-800/60 border border-slate-700/40 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/40 transition-all text-base sm:text-sm resize-none max-h-36 leading-relaxed"
              />
            </div>
            <button
              id="send-btn"
              type="submit"
              disabled={!text.trim()}
              className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:from-indigo-600 hover:to-violet-700 transition-all shadow-lg shadow-indigo-500/20 active:scale-95 shrink-0"
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
