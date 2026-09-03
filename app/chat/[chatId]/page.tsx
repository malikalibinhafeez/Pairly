import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ChatClient from './chat-client'

interface Props {
  params: Promise<{ chatId: string }>
}

export default async function ChatPage({ params }: Props) {
  const { chatId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  // Verify user is a participant in this chat
  const { data: chat } = await supabase
    .from('chats')
    .select('id, user1_id, user2_id')
    .eq('id', chatId)
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    .single()

  if (!chat) redirect('/dashboard')

  const partnerId = chat.user1_id === user.id ? chat.user2_id : chat.user1_id

  const { data: partner } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', partnerId)
    .single()

  // Fetch initial messages (not deleted by this user)
  const { data: messageDeletedIds } = await supabase
    .from('message_deletions')
    .select('message_id')
    .eq('user_id', user.id)

  const deletedIds = (messageDeletedIds ?? []).map((d) => d.message_id)

  // Get messages after the user's deletion timestamp for this chat
  const { data: chatMeta } = await supabase
    .from('chats')
    .select('user1_deleted_at, user2_deleted_at')
    .eq('id', chatId)
    .single()

  const isUser1 = chat.user1_id === user.id
  const deletedAt = isUser1 ? chatMeta?.user1_deleted_at : chatMeta?.user2_deleted_at

  let query = supabase
    .from('messages')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true })
    .limit(100)

  if (deletedAt) {
    query = query.gt('created_at', deletedAt)
  }

  const { data: messages } = await query

  const visibleMessages = (messages ?? []).filter(
    (m) => !deletedIds.includes(m.id)
  )

  return (
    <ChatClient
      chatId={chatId}
      currentUserId={user.id}
      partnerUsername={partner?.username ?? 'Unknown'}
      initialMessages={visibleMessages}
    />
  )
}
