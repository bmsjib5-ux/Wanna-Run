import { useEffect, useMemo, useRef, useState } from 'react'
import type { Nav } from '../App'
import TopBar from '../components/TopBar'
import Sheet from '../components/Sheet'
import Map from '../components/Map'
import Avatar from '../components/Avatar'
import AvatarPicker from '../components/AvatarPicker'
import ThemePicker from '../components/ThemePicker'
import AboutBuild from '../components/AboutBuild'
import { levelOf, useStore } from '../state/store'
import { useAuth } from '../state/auth'
import { boundsOf, estimateKcal, formatDuration, formatKm, formatPace } from '../lib/geo'
import { shortDate, startOfWeek, whenLabel } from '../lib/format'
import { notificationPermission, requestNotificationPermission } from '../lib/notify'
import { nameHint, useNameCheck } from '../lib/useNameCheck'
import type { RunSession } from '../types'

const AVATARS = ['🏃', '🦊', '🐼', '🐯', '🦄', '🐧', '🐨', '🐸', '🦁', '🐰', '🐻', '🐙']

export default function Profile({ nav, section }: { nav: Nav; section?: 'runs' }) {
  const runsRef = useRef<HTMLDivElement>(null)
  // มาจากทางลัด "ประวัติการวิ่ง" ให้เลื่อนไปที่รายการเลย
  useEffect(() => {
    if (section === 'runs') runsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [section])

  const { state, actions, cloud } = useStore()
  const { profile, runs } = state
  const [editing, setEditing] = useState(false)
  const [detail, setDetail] = useState<RunSession | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [perm, setPerm] = useState(notificationPermission())
  // แก้ชื่อในสถานะชั่วคราวก่อน แล้วค่อยบันทึกทีเดียว
  // ของเดิมยิงอัปเดตขึ้นเซิร์ฟเวอร์ทุกตัวอักษรที่พิมพ์
  const [draftName, setDraftName] = useState(profile.name)
  const [saveError, setSaveError] = useState<string | null>(null)
  const nameState = useNameCheck(draftName, profile.name)
  const hint = nameHint(nameState)

  const openEditor = () => {
    setDraftName(profile.name)
    setSaveError(null)
    setEditing(true)
  }

  const saveName = async () => {
    const value = draftName.trim()
    if (!value || value === profile.name) {
      setEditing(false)
      return
    }
    try {
      await actions.updateProfile({ name: value })
      setEditing(false)
    } catch (err) {
      setSaveError((err as Error).message || 'บันทึกชื่อไม่สำเร็จ')
    }
  }

  const lvl = levelOf(profile.xp)
  const totals = useMemo(() => {
    const distance = runs.reduce((s, r) => s + r.distanceM, 0)
    const time = runs.reduce((s, r) => s + r.movingMs, 0)
    const week = runs.filter((r) => r.startedAt >= startOfWeek()).reduce((s, r) => s + r.distanceM, 0)
    return { distance, time, week }
  }, [runs])

  const badges = useMemo(() => earnedBadges(totals.distance / 1000, runs.length, state.friends.length, lvl.level), [
    totals.distance,
    runs.length,
    state.friends.length,
    lvl.level,
  ])

  return (
    <>
      <TopBar
        title="โปรไฟล์"
        subtitle={profile.code}
        onBack={() => nav('home')}
        right={
          <button className="btn sm" onClick={openEditor}>
            แก้ไข
          </button>
        }
      />

      <div className="card center">
        <button
          onClick={openEditor}
          aria-label="แก้ไขข้อมูลส่วนตัว"
          style={{ position: 'relative', display: 'inline-grid', placeItems: 'center' }}
        >
          <Avatar emoji={profile.emoji} photo={profile.avatarUrl} name={profile.name} size="lg" />
          <span className="avatar-edit">✏️</span>
        </button>
        <div className="strong" style={{ fontSize: 20, marginTop: 12 }}>
          {profile.name}
        </div>
        <div className="row" style={{ justifyContent: 'center', gap: 8, marginTop: 10 }}>
          <span className="chip on">เลเวล {lvl.level}</span>
          <span className="chip">🪙 {profile.coins}</span>
          <span className="chip">{profile.xp} XP</span>
        </div>
        <div className="bar" style={{ marginTop: 14 }}>
          <i style={{ width: `${(lvl.inLevel / lvl.need) * 100}%` }} />
        </div>
        <div className="tiny muted" style={{ marginTop: 6 }}>
          อีก {lvl.need - lvl.inLevel} XP ถึงเลเวลถัดไป
        </div>
      </div>

      <div className="card">
        <div className="stat-grid">
          <div className="stat">
            <div className="v">{formatKm(totals.distance, 1)}</div>
            <div className="k">กม. สะสม</div>
          </div>
          <div className="stat">
            <div className="v">{runs.length}</div>
            <div className="k">กิจกรรม</div>
          </div>
          <div className="stat">
            <div className="v">{formatDuration(totals.time)}</div>
            <div className="k">เวลารวม</div>
          </div>
        </div>
        <div className="section-title" style={{ marginBottom: 8 }}>
          สัปดาห์นี้ {formatKm(totals.week, 1)} / {profile.weeklyGoalKm} กม.
        </div>
        <div className="bar">
          <i style={{ width: `${Math.min(100, (totals.week / 1000 / profile.weeklyGoalKm) * 100)}%` }} />
        </div>
      </div>

      <div className="section-title">เหรียญตรา</div>
      <div className="card">
        <div className="row wrap" style={{ gap: 8 }}>
          {badges.map((b) => (
            <span key={b.name} className={`chip ${b.earned ? 'on' : ''}`} title={b.detail}>
              {b.icon} {b.name}
            </span>
          ))}
        </div>
      </div>

      <div className="section-title">การแจ้งเตือน</div>
      <div className="card tight row">
        <span className="avatar sm">🔔</span>
        <div className="grow">
          <div className="strong" style={{ fontSize: 14 }}>
            แจ้งเตือนจากระบบ
          </div>
          <div className="muted tiny">
            {perm === 'granted'
              ? 'เปิดอยู่ — จะเตือนเมื่อเพื่อนชวนวิ่งหรือตอบรับนัด'
              : perm === 'denied'
                ? 'ถูกปฏิเสธ ต้องเปิดสิทธิ์ในตั้งค่าเบราว์เซอร์'
                : perm === 'unsupported'
                  ? 'เบราว์เซอร์นี้ไม่รองรับ แต่ยังเห็นแจ้งเตือนในแอปได้'
                  : 'ยังไม่ได้เปิด'}
          </div>
        </div>
        {perm !== 'granted' && perm !== 'unsupported' && (
          <button className="btn primary xs" onClick={async () => setPerm(await requestNotificationPermission())}>
            เปิด
          </button>
        )}
      </div>

      <div className="section-title" ref={runsRef} style={{ scrollMarginTop: 12 }}>
        ประวัติการวิ่ง ({runs.length})
      </div>
      {runs.length === 0 ? (
        <div className="card empty">
          <div className="big">🏁</div>
          ยังไม่มีกิจกรรม — เริ่มวิ่งครั้งแรกกันเลย
          <div style={{ marginTop: 14 }}>
            <button className="btn primary sm" onClick={() => nav('run')}>
              ไปหน้าจับระยะ
            </button>
          </div>
        </div>
      ) : (
        <div className="stack-8">
          {runs.map((r) => (
            <button key={r.id} className="list-btn" onClick={() => setDetail(r)}>
              <span className="avatar">🏁</span>
              <span className="grow">
                <span className="strong" style={{ display: 'block', fontSize: 14.5 }}>
                  {formatKm(r.distanceM)} กม. · {formatDuration(r.movingMs)}
                </span>
                <span className="muted small">
                  {shortDate(r.startedAt)} · เพซ {formatPace(r.distanceM, r.movingMs)}
                  {r.placeName ? ` · ${r.placeName}` : ''}
                </span>
              </span>
              {r.simulated && <span className="chip warn">จำลอง</span>}
            </button>
          ))}
        </div>
      )}

      <div className="section-title">ตั้งค่า</div>
      <ThemePicker />
      <AboutBuild />
      <div className="stack-8" style={{ marginTop: 12 }}>
        {cloud && <SignOutButton />}
        <button className="btn danger block" onClick={() => setConfirmReset(true)}>
          ล้างข้อมูลทั้งหมดในเครื่อง
        </button>
      </div>
      <div className="card tight muted tiny" style={{ marginTop: 12, lineHeight: 1.7 }}>
        {cloud
          ? 'เพื่อน กลุ่ม นัดวิ่ง ประวัติการวิ่ง ภารกิจ และคะแนนเกม ซิงก์ขึ้นเซิร์ฟเวอร์ เปลี่ยนเครื่องแล้วข้อมูลยังอยู่ ส่วนธีมและรูปพื้นหลังเป็นค่าเฉพาะเครื่องนี้'
          : 'Wanna Run? เก็บข้อมูลทั้งหมดไว้ในเบราว์เซอร์ของคุณเท่านั้น ไม่มีการส่งขึ้นเซิร์ฟเวอร์'}
      </div>

      <Sheet open={editing} title="แก้ไขโปรไฟล์" onClose={() => setEditing(false)}>
        <div className="field">
          <span>รูปโปรไฟล์</span>
          <AvatarPicker
            emoji={profile.emoji}
            photo={profile.avatarUrl}
            name={profile.name}
            onPick={actions.setAvatar}
            onClear={actions.clearAvatar}
          />
        </div>

        <label className="field">
          <span>ชื่อ</span>
          <input
            value={draftName}
            onChange={(e) => {
              setDraftName(e.target.value)
              setSaveError(null)
            }}
            maxLength={24}
            style={nameState === 'taken' ? { borderColor: 'var(--danger)' } : undefined}
          />
          {hint && (
            <span
              className="tiny"
              style={{
                display: 'block',
                marginTop: 6,
                color: hint.tone === 'ok' ? 'var(--ok)' : hint.tone === 'bad' ? 'var(--danger)' : 'var(--muted)',
              }}
            >
              {hint.text}
            </span>
          )}
        </label>
        <div className="field">
          <span>อิโมจิ {profile.avatarUrl && <span className="muted">(ใช้เมื่อไม่มีรูป)</span>}</span>
          <div className="row wrap" style={{ gap: 8 }}>
            {AVATARS.map((a) => (
              <button
                key={a}
                className="avatar sm"
                onClick={() => void actions.updateProfile({ emoji: a }).catch(() => {})}
                style={{
                  borderColor: profile.emoji === a ? 'var(--accent)' : 'var(--line)',
                  background: profile.emoji === a ? 'rgba(198,242,78,.14)' : 'var(--surface-2)',
                }}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
        <label className="field">
          <span>เป้าหมายต่อสัปดาห์: {profile.weeklyGoalKm} กม.</span>
          <input
            type="range"
            min={5}
            max={80}
            step={5}
            value={profile.weeklyGoalKm}
            onChange={(e) => void actions.updateProfile({ weeklyGoalKm: Number(e.target.value) }).catch(() => {})}
          />
        </label>
        {saveError && (
          <div className="small" style={{ color: 'var(--danger)', marginBottom: 12 }}>
            {saveError}
          </div>
        )}
        <button
          className="btn primary block"
          onClick={() => void saveName()}
          disabled={!draftName.trim() || nameState === 'taken' || nameState === 'checking'}
        >
          เสร็จสิ้น
        </button>
      </Sheet>

      <Sheet
        open={!!detail}
        title={detail ? `${formatKm(detail.distanceM)} กม.` : ''}
        subtitle={detail ? whenLabel(detail.startedAt) : ''}
        onClose={() => setDetail(null)}
      >
        {detail && (
          <>
            {detail.path.length > 1 && (
              <Map center={detail.path[0]} zoom={16} fit={boundsOf(detail.path)} track={detail.path} />
            )}
            <div className="card" style={{ marginTop: 12 }}>
              <div className="stat-grid">
                <div className="stat">
                  <div className="v">{formatDuration(detail.movingMs)}</div>
                  <div className="k">เวลา</div>
                </div>
                <div className="stat">
                  <div className="v">{formatPace(detail.distanceM, detail.movingMs)}</div>
                  <div className="k">เพซ /กม.</div>
                </div>
                <div className="stat">
                  <div className="v">{estimateKcal(detail.distanceM)}</div>
                  <div className="k">แคลอรี่</div>
                </div>
              </div>
            </div>
            <button
              className="btn danger block"
              style={{ marginTop: 14 }}
              onClick={() => {
                actions.deleteRun(detail.id)
                setDetail(null)
              }}
            >
              ลบกิจกรรมนี้
            </button>
          </>
        )}
      </Sheet>

      <Sheet
        open={confirmReset}
        title="ล้างข้อมูลทั้งหมด?"
        subtitle="โปรไฟล์ เพื่อน กลุ่ม นัดวิ่ง และประวัติจะถูกลบถาวร"
        onClose={() => setConfirmReset(false)}
      >
        <div className="stack-8">
          <button
            className="btn danger block"
            onClick={() => {
              actions.resetAll()
              setConfirmReset(false)
            }}
          >
            ยืนยันล้างข้อมูล
          </button>
          <button className="btn ghost block" onClick={() => setConfirmReset(false)}>
            ยกเลิก
          </button>
        </div>
      </Sheet>
    </>
  )
}

function earnedBadges(km: number, runCount: number, friendCount: number, level: number) {
  return [
    { icon: '👟', name: 'ก้าวแรก', detail: 'วิ่งครั้งแรก', earned: runCount >= 1 },
    { icon: '5️⃣', name: '5K แรก', detail: 'วิ่งครบ 5 กม. ในครั้งเดียว', earned: km >= 5 },
    { icon: '🔟', name: '10K คลับ', detail: 'ระยะสะสม 10 กม.', earned: km >= 10 },
    { icon: '💯', name: '100 กิโล', detail: 'ระยะสะสม 100 กม.', earned: km >= 100 },
    { icon: '🤝', name: 'ก๊วนแน่น', detail: 'มีเพื่อน 5 คน', earned: friendCount >= 5 },
    { icon: '⭐', name: 'เลเวล 5', detail: 'ไต่ถึงเลเวล 5', earned: level >= 5 },
    { icon: '🔥', name: 'นักวิ่งขาประจำ', detail: 'วิ่งครบ 10 ครั้ง', earned: runCount >= 10 },
  ]
}

function SignOutButton() {
  const { signOut } = useAuth()
  return (
    <button className="btn block" onClick={() => void signOut()}>
      ออกจากระบบ
    </button>
  )
}
