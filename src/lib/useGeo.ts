import { useCallback, useEffect, useRef, useState } from 'react'
import type { LatLng, TrackPoint } from '../types'
import { distanceM, offset } from './geo'

export type GeoStatus = 'idle' | 'locating' | 'ready' | 'denied' | 'unsupported' | 'error'

export type GeoState = {
  position: LatLng | null
  accuracy: number | null
  status: GeoStatus
  error: string | null
}

const DEFAULT_CENTER: LatLng = { lat: 13.7305, lng: 100.5418 } // สวนลุมพินี

/** ขอตำแหน่งปัจจุบันครั้งเดียว */
export function useCurrentPosition(auto = true): GeoState & { locate: () => void; fallback: LatLng } {
  const [geo, setGeo] = useState<GeoState>({ position: null, accuracy: null, status: 'idle', error: null })

  const locate = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeo({ position: null, accuracy: null, status: 'unsupported', error: 'อุปกรณ์นี้ไม่รองรับการระบุตำแหน่ง' })
      return
    }
    setGeo((g) => ({ ...g, status: 'locating', error: null }))
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setGeo({
          position: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          accuracy: pos.coords.accuracy,
          status: 'ready',
          error: null,
        }),
      (err) =>
        setGeo({
          position: null,
          accuracy: null,
          status: err.code === err.PERMISSION_DENIED ? 'denied' : 'error',
          error: describeGeoError(err),
        }),
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 15_000 },
    )
  }, [])

  useEffect(() => {
    if (auto) locate()
  }, [auto, locate])

  return { ...geo, locate, fallback: geo.position ?? DEFAULT_CENTER }
}

export function describeGeoError(err: GeolocationPositionError): string {
  if (err.code === err.PERMISSION_DENIED) return 'ไม่ได้รับอนุญาตให้เข้าถึงตำแหน่ง เปิดสิทธิ์ในตั้งค่าเบราว์เซอร์ได้'
  if (err.code === err.POSITION_UNAVAILABLE) return 'หาตำแหน่งไม่เจอ ลองออกไปที่โล่งแล้วลองใหม่'
  return 'ขอตำแหน่งไม่สำเร็จ ลองอีกครั้ง'
}

export type TrackerState = {
  running: boolean
  paused: boolean
  distanceM: number
  elapsedMs: number
  path: TrackPoint[]
  last: LatLng | null
  accuracy: number | null
  error: string | null
  simulated: boolean
}

const MAX_ACCURACY_M = 40
const MAX_JUMP_M = 120

/** สแนปช็อตของการวิ่งที่ค้างอยู่ เก็บในเครื่องเพื่อให้กลับมาต่อได้หลังสลับหน้า/รีโหลด/แอปถูกปิด */
type SavedRun = {
  version: 1
  path: TrackPoint[]
  distanceM: number
  paused: boolean
  simulated: boolean
  startedAt: number
  accumulated: number
  inviteId?: string
  savedAt: number
}

const ACTIVE_RUN_KEY = 'wanna-run.active-run'
/** ค้างไว้นานกว่านี้ถือว่าเป็นการวิ่งเก่าที่ลืมจบ ไม่กู้คืน */
const MAX_RESTORE_AGE_MS = 6 * 3_600_000

function loadSavedRun(): SavedRun | null {
  try {
    const raw = localStorage.getItem(ACTIVE_RUN_KEY)
    if (!raw) return null
    const saved = JSON.parse(raw) as SavedRun
    if (saved.version !== 1 || Date.now() - saved.savedAt > MAX_RESTORE_AGE_MS) return null
    return saved
  } catch {
    return null
  }
}

function clearSavedRun(): void {
  try {
    localStorage.removeItem(ACTIVE_RUN_KEY)
  } catch {
    /* ไม่มีอะไรให้ล้าง */
  }
}

/**
 * จับระยะทางการวิ่งจาก GPS พร้อมโหมดจำลองสำหรับอุปกรณ์ที่ไม่มีสัญญาณ
 *
 * ตัวจับนี้อยู่ใน RunProvider ระดับแอป (ไม่ใช่ในหน้าจอ) จึงไม่หายเมื่อสลับเมนู
 * และบันทึกสแนปช็อตลงเครื่องตลอด — เปิดแอปใหม่แล้วจะวิ่งต่อจากเดิม
 * โดยไม่นับเวลาช่วงที่แอปถูกปิดไป
 */
