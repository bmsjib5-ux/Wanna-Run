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

const DAY = 86_400_000
const MILESTONES = [3, 7, 14, 30, 60, 100, 200, 365]
const DAY_LABELS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']

/** เลขวันแบบท้องถิ่น ใช้เทียบว่า "วันเดียวกัน" โดยไม่โดนเขตเวลาเล่นงาน */
function dayNumber(ts: number): number {
  const d = new Date(ts)
  return Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / DAY)
}

export function computeStreak(runs: RunSession[], now = Date.now()): Streak {
  const ranDays = new Set(runs.map((r) => dayNumber(r.startedAt)))
  const today = dayNumber(now)
  const ranToday = ranDays.has(today)

  // นับถอยหลังจากวันนี้ (ถ้ายังไม่วิ่งวันนี้ ให้เริ่มนับจากเมื่อวาน — สตรีคยังไม่ขาดจนกว่าจะหมดวัน)
  let days = 0
  for (let d = ranToday ? today : today - 1; ranDays.has(d); d--) days++

  // สถิติสูงสุด: ไล่ดูช่วงที่ติดกันยาวที่สุด
  let best = 0
  let run = 0
  const sorted = [...ranDays].sort((a, b) => a - b)
  for (let i = 0; i < sorted.length; i++) {
    run = i > 0 && sorted[i] === sorted[i - 1] + 1 ? run + 1 : 1
    if (run > best) best = run
  }

  const week = Array.from({ length: 7 }, (_, i) => {
    const dayNo = today - 6 + i
    const date = new Date((dayNo + 0.5) * DAY)
    return {
      label: DAY_LABELS[date.getDay()],
      date: date.getTime(),
      ran: ranDays.has(dayNo),
      today: dayNo === today,
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
