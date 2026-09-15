import { distanceM } from './geo'
import type { Friend, LatLng } from '../types'

/** รัศมีที่นับว่า "ใกล้ฉัน" */
export const RADIUS_M = 5_000
/** ตำแหน่งเก่ากว่านี้ถือว่าไม่ใช่ที่อยู่ตอนนี้แล้ว จึงไม่เอามาแสดง */
export const FRESH_MS = 30 * 60_000

export type FriendPing = { userId: string; pos: LatLng; updatedAt: number }
export type Near = { friend: Friend; meters: number; updatedAt: number }

/**
 * คัดเฉพาะเพื่อนที่อยู่ในรัศมีและตำแหน่งยังสด เรียงจากใกล้ไปไกล
 *
 * ตัดคนที่ยังไม่รับคำขอเป็นเพื่อน และตำแหน่งที่ค้างมานานออก
 * เพราะ "เคยอยู่ตรงนี้เมื่อ 3 ชั่วโมงก่อน" ไม่ใช่คำตอบของคำถามว่าตอนนี้ใครอยู่ใกล้
 */
export function pickNearby(pings: FriendPing[], friends: Friend[], me: LatLng, now = Date.now()): Near[] {
  return pings
    .map((p) => {
      const friend = friends.find((f) => f.id === p.userId && f.status === 'friend')
      return friend ? { friend, meters: distanceM(me, p.pos), updatedAt: p.updatedAt } : null
    })
    .filter((n): n is Near => n !== null && n.meters <= RADIUS_M && now - n.updatedAt <= FRESH_MS)
    .sort((a, b) => a.meters - b.meters)
}

/** ระยะทางแบบอ่านง่าย: ใกล้ ๆ บอกเป็นเมตร ไกลขึ้นบอกเป็นกิโลเมตร */
export function nearLabel(meters: number): string {
  return meters < 1000 ? `${Math.round(meters / 10) * 10} ม.` : `${(meters / 1000).toFixed(1)} กม.`
}