export function useRunTracker() {
  const [s, setS] = useState<TrackerState>({
    running: false,
    paused: false,
    distanceM: 0,
    elapsedMs: 0,
    path: [],
    last: null,
    accuracy: null,
    error: null,
    simulated: false,
  })
  const [inviteId, setInviteId] = useState<string | undefined>(undefined)

  const watchId = useRef<number | null>(null)
  const simTimer = useRef<number | null>(null)
  const tickTimer = useRef<number | null>(null)
  const startedAt = useRef(0)
  const accumulated = useRef(0)
  const pausedRef = useRef(false)
  const simHeading = useRef(Math.random() * 360)
  const inviteRef = useRef<string | undefined>(undefined)
  const restored = useRef(false)

  const clearAll = useCallback(() => {
    if (watchId.current !== null && navigator.geolocation) navigator.geolocation.clearWatch(watchId.current)
    if (simTimer.current) window.clearInterval(simTimer.current)
    if (tickTimer.current) window.clearInterval(tickTimer.current)
    watchId.current = null
    simTimer.current = null
    tickTimer.current = null
  }, [])

  useEffect(() => clearAll, [clearAll])

  const addPoint = useCallback((lat: number, lng: number, accuracy: number | null) => {
    setS((prev) => {
      if (!prev.running || pausedRef.current) return prev
      const point: TrackPoint = { lat, lng, t: Date.now() }
      if (!prev.last) return { ...prev, last: point, path: [...prev.path, point], accuracy }
      const d = distanceM(prev.last, point)
      // ทิ้งจุดที่กระโดดไกลผิดปกติ (สัญญาณเด้ง)
      if (d > MAX_JUMP_M) return { ...prev, accuracy }
      // ทิ้งการขยับเล็กน้อยตอนยืนนิ่ง
      if (d < 2) return { ...prev, accuracy }
      return {
        ...prev,
        distanceM: prev.distanceM + d,
        path: [...prev.path, point],
        last: point,
        accuracy,
      }
    })
  }, [])

  /** เปิดแหล่งข้อมูล (GPS จริง หรือตัวจำลอง) และนาฬิกา — ใช้ทั้งตอนเริ่มใหม่และตอนกู้คืน */
  const engage = useCallback(
    (simulated: boolean, origin?: LatLng) => {
      tickTimer.current = window.setInterval(() => {
        setS((prev) =>
          prev.running && !pausedRef.current
            ? { ...prev, elapsedMs: accumulated.current + (Date.now() - startedAt.current) }
            : prev,
        )
      }, 250)

      if (simulated) {
        let cursor = origin ?? DEFAULT_CENTER
        simTimer.current = window.setInterval(() => {
          if (pausedRef.current) return
          simHeading.current += (Math.random() - 0.5) * 40
          // ก้าวละ ~1 วินาที ที่ความเร็วประมาณ 10-13 กม./ชม.
          cursor = offset(cursor, 3 + Math.random() * 0.8, simHeading.current)
          addPoint(cursor.lat, cursor.lng, 5)
        }, 1000)
        return true
      }

      if (!navigator.geolocation) return false

      watchId.current = navigator.geolocation.watchPosition(
        (pos) => {
          if (pos.coords.accuracy > MAX_ACCURACY_M) {
            setS((prev) => ({ ...prev, accuracy: pos.coords.accuracy }))
            return
          }
          addPoint(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy)
        },
        (err) => setS((prev) => ({ ...prev, error: describeGeoError(err) })),
        { enableHighAccuracy: true, maximumAge: 1000, timeout: 20_000 },
      )
      return true
    },
    [addPoint],
  )

  const start = useCallback(
    (simulated: boolean, origin?: LatLng, forInvite?: string) => {
      clearAll()
      startedAt.current = Date.now()
      accumulated.current = 0
      pausedRef.current = false
      inviteRef.current = forInvite
      setInviteId(forInvite)
      setS({
        running: true,
        paused: false,
        distanceM: 0,
        elapsedMs: 0,
        path: [],
        last: null,
        accuracy: null,
        error: null,
        simulated,
      })
      if (simulated && origin) addPoint(origin.lat, origin.lng, 5)
      if (!engage(simulated, origin)) {
        setS((prev) => ({ ...prev, running: false, error: 'อุปกรณ์นี้ไม่รองรับ GPS ลองใช้โหมดจำลอง' }))
        clearAll()
      }
    },
    [addPoint, clearAll, engage],
  )

  // กู้คืนการวิ่งที่ค้างอยู่ตอนเปิดแอป และต่อแหล่งข้อมูลใหม่ถ้าถูกถอด
  // (StrictMode ในโหมดพัฒนาจะถอด/ใส่ effect ซ้ำ ทำให้ timer ถูกล้างทั้งที่สเตตยัง running)
  useEffect(() => {
    const engaged = watchId.current !== null || simTimer.current !== null
    if (s.running) {
      if (!engaged) engage(s.simulated, s.path[s.path.length - 1] ?? undefined)
      return
    }
    if (restored.current) return
    restored.current = true
    const saved = loadSavedRun()
    if (!saved) return
    // เวลาที่แอปปิดไปไม่นับ: ปิดยอดเวลาที่วิ่งไว้ แล้วเริ่มนับใหม่จากตอนนี้
    accumulated.current = saved.paused ? saved.accumulated : saved.accumulated + (saved.savedAt - saved.startedAt)
    startedAt.current = Date.now()
    pausedRef.current = saved.paused
    inviteRef.current = saved.inviteId
    setInviteId(saved.inviteId)
    setS({
      running: true,
      paused: saved.paused,
      distanceM: saved.distanceM,
      elapsedMs: accumulated.current,
      // หลังกู้คืนให้เริ่มวัดจากจุดใหม่ ไม่ลากเส้นจากจุดเก่าข้ามช่วงที่หายไป
      path: saved.path,
      last: null,
      accuracy: null,
      error: null,
      simulated: saved.simulated,
    })
    // แหล่งข้อมูลจะถูกต่อโดย effect รอบถัดไปเมื่อสเตตเป็น running แล้ว
  }, [engage, s.running, s.simulated, s.path])

  // บันทึกสแนปช็อตทุกครั้งที่เส้นทาง/สถานะเปลี่ยน (นาฬิกาเดินทุก 250ms ไม่ทำให้เซฟ)
  useEffect(() => {
    if (!s.running) return
    const snapshot: SavedRun = {
      version: 1,
      path: s.path,
      distanceM: s.distanceM,
      paused: s.paused,
      simulated: s.simulated,
      startedAt: startedAt.current,
      accumulated: accumulated.current,
      inviteId: inviteRef.current,
      savedAt: Date.now(),
    }
    try {
      localStorage.setItem(ACTIVE_RUN_KEY, JSON.stringify(snapshot))
    } catch {
      /* เต็มหรือปิดใช้ ก็แค่กู้คืนไม่ได้ */
    }
  }, [s.running, s.path, s.distanceM, s.paused, s.simulated])

  const pause = useCallback(() => {
    if (pausedRef.current) return
    pausedRef.current = true
    accumulated.current += Date.now() - startedAt.current
    setS((prev) => ({ ...prev, paused: true }))
  }, [])

  const resume = useCallback(() => {
    if (!pausedRef.current) return
    pausedRef.current = false
    startedAt.current = Date.now()
    setS((prev) => ({ ...prev, paused: false, last: null }))
  }, [])

  const stop = useCallback(() => {
    clearAll()
    clearSavedRun()
    if (!pausedRef.current) accumulated.current += Date.now() - startedAt.current
    pausedRef.current = false
    setS((prev) => ({ ...prev, running: false, paused: false, elapsedMs: accumulated.current }))
  }, [clearAll])

  const reset = useCallback(() => {
    clearAll()
    clearSavedRun()
    pausedRef.current = false
    inviteRef.current = undefined
    setInviteId(undefined)
    setS({
      running: false,
      paused: false,
      distanceM: 0,
      elapsedMs: 0,
      path: [],
      last: null,
      accuracy: null,
      error: null,
      simulated: false,
    })
  }, [clearAll])

  return { tracker: s, inviteId, start, pause, resume, stop, reset }
}

