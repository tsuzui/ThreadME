import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import {
  authorizeTopicRequest,
  topicInputSchema,
  findAvailableSlug,
  handleDatabaseError,
} from '../shared'

export const runtime = 'nodejs'

const idSchema = z.string().uuid('ID topik tidak valid.')

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await authorizeTopicRequest(request)
  if (auth.errorResponse) return auth.errorResponse
  const { db } = auth

  const { id } = await context.params
  if (!idSchema.safeParse(id).success) {
    return NextResponse.json({ error: 'ID topik tidak valid.' }, { status: 400 })
  }

  try {
    const json = await request.json()
    const parsed = topicInputSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Input tidak valid.' },
        { status: 400 }
      )
    }

    const { data: existing, error: fetchError } = await db
      .from('content_topics')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (fetchError) {
      return handleDatabaseError(fetchError)
    }
    if (!existing) {
      return NextResponse.json({ error: 'Topik tidak ditemukan.' }, { status: 404 })
    }

    const { name, description, priority, is_active } = parsed.data

    let slug = existing.slug
    // For custom topics, if the name changed, update slug safely
    if (existing.source_type === 'custom' && name.trim() !== existing.name.trim()) {
      slug = await findAvailableSlug(db, name, id)
    }

    const { data: updated, error: updateError } = await db
      .from('content_topics')
      .update({
        name,
        slug,
        description,
        priority,
        is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single()

    if (updateError) {
      return handleDatabaseError(updateError)
    }

    revalidatePath('/topic-studio')
    return NextResponse.json({ topic: updated })
  } catch (err) {
    return handleDatabaseError(err)
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await authorizeTopicRequest(request)
  if (auth.errorResponse) return auth.errorResponse
  const { db } = auth

  const { id } = await context.params
  if (!idSchema.safeParse(id).success) {
    return NextResponse.json({ error: 'ID topik tidak valid.' }, { status: 400 })
  }

  try {
    const { data: existing, error: fetchError } = await db
      .from('content_topics')
      .select('id, source_type, name')
      .eq('id', id)
      .maybeSingle()

    if (fetchError) {
      return handleDatabaseError(fetchError)
    }
    if (!existing) {
      return NextResponse.json({ error: 'Topik tidak ditemukan.' }, { status: 404 })
    }

    if (existing.source_type === 'system') {
      return NextResponse.json(
        { error: 'Topik bawaan sistem tidak dapat dihapus. Gunakan aksi nonaktifkan untuk menonaktifkan rotasi.' },
        { status: 403 }
      )
    }

    const { error: deleteError } = await db
      .from('content_topics')
      .delete()
      .eq('id', id)
      .eq('source_type', 'custom')

    if (deleteError) {
      return handleDatabaseError(deleteError)
    }

    revalidatePath('/topic-studio')
    return NextResponse.json({ success: true, id })
  } catch (err) {
    return handleDatabaseError(err)
  }
}
