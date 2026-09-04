'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const LS_KEY = 'pairly_last_login_at'

export default function AutoLogoutListener() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function handleAutoLogout() {
      try {
        await supabase.auth.signOut()
      } catch {
        // ignore
      }
      // Clear the quick-access session timestamp so next entry requires full login
      try { localStorage.removeItem(LS_KEY) } catch { /* ignore */ }
      // Redirect to grammar landing (disguise) instead of exposing login page
      router.push('/')
      router.refresh()
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'hidden') {
        handleAutoLogout()
      }
    }

    function handleBlur() {
      handleAutoLogout()
    }

    function handlePageHide() {
      handleAutoLogout()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('blur', handleBlur)
    window.addEventListener('pagehide', handlePageHide)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('blur', handleBlur)
      window.removeEventListener('pagehide', handlePageHide)
    }
  }, [router, supabase])

  return null
}
