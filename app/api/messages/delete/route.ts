import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { messageId, deleteType } = body

  if (!messageId || !deleteType) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const { data: message } = await supabase
    .from('messages')
    .select('id, sender_id, file_path, created_at, chat_id')
    .eq('id', messageId)
    .single()

  if (!message) {
    return NextResponse.json({ error: 'Message not found' }, { status: 404 })
  }

  // Verify user is in this chat
  const { data: chat } = await supabase
    .from('chats')
    .select('id')
    .eq('id', message.chat_id)
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    .single()

  if (!chat) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (deleteType === 'for_me') {
    const { error } = await supabase.from('message_deletions').insert({
      message_id: messageId,
      user_id: user.id,
    })
    if (error && !error.message.includes('duplicate')) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  }

  if (deleteType === 'for_everyone') {
    // Only sender can delete for everyone, and only within 2 days
    if (message.sender_id !== user.id) {
      return NextResponse.json({ error: 'Only the sender can unsend' }, { status: 403 })
    }

    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    if (new Date(message.created_at) < twoDaysAgo) {
      return NextResponse.json({ error: 'Cannot unsend after 2 days' }, { status: 400 })
    }

    const { error: updateError } = await supabase
      .from('messages')
      .update({ deleted_for_everyone: true })
      .eq('id', messageId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Delete the media file if any
    if (message.file_path) {
      const admin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      await admin.storage.from('chat-media').remove([message.file_path])
    }

    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Invalid deleteType' }, { status: 400 })
}
