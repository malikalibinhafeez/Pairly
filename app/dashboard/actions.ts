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

  if (!code || code.length !== 12) {
    return { error: 'Please enter a valid 12-character connection code.' }
  }

  // Find the partner by code
  const { data: partner, error: partnerError } = await supabase
    .from('profiles')
    .select('id, username')
    .eq('connection_code', code)
    .single()

  if (partnerError || !partner) {
    return { error: 'No user found with that code. Please double-check.' }
  }

  if (partner.id === user.id) {
    return { error: "That's your own code! Share it with someone else." }
  }

  // Determine user1/user2 order (user1_id < user2_id)
  const user1_id = user.id < partner.id ? user.id : partner.id
  const user2_id = user.id < partner.id ? partner.id : user.id

  // Check if chat already exists
  const { data: existing } = await supabase
    .from('chats')
    .select('id')
    .eq('user1_id', user1_id)
    .eq('user2_id', user2_id)
    .single()

  if (existing) {
    redirect(`/chat/${existing.id}`)
  }

  // Create new chat
  const { data: newChat, error: chatError } = await supabase
    .from('chats')
    .insert({ user1_id, user2_id })
    .select('id')
    .single()

  if (chatError || !newChat) {
    return { error: 'Could not create chat. Please try again.' }
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
