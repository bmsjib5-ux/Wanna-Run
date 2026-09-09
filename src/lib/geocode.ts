import type { LatLng, Place } from '../types'
import { PLACES } from './seed'
import { uid } from './id'

export type SearchHit = Place & { source: 'preset' | 'osm' }

/**
 * ค้นหาสถานที่ผ่าน Nominatim (บริการค้นหาของ OpenStreetMap) ฟรี ไม่ต้องมีคีย์
 * นโยบายของเขาขอไม่เกิน 1 คำขอ/วินาที จึงต้องหน่วงก่อนยิงจากช่องพิมพ์เสมอ
 * และเน้นผลลัพธ์ในไทยด้วย countrycodes
 */
const NOMINATIM = 'https://nominatim.openstreetmap.org'

/** สถานที่แนะนำที่ตรงกับคำค้น — ทำงานทันทีไม่ต้องรอเน็ต ให้แสดงก่อนผลจาก OSM */
export function presetMatches(query: string): SearchHit[] {
  const q = query.trim()
  if (q.length < 1) return []
  return PLACES.filter(
    (p) => p.name.includes(q) || p.area.includes(q) || p.tags.some((t) => t.includes(q)),
  ).map((p) => ({ ...p, source: 'preset' as const }))
}

function near(a: LatLng, b: LatLng, deg = 0.002): boolean {
  return Math.abs(a.lat - b.lat) < deg && Math.abs(a.lng - b.lng) < deg
}

export async function searchPlaces(query: string, signal?: AbortSignal): Promise<SearchHit[]> {
  const q = query.trim()
  if (q.length < 2) return []
  const preset = presetMatches(q)

  const params = new URLSearchParams({
    q,
    format: 'jsonv2',
    limit: '6',
    countrycodes: 'th',
    'accept-language': 'th',
  })
  let remote: SearchHit[] = []
  try {
    const res = await fetch(`${NOMINATIM}/search?${params}`, { signal, headers: { Accept: 'application/json' } })
    if (res.ok) {
      const rows = (await res.json()) as Array<{
        place_id: number
        lat: string
        lon: string
        name?: string
        display_name: string
        type?: string
      }>
      remote = rows.map((r) => {
        const parts = r.display_name.split(',').map((x) => x.trim())
        return {
          id: `osm_${r.place_id}`,
          name: r.name || parts[0],
          area: parts.slice(1, 4).join(' '),
          lat: Number(r.lat),
          lng: Number(r.lon),
          tags: r.type ? [r.type] : [],
          source: 'osm' as const,
        }
      })
    }
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err
    /* เน็ตหลุดหรือ Nominatim ไม่ตอบ ก็ยังมีผลจากรายการแนะนำ */
  }

  // ตัดตัวซ้ำ: ที่ใกล้สถานที่แนะนำของเรา และที่ OSM ส่งมาซ้ำกันเอง
  // (สถานที่เดียวกันมักมีทั้งแบบจุดและแบบพื้นที่ ชื่อเดียวกันอยู่ติดกัน)
  const kept: SearchHit[] = [...preset]
  for (const r of remote) {
    if (kept.some((k) => near(k, r) && (k.source === 'preset' || k.name === r.name))) continue
    kept.push(r)
  }
  return kept
}

/** แปลงพิกัดเป็นชื่อสถานที่/ถนน สำหรับหมุดที่ผู้ใช้แตะปักเอง */
export async function reverseGeocode(pos: LatLng, signal?: AbortSignal): Promise<Place> {
  const fallback: Place = {
    id: uid('pin_'),
    name: 'จุดที่ปักหมุด',
    area: `${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}`,
    lat: pos.lat,
    lng: pos.lng,
    tags: ['ปักหมุดเอง'],
  }
  try {
    const params = new URLSearchParams({
      lat: String(pos.lat),
      lon: String(pos.lng),
      format: 'jsonv2',
      zoom: '17',
      'accept-language': 'th',
    })
    const res = await fetch(`${NOMINATIM}/reverse?${params}`, { signal, headers: { Accept: 'application/json' } })
    if (!res.ok) return fallback
    const r = (await res.json()) as { name?: string; display_name?: string; address?: Record<string, string> }
    const a = r.address ?? {}
    const name = r.name || a.road || a.neighbourhood || a.suburb || fallback.name
    const area = [a.suburb, a.city_district || a.district, a.city || a.province].filter(Boolean).join(' ')
    return { ...fallback, name, area: area || fallback.area }
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err
    return fallback
  }
}
