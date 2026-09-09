import type { Place } from '../types'
import { uid } from './id'

/** ลิงก์จุดวิ่ง — เปิดแล้วแอปจะพาไปหน้าแผนที่พร้อมปักหมุดจุดนี้ให้ */
export function spotLink(place: Place): string {
  const origin = typeof location !== 'undefined' ? location.origin : ''
  const q = new URLSearchParams({ spot: `${place.lat.toFixed(6)},${place.lng.toFixed(6)}`, name: place.name })
  if (place.area) q.set('area', place.area)
  return `${origin}/?${q.toString()}`
}

/** ข้อความสำหรับส่งในแชต: ชื่อจุด + ลิงก์แอป + ลิงก์ Google Maps สำหรับคนที่ยังไม่มีแอป */
export function spotShareText(place: Place, from: string): string {
  const maps = `https://maps.google.com/?q=${place.lat.toFixed(6)},${place.lng.toFixed(6)}`
  return `${from} ชวนไปวิ่งที่ ${place.name}${place.area ? ` (${place.area})` : ''}\nเปิดในแอป: ${spotLink(place)}\nแผนที่: ${maps}`
}

/** อ่านจุดจาก ?spot=lat,lng&name=… บน URL แล้วล้างพารามิเตอร์ทิ้ง */
export function takeSpotFromUrl(): Place | null {
  if (typeof location === 'undefined') return null
  const params = new URLSearchParams(location.search)
  const raw = params.get('spot')
  if (!raw) return null
  const name = params.get('name') ?? ''
  const area = params.get('area') ?? ''
  for (const k of ['spot', 'name', 'area']) params.delete(k)
  const rest = params.toString()
  history.replaceState(null, '', location.pathname + (rest ? `?${rest}` : ''))
  const [lat, lng] = raw.split(',').map(Number)
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
  return { id: uid('pl_'), name: name.trim() || 'จุดที่เพื่อนส่งมา', area, lat, lng, tags: ['จากเพื่อน'] }
}
