import { useMemo, useState } from 'react'
import type { Nav } from '../App'
import TopBar from '../components/TopBar'
import Sheet from '../components/Sheet'
import TapSprint from './games/TapSprint'
import SpinWheel from './games/SpinWheel'
import RunQuiz from './games/RunQuiz'
import { levelOf, missionsWithProgress, useStore } from '../state/store'
import { DAY_MS } from '../lib/format'
import type { GameKey, Mission } from '../types'

const PERIOD_LABEL: Record<Mission['period'], string> = {
  daily: 'ภารกิจรายวัน',
  weekly: 'ภารกิจรายสัปดาห์',
  season: 'ภารกิจสะสม',
}

const GAMES: Array<{ key: GameKey; emoji: string; name: string; desc: string }> = [
  { key: 'tapsprint', emoji: '⚡', name: 'แตะให้ทันจังหวะ', desc: 'วอร์มนิ้วก่อนวอร์มขา 25 วินาที' },
  { key: 'spin', emoji: '🎡', name: 'วงล้อภารกิจ', desc: 'หมุนวันละครั้ง ลุ้นเหรียญและภารกิจด่วน' },
  { key: 'quiz', emoji: '🧠', name: 'ควิซคนรักวิ่ง', desc: '5 คำถาม รู้ลึกเรื่องการวิ่ง' },
]

export default function Games({ nav, tab: initialTab }: { nav: Nav; tab?: string }) {
  const { state, actions } = useStore()
  const [tab, setTab] = useState<'missions' | 'games'>(initialTab === 'games' ? 'games' : 'missions')
  const [playing, setPlaying] = useState<GameKey | null>(null)

  const missions = useMemo(() => missionsWithProgress(state), [state])
  const lvl = levelOf(state.profile.xp)
  const canSpin = Date.now() - state.lastSpinAt > DAY_MS

  const finishGame = (game: GameKey, score: number, coins: number) => {
    const xp = Math.round(score / 4) + 10
    actions.recordGame(game, score, coins, xp)
    actions.addNotification({
      kind: 'game',
      title: 'จบมินิเกมแล้ว',
      body: `ได้ ${score} คะแนน · 🪙 +${coins} · +${xp} XP`,
      goto: 'games',
    })
    setPlaying(null)
  }

  return (
    <>
      <TopBar
        title="ภารกิจ & มินิเกม"
        subtitle={`เลเวล ${lvl.level} · ${state.profile.xp} XP · 🪙 ${state.profile.coins}`}
      />

      <div className="card">
        <div className="row">
          <div className="grow">
            <div className="strong">เลเวล {lvl.level}</div>
            <div className="muted small">
              อีก {lvl.need - lvl.inLevel} XP ถึงเลเวล {lvl.level + 1}
            </div>
          </div>
          <span className="chip on">🪙 {state.profile.coins}</span>
        </div>
        <div className="bar" style={{ marginTop: 10 }}>
          <i style={{ width: `${(lvl.inLevel / lvl.need) * 100}%` }} />
        </div>
      </div>

      <div className="seg" style={{ marginTop: 14 }}>
        <button className={tab === 'missions' ? 'on' : ''} onClick={() => setTab('missions')}>
          🎯 ภารกิจ
        </button>
        <button className={tab === 'games' ? 'on' : ''} onClick={() => setTab('games')}>
          🎮 มินิเกม
        </button>
      </div>

      {tab === 'missions' ? (
        <>
          {(['daily', 'weekly', 'season'] as const).map((period) => {
            const list = missions.filter((m) => m.period === period)
            const done = list.filter((m) => m.progress >= m.target).length
            return (
              <div key={period}>
                <div className="section-title">
                  {PERIOD_LABEL[period]}
                  <span className="spacer" />
                  <span className="muted tiny">
                    {done}/{list.length}
                  </span>
                </div>
                <div className="stack-8">
                  {list.map((m) => (
                    <MissionRow key={m.id} mission={m} onClaim={() => actions.claimMission(m.id)} nav={nav} />
                  ))}
                </div>
              </div>
            )
          })}
          <div className="card tight muted tiny" style={{ marginTop: 14, lineHeight: 1.7 }}>
            ภารกิจรายวันรีเซ็ตทุกเที่ยงคืน ภารกิจรายสัปดาห์รีเซ็ตทุกวันจันทร์
          </div>
        </>
      ) : (
        <>
          <div className="section-title">เลือกเกม</div>
          <div className="stack-8">
            {GAMES.map((g) => (
              <button key={g.key} className="list-btn" onClick={() => setPlaying(g.key)}>
                <span className="avatar">{g.emoji}</span>
                <span className="grow">
                  <span className="strong" style={{ display: 'block', fontSize: 14.5 }}>
                    {g.name}
                  </span>
                  <span className="muted small">{g.desc}</span>
                </span>
                {g.key === 'spin' ? (
                  <span className={`chip ${canSpin ? 'ok' : ''}`}>{canSpin ? 'พร้อมหมุน' : 'พรุ่งนี้'}</span>
                ) : (
                  <span className="chip">สถิติ {state.highScores[g.key] ?? 0}</span>
                )}
              </button>
            ))}
          </div>

          <div className="section-title">กิจกรรมท้าทายกับก๊วน</div>
          <div className="card">
            <div className="row">
              <span className="avatar">🏆</span>
              <div className="grow">
                <div className="strong" style={{ fontSize: 14.5 }}>
                  อันดับคะแนนมินิเกมสัปดาห์นี้
                </div>
                <div className="muted small">คะแนนของคุณสัปดาห์นี้ {state.counters.weekly.gameScore} แต้ม</div>
              </div>
            </div>
            <div className="stack-8" style={{ marginTop: 12 }}>
              {leaderboard(state.counters.weekly.gameScore, state.profile.name, state.profile.emoji, state.friends).map(
                (row, i) => (
                  <div key={row.name} className="row">
                    <span className="chip" style={{ minWidth: 34, justifyContent: 'center' }}>
                      {i + 1}
                    </span>
                    <span className="avatar sm">{row.emoji}</span>
                    <span className="grow truncate">{row.name}</span>
                    <span className={`strong ${row.me ? '' : 'muted'}`}>{row.score}</span>
                  </div>
                ),
              )}
            </div>
            <button className="btn block sm" style={{ marginTop: 14 }} onClick={() => nav('invites', { new: '1' })}>
              📣 ท้าเพื่อนไปวิ่งจริงบ้าง
            </button>
          </div>
        </>
      )}

      <Sheet
        open={playing === 'tapsprint'}
        title="⚡ แตะให้ทันจังหวะ"
        subtitle="สะสมคะแนนไปเปิดภารกิจมินิเกม"
        onClose={() => setPlaying(null)}
      >
        <TapSprint best={state.highScores.tapsprint ?? 0} onFinish={(s) => finishGame('tapsprint', s, Math.round(s / 10))} />
      </Sheet>

      <Sheet open={playing === 'spin'} title="🎡 วงล้อภารกิจ" subtitle="หมุนได้วันละ 1 ครั้ง" onClose={() => setPlaying(null)}>
        <SpinWheel
          canSpin={canSpin}
          nextInLabel="กลับมาหมุนใหม่พรุ่งนี้"
          onFinish={(coins, label) => {
            actions.markSpun()
            actions.recordGame('spin', coins, coins, 20)
            actions.addNotification({ kind: 'game', title: 'ผลวงล้อวันนี้', body: label, goto: 'games' })
            setPlaying(null)
          }}
        />
      </Sheet>

      <Sheet open={playing === 'quiz'} title="🧠 ควิซคนรักวิ่ง" subtitle="5 ข้อ ตอบถูกข้อละ 20 คะแนน" onClose={() => setPlaying(null)}>
        <RunQuiz best={state.highScores.quiz ?? 0} onFinish={(s) => finishGame('quiz', s, Math.round(s / 5))} />
      </Sheet>
    </>
  )
}

