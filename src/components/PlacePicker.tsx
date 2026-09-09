import { useMemo, useState } from 'react'
import Sheet from './Sheet'
import Map from './Map'
import { PLACES } from '../lib/seed'
import { useCurrentPosition } from '../lib/useGeo'
import { distanceM } from '../lib/geo'
import { uid } from '../lib/id'
import { useStore } from '../state/store'
import type { LatLng, Place } from '../types'

type Props = {
  open: boolean
  onClose: () => void
  onSelect: (place: Place) => void
}

export default function PlacePicker({ open, onClose, onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<'list' | 'map'>('list')
  const [picked, setPicked] = useState<LatLng | null>(null)
  const [customName, setCustomName] = useState('')
  const geo = useCurrentPosition(open)
  const { state } = useStore()

  const q = query.trim()
  const spots = useMemo(
    () => (q ? state.spots.filter((p) => p.name.includes(q) || p.area.includes(q)) : state.spots),
    [q, state.spots],
  )
  const places = useMemo(() => {
    const list = q ? PLACES.filter((p) => p.name.includes(q) || p.area.includes(q) || p.tags.some((t) => t.includes(q))) : PLACES
    if (!geo.position) return list
    const here = geo.position
    return [...list].sort((a, b) => distanceM(here, a) - distanceM(here, b))
  }, [q, geo.position])

  const useHere = () => {
    if (!geo.position) return
    onSelect({
      id: uid('pl_'),
      name: 'ตำแหน่งปัจจุบันของฉัน',
      area: 'จุดที่คุณยืนอยู่ตอนนี้',
      lat: geo.position.lat,
      lng: geo.position.lng,
      tags: ['ปักหมุดเอง'],
    })
    onClose()
  }

  return (
    <Sheet open={open} title="เลือกสถานที่วิ่ง" subtitle="เลือกจากสวนยอดนิยม หรือปักหมุดเองบนแผนที่" onClose={onClose}>
      <div className="seg" style={{ marginBottom: 14 }}>
        <button className={mode === 'list' ? 'on' : ''} onClick={() => setMode('list')}>
          📋 สถานที่แนะนำ
        </button>
        <button className={mode === 'map' ? 'on' : ''} onClick={() => setMode('map')}>
          📍 ปักหมุดเอง
        </button>
      </div>

      {mode === 'list' ? (
        <>
          <input className="input" placeholder="ค้นหาสวน / ย่าน" value={query} onChange={(e) => setQuery(e.target.value)} />

          <button className="list-btn" style={{ marginTop: 12 }} onClick={useHere} disabled={!geo.position}>
            <span className="avatar">🎯</span>
            <span className="grow">
              <span className="strong" style={{ display: 'block', fontSize: 14.5 }}>
                ใช้ตำแหน่งปัจจุบัน
              </span>
              <span className="muted small">
                {geo.status === 'locating' && 'กำลังหาตำแหน่ง...'}
                {geo.status === 'ready' && `แม่นยำ ±${Math.round(geo.accuracy ?? 0)} ม.`}
                {(geo.status === 'denied' || geo.status === 'error' || geo.status === 'unsupported') &&
                  (geo.error ?? 'ใช้ตำแหน่งไม่ได้')}
                {geo.status === 'idle' && 'แตะเพื่อขอตำแหน่ง'}
              </span>
            </span>
          </button>

          {spots.length > 0 && (
            <>
              <div className="section-title">⭐ จุดวิ่งประจำของฉัน</div>
              <div className="stack-8">
                {spots.map((p) => (
                  <button
                    key={p.id}
                    className="list-btn"
                    onClick={() => {
                      onSelect(p)
                      onClose()
                    }}
                  >
                    <span className="avatar">⭐</span>
                    <span className="grow">
                      <span className="strong" style={{ display: 'block', fontSize: 14.5 }}>
                        {p.name}
                      </span>
                      <span className="muted small truncate" style={{ display: 'block' }}>
                        {p.area || `${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}`}
                        {geo.position ? ` · ห่าง ${(distanceM(geo.position, p) / 1000).toFixed(1)} กม.` : ''}
                      </span>
                    </span>
                    <span className="muted">›</span>
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="section-title">สวนและลู่วิ่งยอดนิยม</div>
          <div className="stack-8">
            {places.map((p) => (
              <button
                key={p.id}
                className="list-btn"
                onClick={() => {
                  onSelect(p)
                  onClose()
                }}
              >
                <span className="avatar">🌳</span>
                <span className="grow">
                  <span className="strong" style={{ display: 'block', fontSize: 14.5 }}>
                    {p.name}
                  </span>
                  <span className="muted small truncate" style={{ display: 'block' }}>
                    {p.area}
                    {p.loopKm ? ` · รอบละ ${p.loopKm} กม.` : ''}
                    {geo.position ? ` · ห่าง ${(distanceM(geo.position, p) / 1000).toFixed(1)} กม.` : ''}
                  </span>
                </span>
                <span className="muted">›</span>
              </button>
            ))}
            {places.length === 0 && <div className="empty">ไม่พบสถานที่ที่ค้นหา ลองปักหมุดเองดูไหม</div>}
          </div>
        </>
      ) : (
        <>
          <div className="muted small" style={{ marginBottom: 10 }}>
            แตะบนแผนที่เพื่อปักหมุดจุดนัดพบ
          </div>
          <Map
            center={picked ?? geo.fallback}
            zoom={15}
            follow={!picked}
            pins={picked ? [{ id: 'pick', pos: picked, emoji: '📍', label: 'จุดนัดพบ' }] : []}
            onPick={setPicked}
          />
          <label className="field" style={{ marginTop: 14 }}>
            <span>ชื่อจุดนัดพบ</span>
            <input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="เช่น หน้าประตู 3 สวนลุม" maxLength={50} />
          </label>
          <button
            className="btn primary block"
            disabled={!picked}
            onClick={() => {
              if (!picked) return
              onSelect({
                id: uid('pl_'),
                name: customName.trim() || 'จุดนัดพบที่ปักหมุด',
                area: `${picked.lat.toFixed(4)}, ${picked.lng.toFixed(4)}`,
                lat: picked.lat,
                lng: picked.lng,
                tags: ['ปักหมุดเอง'],
              })
              onClose()
            }}
          >
            ใช้จุดนี้
          </button>
        </>
      )}
    </Sheet>
  )
}
