import { formatDuration, formatKm } from './geo'
import { notificationPermission } from './notify'
import { clearRunNotificationNative, isNative, showRunNotificationNative } from './native'

const TAG = 'wanna-run:tracking'

async function registration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  try {
    return (await navigator.serviceWorker.getRegistration()) ?? null
  } catch {
    return null
  }
}

/**
 * แจ้งเตือนค้างบนแถบสถานะระหว่างจับระยะ (Android) — ใช้ tag เดิมจึงอัปเดตแทนที่ ไม่เด้งซ้ำ
 * มือถือต้องแสดงผ่าน service worker เท่านั้น ส่วน `new Notification` เหลือไว้สำหรับเดสก์ท็อป/dev
 */
export async function showRunNotification(distanceM: number, elapsedMs: number, paused: boolean): Promise<void> {
  const title = paused ? '⏸ พักการวิ่ง' : '🏃 กำลังวิ่ง'
  const body = `${formatKm(distanceM)} กม. · ${formatDuration(elapsedMs)} — แตะเพื่อกลับไปที่แอป`
  if (isNative()) {
    await showRunNotificationNative(title, body)
    return
  }
  if (notificationPermission() !== 'granted') return
  const options: NotificationOptions & { renotify?: boolean } = {
    body,
    tag: TAG,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    silent: true,
    renotify: false,
    requireInteraction: true,
    data: { url: '/' },
  }
  const reg = await registration()
  try {
    if (reg) await reg.showNotification(title, options)
    else new Notification(title, options)
  } catch {
    /* บางเบราว์เซอร์ไม่ให้แสดงจากหน้าเว็บโดยตรง ไม่เป็นไร */
  }
}

export async function closeRunNotification(): Promise<void> {
  if (isNative()) {
    await clearRunNotificationNative()
    return
  }
  const reg = await registration()
  if (!reg) return
  try {
    const list = await reg.getNotifications({ tag: TAG })
    list.forEach((n) => n.close())
  } catch {
    /* ไม่มีอะไรให้ปิด */
  }
}
