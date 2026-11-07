import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // 1. Verify app_settings singleton
    const { data: settings, error: settingsError } = await supabase
      .from('app_settings')
      .select('id, timezone, generation_time, posting_time, automation_enabled, topic_mode')
      .eq('singleton', true)
      .single()

    if (settingsError) {
      return NextResponse.json(
        {
          status: 'error',
          stage: 'database_query',
          message: 'Gagal membaca tabel app_settings',
          details: settingsError.message,
        },
        { status: 500 }
      )
    }

    // 2. Verify seeded topics in content_topics
    const { count: topicsCount, error: topicsError } = await supabase
      .from('content_topics')
      .select('*', { count: 'exact', head: true })

    if (topicsError) {
      return NextResponse.json(
        {
          status: 'error',
          stage: 'database_query',
          message: 'Gagal membaca tabel content_topics',
          details: topicsError.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      status: 'healthy',
      database: 'connected',
      settings,
      seededTopicsCount: topicsCount ?? 0,
      timestamp: new Date().toISOString(),
    })
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      {
        status: 'error',
        message: 'Internal server error saat verifikasi database',
        details: errorMessage,
      },
      { status: 500 }
    )
  }
}
