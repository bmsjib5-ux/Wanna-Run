import type { LatLng, TrackPoint } from '../types'

const R = 6371000

/** ระยะทางระหว่างสองพิกัดเป็นเมตร (Haversine) */
export function distanceM(a: LatLng, b: LatLng): number {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return 2 * R * Math.asin(Math.sqrt(h))
}

export function pathDistanceM(path: TrackPoint[]): number {
  let total = 0
  for (let i = 1; i < path.length; i++) total += distanceM(path[i - 1], path[i])
  return total
}

export function formatKm(meters: number, digits = 2): string {
  return (meters / 1000).toFixed(digits)
}

export function formatDuration(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`
}

/** เพซเป็น นาที:วินาที ต่อกิโลเมตร */
export function formatPace(meters: number, ms: number): string {
  if (meters < 20 || ms < 1000) return '--:--'
  const secPerKm = ms / 1000 / (meters / 1000)
  if (!isFinite(secPerKm) || secPerKm > 60 * 60) return '--:--'
  const m = Math.floor(secPerKm / 60)
  const s = Math.round(secPerKm % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export function paceLabel(secPerKm: number): string {
  const m = Math.floor(secPerKm / 60)
  const s = Math.round(secPerKm % 60)
  return `${m}:${String(s).padStart(2, '0')} /กม.`
}

/** ประมาณแคลอรี่แบบหยาบ ๆ จากระยะทาง (~1 kcal ต่อ กก. ต่อ กม.) */
export function estimateKcal(meters: number, weightKg = 60): number {
  return Math.round((meters / 1000) * weightKg * 0.95)
}

/** เลื่อนพิกัดไปตามระยะ (เมตร) และมุม (องศา) */
export function offset(p: LatLng, meters: number, bearingDeg: number): LatLng {
  const br = (bearingDeg * Math.PI) / 180
  const dLat = (meters * Math.cos(br)) / 111320
  const dLng = (meters * Math.sin(br)) / (111320 * Math.cos((p.lat * Math.PI) / 180))
  return { lat: p.lat + dLat, lng: p.lng + dLng }
}

export function boundsOf(points: LatLng[]): [[number, number], [number, number]] | null {
  if (points.length === 0) return null
  let minLat = points[0].lat
  let maxLat = points[0].lat
  let minLng = points[0].lng
  let maxLng = points[0].lng
  for (const p of points) {
    minLat = Math.min(minLat, p.lat)
    maxLat = Math.max(maxLat, p.lat)
    minLng = Math.min(minLng, p.lng)
    maxLng = Math.max(maxLng, p.lng)
  }
  const pad = 0.0006
  return [
    [minLat - pad, minLng - pad],
    [maxLat + pad, maxLng + pad],
  ]
}

/**
 * ลิงก์เปิดการนำทางใน Google Maps — บนมือถือจะเด้งเข้าแอป Google Maps ถ้าติดตั้งไว้
 * ไม่งั้นเปิดเว็บ ใช้ระบบนำทางเต็มรูปแบบของเขาได้เลยโดยไม่ต้องจ่ายค่า API
 */
export function directionsUrl(to: LatLng): string {
  const dest = `${to.lat.toFixed(6)},${to.lng.toFixed(6)}`
  const params = new URLSearchParams({ api: '1', destination: dest, travelmode: 'walking' })
  return `https://www.google.com/maps/dir/?${params.toString()}`
}

/**
 * ลดจำนวนจุดของเส้นทางก่อนเก็บขึ้นเซิร์ฟเวอร์
 * วิ่ง 10 กม. เก็บทุกวินาทีจะได้ราว 3,000 จุด ทั้งที่วาดบนแผนที่มือถือ
 * แทบไม่ต่างจากเก็บทุก 10 เมตร — เก็บจุดแรกและจุดสุดท้ายไว้เสมอ
 */
export function simplifyPath(path: TrackPoint[], minGapM = 10): TrackPoint[] {
  if (path.length <= 2) return path
  const out: TrackPoint[] = [path[0]]
  for (let i = 1; i < path.length - 1; i++) {
    if (distanceM(out[out.length - 1], path[i]) >= minGapM) out.push(path[i])
  }
  out.push(path[path.length - 1])
  return out
}
