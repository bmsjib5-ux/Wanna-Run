import { useEffect, useMemo, useState } from 'react'
import type { Nav } from '../App'
import TopBar from '../components/TopBar'
import Sheet from '../components/Sheet'
import Avatar from '../components/Avatar'
import QrCode from '../components/QrCode'
import QrScanner from '../components/QrScanner'
import { friendLink } from '../lib/friendLink'
import { useStore } from '../state/store'
import { agoLabel } from '../lib/format'
import { paceLabel } from '../lib/geo'
import { pushNotice } from '../lib/notify'
import type { Friend } from '../types'

export default function Friends({ nav, addCode }: { nav: Nav; addCode?: string }) {
  const { state, actions } = useStore()
  const [query, setQuery] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [code, setCode] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const submit = (value: string) => {
    const res = actions.addFriendByCode(value)
    setMsg({ ok: res.ok, text: res.message })
    if (res.ok) setCode('')
    return res.ok
  }

  // มาจากการสแกน QR ด้วยกล้องของเครื่อง (ลิงก์ ?add=RUN-XXXX)
  useEffect(() => {
    if (!addCode) return
    setAddOpen(true)
    setCode(addCode)
    submit(addCode)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addCode])

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

  const shareCode = async () => {
    const url = friendLink(state.profile.code)
    const text = `เพิ่มฉันใน Wanna Run? รหัส ${state.profile.code}`
    const withShare = navigator as Navigator & { share?: (d: ShareData) => Promise<void> }
    if (withShare.share) {
      withShare.share({ title: 'Wanna Run?', text, url }).catch(() => undefined)
      return
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`)
      pushNotice('คัดลอกลิงก์แล้ว', 'วางส่งให้เพื่อนได้เลย')
    } catch {
      pushNotice('ลิงก์เพิ่มเพื่อน', url)
    }
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
        <button className="btn sm" onClick={() => setQrOpen(true)} aria-label="แสดงคิวอาร์โค้ดของฉัน">
          ⬛ QR
        </button>
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
                <Avatar emoji={f.emoji} photo={f.avatarUrl} name={f.name} />
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
                <Avatar emoji={f.emoji} photo={f.avatarUrl} name={f.name} />
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
          ยังไม่มีใครในก๊วน — ส่งรหัส <b style={{ color: 'var(--accent-text)' }}>{state.profile.code}</b> ให้เพื่อน
          หรือขอรหัสเขามากรอกก็ได้
          <div className="row" style={{ marginTop: 14, gap: 8, justifyContent: 'center' }}>
            <button className="btn primary sm" onClick={() => { setAddOpen(true); setScanning(true) }}>
              📷 สแกน QR
            </button>
            <button className="btn sm" onClick={() => setAddOpen(true)}>
              กรอกรหัส
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
                <Avatar emoji={f.emoji} photo={f.avatarUrl} name={f.name} />
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
        title={scanning ? 'สแกน QR ของเพื่อน' : 'เพิ่มเพื่อนด้วยรหัส'}
        subtitle={scanning ? 'ให้เพื่อนเปิด QR ของเขาขึ้นมา แล้วเล็งกล้องไปที่โค้ด' : 'สแกน QR หรือกรอกรหัส 4 ตัวจากเพื่อน'}
        onClose={() => {
          setAddOpen(false)
          setScanning(false)
          setMsg(null)
        }}
      >
        {scanning ? (
          <QrScanner
            onFound={(found) => {
              setScanning(false)
              setCode(found)
              submit(found)
            }}
            onCancel={() => setScanning(false)}
          />
        ) : (
          <>
            <button className="btn primary block" style={{ marginBottom: 16 }} onClick={() => { setMsg(null); setScanning(true) }}>
              📷 เปิดกล้องสแกน QR
            </button>

            <label className="field">
              <span>หรือกรอกรหัสเพื่อน</span>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="RUN-7KQ2"
                maxLength={8}
              />
            </label>
            {msg && (
              <div className={`chip ${msg.ok ? 'ok' : 'bad'}`} style={{ marginBottom: 14 }}>
                {msg.text}
              </div>
            )}
            <button className="btn block" onClick={() => submit(code)} disabled={code.trim().length < 4}>
              ส่งคำขอเป็นเพื่อน
            </button>
            <div className="card tight muted small" style={{ marginTop: 14, lineHeight: 1.65 }}>
              รหัสของคุณคือ <b style={{ color: 'var(--accent-text)' }}>{state.profile.code}</b> — กดปุ่ม QR ด้านบนให้เพื่อนสแกนก็ได้
            </div>
          </>
        )}
      </Sheet>

      <Sheet
        open={qrOpen}
        title="QR ของฉัน"
        subtitle="ให้เพื่อนสแกนโค้ดนี้เพื่อเพิ่มคุณเข้าก๊วน"
        onClose={() => setQrOpen(false)}
      >
        <div className="center">
          <QrCode value={friendLink(state.profile.code)} />
          <div className="strong" style={{ fontSize: 24, letterSpacing: 2, marginTop: 16 }}>
            {state.profile.code}
          </div>
          <div className="muted small" style={{ marginTop: 4 }}>
            {state.profile.emoji} {state.profile.name}
          </div>
        </div>
        <div className="row" style={{ gap: 8, marginTop: 18 }}>
          <button className="btn grow" onClick={copyCode}>
            คัดลอกรหัส
          </button>
          <button className="btn primary grow" onClick={shareCode}>
            แชร์ให้เพื่อน
          </button>
        </div>
        <div className="card tight muted small" style={{ marginTop: 14, lineHeight: 1.65 }}>
          สแกนด้วยกล้องของเครื่องก็ได้ โค้ดนี้เป็นลิงก์ที่เปิดแอปมาที่หน้าเพิ่มเพื่อนให้อัตโนมัติ
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
        <Avatar emoji={friend.emoji} photo={friend.avatarUrl} name={friend.name} online={friend.sharingLocation} />
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
