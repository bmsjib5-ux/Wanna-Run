import type { AppState, Mission, Place } from '../types'
import { friendCode, uid } from './id'
import { emptyCounters } from './counters'

/**
 * สวน/ลู่วิ่งยอดนิยมทั่วประเทศ ใช้เป็นตัวเลือกเริ่มต้นตอนนัดวิ่งและค้นหาบนแผนที่
 * พิกัดมาจาก OpenStreetMap (ค้นด้วย Nominatim) ไม่ได้กะเอาเอง
 * รายการนี้เรียงตามระยะห่างจากผู้ใช้ตอนแสดงผล จึงใส่ได้ทุกภาคโดยไม่รก
 */
export const PLACES: Place[] = [
  // ---------- กรุงเทพฯ และปริมณฑล ----------
  { id: 'lumpini', name: 'สวนลุมพินี', area: 'ปทุมวัน กรุงเทพฯ', lat: 13.7305, lng: 100.5418, loopKm: 2.5, tags: ['สวนสาธารณะ', 'ลู่วิ่ง', 'ร่มรื่น'] },
  { id: 'benjakitti', name: 'สวนเบญจกิติ', area: 'คลองเตย กรุงเทพฯ', lat: 13.7255, lng: 100.5605, loopKm: 3.2, tags: ['สกายวอล์ก', 'ทะเลสาบ'] },
  { id: 'rotfai', name: 'สวนวชิรเบญจทัศ (สวนรถไฟ)', area: 'จตุจักร กรุงเทพฯ', lat: 13.8129, lng: 100.5484, loopKm: 3.6, tags: ['จักรยาน', 'ต้นไม้เยอะ'] },
  { id: 'chatuchak', name: 'สวนจตุจักร', area: 'จตุจักร กรุงเทพฯ', lat: 13.8036, lng: 100.5533, loopKm: 2.0, tags: ['ใกล้ BTS'] },
  { id: 'benjasiri', name: 'สวนเบญจสิริ', area: 'คลองเตย กรุงเทพฯ', lat: 13.7300, lng: 100.5700, loopKm: 1.0, tags: ['เล็กกะทัดรัด'] },
  { id: 'kingrama9', name: 'อุทยานเฉลิมพระเกียรติ ร.9', area: 'ประเวศ กรุงเทพฯ', lat: 13.6996, lng: 100.6607, loopKm: 4.0, tags: ['กว้าง', 'ทะเลสาบ'] },
  { id: 'huaykwang', name: 'สวนสาธารณะห้วยขวาง', area: 'ห้วยขวาง กรุงเทพฯ', lat: 13.7735, lng: 100.5745, loopKm: 1.2, tags: ['ในเมือง'] },
  { id: 'thammasat', name: 'ธรรมศาสตร์ รังสิต', area: 'ปทุมธานี', lat: 14.0700, lng: 100.6070, loopKm: 5.0, tags: ['สนามกีฬา'] },
  { id: 'phutthamonthon', name: 'พุทธมณฑล', area: 'ศาลายา นครปฐม', lat: 13.77913, lng: 100.31861, tags: ['กว้างมาก', 'ร่มรื่น'] },

  // ---------- ภาคใต้ ----------
  { id: 'hatyai-park', name: 'สวนสาธารณะเทศบาลนครหาดใหญ่', area: 'หาดใหญ่ สงขลา', lat: 7.04241, lng: 100.51195, tags: ['ภูเขา', 'ทะเลสาบ'] },
  { id: 'jiranakorn', name: 'สนามกีฬาจิระนคร', area: 'หาดใหญ่ สงขลา', lat: 7.02024, lng: 100.47184, loopKm: 0.4, tags: ['ลู่ยาง', 'ในเมือง'] },
  { id: 'saphanhin', name: 'สวนสาธารณะสะพานหิน', area: 'เมือง ภูเก็ต', lat: 7.86978, lng: 98.3945, tags: ['ริมทะเล', 'ลมเย็น'] },
  { id: 'kohlamphu', name: 'สวนสาธารณะเกาะลำพู', area: 'เมือง สุราษฎร์ธานี', lat: 9.13751, lng: 99.31559, tags: ['ริมแม่น้ำ'] },

  // ---------- ภาคเหนือ ----------
  { id: 'thapaegate', name: 'ประตูท่าแพ (รอบคูเมือง)', area: 'เมือง เชียงใหม่', lat: 18.78745, lng: 98.99345, loopKm: 6.4, tags: ['รอบคูเมือง', 'ทางยาว'] },
  { id: 'cm700y', name: 'สนามกีฬาสมโภชเชียงใหม่ 700 ปี', area: 'แม่ริม เชียงใหม่', lat: 18.84089, lng: 98.96044, loopKm: 0.4, tags: ['ลู่ยาง', 'สนามกีฬา'] },
  { id: 'chiangrai-stadium', name: 'สนามกีฬากลางจังหวัดเชียงราย', area: 'เมือง เชียงราย', lat: 19.91397, lng: 99.85624, loopKm: 0.4, tags: ['ลู่ยาง'] },
  { id: 'chomnan', name: 'สวนชมน่าน', area: 'เมือง พิษณุโลก', lat: 16.81899, lng: 100.25912, tags: ['ริมแม่น้ำน่าน'] },
  { id: 'buengsifai', name: 'บึงสีไฟ', area: 'เมือง พิจิตร', lat: 16.41052, lng: 100.33146, tags: ['รอบบึง', 'ทางยาว'] },

  // ---------- ภาคอีสาน ----------
  { id: 'buengkaennakhon', name: 'บึงแก่นนคร', area: 'เมือง ขอนแก่น', lat: 16.41337, lng: 102.83576, tags: ['รอบบึง', 'ร่มรื่น'] },
  { id: 'nongprajak', name: 'สวนสาธารณะหนองประจักษ์', area: 'เมือง อุดรธานี', lat: 17.41742, lng: 102.78337, tags: ['ริมน้ำ', 'ในเมือง'] },
  { id: 'bungtalua', name: 'บุ่งตาหลั่ว', area: 'เมือง นครราชสีมา', lat: 14.9603, lng: 102.08838, tags: ['สวนสาธารณะ', 'ทะเลสาบ'] },
  { id: 'thungsrimuang', name: 'ทุ่งศรีเมือง', area: 'เมือง อุบลราชธานี', lat: 15.23019, lng: 104.8573, tags: ['ใจกลางเมือง'] },
  { id: 'buengphlanchai', name: 'บึงพลาญชัย', area: 'เมือง ร้อยเอ็ด', lat: 16.05782, lng: 103.65258, tags: ['รอบบึง'] },

  // ---------- ภาคตะวันออก / ตะวันตก ----------
  { id: 'bangsaen', name: 'หาดบางแสน', area: 'ชลบุรี', lat: 13.27027, lng: 100.92268, tags: ['ริมทะเล', 'ทางยาว'] },
  { id: 'huahin-beach', name: 'ชายหาดหัวหิน', area: 'ประจวบคีรีขันธ์', lat: 12.55552, lng: 99.96393, tags: ['ริมทะเล', 'วิ่งเช้า'] },
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
    spots: [],
  }
}
