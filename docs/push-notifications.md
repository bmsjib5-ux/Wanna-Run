# แจ้งเตือนตอนปิดแอป (Push Notifications)

แจ้งเตือนของแอปเดิมทำงานได้เฉพาะตอนเปิดแอปอยู่ เพราะเป็นการฟังจากฝั่งแอปเอง
เอกสารนี้คือระบบใหม่ที่ให้ **เซิร์ฟเวอร์เป็นฝ่ายยิงมาหา** จึงเตือนได้แม้ปัดแอปทิ้งไปแล้ว

เตือนเมื่อ:

| เหตุการณ์ | ใครได้รับ |
|---|---|
| เพื่อนชวนไปวิ่ง | ทุกคนที่ถูกชวน |
| เพื่อนตอบคำชวน (ไป / อาจจะ / ไม่ไป) | เจ้าภาพ |
| มีคนส่งคำขอเป็นเพื่อน | คนที่ถูกขอ |
| มีคนตอบรับคำขอเป็นเพื่อน | คนที่ส่งคำขอ |

## ภาพรวม

```
แอปของคนที่ทำให้เกิดเหตุ ──► Edge Function "push" ──┬─► FCM  ──► แอป Android
   (ส่งพร้อม JWT ของตัวเอง)      ตรวจว่าเป็นเพื่อนกัน  └─► Web Push ──► เบราว์เซอร์ / PWA
```

- อุปกรณ์ที่อนุญาตแล้วจะถูกเก็บไว้ในตาราง `push_tokens`
- Edge Function ตรวจสิทธิ์ก่อนเสมอ — ส่งได้เฉพาะถึงคนที่อยู่ในตาราง `friendships` ร่วมกับผู้ส่ง
- ตั้งค่าช่องทางไหน ก็ใช้ช่องทางนั้น ใส่ไม่ครบก็ไม่พัง แค่ข้ามช่องที่ยังไม่ได้ตั้ง

---

## 1. สร้างตารางในฐานข้อมูล

Supabase Dashboard → SQL Editor → วางไฟล์ [`supabase/push.sql`](../supabase/push.sql) แล้วกด Run

## 2. ตั้งค่า Android (Firebase Cloud Messaging) — ฟรี

1. เปิด <https://console.firebase.google.com> → **Add project** → ตั้งชื่ออะไรก็ได้ (ปิด Google Analytics ได้)
2. ในโปรเจกต์ กด **Add app → Android**
   - Android package name: `com.wannarun.app` (ดูค่าจริงได้ใน `android/app/build.gradle` ที่บรรทัด `applicationId`)
   - ดาวน์โหลด **`google-services.json`**
3. เอาไฟล์นั้นไปไว้ 2 ที่
   - เครื่องตัวเอง: วางที่ `android/app/google-services.json` (ไฟล์นี้อยู่ใน `.gitignore` แล้ว ไม่ถูก commit)
   - GitHub: Settings → Secrets and variables → Actions → **New repository secret**
     ชื่อ `GOOGLE_SERVICES_JSON` เนื้อหาคือ **ทั้งไฟล์** แบบก๊อปวาง
4. เอาคีย์ของ service account มาให้ Edge Function ใช้ส่ง
   - Firebase Console → ⚙️ Project settings → **Service accounts** → **Generate new private key**
   - เปิดไฟล์ JSON ที่ได้ แล้วหยิบ 3 ค่า: `project_id`, `client_email`, `private_key`

```bash
supabase secrets set \
  FCM_PROJECT_ID='ค่าจาก project_id' \
  FCM_CLIENT_EMAIL='ค่าจาก client_email' \
  FCM_PRIVATE_KEY='-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n'
```

> ใส่ `private_key` ทั้งก้อนแบบที่ก๊อปมาจาก JSON ได้เลย (มี `\n` ปนอยู่ก็ไม่เป็นไร ฟังก์ชันแปลงให้เอง)
> ต้องครอบด้วย single quote เพื่อไม่ให้ shell ตีความ

## 3. ตั้งค่าเว็บ / PWA (Web Push) — ข้ามได้ถ้าใช้แค่ APK

```bash
node scripts/gen-vapid.mjs
```

จะได้คีย์สองตัว เอาไปใส่ตามนี้

```bash
supabase secrets set \
  VAPID_PUBLIC_KEY='ค่าที่ได้' \
  VAPID_PRIVATE_KEY='ค่าที่ได้' \
  VAPID_SUBJECT='mailto:อีเมลของคุณ'
```

แล้วใส่คีย์สาธารณะไว้ในไฟล์ `.env` ของเว็บด้วย (และตั้งเป็น secret ชื่อ `VITE_VAPID_PUBLIC_KEY` บน GitHub กับบน Render)

```
VITE_VAPID_PUBLIC_KEY=ค่าเดียวกับ VAPID_PUBLIC_KEY
```

## 4. ติดตั้ง Edge Function

```bash
npx supabase login
npx supabase link --project-ref <project-ref ของคุณ>
npx supabase functions deploy push
```

## 5. เปิดใช้งานในแอป

เปิดแอป → **ตั้งค่า** (⚙️ ข้างกระดิ่ง) → **การแจ้งเตือน** → กด **เปิด** แล้วอนุญาตสิทธิ์
เมื่อขึ้นว่า *"เตือนได้แม้ปิดแอป"* แปลว่าเรียบร้อย

---

## ทดสอบ

1. ใช้สองบัญชี เป็นเพื่อนกันแล้ว และเปิดการแจ้งเตือนทั้งคู่
2. **ปัดแอปของบัญชี B ทิ้ง** ให้ไม่เหลือในรายการแอปที่เปิดอยู่
3. บัญชี A สร้างคำชวนไปวิ่ง แล้วเลือก B เป็นผู้ถูกชวน
4. แจ้งเตือนต้องเด้งที่เครื่องของ B ภายในไม่กี่วินาที แตะแล้วเปิดเข้าหน้า "นัดวิ่ง"

ถ้าไม่เด้ง ให้ดู log ของฟังก์ชัน: Supabase Dashboard → Edge Functions → `push` → Logs

## เรื่องที่ควรรู้

- **ไม่มีค่าใช้จ่าย** — FCM ฟรีไม่จำกัดจำนวน ส่วน Web Push เป็นมาตรฐานของเบราว์เซอร์
- **iPhone** ใช้ได้เฉพาะเมื่อ "เพิ่มไปหน้าโฮม" แล้ว และเป็น iOS 16.4 ขึ้นไป
- **โหมดประหยัดแบตแบบเข้มของบางยี่ห้อ** (Xiaomi, Huawei, OPPO) อาจหน่วงแจ้งเตือน
  ให้ตั้ง "ไม่จำกัดการใช้แบตเตอรี่" ให้แอปในการตั้งค่าของเครื่อง
- token ของอุปกรณ์ที่ถอนแอปไปแล้วจะถูกลบออกจากตารางให้เองเมื่อส่งไม่สำเร็จ
- แจ้งเตือนที่เด้งตอนแอปเปิดอยู่ยังใช้ระบบเดิม (realtime) จึงไม่ซ้ำกัน
