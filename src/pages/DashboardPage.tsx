import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useI18n } from '@/i18n'
import { supabase } from '@/lib/supabase'
import type { Meal, Exercise, WaterLog, WeightLog, DailyTotals, NutritionDetails } from '@/lib/types'
import ProgressRing from '@/components/ProgressRing'
import WeightChart from '@/components/WeightChart'
import NutritionDetailsView from '@/components/NutritionDetails'
import {
  Flame, Droplets, Plus, Minus, TrendingUp,
  UtensilsCrossed, Dumbbell, ChevronRight, ChevronDown, ChevronUp,
} from 'lucide-react'
import { format, startOfDay, endOfDay } from 'date-fns'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'

export default function DashboardPage() {
  const { user, profile } = useAuth()
  const { t } = useI18n()
  const [meals, setMeals] = useState<Meal[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [waterLogs, setWaterLogs] = useState<WaterLog[]>([])
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([])
  const [loading, setLoading] = useState(true)

  const today = new Date()
  const dayStart = startOfDay(today).toISOString()
  const dayEnd = endOfDay(today).toISOString()

  const fetchData = useCallback(async () => {
    if (!user) return
    const [mealsRes, exercisesRes, waterRes, weightRes] = await Promise.all([
      supabase.from('meals').select('*')
        .eq('user_id', user.id)
        .gte('logged_at', dayStart)
        .lte('logged_at', dayEnd)
        .order('logged_at', { ascending: false }),
      supabase.from('exercises').select('*')
        .eq('user_id', user.id)
        .gte('logged_at', dayStart)
        .lte('logged_at', dayEnd)
        .order('logged_at', { ascending: false }),
      supabase.from('water_logs').select('*')
        .eq('user_id', user.id)
        .gte('logged_at', dayStart)
        .lte('logged_at', dayEnd),
      supabase.from('weight_logs').select('*')
        .eq('user_id', user.id)
        .order('logged_at', { ascending: false })
        .limit(30),
    ])
    setMeals(mealsRes.data ?? [])
    setExercises(exercisesRes.data ?? [])
    setWaterLogs(waterRes.data ?? [])
    setWeightLogs(weightRes.data ?? [])
    setLoading(false)
  }, [user, dayStart, dayEnd])

  useEffect(() => { fetchData() }, [fetchData])

  const totals: DailyTotals = {
    calories: meals.reduce((s, m) => s + Number(m.calories), 0),
    protein: meals.reduce((s, m) => s + Number(m.protein), 0),
    carbs: meals.reduce((s, m) => s + Number(m.carbs), 0),
    fat: meals.reduce((s, m) => s + Number(m.fat), 0),
    water: waterLogs.reduce((s, w) => s + Number(w.amount_ml), 0),
    exercise_calories: exercises.reduce((s, e) => s + Number(e.calories_burned), 0),
  }

  const caloriesGoal = profile?.daily_calories_target ?? 2000

  async function addWater(amount: number) {
    if (!user) return
    if (amount > 0) {
      await supabase.from('water_logs').insert({
        user_id: user.id,
        amount_ml: amount,
        logged_at: new Date().toISOString(),
      })
    } else {
      const lastLog = waterLogs[waterLogs.length - 1]
      if (lastLog) {
        await supabase.from('water_logs').delete().eq('id', lastLog.id)
      }
    }
    toast.success(amount > 0 ? '+250ml water' : 'Removed water log')
    fetchData()
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {t('dash_hey')} {profile?.full_name?.split(' ')[0] || 'there'}!
          </h1>
          <p className="text-slate-500 text-sm">{format(today, 'EEEE, MMMM d')}</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
          <span className="text-lg font-bold text-primary-700">
            {(profile?.full_name?.[0] ?? '?').toUpperCase()}
          </span>
        </div>
      </div>

      {/* Calorie Ring */}
      <div className="card flex items-center gap-5">
        <ProgressRing
          value={totals.calories}
          max={caloriesGoal}
          size={110}
          label="kcal"
        />
        <div className="flex-1 space-y-2.5">
          <div className="flex items-center gap-2 text-sm">
            <Flame className="w-4 h-4 text-orange-500" />
            <span className="text-slate-600">{t('dash_eaten')}</span>
            <span className="ml-auto font-semibold">{Math.round(totals.calories)} kcal</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="w-4 h-4 text-primary-500" />
            <span className="text-slate-600">{t('dash_remaining')}</span>
            <span className="ml-auto font-bold text-primary-600">
              {Math.max(0, Math.round(caloriesGoal - totals.calories))} kcal
            </span>
          </div>
          {totals.exercise_calories > 0 && (
            <>
              <div className="h-px bg-slate-100" />
              <div className="flex items-center gap-2 text-sm">
                <Dumbbell className="w-4 h-4 text-blue-500" />
                <span className="text-slate-400">{t('dash_burned')}</span>
                <span className="ml-auto font-medium text-slate-400">{Math.round(totals.exercise_calories)} kcal</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Macros */}
      <MacrosSection meals={meals} totals={totals} profile={profile} />

      {/* Water */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Droplets className="w-5 h-5 text-blue-500" />
            <span className="font-semibold text-slate-900">{t('dash_water')}</span>
          </div>
          <span className="text-sm text-slate-500">
            {(totals.water / 1000).toFixed(1)}L / {((profile?.daily_water_target ?? 2500) / 1000).toFixed(1)}L
          </span>
        </div>
        <div className="h-3 bg-blue-100 rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-500"
            style={{
              width: `${Math.min((totals.water / (profile?.daily_water_target ?? 2500)) * 100, 100)}%`,
            }}
          />
        </div>
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => addWater(-250)}
            className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
          >
            <Minus className="w-4 h-4 text-slate-600" />
          </button>
          <span className="text-sm font-medium text-slate-500">250ml</span>
          <button
            onClick={() => addWater(250)}
            className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Weight Chart */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <span className="font-semibold text-slate-900">{t('dash_weight_progress')}</span>
          <Link to="/profile" className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-0.5">
            {t('dash_log')} <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        <WeightChart logs={weightLogs} targetWeight={profile?.target_weight} />
      </div>

      {/* Recent Meals */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <span className="font-semibold text-slate-900">{t('dash_today_meals')}</span>
          <Link to="/meals" className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-0.5">
            {t('dash_add')} <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        {meals.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-4">{t('dash_no_meals')}</p>
        ) : (
          <div className="space-y-2">
            {meals.slice(0, 5).map((meal) => (
              <div key={meal.id} className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-xl">
                <div className="w-9 h-9 rounded-lg bg-primary-100 flex items-center justify-center">
                  <UtensilsCrossed className="w-4 h-4 text-primary-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{meal.name}</p>
                  <p className="text-xs text-slate-500">{format(new Date(meal.logged_at), 'h:mm a')}</p>
                </div>
                <span className="text-sm font-semibold text-slate-700">{Math.round(Number(meal.calories))} kcal</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Exercises */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <span className="font-semibold text-slate-900">{t('dash_today_exercises')}</span>
          <Link to="/exercise" className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-0.5">
            {t('dash_add')} <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        {exercises.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-4">{t('dash_no_exercises')}</p>
        ) : (
          <div className="space-y-2">
            {exercises.slice(0, 5).map((ex) => (
              <div key={ex.id} className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-xl">
                <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Dumbbell className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{ex.name}</p>
                  <p className="text-xs text-slate-500">{ex.duration_minutes} min</p>
                </div>
                <span className="text-sm font-semibold text-orange-600">-{Math.round(Number(ex.calories_burned))} kcal</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function aggregateNutritionDetails(meals: Meal[]): NutritionDetails {
  const result: NutritionDetails = {
    fat_details: {},
    carb_details: {},
    vitamins: {},
    minerals: {},
  }

  for (const meal of meals) {
    const d = meal.nutrition_details
    if (!d) continue

    for (const [key, val] of Object.entries(d.fat_details ?? {})) {
      if (val != null) {
        (result.fat_details as Record<string, number>)[key] =
          ((result.fat_details as Record<string, number>)[key] ?? 0) + val
      }
    }
    for (const [key, val] of Object.entries(d.carb_details ?? {})) {
      if (val != null && key !== 'glycemic_index') {
        (result.carb_details as Record<string, number>)[key] =
          ((result.carb_details as Record<string, number>)[key] ?? 0) + val
      }
    }
    for (const [key, val] of Object.entries(d.vitamins ?? {})) {
      if (val != null) {
        (result.vitamins as Record<string, number>)[key] =
          ((result.vitamins as Record<string, number>)[key] ?? 0) + val
      }
    }
    for (const [key, val] of Object.entries(d.minerals ?? {})) {
      if (val != null) {
        (result.minerals as Record<string, number>)[key] =
          ((result.minerals as Record<string, number>)[key] ?? 0) + val
      }
    }
  }

  // Round all values
  for (const section of [result.fat_details, result.carb_details, result.vitamins, result.minerals]) {
    if (!section) continue
    for (const key of Object.keys(section)) {
      const s = section as Record<string, number>
      s[key] = Math.round(s[key] * 10) / 10
    }
  }

  return result
}

interface MacrosSectionProps {
  meals: Meal[]
  totals: DailyTotals
  profile: { daily_protein_target?: number | null; daily_carbs_target?: number | null; daily_fat_target?: number | null } | null
}

function MacrosSection({ meals, totals, profile }: MacrosSectionProps) {
  const { t } = useI18n()
  const [showDetails, setShowDetails] = useState(false)
  const aggregated = aggregateNutritionDetails(meals)
  const hasDetails = meals.some((m) => m.nutrition_details != null)

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-3">
        {([
          { key: 'protein', labelKey: 'dash_protein' as const, value: totals.protein, max: profile?.daily_protein_target ?? 150, color: '#3b82f6', unit: 'g' },
          { key: 'carbs', labelKey: 'dash_carbs' as const, value: totals.carbs, max: profile?.daily_carbs_target ?? 200, color: '#f59e0b', unit: 'g' },
          { key: 'fat', labelKey: 'dash_fat' as const, value: totals.fat, max: profile?.daily_fat_target ?? 65, color: '#ef4444', unit: 'g' },
        ]).map((macro) => {
          const pct = Math.min((macro.value / macro.max) * 100, 100)
          return (
            <div key={macro.key} className="card !p-3 text-center">
              <p className="text-xs text-slate-500 mb-1">{t(macro.labelKey)}</p>
              <p className="text-lg font-bold" style={{ color: macro.color }}>
                {Math.round(macro.value)}
              </p>
              <div className="h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: macro.color }}
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">/ {macro.max}{macro.unit}</p>
            </div>
          )
        })}
      </div>
      {hasDetails && (
        <>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors"
          >
            {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {showDetails ? t('dash_hide_details') : t('dash_view_details')}
          </button>
          {showDetails && (
            <div className="card !p-3">
              <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">{t('dash_daily_totals')}</p>
              <NutritionDetailsView details={aggregated} />
            </div>
          )}
        </>
      )}
    </div>
  )
}
