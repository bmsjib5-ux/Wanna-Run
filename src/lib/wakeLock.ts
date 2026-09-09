import { useEffect, useState } from 'react'

type WakeLockSentinelLike = { release: () => Promise<void>; addEventListener: (t: 'release', fn: () => void) => void }

export function supportsWakeLock(): boolean {
  return typeof navigator !== 'undefined' && 'wakeLock' in navigator
}

/**
 * กันหน้าจอดับระหว่างจับระยะทาง — เว็บไม่มีทางรับ GPS ต่อเมื่อจอดับ (โดยเฉพาะ iPhone)
 * การเปิดจอค้างไว้จึงเป็นวิธีเดียวที่ทำให้บันทึกได้ครบทั้งเส้นทาง
 * ระบบจะปล่อยล็อกเองเมื่อสลับแอป จึงต้องขอใหม่ทุกครั้งที่กลับมา
 */
export function useWakeLock(active: boolean): 'held' | 'off' | 'unsupported' {
  const [status, setStatus] = useState<'held' | 'off' | 'unsupported'>(() =>
    supportsWakeLock() ? 'off' : 'unsupported',
  )

  useEffect(() => {
    if (!active || !supportsWakeLock()) return
    let sentinel: WakeLockSentinelLike | null = null
    let disposed = false

    const acquire = async () => {
      if (disposed || document.visibilityState !== 'visible') return
      try {
        const wl = (navigator as Navigator & { wakeLock: { request: (t: 'screen') => Promise<WakeLockSentinelLike> } }).wakeLock
        sentinel = await wl.request('screen')
        sentinel.addEventListener('release', () => {
          sentinel = null
          if (!disposed) setStatus('off')
        })
        if (!disposed) setStatus('held')
      } catch {
        // แบตต่ำ/โหมดประหยัดพลังงานจะปฏิเสธ ก็แค่จอดับได้ตามปกติ
        if (!disposed) setStatus('off')
      }
    }

    const onVisible = () => {
      if (document.visibilityState === 'visible') void acquire()
    }
    void acquire()
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      disposed = true
      document.removeEventListener('visibilitychange', onVisible)
      void sentinel?.release()
      setStatus('off')
    }
  }, [active])

  return status
}
