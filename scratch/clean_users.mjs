import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://svhunjjmrvexrssbylop.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2aHVuamptcnZleHJzc2J5bG9wIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxODQ5NCwiZXhwIjoyMTAzOTk0NDk0fQ.eU8alZsQ5Nae-8lv5CfKSoCx-4LsH7oPamtTvTfj3FY'

const adminSupabase = createClient(supabaseUrl, serviceRoleKey)

async function cleanAllUsers() {
  console.log('Starting cleanup of all users...')

  // 1. Delete all messages
  const { error: msgErr } = await adminSupabase.from('messages').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  console.log('Messages deleted:', msgErr ? msgErr.message : 'OK')

  // 2. Delete message deletions
  const { error: delErr } = await adminSupabase.from('message_deletions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  console.log('Message deletions cleared:', delErr ? delErr.message : 'OK')

  // 3. Delete chats
  const { error: chatErr } = await adminSupabase.from('chats').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  console.log('Chats cleared:', chatErr ? chatErr.message : 'OK')

  // 4. Fetch all profiles
  const { data: profiles } = await adminSupabase.from('profiles').select('id, username, email')
  console.log(`Found ${profiles?.length || 0} profiles to remove.`)

  if (profiles && profiles.length > 0) {
    for (const p of profiles) {
      console.log(`Deleting user @${p.username} (${p.email})...`)
      await adminSupabase.from('profiles').delete().eq('id', p.id)
      await adminSupabase.auth.admin.deleteUser(p.id)
    }
  }

  // 5. Check if any remaining auth users exist
  const { data: usersData } = await adminSupabase.auth.admin.listUsers()
  if (usersData?.users) {
    for (const u of usersData.users) {
      if (u.email !== 'admin@pairly.com') {
        console.log(`Deleting remaining auth user: ${u.email} (${u.id})`)
        await adminSupabase.auth.admin.deleteUser(u.id)
      }
    }
  }

  console.log('ALL USERS AND DATA CLEANED SUCCESSFULLY!')
}

cleanAllUsers().catch(console.error)
