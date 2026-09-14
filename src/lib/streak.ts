import type { RunSession } from '../types'

/**
 * สตรีค "วิ่งต่อเนื่องกี่วัน" คำนวณจากประวัติการวิ่งโดยตรง
 *
 * ไม่เก็บตัวนับแยกต่างหาก เพราะประวัติอยู่บนคลาวด์อยู่แล้ว — คำนวณใหม่ทุกครั้ง
 * จึงตรงกันทุกเครื่องเสมอ และย้อนหลังถูกต้องแม้ลบกิจกรรมทิ้ง
 */
export type Streak = {
  /** ต่อเนื่องกี่วันแล้ว (ยังไม่วิ่งวันนี้ก็ยังนับสตรีคเดิมอยู่จนหมดวัน) */
  days: number
  /** วิ่งไปแล้ววันนี้หรือยัง */
  ranToday: boolean
  /** สถิติสูงสุดที่เคยทำได้ */
  best: number
  /** 7 วันล่าสุด เรียงจากเก่าไปใหม่ (วันสุดท้ายคือวันนี้) */
  week: Array<{ label: string; date: number; ran: boolean; today: boolean }>
  /** เป้าหมายถัดไป เช่น 3 / 7 / 14 / 30 วัน */
  nextMilestone: number | null
}

const MILESTONES = [3, 7, 14, 30, 60, 100, 200, 365]
const DAY_LABELS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']

/**
 * เที่ยงคืนของวันนั้นตามเวลาเครื่อง ใช้แทน "วัน" ทั้งการเทียบและการแสดงผล
 *
 * เคยใช้เลขวัน (epoch หารด้วย 24 ชม.) ซึ่งเทียบว่าวันเดียวกันได้ถูก แต่แปลงกลับ
 * เป็นวันที่ไม่ได้ เพราะเที่ยงคืนตามเวลาไทยคือ 17:00 UTC ของ "เมื่อวาน"
 * แถบ 7 วันจึงขึ้นชื่อวันเลื่อนไปหนึ่งวันเสมอสำหรับเขตเวลาที่นำหน้า UTC
 */
function startOfDay(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** บวก/ลบวันตามปฏิทิน (ไม่ใช่บวก 24 ชม. — ประเทศที่มี DST วันหนึ่งไม่เท่ากับ 24 ชม.) */
function addDays(dayStart: number, n: number): number {
  const d = new Date(dayStart)
  d.setDate(d.getDate() + n)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function computeStreak(runs: RunSession[], now = Date.now()): Streak {
  const ranDays = new Set(runs.map((r) => startOfDay(r.startedAt)))
  const today = startOfDay(now)
  const ranToday = ranDays.has(today)

  // นับถอยหลังจากวันนี้ (ถ้ายังไม่วิ่งวันนี้ ให้เริ่มนับจากเมื่อวาน — สตรีคยังไม่ขาดจนกว่าจะหมดวัน)
  let days = 0
  for (let d = ranToday ? today : addDays(today, -1); ranDays.has(d); d = addDays(d, -1)) days++

  // สถิติสูงสุด: ไล่ดูช่วงที่ติดกันยาวที่สุด
  let best = 0
  let run = 0
  const sorted = [...ranDays].sort((a, b) => a - b)
  for (let i = 0; i < sorted.length; i++) {
    run = i > 0 && sorted[i] === addDays(sorted[i - 1], 1) ? run + 1 : 1
    if (run > best) best = run
  }

  const week = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today, i - 6)
    return {
      label: DAY_LABELS[new Date(date).getDay()],
      date,
      ran: ranDays.has(date),
      today: date === today,
    }
  })

  const target = Math.max(days, ranToday ? days : days + 1)
  return {
    days,
    ranToday,
    best: Math.max(best, days),
    week,
    nextMilestone: MILESTONES.find((m) => m > target - (ranToday ? 0 : 1)) ?? null,
  }
}
