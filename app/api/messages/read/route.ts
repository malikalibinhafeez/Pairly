import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { chatId } = await request.json()

  if (!chatId) {
    return NextResponse.json({ error: 'Missing chatId' }, { status: 400 })
  }

  // Update all unread messages sent by the partner to seen = true
  const { error } = await supabase
    .from('messages')
    .update({ seen: true })
    .eq('chat_id', chatId)
    .neq('sender_id', user.id)
    .eq('seen', false)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
