import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { calculateTargets } from '@/lib/nutrition'
import type { Gender, ActivityLevel, WeightGoal } from '@/lib/types'
import type { WeightLog } from '@/lib/types'
import WeightChart from '@/components/WeightChart'
import {
  LogOut, Save, Scale, User, Ruler, Calendar,
  Zap, Target, ChevronDown, ChevronUp, Plus,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useEffect, useCallback } from 'react'

export default function ProfilePage() {
  const { profile, user, signOut, refreshProfile } = useAuth()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showWeightLog, setShowWeightLog] = useState(false)
  const [newWeight, setNewWeight] = useState('')
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([])

  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [age, setAge] = useState(String(profile?.age ?? ''))
  const [gender, setGender] = useState<Gender>((profile?.gender as Gender) ?? 'male')
  const [height, setHeight] = useState(String(profile?.height ?? ''))
  const [currentWeight, setCurrentWeight] = useState(String(profile?.current_weight ?? ''))
  const [targetWeight, setTargetWeight] = useState(String(profile?.target_weight ?? ''))
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(
    (profile?.activity_level as ActivityLevel) ?? 'moderate'
  )
  const [weightGoal, setWeightGoal] = useState<WeightGoal>(
    (profile?.weight_goal as WeightGoal) ?? 'maintain'
  )

  const fetchWeightLogs = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('weight_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('logged_at', { ascending: false })
      .limit(30)
    setWeightLogs(data ?? [])
  }, [user])

  useEffect(() => { fetchWeightLogs() }, [fetchWeightLogs])

  async function handleSave() {
    if (!user) return
    setSaving(true)
    try {
      const w = parseFloat(currentWeight)
      const h = parseFloat(height)
      const a = parseInt(age)
      const tw = targetWeight ? parseFloat(targetWeight) : w

      const targets = calculateTargets(w, h, a, gender, activityLevel, weightGoal)

      await supabase.from('profiles').update({
        full_name: fullName,
        age: a,
        gender,
        height: h,
        current_weight: w,
        target_weight: tw,
        activity_level: activityLevel,
        weight_goal: weightGoal,
        daily_calories_target: targets.calories,
        daily_protein_target: targets.protein,
        daily_carbs_target: targets.carbs,
        daily_fat_target: targets.fat,
        daily_water_target: targets.water,
      }).eq('id', user.id)

      await refreshProfile()
      setEditing(false)
      toast.success('Profile updated! Targets recalculated.')
    } catch {
      toast.error('Failed to save')
    }
    setSaving(false)
  }

  async function logWeight() {
    if (!user || !newWeight) return
    const weight = parseFloat(newWeight)
    await supabase.from('weight_logs').insert({
      user_id: user.id,
      weight,
      logged_at: new Date().toISOString(),
    })

    await supabase.from('profiles').update({ current_weight: weight }).eq('id', user.id)
    await refreshProfile()
    setCurrentWeight(String(weight))
    setNewWeight('')
    fetchWeightLogs()
    toast.success('Weight logged!')
  }

  return (
    <div className="space-y-5 pb-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Profile</h1>
        <button onClick={signOut} className="btn-ghost text-red-500 hover:bg-red-50 flex items-center gap-1.5 text-sm">
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>

      {/* Avatar + Name */}
      <div className="card flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-primary-100 flex items-center justify-center">
          <span className="text-2xl font-bold text-primary-700">
            {(profile?.full_name?.[0] ?? '?').toUpperCase()}
          </span>
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">{profile?.full_name}</h2>
          <p className="text-sm text-slate-500">{profile?.email}</p>
        </div>
      </div>

      {/* Current Targets */}
      {!editing && (
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Daily Targets</h3>
            <button onClick={() => setEditing(true)} className="text-sm text-primary-600 font-medium">
              Edit Profile
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Calories', value: `${profile?.daily_calories_target ?? 0} kcal`, icon: '🔥' },
              { label: 'Protein', value: `${profile?.daily_protein_target ?? 0}g`, icon: '🥩' },
              { label: 'Carbs', value: `${profile?.daily_carbs_target ?? 0}g`, icon: '🍞' },
              { label: 'Fat', value: `${profile?.daily_fat_target ?? 0}g`, icon: '🥑' },
              { label: 'Water', value: `${((profile?.daily_water_target ?? 0) / 1000).toFixed(1)}L`, icon: '💧' },
              { label: 'Goal', value: profile?.weight_goal ?? 'maintain', icon: '🎯' },
            ].map((item) => (
              <div key={item.label} className="p-3 bg-slate-50 rounded-xl">
                <span className="text-lg">{item.icon}</span>
                <p className="text-xs text-slate-500 mt-1">{item.label}</p>
                <p className="font-semibold text-slate-900 capitalize">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="pt-2 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Scale className="w-4 h-4 text-slate-400" />
              <span className="text-slate-600">Current Weight</span>
              <span className="ml-auto font-semibold">{profile?.current_weight} kg</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Target className="w-4 h-4 text-slate-400" />
              <span className="text-slate-600">Target Weight</span>
              <span className="ml-auto font-semibold">{profile?.target_weight} kg</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Ruler className="w-4 h-4 text-slate-400" />
              <span className="text-slate-600">Height</span>
              <span className="ml-auto font-semibold">{profile?.height} cm</span>
            </div>
          </div>
        </div>
      )}

      {/* Edit Form */}
      {editing && (
        <div className="card space-y-4 animate-fade-in">
          <h3 className="font-semibold text-slate-900">Edit Profile</h3>

          <div>
            <label className="label flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Name</label>
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="input-field" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Age</label>
              <input type="number" value={age} onChange={(e) => setAge(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="label flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Gender</label>
              <select value={gender} onChange={(e) => setGender(e.target.value as Gender)} className="input-field">
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label flex items-center gap-1.5"><Ruler className="w-3.5 h-3.5" /> Height (cm)</label>
              <input type="number" value={height} onChange={(e) => setHeight(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="label flex items-center gap-1.5"><Scale className="w-3.5 h-3.5" /> Weight (kg)</label>
              <input type="number" value={currentWeight} onChange={(e) => setCurrentWeight(e.target.value)} className="input-field" step="0.1" />
            </div>
          </div>

          <div>
            <label className="label flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> Activity Level</label>
            <select value={activityLevel} onChange={(e) => setActivityLevel(e.target.value as ActivityLevel)} className="input-field">
              <option value="sedentary">Sedentary</option>
              <option value="light">Lightly Active</option>
              <option value="moderate">Moderately Active</option>
              <option value="active">Very Active</option>
              <option value="very_active">Extra Active</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label flex items-center gap-1.5"><Target className="w-3.5 h-3.5" /> Goal</label>
              <select value={weightGoal} onChange={(e) => setWeightGoal(e.target.value as WeightGoal)} className="input-field">
                <option value="lose">Lose Weight</option>
                <option value="maintain">Maintain</option>
                <option value="gain">Gain Weight</option>
              </select>
            </div>
            <div>
              <label className="label flex items-center gap-1.5"><Target className="w-3.5 h-3.5" /> Target (kg)</label>
              <input type="number" value={targetWeight} onChange={(e) => setTargetWeight(e.target.value)} className="input-field" step="0.1" />
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setEditing(false)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {/* Weight Log */}
      <div className="card">
        <button
          onClick={() => setShowWeightLog(!showWeightLog)}
          className="w-full flex items-center justify-between"
        >
          <span className="font-semibold text-slate-900">Log Weight</span>
          {showWeightLog ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {showWeightLog && (
          <div className="mt-4 space-y-3">
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Weight in kg"
                value={newWeight}
                onChange={(e) => setNewWeight(e.target.value)}
                className="input-field flex-1"
                step="0.1"
              />
              <button onClick={logWeight} className="btn-primary !px-4">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Weight Chart */}
      <div className="card">
        <h3 className="font-semibold text-slate-900 mb-3">Weight Progress</h3>
        <WeightChart logs={weightLogs} targetWeight={profile?.target_weight} />
      </div>
    </div>
  )
}
