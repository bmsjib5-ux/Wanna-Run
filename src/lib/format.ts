const DAYS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']
const MONTHS = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
]

export const DAY_MS = 86_400_000

export function clock(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function shortDate(ts: number): string {
  const d = new Date(ts)
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`
}

/** เช่น "พรุ่งนี้ 06:30" หรือ "ศุกร์ 12 ก.ย. 17:00" */
export function whenLabel(ts: number): string {
  const now = new Date()
  const d = new Date(ts)
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const diffDays = Math.floor((d.getTime() - startOfToday) / DAY_MS)
  if (diffDays === 0) return `วันนี้ ${clock(ts)}`
  if (diffDays === 1) return `พรุ่งนี้ ${clock(ts)}`
  if (diffDays === -1) return `เมื่อวาน ${clock(ts)}`
  if (diffDays > 1 && diffDays < 7) return `${DAYS[d.getDay()]} ${clock(ts)}`
  return `${shortDate(ts)} ${clock(ts)}`
}

export function agoLabel(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60_000) return 'เมื่อครู่'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} นาทีที่แล้ว`
  if (diff < DAY_MS) return `${Math.floor(diff / 3_600_000)} ชม.ที่แล้ว`
  if (diff < 7 * DAY_MS) return `${Math.floor(diff / DAY_MS)} วันที่แล้ว`
  return shortDate(ts)
}

/** แปลง Date เป็นค่าสำหรับ <input type="datetime-local"> โดยอิงเวลาท้องถิ่น */
export function toLocalInput(ts: number): string {
  const d = new Date(ts - d0(ts))
  return d.toISOString().slice(0, 16)
}

function d0(ts: number) {
  return new Date(ts).getTimezoneOffset() * 60_000
}

export function fromLocalInput(value: string): number {
  return new Date(value).getTime()
}

export function startOfWeek(ts = Date.now()): number {
  const d = new Date(ts)
  const day = (d.getDay() + 6) % 7 // จันทร์เป็นวันแรก
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - day).getTime()
}
