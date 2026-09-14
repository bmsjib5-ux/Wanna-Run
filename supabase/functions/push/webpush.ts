/**
 * Web Push สำหรับเบราว์เซอร์ (PWA)
 * เข้ารหัสเนื้อหาตาม RFC 8291 (aes128gcm) และยืนยันตัวผู้ส่งตาม RFC 8292 (VAPID)
 * ไม่ต้องพึ่งไลบรารีภายนอก ใช้ WebCrypto ที่ Deno มีให้อยู่แล้ว
 */
import { b64urlDecode, b64urlEncode, concat, enc, hkdf, type Bytes } from './crypto.ts'

export type WebSubscription = { endpoint: string; p256dh: string; auth: string }
export type VapidConfig = { publicKey: string; privateKey: string; subject: string }

/** ห่อเนื้อหาแจ้งเตือนให้เฉพาะเบราว์เซอร์ปลายทางเท่านั้นที่ถอดได้ */
export async function encryptPayload(sub: WebSubscription, payload: string): Promise<Bytes> {
  const uaPublic = b64urlDecode(sub.p256dh) // คีย์สาธารณะของเบราว์เซอร์ 65 ไบต์
  const authSecret = b64urlDecode(sub.auth) // ความลับร่วม 16 ไบต์

  const ephemeral = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', ephemeral.publicKey))
  const uaKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, [])
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, ephemeral.privateKey, 256))

  const ikm = await hkdf(authSecret, shared, concat(enc.encode('WebPush: info\0'), uaPublic, asPublic), 32)
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16)
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12)

  // 0x02 = ปิดท้ายว่าเป็นบล็อกสุดท้าย
  const plaintext = concat(enc.encode(payload), Uint8Array.of(2))
  const aesKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt'])
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, plaintext))

  const recordSize = new Uint8Array(4)
  new DataView(recordSize.buffer).setUint32(0, 4096)
  return concat(salt, recordSize, Uint8Array.of(asPublic.length), asPublic, cipher)
}

/** JWT สั้น ๆ ที่บอกบริการ push ว่าใครเป็นคนส่ง */
export async function vapidAuthorization(endpoint: string, vapid: VapidConfig): Promise<string> {
  const header = b64urlEncode(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
  const claim = b64urlEncode(
    enc.encode(
      JSON.stringify({
        aud: new URL(endpoint).origin,
        exp: Math.floor(Date.now() / 1000) + 12 * 3600,
        sub: vapid.subject,
      }),
    ),
  )
  const unsigned = `${header}.${claim}`
  const publicBytes = b64urlDecode(vapid.publicKey)
  const key = await crypto.subtle.importKey(
    'jwk',
    {
      kty: 'EC',
      crv: 'P-256',
      x: b64urlEncode(publicBytes.slice(1, 33)),
      y: b64urlEncode(publicBytes.slice(33, 65)),
      d: vapid.privateKey,
      ext: true,
    },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(unsigned))
  return `vapid t=${unsigned}.${b64urlEncode(signature)}, k=${vapid.publicKey}`
}

export type PushResult = { ok: boolean; gone: boolean; status: number; detail?: string }

export async function sendWebPush(sub: WebSubscription, payload: string, vapid: VapidConfig): Promise<PushResult> {
  try {
    const body = await encryptPayload(sub, payload)
    const res = await fetch(sub.endpoint, {
      method: 'POST',
      headers: {
        Authorization: await vapidAuthorization(sub.endpoint, vapid),
        'Content-Encoding': 'aes128gcm',
        'Content-Type': 'application/octet-stream',
        TTL: '86400',
        Urgency: 'normal',
      },
      body,
    })
    // 404/410 = เบราว์เซอร์ยกเลิกการสมัครไปแล้ว ให้ลบ token ทิ้ง
    const gone = res.status === 404 || res.status === 410
    return { ok: res.ok, gone, status: res.status, detail: res.ok ? undefined : await res.text().catch(() => undefined) }
  } catch (err) {
    return { ok: false, gone: false, status: 0, detail: err instanceof Error ? err.message : 'ส่งไม่สำเร็จ' }
  }
}
