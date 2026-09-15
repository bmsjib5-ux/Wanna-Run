type Listener = (msg: { title: string; body: string }) => void

const listeners = new Set<Listener>()

export function onToast(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function supportsSystemNotification(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function notificationPermission(): NotificationPermission | 'unsupported' {
  if (!supportsSystemNotification()) return 'unsupported'
  return Notification.permission
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!supportsSystemNotification()) return 'unsupported'
  try {
    return await Notification.requestPermission()
  } catch {
    return Notification.permission
  }
}

/**
 * แสดง toast ในแอปพร้อมสั่นเบา ๆ
 *
 * ตั้งใจไม่สร้างแจ้งเตือนของระบบจากตรงนี้ เพราะเหตุการณ์ที่ต้องเตือนจริง ๆ
 * (เพื่อนชวนวิ่ง ตอบคำชวน ทักทาย) เซิร์ฟเวอร์ยิง push มาให้อยู่แล้ว
 * ถ้าฝั่งแอปเตือนซ้ำอีกที ผู้ใช้จะเห็นเรื่องเดียวกันสองครั้ง
 */
export function pushNotice(title: string, body: string): void {
  listeners.forEach((fn) => fn({ title, body }))
  vibrate(30)
}

export function vibrate(pattern: number | number[]): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern)
    } catch {
      /* ไม่รองรับ */
    }
  }
}
