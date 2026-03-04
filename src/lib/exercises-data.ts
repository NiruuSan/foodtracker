export interface ExerciseTemplate {
  name: string
  type: string
  caloriesPerMinute: number
  icon: string
}

export const EXERCISE_CATEGORIES = [
  'Cardio',
  'Strength',
  'Flexibility',
  'Sports',
  'Other',
] as const

export const EXERCISE_TEMPLATES: ExerciseTemplate[] = [
  { name: 'Running', type: 'Cardio', caloriesPerMinute: 11.5, icon: '🏃' },
  { name: 'Walking', type: 'Cardio', caloriesPerMinute: 4.5, icon: '🚶' },
  { name: 'Cycling', type: 'Cardio', caloriesPerMinute: 9.5, icon: '🚴' },
  { name: 'Swimming', type: 'Cardio', caloriesPerMinute: 10, icon: '🏊' },
  { name: 'Jump Rope', type: 'Cardio', caloriesPerMinute: 12, icon: '⏭' },
  { name: 'Rowing', type: 'Cardio', caloriesPerMinute: 8.5, icon: '🚣' },
  { name: 'Elliptical', type: 'Cardio', caloriesPerMinute: 8, icon: '🏋' },
  { name: 'Stair Climbing', type: 'Cardio', caloriesPerMinute: 9, icon: '🪜' },
  { name: 'HIIT', type: 'Cardio', caloriesPerMinute: 13, icon: '⚡' },
  { name: 'Weight Training', type: 'Strength', caloriesPerMinute: 6, icon: '🏋️' },
  { name: 'Push-ups', type: 'Strength', caloriesPerMinute: 7, icon: '💪' },
  { name: 'Pull-ups', type: 'Strength', caloriesPerMinute: 8, icon: '🤸' },
  { name: 'Squats', type: 'Strength', caloriesPerMinute: 6.5, icon: '🦵' },
  { name: 'Deadlifts', type: 'Strength', caloriesPerMinute: 7, icon: '🏋️‍♂️' },
  { name: 'Bench Press', type: 'Strength', caloriesPerMinute: 5.5, icon: '💪' },
  { name: 'Yoga', type: 'Flexibility', caloriesPerMinute: 3.5, icon: '🧘' },
  { name: 'Stretching', type: 'Flexibility', caloriesPerMinute: 2.5, icon: '🤸‍♂️' },
  { name: 'Pilates', type: 'Flexibility', caloriesPerMinute: 4, icon: '🧘‍♀️' },
  { name: 'Basketball', type: 'Sports', caloriesPerMinute: 8, icon: '🏀' },
  { name: 'Soccer', type: 'Sports', caloriesPerMinute: 9, icon: '⚽' },
  { name: 'Tennis', type: 'Sports', caloriesPerMinute: 8, icon: '🎾' },
  { name: 'Boxing', type: 'Sports', caloriesPerMinute: 11, icon: '🥊' },
  { name: 'Dance', type: 'Other', caloriesPerMinute: 6, icon: '💃' },
  { name: 'Hiking', type: 'Other', caloriesPerMinute: 7, icon: '🥾' },
  { name: 'Rock Climbing', type: 'Other', caloriesPerMinute: 10, icon: '🧗' },
]
