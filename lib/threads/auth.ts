import 'server-only'
import { createClient } from '@/lib/supabase/server'

export async function requireThreadsAdmin() {
  const client = await createClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) throw new Error('Silakan login kembali.')
  const { data, error } = await client.rpc('is_threadme_admin')
  if (error || !data) throw new Error('Akses admin diperlukan.')
  return user
}
