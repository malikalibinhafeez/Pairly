'use client'

import { useState } from 'react'
import Link from 'next/link'
import { connectWithCode, deleteChat } from './actions'

interface Chat {
  id: string
  partnerUsername: string
}

interface Props {
  connectionCode: string
  chatList: Chat[]
  username: string
}

export default function DashboardClient({ connectionCode, chatList, username }: Props) {
  return (
    <div className="space-y-6">
      {/* Your Code Card */}
      <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-700/40 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 0 1 21.75 8.25Z" />
            </svg>
          </div>
          <h2 className="font-semibold text-white">Your Connection Code</h2>
        </div>
        <p className="text-slate-400 text-sm mb-4">Share this code with someone to start a private chat</p>
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-slate-800/80 border border-slate-700/40 rounded-xl px-4 py-3">
            <span className="font-mono text-xl font-bold tracking-[0.2em] bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              {connectionCode}
            </span>
          </div>
          <CopyButton code={connectionCode} />
        </div>
      </div>

      {/* Connect with someone */}
      <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-700/40 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
            </svg>
          </div>
          <h2 className="font-semibold text-white">Connect with Someone</h2>
        </div>
        <p className="text-slate-400 text-sm mb-4">Enter their 12-character code to start chatting</p>
        <ConnectForm />
      </div>

      {/* Chats */}
      <div>
        <h2 className="font-semibold text-white mb-3 flex items-center gap-2 text-sm">
          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 0 1 .778-.332 48.294 48.294 0 0 0 5.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
          </svg>
          Your Chats
        </h2>

        {chatList.length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-800/40 rounded-2xl p-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-800/60 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
              </svg>
            </div>
            <p className="text-slate-400 font-medium">No chats yet</p>
            <p className="text-slate-600 text-sm mt-1">Connect with someone using their code above</p>
          </div>
        ) : (
          <div className="space-y-2">
            {chatList.map((chat) => (
              <ChatRow key={chat.id} chatId={chat.id} partnerUsername={chat.partnerUsername} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      id="copy-code-btn"
      onClick={copy}
      className="px-4 py-3 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-400 hover:text-indigo-300 transition-all text-sm font-medium whitespace-nowrap"
    >
      {copied ? '✓ Copied!' : 'Copy'}
    </button>
  )
}

function ConnectForm() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const formData = new FormData(e.currentTarget)
    const result = await connectWithCode(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <form onSubmit={handleSubmit} className="flex gap-3">
        <input
          id="connect-code-input"
          name="code"
          type="text"
          maxLength={12}
          placeholder="Enter 12-char code"
          className="flex-1 px-4 py-3 rounded-xl bg-slate-800/60 border border-slate-700/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all text-sm font-mono tracking-wider uppercase"
        />
        <button
          id="connect-submit"
          type="submit"
          disabled={loading}
          className="px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-semibold hover:from-indigo-600 hover:to-violet-700 disabled:opacity-60 transition-all shadow-lg shadow-indigo-500/20 text-sm whitespace-nowrap"
        >
          {loading ? '...' : 'Connect'}
        </button>
      </form>
      {error && (
        <p className="text-red-400 text-xs px-1">{error}</p>
      )}
    </div>
  )
}

function ChatRow({ chatId, partnerUsername }: { chatId: string; partnerUsername: string }) {
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const [deleted, setDeleted] = useState(false)

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setLoading(true)
    await deleteChat(chatId)
    setDeleted(true)
    setLoading(false)
  }

  if (deleted) return null

  return (
    <div className="relative bg-slate-900/60 hover:bg-slate-800/60 border border-slate-700/40 hover:border-slate-600/40 rounded-2xl transition-all overflow-hidden active:scale-[0.99] touch-manipulation">
      <Link
        href={`/chat/${chatId}`}
        className="flex items-center justify-between gap-4 px-5 py-4 w-full h-full cursor-pointer"
      >
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-500/30 to-violet-600/30 border border-indigo-500/20 flex items-center justify-center shrink-0">
            <span className="text-lg font-bold text-indigo-300">
              {partnerUsername[0]?.toUpperCase() ?? '?'}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-white truncate text-base">@{partnerUsername}</p>
            <p className="text-indigo-400 text-xs flex items-center gap-1 font-medium mt-0.5">
              <span>Tap to open chat</span>
              <span>→</span>
            </p>
          </div>
        </div>

        {confirming ? (
          <div className="flex gap-2 shrink-0 z-10" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
            <button
              onClick={handleDelete}
              disabled={loading}
              className="text-xs px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 transition-all font-medium"
            >
              {loading ? '...' : 'Yes, delete'}
            </button>
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setConfirming(false)
              }}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-700/50 text-slate-300 transition-all"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setConfirming(true)
            }}
            className="p-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0 z-10"
            title="Delete chat"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
            </svg>
          </button>
        )}
      </Link>
    </div>
  )
}
