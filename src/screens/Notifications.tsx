import type { Nav, Route } from '../App'
import TopBar from '../components/TopBar'
import { useStore } from '../state/store'
import { agoLabel } from '../lib/format'

const ICON: Record<string, string> = {
  invite: '📣',
  friend: '👟',
  group: '👥',
  mission: '🎯',
  location: '📍',
  run: '🏁',
  game: '🎮',
}

export default function Notifications({ nav }: { nav: Nav }) {
  const { state, actions } = useStore()
  const unread = state.notifications.filter((n) => !n.read).length

  return (
    <>
      <TopBar
        title="การแจ้งเตือน"
        subtitle={unread > 0 ? `ยังไม่ได้อ่าน ${unread} รายการ` : 'อ่านครบแล้ว'}
        onBack={() => nav('home')}
        right={
          unread > 0 ? (
            <button className="btn sm" onClick={actions.markAllRead}>
              อ่านทั้งหมด
            </button>
          ) : undefined
        }
      />

      {state.notifications.length === 0 ? (
        <div className="card empty">
          <div className="big">🔔</div>
          ยังไม่มีการแจ้งเตือน
        </div>
      ) : (
        <div className="stack-8">
          {state.notifications.map((n) => (
            <button
              key={n.id}
              className="list-btn"
              style={{ borderColor: n.read ? 'var(--line)' : 'rgba(198,242,78,.4)' }}
              onClick={() => {
                actions.markRead(n.id)
                if (n.goto) nav(n.goto as Route)
              }}
            >
              <span className="avatar">{ICON[n.kind] ?? '🔔'}</span>
              <span className="grow">
                <span className="strong" style={{ display: 'block', fontSize: 14.5 }}>
                  {n.title}
                </span>
                <span className="muted small" style={{ display: 'block' }}>
                  {n.body}
                </span>
                <span className="muted tiny">{agoLabel(n.at)}</span>
              </span>
              {!n.read && <span className="chip on">ใหม่</span>}
            </button>
          ))}
        </div>
      )}
    </>
  )
}
