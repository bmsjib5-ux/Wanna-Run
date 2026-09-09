import { Capacitor, registerPlugin } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import type { BackgroundGeolocationPlugin } from '@capacitor-community/background-geolocation'

/** รันอยู่ในแอป Android/iOS (ไม่ใช่เว็บในเบราว์เซอร์) หรือเปล่า */
export function isNative(): boolean {
  return Capacitor.isNativePlatform()
}

const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation')

export type NativePoint = { lat: number; lng: number; accuracy: number }

/**
 * ติดตามตำแหน่งแบบทำงานต่อเนื่องแม้ย่อแอปหรือจอดับ
 *
 * ปลั๊กอินจะเปิด foreground service พร้อมแจ้งเตือนค้างไว้ (Android บังคับ)
 * ซึ่งเป็นสิ่งที่เว็บทำไม่ได้ — คืนฟังก์ชันสำหรับหยุดติดตาม
 */
export function watchPositionNative(
  onPoint: (p: NativePoint) => void,
  onError: (message: string) => void,
): () => void {
  let watcherId: string | null = null
  let stopped = false

  void BackgroundGeolocation.addWatcher(
    {
      backgroundTitle: 'Wanna Run? — กำลังจับระยะทาง',
      backgroundMessage: 'แตะเพื่อกลับไปที่แอป',
      requestPermissions: true,
      stale: false,
      distanceFilter: 2,
    },
    (position, error) => {
      if (error) {
        onError(
          error.code === 'NOT_AUTHORIZED'
            ? 'แอปยังไม่ได้รับสิทธิ์ตำแหน่ง เปิดให้ในหน้าตั้งค่าของเครื่องก่อนนะ'
            : error.message,
        )
        return
      }
      if (position) onPoint({ lat: position.latitude, lng: position.longitude, accuracy: position.accuracy })
    },
  )
    .then((id) => {
      watcherId = id
      // เผลอสั่งหยุดก่อนที่ watcher จะพร้อม ก็ปิดทันทีที่ได้ id
      if (stopped) void BackgroundGeolocation.removeWatcher({ id })
    })
    .catch((err: Error) => onError(err.message))

  return () => {
    stopped = true
    if (watcherId) void BackgroundGeolocation.removeWatcher({ id: watcherId })
    watcherId = null
  }
}

/** เปิดหน้าตั้งค่าของแอป ให้ผู้ใช้ไปเปิดสิทธิ์เองเมื่อเคยกดปฏิเสธไว้ */
export async function openAppSettings(): Promise<void> {
  await BackgroundGeolocation.openSettings()
}

const RUN_NOTIFICATION_ID = 1

/** ขอสิทธิ์แจ้งเตือน (Android 13+ ต้องขอตอนใช้งานจริง) */
export async function ensureNotificationPermission(): Promise<boolean> {
  try {
    const status = await LocalNotifications.checkPermissions()
    if (status.display === 'granted') return true
    const asked = await LocalNotifications.requestPermissions()
    return asked.display === 'granted'
  } catch {
    return false
  }
}

/** แจ้งเตือนค้างบนแถบสถานะ แสดงระยะและเวลาระหว่างวิ่ง */
export async function showRunNotificationNative(title: string, body: string): Promise<void> {
  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: RUN_NOTIFICATION_ID,
          title,
          body,
          ongoing: true,
          autoCancel: false,
        },
      ],
    })
  } catch {
    /* ไม่ได้สิทธิ์แจ้งเตือน ก็ยังวิ่งต่อได้ตามปกติ */
  }
}

export async function clearRunNotificationNative(): Promise<void> {
  try {
    await LocalNotifications.cancel({ notifications: [{ id: RUN_NOTIFICATION_ID }] })
  } catch {
    /* ไม่มีอะไรให้ปิด */
  }
}
