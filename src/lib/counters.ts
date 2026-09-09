import type { Counters, MissionMetric, PeriodCounters } from '../types'
import { startOfWeek } from './format'

export function emptyPeriod(): PeriodCounters {
  return {
    distanceKm: 0,
    runCount: 0,
    inviteSent: 0,
    friendAdded: 0,
    groupCreated: 0,
    gamePlayed: 0,
    gameScore: 0,
    locationShared: 0,
  }
}

export function dayKey(ts = Date.now()): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

export function weekKey(ts = Date.now()): string {
  return String(startOfWeek(ts))
}

export function emptyCounters(): Counters {
  return {
    dayKey: dayKey(),
    weekKey: weekKey(),
    daily: emptyPeriod(),
    weekly: emptyPeriod(),
    season: emptyPeriod(),
  }
}

/** รีเซ็ตตัวนับรายวัน/รายสัปดาห์เมื่อข้ามช่วงเวลา คืนค่า null ถ้าไม่มีอะไรเปลี่ยน */
export function rollover(c: Counters): Counters | null {
  const d = dayKey()
  const w = weekKey()
  if (c.dayKey === d && c.weekKey === w) return null
  return {
    ...c,
    dayKey: d,
    weekKey: w,
    daily: c.dayKey === d ? c.daily : emptyPeriod(),
    weekly: c.weekKey === w ? c.weekly : emptyPeriod(),
  }
}

export function bump(c: Counters, metric: MissionMetric, amount: number): Counters {
  const next = rollover(c) ?? c
  const add = (p: PeriodCounters): PeriodCounters => ({ ...p, [metric]: p[metric] + amount })
  return {
    ...next,
    daily: add(next.daily),
    weekly: add(next.weekly),
    season: add(next.season),
  }
}
