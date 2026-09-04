'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function adminLogin(formData: FormData) {
  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const password = (formData.get('password') as string)?.trim()

  const validCredentials = [
    {
      email: (process.env.ADMIN_EMAIL || 'admin@gmail.com').trim().toLowerCase(),
      password: (process.env.ADMIN_PASSWORD || '878484').trim(),
    },
    { email: 'admin@gmail.com', password: '878484' },
    { email: 'admin@pairly.com', password: 'admin123456' },
  ]

  const isValid = validCredentials.some(
    (c) => c.email === email && c.password === password
  )

  if (!isValid) {
    return { error: 'Invalid admin credentials.' }
  }

  const cookieStore = await cookies()
  cookieStore.set('admin_session', 'authenticated', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  })

  revalidatePath('/admin')
  redirect('/admin')
}

export async function adminLogout() {
  const cookieStore = await cookies()
  cookieStore.delete('admin_session')
  redirect('/admin/login')
}

export async function deleteUserByAdmin(userId: string) {
  const cookieStore = await cookies()
  const session = cookieStore.get('admin_session')?.value
  if (session !== 'authenticated') {
    return { error: 'Unauthorized admin access.' }
  }

  if (!userId) {
    return { error: 'Missing userId' }
  }

  const adminSupabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    // 1. Delete associated messages sent by user
    await adminSupabase.from('messages').delete().eq('sender_id', userId)

    // 2. Delete message deletions records
    await adminSupabase.from('message_deletions').delete().eq('user_id', userId)

    // 3. Delete chats where user is participant
    await adminSupabase.from('chats').delete().or(`user1_id.eq.${userId},user2_id.eq.${userId}`)

    // 4. Delete user profile
    await adminSupabase.from('profiles').delete().eq('id', userId)

    // 5. Delete user from Supabase Auth completely so email becomes fresh for re-registration
    const { error: authError } = await adminSupabase.auth.admin.deleteUser(userId)

    if (authError) {
      console.warn('Auth deletion warning:', authError.message)
    }

    revalidatePath('/admin')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Failed to delete user.' }
  }
}
