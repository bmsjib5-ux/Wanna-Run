import { useCallback, useEffect, useRef, useState } from 'react'
import type { LatLng, TrackPoint } from '../types'
import { distanceM, offset } from './geo'
import { isNative, watchPositionNative } from './native'

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
  /** เวลาที่ได้พิกัดจาก GPS ครั้งล่าสุด (null = ยังไม่เคยได้เลย) */
  lastFixAt: number | null
  /** เงียบจาก GPS นานผิดปกติ — มักเพราะไม่เห็นท้องฟ้า หรือระบบหยุดแอปไว้ */
  gpsStale: boolean
  /** ระบบปฏิบัติการหยุด/ปิดแอปกลางคัน ระยะช่วงนั้นจึงหายไป */
  interrupted: boolean
  /** จำนวนพิกัดที่ได้รับจาก GPS ทั้งหมด */
  fixes: number
  /** จำนวนพิกัดที่เอามาคิดระยะจริง */
  used: number
  /** จำนวนพิกัดที่ทิ้งเพราะหยาบเกินไปหรือกระโดดผิดปกติ */
  skipped: number
}

/**
 * เกณฑ์คัดกรองพิกัด
 *
 * ของเดิมตัดทิ้งทุกจุดที่คลาดเกิน 40 ม. ซึ่งเข้มเกินไปสำหรับมือถือจริง —
 * โดยเฉพาะ iPhone บนเว็บที่มักได้ค่าราว 50-65 ม. เมื่อไม่ได้จับดาวเทียมเต็มที่
 * ผลคือทุกจุดถูกทิ้ง ระยะจึงค้างที่ 0.00 ตลอดทั้งที่เดินอยู่จริง
 *
 * ตอนนี้รับกว้างขึ้น แต่ใช้เกณฑ์ที่ยืดตามความคลาดเคลื่อนแทน:
 * ยิ่งสัญญาณหยาบ ยิ่งต้องขยับมากขึ้นถึงจะนับว่าเคลื่อนที่จริง
 */
export const MAX_ACCURACY_M = 65

/** ต้องขยับเกินเท่านี้ถึงนับเป็นระยะ (กันตัวเลขวิ่งเองตอนยืนนิ่ง) */
function stepFloorM(accuracy: number): number {
  return Math.max(3, accuracy * 0.3)
}

