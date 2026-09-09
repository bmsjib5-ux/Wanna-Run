import { useRef, useState } from 'react'
import Avatar from './Avatar'

type Props = {
  emoji: string
  photo?: string
  name?: string
  /** อัปโหลด/เก็บรูปที่เลือก โยน error ออกมาได้ถ้าไม่สำเร็จ */
  onPick: (file: File) => Promise<void>
  onClear?: () => Promise<void>
}

const MAX_BYTES = 12 * 1024 * 1024

/** เลือกรูปโปรไฟล์จากกล้องหรือคลังภาพ */
export default function AvatarPicker({ emoji, photo, name, onPick, onClear }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const choose = async (file?: File) => {
    if (!file) return
    setError(null)
    if (!file.type.startsWith('image/')) {
      setError('เลือกได้เฉพาะไฟล์รูปภาพ')
      return
    }
    if (file.size > MAX_BYTES) {
      setError('ไฟล์ใหญ่เกินไป เลือกรูปที่เล็กกว่า 12 MB')
      return
    }
    setBusy(true)
    try {
      await onPick(file)
    } catch (err) {
      setError((err as Error).message || 'อัปโหลดรูปไม่สำเร็จ ลองใหม่อีกครั้ง')
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  return (
    <div className="center">
      <button
        onClick={() => input.current?.click()}
        disabled={busy}
        style={{ position: 'relative', display: 'inline-grid', placeItems: 'center' }}
        aria-label="เปลี่ยนรูปโปรไฟล์"
      >
        <Avatar emoji={emoji} photo={photo} name={name} size="lg" />
        <span className="avatar-edit">{busy ? '…' : '📷'}</span>
      </button>

      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => void choose(e.target.files?.[0])}
      />

      <div className="row" style={{ justifyContent: 'center', gap: 8, marginTop: 12 }}>
        <button className="btn sm" onClick={() => input.current?.click()} disabled={busy}>
          {busy ? 'กำลังอัปโหลด...' : photo ? 'เปลี่ยนรูป' : 'อัปโหลดรูป'}
        </button>
        {photo && onClear && (
          <button
            className="btn sm danger"
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              try {
                await onClear()
              } catch (err) {
                setError((err as Error).message || 'ลบรูปไม่สำเร็จ')
              } finally {
                setBusy(false)
              }
            }}
          >
            ลบรูป
          </button>
        )}
      </div>

      {error && (
        <div className="small" style={{ color: 'var(--danger)', marginTop: 10 }}>
          {error}
        </div>
      )}
      <div className="muted tiny" style={{ marginTop: 8, lineHeight: 1.6 }}>
        รูปจะถูกย่อเป็นสี่เหลี่ยม 256 พิกเซลก่อนอัปโหลด เพื่อไม่ให้เปลืองเน็ตของเพื่อน
      </div>
    </div>
  )
}
