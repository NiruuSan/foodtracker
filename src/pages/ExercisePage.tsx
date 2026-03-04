import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { EXERCISE_TEMPLATES, EXERCISE_CATEGORIES } from '@/lib/exercises-data'
import type { Exercise } from '@/lib/types'
import {
  X, Dumbbell, Clock, Flame, Trash2, Search, PencilLine
} from 'lucide-react'
import { format, startOfDay, endOfDay } from 'date-fns'
import toast from 'react-hot-toast'

export default function ExercisePage() {
  const { user } = useAuth()
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [tab, setTab] = useState<'list' | 'manual'>('list')
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('All')

  // Form state
  const [name, setName] = useState('')
  const [exerciseType, setExerciseType] = useState('')
  const [duration, setDuration] = useState('')
  const [caloriesBurned, setCaloriesBurned] = useState('')
  const [description, setDescription] = useState('')

  const today = new Date()

  const fetchExercises = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('exercises')
      .select('*')
      .eq('user_id', user.id)
      .gte('logged_at', startOfDay(today).toISOString())
      .lte('logged_at', endOfDay(today).toISOString())
      .order('logged_at', { ascending: false })
    setExercises(data ?? [])
  }, [user])

  useEffect(() => { fetchExercises() }, [fetchExercises])

  function selectTemplate(templateName: string) {
    const tmpl = EXERCISE_TEMPLATES.find((t) => t.name === templateName)
    if (!tmpl) return
    setName(tmpl.name)
    setExerciseType(tmpl.type)
    setDuration('')
    setCaloriesBurned('')
  }

  function updateCaloriesFromDuration(mins: string) {
    setDuration(mins)
    const tmpl = EXERCISE_TEMPLATES.find((t) => t.name === name)
    if (tmpl && mins) {
      setCaloriesBurned(String(Math.round(tmpl.caloriesPerMinute * parseFloat(mins))))
    }
  }

  async function handleSave() {
    if (!user || !name.trim() || !duration) return
    setLoading(true)
    const { error } = await supabase.from('exercises').insert({
      user_id: user.id,
      name: name.trim(),
      description: description || null,
      exercise_type: exerciseType || 'Other',
      duration_minutes: parseInt(duration),
      calories_burned: parseFloat(caloriesBurned) || 0,
      logged_at: new Date().toISOString(),
    })
    setLoading(false)
    if (error) {
      toast.error('Failed to save exercise')
    } else {
      toast.success('Exercise logged!')
      resetForm()
      setShowAdd(false)
      fetchExercises()
    }
  }

  async function handleDelete(id: string) {
    await supabase.from('exercises').delete().eq('id', id)
    toast.success('Exercise deleted')
    fetchExercises()
  }

  function resetForm() {
    setName('')
    setExerciseType('')
    setDuration('')
    setCaloriesBurned('')
    setDescription('')
    setSearchQuery('')
  }

  const filteredTemplates = EXERCISE_TEMPLATES.filter((t) => {
    const matchSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchCat = selectedCategory === 'All' || t.type === selectedCategory
    return matchSearch && matchCat
  })

  const totalBurned = exercises.reduce((s, e) => s + Number(e.calories_burned), 0)
  const totalMinutes = exercises.reduce((s, e) => s + Number(e.duration_minutes), 0)

  return (
    <div className="space-y-5 pb-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Exercise</h1>
          <p className="text-slate-500 text-sm">{format(today, 'EEEE, MMMM d')}</p>
        </div>
        <button onClick={() => { setShowAdd(!showAdd); resetForm() }} className="btn-primary !py-2 !px-4 text-sm">
          {showAdd ? <X className="w-4 h-4" /> : '+ Log Exercise'}
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card !p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center">
            <Flame className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Burned</p>
            <p className="font-bold text-lg text-slate-900">{Math.round(totalBurned)} kcal</p>
          </div>
        </div>
        <div className="card !p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
            <Clock className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Active</p>
            <p className="font-bold text-lg text-slate-900">{totalMinutes} min</p>
          </div>
        </div>
      </div>

      {/* Add Exercise */}
      {showAdd && (
        <div className="card space-y-4 animate-slide-up">
          <div className="flex bg-slate-100 rounded-xl p-1 mb-2">
            <button
              onClick={() => setTab('list')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
              }`}
            >
              <Search className="w-3.5 h-3.5 inline mr-1" /> Browse
            </button>
            <button
              onClick={() => setTab('manual')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === 'manual' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
              }`}
            >
              <PencilLine className="w-3.5 h-3.5 inline mr-1" /> Manual
            </button>
          </div>

          {tab === 'list' && (
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Search exercises..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field"
              />
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {['All', ...EXERCISE_CATEGORIES].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                      selectedCategory === cat
                        ? 'bg-primary-500 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto">
                {filteredTemplates.map((tmpl) => (
                  <button
                    key={tmpl.name}
                    onClick={() => selectTemplate(tmpl.name)}
                    className={`p-3 rounded-xl text-left transition-all ${
                      name === tmpl.name
                        ? 'bg-primary-50 border-2 border-primary-500'
                        : 'bg-slate-50 border-2 border-transparent hover:border-slate-200'
                    }`}
                  >
                    <span className="text-lg">{tmpl.icon}</span>
                    <p className="text-sm font-medium mt-1">{tmpl.name}</p>
                    <p className="text-[10px] text-slate-500">{tmpl.type} · ~{tmpl.caloriesPerMinute} cal/min</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {tab === 'manual' && (
            <div className="space-y-3">
              <div>
                <label className="label">Exercise Name</label>
                <input
                  type="text"
                  placeholder="e.g. Morning jog"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="label">Description (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Easy pace around the park"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>
          )}

          {/* Duration & Calories - always visible when exercise selected */}
          {name && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Duration (min)</label>
                <input
                  type="number"
                  placeholder="30"
                  value={duration}
                  onChange={(e) => updateCaloriesFromDuration(e.target.value)}
                  className="input-field"
                  min={1}
                />
              </div>
              <div>
                <label className="label">Calories Burned</label>
                <input
                  type="number"
                  placeholder="0"
                  value={caloriesBurned}
                  onChange={(e) => setCaloriesBurned(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={loading || !name.trim() || !duration}
            className="btn-primary w-full"
          >
            {loading ? 'Saving...' : 'Log Exercise'}
          </button>
        </div>
      )}

      {/* Exercise List */}
      <div className="space-y-2">
        {exercises.map((ex) => (
          <div key={ex.id} className="card !p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <Dumbbell className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-900 truncate">{ex.name}</p>
              <p className="text-xs text-slate-500">
                {ex.duration_minutes} min · {ex.exercise_type}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-semibold text-orange-600">-{Math.round(Number(ex.calories_burned))}</p>
              <p className="text-[10px] text-slate-500">kcal</p>
            </div>
            <button
              onClick={() => handleDelete(ex.id)}
              className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        {exercises.length === 0 && !showAdd && (
          <div className="text-center py-12">
            <Dumbbell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No exercises logged today</p>
            <button onClick={() => setShowAdd(true)} className="btn-primary mt-4">
              Log Your First Exercise
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
