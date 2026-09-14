/**
 * Firebase Cloud Messaging (HTTP v1) — ช่องทางแจ้งเตือนของแอป Android
 * ใช้ service account ของโปรเจกต์ Firebase แลก access token เอง ไม่ต้องพึ่ง SDK
 */
import { b64urlEncode, enc, type Bytes } from './crypto.ts'
import type { PushResult } from './webpush.ts'

export type FcmConfig = { projectId: string; clientEmail: string; privateKey: string }
export type PushPayload = { title: string; body: string; goto?: string; tag?: string }

let cachedToken: { value: string; expiresAt: number } | null = null

function pemToDer(pem: string): Bytes {
  // ค่าที่วางมาจาก JSON มักมี \n เป็นตัวอักษรจริง ต้องแปลงกลับก่อน
  const base64 = pem.replace(/\\n/g, '\n').replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')
  const binary = atob(base64)
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i)
  return out
}

async function accessToken(cfg: FcmConfig): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  if (cachedToken && cachedToken.expiresAt > now + 60) return cachedToken.value

  const header = b64urlEncode(enc.encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })))
  const claim = b64urlEncode(
    enc.encode(
      JSON.stringify({
        iss: cfg.clientEmail,
        scope: 'https://www.googleapis.com/auth/firebase.messaging',
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
      }),
    ),
  )
  const unsigned = `${header}.${claim}`
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToDer(cfg.privateKey),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, enc.encode(unsigned))

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsigned}.${b64urlEncode(signature)}`,
    }),
  })
  const json = (await res.json()) as { access_token?: string; expires_in?: number; error_description?: string }
  if (!res.ok || !json.access_token) {
    throw new Error(json.error_description ?? `ขอ access token จาก Google ไม่สำเร็จ (${res.status})`)
  }
  cachedToken = { value: json.access_token, expiresAt: now + (json.expires_in ?? 3600) }
  return cachedToken.value
}

export async function sendFcm(cfg: FcmConfig, token: string, payload: PushPayload): Promise<PushResult> {
  try {
    const res = await fetch(`https://fcm.googleapis.com/v1/projects/${cfg.projectId}/messages:send`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${await accessToken(cfg)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          token,
          notification: { title: payload.title, body: payload.body },
          data: { goto: payload.goto ?? '', tag: payload.tag ?? '' },
          android: {
            priority: 'HIGH',
            notification: {
              channel_id: 'wanna-run',
              sound: 'default',
              // รวมแจ้งเตือนเรื่องเดียวกันเป็นอันเดียว ไม่ให้ท่วมแถบสถานะ
              tag: payload.tag || undefined,
              click_action: 'FCM_PLUGIN_ACTIVITY',
            },
          },
        },
      }),
    })
    if (res.ok) return { ok: true, gone: false, status: res.status }
    const detail = await res.text().catch(() => '')
    // token ถูกถอนแล้ว (ถอนแอป/ล้างข้อมูล) — ลบทิ้งจะได้ไม่ส่งซ้ำอีก
    const gone = res.status === 404 || detail.includes('UNREGISTERED') || detail.includes('INVALID_ARGUMENT')
    return { ok: false, gone, status: res.status, detail }
  } catch (err) {
    return { ok: false, gone: false, status: 0, detail: err instanceof Error ? err.message : 'ส่งไม่สำเร็จ' }
  }
}
