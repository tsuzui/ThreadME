'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

export interface UpdateSettingsState {
  success?: boolean
  error?: string
}

export async function updateAppSettingsAction(
  _prevState: UpdateSettingsState,
  formData: FormData
): Promise<UpdateSettingsState> {
  try {
    const supabase = await createClient()

    // 1. Verifikasi admin
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { error: 'Sesi login telah berakhir. Silakan masuk kembali.' }
    }

    const { data: isAdmin, error: adminError } = await supabase.rpc(
      'is_threadme_admin'
    )

    if (adminError || !isAdmin) {
      return { error: 'Hanya administrator terdaftar yang dapat mengubah pengaturan.' }
    }

    // 2. Parse field
    const postingTimeRaw = (formData.get('posting_time') as string)?.trim()
    const generationTimeRaw = (formData.get('generation_time') as string)?.trim()
    const automationEnabled = formData.get('automation_enabled') === 'on'
    const cooldownDaysRaw = Number(formData.get('topic_rotation_cooldown_days'))
    const maxRetriesRaw = Number(formData.get('max_generation_retries'))
    const personaPrompt = (formData.get('persona_prompt') as string)?.trim()

    // Format waktu menjadi HH:MM:SS
    const formatTime = (time: string, fallback: string) => {
      if (!time) return fallback
      const parts = time.split(':')
      if (parts.length === 2) return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:00`
      if (parts.length === 3) return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:${parts[2].padStart(2, '0')}`
      return fallback
    }

    const postingTime = formatTime(postingTimeRaw, '19:00:00')
    const generationTime = formatTime(generationTimeRaw, '18:40:00')

    const cooldownDays = isNaN(cooldownDaysRaw) ? 7 : Math.max(1, Math.min(30, cooldownDaysRaw))
    const maxRetries = isNaN(maxRetriesRaw) ? 2 : Math.max(0, Math.min(5, maxRetriesRaw))

    const updatePayload: Database['public']['Tables']['app_settings']['Update'] = {
      posting_time: postingTime,
      generation_time: generationTime,
      automation_enabled: automationEnabled,
      image_target_ratio: 0,
      topic_rotation_cooldown_days: cooldownDays,
      max_generation_retries: maxRetries,
      persona_prompt: personaPrompt || null,
      updated_at: new Date().toISOString(),
    }

    // 3. Update database
    const { error: updateError } = await (supabase
      .from('app_settings') as any)
      .update(updatePayload)
      .eq('singleton', true)

    if (updateError) {
      return { error: `Gagal menyimpan pengaturan: ${updateError.message}` }
    }

    revalidatePath('/settings')
    revalidatePath('/dashboard')
    revalidatePath('/calendar')

    return { success: true }
  } catch (err: unknown) {
    const error = err as Error
    return { error: error.message || 'Terjadi kesalahan sistem saat menyimpan.' }
  }
}
