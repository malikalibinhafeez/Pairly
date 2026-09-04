'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

/**
 * Verify secret connection_code.
 * If user has active session: verifies code against current user profile.
 * If user was logged out (auto-logout): looks up user by code & restores session.
 */
export async function verifyQuickCode(formData: FormData) {
  const enteredCode = (formData.get('code') as string)?.trim().toUpperCase()
  if (!enteredCode) {
    return { error: 'Please enter your secret code.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    // Active session exists — check profile code
    const { data: profile } = await supabase
      .from('profiles')
      .select('connection_code')
      .eq('id', user.id)
      .single()

    if (!profile || profile.connection_code?.toUpperCase() !== enteredCode) {
      return { error: 'Incorrect code. Please try again.' }
    }

    redirect('/dashboard')
  }

  // No active session — look up profile by connection_code
  const adminSupabase = createAdminClient()
  const { data: profile, error: dbError } = await adminSupabase
    .from('profiles')
    .select('id, email, connection_code')
    .ilike('connection_code', enteredCode)
    .maybeSingle()

  if (dbError || !profile || !profile.email) {
    return { error: 'Incorrect code. Please try again.' }
  }

  // Code matched! Generate magic link token & sign in user to create session cookies
  try {
    const { data: linkRes, error: linkErr } = await adminSupabase.auth.admin.generateLink({
      type: 'magiclink',
      email: profile.email,
    })

    if (linkErr || !linkRes?.properties?.hashed_token) {
      return { error: 'Verification failed. Please try full login.' }
    }

    const { error: verifyErr } = await supabase.auth.verifyOtp({
      token_hash: linkRes.properties.hashed_token,
      type: 'magiclink',
    })

    if (verifyErr) {
      return { error: 'Session restoration failed. Please try full login.' }
    }
  } catch {
    return { error: 'Sign in failed. Please try full login.' }
  }

  redirect('/dashboard')
}
