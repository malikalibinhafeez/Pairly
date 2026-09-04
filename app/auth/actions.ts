'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: (formData.get('email') as string)?.trim(),
    password: formData.get('password') as string,
  }

  let { error } = await supabase.auth.signInWithPassword(data)

  // Auto confirm email if Supabase blocked sign in due to unconfirmed email
  if (error && (error.message.toLowerCase().includes('email not confirmed') || error.message.toLowerCase().includes('invalid login'))) {
    const { createClient: createAdminClient } = await import('@supabase/supabase-js')
    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: usersData } = await adminSupabase.auth.admin.listUsers()
    const targetUser = usersData?.users?.find(
      (u) => u.email?.toLowerCase() === data.email.toLowerCase()
    )

    if (targetUser) {
      await adminSupabase.auth.admin.updateUserById(targetUser.id, {
        email_confirm: true,
      })
      // Retry sign in after auto-confirmation
      const retry = await supabase.auth.signInWithPassword(data)
      error = retry.error
    }
  }

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function register(formData: FormData) {
  const supabase = await createClient()

  const email = (formData.get('email') as string)?.trim()
  const password = formData.get('password') as string
  const username = (formData.get('username') as string)?.trim()
  const codeWord = (formData.get('codeWord') as string)?.trim().toUpperCase()

  if (!email || !password || !username || !codeWord) {
    return { error: 'Please fill out all fields.' }
  }

  if (username.length < 3) {
    return { error: 'Username must be at least 3 characters.' }
  }

  if (codeWord.length < 3) {
    return { error: 'Code Word must be at least 3 characters long.' }
  }

  const { createClient: createAdminClient } = await import('@supabase/supabase-js')
  const adminSupabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Pre-check if username, email, or codeWord is already taken in profiles
  const { data: existingProfile } = await adminSupabase
    .from('profiles')
    .select('id, username, email, connection_code')
    .or(`username.eq.${username},email.eq.${email},connection_code.eq.${codeWord}`)
    .maybeSingle()

  if (existingProfile) {
    if (existingProfile.username.toLowerCase() === username.toLowerCase()) {
      return { error: 'Username is already taken. Please choose another.' }
    }
    if (existingProfile.connection_code?.toUpperCase() === codeWord) {
      return { error: 'This Code Word is already taken. Please choose a different code word.' }
    }
    if (existingProfile.email.toLowerCase() === email.toLowerCase()) {
      return { error: 'An account with this email already exists. Please sign in.' }
    }
  }

  // Check if an abandoned/deleted auth user exists in auth.users with no profile
  const { data: usersData } = await adminSupabase.auth.admin.listUsers()
  const existingAuthUser = usersData?.users?.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  )

  if (existingAuthUser) {
    // Clean up old orphaned auth record so user can re-register seamlessly
    await adminSupabase.auth.admin.deleteUser(existingAuthUser.id)
  }

  // Create new user with email_confirm: true (no confirmation email sent)
  let { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError || !authData.user) {
    return { error: authError?.message || 'Failed to create user account.' }
  }

  // Insert profile record
  const { error: profileError } = await adminSupabase.from('profiles').insert({
    id: authData.user.id,
    username,
    email,
    connection_code: codeWord,
  })

  if (profileError) {
    if (profileError.code === '23505') {
      return { error: 'Username, email, or Code Word already in use. Please choose another.' }
    }
    return { error: profileError.message }
  }

  // Automatically sign in user
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (signInError) {
    return { error: 'Account created! Please sign in.' }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/auth/login')
}
