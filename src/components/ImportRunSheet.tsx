import { useRef, useState } from 'react'
import Sheet from './Sheet'
import Map from './Map'
import { findDuplicate, ImportError, parseActivityFile, type ImportedRun } from '../lib/importRun'
import { boundsOf, formatDuration, formatKm, formatPace } from '../lib/geo'
import { whenLabel } from '../lib/format'
import type { RunSession } from '../types'

type Props = {
  open: boolean
  onClose: () => void
  existing: RunSession[]
  onSave: (run: RunSession) => void
}

/** นำเข้ากิจกรรมจากไฟล์ที่ export จากนาฬิกาวิ่ง */
export default function ImportRunSheet({ open, onClose, existing, onSave }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [run, setRun] = useState<ImportedRun | null>(null)
  const [saved, setSaved] = useState(false)

  const duplicate = run ? findDuplicate(run, existing) : undefined

  const reset = () => {
    setRun(null)
    setError(null)
    setSaved(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const pick = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    setError(null)
    setRun(null)
    setSaved(false)
    try {
      setRun(await parseActivityFile(file))
    } catch (err) {
      setError(err instanceof ImportError ? err.message : 'อ่านไฟล์ไม่สำเร็จ ลองไฟล์อื่นดูนะ')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet
      open={open}
      title="นำเข้าจากนาฬิกา ⌚"
      subtitle="รองรับไฟล์ .gpx .tcx และ .fit จากนาฬิกาทุกยี่ห้อ"
      onClose={() => {
        reset()
        onClose()
      }}
    >
      <input
        ref={fileRef}
        type="file"
        accept=".gpx,.tcx,.fit,application/gpx+xml"
        hidden
        onChange={(e) => void pick(e.target.files?.[0])}
      />

      {!run && !saved && (
        <>
          <button className="btn primary block" disabled={busy} onClick={() => fileRef.current?.click()}>
            {busy ? 'กำลังอ่านไฟล์…' : '📂 เลือกไฟล์จากเครื่อง'}
          </button>
          {error && (
            <div className="card tight small" style={{ marginTop: 12, borderColor: 'rgba(255,107,107,.4)', color: 'var(--danger)' }}>
              {error}
            </div>
          )}
          <div className="card tight small muted" style={{ marginTop: 14, lineHeight: 1.8 }}>
            <b style={{ color: 'var(--text)' }}>หาไฟล์ได้จากที่ไหน</b>
            <br />
            • <b>Garmin</b> — Garmin Connect เว็บ → เลือกกิจกรรม → ⚙️ → Export to GPX/TCX
            <br />
            • <b>Apple Watch</b> — แอปที่บันทึก (เช่น WorkOutDoors, HealthFit) → Export GPX
            <br />
            • <b>Samsung / Amazfit / Coros / Suunto / Polar</b> — แอปของยี่ห้อ → รายละเอียดกิจกรรม → Export/Share GPX
            <br />
            • <b>Strava</b> — หน้ากิจกรรม → ⋯ → Export GPX
          </div>
        </>
      )}

      {run && !saved && (
        <>
          {run.path.length > 1 && <Map center={run.path[0]} zoom={15} fit={boundsOf(run.path)} track={run.path} />}

          <div className="card" style={{ marginTop: 12 }}>
            <div className="stat-grid">
              <div className="stat">
                <div className="v">{formatKm(run.distanceM)}</div>
                <div className="k">กิโลเมตร</div>
              </div>
              <div className="stat">
                <div className="v">{formatDuration(run.movingMs)}</div>
                <div className="k">เวลา</div>
              </div>
              <div className="stat">
                <div className="v">{formatPace(run.distanceM, run.movingMs)}</div>
                <div className="k">เพซ /กม.</div>
              </div>
            </div>
            <div className="row wrap" style={{ justifyContent: 'center', marginTop: 14, gap: 8 }}>
              <span className="chip">🗓️ {whenLabel(run.startedAt)}</span>
              {run.avgHeartRate && <span className="chip">❤️ {run.avgHeartRate} bpm</span>}
              <span className="chip">📍 {run.points} จุด</span>
            </div>
            <div className="muted tiny center" style={{ marginTop: 10 }}>
              {run.source}
            </div>
          </div>

          {duplicate && (
            <div className="card tight small" style={{ marginTop: 12, borderColor: 'rgba(255,196,77,.45)', color: 'var(--warn)', lineHeight: 1.7 }}>
              ⚠️ ดูเหมือนเคยนำเข้ากิจกรรมนี้ไปแล้ว ({formatKm(duplicate.distanceM)} กม. · {whenLabel(duplicate.startedAt)})
              <br />
              กดบันทึกอีกครั้งจะมีสองรายการซ้ำกัน
            </div>
          )}

          <div className="stack-8" style={{ marginTop: 14 }}>
            <button
              className="btn primary block"
              onClick={() => {
                onSave(run)
                setSaved(true)
              }}
            >
              บันทึกเข้าประวัติ
            </button>
            <button className="btn ghost block" onClick={reset}>
              เลือกไฟล์อื่น
            </button>
          </div>
        </>
      )}

      {saved && (
        <div className="center" style={{ padding: '10px 0' }}>
          <div style={{ fontSize: 46 }}>🎉</div>
          <div className="strong" style={{ marginTop: 10, fontSize: 15 }}>
            นำเข้าเรียบร้อย
          </div>
          <div className="muted small" style={{ marginTop: 6, lineHeight: 1.7 }}>
            กิจกรรมถูกบันทึกเข้าประวัติ นับรวมในสตรีคและเป้าหมายสัปดาห์นี้แล้ว
          </div>
          <div className="stack-8" style={{ marginTop: 16 }}>
            <button className="btn block" onClick={reset}>
              นำเข้าอีกไฟล์
            </button>
            <button
              className="btn primary block"
              onClick={() => {
                reset()
                onClose()
              }}
            >
              เสร็จแล้ว
            </button>
          </div>
        </div>
      )}
    </Sheet>
  )
}
