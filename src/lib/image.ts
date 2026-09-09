/**
 * ย่อรูปที่ผู้ใช้เลือกให้เป็นสี่เหลี่ยมจัตุรัสก่อนอัปโหลด
 * รูปจากกล้องมือถือมักใหญ่หลายเมกะไบต์ ถ้าอัปดิบ ๆ จะเปลืองเน็ตและโหลดช้ามาก
 */
export async function squareThumbnail(file: File, size = 256, quality = 0.85): Promise<Blob> {
  const bitmap = await loadBitmap(file)
  const side = Math.min(bitmap.width, bitmap.height)
  const sx = (bitmap.width - side) / 2
  const sy = (bitmap.height - side) / 2

  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('เบราว์เซอร์นี้ประมวลผลรูปไม่ได้')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size)
  if ('close' in bitmap) bitmap.close()

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('ย่อรูปไม่สำเร็จ'))),
      'image/jpeg',
      quality,
    )
  })
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    try {
      // imageOrientation ช่วยหมุนรูปจากกล้องให้ตั้งตรงตาม EXIF
      return await createImageBitmap(file, { imageOrientation: 'from-image' })
    } catch {
      /* บางเบราว์เซอร์ไม่รองรับตัวเลือกนี้ ตกไปใช้ <img> */
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

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('อ่านไฟล์รูปไม่สำเร็จ'))
    reader.readAsDataURL(blob)
  })
}
