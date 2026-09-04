import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import GrammarLanding from '@/components/grammar-landing'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  // If not logged in, show the grammar landing page (disguise)
  return <GrammarLanding />
}
