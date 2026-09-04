'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

/**
 * Verify the user's own secret connection_code.
 * Called from the quick-access page — user just types their code word.
 * Returns { error } on failure, redirects to /dashboard on success.
 */
export async function verifyQuickCode(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/auth/login')
  }

  const enteredCode = (formData.get('code') as string)?.trim().toUpperCase()
  if (!enteredCode) {
    return { error: 'Please enter your secret code.' }
  }

  // Fetch this user's profile connection_code
  const { data: profile, error: dbError } = await supabase
    .from('profiles')
    .select('connection_code')
    .eq('id', user.id)
    .single()

  if (dbError || !profile) {
    return { error: 'Could not verify your code. Please try again.' }
  }

  if (profile.connection_code?.toUpperCase() !== enteredCode) {
    return { error: 'Incorrect code. Please try again.' }
  }

  // Code correct — go to dashboard
  redirect('/dashboard')
}
