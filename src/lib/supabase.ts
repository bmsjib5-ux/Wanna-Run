import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/**
 * แอปทำงานได้ทั้งแบบมีและไม่มี Supabase
 * ถ้ายังไม่ได้ตั้งค่า env จะถอยไปใช้โหมดเก็บข้อมูลในเครื่องอย่างเดียว
 */
export const isCloudConfigured = Boolean(url && anonKey)

export const supabase: SupabaseClient | null = isCloudConfigured
  ? createClient(url as string, anonKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })
  : null

/** เรียกใช้เมื่อมั่นใจว่าตั้งค่า Supabase แล้ว */
export function requireSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error('ยังไม่ได้ตั้งค่า VITE_SUPABASE_URL และ VITE_SUPABASE_ANON_KEY')
  }
  return supabase
}

/** แปลง error จาก Supabase เป็นข้อความภาษาไทยที่ผู้ใช้อ่านรู้เรื่อง */
export function describeAuthError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials')) return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
  if (m.includes('user already registered')) return 'อีเมลนี้สมัครไว้แล้ว ลองเข้าสู่ระบบแทน'
  if (m.includes('password should be at least')) return 'รหัสผ่านสั้นเกินไป ต้องอย่างน้อย 6 ตัวอักษร'
  if (m.includes('email not confirmed')) return 'ยังไม่ได้ยืนยันอีเมล เช็กกล่องจดหมายก่อนนะ'
  if (m.includes('unable to validate email')) return 'รูปแบบอีเมลไม่ถูกต้อง'
  if (m.includes('rate limit') || m.includes('too many')) return 'ลองบ่อยเกินไป รอสักครู่แล้วลองใหม่'
  if (m.includes('failed to fetch') || m.includes('network')) return 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ เช็กอินเทอร์เน็ตก่อน'
  return message
}
