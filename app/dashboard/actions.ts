'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function connectWithCode(formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const code = (formData.get('code') as string)?.trim().toUpperCase()

  if (!code || code.length < 3) {
    return { error: 'Please enter a valid Code Word (at least 3 characters).' }
  }

  const { createClient: createAdminClient } = await import('@supabase/supabase-js')
  const adminSupabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Find the partner by code Word
  const { data: partner, error: partnerError } = await adminSupabase
    .from('profiles')
    .select('id, username')
    .eq('connection_code', code)
    .maybeSingle()

  if (partnerError || !partner) {
    return { error: 'No user found with that Code Word. Please double-check.' }
  }

  if (partner.id === user.id) {
    return { error: "That's your own code! Share it with someone else." }
  }

  // Ensure current user profile exists in profiles table
  const { data: currentUserProfile } = await adminSupabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (!currentUserProfile) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let myCode = ''
    for (let i = 0; i < 12; i++) {
      myCode += chars[Math.floor(Math.random() * chars.length)]
    }
    await adminSupabase.from('profiles').upsert(
      {
        id: user.id,
        username: user.email?.split('@')[0] || `user_${user.id.slice(0, 5)}`,
        email: user.email ?? '',
        connection_code: myCode,
      },
      { onConflict: 'id' }
    )
  }

  // Determine user1/user2 order (user1_id < user2_id)
  const user1_id = user.id < partner.id ? user.id : partner.id
  const user2_id = user.id < partner.id ? partner.id : user.id

  // Check if chat already exists
  const { data: existing } = await adminSupabase
    .from('chats')
    .select('id, user1_deleted_at, user2_deleted_at')
    .eq('user1_id', user1_id)
    .eq('user2_id', user2_id)
    .maybeSingle()

  if (existing) {
    // Reset deletion timestamp if it was deleted previously
    const isUser1 = user.id === user1_id
    const field = isUser1 ? 'user1_deleted_at' : 'user2_deleted_at'
    await adminSupabase
      .from('chats')
      .update({ [field]: null })
      .eq('id', existing.id)

    redirect(`/chat/${existing.id}`)
  }

  // Create new chat
  const { data: newChat, error: chatError } = await adminSupabase
    .from('chats')
    .insert({ user1_id, user2_id })
    .select('id')
    .single()

  if (chatError || !newChat) {
    return { error: chatError?.message || 'Could not create chat. Please try again.' }
  }

  revalidatePath('/dashboard')
  redirect(`/chat/${newChat.id}`)
}

export async function deleteChat(chatId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: chat } = await supabase
    .from('chats')
    .select('user1_id, user2_id')
    .eq('id', chatId)
    .single()

  if (!chat) return { error: 'Chat not found.' }

  const isUser1 = chat.user1_id === user.id
  const field = isUser1 ? 'user1_deleted_at' : 'user2_deleted_at'

  await supabase
    .from('chats')
    .update({ [field]: new Date().toISOString() })
    .eq('id', chatId)

  revalidatePath('/dashboard')
  return { success: true }
}
