'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { verifyQuickCode } from './actions'

// 4 hours in milliseconds
const FRESH_WINDOW_MS = 4 * 60 * 60 * 1000
const LS_KEY = 'pairly_last_login_at'

interface Props {
  username?: string | null
}

export default function QuickAccessClient({ username }: Props = {}) {
  const router = useRouter()
  const [checking, setChecking] = useState(true)   // checking localStorage
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Read last full-login timestamp from localStorage
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) {
      // Never stored → session might be from SSR cookie only → require full login
      router.replace('/auth/login')
      return
    }

    const lastLoginAt = parseInt(raw, 10)
    const ageMs = Date.now() - lastLoginAt

    if (ageMs > FRESH_WINDOW_MS) {
      // Session older than 4 hours → require full login
      localStorage.removeItem(LS_KEY)
      router.replace('/auth/login')
      return
    }

    // Session is fresh — show the code entry screen
    setChecking(false)
  }, [router])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const result = await verifyQuickCode(formData)

    if (result?.error) {
      setError(result.error)
      setLoading(false)
    } else {
      // Refresh quick access timestamp on successful verification
      try { localStorage.setItem(LS_KEY, Date.now().toString()) } catch { /* ignore */ }
    }
  }

  // While checking localStorage, show nothing (avoids flash)
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <svg className="animate-spin h-8 w-8 text-indigo-400" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-slate-950">
      {/* Background blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] rounded-full bg-violet-600/10 blur-[120px]" />
      </div>

      <div className="w-full max-w-sm relative z-10">
        {/* Brand */}
        <div className="text-center mb-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/30">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 0 1 21.75 8.25Z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">
            {username ? `Welcome back, @${username}` : 'Quick Access'}
          </h1>
          <p className="text-slate-400 text-sm">Enter your secret code to continue</p>
        </div>

        {/* Code Entry Card */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 shadow-2xl">
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2" htmlFor="quick-code">
                Your Secret Code
              </label>
              <input
                id="quick-code"
                name="code"
                type="text"
                required
                autoFocus
                autoComplete="off"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. MYSECRET123"
                className="w-full px-4 py-3.5 rounded-xl bg-slate-800/60 border border-slate-700/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all text-base font-mono tracking-[0.2em] text-center uppercase"
              />
            </div>

            <button
              id="quick-submit"
              type="submit"
              disabled={loading || !code.trim()}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-semibold hover:from-indigo-600 hover:to-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-500/20 active:scale-[0.99]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Verifying…
                </span>
              ) : 'Enter →'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-800/60 text-center">
            <p className="text-xs text-slate-600">
              Session expired?{' '}
              <button
                onClick={() => router.push('/auth/login')}
                className="text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
              >
                Full login →
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
