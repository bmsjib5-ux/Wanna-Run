#!/usr/bin/env node
/**
 * สร้างคู่กุญแจ VAPID สำหรับ Web Push (ใช้ครั้งเดียว เก็บไว้ใช้ตลอด)
 *   node scripts/gen-vapid.mjs
 */
import { webcrypto as crypto } from 'node:crypto'

const b64url = (buf) => Buffer.from(buf).toString('base64url')

const pair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])
const publicKey = b64url(await crypto.subtle.exportKey('raw', pair.publicKey))
const jwk = await crypto.subtle.exportKey('jwk', pair.privateKey)

console.log('')
console.log('VAPID_PUBLIC_KEY  =', publicKey)
console.log('VAPID_PRIVATE_KEY =', jwk.d)
console.log('')
console.log('ใส่ทั้งสองค่าเป็น secret ของ Edge Function:')
console.log(`  supabase secrets set VAPID_PUBLIC_KEY=${publicKey} VAPID_PRIVATE_KEY=${jwk.d} VAPID_SUBJECT=mailto:you@example.com`)
console.log('')
console.log('และใส่ค่าสาธารณะไว้ในไฟล์ .env ของเว็บ (ค่านี้เปิดเผยได้):')
console.log(`  VITE_VAPID_PUBLIC_KEY=${publicKey}`)
console.log('')
