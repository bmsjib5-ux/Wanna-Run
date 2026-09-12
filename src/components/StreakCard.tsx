import type { Streak } from '../lib/streak'

/** การ์ดสตรีค: วิ่งต่อเนื่องกี่วันแล้ว พร้อมแถบ 7 วันล่าสุด */
export default function StreakCard({ streak, onRun }: { streak: Streak; onRun: () => void }) {
  const { days, ranToday, best, week, nextMilestone } = streak
  const alive = days > 0
  const toGo = nextMilestone ? nextMilestone - (ranToday ? days : days + 1) : 0

  return (
    <div className={`card streak${alive ? ' alive' : ''}`}>
      <div className="row" style={{ gap: 14, alignItems: 'flex-start' }}>
        <span className={`streak-flame${alive && ranToday ? ' lit' : ''}`} aria-hidden="true">
          {alive ? '🔥' : '🌱'}
        </span>
        <span className="grow">
          <span className="streak-count">
            {days}
            <b> วัน</b>
          </span>
          <span className="muted small" style={{ display: 'block', marginTop: 2 }}>
            {!alive
              ? 'ออกไปวิ่งวันนี้เพื่อเริ่มนับวันที่ 1'
              : ranToday
                ? `วิ่งแล้ววันนี้ — ต่อเนื่องเป็นวันที่ ${days} 💪`
                : `วิ่งวันนี้เพื่อต่อเป็นวันที่ ${days + 1} ไม่งั้นสตรีคขาด`}
          </span>
        </span>
        {best > 0 && (
          <span className="chip" style={{ flex: 'none' }}>
            🏅 สูงสุด {best}
          </span>
        )}
      </div>

      <div className="streak-week">
        {week.map((d) => (
          <span key={d.date} className={`streak-day${d.ran ? ' on' : ''}${d.today ? ' today' : ''}`}>
            <i>{d.ran ? '🔥' : ''}</i>
            {d.label}
          </span>
        ))}
      </div>

      {nextMilestone && toGo > 0 && (
        <div className="tiny muted center" style={{ marginTop: 10 }}>
          อีก {toGo} วันถึงเป้า {nextMilestone} วันติด 🎯
        </div>
      )}

      {!ranToday && (
        <button className="btn primary block sm" style={{ marginTop: 12 }} onClick={onRun}>
          🏃 วิ่งวันนี้เลย
        </button>
      )}
    </div>
  )
}
