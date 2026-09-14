import type { RunSession, TrackPoint } from '../types'
import { distanceM, simplifyPath } from './geo'
import { uid } from './id'

/**
 * อ่านไฟล์กิจกรรมจากนาฬิกาวิ่ง (GPX / TCX / FIT) ให้เป็นกิจกรรมของแอป
 *
 * นาฬิกาทุกยี่ห้อ export ไฟล์พวกนี้ได้ จึงใช้ได้กับทุกรุ่นโดยไม่ต้องต่อ API
 * ของผู้ผลิต และทำงานได้ทั้งบนเว็บ (รวม iPhone) และในแอป
 */
export type ImportedRun = RunSession & {
  /** ที่มาของไฟล์ เช่น GPX · Garmin */
  source: string
  /** จำนวนจุดในไฟล์ต้นฉบับ (ก่อนลดจุด) */
  points: number
  avgHeartRate?: number
}

export class ImportError extends Error {}

export async function parseActivityFile(file: File): Promise<ImportedRun> {
  const ext = file.name.toLowerCase().split('.').pop() ?? ''
  if (ext === 'gpx') return fromXml(await file.text(), 'gpx', file.name)
  if (ext === 'tcx') return fromXml(await file.text(), 'tcx', file.name)
  if (ext === 'fit') return fromFit(await file.arrayBuffer(), file.name)
  throw new ImportError('รองรับเฉพาะไฟล์ .gpx .tcx และ .fit เท่านั้น')
}

/** รวมจุดและตัวเลขให้เป็นกิจกรรมเดียว ใช้ร่วมกันทุกรูปแบบไฟล์ */
function build(
  path: TrackPoint[],
  opts: { source: string; fileDistanceM?: number; movingMs?: number; heartRates: number[]; placeName?: string },
): ImportedRun {
  if (path.length < 2) throw new ImportError('ไฟล์นี้ไม่มีเส้นทาง GPS ที่ใช้ได้')

  // ใช้ระยะที่นาฬิกาคำนวณไว้ถ้ามี เพราะแม่นกว่าการคิดจากพิกัดที่ถูกลดความละเอียด
  const walked = path.reduce((sum, p, i) => (i === 0 ? 0 : sum + distanceM(path[i - 1], p)), 0)
  const distance = opts.fileDistanceM && opts.fileDistanceM > 0 ? opts.fileDistanceM : walked

  const startedAt = path[0].t
  const endedAt = path[path.length - 1].t
  const elapsed = Math.max(0, endedAt - startedAt)

  return {
    id: uid('rn_'),
    startedAt,
    endedAt,
    distanceM: Math.round(distance),
    movingMs: opts.movingMs && opts.movingMs > 0 ? Math.round(opts.movingMs) : elapsed,
    path: simplifyPath(path),
    placeName: opts.placeName,
    simulated: false,
    source: opts.source,
    points: path.length,
    avgHeartRate: opts.heartRates.length
      ? Math.round(opts.heartRates.reduce((a, b) => a + b, 0) / opts.heartRates.length)
      : undefined,
  }
}

/** ค่าตัวเลขของแท็กลูก (ไม่สนใจ namespace เพราะแต่ละยี่ห้อใช้ไม่เหมือนกัน) */
function num(el: Element, tag: string): number | undefined {
  const found = el.getElementsByTagName(tag)[0] ?? byLocalName(el, tag)
  const v = found?.textContent?.trim()
  const n = v ? Number(v) : NaN
  return Number.isFinite(n) ? n : undefined
}

function byLocalName(el: Element, tag: string): Element | undefined {
  const lower = tag.toLowerCase()
  return [...el.getElementsByTagName('*')].find((e) => e.localName.toLowerCase() === lower)
}

