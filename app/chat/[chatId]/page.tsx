import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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

  const adminSupabase = createAdminClient()

  // 1. Fetch chat details
  const { data: chat } = await adminSupabase
    .from('chats')
    .select('id, user1_id, user2_id, user1_deleted_at, user2_deleted_at')
    .eq('id', chatId)
    .maybeSingle()

  if (!chat || (chat.user1_id !== user.id && chat.user2_id !== user.id)) {
    redirect('/dashboard')
  }

  const partnerId = chat.user1_id === user.id ? chat.user2_id : chat.user1_id
  const participantIds = [chat.user1_id, chat.user2_id]
  const isUser1 = chat.user1_id === user.id
  const deletedAt = isUser1 ? chat.user1_deleted_at : chat.user2_deleted_at

  // 2. Fetch profiles, message deletions, and messages IN PARALLEL
  let messagesQuery = adminSupabase
    .from('messages')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true })
    .limit(100)

  if (deletedAt) {
    messagesQuery = messagesQuery.gt('created_at', deletedAt)
  }

  const [profilesRes, deletionsRes, messagesRes] = await Promise.all([
    adminSupabase.from('profiles').select('id, username, connection_code, email').in('id', participantIds),
    adminSupabase.from('message_deletions').select('message_id').eq('user_id', user.id),
    messagesQuery,
  ])

  const profiles = profilesRes.data || []
  const deletedIds = (deletionsRes.data || []).map((d) => d.message_id)
  const messages = messagesRes.data || []

  const partnerProfile = profiles.find((p) => p.id === partnerId)
  const unlockCodes = profiles.map((p) => p.connection_code?.toUpperCase()).filter(Boolean) as string[]

  // Filter visible messages
  const visibleMessages = messages.filter((m) => !deletedIds.includes(m.id))

  // 3. Pre-generate media signed URLs for media messages in parallel
  const messagesWithMedia = await Promise.all(
    visibleMessages.map(async (msg) => {
      if (msg.file_path && !msg.deleted_for_everyone) {
        try {
          const { data } = await adminSupabase.storage
            .from('chat-media')
            .createSignedUrl(msg.file_path, 3600)
          return { ...msg, media_url: data?.signedUrl || null }
        } catch {
          return msg
        }
      }
      return msg
    })
  )

  return (
    <ChatClient
      chatId={chatId}
      currentUserId={user.id}
      partnerUsername={partnerProfile?.username ?? 'Unknown'}
      initialMessages={messagesWithMedia}
      unlockCodes={unlockCodes}
    />
  )
}
