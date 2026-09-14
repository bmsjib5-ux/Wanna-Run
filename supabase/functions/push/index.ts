/**
 * Edge Function "push" — ส่งแจ้งเตือนถึงเพื่อน แม้ปลายทางจะปิดแอปอยู่
 *
 * เรียกจากแอปของ "คนที่ทำให้เกิดเหตุ" (คนชวน / คนตอบรับ) พร้อม JWT ของตัวเอง
 * ฟังก์ชันจะตรวจว่าเป็นเพื่อนกันจริงก่อน แล้วค่อยส่งไปยังทุกอุปกรณ์ของปลายทาง
 *
 * ตั้งค่าลับที่ต้องมี (supabase secrets set ...):
 *   FCM_PROJECT_ID, FCM_CLIENT_EMAIL, FCM_PRIVATE_KEY   — สำหรับแอป Android
 *   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT  — สำหรับ PWA บนเบราว์เซอร์
 * ใส่แค่ชุดใดชุดหนึ่งก็ทำงานได้ ช่องทางที่ไม่ได้ตั้งค่าจะถูกข้ามไปเฉย ๆ
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0'
import { sendFcm, type FcmConfig, type PushPayload } from './fcm.ts'
import { sendWebPush, type VapidConfig } from './webpush.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const MAX_RECIPIENTS = 30
const TITLE_MAX = 120
const BODY_MAX = 300

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

function env(name: string): string | undefined {
  const value = Deno.env.get(name)
  return value && value.trim() ? value : undefined
}

function fcmConfig(): FcmConfig | null {
  const projectId = env('FCM_PROJECT_ID')
  const clientEmail = env('FCM_CLIENT_EMAIL')
  const privateKey = env('FCM_PRIVATE_KEY')
  return projectId && clientEmail && privateKey ? { projectId, clientEmail, privateKey } : null
}

function vapidConfig(): VapidConfig | null {
  const publicKey = env('VAPID_PUBLIC_KEY')
  const privateKey = env('VAPID_PRIVATE_KEY')
  return publicKey && privateKey ? { publicKey, privateKey, subject: env('VAPID_SUBJECT') ?? 'mailto:push@wanna-run.app' } : null
}

function clean(value: unknown, max: number): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : ''
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'ต้องเรียกด้วย POST' }, 405)

  const supabaseUrl = env('SUPABASE_URL')
  const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY')
  const anonKey = env('SUPABASE_ANON_KEY')
  if (!supabaseUrl || !serviceKey || !anonKey) return json({ error: 'ยังตั้งค่าเซิร์ฟเวอร์ไม่ครบ' }, 500)

  // ผู้เรียกต้องเป็นผู้ใช้ที่ล็อกอินอยู่จริง
  const authHeader = req.headers.get('Authorization') ?? ''
  const caller = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } })
  const { data: userData } = await caller.auth.getUser()
  const sender = userData?.user?.id
  if (!sender) return json({ error: 'ต้องเข้าสู่ระบบก่อน' }, 401)

  let input: { to?: unknown; title?: unknown; body?: unknown; goto?: unknown; tag?: unknown }
  try {
    input = await req.json()
  } catch {
    return json({ error: 'รูปแบบข้อมูลไม่ถูกต้อง' }, 400)
  }

  const requested = (Array.isArray(input.to) ? input.to : [input.to])
    .filter((id): id is string => typeof id === 'string' && id.length > 0)
    .slice(0, MAX_RECIPIENTS)
  const payload: PushPayload = {
    title: clean(input.title, TITLE_MAX),
    body: clean(input.body, BODY_MAX),
    goto: clean(input.goto, 40) || undefined,
    tag: clean(input.tag, 60) || undefined,
  }
  if (!requested.length || !payload.title) return json({ error: 'ต้องระบุผู้รับและหัวข้อ' }, 400)

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  // ส่งได้เฉพาะหาคนที่มีความสัมพันธ์กันจริงในตาราง friendships (หรืออุปกรณ์อื่นของตัวเอง)
  const others = requested.filter((id) => id !== sender)
  const allowed = new Set<string>(requested.includes(sender) ? [sender] : [])
  if (others.length) {
    const list = others.map((id) => `"${id}"`).join(',')
    const { data: links, error } = await admin
      .from('friendships')
      .select('requester,addressee')
      // pending ด้วย เพราะ "มีคำขอเป็นเพื่อน" ต้องเด้งถึงปลายทางก่อนที่เขาจะกดรับ
      .in('status', ['pending', 'accepted'])
      .or(`and(requester.eq.${sender},addressee.in.(${list})),and(addressee.eq.${sender},requester.in.(${list}))`)
    if (error) return json({ error: 'ตรวจสอบรายชื่อเพื่อนไม่สำเร็จ' }, 500)
    for (const link of links ?? []) allowed.add(link.requester === sender ? link.addressee : link.requester)
  }
  if (!allowed.size) return json({ sent: 0, skipped: requested.length, reason: 'ไม่ได้เป็นเพื่อนกัน' })

  const { data: devices, error: deviceError } = await admin
    .from('push_tokens')
    .select('token,platform,p256dh,auth')
    .in('user_id', [...allowed])
  if (deviceError) return json({ error: 'อ่านรายชื่ออุปกรณ์ไม่สำเร็จ' }, 500)

  const fcm = fcmConfig()
  const vapid = vapidConfig()
  const webBody = JSON.stringify(payload)
  const dead: string[] = []
  let sent = 0

  await Promise.all(
    (devices ?? []).map(async (device) => {
      const result =
        device.platform === 'web'
          ? vapid && device.p256dh && device.auth
            ? await sendWebPush({ endpoint: device.token, p256dh: device.p256dh, auth: device.auth }, webBody, vapid)
            : null
          : fcm
            ? await sendFcm(fcm, device.token, payload)
            : null
      if (!result) return
      if (result.ok) sent += 1
      else if (result.gone) dead.push(device.token)
      else console.error('ส่งแจ้งเตือนไม่สำเร็จ', device.platform, result.status, result.detail)
    }),
  )

  // อุปกรณ์ที่ถอนแอปหรือยกเลิกสิทธิ์ไปแล้ว ไม่ต้องเก็บไว้ให้รก
  if (dead.length) await admin.from('push_tokens').delete().in('token', dead)

  return json({ sent, devices: devices?.length ?? 0, removed: dead.length })
})
