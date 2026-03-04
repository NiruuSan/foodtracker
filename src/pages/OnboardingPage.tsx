import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { calculateTargets } from '@/lib/nutrition'
import type { Gender, ActivityLevel, WeightGoal } from '@/lib/types'
import { useI18n } from '@/i18n'
import { ChevronRight, ChevronLeft, Scale, Ruler, Calendar, User, Zap, Target } from 'lucide-react'
import toast from 'react-hot-toast'

const ACTIVITY_OPTIONS_BASE: { value: ActivityLevel; labelKey: string; descKey: string }[] = [
  { value: 'sedentary', labelKey: 'onboard_sedentary', descKey: 'onboard_sedentary_desc' },
  { value: 'light', labelKey: 'onboard_light', descKey: 'onboard_light_desc' },
  { value: 'moderate', labelKey: 'onboard_moderate', descKey: 'onboard_moderate_desc' },
  { value: 'active', labelKey: 'onboard_active', descKey: 'onboard_active_desc' },
  { value: 'very_active', labelKey: 'onboard_very_active', descKey: 'onboard_very_active_desc' },
]

export default function OnboardingPage() {
  const { t } = useI18n()
  const { user, refreshProfile } = useAuth()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)

  const [age, setAge] = useState('')
  const [gender, setGender] = useState<Gender>('male')
  const [height, setHeight] = useState('')
  const [currentWeight, setCurrentWeight] = useState('')
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate')
  const [weightGoal, setWeightGoal] = useState<WeightGoal>('maintain')
  const [targetWeight, setTargetWeight] = useState('')

  const STEPS = [
    { title: t('onboard_basic_title'), subtitle: t('onboard_basic_sub') },
    { title: t('onboard_body_title'), subtitle: t('onboard_body_sub') },
    { title: t('onboard_activity_title'), subtitle: t('onboard_activity_sub') },
    { title: t('onboard_goal_title'), subtitle: t('onboard_goal_sub') },
  ]

  const genderLabels: Record<Gender, string> = {
    male: t('onboard_male'),
    female: t('onboard_female'),
    other: t('onboard_other'),
  }

  async function handleComplete() {
    if (!user) return
    setLoading(true)
    try {
      const w = parseFloat(currentWeight)
      const h = parseFloat(height)
      const a = parseInt(age)
      const tw = targetWeight ? parseFloat(targetWeight) : w

      const targets = calculateTargets(w, h, a, gender, activityLevel, weightGoal)

      const { error } = await supabase.from('profiles').update({
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
        onboarding_completed: true,
      }).eq('id', user.id)

      if (error) throw error

      await supabase.from('weight_logs').insert({
        user_id: user.id,
        weight: w,
        logged_at: new Date().toISOString(),
      })

      await refreshProfile()
      toast.success(t('onboard_success'))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  function canProceed(): boolean {
    switch (step) {
      case 0: return !!age && !!gender
      case 1: return !!height && !!currentWeight
      case 2: return !!activityLevel
      case 3: return !!weightGoal
      default: return false
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center p-4" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white">{STEPS[step].title}</h1>
          <p className="text-primary-100">{STEPS[step].subtitle}</p>
        </div>

        <div className="flex gap-2 mb-6 px-4">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-1.5 rounded-full transition-all ${
                i <= step ? 'bg-white' : 'bg-white/30'
              }`}
            />
          ))}
        </div>

        <div className="card min-h-[320px] flex flex-col">
          <div className="flex-1">
            {step === 0 && (
              <div className="space-y-5">
                <div>
                  <label className="label flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> {t('onboard_age')}
                  </label>
                  <input
                    type="number"
                    placeholder="25"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="input-field"
                    min={13}
                    max={120}
                  />
                </div>
                <div>
                  <label className="label flex items-center gap-2">
                    <User className="w-4 h-4" /> {t('onboard_gender')}
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {(['male', 'female', 'other'] as Gender[]).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGender(g)}
                        className={`py-3 rounded-xl font-medium capitalize transition-all ${
                          gender === g
                            ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {genderLabels[g]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <label className="label flex items-center gap-2">
                    <Ruler className="w-4 h-4" /> {t('onboard_height')}
                  </label>
                  <input
                    type="number"
                    placeholder="175"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    className="input-field"
                    min={100}
                    max={250}
                  />
                </div>
                <div>
                  <label className="label flex items-center gap-2">
                    <Scale className="w-4 h-4" /> {t('onboard_weight')}
                  </label>
                  <input
                    type="number"
                    placeholder="75"
                    value={currentWeight}
                    onChange={(e) => setCurrentWeight(e.target.value)}
                    className="input-field"
                    min={30}
                    max={300}
                    step={0.1}
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3">
                {ACTIVITY_OPTIONS_BASE.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setActivityLevel(opt.value)}
                    className={`w-full text-left p-4 rounded-xl transition-all ${
                      activityLevel === opt.value
                        ? 'bg-primary-50 border-2 border-primary-500 shadow-sm'
                        : 'bg-slate-50 border-2 border-transparent hover:border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Zap className={`w-5 h-5 ${
                        activityLevel === opt.value ? 'text-primary-500' : 'text-slate-400'
                      }`} />
                      <div>
                        <p className="font-semibold text-slate-900">{t(opt.labelKey as Parameters<typeof t>[0])}</p>
                        <p className="text-sm text-slate-500">{t(opt.descKey as Parameters<typeof t>[0])}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <div className="grid grid-cols-3 gap-3">
                  {([
                    { value: 'lose' as WeightGoal, labelKey: 'onboard_lose', emoji: '🔥' },
                    { value: 'maintain' as WeightGoal, labelKey: 'onboard_maintain', emoji: '⚖️' },
                    { value: 'gain' as WeightGoal, labelKey: 'onboard_gain', emoji: '💪' },
                  ]).map((g) => (
                    <button
                      key={g.value}
                      type="button"
                      onClick={() => setWeightGoal(g.value)}
                      className={`py-4 rounded-xl font-medium transition-all ${
                        weightGoal === g.value
                          ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <span className="text-2xl block mb-1">{g.emoji}</span>
                      {t(g.labelKey as Parameters<typeof t>[0])}
                    </button>
                  ))}
                </div>
                {weightGoal !== 'maintain' && (
                  <div>
                    <label className="label flex items-center gap-2">
                      <Target className="w-4 h-4" /> {t('onboard_target_weight')}
                    </label>
                    <input
                      type="number"
                      placeholder={weightGoal === 'lose' ? '70' : '80'}
                      value={targetWeight}
                      onChange={(e) => setTargetWeight(e.target.value)}
                      className="input-field"
                      min={30}
                      max={300}
                      step={0.1}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-6">
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                className="btn-secondary flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" /> {t('back')}
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className="btn-primary flex-1 flex items-center justify-center gap-1"
              >
                {t('next')} <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={!canProceed() || loading}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  t('onboard_lets_go')
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
