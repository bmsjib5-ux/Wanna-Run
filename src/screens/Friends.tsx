import { useMemo, useState } from 'react'
import type { Nav } from '../App'
import TopBar from '../components/TopBar'
import Sheet from '../components/Sheet'
import StatusDot from '../components/StatusDot'
import { useStore } from '../state/store'
import { agoLabel } from '../lib/format'
import { paceLabel } from '../lib/geo'
import { pushNotice } from '../lib/notify'
import type { Friend } from '../types'

export default function Friends({ nav }: { nav: Nav }) {
  const { state, actions } = useStore()
  const [query, setQuery] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [code, setCode] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const match = (f: Friend) =>
    !query.trim() || f.name.includes(query.trim()) || f.code.includes(query.trim().toUpperCase())

  const incoming = state.friends.filter((f) => f.status === 'incoming' && match(f))
  const outgoing = state.friends.filter((f) => f.status === 'outgoing' && match(f))
  const mine = useMemo(
    () => state.friends.filter((f) => f.status === 'friend' && match(f)).sort((a, b) => b.lastActiveAt - a.lastActiveAt),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.friends, query],
  )
  const suggested = state.friends.filter((f) => f.status === 'suggested' && match(f))

  const submitCode = () => {
    const res = actions.addFriendByCode(code)
    setMsg({ ok: res.ok, text: res.message })
    if (res.ok) setCode('')
  }

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(state.profile.code)
      pushNotice('คัดลอกรหัสแล้ว', `ส่ง ${state.profile.code} ให้เพื่อนเพิ่มคุณได้เลย`)
    } catch {
      pushNotice('รหัสของคุณ', state.profile.code)
    }
  }

  return (
    <>
      <TopBar
        title="เพื่อนนักวิ่ง"
        subtitle={`${state.friends.filter((f) => f.status === 'friend').length} คนในก๊วน`}
        right={
          <button className="btn primary sm" onClick={() => setAddOpen(true)}>
            + เพิ่ม
          </button>
        }
      />

      <div className="card tight row" style={{ gap: 10 }}>
        <span>🔗</span>
        <div className="grow">
          <div className="tiny muted">รหัสเพื่อนของคุณ</div>
          <div className="strong" style={{ letterSpacing: 1.5, fontSize: 17 }}>
            {state.profile.code}
          </div>
        </div>
        <button className="btn sm" onClick={copyCode}>
          คัดลอก
        </button>
      </div>

      <input
        className="input"
        style={{ marginTop: 12 }}
        placeholder="ค้นหาชื่อหรือรหัสเพื่อน"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {incoming.length > 0 && (
        <>
          <div className="section-title">คำขอเป็นเพื่อน ({incoming.length})</div>
          <div className="stack-8">
            {incoming.map((f) => (
              <div key={f.id} className="card tight row">
                <span className="avatar">{f.emoji}</span>
                <div className="grow">
                  <div className="strong" style={{ fontSize: 14.5 }}>
                    {f.name}
                  </div>
                  <div className="muted small truncate">{f.bio}</div>
                </div>
                <button className="btn primary xs" onClick={() => actions.acceptFriend(f.id)}>
                  รับ
                </button>
                <button className="btn xs" onClick={() => actions.declineFriend(f.id)}>
                  ปฏิเสธ
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {outgoing.length > 0 && (
        <>
          <div className="section-title">รอตอบรับ</div>
          <div className="stack-8">
            {outgoing.map((f) => (
              <div key={f.id} className="card tight row">
                <span className="avatar">{f.emoji}</span>
                <div className="grow">
                  <div className="strong" style={{ fontSize: 14.5 }}>
                    {f.name}
                  </div>
                  <div className="muted small">{f.code}</div>
                </div>
                <span className="chip warn">รอตอบรับ</span>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="section-title">
        ก๊วนของคุณ
        <span className="spacer" />
        <button onClick={() => nav('groups')}>จัดกลุ่ม</button>
      </div>

      {mine.length === 0 ? (
        <div className="card empty">
          <div className="big">👟</div>
          ยังไม่มีใครในก๊วน — ส่งรหัส <b style={{ color: 'var(--accent)' }}>{state.profile.code}</b> ให้เพื่อน
          หรือขอรหัสเขามากรอกก็ได้
          <div style={{ marginTop: 14 }}>
            <button className="btn primary sm" onClick={() => setAddOpen(true)}>
              เพิ่มด้วยรหัสเพื่อน
            </button>
          </div>
        </div>
      ) : (
        <div className="stack-8">
          {mine.map((f) => (
            <FriendRow key={f.id} friend={f} nav={nav} onRemove={() => actions.removeFriend(f.id)} />
          ))}
        </div>
      )}

      {suggested.length > 0 && (
        <>
          <div className="section-title">นักวิ่งที่คุณอาจรู้จัก</div>
          <div className="stack-8">
            {suggested.map((f) => (
              <div key={f.id} className="card tight row">
                <span className="avatar">{f.emoji}</span>
                <div className="grow">
                  <div className="strong" style={{ fontSize: 14.5 }}>
                    {f.name}
                  </div>
                  <div className="muted small truncate">
                    {f.bio} · {f.code}
                  </div>
                </div>
                <button className="btn primary xs" onClick={() => actions.sendFriendRequest(f.id)}>
                  + เพิ่ม
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <Sheet
        open={addOpen}
        title="เพิ่มเพื่อนด้วยรหัส"
        subtitle="ขอรหัส 4 ตัวจากเพื่อน แล้วกรอกที่นี่ได้เลย"
        onClose={() => {
          setAddOpen(false)
          setMsg(null)
        }}
      >
        <label className="field">
          <span>รหัสเพื่อน</span>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="RUN-7KQ2"
            maxLength={8}
            autoFocus
          />
        </label>
        {msg && (
          <div className={`chip ${msg.ok ? 'ok' : 'bad'}`} style={{ marginBottom: 14 }}>
            {msg.text}
          </div>
        )}
        <button className="btn primary block" onClick={submitCode} disabled={code.trim().length < 4}>
          ส่งคำขอเป็นเพื่อน
        </button>
        <div className="card tight muted small" style={{ marginTop: 14, lineHeight: 1.65 }}>
          รหัสของคุณคือ <b style={{ color: 'var(--accent)' }}>{state.profile.code}</b> — ส่งให้เพื่อนเพื่อให้เขาเพิ่มคุณกลับได้
        </div>
      </Sheet>
    </>
  )
}

function FriendRow({ friend, nav, onRemove }: { friend: Friend; nav: Nav; onRemove: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button className="list-btn" onClick={() => setOpen(true)}>
        <span className="avatar-wrap">
          <span className="avatar">{friend.emoji}</span>
          <StatusDot online={friend.sharingLocation} />
        </span>
        <span className="grow">
          <span className="strong" style={{ display: 'block', fontSize: 14.5 }}>
            {friend.name}
          </span>
          <span className="muted small">
            {friend.totalKm} กม. · {paceLabel(friend.avgPaceSec)} · {agoLabel(friend.lastActiveAt)}
          </span>
        </span>
      </button>

      <Sheet
        open={open}
        title={`${friend.emoji} ${friend.name}`}
        subtitle={`${friend.sharingLocation ? '🟢 ออนไลน์' : '⚪ ออฟไลน์'} · ${friend.bio}`}
        onClose={() => setOpen(false)}
      >
        <div className="card">
          <div className="stat-grid">
            <div className="stat">
              <div className="v">{friend.totalKm}</div>
              <div className="k">กม. สะสม</div>
            </div>
            <div className="stat">
              <div className="v">{paceLabel(friend.avgPaceSec).replace(' /กม.', '')}</div>
              <div className="k">เพซเฉลี่ย</div>
            </div>
            <div className="stat">
              <div className="v" style={{ fontSize: 18 }}>
                {friend.code}
              </div>
              <div className="k">รหัสเพื่อน</div>
            </div>
          </div>
        </div>
        <div className="stack-8" style={{ marginTop: 14 }}>
          <button
            className="btn primary block"
            onClick={() => {
              setOpen(false)
              nav('invites', { new: '1' })
            }}
          >
            📣 ชวน {friend.name} ไปวิ่ง
          </button>
          <button
            className="btn block"
            onClick={() => {
              setOpen(false)
              nav('map')
            }}
          >
            🗺️ ดูตำแหน่งบนแผนที่
          </button>
          <button
            className="btn danger block"
            onClick={() => {
              onRemove()
              setOpen(false)
            }}
          >
            ลบออกจากก๊วน
          </button>
        </div>
      </Sheet>
    </>
  )
}