export type FriendPing = { id: string; pos: LatLng; movingKmh: number }

/**
 * ตำแหน่งสดของเพื่อนสำหรับแผนที่ (จำลองการเคลื่อนที่รอบจุดประจำของแต่ละคน
 * เนื่องจากเวอร์ชันนี้ยังไม่มีเซิร์ฟเวอร์กลาง)
 */
export function useFriendPings(friends: Array<{ id: string; home: LatLng; sharingLocation: boolean }>): FriendPing[] {
  const [pings, setPings] = useState<FriendPing[]>([])
  const stateRef = useRef<Record<string, { pos: LatLng; heading: number; speed: number }>>({})

  useEffect(() => {
    const active = friends.filter((f) => f.sharingLocation)
    for (const f of active) {
      if (!stateRef.current[f.id]) {
        stateRef.current[f.id] = {
          pos: offset(f.home, 60 + Math.random() * 180, Math.random() * 360),
          heading: Math.random() * 360,
          speed: 7 + Math.random() * 5,
        }
      }
    }
    for (const id of Object.keys(stateRef.current)) {
      if (!active.some((f) => f.id === id)) delete stateRef.current[id]
    }

    const step = () => {
      const out: FriendPing[] = []
      for (const f of active) {
        const st = stateRef.current[f.id]
        if (!st) continue
        st.heading += (Math.random() - 0.5) * 50
        // ดึงกลับเข้าหาจุดประจำเมื่อออกห่างเกิน 500 เมตร
        if (distanceM(st.pos, f.home) > 500) {
          st.heading = bearing(st.pos, f.home)
        }
        const metersPerTick = (st.speed * 1000) / 3600 * 2
        st.pos = offset(st.pos, metersPerTick, st.heading)
        out.push({ id: f.id, pos: st.pos, movingKmh: st.speed })
      }
      // ไม่มีใครแชร์ตำแหน่งก็ไม่ต้องสร้างอาร์เรย์ใหม่ทุกรอบ ไม่งั้นทั้งหน้าจะวาดใหม่ทุก 2 วินาที
      setPings((prev) => (prev.length === 0 && out.length === 0 ? prev : out))
    }

    step()
    const timer = window.setInterval(step, 2000)
    return () => window.clearInterval(timer)
  }, [friends])

  return pings
}

function bearing(a: LatLng, b: LatLng): number {
  const y = b.lng - a.lng
  const x = b.lat - a.lat
  return (Math.atan2(y, x) * 180) / Math.PI
}
