import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useI18n } from '@/i18n'
import { supabase } from '@/lib/supabase'
import type { Profile, Friendship } from '@/lib/types'
import {
  Trophy, UserPlus, Users, Check, X, Crown,
  Flame, Target, TrendingUp, Search, Mail,
} from 'lucide-react'
import toast from 'react-hot-toast'

type LeaderboardMetric = 'streak' | 'weight_progress' | 'activity'

interface FriendData {
  profile: Profile
  streak: number
  weightProgress: number
  weeklyActivity: number
}

export default function LeaderboardPage() {
  const { user, profile } = useAuth()
  const { t } = useI18n()
  const [tab, setTab] = useState<'board' | 'friends'>('board')
  const [metric, setMetric] = useState<LeaderboardMetric>('streak')
  const [friends, setFriends] = useState<FriendData[]>([])
  const [pendingRequests, setPendingRequests] = useState<Friendship[]>([])
  const [friendEmail, setFriendEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)

  const fetchFriends = useCallback(async () => {
    if (!user) return

    const { data: friendships } = await supabase
      .from('friendships')
      .select('*')
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)

    const accepted = (friendships ?? []).filter((f) => f.status === 'accepted')
    const pending = (friendships ?? []).filter(
      (f) => f.status === 'pending' && f.addressee_id === user.id
    )
    setPendingRequests(pending)

    const friendIds = accepted.map((f) =>
      f.requester_id === user.id ? f.addressee_id : f.requester_id
    )

    if (friendIds.length === 0 && profile) {
      setFriends([{
        profile,
        streak: await getStreak(user.id),
        weightProgress: await getWeightProgress(user.id, profile),
        weeklyActivity: await getWeeklyActivity(user.id),
      }])
      setLoading(false)
      return
    }

    const allIds = [user.id, ...friendIds]
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', allIds)

    const friendDataPromises = (profiles ?? []).map(async (p) => ({
      profile: p,
      streak: await getStreak(p.id),
      weightProgress: await getWeightProgress(p.id, p),
      weeklyActivity: await getWeeklyActivity(p.id),
    }))

    const friendData = await Promise.all(friendDataPromises)
    setFriends(friendData)
    setLoading(false)
  }, [user, profile])

  useEffect(() => { fetchFriends() }, [fetchFriends])

  async function getStreak(userId: string): Promise<number> {
    const { data } = await supabase
      .from('meals')
      .select('logged_at')
      .eq('user_id', userId)
      .order('logged_at', { ascending: false })
      .limit(60)

    if (!data?.length) return 0

    const days = new Set(data.map((m) =>
      new Date(m.logged_at).toISOString().split('T')[0]
    ))

    let streak = 0
    const d = new Date()
    for (let i = 0; i < 60; i++) {
      const key = d.toISOString().split('T')[0]
      if (days.has(key)) {
        streak++
      } else if (i > 0) {
        break
      }
      d.setDate(d.getDate() - 1)
    }
    return streak
  }

  async function getWeightProgress(userId: string, p: Profile): Promise<number> {
    if (!p.target_weight || !p.current_weight) return 0

    const { data } = await supabase
      .from('weight_logs')
      .select('weight')
      .eq('user_id', userId)
      .order('logged_at', { ascending: false })
      .limit(1)

    if (!data?.length) return 0

    const latest = Number(data[0].weight)
    const start = Number(p.current_weight)
    const target = Number(p.target_weight)
    const totalDiff = Math.abs(target - start)
    if (totalDiff === 0) return 100

    const progress = Math.abs(latest - start)
    const isRightDirection = p.weight_goal === 'lose'
      ? latest < start
      : p.weight_goal === 'gain'
        ? latest > start
        : true

    if (!isRightDirection) return 0
    return Math.min(Math.round((progress / totalDiff) * 100), 100)
  }

  async function getWeeklyActivity(userId: string): Promise<number> {
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const { data } = await supabase
      .from('exercises')
      .select('duration_minutes')
      .eq('user_id', userId)
      .gte('logged_at', weekAgo.toISOString())

    return (data ?? []).reduce((s, e) => s + Number(e.duration_minutes), 0)
  }

  async function addFriend() {
    if (!user || !friendEmail.trim()) return
    setAdding(true)
    try {
      const { data: friendProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', friendEmail.trim().toLowerCase())
        .single()

      if (!friendProfile) {
        toast.error(t('lb_user_not_found'))
        setAdding(false)
        return
      }

      if (friendProfile.id === user.id) {
        toast.error(t('lb_thats_you'))
        setAdding(false)
        return
      }

      const { error } = await supabase.from('friendships').insert({
        requester_id: user.id,
        addressee_id: friendProfile.id,
        status: 'pending',
      })

      if (error) {
        if (error.code === '23505') {
          toast.error(t('lb_already_exists'))
        } else {
          toast.error(t('lb_request_fail'))
        }
      } else {
        toast.success(t('lb_request_sent'))
        setFriendEmail('')
      }
    } catch {
      toast.error(t('lb_something_wrong'))
    }
    setAdding(false)
  }

  async function respondToRequest(friendshipId: string, accept: boolean) {
    await supabase
      .from('friendships')
      .update({ status: accept ? 'accepted' : 'rejected' })
      .eq('id', friendshipId)
    toast.success(accept ? t('lb_friend_added') : t('lb_request_declined'))
    fetchFriends()
  }

  const sorted = [...friends].sort((a, b) => {
    switch (metric) {
      case 'streak': return b.streak - a.streak
      case 'weight_progress': return b.weightProgress - a.weightProgress
      case 'activity': return b.weeklyActivity - a.weeklyActivity
    }
  })

  const metrics: { id: LeaderboardMetric; labelKey: 'lb_streak' | 'lb_progress' | 'lb_activity'; icon: typeof Flame }[] = [
    { id: 'streak', labelKey: 'lb_streak', icon: Flame },
    { id: 'weight_progress', labelKey: 'lb_progress', icon: Target },
    { id: 'activity', labelKey: 'lb_activity', icon: TrendingUp },
  ]

  function getMetricValue(fd: FriendData): string {
    switch (metric) {
      case 'streak': return `${fd.streak} ${t('lb_days')}`
      case 'weight_progress': return `${fd.weightProgress}%`
      case 'activity': return `${fd.weeklyActivity} ${t('lb_min')}`
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-3 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-5 pb-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-slate-900">{t('lb_title')}</h1>

      <div className="flex bg-slate-100 rounded-xl p-1">
        <button
          onClick={() => setTab('board')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
            tab === 'board' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
          }`}
        >
          <Trophy className="w-4 h-4" /> {t('lb_rankings')}
        </button>
        <button
          onClick={() => setTab('friends')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
            tab === 'friends' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
          }`}
        >
          <Users className="w-4 h-4" /> {t('lb_friends')}
          {pendingRequests.length > 0 && (
            <span className="w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {pendingRequests.length}
            </span>
          )}
        </button>
      </div>

      {tab === 'board' && (
        <>
          <div className="flex gap-2">
            {metrics.map(({ id, labelKey, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setMetric(id)}
                className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-medium transition-all ${
                  metric === id
                    ? 'bg-primary-500 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {t(labelKey)}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {sorted.map((fd, i) => (
              <div
                key={fd.profile.id}
                className={`card !p-3 flex items-center gap-3 ${
                  fd.profile.id === user?.id ? 'ring-2 ring-primary-500/30' : ''
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                  i === 0 ? 'bg-yellow-100 text-yellow-700' :
                  i === 1 ? 'bg-slate-100 text-slate-600' :
                  i === 2 ? 'bg-amber-100 text-amber-700' :
                  'bg-slate-50 text-slate-500'
                }`}>
                  {i === 0 ? <Crown className="w-4 h-4" /> : i + 1}
                </div>
                <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-primary-700">
                    {(fd.profile.full_name?.[0] ?? '?').toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 truncate">
                    {fd.profile.full_name}
                    {fd.profile.id === user?.id && (
                      <span className="text-xs text-primary-600 ml-1">{t('lb_you')}</span>
                    )}
                  </p>
                </div>
                <span className="font-bold text-slate-900">{getMetricValue(fd)}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'friends' && (
        <div className="space-y-4">
          {/* Add Friend */}
          <div className="card space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <UserPlus className="w-4 h-4" /> {t('lb_add_friend')}
            </h3>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  placeholder={t('lb_friend_email')}
                  value={friendEmail}
                  onChange={(e) => setFriendEmail(e.target.value)}
                  className="input-field pl-10"
                />
              </div>
              <button onClick={addFriend} disabled={adding} className="btn-primary !px-4">
                {adding ? '...' : <Search className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Pending Requests */}
          {pendingRequests.length > 0 && (
            <div className="card space-y-3">
              <h3 className="font-semibold">{t('lb_pending')}</h3>
              {pendingRequests.map((req) => (
                <div key={req.id} className="flex items-center gap-3 p-2 bg-slate-50 rounded-xl">
                  <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center">
                    <UserPlus className="w-4 h-4 text-amber-600" />
                  </div>
                  <span className="flex-1 text-sm font-medium text-slate-700 truncate">
                    {req.requester_id}
                  </span>
                  <button
                    onClick={() => respondToRequest(req.id, true)}
                    className="w-8 h-8 rounded-full bg-primary-500 text-white flex items-center justify-center"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => respondToRequest(req.id, false)}
                    className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Friend List */}
          <div className="card space-y-3">
            <h3 className="font-semibold">{t('lb_your_friends')}</h3>
            {friends.filter((f) => f.profile.id !== user?.id).length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">
                {t('lb_no_friends')}
              </p>
            ) : (
              friends
                .filter((f) => f.profile.id !== user?.id)
                .map((fd) => (
                  <div key={fd.profile.id} className="flex items-center gap-3 p-2 bg-slate-50 rounded-xl">
                    <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary-700">
                        {(fd.profile.full_name?.[0] ?? '?').toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{fd.profile.full_name}</p>
                      <p className="text-xs text-slate-500">{fd.streak} {t('lb_day_streak')}</p>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
