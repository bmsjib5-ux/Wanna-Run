import { useMemo } from 'react'
import { ArrowRight } from 'lucide-react'
import type { Nav } from '../App'
import { Card, CardContent } from './ui'
import { levelOf, missionsWithProgress, useStore } from '../state/store'
import { DAY_MS } from '../lib/format'
import type { GameKey, Mission } from '../types'

/** เกมที่เล่นได้ เรียงตามที่ใช้จริงบ่อยสุด */
const GAMES: Array<{ key: GameKey; emoji: string; name: string }> = [
  { key: 'tapsprint', emoji: '⚡', name: 'แตะให้ทัน' },
  { key: 'spin', emoji: '🎡', name: 'วงล้อ' },
  { key: 'quiz', emoji: '🧠', name: 'ควิซ' },
]

const SHOWN = 3

/**
 * เลือกภารกิจที่ควรเห็นบนหน้าแรก: ที่ทำครบรอรับรางวัลก่อน แล้วค่อยอันที่ใกล้สำเร็จ
 * ภารกิจที่รับรางวัลไปแล้วไม่ต้องกินที่
 */
function pickMissions(missions: Mission[]): Mission[] {
  const open = missions.filter((m) => !m.claimed)
  const ready = open.filter((m) => m.progress >= m.target)
  const rest = open
    .filter((m) => m.progress < m.target)
    .sort((a, b) => b.progress / b.target - a.progress / a.target)
  return [...ready, ...rest].slice(0, SHOWN)
}

/** การ์ดภารกิจและมินิเกมบนหน้าแรก — เห็นความคืบหน้าและกดเล่นได้เลย */
export default function HomePlay({ nav }: { nav: Nav }) {
  const { state, actions } = useStore()
  const missions = useMemo(() => missionsWithProgress(state), [state])
  const shown = useMemo(() => pickMissions(missions), [missions])
  const claimable = missions.filter((m) => !m.claimed && m.progress >= m.target).length
  const done = missions.filter((m) => m.progress >= m.target).length
  const lvl = levelOf(state.profile.xp)
  const canSpin = Date.now() - state.lastSpinAt > DAY_MS

  return (
    <>
      <div className="section-title">
        ภารกิจของคุณ
        <button onClick={() => nav('games')}>
          ดูทั้งหมด <ArrowRight size={15} />
        </button>
      </div>

      <Card>
        <CardContent>
          <div className="row">
            <span className="grow">
              <span className="strong" style={{ display: 'block', fontSize: 14.5 }}>
                เลเวล {lvl.level}
              </span>
              <span className="muted small">
                {claimable > 0
                  ? `มี ${claimable} ภารกิจรอรับรางวัล 🎁`
                  : `ทำสำเร็จแล้ว ${done}/${missions.length} · อีก ${lvl.need - lvl.inLevel} XP ถึงเลเวล ${lvl.level + 1}`}
              </span>
            </span>
            <span className="chip on">🪙 {state.profile.coins}</span>
          </div>
          <div className="bar" style={{ marginTop: 10 }}>
            <i style={{ width: `${(lvl.inLevel / lvl.need) * 100}%` }} />
          </div>

          <div className="stack-8" style={{ marginTop: 12 }}>
            {shown.length === 0 ? (
              <div className="muted small">ทำภารกิจครบหมดแล้ว เก่งมาก 🎉</div>
            ) : (
              shown.map((m) => {
                const complete = m.progress >= m.target
                const value = m.metric === 'distanceKm' ? m.progress.toFixed(1) : Math.floor(m.progress)
                return (
                  <div key={m.id} className="mission-mini">
                    <span className="avatar sm">{complete ? '🎁' : '🎯'}</span>
                    <span className="grow">
                      <span className="strong" style={{ display: 'block', fontSize: 13.5 }}>
                        {m.title}
                      </span>
                      <span className="row" style={{ gap: 8, marginTop: 5 }}>
                        <span className="bar grow">
                          <i style={{ width: `${Math.min(100, (m.progress / m.target) * 100)}%` }} />
                        </span>
                        <span className="muted tiny" style={{ flex: 'none' }}>
                          {value}/{m.target}
                        </span>
                      </span>
                    </span>
                    {complete ? (
                      <button className="btn primary xs" onClick={() => actions.claimMission(m.id)}>
                        รับรางวัล
                      </button>
                    ) : (
                      <span className="chip tiny">+{m.xp} XP</span>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>

      <div className="section-title">
        มินิเกม
        <button onClick={() => nav('games', { tab: 'games' })}>
          ทั้งหมด <ArrowRight size={15} />
        </button>
      </div>

      <div className="game-tiles">
        {GAMES.map((g) => (
          <button key={g.key} onClick={() => nav('games', { tab: 'games', game: g.key })}>
            <span className="e" aria-hidden="true">
              {g.emoji}
            </span>
            <strong>{g.name}</strong>
            <small>{g.key === 'spin' ? (canSpin ? 'พร้อมหมุน' : 'พรุ่งนี้') : `สถิติ ${state.highScores[g.key] ?? 0}`}</small>
          </button>
        ))}
      </div>
    </>
  )
}
