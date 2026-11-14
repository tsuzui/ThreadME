import { notFound } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { formatDateWIB } from '@/lib/utils'
import type { Database } from '@/types/database'
import { DraftForm } from './draft-form'
import { PublishControls } from './publish-controls'
import { PublishStatus } from './publish-status'

export default async function PostEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!z.string().uuid().safeParse(id).success) notFound()
  const db = await createClient()
  const { data, error } = await db.from('content_posts').select('*').eq('id', id).maybeSingle()
  if (error) return <p role="alert" className="text-destructive">Gagal memuat postingan. Silakan muat ulang.</p>
  const post = data as Database['public']['Tables']['content_posts']['Row'] | null
  if (!post) notFound()
  return <div className="mx-auto max-w-4xl space-y-6">
    <div>
      <h1 className="text-2xl font-bold">{post.status === 'ready' ? 'Edit draf postingan' : 'Detail postingan'}</h1>
      <p className="mt-2 text-sm text-muted-foreground">Jadwal: {formatDateWIB(post.scheduled_for)} WIB · {post.status}</p>
      <p className="mt-1 text-xs text-muted-foreground">Teks dari AI dapat disesuaikan. Gambar opsional ditambahkan sendiri; tidak ada generasi gambar AI.</p>
    </div>
    <DraftForm key={post.updated_at} post={post} />
    {(post.status === 'ready' || (post.status === 'publishing' && post.last_error_code === 'container_not_ready')) && <PublishControls key={`publish-${post.updated_at}`} id={post.id} version={post.updated_at} resume={post.status === 'publishing'} liveEnabled={process.env.THREADS_PUBLISH_MODE === 'live'} />}
    {(post.status === 'publishing' || post.status === 'publish_unknown') && <PublishStatus id={post.id} />}
  </div>
}
