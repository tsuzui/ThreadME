import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import {
  authorizeTopicRequest,
  topicInputSchema,
  findAvailableSlug,
  handleDatabaseError,
} from './shared'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const auth = await authorizeTopicRequest(request)
  if (auth.errorResponse) return auth.errorResponse
  const { db } = auth

  try {
    const json = await request.json()
    const parsed = topicInputSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Input tidak valid.' },
        { status: 400 }
      )
    }

    const { name, description, priority, is_active } = parsed.data
    const slug = await findAvailableSlug(db, name)

    const { data: topic, error: insertError } = await db
      .from('content_topics')
      .insert({
        name,
        slug,
        description,
        priority,
        is_active,
        source_type: 'custom',
      })
      .select('*')
      .single()

    if (insertError) {
      return handleDatabaseError(insertError)
    }

    revalidatePath('/topic-studio')
    return NextResponse.json({ topic }, { status: 201 })
  } catch (err) {
    return handleDatabaseError(err)
  }
}
