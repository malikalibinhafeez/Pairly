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
}

interface Props {
  chatId: string
  currentUserId: string
  partnerUsername: string
  initialMessages: Message[]
}

export default function ChatClient({
  chatId,
  currentUserId,
  partnerUsername,
  initialMessages,
}: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Realtime subscription
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
              if (prev.find((m) => m.id === newMsg.id)) return prev
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

  async function sendText(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || sending) return

    setSending(true)
    setText('')

    const res = await fetch('/api/messages/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId, message: trimmed }),
    })

    if (!res.ok) {
      console.error('Send failed')
    }
    setSending(false)
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
    <div className="flex flex-col h-screen bg-slate-950">
      {/* Header */}
      <header className="shrink-0 border-b border-slate-800/60 bg-slate-950/90 backdrop-blur-xl z-10">
        <div className="max-w-3xl mx-auto px-4 py-3.5 flex items-center gap-4">
          <Link
            href="/dashboard"
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
          </Link>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500/40 to-violet-600/40 border border-indigo-500/20 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-indigo-300">
                {partnerUsername[0]?.toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-white text-sm truncate">@{partnerUsername}</p>
              <p className="text-xs text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                Private chat
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
              </svg>
            </div>
            <span className="font-bold text-sm bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent hidden sm:block">
              Pairly
            </span>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
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
        <div className="max-w-3xl mx-auto px-4 py-3">
          <form onSubmit={sendText} className="flex items-end gap-3">
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
                className="w-full px-4 py-3 rounded-2xl bg-slate-800/60 border border-slate-700/40 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/40 transition-all text-sm resize-none max-h-36 leading-relaxed"
              />
            </div>
            <button
              id="send-btn"
              type="submit"
              disabled={!text.trim() || sending}
              className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:from-indigo-600 hover:to-violet-700 transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
            >
              {sending ? (
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                </svg>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
