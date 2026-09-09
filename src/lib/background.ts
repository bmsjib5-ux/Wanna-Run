import { useCallback, useEffect, useState } from 'react'
import { blobToDataUrl } from './image'

/** รูปพื้นหลังจากเครื่องผู้ใช้ เก็บเป็น data URL ในเครื่อง (ไม่อัปขึ้นเซิร์ฟเวอร์) */
export const BG_KEY = 'wanna-run.bg'

export type Dim = 'light' | 'medium' | 'strong'
export type Background = { image: string; dim: Dim }

export const DIMS: Array<{ key: Dim; label: string }> = [
  { key: 'light', label: 'ชัด' },
  { key: 'medium', label: 'กลาง' },
  { key: 'strong', label: 'จาง' },
]

export function loadBackground(): Background | null {
  try {
    const raw = localStorage.getItem(BG_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<Background>
    if (typeof parsed.image !== 'string' || !parsed.image.startsWith('data:image/')) return null
    return { image: parsed.image, dim: DIMS.some((d) => d.key === parsed.dim) ? (parsed.dim as Dim) : 'medium' }
  } catch {
    return null
  }
}

export function applyBackground(bg: Background | null): void {
  const root = document.documentElement
  if (!bg) {
    delete root.dataset.bg
    root.style.removeProperty('--bg-image')
    return
  }
  root.dataset.bg = bg.dim
  root.style.setProperty('--bg-image', `url("${bg.image}")`)
}

/**
 * ย่อรูปให้พอดีจอมือถือ (ด้านยาวไม่เกิน 1280px) แล้วบีบเป็น JPEG
 * รูปจากกล้องดิบ ๆ หลายเมกะไบต์ใส่ localStorage ไม่ได้ และทำให้แอปเปิดช้า
 */
export async function prepareBackground(file: File, maxSide = 1280, quality = 0.82): Promise<string> {
  const bitmap = await loadBitmap(file)
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('เบราว์เซอร์นี้ประมวลผลรูปไม่ได้')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  if ('close' in bitmap) bitmap.close()
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('ย่อรูปไม่สำเร็จ'))), 'image/jpeg', quality),
  )
  return blobToDataUrl(blob)
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' })
    } catch {
      /* ตกไปใช้ <img> */
    }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    return img
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }
}

export function useBackground(): {
  background: Background | null
  setImage: (file: File) => Promise<void>
  setDim: (dim: Dim) => void
  clear: () => void
} {
  const [background, setBackground] = useState<Background | null>(loadBackground)

  useEffect(() => {
    applyBackground(background)
    try {
      if (background) localStorage.setItem(BG_KEY, JSON.stringify(background))
      else localStorage.removeItem(BG_KEY)
    } catch {
      /* localStorage เต็ม/ปิดอยู่ ก็ใช้ได้เฉพาะครั้งนี้ */
    }
  }, [background])

  const setImage = useCallback(async (file: File) => {
    const image = await prepareBackground(file)
    setBackground((prev) => ({ image, dim: prev?.dim ?? 'medium' }))
  }, [])
  const setDim = useCallback((dim: Dim) => setBackground((prev) => (prev ? { ...prev, dim } : prev)), [])
  const clear = useCallback(() => setBackground(null), [])

  return { background, setImage, setDim, clear }
}
