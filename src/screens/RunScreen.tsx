import { useMemo, useState } from 'react'
import type { Nav } from '../App'
import TopBar from '../components/TopBar'
import Sheet from '../components/Sheet'
import Map from '../components/Map'
import { useStore } from '../state/store'
import { MAX_ACCURACY_M, useCurrentPosition } from '../lib/useGeo'
import { useRun } from '../state/run'
import { boundsOf, estimateKcal, formatDuration, formatKm, formatPace } from '../lib/geo'
import { uid } from '../lib/id'
import { notificationPermission, requestNotificationPermission } from '../lib/notify'
import { ensureNotificationPermission, isNative } from '../lib/native'
import type { RunSession } from '../types'

export default function RunScreen({ nav, inviteId: inviteParam }: { nav: Nav; inviteId?: string }) {
  const { state, actions } = useStore()
  const geo = useCurrentPosition(true)
  const { tracker, inviteId: activeInvite, wake, start, pause, resume, stop, reset } = useRun()
  const [summary, setSummary] = useState<RunSession | null>(null)
  const [askSim, setAskSim] = useState(false)

  // ถ้ากำลังวิ่งอยู่ ใช้นัดที่ผูกไว้ตอนเริ่ม (กลับมาจากหน้าอื่นจะไม่มีพารามิเตอร์แล้ว)
  const inviteId = tracker.running ? activeInvite : inviteParam
  const invite = inviteId ? state.invites.find((i) => i.id === inviteId) : undefined

  const center = tracker.last ?? tracker.path[tracker.path.length - 1] ?? geo.fallback
  const fit = useMemo(() => (tracker.path.length > 3 ? boundsOf(tracker.path) : null), [tracker.path])

  /** ขอสิทธิ์แจ้งเตือนตอนกดเริ่ม (ต้องมาจากการแตะของผู้ใช้) แล้วค่อยเริ่มจับ */
  const begin = (simulated: boolean) => {
    if (isNative()) void ensureNotificationPermission()
    else if (notificationPermission() === 'default') void requestNotificationPermission()
    start(simulated, geo.position ?? undefined, inviteParam)
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
        subtitle={
          invite
            ? `นัด: ${invite.title} · ${invite.place.name}`
            : tracker.running
              ? 'ไปหน้าอื่นได้ การวิ่งจะยังนับต่อ'
              : 'GPS จะเริ่มบันทึกเมื่อกดเริ่ม'
        }
        onBack={tracker.running ? undefined : () => nav('home')}
      />

      <div className="run-map-stage">
        <Map
          center={center}
          zoom={16}
          fit={fit}
          track={tracker.path}
          pins={[{ id: 'me', pos: center, emoji: state.profile.emoji, label: 'คุณ', me: true }]}
        />
        <span className="run-map-label">{tracker.running ? 'เส้นทางของคุณ' : 'จุดเริ่มต้นของคุณ'}</span>
      </div>
      <div className="card run-dashboard">
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
          {tracker.running && tracker.gpsStale && <span className="chip bad">📡 ไม่ได้สัญญาณ GPS</span>}
        </div>

        {tracker.running && !tracker.simulated && (
          <div className="tiny muted center" style={{ marginTop: 8 }}>
            {tracker.fixes === 0
              ? 'กำลังรอพิกัดแรกจาก GPS…'
              : `ได้พิกัด ${tracker.fixes} จุด · ใช้คิดระยะ ${tracker.used}${tracker.skipped > 0 ? ` · ทิ้ง ${tracker.skipped} (สัญญาณหยาบ)` : ''}`}
          </div>
        )}

        {tracker.running && tracker.interrupted && (
          <div className="card tight small" style={{ marginTop: 12, borderColor: 'rgba(255,196,77,.45)', color: 'var(--warn)', lineHeight: 1.7 }}>
            ⚠️ ระบบหยุดแอปไปช่วงหนึ่งระหว่างวิ่ง (สลับไปแอปอื่น รับสาย หรือจอดับ)
            <br />
            ระยะทางช่วงที่หยุดไปไม่ได้ถูกบันทึก — วิ่งต่อได้ตามปกติ แต่ต้องเปิดหน้านี้ค้างไว้
          </div>
        )}

        {tracker.running && tracker.gpsStale && !tracker.interrupted && (
          <div className="tiny muted center" style={{ marginTop: 10, lineHeight: 1.6 }}>
            ไม่ได้พิกัดใหม่มาสักพักแล้ว — ออกไปที่ที่เห็นท้องฟ้า และอย่าสลับไปแอปอื่น
          </div>
        )}

        {!tracker.running && !isNative() && (
          <div className="tiny muted center" style={{ marginTop: 10, lineHeight: 1.6 }}>
            เวอร์ชันเว็บต้องเปิดหน้านี้ค้างไว้ตลอดการวิ่ง — ถ้าสลับไปแอปอื่นหรือรับสาย
            ระบบจะหยุดหน้าเว็บและ GPS จะไม่บันทึกช่วงนั้น
          </div>
        )}

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
              {tracker.interrupted ? (
                <>
                  <br />
                  <b style={{ color: 'var(--warn)' }}>ระบบหยุดแอปไประหว่างวิ่ง</b> — ตอนสลับไปแอปอื่น รับสาย
                  หรือจอดับ เบราว์เซอร์บนมือถือจะหยุดหน้าเว็บไว้ ทำให้ GPS ไม่ได้บันทึกช่วงนั้น
                  <br />
                  คราวหน้าเปิดหน้านี้ค้างไว้ตลอดการวิ่ง (แอปจะกันจอดับให้อยู่แล้ว)
                </>
              ) : tracker.lastFixAt == null ? (
                <>
                  <br />
                  <b>ยังไม่ได้พิกัดจาก GPS เลย</b> — ถ้าอยู่ในอาคารหรือที่อับสัญญาณ มือถือจะหาตำแหน่งไม่ได้
                  <br />
                  ออกไปที่ที่เห็นท้องฟ้า รอให้ขึ้นชิป "GPS ±20 ม." ก่อนค่อยกดเริ่ม
                </>
              ) : (
                <>
                  <br />
                  ได้พิกัด {tracker.fixes} จุด · ใช้คิดระยะ {tracker.used} · ทิ้ง {tracker.skipped}
                  {tracker.skipped > 0 && tracker.used === 0 && (
                    <>
                      <br />
                      <b style={{ color: 'var(--warn)' }}>สัญญาณหยาบเกินไปทุกจุด</b> (±
                      {Math.round(tracker.accuracy ?? 0)} ม.) — มือถือกำลังหาตำแหน่งจากเสาสัญญาณ/Wi-Fi
                      แทนดาวเทียม จึงบอกไม่ได้ว่าขยับจริงหรือไม่
                    </>
                  )}
                  <br />
                  ออกไปที่ที่เห็นท้องฟ้า รอให้ตัวเลข GPS ลงมาต่ำกว่า ±{MAX_ACCURACY_M} ม. ก่อนกดเริ่ม
                  หรือใช้โหมดจำลองเพื่อทดลองแอปในอาคาร
                </>
              )}
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
