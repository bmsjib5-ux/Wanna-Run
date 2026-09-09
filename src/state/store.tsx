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
import { blobToDataUrl, squareThumbnail } from '../lib/image'
import { isCloudConfigured } from '../lib/supabase'
import * as api from '../lib/api'

const STORAGE_PREFIX = 'wanna-run.state.v1'
export const XP_PER_LEVEL = 250

/** แยกที่เก็บข้อมูลในเครื่องตามบัญชี เพื่อไม่ให้ข้อมูลปนกันเมื่อสลับผู้ใช้ */
function storageKey(userId: string | null): string {
  return userId ? `${STORAGE_PREFIX}:${userId}` : STORAGE_PREFIX
}

function load(userId: string | null): AppState {
  const base = withCounters(initialState())
  if (typeof localStorage === 'undefined') return base
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return base
    const parsed = JSON.parse(raw) as AppState
    if (!parsed || parsed.version !== 1) return base
    const rolled = rollover(parsed.counters ?? emptyCounters())
    return {
      ...withCounters(parsed),
      counters: rolled ?? parsed.counters,
      missions: rolled
        ? parsed.missions.map((m) => ({ ...m, claimed: m.period === 'season' ? m.claimed : false }))
        : parsed.missions,
    }
  } catch {
    return base
  }
}

function withCounters(s: AppState): AppState {
  return { ...s, counters: s.counters ?? emptyCounters() }
}

function save(state: AppState, userId: string | null) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(state))
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
  completeOnboarding: (name: string, emoji: string, weeklyGoalKm: number, photo?: File) => void
  setAvatar: (file: File) => Promise<void>
  clearAvatar: () => Promise<void>
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

type Ctx = { state: AppState; actions: Actions; cloud: boolean; syncing: boolean }

const StoreContext = createContext<Ctx | null>(null)

const AVATARS = ['🦊', '🐼', '🐰', '🐧', '🐨', '🐻', '🐥', '🦁', '🦄', '🐯', '🐸', '🐙']
const NAMES = ['นักวิ่งลึกลับ', 'เพื่อนใหม่', 'สายลมเช้า', 'ขาแรง', 'เพซเมกเกอร์', 'รันเนอร์']

function hash(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0
  return h
}

