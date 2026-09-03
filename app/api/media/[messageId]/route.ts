import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

interface Props {
  params: Promise<{ messageId: string }>
}

export async function GET(request: NextRequest, { params }: Props) {
  const { messageId } = await params
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: message } = await supabase
    .from('messages')
    .select('file_path, chat_id, deleted_for_everyone')
    .eq('id', messageId)
    .single()

  if (!message || !message.file_path || message.deleted_for_everyone) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Verify user is a participant in this chat
  const { data: chat } = await supabase
    .from('chats')
    .select('id')
    .eq('id', message.chat_id)
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    .single()

  if (!chat) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Create signed URL using admin (service role)
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: signed, error } = await admin.storage
    .from('chat-media')
    .createSignedUrl(message.file_path, 60 * 60) // 1 hour

  if (error || !signed) {
    return NextResponse.json({ error: 'Could not generate URL' }, { status: 500 })
  }

  return NextResponse.json({ url: signed.signedUrl })
}
