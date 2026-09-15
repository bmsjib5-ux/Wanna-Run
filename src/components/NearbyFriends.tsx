import { useCallback, useEffect, useState } from 'react'
import { MapPin, Radar } from 'lucide-react'
import type { Nav } from '../App'
import Avatar from './Avatar'
import { useStore } from '../state/store'
import { useCurrentPosition } from '../lib/useGeo'
import { agoLabel } from '../lib/format'
import { nearLabel, pickNearby, type Near } from '../lib/nearby'
import * as api from '../lib/api'

export default function NearbyFriends({ nav }: { nav: Nav }) {
  const { state, actions, cloud } = useStore()
  const geo = useCurrentPosition(false)
  const [list, setList] = useState<Near[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)

  const search = useCallback(() => {
    setProblem(null)
    setBusy(true)
    geo.locate()
  }, [geo])

  // ได้ตำแหน่งตัวเองแล้วค่อยไปถามว่าเพื่อนคนไหนอยู่ใกล้
  useEffect(() => {
    if (!busy) return
    if (geo.status === 'denied' || geo.status === 'error' || geo.status === 'unsupported') {
      setProblem(geo.error ?? 'ขอตำแหน่งไม่สำเร็จ')
      setBusy(false)
      return
    }
    if (geo.status !== 'ready' || !geo.position) return

    const me = geo.position
    let alive = true
    void (async () => {
      try {
        const pings = await api.fetchFriendLocations()
        if (!alive) return
        setList(pickNearby(pings, state.friends, me))
      } catch (err) {
        // ข้อผิดพลาดจาก Supabase เป็นอ็อบเจกต์ธรรมดา ไม่ใช่ Error จึงต้องอ่าน message เอง
        console.error('ค้นหาเพื่อนใกล้ตัวไม่สำเร็จ', err)
        const message = typeof err === 'object' && err !== null && 'message' in err ? String((err as { message: unknown }).message) : ''
        if (alive) setProblem(message || 'ค้นหาไม่สำเร็จ ลองใหม่อีกครั้ง')
      } finally {
        if (alive) setBusy(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [busy, geo.status, geo.position, geo.error, state.friends])

  return (
    <div className="card nearby">
      <div className="row">
        <span className="avatar">📡</span>
        <span className="grow">
          <span className="strong" style={{ display: 'block', fontSize: 14.5 }}>
            เพื่อนใกล้ฉัน
          </span>
          <span className="muted small">ในระยะ 5 กม. จากตำแหน่งตอนนี้</span>
        </span>
        <button className="btn primary sm" onClick={search} disabled={busy || !cloud}>
          <Radar size={16} aria-hidden="true" /> {busy ? 'กำลังหา...' : 'ค้นหา'}
        </button>
      </div>

      {!cloud && <div className="muted small" style={{ marginTop: 10 }}>โหมดในเครื่องยังหาเพื่อนใกล้ตัวไม่ได้</div>}

      {problem && (
        <div className="muted small" style={{ marginTop: 10 }}>
          {problem}
        </div>
      )}

      {list !== null && !busy && !problem && (
        list.length === 0 ? (
          <div className="muted small" style={{ marginTop: 10, lineHeight: 1.6 }}>
            ยังไม่เจอใครในระยะ 5 กม. — เห็นได้เฉพาะเพื่อนที่เปิดแชร์ตำแหน่งไว้ และอัปเดตภายใน 30 นาทีที่ผ่านมา
          </div>
        ) : (
          <div className="stack-8" style={{ marginTop: 12 }}>
            {list.map(({ friend, meters, updatedAt }) => (
              <div key={friend.id} className="nearby-row">
                <Avatar emoji={friend.emoji} photo={friend.avatarUrl} name={friend.name} />
                <span className="grow">
                  <span className="strong" style={{ display: 'block', fontSize: 14.5 }}>
                    {friend.name}
                  </span>
                  <span className="muted small">
                    <MapPin size={13} aria-hidden="true" /> ห่าง {nearLabel(meters)} · {agoLabel(updatedAt)}
                  </span>
                </span>
                <button
                  className="greet-btn"
                  onClick={() => void actions.greetFriend(friend.id, '👋')}
                  aria-label={`ทักทาย ${friend.name}`}
                >
                  👋
                </button>
                <button className="btn sm" onClick={() => nav('map')}>
                  แผนที่
                </button>
              </div>
            ))}
            <button className="btn block sm" onClick={() => nav('invites', { new: '1' })}>
              📣 ชวนคนที่อยู่ใกล้ไปวิ่งด้วยกัน
            </button>
          </div>
        )
      )}
    </div>
  )
}
