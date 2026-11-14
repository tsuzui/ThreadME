'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export interface UpdateSettingsState {
  success?: boolean
  error?: string
  message?: string
}

async function adminClient() {
  const client = await createClient()
  const { data: { user }, error } = await client.auth.getUser()
  if (error || !user) throw new Error('Sesi login telah berakhir. Silakan masuk kembali.')
  const { data: admin, error: adminError } = await client.rpc('is_threadme_admin')
  if (adminError || !admin) throw new Error('Akses admin diperlukan.')
  return client
}

function refreshSettings() {
  for (const path of ['/settings', '/dashboard', '/calendar']) revalidatePath(path)
}

function minutes(time: string) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('Format waktu harus HH:MM (WIB).')
  const [hour, minute] = time.split(':').map(Number)
  return hour * 60 + minute
}

function integer(value: FormDataEntryValue | null, min: number, max: number) {
  const parsed = Number(value)
  if (typeof value !== 'string' || !value.trim() || !Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`Parameter harus bilangan bulat ${min}–${max}.`)
  }
  return parsed
}

function failure(error: unknown): UpdateSettingsState {
  return { error: error instanceof Error ? error.message : 'Gagal menyimpan pengaturan.' }
}

export async function updateAppSettingsAction(_prev: UpdateSettingsState, form: FormData): Promise<UpdateSettingsState> {
  try {
    const client = await adminClient()
    const generation = String(form.get('generation_time') ?? '').trim()
    const posting = String(form.get('posting_time') ?? '').trim()
    const lead = minutes(posting) - minutes(generation)
    if (lead < 1 || lead > 1439) throw new Error('Generasi harus minimal 1 menit sebelum publikasi pada hari yang sama.')
    // RPC is owned by migration 012; keep its local signature here until generated DB types are refreshed.
    const { data, error } = await (client.rpc as Function)('update_threadme_settings', {
      p_generation_time: generation, p_posting_time: posting,
      p_enabled: form.get('automation_enabled') === 'on',
      p_cooldown: integer(form.get('topic_rotation_cooldown_days'), 1, 30),
      p_retries: integer(form.get('max_generation_retries'), 0, 5),
      p_persona: String(form.get('persona_prompt') ?? '').trim() || null,
    })
    if (error) throw new Error(error.code === '23505' ? 'Jam ini bentrok dengan jadwal lain. Tidak ada perubahan yang disimpan.' : error.message)
    refreshSettings()
    return { success: true, message: data === 'protected'
      ? 'Pengaturan tersimpan. Jadwal hari ini tetap: sudah diproses, memiliki draf, atau waktu publikasinya telah lewat. Jadwal baru berlaku untuk slot berikutnya.'
      : data === 'updated' ? 'Pengaturan tersimpan. Slot utama hari ini yang masih kosong ikut diperbarui.'
      : 'Pengaturan tersimpan. Jadwal baru berlaku saat worker membuat slot berikutnya.' }
  } catch (error) { return failure(error) }
}

async function manageRule(args: Record<string, unknown>): Promise<UpdateSettingsState> {
  try {
    const client = await adminClient()
    const { error } = await (client.rpc as Function)('manage_threadme_recurring_rule', args)
    if (error) throw new Error(error.code === '23503'
      ? 'Jadwal ini memiliki riwayat slot. Nonaktifkan alih-alih menghapus.'
      : error.code === '23505' ? 'Jam publikasi ini sudah digunakan jadwal lain.' : error.message)
    refreshSettings()
    return { success: true }
  } catch (error) { return failure(error) }
}

export async function addRecurringRuleAction(timeRaw: string, leadMinutes = 20): Promise<UpdateSettingsState> {
  try {
    const time = timeRaw.trim()
    if (!Number.isInteger(leadMinutes) || leadMinutes < 1 || leadMinutes > 1439 || leadMinutes > minutes(time)) {
      throw new Error('Lead AI harus 1–1439 menit, dengan generasi pada hari yang sama.')
    }
    return await manageRule({ p_operation: 'add', p_time: time, p_lead: leadMinutes })
  } catch (error) { return failure(error) }
}

export async function toggleRecurringRuleAction(ruleId: string, enabled: boolean): Promise<UpdateSettingsState> {
  return manageRule({ p_operation: 'toggle', p_id: ruleId, p_enabled: enabled })
}

export async function deleteRecurringRuleAction(ruleId: string): Promise<UpdateSettingsState> {
  return manageRule({ p_operation: 'delete', p_id: ruleId })
}
