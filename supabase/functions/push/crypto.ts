/** ตัวช่วยเข้ารหัส/แปลง base64url ใช้ร่วมกันระหว่าง FCM กับ Web Push */

export const enc = new TextEncoder()

/** Deno แยกชนิด Uint8Array ตาม buffer ที่รองรับ — ผูกไว้กับ ArrayBuffer เพื่อส่งเข้า WebCrypto ได้ตรง ๆ */
export type Bytes = Uint8Array<ArrayBuffer>

export function b64urlDecode(value: string): Bytes {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
  const binary = atob(padded)
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i)
  return out
}

export function b64urlEncode(input: ArrayBuffer | Uint8Array): string {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function concat(...parts: Bytes[]): Bytes {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let at = 0
  for (const part of parts) {
    out.set(part, at)
    at += part.length
  }
  return out
}

async function hmac(key: Bytes, data: Bytes): Promise<Bytes> {
  const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, data))
}

/** HKDF แบบรอบเดียว — พอสำหรับคีย์ยาวไม่เกิน 32 ไบต์ ซึ่งครอบคลุมทุกค่าที่ web push ใช้ */
export async function hkdf(salt: Bytes, ikm: Bytes, info: Bytes, length: number): Promise<Bytes> {
  const prk = await hmac(salt, ikm)
  const okm = await hmac(prk, concat(info, Uint8Array.of(1)))
  return okm.slice(0, length)
}
