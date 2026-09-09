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

/** แจ้งเตือนผ่านระบบถ้าได้รับอนุญาต และแสดง toast ในแอปเสมอ */
export function pushNotice(title: string, body: string): void {
  listeners.forEach((fn) => fn({ title, body }))
  if (supportsSystemNotification() && Notification.permission === 'granted') {
    void systemNotify(title, { body, icon: '/icon-192.png', tag: title })
  }
  vibrate(30)
}

/** แสดงแจ้งเตือนของระบบ — มือถือ (Android Chrome) แสดงได้ผ่าน service worker เท่านั้น */
async function systemNotify(title: string, options: NotificationOptions): Promise<void> {
  try {
    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined
    if (reg) await reg.showNotification(title, options)
    else new Notification(title, options)
  } catch {
    /* toast ในแอปแสดงไปแล้ว */
  }
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
