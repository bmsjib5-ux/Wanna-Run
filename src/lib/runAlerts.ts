import { formatDuration, formatKm, formatPace } from './geo'

/** เตือนความคืบหน้าทุก 1 กิโลเมตร และทุก 5 นาทีของเวลาที่วิ่งจริง (ไม่นับตอนพัก) */
export const KM_STEP_M = 1_000
export const TIME_STEP_MS = 5 * 60_000

/** หลักที่ผ่านไปแล้ว ใช้เทียบว่ารอบนี้ข้ามหลักใหม่หรือยัง */
export type RunMark = { km: number; timeBlock: number }

export type RunAlert = { kind: 'km' | 'time'; title: string; body: string; pattern: number[] }

export function markOf(distanceM: number, elapsedMs: number): RunMark {
  return { km: Math.floor(distanceM / KM_STEP_M), timeBlock: Math.floor(elapsedMs / TIME_STEP_MS) }
}

/**
 * คืนคำเตือนเมื่อข้ามหลักใหม่ ถ้ายังไม่ถึงคืน null
 *
 * ครบกิโลเมตรมาก่อนครบเวลา เพราะเป็นหมุดหมายที่นักวิ่งรอฟังมากกว่า
 * ส่ง prev เป็น null ตอนเพิ่งเริ่มวิ่ง จะได้ไม่เตือนย้อนหลังทั้งกอง
 */
export function runAlertFor(prev: RunMark | null, distanceM: number, elapsedMs: number): RunAlert | null {
  const now = markOf(distanceM, elapsedMs)
  if (!prev) return null

  const pace = distanceM > 0 ? ` · เพซ ${formatPace(distanceM, elapsedMs)}` : ''
  if (now.km > prev.km) {
    return {
      kind: 'km',
      title: `ครบ ${now.km} กม. แล้ว 🏃`,
      body: `${formatDuration(elapsedMs)}${pace}`,
      pattern: [70, 50, 70, 50, 70],
    }
  }
  if (now.timeBlock > prev.timeBlock) {
    return {
      kind: 'time',
      title: `วิ่งมา ${now.timeBlock * (TIME_STEP_MS / 60_000)} นาที ⏱️`,
      body: `${formatKm(distanceM)} กม.${pace}`,
      pattern: [60, 40, 60],
    }
  }
  return null
}
