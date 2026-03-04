import type { Gender, ActivityLevel, WeightGoal } from './types'

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
}

/**
 * Mifflin-St Jeor equation for BMR
 */
function calculateBMR(weight: number, height: number, age: number, gender: Gender): number {
  const base = 10 * weight + 6.25 * height - 5 * age
  if (gender === 'male') return base + 5
  if (gender === 'female') return base - 161
  return base - 78 // average for 'other'
}

export function calculateTDEE(
  weight: number,
  height: number,
  age: number,
  gender: Gender,
  activityLevel: ActivityLevel
): number {
  const bmr = calculateBMR(weight, height, age, gender)
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activityLevel])
}

export interface NutritionTargets {
  calories: number
  protein: number
  carbs: number
  fat: number
  water: number
}

export function calculateTargets(
  weight: number,
  height: number,
  age: number,
  gender: Gender,
  activityLevel: ActivityLevel,
  weightGoal: WeightGoal
): NutritionTargets {
  const tdee = calculateTDEE(weight, height, age, gender, activityLevel)

  let calories: number
  let proteinPct: number
  let carbsPct: number
  let fatPct: number

  switch (weightGoal) {
    case 'lose':
      calories = tdee - 500
      proteinPct = 0.40
      carbsPct = 0.30
      fatPct = 0.30
      break
    case 'gain':
      calories = tdee + 300
      proteinPct = 0.30
      carbsPct = 0.45
      fatPct = 0.25
      break
    default:
      calories = tdee
      proteinPct = 0.30
      carbsPct = 0.40
      fatPct = 0.30
  }

  calories = Math.max(calories, 1200)

  return {
    calories: Math.round(calories),
    protein: Math.round((calories * proteinPct) / 4),   // 4 cal/g
    carbs: Math.round((calories * carbsPct) / 4),       // 4 cal/g
    fat: Math.round((calories * fatPct) / 9),            // 9 cal/g
    water: Math.round(weight * 35),                      // 35ml per kg
  }
}
