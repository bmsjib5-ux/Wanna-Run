import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react'
import { useRunTracker } from '../lib/useGeo'
import { useWakeLock } from '../lib/wakeLock'
import { notificationPermission, pushNotice, vibrate } from '../lib/notify'
import { isNative } from '../lib/native'
import { closeRunNotification, showRunNotification } from '../lib/runNotice'
import { KM_STEP_M, TIME_STEP_MS, runAlertFor, type RunMark } from '../lib/runAlerts'

type RunContext = ReturnType<typeof useRunTracker> & { wake: ReturnType<typeof useWakeLock> }

const Ctx = createContext<RunContext | null>(null)

/**
 * ตัวจับระยะระดับแอป: เริ่มวิ่งแล้วไปหน้าอื่นได้ ไม่หาย ไม่รีเซ็ต
 * รวมของที่ต้องอยู่ตลอดการวิ่ง (กันจอดับ, แจ้งเตือนบนแถบสถานะ, เตือนทุกกิโลและทุก 5 นาที) ไว้ที่นี่
 */
export function RunProvider({ children }: { children: ReactNode }) {
  const run = useRunTracker()
  const { tracker } = run

  const wake = useWakeLock(tracker.running)

  const km = Math.floor(tracker.distanceM / KM_STEP_M)
  const timeBlock = Math.floor(tracker.elapsedMs / TIME_STEP_MS)

  // จำหลักที่ผ่านไปแล้วไว้ เพื่อไม่ให้เตือนซ้ำเมื่อคอมโพเนนต์เรนเดอร์ใหม่
  const passed = useRef<RunMark | null>(null)
  const stats = useRef({ distanceM: 0, elapsedMs: 0, paused: false })
  stats.current = { distanceM: tracker.distanceM, elapsedMs: tracker.elapsedMs, paused: tracker.paused }

  useEffect(() => {
    if (!tracker.running) {
      passed.current = null
      return
    }
    const { distanceM, elapsedMs } = stats.current
    const alert = runAlertFor(passed.current, distanceM, elapsedMs)
    passed.current = { km, timeBlock }
    if (!alert) return
    pushNotice(alert.title, alert.body)
    // สั่นทีหลัง เพื่อให้จังหวะของหมุดหมายทับจังหวะสั้น ๆ ของ toast
    vibrate(alert.pattern)
  }, [tracker.running, km, timeBlock])

  // ในแอปมือถือใช้ LocalNotifications ซึ่งขอสิทธิ์ตอนกดเริ่มวิ่ง ไม่ต้องเช็ค Notification ของเว็บ
  const notifyOn = tracker.running && (isNative() || notificationPermission() === 'granted')
  // ตัวเลขบนแถบสถานะอัปเดตทุกครึ่งนาทีแบบเงียบ ๆ (ไม่ใช่การเตือน) จะได้ไม่ค้างนานถึง 5 นาที
  const halfMinute = Math.floor(tracker.elapsedMs / 30_000)
  useEffect(() => {
    if (!notifyOn) {
      void closeRunNotification()
      return
    }
    const { distanceM, elapsedMs, paused } = stats.current
    void showRunNotification(distanceM, elapsedMs, paused)
  }, [notifyOn, tracker.paused, km, halfMinute, timeBlock])

  return <Ctx.Provider value={{ ...run, wake }}>{children}</Ctx.Provider>
}

export function useRun(): RunContext {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useRun ต้องอยู่ใน RunProvider')
  return ctx
}
