import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import QuickAccessClient from './quick-client'

// How long (ms) a session stays "fresh" before requiring full login
export const SESSION_FRESH_HOURS = 4

export default async function QuickPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  // No active Supabase session at all — go to full login
  if (!user || error) {
    redirect('/auth/login')
  }

  // Fetch the user's username for a personalised greeting
  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single()

  return <QuickAccessClient username={profile?.username ?? null} />
}
