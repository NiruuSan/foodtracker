import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { calculateTargets } from '@/lib/nutrition'
import type { Gender, ActivityLevel, WeightGoal } from '@/lib/types'
import { ChevronRight, ChevronLeft, Scale, Ruler, Calendar, User, Zap, Target } from 'lucide-react'
import toast from 'react-hot-toast'

const STEPS = [
  { title: 'Basic Info', subtitle: 'Tell us about yourself' },
  { title: 'Body Stats', subtitle: 'Your current measurements' },
  { title: 'Activity Level', subtitle: 'How active are you?' },
  { title: 'Your Goal', subtitle: 'What do you want to achieve?' },
]

const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string; desc: string }[] = [
  { value: 'sedentary', label: 'Sedentary', desc: 'Little to no exercise' },
  { value: 'light', label: 'Lightly Active', desc: 'Light exercise 1-3 days/week' },
  { value: 'moderate', label: 'Moderately Active', desc: 'Moderate exercise 3-5 days/week' },
  { value: 'active', label: 'Very Active', desc: 'Hard exercise 6-7 days/week' },
  { value: 'very_active', label: 'Extra Active', desc: 'Very hard exercise & physical job' },
]

export default function OnboardingPage() {
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
      toast.success('All set! Welcome to FitTrack!')
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
                    <Calendar className="w-4 h-4" /> Age
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
                    <User className="w-4 h-4" /> Gender
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
                        {g}
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
                    <Ruler className="w-4 h-4" /> Height (cm)
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
                    <Scale className="w-4 h-4" /> Current Weight (kg)
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
                {ACTIVITY_OPTIONS.map((opt) => (
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
                        <p className="font-semibold text-slate-900">{opt.label}</p>
                        <p className="text-sm text-slate-500">{opt.desc}</p>
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
                    { value: 'lose' as WeightGoal, label: 'Lose', emoji: '🔥' },
                    { value: 'maintain' as WeightGoal, label: 'Maintain', emoji: '⚖️' },
                    { value: 'gain' as WeightGoal, label: 'Gain', emoji: '💪' },
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
                      {g.label}
                    </button>
                  ))}
                </div>
                {weightGoal !== 'maintain' && (
                  <div>
                    <label className="label flex items-center gap-2">
                      <Target className="w-4 h-4" /> Target Weight (kg)
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
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className="btn-primary flex-1 flex items-center justify-center gap-1"
              >
                Next <ChevronRight className="w-4 h-4" />
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
                  "Let's Go! 🚀"
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
