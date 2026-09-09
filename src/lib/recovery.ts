/**
 * ลิงก์ "ตั้งรหัสผ่านใหม่" ที่ Supabase ส่งไปทางอีเมล
 *
 * แอปตั้ง detectSessionInUrl: false ไว้ (ไม่ให้ supabase-js ไปยุ่งกับ URL เอง
 * เพราะเราใช้ ?add= และ ?spot= ของตัวเอง) จึงต้องรับลิงก์กู้รหัสผ่านเอง
 * รองรับทั้งแบบ implicit (#access_token=...&type=recovery) และ PKCE (?code=...)
 */
export type Recovery =
  | { kind: 'tokens'; accessToken: string; refreshToken: string }
  | { kind: 'code'; code: string }

/** อ่านข้อมูลกู้รหัสผ่านจาก URL แล้วล้างทิ้ง เพื่อไม่ให้โทเคนค้างอยู่บนแถบที่อยู่ */
export function takeRecoveryFromUrl(): Recovery | null {
  if (typeof location === 'undefined') return null

  const clean = (search: URLSearchParams, keepHash: boolean) => {
    const rest = search.toString()
    history.replaceState(null, '', location.pathname + (rest ? `?${rest}` : '') + (keepHash ? location.hash : ''))
  }

  const hash = new URLSearchParams(location.hash.replace(/^#/, ''))
  if (hash.get('type') === 'recovery') {
    const accessToken = hash.get('access_token')
    const refreshToken = hash.get('refresh_token')
    if (accessToken && refreshToken) {
      clean(new URLSearchParams(location.search), false)
      return { kind: 'tokens', accessToken, refreshToken }
    }
  }

  const query = new URLSearchParams(location.search)
  const code = query.get('code')
  if (code && query.get('type') === 'recovery') {
    query.delete('code')
    query.delete('type')
    clean(query, false)
    return { kind: 'code', code }
  }

  return null
}

/** ข้อความบอกสาเหตุเมื่อลิงก์ใช้ไม่ได้ */
export function describeRecoveryError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('expired') || m.includes('invalid')) return 'ลิงก์หมดอายุหรือถูกใช้ไปแล้ว ขอลิงก์ใหม่อีกครั้งนะ'
  return message
}
