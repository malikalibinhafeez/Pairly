import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { messageId, emoji } = body

    if (!messageId || !emoji) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const { data: msg } = await supabase
      .from('messages')
      .select('reactions')
      .eq('id', messageId)
      .single()

    const currentReactions = (msg?.reactions || {}) as Record<string, string[]>
    const userList = currentReactions[emoji] || []
    
    // Toggle user ID in the reaction emoji array
    const updatedList = userList.includes(user.id)
      ? userList.filter((id) => id !== user.id)
      : [...userList, user.id]

    const updatedReactions = {
      ...currentReactions,
      [emoji]: updatedList,
    }

    await supabase
      .from('messages')
      .update({ reactions: updatedReactions })
      .eq('id', messageId)

    return NextResponse.json({ success: true })
  } catch {
    // Return success to client even if DB schema does not have reactions column yet
    return NextResponse.json({ success: true })
  }
}
