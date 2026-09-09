import { useEffect, useMemo, useRef, useState } from 'react'
import type { Nav } from '../App'
import TopBar from '../components/TopBar'
import Sheet from '../components/Sheet'
import Map from '../components/Map'
import { useStore } from '../state/store'
import { useCurrentPosition, useRunTracker } from '../lib/useGeo'
import { boundsOf, estimateKcal, formatDuration, formatKm, formatPace } from '../lib/geo'
import { uid } from '../lib/id'
import { notificationPermission, requestNotificationPermission, vibrate } from '../lib/notify'
import { useWakeLock } from '../lib/wakeLock'
import { closeRunNotification, showRunNotification } from '../lib/runNotice'
import type { RunSession } from '../types'

export default function RunScreen({ nav, inviteId }: { nav: Nav; inviteId?: string }) {
  const { state, actions } = useStore()
  const geo = useCurrentPosition(true)
  const { tracker, start, pause, resume, stop, reset } = useRunTracker()
  const [summary, setSummary] = useState<RunSession | null>(null)
  const [askSim, setAskSim] = useState(false)

  const invite = inviteId ? state.invites.find((i) => i.id === inviteId) : undefined

  const center = tracker.last ?? geo.fallback
  const fit = useMemo(() => (tracker.path.length > 3 ? boundsOf(tracker.path) : null), [tracker.path])

  // เตือนเมื่อครบทุก 1 กิโลเมตร
  const km = Math.floor(tracker.distanceM / 1000)
  useEffect(() => {
    if (tracker.running && km > 0) vibrate([60, 40, 60])
  }, [km, tracker.running])

  // กันจอดับระหว่างวิ่ง ไม่งั้น GPS หยุดตามจอ
  const wake = useWakeLock(tracker.running)

  // แจ้งเตือนค้างบนแถบสถานะ (Android) อัปเดตทุก 30 วิ, ทุกกิโล และตอนพัก/ไปต่อ
  const notifyOn = tracker.running && notificationPermission() === 'granted'
  const latest = useRef({ distanceM: 0, elapsedMs: 0, paused: false })
  latest.current = { distanceM: tracker.distanceM, elapsedMs: tracker.elapsedMs, paused: tracker.paused }
  const halfMinute = Math.floor(tracker.elapsedMs / 30_000)
  useEffect(() => {
    if (!notifyOn) {
      void closeRunNotification()
      return
    }
    const { distanceM, elapsedMs, paused } = latest.current
    void showRunNotification(distanceM, elapsedMs, paused)
  }, [notifyOn, tracker.paused, km, halfMinute])
  useEffect(() => () => void closeRunNotification(), [])

  /** ขอสิทธิ์แจ้งเตือนตอนกดเริ่ม (ต้องมาจากการแตะของผู้ใช้) แล้วค่อยเริ่มจับ */
  const begin = (simulated: boolean) => {
    if (notificationPermission() === 'default') void requestNotificationPermission()
    start(simulated, geo.position ?? undefined)
  }

  // ระยะต่ำกว่านี้ถือว่ายังไม่ได้วิ่ง (GPS ยังไม่นิ่ง หรือกดจบเร็วไป) จะแสดงเหตุผลแทนการบันทึก
  const MIN_SAVE_M = 10
  const tooShort = !!summary && summary.distanceM < MIN_SAVE_M

  const finish = () => {
    stop()
    // แสดงสรุปเสมอ — ก่อนหน้านี้ระยะสั้นจะรีเซ็ตเงียบ ๆ ทำให้เหมือนหน้าจอหายไปเฉย ๆ
    const run: RunSession = {
      id: uid('rn_'),
      startedAt: tracker.path[0]?.t ?? Date.now() - tracker.elapsedMs,
      endedAt: Date.now(),
      distanceM: tracker.distanceM,
      movingMs: tracker.elapsedMs,
      path: tracker.path,
      inviteId: invite?.id,
      placeName: invite?.place.name,
      simulated: tracker.simulated,
    }
    setSummary(run)
  }

  const target = invite?.targetKm ?? state.profile.weeklyGoalKm / 5
  const pct = Math.min(100, (tracker.distanceM / 1000 / target) * 100)

  return (
    <>
      <TopBar
        title={tracker.running ? (tracker.paused ? 'พักอยู่' : 'กำลังวิ่ง') : 'จับระยะทาง'}
        subtitle={invite ? `นัด: ${invite.title} · ${invite.place.name}` : 'GPS จะเริ่มบันทึกเมื่อกดเริ่ม'}
        onBack={tracker.running ? undefined : () => nav('home')}
      />

      <div className="card">
        <div className="run-hero">
          <div className="dist">{formatKm(tracker.distanceM)}</div>
          <div className="unit">กิโลเมตร</div>
        </div>

        <div className="bar" style={{ marginTop: 16 }}>
          <i style={{ width: `${pct}%` }} />
        </div>
        <div className="tiny muted center" style={{ marginTop: 6 }}>
          เป้าหมาย {target.toFixed(1)} กม. · ไปแล้ว {pct.toFixed(0)}%
        </div>

        <div className="stat-grid" style={{ marginTop: 18 }}>
          <div className="stat">
            <div className="v">{formatDuration(tracker.elapsedMs)}</div>
            <div className="k">เวลา</div>
          </div>
          <div className="stat">
            <div className="v">{formatPace(tracker.distanceM, tracker.elapsedMs)}</div>
            <div className="k">เพซ /กม.</div>
          </div>
          <div className="stat">
            <div className="v">{estimateKcal(tracker.distanceM)}</div>
            <div className="k">แคลอรี่</div>
          </div>
        </div>

        <div className="run-controls">
          {!tracker.running ? (
            <>
              <button className="run-btn" onClick={() => begin(false)}>
                เริ่ม
              </button>
              <button className="run-btn secondary" onClick={() => setAskSim(true)}>
                โหมด
                <br />
                จำลอง
              </button>
            </>
          ) : (
            <>
              <button className="run-btn secondary" onClick={() => (tracker.paused ? resume() : pause())}>
                {tracker.paused ? 'ไปต่อ' : 'พัก'}
              </button>
              <button className="run-btn stop" onClick={finish}>
                จบ
              </button>
            </>
          )}
        </div>

        <div className="row center" style={{ justifyContent: 'center', marginTop: 14, gap: 8 }}>
          {tracker.simulated && <span className="chip warn">โหมดจำลอง</span>}
          {tracker.accuracy != null && (
            <span className={`chip ${tracker.accuracy <= 20 ? 'ok' : 'warn'}`}>GPS ±{Math.round(tracker.accuracy)} ม.</span>
          )}
          {!tracker.running && geo.status === 'denied' && <span className="chip bad">ไม่ได้สิทธิ์ตำแหน่ง</span>}
          {tracker.running && wake === 'held' && <span className="chip ok">🔆 จอไม่ดับ</span>}
        </div>

        {tracker.running && wake !== 'held' && !tracker.simulated && (
          <div className="tiny muted center" style={{ marginTop: 10, lineHeight: 1.6 }}>
            {wake === 'unsupported'
              ? 'เครื่องนี้กันจอดับให้ไม่ได้ — เปิดหน้าจอค้างไว้ระหว่างวิ่ง ไม่งั้น GPS จะหยุดตามจอ'
              : 'กันจอดับไม่ได้ (โหมดประหยัดแบต?) — เปิดหน้าจอค้างไว้ระหว่างวิ่ง'}
          </div>
        )}

        {tracker.error && (
          <div className="card tight small" style={{ marginTop: 12, borderColor: 'rgba(255,107,107,.35)', color: 'var(--danger)' }}>
            {tracker.error}
          </div>
        )}
      </div>

      <div className="section-title">เส้นทาง</div>
      <Map
        center={center}
        zoom={16}
        fit={fit}
        track={tracker.path}
        pins={[{ id: 'me', pos: center, emoji: state.profile.emoji, label: 'คุณ', me: true }]}
      />

      {!tracker.running && (
        <>
          <div className="section-title">
            ประวัติล่าสุด
            <span className="spacer" />
            <button onClick={() => nav('profile')}>ทั้งหมด</button>
          </div>
          {state.runs.length === 0 ? (
            <div className="card empty">
              <div className="big">👟</div>
              ยังไม่มีประวัติ — ออกไปวิ่งครั้งแรกกันเถอะ
            </div>
          ) : (
            <div className="stack-8">
              {state.runs.slice(0, 3).map((r) => (
                <div key={r.id} className="card tight row">
                  <span className="avatar">🏁</span>
                  <span className="grow">
                    <span className="strong" style={{ display: 'block', fontSize: 14.5 }}>
                      {formatKm(r.distanceM)} กม. · {formatDuration(r.movingMs)}
                    </span>
                    <span className="muted small">
                      เพซ {formatPace(r.distanceM, r.movingMs)} /กม.
                      {r.placeName ? ` · ${r.placeName}` : ''}
                    </span>
                  </span>
                  {r.simulated && <span className="chip warn">จำลอง</span>}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <Sheet
        open={askSim}
        title="โหมดจำลองการวิ่ง"
        subtitle="ใช้ทดลองแอปเมื่ออยู่ในอาคารหรือไม่มีสัญญาณ GPS"
        onClose={() => setAskSim(false)}
      >
        <div className="card tight small muted" style={{ lineHeight: 1.7 }}>
          ระบบจะสร้างเส้นทางสมมุติที่ความเร็วประมาณ 11 กม./ชม. เพื่อให้เห็นการทำงานของหน้าจับระยะ
          กิจกรรมที่บันทึกจะติดป้าย <b>จำลอง</b> ไว้เสมอ เพื่อไม่ให้ปนกับสถิติจริง
        </div>
        <button
          className="btn primary block"
          style={{ marginTop: 14 }}
          onClick={() => {
            setAskSim(false)
            begin(true)
          }}
        >
          เริ่มโหมดจำลอง
        </button>
      </Sheet>

      <Sheet
        open={!!summary}
        title={tooShort ? 'ยังไม่ได้ระยะทาง' : 'จบกิจกรรมแล้ว 🎉'}
        subtitle={tooShort ? `ได้ไม่ถึง ${MIN_SAVE_M} เมตร จึงยังบันทึกไม่ได้` : 'ดูสรุปแล้วบันทึกเก็บไว้ได้เลย'}
        onClose={() => {
          setSummary(null)
          if (tooShort) reset()
        }}
      >
        {summary && tooShort && (
          <>
            <div className="card tight small" style={{ lineHeight: 1.7 }}>
              จับได้ <b>{Math.round(summary.distanceM)} ม.</b> ใน {formatDuration(summary.movingMs)}
              {tracker.accuracy != null && tracker.accuracy > 40 && (
                <>
                  <br />
                  GPS ยังไม่แม่น (±{Math.round(tracker.accuracy)} ม.) — จุดที่คลาดเกิน 40 ม. จะไม่ถูกนับ
                </>
              )}
              <br />
              ลองออกไปที่โล่ง รอให้ขึ้น "GPS ±20 ม." ก่อนกดเริ่ม แล้ววิ่งอย่างน้อยสักสิบเมตร
              หรือใช้โหมดจำลองเพื่อทดลองแอปในอาคาร
            </div>
            <button
              className="btn primary block"
              style={{ marginTop: 14 }}
              onClick={() => {
                setSummary(null)
                reset()
              }}
            >
              เข้าใจแล้ว
            </button>
          </>
        )}
        {summary && !tooShort && (
          <>
            {summary.path.length > 1 && (
              <Map center={summary.path[0] ?? center} zoom={16} fit={boundsOf(summary.path)} track={summary.path} />
            )}
            <div className="card" style={{ marginTop: 12 }}>
              <div className="stat-grid">
                <div className="stat">
                  <div className="v">{formatKm(summary.distanceM)}</div>
                  <div className="k">กิโลเมตร</div>
                </div>
                <div className="stat">
                  <div className="v">{formatDuration(summary.movingMs)}</div>
                  <div className="k">เวลา</div>
                </div>
                <div className="stat">
                  <div className="v">{formatPace(summary.distanceM, summary.movingMs)}</div>
                  <div className="k">เพซ /กม.</div>
                </div>
              </div>
              <div className="row" style={{ justifyContent: 'center', marginTop: 14, gap: 8 }}>
                <span className="chip">🔥 {estimateKcal(summary.distanceM)} แคล</span>
                <span className="chip on">+{Math.round((summary.distanceM / 1000) * 20) + 15} XP</span>
                {summary.simulated && <span className="chip warn">จำลอง</span>}
              </div>
            </div>
            <div className="stack-8" style={{ marginTop: 14 }}>
              <button
                className="btn primary block"
                onClick={() => {
                  actions.saveRun(summary)
                  setSummary(null)
                  reset()
                  nav('profile')
                }}
              >
                บันทึกกิจกรรม
              </button>
              <button
                className="btn ghost block"
                onClick={() => {
                  setSummary(null)
                  reset()
                }}
              >
                ทิ้งกิจกรรมนี้
              </button>
            </div>
          </>
        )}
      </Sheet>
    </>
  )
}
