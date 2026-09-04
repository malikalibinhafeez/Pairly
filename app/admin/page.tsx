import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import AdminDashboardClient from './admin-client'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const cookieStore = await cookies()
  const session = cookieStore.get('admin_session')?.value

  if (session !== 'authenticated') {
    redirect('/admin/login')
  }

  const adminSupabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Fetch all registered user profiles
  const { data: users, error } = await adminSupabase
    .from('profiles')
    .select('id, username, email, connection_code, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching users:', error.message)
  }

  return <AdminDashboardClient users={users || []} />
}
