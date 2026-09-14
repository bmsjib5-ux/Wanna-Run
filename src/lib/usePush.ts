import { useCallback, useEffect, useState } from 'react'
import * as api from './api'
import { isNative } from './native'
import { currentPushToken, pushSupported, registerForPush, unregisterFromPush, type PushState } from './push'

/**
 * ดูแลการเปิด/ปิดแจ้งเตือนแบบ push ของเครื่องนี้
 * เปิดค้างไว้ครั้งเดียว แล้วเซิร์ฟเวอร์จะเตือนได้แม้ปิดแอปไปแล้ว
 */
export function usePush(ready: boolean): {
  status: PushState
  busy: boolean
  enable: () => Promise<void>
  disable: () => Promise<void>
} {
  const [status, setStatus] = useState<PushState>(() => (pushSupported() ? 'off' : 'unsupported'))
  const [busy, setBusy] = useState(false)

  // เคยอนุญาตไว้แล้ว: ต่ออายุ token เงียบ ๆ ทุกครั้งที่เปิดแอป (FCM เปลี่ยน token ได้เอง)
  useEffect(() => {
    if (!ready || !pushSupported()) return
    let alive = true
    void (async () => {
      const reg = await currentPushToken()
      if (!alive) return
      if (!reg) {
        setStatus(!isNative() && typeof Notification !== 'undefined' && Notification.permission === 'denied' ? 'denied' : 'off')
        return
      }
      try {
        await api.savePushToken(reg)
        if (alive) setStatus('on')
      } catch (err) {
        console.warn('บันทึกอุปกรณ์รับแจ้งเตือนไม่สำเร็จ', err)
      }
    })()
    return () => {
      alive = false
    }
  }, [ready])

  // เบราว์เซอร์ต่ออายุการสมัครเอง — service worker บอกมาให้บันทึก token ใหม่
  useEffect(() => {
    if (!ready || isNative() || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type !== 'wanna-run:resubscribe') return
      void (async () => {
        const reg = await registerForPush()
        if (typeof reg !== 'string') await api.savePushToken(reg).catch(() => undefined)
      })()
    }
    navigator.serviceWorker.addEventListener('message', onMessage)
    return () => navigator.serviceWorker.removeEventListener('message', onMessage)
  }, [ready])

  const enable = useCallback(async () => {
    setBusy(true)
    try {
      const reg = await registerForPush()
      if (typeof reg === 'string') {
        setStatus(reg)
        return
      }
      await api.savePushToken(reg)
      setStatus('on')
    } catch (err) {
      console.error('เปิดแจ้งเตือนไม่สำเร็จ', err)
      setStatus('off')
    } finally {
      setBusy(false)
    }
  }, [])

  const disable = useCallback(async () => {
    setBusy(true)
    try {
      const token = await unregisterFromPush()
      if (token) await api.deletePushToken(token).catch(() => undefined)
      setStatus('off')
    } finally {
      setBusy(false)
    }
  }, [])

  return { status, busy, enable, disable }
}
