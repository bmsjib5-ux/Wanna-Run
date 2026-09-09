import type { AppState, Friend, Group, Mission, Place, RunInvite } from '../types'
import { friendCode, uid } from './id'
import { emptyCounters } from './counters'
import { DAY_MS } from './format'

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

const FRIEND_SEED: Array<Pick<Friend, 'name' | 'emoji' | 'bio' | 'totalKm' | 'avgPaceSec'> & { home: Place }> = [
  { name: 'ฟ้า', emoji: '🦊', bio: 'สายซ้อมเช้า ตี 5 ตื่นแล้ว', totalKm: 428, avgPaceSec: 330, home: PLACES[0] },
  { name: 'ต้นกล้า', emoji: '🐼', bio: 'มาราธอนคนแรกปีนี้!', totalKm: 761, avgPaceSec: 300, home: PLACES[1] },
  { name: 'มะปราง', emoji: '🐰', bio: 'วิ่งชิล ๆ คุยไปด้วย', totalKm: 152, avgPaceSec: 420, home: PLACES[2] },
  { name: 'เจได', emoji: '🐧', bio: 'เก็บเหรียญงานวิ่งครบทุกจังหวัด', totalKm: 1204, avgPaceSec: 285, home: PLACES[3] },
  { name: 'นิว', emoji: '🐨', bio: 'เพิ่งเริ่มวิ่ง ขอคนลากหน่อย', totalKm: 38, avgPaceSec: 480, home: PLACES[5] },
  { name: 'พี่หมี', emoji: '🐻', bio: 'เทรลเลอร์ ชอบทางชัน', totalKm: 990, avgPaceSec: 355, home: PLACES[6] },
  { name: 'ปุ๊กกี้', emoji: '🐥', bio: 'วิ่งตอนเย็นแถวเบญจกิติ', totalKm: 205, avgPaceSec: 390, home: PLACES[1] },
  { name: 'โอ๊ต', emoji: '🦁', bio: 'อินเตอร์วัลสายโหด', totalKm: 640, avgPaceSec: 295, home: PLACES[2] },
  { name: 'แพรว', emoji: '🦄', bio: 'หาเพื่อนวิ่งสวนรถไฟ', totalKm: 88, avgPaceSec: 445, home: PLACES[2] },
]

export function seedFriends(): Friend[] {
  const now = Date.now()
  return FRIEND_SEED.map((f, i) => ({
    id: uid('fr_'),
    name: f.name,
    emoji: f.emoji,
    code: friendCode(),
    status: i < 4 ? 'friend' : i === 4 ? 'incoming' : i === 5 ? 'friend' : 'suggested',
    bio: f.bio,
    totalKm: f.totalKm,
    avgPaceSec: f.avgPaceSec,
    home: { lat: f.home.lat, lng: f.home.lng },
    sharingLocation: i % 2 === 0,
    lastActiveAt: now - i * 37 * 60_000,
  }))
}

export function seedGroups(friends: Friend[]): Group[] {
  const ok = friends.filter((f) => f.status === 'friend')
  return [
    {
      id: uid('gp_'),
      name: 'ก๊วนวิ่งเช้าสวนลุม',
      emoji: '🌅',
      description: 'เจอกันหน้าเสาธง 05:45 ทุกวันอังคาร-พฤหัส',
      memberIds: ok.slice(0, 3).map((f) => f.id),
      createdAt: Date.now() - 12 * DAY_MS,
    },
    {
      id: uid('gp_'),
      name: 'ซ้อมมินิมาราธอน',
      emoji: '🏅',
      description: 'เป้าหมาย 10K ใต้ 55 นาที',
      memberIds: ok.slice(1).map((f) => f.id),
      createdAt: Date.now() - 4 * DAY_MS,
    },
  ]
}

export function seedInvites(friends: Friend[], groups: Group[]): RunInvite[] {
  const ok = friends.filter((f) => f.status === 'friend')
  if (ok.length === 0) return []
  const tomorrow6 = nextTimeAt(1, 6, 0)
  const sat17 = nextTimeAt(3, 17, 30)
  return [
    {
      id: uid('iv_'),
      title: 'วิ่งเช้าเบา ๆ ก่อนเข้างาน',
      place: PLACES[0],
      startAt: tomorrow6,
      targetKm: 5,
      note: 'เจอกันหน้าประตู 3 นะ ใครสายวิ่งตามมา 😆',
      groupId: groups[0]?.id,
      inviteeIds: ok.slice(0, 3).map((f) => f.id),
      replies: Object.fromEntries(ok.slice(0, 2).map((f, i) => [f.id, i === 0 ? 'going' : 'maybe'])),
      hostIsMe: true,
      createdAt: Date.now() - 3 * 3600_000,
      status: 'open',
    },
    {
      id: uid('iv_'),
      title: 'ลองซ้อมยาว 10K',
      place: PLACES[1],
      startAt: sat17,
      targetKm: 10,
      note: 'เพซ 6:00 ไม่ทิ้งกันน้า',
      inviteeIds: [],
      replies: {},
      hostIsMe: false,
      hostId: ok[1]?.id ?? ok[0].id,
      createdAt: Date.now() - 40 * 60_000,
      status: 'open',
    },
  ]
}

/** เวลาถัดไปในอีก n วัน ที่ชั่วโมง/นาทีที่กำหนด */
function nextTimeAt(daysAhead: number, hour: number, minute: number): number {
  const d = new Date()
  d.setDate(d.getDate() + daysAhead)
  d.setHours(hour, minute, 0, 0)
  return d.getTime()
}

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
  const friends = seedFriends()
  const groups = seedGroups(friends)
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
    friends,
    groups,
    invites: seedInvites(friends, groups),
    runs: [],
    missions: seedMissions(),
    counters: emptyCounters(),
    notifications: [
      {
        id: uid('nt_'),
        kind: 'friend',
        title: 'นิว ส่งคำขอเป็นเพื่อน',
        body: 'เพิ่งเริ่มวิ่ง ขอคนลากหน่อย',
        at: Date.now() - 25 * 60_000,
        read: false,
        goto: 'friends',
      },
      {
        id: uid('nt_'),
        kind: 'invite',
        title: 'ชวนวิ่ง: ลองซ้อมยาว 10K',
        body: 'สวนเบญจกิติ · เสาร์นี้ 17:30',
        at: Date.now() - 40 * 60_000,
        read: false,
        goto: 'invites',
      },
    ],
    highScores: { tapsprint: 0, spin: 0, quiz: 0 },
    lastSpinAt: 0,
    places: PLACES,
  }
}