function fromXml(text: string, kind: 'gpx' | 'tcx', fileName: string): ImportedRun {
  const doc = new DOMParser().parseFromString(text, 'application/xml')
  if (doc.getElementsByTagName('parsererror').length > 0) throw new ImportError('ไฟล์เสียหายหรือไม่ใช่ XML ที่ถูกต้อง')

  const path: TrackPoint[] = []
  const heartRates: number[] = []
  let fileDistanceM: number | undefined
  let movingMs: number | undefined

  if (kind === 'gpx') {
    const pts = [...doc.getElementsByTagName('trkpt')]
    for (const pt of pts) {
      const lat = Number(pt.getAttribute('lat'))
      const lng = Number(pt.getAttribute('lon'))
      const time = pt.getElementsByTagName('time')[0]?.textContent
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || !time) continue
      const t = Date.parse(time)
      if (!Number.isFinite(t)) continue
      path.push({ lat, lng, t })
      const hr = num(pt, 'gpxtpx:hr') ?? num(pt, 'hr')
      if (hr) heartRates.push(hr)
    }
  } else {
    const pts = [...doc.getElementsByTagName('Trackpoint')]
    let first: number | undefined
    let last: number | undefined
    for (const pt of pts) {
      const time = pt.getElementsByTagName('Time')[0]?.textContent
      const lat = num(pt, 'LatitudeDegrees')
      const lng = num(pt, 'LongitudeDegrees')
      const dist = num(pt, 'DistanceMeters')
      if (dist !== undefined) {
        first ??= dist
        last = dist
      }
      const hr = num(pt, 'HeartRateBpm')
      if (hr) heartRates.push(hr)
      if (lat === undefined || lng === undefined || !time) continue
      const t = Date.parse(time)
      if (!Number.isFinite(t)) continue
      path.push({ lat, lng, t })
    }
    if (first !== undefined && last !== undefined && last > first) fileDistanceM = last - first
    const seconds = [...doc.getElementsByTagName('TotalTimeSeconds')]
      .map((e) => Number(e.textContent))
      .filter((n) => Number.isFinite(n))
    if (seconds.length) movingMs = seconds.reduce((a, b) => a + b, 0) * 1000
  }

  return build(path, { source: `${kind.toUpperCase()} · ${fileName}`, fileDistanceM, movingMs, heartRates })
}

async function fromFit(buffer: ArrayBuffer, fileName: string): Promise<ImportedRun> {
  // โหลดตัวอ่าน FIT เมื่อต้องใช้จริง จะได้ไม่ถ่วงเวลาเปิดแอปของคนที่ไม่ได้นำเข้าไฟล์
  const { default: FitParser } = await import('fit-file-parser')
  const parser = new FitParser({ speedUnit: 'km/h', lengthUnit: 'm', mode: 'list', force: true })

  const data = await parser.parseAsync(buffer).catch(() => {
    throw new ImportError('อ่านไฟล์ .fit นี้ไม่ได้ ลอง export เป็น .gpx หรือ .tcx จากนาฬิกาแทน')
  })

  const path: TrackPoint[] = []
  const heartRates: number[] = []
  for (const r of data.records ?? []) {
    if (r.heart_rate) heartRates.push(r.heart_rate)
    const t = r.timestamp ? new Date(r.timestamp).getTime() : NaN
    if (r.position_lat === undefined || r.position_long === undefined || !Number.isFinite(t)) continue
    path.push({ lat: r.position_lat, lng: r.position_long, t })
  }

  const session = data.sessions?.[0]
  return build(path, {
    source: `FIT · ${fileName}`,
    fileDistanceM: session?.total_distance,
    movingMs: session?.total_timer_time ? session.total_timer_time * 1000 : undefined,
    heartRates,
  })
}

/** กิจกรรมนี้เคยนำเข้าไปแล้วหรือยัง (เทียบเวลาเริ่มใกล้กันและระยะพอ ๆ กัน) */
export function findDuplicate(run: RunSession, existing: RunSession[]): RunSession | undefined {
  return existing.find(
    (r) => Math.abs(r.startedAt - run.startedAt) < 120_000 && Math.abs(r.distanceM - run.distanceM) < 200,
  )
}
