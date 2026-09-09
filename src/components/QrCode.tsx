import { useEffect, useRef, useState } from 'react'

/** วาด QR ลงบน canvas ด้วยสีของธีมแอป */
export default function QrCode({ value, size = 220 }: { value: string; size?: number }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    const el = canvas.current
    if (!el) return
    let cancelled = false
    // โหลดไลบรารีตอนใช้จริง เพื่อไม่ให้ถ่วงเวลาเปิดแอปครั้งแรก
    import('qrcode')
      .then(({ default: QRCode }) => {
        if (cancelled) return
        return QRCode.toCanvas(el, value, {
          width: size,
          margin: 1,
          errorCorrectionLevel: 'M',
          color: { dark: '#0b0f14', light: '#ffffff' },
        })
      })
      .catch(() => !cancelled && setError(true))
    return () => {
      cancelled = true
    }
  }, [value, size])

  if (error) {
    return <div className="empty small">สร้าง QR ไม่สำเร็จ ใช้รหัสด้านล่างแทนได้</div>
  }

  return (
    <div
      style={{
        background: '#fff',
        padding: 14,
        borderRadius: 20,
        display: 'inline-grid',
        placeItems: 'center',
        lineHeight: 0,
      }}
    >
      <canvas ref={canvas} width={size} height={size} aria-label="คิวอาร์โค้ดรหัสเพื่อนของคุณ" />
    </div>
  )
}
