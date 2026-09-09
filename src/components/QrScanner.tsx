import { useCallback, useEffect, useRef, useState } from 'react'
import { parseFriendCode } from '../lib/friendLink'
import { vibrate } from '../lib/notify'

type DetectedBarcode = { rawValue: string }
type BarcodeDetectorLike = { detect: (source: CanvasImageSource) => Promise<DetectedBarcode[]> }
type BarcodeDetectorCtor = new (options?: { formats?: string[] }) => BarcodeDetectorLike

/** ใช้ตัวถอดรหัสของเบราว์เซอร์ถ้ามี (เร็วกว่า) ไม่มีค่อยถอดเองด้วย jsQR */
function nativeDetector(): BarcodeDetectorLike | null {
  const ctor = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector
  if (!ctor) return null
  try {
    return new ctor({ formats: ['qr_code'] })
  } catch {
    return null
  }
}

type Props = {
  /** เรียกเมื่อสแกนเจอรหัสเพื่อนที่ถูกต้อง */
  onFound: (code: string) => void
  onCancel: () => void
}

export default function QrScanner({ onFound, onCancel }: Props) {
  const video = useRef<HTMLVideoElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const frame = useRef<number>(0)
  const done = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  const stop = useCallback(() => {
    cancelAnimationFrame(frame.current)
    stream.current?.getTracks().forEach((t) => t.stop())
    stream.current = null
  }, [])

  useEffect(() => {
    let cancelled = false
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    const detector = nativeDetector()
    // เบราว์เซอร์ที่ไม่มี BarcodeDetector (เช่น Safari) ค่อยดึงตัวถอดสำรองมาใช้
    let decode: typeof import('jsqr').default | null = null
    const decoderReady = detector
      ? Promise.resolve()
      : import('jsqr').then(({ default: fn }) => {
          decode = fn
        })

    const scan = async () => {
      const el = video.current
      if (cancelled || done.current || !el || !ctx || el.readyState < 2) {
        frame.current = requestAnimationFrame(() => void scan())
        return
      }
      canvas.width = el.videoWidth
      canvas.height = el.videoHeight
      ctx.drawImage(el, 0, 0, canvas.width, canvas.height)

      let text: string | null = null
      if (detector) {
        try {
          const found = await detector.detect(canvas)
          text = found[0]?.rawValue ?? null
        } catch {
          /* บางรุ่นถอดไม่ได้ ตกไปใช้ jsQR ด้านล่าง */
        }
      }
      if (!text && decode) {
        const image = ctx.getImageData(0, 0, canvas.width, canvas.height)
        text = decode(image.data, image.width, image.height, { inversionAttempts: 'dontInvert' })?.data ?? null
      }

      const code = text ? parseFriendCode(text) : null
      if (code) {
        done.current = true
        vibrate([40, 30, 40])
        stop()
        onFound(code)
        return
      }
      frame.current = requestAnimationFrame(() => void scan())
    }

    const start = async () => {
      if (!window.isSecureContext) {
        setError('กล้องใช้ได้เฉพาะบนเว็บที่เป็น https เท่านั้น')
        return
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('อุปกรณ์นี้ไม่รองรับการเปิดกล้องผ่านเบราว์เซอร์')
        return
      }
      try {
        const media = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        })
        if (cancelled) {
          media.getTracks().forEach((t) => t.stop())
          return
        }
        stream.current = media
        if (video.current) {
          video.current.srcObject = media
          await video.current.play().catch(() => undefined)
        }
        await decoderReady
        if (cancelled) return
        setReady(true)
        void scan()
      } catch (err) {
        const name = (err as DOMException).name
        if (name === 'NotAllowedError') setError('ไม่ได้รับอนุญาตให้ใช้กล้อง เปิดสิทธิ์ในตั้งค่าเบราว์เซอร์ได้')
        else if (name === 'NotFoundError') setError('ไม่พบกล้องบนอุปกรณ์นี้')
        else setError('เปิดกล้องไม่สำเร็จ ลองอีกครั้ง')
      }
    }

    void start()
    return () => {
      cancelled = true
      stop()
    }
  }, [onFound, stop])

  if (error) {
    return (
      <>
        <div className="card empty">
          <div className="big">📷</div>
          {error}
        </div>
        <button className="btn block" style={{ marginTop: 14 }} onClick={onCancel}>
          กรอกรหัสเองแทน
        </button>
      </>
    )
  }

  return (
    <>
      <div className="scanner">
        <video ref={video} playsInline muted autoPlay />
        <div className="scanner-frame" />
        {!ready && <div className="scanner-hint">กำลังเปิดกล้อง...</div>}
      </div>
      <div className="muted small center" style={{ marginTop: 12, lineHeight: 1.6 }}>
        เล็ง QR ของเพื่อนให้อยู่ในกรอบ ระบบจะเพิ่มให้อัตโนมัติ
      </div>
      <button className="btn block" style={{ marginTop: 14 }} onClick={onCancel}>
        ยกเลิก
      </button>
    </>
  )
}
