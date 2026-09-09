import type { Place } from '../types'

type Props = {
  spots: Place[]
  activeId?: string
  onPick: (spot: Place) => void
  onInvite: (spot: Place) => void
  onShare: (spot: Place) => void
  onRemove?: (spot: Place) => void
}

/** รายการจุดวิ่งประจำ: แตะเพื่อดูบนแผนที่ พร้อมปุ่มชวน / ส่ง / ลบ */
export default function SpotList({ spots, activeId, onPick, onInvite, onShare, onRemove }: Props) {
  return (
    <>
      <div className="section-title">⭐ จุดวิ่งประจำของฉัน ({spots.length})</div>
      {spots.length === 0 ? (
        <div className="card empty">
          <div className="big">⭐</div>
          ยังไม่มีจุดประจำ — ปักหมุดหรือค้นหาสถานที่บนแผนที่ แล้วกด "บันทึกเป็นจุดประจำ"
        </div>
      ) : (
        <div className="stack-8">
          {spots.map((sp) => (
            <div key={sp.id} className={`card tight spot${sp.id === activeId ? ' active' : ''}`}>
              <button className="row spot-main" onClick={() => onPick(sp)} aria-label={`ดู ${sp.name} บนแผนที่`}>
                <span className="avatar">⭐</span>
                <span className="grow">
                  <span className="strong" style={{ display: 'block', fontSize: 14.5 }}>
                    {sp.name}
                  </span>
                  <span className="muted small truncate" style={{ display: 'block' }}>
                    {sp.area || `${sp.lat.toFixed(5)}, ${sp.lng.toFixed(5)}`}
                  </span>
                </span>
                <span className="muted">›</span>
              </button>
              <div className="row" style={{ gap: 8, marginTop: 10 }}>
                <button className="btn primary xs grow" onClick={() => onInvite(sp)}>
                  📣 ชวน
                </button>
                <button className="btn xs grow" onClick={() => onShare(sp)}>
                  📤 ส่ง
                </button>
                {onRemove && (
                  <button className="btn xs" onClick={() => onRemove(sp)} aria-label={`ลบ ${sp.name}`}>
                    🗑️
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
