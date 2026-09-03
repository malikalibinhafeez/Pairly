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

  const { createClient: createAdminClient } = await import('@supabase/supabase-js')
  const adminSupabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Fetch chat details using admin client to prevent RLS query failure on mobile
  const { data: chat } = await adminSupabase
    .from('chats')
    .select('id, user1_id, user2_id, user1_deleted_at, user2_deleted_at')
    .eq('id', chatId)
    .maybeSingle()

  // Security Check: Verify user is one of the two chat participants
  if (!chat || (chat.user1_id !== user.id && chat.user2_id !== user.id)) {
    redirect('/dashboard')
  }

  const partnerId = chat.user1_id === user.id ? chat.user2_id : chat.user1_id
  const participantIds = [chat.user1_id, chat.user2_id]

  // Fetch profiles for both participants
  let { data: profiles } = await adminSupabase
    .from('profiles')
    .select('id, username, connection_code, email')
    .in('id', participantIds)

  // Check if any participant profile is missing or lacks a connection_code (legacy users)
  const missingProfiles = participantIds.filter(
    (id) => !profiles?.some((p) => p.id === id && p.connection_code)
  )

  if (missingProfiles.length > 0) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    for (const missingId of missingProfiles) {
      let newCode = ''
      for (let i = 0; i < 12; i++) {
        newCode += chars[Math.floor(Math.random() * chars.length)]
      }
      const existing = profiles?.find((p) => p.id === missingId)
      const fallbackName = existing?.username || `user_${missingId.slice(0, 5)}`

      await adminSupabase.from('profiles').upsert(
        {
          id: missingId,
          username: fallbackName,
          email: existing?.email || '',
          connection_code: newCode,
        },
        { onConflict: 'id' }
      )
    }

    // Re-fetch updated profiles
    const { data: updatedProfiles } = await adminSupabase
      .from('profiles')
      .select('id, username, connection_code, email')
      .in('id', participantIds)

    profiles = updatedProfiles
  }

  const partnerProfile = profiles?.find((p) => p.id === partnerId)
  const unlockCodes = (profiles ?? [])
    .map((p) => p.connection_code?.toUpperCase())
    .filter((code): code is string => Boolean(code))

  // Fetch message deletions for current user
  const { data: messageDeletedIds } = await adminSupabase
    .from('message_deletions')
    .select('message_id')
    .eq('user_id', user.id)

  const deletedIds = (messageDeletedIds ?? []).map((d) => d.message_id)

  // Per-user chat deletion timestamp
  const isUser1 = chat.user1_id === user.id
  const deletedAt = isUser1 ? chat.user1_deleted_at : chat.user2_deleted_at

  let query = adminSupabase
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
      partnerUsername={partnerProfile?.username ?? 'Unknown'}
      initialMessages={visibleMessages}
      unlockCodes={unlockCodes}
    />
  )
}