function MissionRow({ mission, onClaim, nav }: { mission: Mission; onClaim: () => void; nav: Nav }) {
  const complete = mission.progress >= mission.target
  const pct = Math.min(100, (mission.progress / mission.target) * 100)
  const shown = mission.metric === 'distanceKm' ? mission.progress.toFixed(1) : Math.floor(mission.progress)

  return (
    <div className="card tight">
      <div className="row">
        <span className="avatar sm">{complete ? (mission.claimed ? '✅' : '🎁') : '🎯'}</span>
        <div className="grow">
          <div className="strong" style={{ fontSize: 14 }}>
            {mission.title}
          </div>
          <div className="muted tiny">{mission.detail}</div>
        </div>
        {mission.claimed ? (
          <span className="chip ok">รับแล้ว</span>
        ) : complete ? (
          <button className="btn primary xs" onClick={onClaim}>
            รับรางวัล
          </button>
        ) : (
          <button className="btn xs" onClick={() => nav(routeFor(mission))}>
            ไปทำ
          </button>
        )}
      </div>
      <div className="row" style={{ marginTop: 9, gap: 10 }}>
        <div className="bar grow">
          <i style={{ width: `${pct}%` }} />
        </div>
        <span className="tiny muted" style={{ minWidth: 52, textAlign: 'right' }}>
          {shown}/{mission.target}
        </span>
      </div>
      <div className="row tiny muted" style={{ marginTop: 7, gap: 8 }}>
        <span>+{mission.xp} XP</span>
        <span>🪙 +{mission.coins}</span>
      </div>
    </div>
  )
}

function routeFor(m: Mission): Parameters<Nav>[0] {
  switch (m.metric) {
    case 'distanceKm':
    case 'runCount':
      return 'run'
    case 'inviteSent':
      return 'invites'
    case 'friendAdded':
      return 'friends'
    case 'groupCreated':
      return 'groups'
    case 'locationShared':
      return 'map'
    default:
      return 'games'
  }
}

/** ตารางอันดับตัวอย่าง: คะแนนเพื่อนสร้างจากค่าคงที่ของแต่ละคนเพื่อให้ผลนิ่ง */
/**
 * กระดานคะแนนของจริง: ใช้คะแนนสัปดาห์นี้ที่เพื่อนแต่ละคนส่งขึ้นโปรไฟล์
 * (ของเดิมคิดเลขของเพื่อนขึ้นเองจากระยะวิ่งสะสม แต่ละเครื่องจึงเห็นไม่ตรงกัน)
 */
function leaderboard(
  myScore: number,
  myName: string,
  myEmoji: string,
  friends: Array<{ id: string; name: string; emoji: string; status: string; weeklyScore: number }>,
) {
  const rows = friends
    .filter((f) => f.status === 'friend')
    .map((f) => ({ name: f.name, emoji: f.emoji, score: f.weeklyScore, me: false }))
  rows.push({ name: myName, emoji: myEmoji, score: myScore, me: true })
  return rows
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'th'))
    .slice(0, 6)
}
