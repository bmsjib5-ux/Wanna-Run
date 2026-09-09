import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type {
  AppNotification,
  AppState,
  Friend,
  GameKey,
  Group,
  ID,
  InviteReply,
  Mission,
  MissionMetric,
  Place,
  RunInvite,
  RunSession,
} from '../types'
import { initialState } from '../lib/seed'
import { bump, emptyCounters, rollover } from '../lib/counters'
import { normalizeCode, uid } from '../lib/id'
import { pushNotice } from '../lib/notify'

const STORAGE_KEY = 'wanna-run.state.v1'
export const XP_PER_LEVEL = 250

function load(): AppState {
  if (typeof localStorage === 'undefined') return withCounters(initialState())
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return withCounters(initialState())
    const parsed = JSON.parse(raw) as AppState
    if (!parsed || parsed.version !== 1) return withCounters(initialState())
    const rolled = rollover(parsed.counters ?? emptyCounters())
    return {
      ...withCounters(parsed),
      counters: rolled ?? parsed.counters,
      missions: rolled ? parsed.missions.map((m) => ({ ...m, claimed: m.period === 'season' ? m.claimed : false })) : parsed.missions,
    }
  } catch {
    return withCounters(initialState())
  }
}

function withCounters(s: AppState): AppState {
  return { ...s, counters: s.counters ?? emptyCounters() }
}

function save(state: AppState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* พื้นที่เก็บข้อมูลเต็มหรือถูกปิดใช้งาน */
  }
}

export function levelOf(xp: number): { level: number; inLevel: number; need: number } {
  const level = Math.floor(xp / XP_PER_LEVEL) + 1
  return { level, inLevel: xp % XP_PER_LEVEL, need: XP_PER_LEVEL }
}

/** เติมความคืบหน้าภารกิจจากตัวนับตามช่วงเวลา */
export function missionsWithProgress(state: AppState): Mission[] {
  return state.missions.map((m) => ({
    ...m,
    progress: Math.min(m.target, state.counters[m.period][m.metric]),
  }))
}

type Actions = {
  completeOnboarding: (name: string, emoji: string, weeklyGoalKm: number) => void
  updateProfile: (patch: Partial<AppState['profile']>) => void
  resetAll: () => void

  addFriendByCode: (code: string) => { ok: boolean; message: string }
  sendFriendRequest: (friendId: ID) => void
  acceptFriend: (friendId: ID) => void
  declineFriend: (friendId: ID) => void
  removeFriend: (friendId: ID) => void

  createGroup: (name: string, emoji: string, description: string, memberIds: ID[]) => Group
  updateGroup: (groupId: ID, patch: Partial<Group>) => void
  deleteGroup: (groupId: ID) => void

  createInvite: (input: {
    title: string
    place: Place
    startAt: number
    targetKm: number
    note: string
    groupId?: ID
    inviteeIds: ID[]
  }) => RunInvite
  replyInvite: (inviteId: ID, reply: InviteReply) => void
  cancelInvite: (inviteId: ID) => void

  saveRun: (run: RunSession) => void
  deleteRun: (runId: ID) => void

  toggleShareLocation: (on: boolean) => void

  claimMission: (missionId: ID) => void
  recordGame: (game: GameKey, score: number, coins: number, xp: number) => void
  markSpun: () => void

  addNotification: (n: Omit<AppNotification, 'id' | 'at' | 'read'>, alsoNotify?: boolean) => void
  markAllRead: () => void
  markRead: (id: ID) => void
}

type Ctx = { state: AppState; actions: Actions }

const StoreContext = createContext<Ctx | null>(null)

const AVATARS = ['🦊', '🐼', '🐰', '🐧', '🐨', '🐻', '🐥', '🦁', '🦄', '🐯', '🐸', '🐙']
const NAMES = ['นักวิ่งลึกลับ', 'เพื่อนใหม่', 'สายลมเช้า', 'ขาแรง', 'เพซเมกเกอร์', 'รันเนอร์']

