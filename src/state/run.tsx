import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react'
import { useRunTracker } from '../lib/useGeo'
import { useWakeLock } from '../lib/wakeLock'
import { notificationPermission, vibrate } from '../lib/notify'
import { closeRunNotification, showRunNotification } from '../lib/runNotice'

type RunContext = ReturnType<typeof useRunTracker> & { wake: ReturnType<typeof useWakeLock> }

const Ctx = createContext<RunContext | null>(null)

/**
 * ตัวจับระยะระดับแอป: เริ่มวิ่งแล้วไปหน้าอื่นได้ ไม่หาย ไม่รีเซ็ต
 * รวมของที่ต้องอยู่ตลอดการวิ่ง (กันจอดับ, แจ้งเตือนบนแถบสถานะ, สั่นทุกกิโล) ไว้ที่นี่
 */
export function RunProvider({ children }: { children: ReactNode }) {
  const run = useRunTracker()
  const { tracker } = run

  const wake = useWakeLock(tracker.running)

  const km = Math.floor(tracker.distanceM / 1000)
  useEffect(() => {
    if (tracker.running && km > 0) vibrate([60, 40, 60])
  }, [km, tracker.running])

  const notifyOn = tracker.running && notificationPermission() === 'granted'
  const latest = useRef({ distanceM: 0, elapsedMs: 0, paused: false })
  latest.current = { distanceM: tracker.distanceM, elapsedMs: tracker.elapsedMs, paused: tracker.paused }
  const halfMinute = Math.floor(tracker.elapsedMs / 30_000)
  useEffect(() => {
    if (!notifyOn) {
      void closeRunNotification()
      return
    }
    const { distanceM, elapsedMs, paused } = latest.current
    void showRunNotification(distanceM, elapsedMs, paused)
  }, [notifyOn, tracker.paused, km, halfMinute])

  return <Ctx.Provider value={{ ...run, wake }}>{children}</Ctx.Provider>
}

export function useRun(): RunContext {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useRun ต้องอยู่ใน RunProvider')
  return ctx
}