export function StoreProvider({
  children,
  userId = null,
}: {
  children: ReactNode
  userId?: string | null
}) {
  const cloud = isCloudConfigured && !!userId
  const [state, setState] = useState<AppState>(() => load(userId))
  const [syncing, setSyncing] = useState(cloud)
  const stateRef = useRef(state)
  stateRef.current = state
  const cloudRef = useRef(cloud)
  cloudRef.current = cloud

  useEffect(() => {
    save(state, userId)
  }, [state, userId])

  const patch = useCallback((fn: (s: AppState) => AppState) => setState(fn), [])

  const addNotification = useCallback<Actions['addNotification']>(
    (n, alsoNotify = true) => {
      patch((s) => ({
        ...s,
        notifications: [{ ...n, id: uid('nt_'), at: Date.now(), read: false }, ...s.notifications].slice(0, 60),
      }))
      if (alsoNotify) pushNotice(n.title, n.body)
    },
    [patch],
  )

  /** ดึงข้อมูลฝั่งเซิร์ฟเวอร์มาทับส่วนที่เป็นข้อมูลร่วม (โปรไฟล์ เพื่อน กลุ่ม นัดวิ่ง) */
  const refresh = useCallback(async () => {
    if (!cloudRef.current) return
    const local = stateRef.current.profile
    // ใช้ allSettled เพื่อให้ส่วนที่ดึงสำเร็จยังแสดงได้ แม้บางส่วนจะพลาด
    const [profileR, friendsR, groupsR, invitesR] = await Promise.allSettled([
      api.fetchMyProfile({ level: local.level, xp: local.xp, coins: local.coins }),
      api.fetchFriends(),
      api.fetchGroups(),
      api.fetchInvites(),
    ])

    for (const [what, result] of [
      ['โปรไฟล์', profileR],
      ['เพื่อน', friendsR],
      ['กลุ่ม', groupsR],
      ['นัดวิ่ง', invitesR],
    ] as const) {
      if (result.status === 'rejected') console.error(`ดึงข้อมูล${what}ไม่สำเร็จ`, result.reason)
    }

    setState((s) => ({
      ...s,
      onboarded: profileR.status === 'fulfilled' ? !!profileR.value : s.onboarded,
      profile: profileR.status === 'fulfilled' && profileR.value ? profileR.value : s.profile,
      friends: friendsR.status === 'fulfilled' ? friendsR.value : s.friends,
      groups: groupsR.status === 'fulfilled' ? groupsR.value : s.groups,
      invites: invitesR.status === 'fulfilled' ? invitesR.value : s.invites,
    }))
    setSyncing(false)
  }, [])

  // โหลดข้อมูลครั้งแรกและติดตามการเปลี่ยนแปลงแบบสด
  useEffect(() => {
    if (!cloud) {
      setSyncing(false)
      return
    }
    setSyncing(true)
    setState(load(userId))
    void refresh()
    const unsubscribe = api.subscribeToChanges(() => void refresh())

    // Realtime ผ่าน websocket อาจต่อไม่ได้ (เน็ตองค์กร พร็อกซี มือถือสลับสัญญาณ)
    // จึงถามซ้ำเป็นระยะและตอนกลับมาโฟกัสหน้าจอ เพื่อไม่ให้ข้อมูลค้างเมื่อ websocket หลุด
    const timer = window.setInterval(() => void refresh(), 30_000)
    const onWake = () => {
      if (document.visibilityState === 'visible') void refresh()
    }
    document.addEventListener('visibilitychange', onWake)
    window.addEventListener('focus', onWake)

    return () => {
      unsubscribe()
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onWake)
      window.removeEventListener('focus', onWake)
    }
  }, [cloud, userId, refresh])

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

  const actions = useMemo<Actions>(() => {
    const bumpMetric = (s: AppState, metric: MissionMetric, amount: number): AppState => ({
      ...s,
      counters: bump(s.counters, metric, amount),
    })

    /** เรียก API แล้วรีเฟรช พร้อมแจ้งเตือนเมื่อพลาด */
    const remote = (fn: () => Promise<unknown>) => {
      fn()
        .then(() => refresh())
        .catch((err: Error) => {
          console.error(err)
          pushNotice('ซิงก์ไม่สำเร็จ', err.message || 'ลองใหม่อีกครั้ง')
        })
    }

    return {
      completeOnboarding: (name, emoji, weeklyGoalKm, photo) => {
        const clean = name.trim() || 'นักวิ่งนิรนาม'
        if (cloudRef.current) {
          const local = stateRef.current.profile
          remote(async () => {
            const profile = await api.createMyProfile(clean, emoji, weeklyGoalKm, {
              level: local.level,
              xp: local.xp,
              coins: local.coins,
            })
            setState((s) => ({ ...s, onboarded: true, profile }))
            // อัปรูปหลังมีแถวโปรไฟล์แล้วเท่านั้น ไม่งั้นอัปเดตที่อยู่รูปไม่ได้
            if (photo) {
              const url = await api.uploadAvatar(photo)
              setState((s) => ({ ...s, profile: { ...s.profile, avatarUrl: url } }))
            }
          })
          return
        }
        patch((s) => ({
          ...s,
          onboarded: true,
          profile: { ...s.profile, name: clean, emoji, weeklyGoalKm },
        }))
        if (photo) void actionsRef.current.setAvatar(photo)
      },

      setAvatar: async (file) => {
        if (cloudRef.current) {
          const url = await api.uploadAvatar(file)
          patch((s) => ({ ...s, profile: { ...s.profile, avatarUrl: url } }))
          return
        }
        // โหมดในเครื่อง: เก็บรูปย่อเป็น data URL ลง localStorage
        const dataUrl = await blobToDataUrl(await squareThumbnail(file))
        patch((s) => ({ ...s, profile: { ...s.profile, avatarUrl: dataUrl } }))
      },

      clearAvatar: async () => {
        if (cloudRef.current) await api.removeAvatar()
        patch((s) => ({ ...s, profile: { ...s.profile, avatarUrl: undefined } }))
      },

      updateProfile: (p) => {
        patch((s) => ({ ...s, profile: { ...s.profile, ...p } }))
        if (cloudRef.current) void api.updateMyProfile(p).catch(console.error)
      },

      resetAll: () => {
        try {
          localStorage.removeItem(storageKey(userId))
        } catch {
          /* ไม่มีอะไรให้ลบ */
        }
        setState(withCounters(initialState()))
        if (cloudRef.current) void refresh()
      },

      addFriendByCode: (raw) => {
        const code = normalizeCode(raw)
        if (!/^RUN-[A-Z0-9]{4}$/.test(code)) {
          return { ok: false, message: 'รูปแบบรหัสไม่ถูกต้อง (ตัวอย่าง RUN-7KQ2)' }
        }
        const s = stateRef.current
        if (code === s.profile.code) return { ok: false, message: 'นี่คือรหัสของคุณเอง 😄' }

        if (cloudRef.current) {
          remote(async () => {
            const message = await api.sendFriendRequestByCode(code)
            pushNotice('เพิ่มเพื่อน', message)
          })
          return { ok: true, message: 'กำลังส่งคำขอ...' }
        }

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
        if (cloudRef.current) {
          remote(() => api.sendFriendRequestByCode(target.code))
          return
        }
        patch((s) => ({
          ...s,
          friends: s.friends.map((f) => (f.id === friendId ? { ...f, status: 'outgoing' } : f)),
        }))
        scheduleAccept(target)
      },

      acceptFriend: (friendId) => {
        const f = stateRef.current.friends.find((x) => x.id === friendId)
        if (cloudRef.current) {
          remote(async () => {
            await api.acceptFriendRequest(friendId)
            patch((s) => bumpMetric(s, 'friendAdded', 1))
          })
        } else {
          patch((s) =>
            bumpMetric(
              { ...s, friends: s.friends.map((x) => (x.id === friendId ? { ...x, status: 'friend' } : x)) },
              'friendAdded',
              1,
            ),
          )
        }
        if (f) {
          addNotification({
            kind: 'friend',
            title: 'เป็นเพื่อนกันแล้ว 🎉',
            body: `${f.name} เข้าร่วมก๊วนของคุณ`,
            goto: 'friends',
          })
        }
      },

      declineFriend: (friendId) => {
        if (cloudRef.current) {
          remote(() => api.removeFriendship(friendId))
          return
        }
        patch((s) => ({ ...s, friends: s.friends.filter((f) => f.id !== friendId) }))
      },

      removeFriend: (friendId) => {
        if (cloudRef.current) {
          remote(() => api.removeFriendship(friendId))
          return
        }
        patch((s) => ({
          ...s,
          friends: s.friends.filter((f) => f.id !== friendId),
          groups: s.groups.map((g) => ({ ...g, memberIds: g.memberIds.filter((id) => id !== friendId) })),
        }))
      },

      createGroup: (name, emoji, description, memberIds) => {
        const group: Group = {
          id: uid('gp_'),
          name: name.trim() || 'ก๊วนไม่มีชื่อ',
          emoji,
          description: description.trim(),
          memberIds,
          createdAt: Date.now(),
        }
        patch((s) => bumpMetric(s, 'groupCreated', 1))
        if (cloudRef.current) {
          remote(() => api.createGroupRemote(group.name, emoji, group.description, memberIds))
        } else {
          patch((s) => ({ ...s, groups: [group, ...s.groups] }))
        }
        addNotification({
          kind: 'group',
          title: `สร้างกลุ่ม ${group.name}`,
          body: `สมาชิก ${memberIds.length + 1} คน พร้อมลุย!`,
          goto: 'groups',
        })
        return group
      },

      updateGroup: (groupId, p) => {
        if (cloudRef.current) {
          remote(() => api.updateGroupRemote(groupId, p))
          return
        }
        patch((s) => ({ ...s, groups: s.groups.map((g) => (g.id === groupId ? { ...g, ...p } : g)) }))
      },

      deleteGroup: (groupId) => {
        if (cloudRef.current) {
          remote(() => api.deleteGroupRemote(groupId))
          return
        }
        patch((s) => ({ ...s, groups: s.groups.filter((g) => g.id !== groupId) }))
      },

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
        patch((s) => bumpMetric(s, 'inviteSent', 1))
        if (cloudRef.current) {
          remote(() => api.createInviteRemote({ ...input, title: invite.title, note: invite.note }))
        } else {
          patch((s) => ({ ...s, invites: [invite, ...s.invites] }))
          scheduleReplies(invite)
        }
        return invite
      },

      replyInvite: (inviteId, reply) => {
        patch((s) => ({
          ...s,
          invites: s.invites.map((i) => (i.id === inviteId ? { ...i, myReply: reply } : i)),
        }))
        if (cloudRef.current) remote(() => api.replyInviteRemote(inviteId, reply))
      },

      cancelInvite: (inviteId) => {
        if (cloudRef.current) {
          remote(() => api.cancelInviteRemote(inviteId))
          return
        }
        patch((s) => ({
          ...s,
          invites: s.invites.map((i) => (i.id === inviteId ? { ...i, status: 'cancelled' } : i)),
        }))
      },

      saveRun: (run) => {
        patch((s) => {
          let next: AppState = { ...s, runs: [run, ...s.runs] }
          next = bumpMetric(next, 'runCount', 1)
          next = bumpMetric(next, 'distanceKm', run.distanceM / 1000)
          const gainedXp = Math.round((run.distanceM / 1000) * 20) + 15
          next = { ...next, profile: { ...next.profile, xp: next.profile.xp + gainedXp } }

          if (cloudRef.current) {
            const totalKm = next.runs.reduce((sum, r) => sum + r.distanceM, 0) / 1000
            const totalMs = next.runs.reduce((sum, r) => sum + r.movingMs, 0)
            const pace = totalKm > 0 ? Math.round(totalMs / 1000 / totalKm) : null
            void api.updateMyStats(totalKm, pace).catch(console.error)
          }
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
        if (cloudRef.current) {
          void api.updateMyProfile({ sharingLocation: on }).catch(console.error)
          if (!on) void api.clearMyLocation().catch(console.error)
        }
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
          if (s.counters[m.period][m.metric] < m.target) return s
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

    /** โหมดในเครื่อง: จำลองว่าอีกฝ่ายกดตอบรับคำขอเป็นเพื่อน */
    function scheduleAccept(friend: Friend) {
      window.setTimeout(() => {
        patch((s) => ({
          ...s,
          friends: s.friends.map((f) =>
            f.id === friend.id && f.status === 'outgoing' ? { ...f, status: 'friend' } : f,
          ),
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

    /** โหมดในเครื่อง: จำลองการตอบรับคำชวนวิ่ง */
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
  }, [patch, addNotification, refresh, userId])

  const actionsRef = useRef(actions)
  actionsRef.current = actions

  const value = useMemo(() => ({ state, actions, cloud, syncing }), [state, actions, cloud, syncing])
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
