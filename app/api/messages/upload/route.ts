import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'audio/webm',
  'audio/mp4',
  'audio/ogg',
  'audio/wav',
  'audio/m4a',
  'audio/aac',
  'audio/x-m4a',
]
const MAX_SIZE = 25 * 1024 * 1024 // 25MB

export async function POST(request: NextRequest) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const chatId = formData.get('chatId') as string | null

  if (!file || !chatId) {
    return NextResponse.json({ error: 'Missing file or chatId' }, { status: 400 })
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'File type not allowed' }, { status: 400 })
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large (max 25MB)' }, { status: 400 })
  }

  // Verify user is a chat participant
  const { data: chat } = await supabase
    .from('chats')
    .select('id')
    .eq('id', chatId)
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    .single()

  if (!chat) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Use service role for storage upload
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const ext = file.name.split('.').pop() ?? 'bin'
  const filePath = `${chatId}/${user.id}-${Date.now()}.${ext}`

  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadError } = await admin.storage
    .from('chat-media')
    .upload(filePath, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const messageType = file.type.startsWith('image/') ? 'image' : 'video'

  const { error: dbError } = await supabase.from('messages').insert({
    chat_id: chatId,
    sender_id: user.id,
    message_type: messageType,
    file_path: filePath,
    file_type: file.type,
    file_size: file.size,
  })

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
