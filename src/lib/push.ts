import { registerPlugin } from '@capacitor/core'
import { isNative } from './native'

/**
 * แจ้งเตือนแบบ push — เตือนได้แม้ปิดแอปไปแล้ว
 *
 * Android (APK): ใช้ Firebase Cloud Messaging ผ่านปลั๊กอินของ Capacitor
 * เว็บ/PWA: ใช้ Web Push มาตรฐานของเบราว์เซอร์ ผ่าน service worker
 *
 * ทั้งสองทางจบที่ตาราง push_tokens แล้ว Edge Function "push" เป็นคนส่งจริง
 */

export type PushPlatform = 'android' | 'ios' | 'web'
export type PushRegistration = { platform: PushPlatform; token: string; p256dh?: string; auth?: string; device: string }
export type PushState = 'off' | 'on' | 'denied' | 'unsupported'

type PermissionState = 'prompt' | 'prompt-with-rationale' | 'granted' | 'denied'

type PushPlugin = {
  checkPermissions(): Promise<{ receive: PermissionState }>
  requestPermissions(): Promise<{ receive: PermissionState }>
  register(): Promise<void>
  createChannel?(channel: { id: string; name: string; description?: string; importance: number; visibility?: number }): Promise<void>
  unregister?(): Promise<void>
  addListener(event: 'registration', fn: (t: { value: string }) => void): Promise<{ remove: () => Promise<void> }>
  addListener(event: 'registrationError', fn: (e: { error: string }) => void): Promise<{ remove: () => Promise<void> }>
  addListener(
    event: 'pushNotificationActionPerformed',
    fn: (e: { notification: { data?: Record<string, string> } }) => void,
  ): Promise<{ remove: () => Promise<void> }>
}

const PushNotifications = registerPlugin<PushPlugin>('PushNotifications')

const VAPID_PUBLIC_KEY = (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined)?.trim()
const REGISTER_TIMEOUT_MS = 15_000

export function pushSupported(): boolean {
  if (isNative()) return true
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && Boolean(VAPID_PUBLIC_KEY)
}

function deviceLabel(): string {
  if (typeof navigator === 'undefined') return ''
  return `${isNative() ? 'แอป' : 'เบราว์เซอร์'} · ${navigator.userAgent.slice(0, 80)}`
}

// ---------- Android / iOS ----------

/** ขอสิทธิ์แล้วรอ FCM ส่ง token กลับมา — ปลั๊กอินคืนค่าผ่าน event ไม่ใช่ค่าคืนของ register() */
async function registerNative(): Promise<PushRegistration | PushState> {
  let permission = (await PushNotifications.checkPermissions()).receive
  if (permission !== 'granted') permission = (await PushNotifications.requestPermissions()).receive
  if (permission !== 'granted') return 'denied'

  // Android 8 ขึ้นไปต้องมีช่องแจ้งเตือนอยู่ก่อน ไม่งั้นแจ้งเตือนจะเงียบหายไปเฉย ๆ
  await PushNotifications.createChannel?.({
    id: 'wanna-run',
    name: 'ไปวิ่งไหม',
    description: 'คำชวนไปวิ่งและคำตอบจากเพื่อน',
    importance: 4,
    visibility: 1,
  }).catch(() => undefined)

  return await new Promise<PushRegistration | PushState>((resolve) => {
    let settled = false
    const finish = (value: PushRegistration | PushState) => {
      if (settled) return
      settled = true
      void ok.then((h) => h.remove())
      void failed.then((h) => h.remove())
      window.clearTimeout(timer)
      resolve(value)
    }
    const ok = PushNotifications.addListener('registration', (t) =>
      finish({ platform: 'android', token: t.value, device: deviceLabel() }),
    )
    const failed = PushNotifications.addListener('registrationError', (e) => {
      console.error('ลงทะเบียนแจ้งเตือนไม่สำเร็จ', e.error)
      finish('unsupported')
    })
    const timer = window.setTimeout(() => finish('unsupported'), REGISTER_TIMEOUT_MS)
    void PushNotifications.register().catch(() => finish('unsupported'))
  })
}

/** พาผู้ใช้ไปหน้าที่ถูกต้องเมื่อแตะแจ้งเตือนจากแถบสถานะ */
export function onPushOpened(handler: (goto: string) => void): () => void {
  if (!isNative()) return () => undefined
  const sub = PushNotifications.addListener('pushNotificationActionPerformed', (e) => {
    const goto = e.notification?.data?.goto
    if (goto) handler(goto)
  })
  return () => void sub.then((h) => h.remove())
}

// ---------- เว็บ / PWA ----------

function urlBase64ToUint8Array(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(normalized + '='.repeat((4 - (normalized.length % 4)) % 4))
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i)
  return out
}

function keyToBase64Url(sub: PushSubscription, name: 'p256dh' | 'auth'): string {
  const raw = sub.getKey(name)
  if (!raw) return ''
  let binary = ''
  for (const byte of new Uint8Array(raw)) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function registerWeb(): Promise<PushRegistration | PushState> {
  if (!VAPID_PUBLIC_KEY) return 'unsupported'
  const reg = await navigator.serviceWorker.ready
  if (Notification.permission !== 'granted') {
    const asked = await Notification.requestPermission()
    if (asked !== 'granted') return asked === 'denied' ? 'denied' : 'off'
  }
  const existing = await reg.pushManager.getSubscription()
  const sub =
    existing ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
    }))
  return {
    platform: 'web',
    token: sub.endpoint,
    p256dh: keyToBase64Url(sub, 'p256dh'),
    auth: keyToBase64Url(sub, 'auth'),
    device: deviceLabel(),
  }
}

// ---------- ใช้งานร่วม ----------

/** ขอสิทธิ์และคืนข้อมูลอุปกรณ์ที่พร้อมรับแจ้งเตือน หรือคืนสาเหตุที่ยังไม่ได้ */
export async function registerForPush(): Promise<PushRegistration | PushState> {
  if (!pushSupported()) return 'unsupported'
  try {
    return isNative() ? await registerNative() : await registerWeb()
  } catch (err) {
    console.error('เปิดแจ้งเตือนไม่สำเร็จ', err)
    return 'unsupported'
  }
}

/** คืน token ปัจจุบันถ้าเคยอนุญาตไว้แล้ว โดยไม่ไปเด้งขอสิทธิ์ซ้ำ */
export async function currentPushToken(): Promise<PushRegistration | null> {
  if (!pushSupported()) return null
  try {
    if (isNative()) {
      if ((await PushNotifications.checkPermissions()).receive !== 'granted') return null
      const result = await registerNative()
      return typeof result === 'string' ? null : result
    }
    if (Notification.permission !== 'granted') return null
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (!sub) return null
    return {
      platform: 'web',
      token: sub.endpoint,
      p256dh: keyToBase64Url(sub, 'p256dh'),
      auth: keyToBase64Url(sub, 'auth'),
      device: deviceLabel(),
    }
  } catch {
    return null
  }
}

/** เลิกรับแจ้งเตือนบนเครื่องนี้ คืน token เดิมไว้ให้ลบออกจากเซิร์ฟเวอร์ */
export async function unregisterFromPush(): Promise<string | null> {
  try {
    if (isNative()) {
      const current = await currentPushToken()
      await PushNotifications.unregister?.()
      return current?.token ?? null
    }
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (!sub) return null
    const endpoint = sub.endpoint
    await sub.unsubscribe()
    return endpoint
  } catch {
    return null
  }
}
