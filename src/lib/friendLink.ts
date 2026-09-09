import { normalizeCode } from './id'

const CODE_PATTERN = /RUN-[A-Z0-9]{4}/

/** ลิงก์ที่ฝังใน QR — สแกนด้วยกล้องของเครื่องแล้วเปิดแอปมาที่หน้าเพิ่มเพื่อนได้เลย */
export function friendLink(code: string): string {
  const origin = typeof location !== 'undefined' ? location.origin : ''
  return `${origin}/?add=${encodeURIComponent(code)}`
}

/** ดึงรหัสเพื่อนออกจากสิ่งที่สแกนได้ รองรับทั้งลิงก์และรหัสเปล่า */
export function parseFriendCode(raw: string): string | null {
  const text = raw.trim().toUpperCase()
  const match = CODE_PATTERN.exec(text)
  if (match) return match[0]
  const cleaned = normalizeCode(text)
  return CODE_PATTERN.test(cleaned) ? cleaned : null
}

/** อ่านรหัสจาก ?add= บน URL แล้วล้างพารามิเตอร์ทิ้ง เพื่อไม่ให้ค้างเวลารีเฟรช */
export function takeCodeFromUrl(): string | null {
  if (typeof location === 'undefined') return null
  const params = new URLSearchParams(location.search)
  const raw = params.get('add')
  if (!raw) return null
  params.delete('add')
  const rest = params.toString()
  history.replaceState(null, '', location.pathname + (rest ? `?${rest}` : ''))
  return parseFriendCode(raw)
}
