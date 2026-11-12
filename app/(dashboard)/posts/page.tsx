import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { Database } from '@/types/database'
import { FileText, ImageIcon, ExternalLink, Inbox } from 'lucide-react'

export const dynamic = 'force-dynamic'

type ContentPost = Database['public']['Tables']['content_posts']['Row']

export default async function PostsPage() {
  const supabase = await createClient()

  const { data: rawPosts, error } = await supabase
    .from('content_posts')
    .select('*')
    .order('scheduled_date', { ascending: false })
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
            Riwayat seluruh konten harian yang telah dipersiapkan dan dipublikasikan.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
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
              Postingan harian pertama akan terdaftar secara otomatis saat siklus generasi konten aktif di Phase B.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-6 py-4">Tanggal (WIB)</th>
                  <th className="px-6 py-4">Konten</th>
                  <th className="px-6 py-4">Pilar</th>
                  <th className="px-6 py-4">Format</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Tautan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {posts.map((post) => (
                  <tr key={post.id} className="transition-colors hover:bg-muted/30">
                    <td className="whitespace-nowrap px-6 py-4 font-mono text-xs font-medium text-foreground">
                      {post.scheduled_date}
                    </td>
                    <td className="max-w-md px-6 py-4">
                      <p className="line-clamp-2 text-foreground font-medium">
                        {post.content}
                      </p>
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
