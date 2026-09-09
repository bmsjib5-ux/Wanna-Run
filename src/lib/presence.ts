import { useEffect, useState } from 'react'
import { agoLabel } from './format'

/**
 * สถานะออนไลน์คำนวณจากเวลาที่เห็นล่าสุด (last_active_at) ไม่ใช่สวิตช์ที่ผู้ใช้เปิดเอง
 * แอปส่ง heartbeat ทุก HEARTBEAT_MS ตอนเปิดอยู่ ดังนั้นถ้าเงียบเกิน ONLINE_WINDOW_MS
 * ถือว่าออฟไลน์ (เผื่อพลาดไปหนึ่งจังหวะจากเน็ตสะดุด)
 */
export const HEARTBEAT_MS = 60_000
export const ONLINE_WINDOW_MS = 2 * 60_000

export function isOnline(lastActiveAt: number, now = Date.now()): boolean {
  return now - lastActiveAt < ONLINE_WINDOW_MS
}

/** "ออนไลน์" หรือ "ออนไลน์ล่าสุด 10 นาทีที่แล้ว" */
export function presenceLabel(lastActiveAt: number, now = Date.now()): string {
  if (isOnline(lastActiveAt, now)) return 'ออนไลน์'
  return `ออนไลน์ล่าสุด ${agoLabel(lastActiveAt)}`
}

/** เวลาปัจจุบันที่เดินเป็นจังหวะ เพื่อให้ป้ายออนไลน์เปลี่ยนเองแม้ข้อมูลไม่ขยับ */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(timer)
  }, [intervalMs])
  return now
}
