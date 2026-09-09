import type { AppState, Mission, Place } from '../types'
import { friendCode, uid } from './id'
import { emptyCounters } from './counters'

export const PLACES: Place[] = [
  { id: 'lumpini', name: 'สวนลุมพินี', area: 'ปทุมวัน กรุงเทพฯ', lat: 13.7305, lng: 100.5418, loopKm: 2.5, tags: ['สวนสาธารณะ', 'ลู่วิ่ง', 'ร่มรื่น'] },
  { id: 'benjakitti', name: 'สวนเบญจกิติ', area: 'คลองเตย กรุงเทพฯ', lat: 13.7255, lng: 100.5605, loopKm: 3.2, tags: ['สกายวอล์ก', 'ทะเลสาบ'] },
  { id: 'rotfai', name: 'สวนวชิรเบญจทัศ (สวนรถไฟ)', area: 'จตุจักร กรุงเทพฯ', lat: 13.8129, lng: 100.5484, loopKm: 3.6, tags: ['จักรยาน', 'ต้นไม้เยอะ'] },
  { id: 'chatuchak', name: 'สวนจตุจักร', area: 'จตุจักร กรุงเทพฯ', lat: 13.8036, lng: 100.5533, loopKm: 2.0, tags: ['ใกล้ BTS'] },
  { id: 'benjasiri', name: 'สวนเบญจสิริ', area: 'คลองเตย กรุงเทพฯ', lat: 13.7300, lng: 100.5700, loopKm: 1.0, tags: ['เล็กกะทัดรัด'] },
  { id: 'kingrama9', name: 'อุทยานเฉลิมพระเกียรติ ร.9', area: 'ประเวศ กรุงเทพฯ', lat: 13.6996, lng: 100.6607, loopKm: 4.0, tags: ['กว้าง', 'ทะเลสาบ'] },
  { id: 'thammasat', name: 'ธรรมศาสตร์ รังสิต', area: 'ปทุมธานี', lat: 14.0700, lng: 100.6070, loopKm: 5.0, tags: ['สนามกีฬา'] },
  { id: 'huaykwang', name: 'สวนสาธารณะห้วยขวาง', area: 'ห้วยขวาง กรุงเทพฯ', lat: 13.7735, lng: 100.5745, loopKm: 1.2, tags: ['ในเมือง'] },
  { id: 'nongprajak', name: 'สวนหนองประจักษ์', area: 'อุดรธานี', lat: 17.4076, lng: 102.7877, loopKm: 2.4, tags: ['ริมน้ำ'] },
  { id: 'suanluangr9cm', name: 'คันคลองชลประทาน', area: 'เชียงใหม่', lat: 18.8010, lng: 98.9530, loopKm: 6.0, tags: ['ทางยาว', 'ลมเย็น'] },
]

export function seedMissions(): Mission[] {
  return [
    { id: 'm_daily_run', title: 'ออกวิ่งวันนี้', detail: 'จบ 1 กิจกรรมวิ่ง', metric: 'runCount', target: 1, progress: 0, xp: 40, coins: 10, period: 'daily', claimed: false },
    { id: 'm_daily_3k', title: 'สะสม 3 กิโลเมตร', detail: 'ระยะรวมวันนี้ 3 กม.', metric: 'distanceKm', target: 3, progress: 0, xp: 60, coins: 15, period: 'daily', claimed: false },
    { id: 'm_daily_game', title: 'เล่นมินิเกม 1 รอบ', detail: 'อุ่นเครื่องด้วยมินิเกม', metric: 'gamePlayed', target: 1, progress: 0, xp: 25, coins: 8, period: 'daily', claimed: false },
    { id: 'm_daily_share', title: 'แชร์ตำแหน่งให้เพื่อน', detail: 'เปิดแชร์ location 1 ครั้ง', metric: 'locationShared', target: 1, progress: 0, xp: 30, coins: 10, period: 'daily', claimed: false },
    { id: 'm_week_invite', title: 'ชวนเพื่อนวิ่ง 3 ครั้ง', detail: 'สร้างคำชวนวิ่งในสัปดาห์นี้', metric: 'inviteSent', target: 3, progress: 0, xp: 120, coins: 40, period: 'weekly', claimed: false },
    { id: 'm_week_20k', title: 'ระยะรวม 20 กม./สัปดาห์', detail: 'สะสมระยะทั้งสัปดาห์', metric: 'distanceKm', target: 20, progress: 0, xp: 200, coins: 70, period: 'weekly', claimed: false },
    { id: 'm_week_score', title: 'ทำคะแนนมินิเกม 300', detail: 'คะแนนสะสมจากมินิเกม', metric: 'gameScore', target: 300, progress: 0, xp: 90, coins: 30, period: 'weekly', claimed: false },
    { id: 'm_season_friends', title: 'สร้างก๊วน 5 คน', detail: 'เพิ่มเพื่อนให้ครบ 5 คน', metric: 'friendAdded', target: 5, progress: 0, xp: 150, coins: 50, period: 'season', claimed: false },
    { id: 'm_season_group', title: 'ตั้งกลุ่มวิ่งของตัวเอง', detail: 'สร้างกลุ่ม 1 กลุ่ม', metric: 'groupCreated', target: 1, progress: 0, xp: 80, coins: 25, period: 'season', claimed: false },
    { id: 'm_season_100k', title: 'นักวิ่ง 100 กิโล', detail: 'ระยะสะสมตลอดกาล', metric: 'distanceKm', target: 100, progress: 0, xp: 500, coins: 200, period: 'season', claimed: false },
  ]
}

export function initialState(): AppState {
  return {
    version: 1,
    onboarded: false,
    profile: {
      id: uid('me_'),
      name: '',
      emoji: '🏃',
      code: friendCode(),
      level: 1,
      xp: 0,
      coins: 30,
      weeklyGoalKm: 20,
      sharingLocation: false,
      createdAt: Date.now(),
    },
    friends: [],
    groups: [],
    invites: [],
    runs: [],
    missions: seedMissions(),
    counters: emptyCounters(),
    notifications: [
      {
        id: uid('nt_'),
        kind: 'friend',
        title: 'ยินดีต้อนรับสู่ Wanna Run?',
        body: 'เริ่มจากชวนเพื่อนเข้าก๊วน แล้วนัดวิ่งด้วยกันได้เลย',
        at: Date.now(),
        read: false,
        goto: 'friends',
      },
    ],
    highScores: { tapsprint: 0, spin: 0, quiz: 0 },
    lastSpinAt: 0,
    places: PLACES,
  }
}
