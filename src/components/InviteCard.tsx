import type { Friend, RunInvite } from '../types'
import { whenLabel } from '../lib/format'

type Props = {
  invite: RunInvite
  friends: Friend[]
  compact?: boolean
  onOpen?: () => void
  children?: React.ReactNode
}

export function goingCount(invite: RunInvite): number {
  const others = Object.values(invite.replies).filter((r) => r === 'going').length
  const me = invite.hostIsMe || invite.myReply === 'going' ? 1 : 0
  return others + me
}

export default function InviteCard({ invite, friends, compact, onOpen, children }: Props) {
  const going = goingCount(invite)
  const attendees = friends.filter((f) => invite.replies[f.id] === 'going')
  const soon = invite.startAt - Date.now() < 24 * 3600_000 && invite.startAt > Date.now()

  return (
    <div className="card" onClick={onOpen} style={{ cursor: onOpen ? 'pointer' : undefined }}>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <div className="avatar">{invite.hostIsMe ? '📣' : '📨'}</div>
        <div className="grow">
          <div className="row" style={{ gap: 6 }}>
            <div className="strong truncate" style={{ fontSize: 15 }}>
              {invite.title}
            </div>
            {invite.status === 'cancelled' && <span className="chip bad">ยกเลิกแล้ว</span>}
            {invite.status === 'open' && soon && <span className="chip warn">ใกล้ถึงเวลา</span>}
          </div>
          <div className="muted small" style={{ marginTop: 3 }}>
            📍 {invite.place.name}
          </div>
          <div className="muted small">
            🗓️ {whenLabel(invite.startAt)} · 🎯 {invite.targetKm} กม.
          </div>
        </div>
      </div>

      {!compact && invite.note && (
        <div className="small" style={{ marginTop: 10, color: 'var(--text)', opacity: 0.85, lineHeight: 1.6 }}>
          “{invite.note}”
        </div>
      )}

      <div className="row wrap" style={{ marginTop: 12, gap: 8 }}>
        <div className="row" style={{ gap: -6 }}>
          {attendees.slice(0, 4).map((f, i) => (
            <span key={f.id} className="avatar sm" style={{ marginLeft: i === 0 ? 0 : -8 }}>
              {f.emoji}
            </span>
          ))}
        </div>
        <span className="chip ok">ไป {going} คน</span>
        {invite.hostIsMe ? (
          <span className="chip">คุณเป็นคนชวน</span>
        ) : invite.myReply ? (
          <span className={`chip ${invite.myReply === 'going' ? 'ok' : invite.myReply === 'maybe' ? 'warn' : 'bad'}`}>
            {invite.myReply === 'going' ? 'คุณตอบรับแล้ว' : invite.myReply === 'maybe' ? 'คุณตอบว่าอาจจะ' : 'คุณปฏิเสธ'}
          </span>
        ) : (
          <span className="chip warn">ยังไม่ตอบ</span>
        )}
      </div>

      {children}
    </div>
  )
}
