import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { deleteChat } from './actions'
import DashboardClient, { LogoutButton } from './dashboard-client'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  let { data: profile } = await supabase
    .from('profiles')
    .select('username, connection_code')
    .eq('id', user.id)
    .maybeSingle()

  // If profile is missing (e.g. registered before fix), auto-create it now
  if (!profile) {
    const { createClient: createAdminClient } = await import('@supabase/supabase-js')
    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''
    for (let i = 0; i < 12; i++) {
      code += chars[Math.floor(Math.random() * chars.length)]
    }

    const username = user.email?.split('@')[0] || `user_${user.id.slice(0, 5)}`

    const { data: createdProfile } = await adminSupabase
      .from('profiles')
      .upsert(
        {
          id: user.id,
          username,
          email: user.email ?? '',
          connection_code: code,
        },
        { onConflict: 'id' }
      )
      .select('username, connection_code')
      .single()

    if (createdProfile) {
      profile = createdProfile
    }
  }

  // Get all chats for this user
  const { data: allChats } = await supabase
    .from('chats')
    .select('id, user1_id, user2_id, user1_deleted_at, user2_deleted_at, created_at')
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    .order('created_at', { ascending: false })

  // Filter out chats the current user has deleted
  const chats = (allChats ?? []).filter((chat) => {
    const isUser1 = chat.user1_id === user.id
    const deletedAt = isUser1 ? chat.user1_deleted_at : chat.user2_deleted_at
    return !deletedAt
  })

  // Fetch partner profiles
  const partnerIds = chats.map((c) =>
    c.user1_id === user.id ? c.user2_id : c.user1_id
  )

  const { data: partners } = partnerIds.length
    ? await supabase.from('profiles').select('id, username').in('id', partnerIds)
    : { data: [] }

  const partnerMap = Object.fromEntries(
    (partners ?? []).map((p) => [p.id, p])
  )

  const chatList = chats.map((chat) => {
    const partnerId = chat.user1_id === user.id ? chat.user2_id : chat.user1_id
    return {
      id: chat.id,
      partnerUsername: partnerMap[partnerId]?.username ?? 'Unknown',
    }
  })

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden">
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-indigo-600/8 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full bg-violet-600/8 blur-[120px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-xl sticky top-0">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
              </svg>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              Pairly
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400 hidden sm:block">@{profile?.username}</span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 relative z-10 space-y-6">
        <DashboardClient
          connectionCode={profile?.connection_code ?? ''}
          chatList={chatList}
          username={profile?.username ?? ''}
        />
      </main>
    </div>
  )
}