/** ไกลเกินเท่านี้ถือว่าสัญญาณเด้ง ไม่ใช่การเคลื่อนที่ */
function jumpLimitM(accuracy: number): number {
  return Math.max(120, accuracy * 3)
}
/** ไม่ได้พิกัดใหม่นานกว่านี้ถือว่าผิดปกติ ต้องเตือนผู้ใช้ทันทีระหว่างวิ่ง */
const GPS_STALE_MS = 30_000
/** สแนปช็อตห่างจากปัจจุบันเกินนี้ แปลว่าแอปถูกระบบหยุดไปกลางคัน */
const INTERRUPTED_GAP_MS = 25_000
/** เขียนสแนปช็อตทุกช่วงนี้ แม้ยังไม่ได้พิกัดใหม่ เพื่อให้รู้เวลาที่แอปหยุดไปจริง ๆ */
const SNAPSHOT_EVERY_MS = 10_000

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
    lastFixAt: null,
    gpsStale: false,
    interrupted: false,
    fixes: 0,
    used: 0,
    skipped: 0,
  })
  const [inviteId, setInviteId] = useState<string | undefined>(undefined)

  const watchId = useRef<number | null>(null)
  const stopNative = useRef<(() => void) | null>(null)
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
    stopNative.current?.()
    if (simTimer.current) window.clearInterval(simTimer.current)
    if (tickTimer.current) window.clearInterval(tickTimer.current)
    watchId.current = null
    stopNative.current = null
    simTimer.current = null
    tickTimer.current = null
  }, [])

  useEffect(() => clearAll, [clearAll])

  const addPoint = useCallback((lat: number, lng: number, accuracy: number | null) => {
    setS((prev) => {
      if (!prev.running || pausedRef.current) return prev
      const now = Date.now()
      const acc = accuracy ?? MAX_ACCURACY_M
      // ได้สัญญาณแล้ว ไม่ว่าจะเอามาคิดระยะได้หรือไม่
      const base = { ...prev, accuracy, lastFixAt: now, gpsStale: false, fixes: prev.fixes + 1 }

      // หยาบเกินกว่าจะบอกได้ว่าขยับจริงหรือแค่สัญญาณแกว่ง
      if (acc > MAX_ACCURACY_M) return { ...base, skipped: prev.skipped + 1 }

      const point: TrackPoint = { lat, lng, t: now }
      if (!prev.last) return { ...base, last: point, path: [...prev.path, point], used: prev.used + 1 }

      const d = distanceM(prev.last, point)
      // กระโดดไกลผิดปกติ (สัญญาณเด้ง)
      if (d > jumpLimitM(acc)) return { ...base, skipped: prev.skipped + 1 }
      // ยังไม่พ้นค่าความคลาดเคลื่อน — เก็บจุดอ้างอิงเดิมไว้ ระยะจะสะสมเมื่อขยับพอ
      if (d < stepFloorM(acc)) return base

      return {
        ...base,
        distanceM: prev.distanceM + d,
        path: [...prev.path, point],
        last: point,
        used: prev.used + 1,
      }
    })
  }, [])

  /** เปิดแหล่งข้อมูล (GPS จริง หรือตัวจำลอง) และนาฬิกา — ใช้ทั้งตอนเริ่มใหม่และตอนกู้คืน */
  const engage = useCallback(
    (simulated: boolean, origin?: LatLng) => {
      tickTimer.current = window.setInterval(() => {
        setS((prev) => {
          if (!prev.running || pausedRef.current) return prev
          const now = Date.now()
          const elapsedMs = accumulated.current + (now - startedAt.current)
          // เงียบจาก GPS นานเกินไป (นับจากพิกัดล่าสุด หรือจากตอนกดเริ่มถ้ายังไม่เคยได้เลย)
          const since = prev.lastFixAt ? now - prev.lastFixAt : elapsedMs
          const gpsStale = !prev.simulated && since > GPS_STALE_MS
          if (gpsStale === prev.gpsStale) return { ...prev, elapsedMs }
          return { ...prev, elapsedMs, gpsStale }
        })
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

      // ในแอปมือถือใช้ตัวติดตามเนทีฟ ซึ่งทำงานต่อแม้ย่อแอปหรือจอดับ
      if (isNative()) {
        stopNative.current = watchPositionNative(
          (p) => addPoint(p.lat, p.lng, p.accuracy),
          (message) => setS((prev) => ({ ...prev, error: message })),
        )
        return true
      }

      if (!navigator.geolocation) return false

      watchId.current = navigator.geolocation.watchPosition(
        (pos) => addPoint(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy),
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
        lastFixAt: null,
        gpsStale: false,
        interrupted: false,
        fixes: 0,
        used: 0,
        skipped: 0,
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
    const engaged = watchId.current !== null || simTimer.current !== null || stopNative.current !== null
    if (s.running) {
      if (!engaged) engage(s.simulated, s.path[s.path.length - 1] ?? undefined)
      return
    }
    if (restored.current) return
    restored.current = true
    const saved = loadSavedRun()
    if (!saved) return
    // เวลาที่แอปปิดไปไม่นับ: ปิดยอดเวลาที่วิ่งไว้ แล้วเริ่มนับใหม่จากตอนนี้
    // กันค่าติดลบเผื่อสแนปช็อตเพี้ยน (เช่น นาฬิกาเครื่องถูกปรับย้อนหลัง)
    accumulated.current = Math.max(
      0,
      saved.paused ? saved.accumulated : saved.accumulated + (saved.savedAt - saved.startedAt),
    )
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
      lastFixAt: null,
      gpsStale: false,
      // สแนปช็อตถูกเขียนทุก 10 วินาทีระหว่างวิ่ง ถ้าห่างกว่านั้นมากแปลว่า
      // ระบบหยุดแอปไปช่วงหนึ่ง (สลับแอป จอดับ หรือหน่วยความจำไม่พอ)
      interrupted: !saved.paused && Date.now() - saved.savedAt > INTERRUPTED_GAP_MS,
      fixes: 0,
      used: 0,
      skipped: 0,
    })
    // แหล่งข้อมูลจะถูกต่อโดย effect รอบถัดไปเมื่อสเตตเป็น running แล้ว
  }, [engage, s.running, s.simulated, s.path])

  /**
   * บันทึกสแนปช็อตทุกครั้งที่เส้นทาง/สถานะเปลี่ยน และเขียนซ้ำทุก 10 วินาที
   *
   * การเขียนซ้ำสำคัญกว่าที่คิด: ถ้า GPS ยังจับไม่ได้เลย เส้นทางจะไม่ขยับ
   * สแนปช็อตก็จะค้างอยู่ที่เวลาตอนกดเริ่ม พอแอปถูกระบบปิดแล้วกลับมา
   * จะดูเหมือนเพิ่งเริ่มวิ่ง ทั้งที่ผ่านไปหลายนาที และไม่รู้ว่าถูกขัดจังหวะ
   */
  useEffect(() => {
    if (!s.running) return
    const write = () => {
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
    }
    write()
    const timer = window.setInterval(write, SNAPSHOT_EVERY_MS)
    return () => window.clearInterval(timer)
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
      lastFixAt: null,
      gpsStale: false,
      interrupted: false,
      fixes: 0,
      used: 0,
      skipped: 0,
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
