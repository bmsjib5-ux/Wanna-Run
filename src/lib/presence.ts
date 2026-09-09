import { useEffect, useState } from 'react'
import { agoLabel } from './format'

/**
 * สถานะออนไลน์มาจากสองอย่างประกอบกัน
 * - is_online: แอปตั้ง true ตอนเปิดอยู่ และ false ทันทีตอนถูกย่อ/ปิด
 * - last_active_at: heartbeat ทุก HEARTBEAT_MS กันกรณีแอปตาย/แบตหมดโดยไม่ได้บอกลา
 *   ถ้าเงียบเกิน ONLINE_WINDOW_MS ถือว่าออฟไลน์แม้ธงยังเป็น true
 * เวลาทั้งหมดเทียบกับนาฬิกาเซิร์ฟเวอร์ (ดู setServerTime) ไม่ใช่นาฬิกาของแต่ละเครื่อง
 */
export const HEARTBEAT_MS = 60_000
export const ONLINE_WINDOW_MS = 3 * 60_000

/** ส่วนต่างระหว่างนาฬิกาเซิร์ฟเวอร์กับเครื่องนี้ (มิลลิวินาที) */
let clockOffset = 0

export function setServerTime(serverIso: string): void {
  const t = new Date(serverIso).getTime()
  if (Number.isFinite(t)) clockOffset = t - Date.now()
}

export function serverNow(now = Date.now()): number {
  return now + clockOffset
}

export type Presence = { lastActiveAt: number; online?: boolean }

export function isOnline(p: Presence, now = Date.now()): boolean {
  if (p.online === false) return false
  return serverNow(now) - p.lastActiveAt < ONLINE_WINDOW_MS
}

/** "ออนไลน์" หรือ "ออนไลน์ล่าสุด 10 นาทีที่แล้ว" */
export function presenceLabel(p: Presence, now = Date.now()): string {
  if (isOnline(p, now)) return 'ออนไลน์'
  return `ออนไลน์ล่าสุด ${agoLabel(p.lastActiveAt - clockOffset)}`
}

/** เวลาปัจจุบันที่เดินเป็นจังหวะ เพื่อให้ป้ายออนไลน์เปลี่ยนเองแม้ข้อมูลไม่ขยับ */
export function useNow(intervalMs = 15_000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(timer)
  }, [intervalMs])
  return now
}
