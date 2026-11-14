import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export const topicInputSchema = z.object({
  name: z.string().trim().min(1, 'Nama topik wajib diisi.').max(100, 'Nama maksimal 100 karakter.'),
  description: z.string().trim().max(1000, 'Deskripsi maksimal 1000 karakter.').default(''),
  priority: z.number().int().min(1, 'Prioritas minimal 1.').max(5, 'Prioritas maksimal 5.').default(3),
  is_active: z.boolean().default(true),
}).strict()

export type TopicInput = z.infer<typeof topicInputSchema>

export async function authorizeTopicRequest(request: NextRequest) {
  if (request.headers.get('origin') !== request.nextUrl.origin) {
    return { errorResponse: NextResponse.json({ error: 'Asal permintaan tidak diizinkan.' }, { status: 403 }) }
  }
  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) {
    return { errorResponse: NextResponse.json({ error: 'Silakan login kembali.' }, { status: 401 }) }
  }
  const { data: admin, error } = await db.rpc('is_threadme_admin')
  if (error || !admin) {
    return { errorResponse: NextResponse.json({ error: 'Akses admin diperlukan.' }, { status: 403 }) }
  }
  // @supabase/ssr 0.6 uses the older client generic signature. Keep the
  // session/cookies and RLS intact while aligning its type with supabase-js.
  return { db: db as unknown as SupabaseClient<Database> }
}

export function slugify(text: string): string {
  const base = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return base || 'topik'
}

export async function findAvailableSlug(
  db: SupabaseClient<Database>,
  desired: string,
  excludeId?: string
): Promise<string> {
  const base = slugify(desired)
  let candidate = base
  let counter = 1

  while (counter <= 50) {
    let query = db.from('content_topics').select('id').eq('slug', candidate)
    if (excludeId) {
      query = query.neq('id', excludeId)
    }
    const { data: existing, error } = await query.maybeSingle()
    if (error) {
      throw error
    }
    if (!existing) {
      return candidate
    }
    counter++
    candidate = `${base}-${counter}`
  }

  return `${base}-${crypto.randomUUID().slice(0, 8)}`
}

export function handleDatabaseError(error: unknown) {
  const code = (error as { code?: string })?.code
  if (code === '23505') {
    return NextResponse.json({ error: 'Topik dengan nama atau slug serupa sudah terdaftar.' }, { status: 409 })
  }
  if (code === '23503') {
    return NextResponse.json({ error: 'Topik masih digunakan dan tidak dapat dihapus.' }, { status: 409 })
  }
  if (error instanceof SyntaxError) {
    return NextResponse.json({ error: 'JSON permintaan tidak valid.' }, { status: 400 })
  }
  return NextResponse.json({ error: 'Gagal menyimpan perubahan topik. Silakan coba lagi.' }, { status: 500 })
}