function hash(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0
  return h
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(load)
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    save(state)
  }, [state])

  // ตรวจข้ามวัน/ข้ามสัปดาห์เพื่อรีเซ็ตภารกิจ
  useEffect(() => {
    const timer = setInterval(() => {
      setState((s) => {
        const rolled = rollover(s.counters)
        if (!rolled) return s
        return {
          ...s,
          counters: rolled,
          missions: s.missions.map((m) => (m.period === 'season' ? m : { ...m, claimed: false })),
        }
      })
    }, 60_000)
    return () => clearInterval(timer)
  }, [])

  const patch = useCallback((fn: (s: AppState) => AppState) => setState(fn), [])

  const addNotification = useCallback<Actions['addNotification']>(
    (n, alsoNotify = true) => {
      patch((s) => ({
        ...s,
        notifications: [
          { ...n, id: uid('nt_'), at: Date.now(), read: false },
          ...s.notifications,
        ].slice(0, 60),
      }))
      if (alsoNotify) pushNotice(n.title, n.body)
    },
    [patch],
  )

  const actions = useMemo<Actions>(() => {
    const bumpMetric = (s: AppState, metric: MissionMetric, amount: number): AppState => ({
      ...s,
      counters: bump(s.counters, metric, amount),
    })

    return {
      completeOnboarding: (name, emoji, weeklyGoalKm) =>
        patch((s) => ({
          ...s,
          onboarded: true,
          profile: { ...s.profile, name: name.trim() || 'นักวิ่งนิรนาม', emoji, weeklyGoalKm },
        })),

      updateProfile: (p) => patch((s) => ({ ...s, profile: { ...s.profile, ...p } })),

      resetAll: () => {
        try {
          localStorage.removeItem(STORAGE_KEY)
        } catch {
          /* ไม่มีอะไรให้ลบ */
        }
        setState(withCounters(initialState()))
      },

      addFriendByCode: (raw) => {
        const code = normalizeCode(raw)
        if (!/^RUN-[A-Z0-9]{4}$/.test(code)) {
          return { ok: false, message: 'รูปแบบรหัสไม่ถูกต้อง (ตัวอย่าง RUN-7KQ2)' }
        }
        const s = stateRef.current
        if (code === s.profile.code) return { ok: false, message: 'นี่คือรหัสของคุณเอง 😄' }
        const existing = s.friends.find((f) => f.code === code)
        if (existing?.status === 'friend') return { ok: false, message: `${existing.name} เป็นเพื่อนคุณอยู่แล้ว` }
        if (existing?.status === 'outgoing') return { ok: false, message: 'ส่งคำขอไปแล้ว รอตอบรับอยู่' }

        if (existing) {
          actionsRef.current.sendFriendRequest(existing.id)
          return { ok: true, message: `ส่งคำขอถึง ${existing.name} แล้ว` }
        }

        const h = hash(code)
        const invented: Friend = {
          id: uid('fr_'),
          name: NAMES[h % NAMES.length],
          emoji: AVATARS[(h >> 3) % AVATARS.length],
          code,
          status: 'outgoing',
          bio: 'เพิ่มผ่านรหัสเพื่อน',
          totalKm: 20 + (h % 400),
          avgPaceSec: 280 + (h % 220),
          home: { lat: 13.7305 + ((h % 100) - 50) / 5000, lng: 100.5418 + ((h % 71) - 35) / 5000 },
          sharingLocation: false,
          lastActiveAt: Date.now(),
        }
        patch((s2) => ({ ...s2, friends: [...s2.friends, invented] }))
        scheduleAccept(invented)
        return { ok: true, message: `ส่งคำขอถึงรหัส ${code} แล้ว` }
      },

      sendFriendRequest: (friendId) => {
        const target = stateRef.current.friends.find((f) => f.id === friendId)
        if (!target) return
        patch((s) => ({
          ...s,
          friends: s.friends.map((f) => (f.id === friendId ? { ...f, status: 'outgoing' } : f)),
        }))
        scheduleAccept(target)
      },

      acceptFriend: (friendId) => {
        patch((s) => {
          const f = s.friends.find((x) => x.id === friendId)
          if (!f) return s
          return bumpMetric(
            {
              ...s,
              friends: s.friends.map((x) => (x.id === friendId ? { ...x, status: 'friend' } : x)),
            },
            'friendAdded',
            1,
          )
        })
        const f = stateRef.current.friends.find((x) => x.id === friendId)
        if (f) addNotification({ kind: 'friend', title: 'เป็นเพื่อนกันแล้ว 🎉', body: `${f.name} เข้าร่วมก๊วนของคุณ`, goto: 'friends' })
      },

      declineFriend: (friendId) =>
        patch((s) => ({ ...s, friends: s.friends.filter((f) => f.id !== friendId) })),

      removeFriend: (friendId) =>
        patch((s) => ({
          ...s,
          friends: s.friends.filter((f) => f.id !== friendId),
          groups: s.groups.map((g) => ({ ...g, memberIds: g.memberIds.filter((id) => id !== friendId) })),
        })),

      createGroup: (name, emoji, description, memberIds) => {
        const group: Group = {
          id: uid('gp_'),
          name: name.trim() || 'ก๊วนไม่มีชื่อ',
          emoji,
          description: description.trim(),
          memberIds,
          createdAt: Date.now(),
        }
        patch((s) => bumpMetric({ ...s, groups: [group, ...s.groups] }, 'groupCreated', 1))
        addNotification({ kind: 'group', title: `สร้างกลุ่ม ${group.name}`, body: `สมาชิก ${memberIds.length + 1} คน พร้อมลุย!`, goto: 'groups' })
        return group
      },

      updateGroup: (groupId, p) =>
        patch((s) => ({ ...s, groups: s.groups.map((g) => (g.id === groupId ? { ...g, ...p } : g)) })),

      deleteGroup: (groupId) => patch((s) => ({ ...s, groups: s.groups.filter((g) => g.id !== groupId) })),

      createInvite: (input) => {
        const invite: RunInvite = {
          id: uid('iv_'),
          title: input.title.trim() || 'ชวนวิ่ง',
          place: input.place,
          startAt: input.startAt,
          targetKm: input.targetKm,
          note: input.note.trim(),
          groupId: input.groupId,
          inviteeIds: input.inviteeIds,
          replies: {},
          hostIsMe: true,
          myReply: 'going',
          createdAt: Date.now(),
          status: 'open',
        }
        patch((s) => bumpMetric({ ...s, invites: [invite, ...s.invites] }, 'inviteSent', 1))
        scheduleReplies(invite)
        return invite
      },

      replyInvite: (inviteId, reply) =>
        patch((s) => ({
          ...s,
          invites: s.invites.map((i) => (i.id === inviteId ? { ...i, myReply: reply } : i)),
        })),

      cancelInvite: (inviteId) =>
        patch((s) => ({
          ...s,
          invites: s.invites.map((i) => (i.id === inviteId ? { ...i, status: 'cancelled' } : i)),
        })),

      saveRun: (run) => {
        patch((s) => {
          let next: AppState = { ...s, runs: [run, ...s.runs] }
          next = bumpMetric(next, 'runCount', 1)
          next = bumpMetric(next, 'distanceKm', run.distanceM / 1000)
          const gainedXp = Math.round((run.distanceM / 1000) * 20) + 15
          next = { ...next, profile: { ...next.profile, xp: next.profile.xp + gainedXp } }
          return next
        })
        addNotification({
          kind: 'run',
          title: 'บันทึกการวิ่งแล้ว 🏁',
          body: `${(run.distanceM / 1000).toFixed(2)} กม. เก็บ XP เพิ่ม!`,
          goto: 'profile',
        })
      },

      deleteRun: (runId) => patch((s) => ({ ...s, runs: s.runs.filter((r) => r.id !== runId) })),

      toggleShareLocation: (on) => {
        patch((s) => {
          const next = { ...s, profile: { ...s.profile, sharingLocation: on } }
          return on ? bumpMetric(next, 'locationShared', 1) : next
        })
        if (on) {
          addNotification({
            kind: 'location',
            title: 'กำลังแชร์ตำแหน่ง',
            body: 'เพื่อนในก๊วนเห็นตำแหน่งคุณบนแผนที่แล้ว',
            goto: 'map',
          })
        }
      },

      claimMission: (missionId) =>
        patch((s) => {
          const m = s.missions.find((x) => x.id === missionId)
          if (!m || m.claimed) return s
          const progress = s.counters[m.period][m.metric]
          if (progress < m.target) return s
          return {
            ...s,
            missions: s.missions.map((x) => (x.id === missionId ? { ...x, claimed: true } : x)),
            profile: { ...s.profile, xp: s.profile.xp + m.xp, coins: s.profile.coins + m.coins },
          }
        }),

      recordGame: (game, score, coins, xp) =>
        patch((s) => {
          let next = bumpMetric(s, 'gamePlayed', 1)
          next = bumpMetric(next, 'gameScore', score)
          return {
            ...next,
            highScores: { ...next.highScores, [game]: Math.max(next.highScores[game] ?? 0, score) },
            profile: { ...next.profile, coins: next.profile.coins + coins, xp: next.profile.xp + xp },
          }
        }),

      markSpun: () => patch((s) => ({ ...s, lastSpinAt: Date.now() })),

      addNotification,

      markAllRead: () =>
        patch((s) => ({ ...s, notifications: s.notifications.map((n) => ({ ...n, read: true })) })),

      markRead: (id) =>
        patch((s) => ({
          ...s,
          notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
        })),
    }

    /** จำลองว่าอีกฝ่ายกดตอบรับคำขอเป็นเพื่อน */
    function scheduleAccept(friend: Friend) {
      window.setTimeout(() => {
        patch((s) => ({
          ...s,
          friends: s.friends.map((f) => (f.id === friend.id && f.status === 'outgoing' ? { ...f, status: 'friend' } : f)),
          counters: bump(s.counters, 'friendAdded', 1),
        }))
        addNotification({
          kind: 'friend',
          title: `${friend.name} ตอบรับคำขอแล้ว`,
          body: 'ชวนไปวิ่งด้วยกันเลย!',
          goto: 'friends',
        })
      }, 3500)
    }

    /** จำลองการตอบรับคำชวนวิ่งจากเพื่อนที่ถูกเชิญ */
    function scheduleReplies(invite: RunInvite) {
      invite.inviteeIds.forEach((friendId, index) => {
        window.setTimeout(
          () => {
            const friend = stateRef.current.friends.find((f) => f.id === friendId)
            if (!friend) return
            const reply: InviteReply = index % 3 === 2 ? 'maybe' : 'going'
            patch((s) => ({
              ...s,
              invites: s.invites.map((i) =>
                i.id === invite.id ? { ...i, replies: { ...i.replies, [friendId]: reply } } : i,
              ),
            }))
            addNotification({
              kind: 'invite',
              title: `${friend.name} ${reply === 'going' ? 'ตอบรับ' : 'อาจจะไป'}`,
              body: `${invite.title} · ${invite.place.name}`,
              goto: 'invites',
            })
          },
          2500 + index * 2600,
        )
      })
    }
  }, [patch, addNotification])

  const actionsRef = useRef(actions)
  actionsRef.current = actions

  const value = useMemo(() => ({ state, actions }), [state, actions])
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): Ctx {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore ต้องอยู่ภายใน StoreProvider')
  return ctx
}

export function useFriends(status?: Friend['status']): Friend[] {
  const { state } = useStore()
  return useMemo(
    () => (status ? state.friends.filter((f) => f.status === status) : state.friends),
    [state.friends, status],
  )
}
