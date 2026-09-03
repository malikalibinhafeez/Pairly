'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

function generateConnectionCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 12; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export async function login(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: (formData.get('email') as string)?.trim(),
    password: formData.get('password') as string,
  }

  let { error } = await supabase.auth.signInWithPassword(data)

  // Auto confirm email if Supabase blocked sign in due to unconfirmed email
  if (error && error.message.toLowerCase().includes('email not confirmed')) {
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

  if (!username || username.length < 3) {
    return { error: 'Username must be at least 3 characters.' }
  }

  const { createClient: createAdminClient } = await import('@supabase/supabase-js')
  const adminSupabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Pre-check if username or email is already taken in profiles
  const { data: existingProfile } = await adminSupabase
    .from('profiles')
    .select('username, email')
    .or(`username.eq.${username},email.eq.${email}`)
    .maybeSingle()

  if (existingProfile) {
    if (existingProfile.username.toLowerCase() === username.toLowerCase()) {
      return { error: 'Username is already taken. Please choose another.' }
    }
    return { error: 'An account with this email already exists. Please sign in.' }
  }

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  })

  if (authError) {
    return { error: authError.message }
  }

  if (!authData.user || (authData.user.identities && authData.user.identities.length === 0)) {
    return { error: 'An account with this email already exists. Please sign in.' }
  }

  // Auto confirm email for development / frictionless sign up
  await adminSupabase.auth.admin.updateUserById(authData.user.id, {
    email_confirm: true,
  })

  const connectionCode = generateConnectionCode()

  const { error: profileError } = await adminSupabase.from('profiles').insert({
    id: authData.user.id,
    username,
    email,
    connection_code: connectionCode,
  })

  if (profileError) {
    if (profileError.code === '23505') {
      return { error: 'Username or email already in use. Please sign in or try another username.' }
    }
    if (profileError.code === '23503' || profileError.message.includes('foreign key')) {
      return { error: 'An account with this email already exists. Please sign in.' }
    }
    return { error: profileError.message }
  }

  if (!authData.session) {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (signInError) {
      return { error: 'Account created! Please sign in.' }
    }
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
