export type Gender = 'male' | 'female' | 'other'
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
export type WeightGoal = 'lose' | 'maintain' | 'gain'
export type MealInputMethod = 'barcode' | 'photo' | 'text' | 'manual'
export type FriendshipStatus = 'pending' | 'accepted' | 'rejected'
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export interface Profile {
  id: string
  email: string
  full_name: string
  avatar_url: string | null
  current_weight: number | null
  target_weight: number | null
  height: number | null
  age: number | null
  gender: Gender | null
  activity_level: ActivityLevel | null
  weight_goal: WeightGoal | null
  daily_calories_target: number | null
  daily_protein_target: number | null
  daily_carbs_target: number | null
  daily_fat_target: number | null
  daily_water_target: number | null
  onboarding_completed: boolean
  created_at: string
  updated_at: string
}

export interface FatDetails {
  saturated?: number
  monounsaturated?: number
  polyunsaturated?: number
  omega3?: number
  omega6?: number
  trans?: number
  cholesterol?: number
}

export interface CarbDetails {
  sugar?: number
  fiber?: number
  starch?: number
  polyols?: number
  glycemic_index?: number
}

export interface Vitamins {
  a?: number
  c?: number
  d?: number
  e?: number
  k?: number
  b1?: number
  b2?: number
  b3?: number
  b5?: number
  b6?: number
  b9?: number
  b12?: number
}

export interface Minerals {
  calcium?: number
  iron?: number
  magnesium?: number
  phosphorus?: number
  potassium?: number
  sodium?: number
  zinc?: number
  selenium?: number
  manganese?: number
  copper?: number
  iodine?: number
}

export interface NutritionDetails {
  fat_details?: FatDetails
  carb_details?: CarbDetails
  vitamins?: Vitamins
  minerals?: Minerals
}

export interface Meal {
  id: string
  user_id: string
  name: string
  description: string | null
  meal_type: MealType
  input_method: MealInputMethod
  photo_url: string | null
  calories: number
  protein: number
  carbs: number
  fat: number
  nutrition_details: NutritionDetails | null
  logged_at: string
  created_at: string
}

export interface Exercise {
  id: string
  user_id: string
  name: string
  description: string | null
  exercise_type: string
  duration_minutes: number
  calories_burned: number
  details: Record<string, unknown> | null
  logged_at: string
  created_at: string
}

export interface WaterLog {
  id: string
  user_id: string
  amount_ml: number
  logged_at: string
  created_at: string
}

export interface WeightLog {
  id: string
  user_id: string
  weight: number
  logged_at: string
  created_at: string
}

export interface Friendship {
  id: string
  requester_id: string
  addressee_id: string
  status: FriendshipStatus
  created_at: string
  requester?: Profile
  addressee?: Profile
}

export interface DailyTotals {
  calories: number
  protein: number
  carbs: number
  fat: number
  water: number
  exercise_calories: number
}

export interface LeaderboardEntry {
  user_id: string
  full_name: string
  avatar_url: string | null
  streak: number
  weight_progress: number
  weekly_activity: number
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Partial<Profile> & { id: string }
        Update: Partial<Profile>
      }
      meals: {
        Row: Meal
        Insert: Omit<Meal, 'id' | 'created_at'>
        Update: Partial<Meal>
      }
      exercises: {
        Row: Exercise
        Insert: Omit<Exercise, 'id' | 'created_at'>
        Update: Partial<Exercise>
      }
      water_logs: {
        Row: WaterLog
        Insert: Omit<WaterLog, 'id' | 'created_at'>
        Update: Partial<WaterLog>
      }
      weight_logs: {
        Row: WeightLog
        Insert: Omit<WeightLog, 'id' | 'created_at'>
        Update: Partial<WeightLog>
      }
      friendships: {
        Row: Friendship
        Insert: Omit<Friendship, 'id' | 'created_at'>
        Update: Partial<Friendship>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
