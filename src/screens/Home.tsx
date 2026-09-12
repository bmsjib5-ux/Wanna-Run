import { useMemo } from 'react'
import type { Nav } from '../App'
import TopBar from '../components/TopBar'
import InviteCard from '../components/InviteCard'
import Avatar from '../components/Avatar'
import { levelOf, missionsWithProgress, useStore } from '../state/store'
import { agoLabel, startOfWeek } from '../lib/format'
import { formatDuration, formatKm } from '../lib/geo'
import { isOnline, useNow } from '../lib/presence'
import { computeStreak } from '../lib/streak'
import StreakCard from '../components/StreakCard'

export default function Home({ nav }: { nav: Nav }) {
  const { state, cloud } = useStore()
  const { profile, runs, invites, friends, notifications } = state

  const lvl = levelOf(profile.xp)
  const unread = notifications.filter((n) => !n.read).length

  const weekKm = useMemo(() => {
    const from = startOfWeek()
    return runs.filter((r) => r.startedAt >= from).reduce((sum, r) => sum + r.distanceM, 0) / 1000
  }, [runs])

  const upcoming = useMemo(
    () =>
      invites
        .filter((i) => i.status === 'open' && i.startAt > Date.now() - 3600_000)
        .sort((a, b) => a.startAt - b.startAt)
        .slice(0, 2),
    [invites],
  )

  const missions = useMemo(
    () => missionsWithProgress(state).filter((m) => m.period === 'daily'),
    [state],
  )
  const doneToday = missions.filter((m) => m.progress >= m.target).length

  const now = useNow()
  const online = friends.filter((f) => f.status === 'friend' && isOnline(f, now))
  const sharing = friends.filter((f) => f.status === 'friend' && f.sharingLocation)
  const pending = friends.filter((f) => f.status === 'incoming').length
  const lastRun = state.runs[0]
  const streak = useMemo(() => computeStreak(runs), [runs])

  const goalPct = Math.min(100, (weekKm / Math.max(1, profile.weeklyGoalKm)) * 100)

  return (
    <>
      <TopBar
        left={
          <button onClick={() => nav('profile')} aria-label="โปรไฟล์และแก้ไขข้อมูลส่วนตัว">
            <Avatar emoji={profile.emoji} photo={profile.avatarUrl} name={profile.name} />
          </button>
        }
        title={`สวัสดี ${profile.name}`}
        subtitle={greeting()}
        right={
          <button
            className="btn ghost sm"
            style={{ position: 'relative', padding: '9px 11px' }}
            onClick={() => nav('notifications')}
            aria-label="การแจ้งเตือน"
          >
            🔔
            {unread > 0 && <span className="badge-dot">{unread}</span>}
          </button>
        }
      />

      {!cloud && (
        <div className="card tight row" style={{ gap: 10, borderColor: 'rgba(255,196,77,.35)' }}>
          <span>🧪</span>
          <div className="grow tiny" style={{ lineHeight: 1.6 }}>
            <b style={{ color: 'var(--warn)' }}>โหมดทดลอง</b> — ยังไม่ได้เชื่อมเซิร์ฟเวอร์
            ข้อมูลอยู่ในเครื่องนี้เท่านั้น เพิ่มเพื่อนข้ามเครื่องและแชร์ตำแหน่งจริงยังใช้ไม่ได้
          </div>
        </div>
      )}

      <div className="card" style={{ background: 'linear-gradient(150deg, rgba(var(--accent-rgb), .16), var(--surface) 62%)' }}>
        <div className="row">
          <div className="grow">
            <div className="row" style={{ gap: 8 }}>
              <span className="chip on">เลเวล {lvl.level}</span>
              <span className="chip">🪙 {profile.coins}</span>
            </div>
            <div className="small muted" style={{ marginTop: 10 }}>
              เป้าหมายสัปดาห์นี้ {weekKm.toFixed(1)} / {profile.weeklyGoalKm} กม.
            </div>
            <div className="bar" style={{ marginTop: 6 }}>
              <i style={{ width: `${goalPct}%` }} />
            </div>
          </div>
        </div>
        <div className="row" style={{ marginTop: 14, gap: 8 }}>
          <button className="btn primary grow" onClick={() => nav('invites', { new: '1' })}>
            📣 ชวนเพื่อนวิ่ง
          </button>
          <button className="btn grow" onClick={() => nav('run')}>
            🏃 เริ่มวิ่งเลย
          </button>
        </div>
      </div>

      <div className="section-title">สตรีคของคุณ</div>
      <StreakCard streak={streak} onRun={() => nav('run')} />

      <div className="section-title">
        นัดวิ่งที่กำลังจะถึง
        <span className="spacer" />
        <button onClick={() => nav('invites')}>ดูทั้งหมด</button>
      </div>

      {upcoming.length === 0 ? (
        <div className="card empty">
          <div className="big">📭</div>
          ยังไม่มีนัดวิ่ง — ชวนเพื่อนสักคนไหม?
          <div style={{ marginTop: 14 }}>
            <button className="btn primary sm" onClick={() => nav('invites', { new: '1' })}>
              สร้างคำชวน
            </button>
          </div>
        </div>
      ) : (
        <div className="stack-12">
          {upcoming.map((iv) => (
            <InviteCard key={iv.id} invite={iv} friends={friends} compact onOpen={() => nav('invites')} />
          ))}
        </div>
      )}

      <div className="section-title">ทางลัด</div>
      <div className="tiles">
        <button className="tile" onClick={() => nav('friends')}>
          {pending > 0 && <span className="flag">{pending} ใหม่</span>}
          <span className="badge">👟</span>
          <span className="t">เพื่อนนักวิ่ง</span>
          <span className="v">{friends.filter((f) => f.status === 'friend').length} คน</span>
          <span className="s">{online.length > 0 ? `${online.length} คนออนไลน์` : 'ในก๊วนของคุณ'}</span>
        </button>

        <button className="tile" onClick={() => nav('groups')}>
          <span className="badge">👥</span>
          <span className="t">กลุ่มวิ่ง</span>
          <span className="v">{state.groups.length} กลุ่ม</span>
          <span className="s">นัดทั้งก๊วนในคลิกเดียว</span>
        </button>

        <button className="tile" onClick={() => nav('map')}>
          <span className="badge">🗺️</span>
          <span className="t">แผนที่เพื่อน</span>
          <span className="v">{sharing.length} คน</span>
          <span className="s">{sharing.length > 0 ? 'กำลังแชร์ตำแหน่ง' : 'ยังไม่มีใครแชร์ตำแหน่ง'}</span>
        </button>

        <button className="tile" onClick={() => nav('games')}>
          <span className="badge">🎯</span>
          <span className="t">ภารกิจวันนี้</span>
          <span className="v">
            {doneToday}/{missions.length}
          </span>
          <span className="s">{doneToday === missions.length ? 'ครบแล้ววันนี้ 🎉' : 'เก็บ XP และเหรียญ'}</span>
        </button>

        <button className="tile wide" onClick={() => nav('profile', { section: 'runs' })}>
          <span className="badge">🏁</span>
          <span className="grow">
            <span className="t" style={{ display: 'block' }}>
              ประวัติการวิ่ง
            </span>
            <span className="s" style={{ display: 'block', marginTop: 3 }}>
              {lastRun
                ? `${runs.length} ครั้ง · ล่าสุด ${formatKm(lastRun.distanceM)} กม. ${formatDuration(lastRun.movingMs)} · ${agoLabel(lastRun.startedAt)}`
                : 'ยังไม่มีกิจกรรม — ออกไปวิ่งครั้งแรกกันเถอะ'}
            </span>
          </span>
          <span className="muted">›</span>
        </button>
      </div>

      {runs.length > 0 && (
        <>
          <div className="section-title">
            สถิติของคุณ
            <span className="spacer" />
            <button onClick={() => nav('profile')}>โปรไฟล์</button>
          </div>
          <div className="card">
            <div className="stat-grid">
              <div className="stat">
                <div className="v">{(runs.reduce((s, r) => s + r.distanceM, 0) / 1000).toFixed(1)}</div>
                <div className="k">กม. สะสม</div>
              </div>
              <div className="stat">
                <div className="v">{runs.length}</div>
                <div className="k">ครั้งที่วิ่ง</div>
              </div>
              <div className="stat">
                <div className="v">{profile.xp}</div>
                <div className="k">XP</div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}

function greeting(): string {
  const h = new Date().getHours()
  if (h < 5) return 'ดึกแล้ว พักผ่อนบ้างนะ 🌙'
  if (h < 11) return 'อากาศกำลังดี ออกไปวิ่งกันเถอะ ☀️'
  if (h < 16) return 'เที่ยงแดดแรง ดื่มน้ำเยอะ ๆ นะ 💧'
  if (h < 20) return 'เย็นนี้ชวนเพื่อนวิ่งไหม? 🌆'
  return 'ค่ำแล้ว วิ่งเบา ๆ ก็ดีนะ 🌃'
}
