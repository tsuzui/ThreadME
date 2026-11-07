'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email dan password wajib diisi.' }
  }

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error || !data.user) {
    return { error: error?.message || 'Gagal masuk. Periksa email dan password Anda.' }
  }

  // Check if authenticated user is registered in admin_users table
  const { data: isAdmin, error: adminCheckError } = await supabase.rpc('is_threadme_admin')

  if (adminCheckError || !isAdmin) {
    await supabase.auth.signOut()
    return { error: 'Akses ditolak: Akun ini tidak terdaftar sebagai admin ThreadMe.' }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
