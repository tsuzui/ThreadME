import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { Database } from '@/types/database'
import { FileText, ImageIcon, ExternalLink, Inbox, PlusCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

type ContentPost = Database['public']['Tables']['content_posts']['Row']

export default async function PostsPage() {
  const supabase = await createClient()

  const { data: rawPosts, error } = await supabase
    .from('content_posts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  const posts = rawPosts as ContentPost[] | null

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Daftar Postingan
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Riwayat seluruh postingan, draf bebas, dan konten terjadwal.
          </p>
        </div>
        <Link
          href="/posts/new"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
        >
          <PlusCircle className="h-4 w-4" />
          Buat Postingan
        </Link>
      </div>

      <div className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex items-center gap-3 border-b border-border px-6 py-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-primary"><FileText className="h-5 w-5" /></span>
          <div><h2 className="text-sm font-semibold">Pustaka konten</h2><p className="mt-0.5 text-xs text-muted-foreground">Draf, jadwal tayang, dan riwayat publikasi Anda.</p></div>
        </div>
        {error ? (
          <div className="p-8 text-center text-sm text-destructive">
            Gagal memuat daftar postingan: {error.message}
          </div>
        ) : !posts || posts.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <Inbox className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-foreground">
              Belum Ada Postingan
            </h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
              Postingan akan terdaftar secara otomatis saat siklus generasi konten berjalan atau saat Anda menambahkan slot baru.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-6 py-4">Jadwal (WIB)</th>
                  <th className="px-6 py-4">Konten</th>
                  <th className="px-6 py-4">Pilar</th>
                  <th className="px-6 py-4">Format</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Tautan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {posts.map((post) => {
                  const timeFormatted = post.scheduled_for ? new Intl.DateTimeFormat('id-ID', {
                    timeZone: 'Asia/Jakarta',
                    hour: '2-digit',
                    minute: '2-digit',
                  }).format(new Date(post.scheduled_for)) : null

                  return (
                    <tr key={post.id} className="transition-colors hover:bg-muted/30">
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="font-mono text-xs font-semibold text-foreground">
                          {post.scheduled_date || 'Draf bebas'}
                        </div>
                        <div className="font-mono text-[11px] text-muted-foreground">
                          {timeFormatted ? `${timeFormatted} WIB` : 'Tanpa jadwal'}
                        </div>
                      </td>
                      <td className="max-w-md px-6 py-4">
                        <p className="line-clamp-2 text-foreground font-medium">
                          {post.content}
                        </p>
                        {post.context && (
                          <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground italic">
                            Konteks: {post.context}
                          </p>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                          {post.pillar}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                          {post.content_type === 'image' ? (
                            <>
                              <ImageIcon className="h-3.5 w-3.5 text-purple-500" />
                              Gambar
                            </>
                          ) : (
                            <>
                              <FileText className="h-3.5 w-3.5 text-blue-500" />
                              Teks
                            </>
                          )}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            post.status === 'published'
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : post.status === 'ready'
                              ? 'bg-blue-500/10 text-blue-500'
                              : post.status === 'failed'
                              ? 'bg-destructive/10 text-destructive'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {post.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        {post.threads_permalink ? (
                          <a
                            href={post.threads_permalink}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            Lihat
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <Link href={`/posts/${post.id}`} className="text-xs font-semibold text-primary hover:underline">{post.status === 'ready' ? 'Edit draf' : 'Lihat detail'}</Link>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
