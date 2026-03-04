import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { lookupBarcode, analyzePhoto, analyzeText } from '@/lib/food-api'
import type { Meal, MealType, MealInputMethod, NutritionDetails } from '@/lib/types'
import type { FoodLookupResult } from '@/lib/food-api'
import BarcodeScanner from '@/components/BarcodeScanner'
import NutritionDetailsView from '@/components/NutritionDetails'
import {
  ScanBarcode, Camera, MessageSquare, PencilLine,
  X, Search, Loader2, UtensilsCrossed, Trash2,
  ChevronDown, ChevronUp,
} from 'lucide-react'
import { format, startOfDay, endOfDay } from 'date-fns'
import toast from 'react-hot-toast'

type InputTab = 'barcode' | 'photo' | 'text' | 'manual'

const INPUT_TABS: { id: InputTab; label: string; icon: typeof ScanBarcode }[] = [
  { id: 'barcode', label: 'Barcode', icon: ScanBarcode },
  { id: 'photo', label: 'Photo', icon: Camera },
  { id: 'text', label: 'AI Text', icon: MessageSquare },
  { id: 'manual', label: 'Manual', icon: PencilLine },
]

const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
]

export default function MealsPage() {
  const { user } = useAuth()
  const [meals, setMeals] = useState<Meal[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [activeTab, setActiveTab] = useState<InputTab>('manual')
  const [loading, setLoading] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [mealType, setMealType] = useState<MealType>('lunch')
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')
  const [nutritionDetails, setNutritionDetails] = useState<NutritionDetails>({})
  const [showDetails, setShowDetails] = useState(false)
  const [barcodeInput, setBarcodeInput] = useState('')
  const [textDesc, setTextDesc] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [analyzing, setAnalyzing] = useState(false)

  const today = new Date()

  const fetchMeals = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('meals')
      .select('*')
      .eq('user_id', user.id)
      .gte('logged_at', startOfDay(today).toISOString())
      .lte('logged_at', endOfDay(today).toISOString())
      .order('logged_at', { ascending: false })
    setMeals(data ?? [])
  }, [user])

  useEffect(() => { fetchMeals() }, [fetchMeals])

  function applyResult(result: FoodLookupResult, method: MealInputMethod) {
    setName(result.name)
    setCalories(String(result.calories))
    setProtein(String(result.protein))
    setCarbs(String(result.carbs))
    setFat(String(result.fat))
    if (result.nutrition_details) {
      setNutritionDetails(result.nutrition_details)
      setShowDetails(true)
    }
    setActiveTab(method as InputTab)
    toast.success(`Found: ${result.name}`)
  }

  async function handleBarcodeLookup(code: string) {
    setScanning(false)
    setAnalyzing(true)
    const result = await lookupBarcode(code)
    setAnalyzing(false)
    if (result) {
      applyResult(result, 'barcode')
    } else {
      toast.error('Product not found. Try manual entry.')
    }
  }

  async function handleBarcodeManual() {
    if (!barcodeInput.trim()) return
    await handleBarcodeLookup(barcodeInput.trim())
  }

  async function handlePhotoAnalyze() {
    if (!photoFile) return
    setAnalyzing(true)
    try {
      const result = await analyzePhoto(photoFile)
      if (result) {
        applyResult(result, 'photo')
      } else {
        toast.error('Could not analyze photo. Try text or manual entry.')
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to analyze photo')
    }
    setAnalyzing(false)
  }

  async function handleTextAnalyze() {
    if (!textDesc.trim()) return
    setAnalyzing(true)
    try {
      const result = await analyzeText(textDesc.trim())
      if (result) {
        applyResult(result, 'text')
      } else {
        toast.error('Could not parse description. Try manual entry.')
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to analyze text')
    }
    setAnalyzing(false)
  }

  async function handleSave() {
    if (!user || !name.trim()) return
    setLoading(true)
    const hasDetails = Object.keys(nutritionDetails).length > 0

    const { error } = await supabase.from('meals').insert({
      user_id: user.id,
      name: name.trim(),
      meal_type: mealType,
      input_method: activeTab as MealInputMethod,
      calories: parseFloat(calories) || 0,
      protein: parseFloat(protein) || 0,
      carbs: parseFloat(carbs) || 0,
      fat: parseFloat(fat) || 0,
      nutrition_details: hasDetails ? nutritionDetails : null,
      logged_at: new Date().toISOString(),
    })
    setLoading(false)
    if (error) {
      toast.error('Failed to save meal')
    } else {
      toast.success('Meal logged!')
      resetForm()
      setShowAdd(false)
      fetchMeals()
    }
  }

  async function handleDelete(id: string) {
    await supabase.from('meals').delete().eq('id', id)
    toast.success('Meal deleted')
    fetchMeals()
  }

  function resetForm() {
    setName('')
    setCalories('')
    setProtein('')
    setCarbs('')
    setFat('')
    setNutritionDetails({})
    setShowDetails(false)
    setBarcodeInput('')
    setTextDesc('')
    setPhotoFile(null)
  }

  const todayCalories = meals.reduce((s, m) => s + Number(m.calories), 0)

  return (
    <div className="space-y-5 pb-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Meals</h1>
          <p className="text-slate-500 text-sm">{format(today, 'EEEE, MMMM d')}</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-primary !py-2 !px-4 text-sm">
          {showAdd ? <X className="w-4 h-4" /> : '+ Log Meal'}
        </button>
      </div>

      {/* Summary */}
      <div className="card !p-3 flex items-center justify-between">
        <span className="text-sm text-slate-600">Today's total</span>
        <span className="font-bold text-lg text-primary-600">{Math.round(todayCalories)} kcal</span>
      </div>

      {/* Add Meal Form */}
      {showAdd && (
        <div className="card space-y-4 animate-slide-up">
          {/* Input Tabs */}
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
            {INPUT_TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium transition-all ${
                  activeTab === id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* Barcode Tab */}
          {activeTab === 'barcode' && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter barcode number..."
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  className="input-field flex-1"
                />
                <button onClick={handleBarcodeManual} className="btn-primary !px-4" disabled={analyzing}>
                  {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </button>
              </div>
              <button
                onClick={() => setScanning(true)}
                className="btn-secondary w-full flex items-center justify-center gap-2"
              >
                <ScanBarcode className="w-4 h-4" /> Scan with Camera
              </button>
            </div>
          )}

          {/* Photo Tab */}
          {activeTab === 'photo' && (
            <div className="space-y-3">
              <label className="block">
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center cursor-pointer hover:border-primary-400 transition-colors">
                  <Camera className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-600">
                    {photoFile ? photoFile.name : 'Tap to take or upload a photo'}
                  </p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
                />
              </label>
              <button
                onClick={handlePhotoAnalyze}
                disabled={!photoFile || analyzing}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {analyzing ? 'Analyzing...' : 'Analyze Photo'}
              </button>
            </div>
          )}

          {/* Text Tab */}
          {activeTab === 'text' && (
            <div className="space-y-3">
              <textarea
                placeholder="Describe your meal... e.g. 'grilled chicken breast with rice and steamed broccoli'"
                value={textDesc}
                onChange={(e) => setTextDesc(e.target.value)}
                className="input-field min-h-[100px] resize-none"
              />
              <button
                onClick={handleTextAnalyze}
                disabled={!textDesc.trim() || analyzing}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                {analyzing ? 'Analyzing...' : 'Estimate Nutrition'}
              </button>
            </div>
          )}

          {/* Meal Type */}
          <div>
            <label className="label">Meal Type</label>
            <div className="grid grid-cols-4 gap-2">
              {MEAL_TYPES.map((mt) => (
                <button
                  key={mt.value}
                  onClick={() => setMealType(mt.value)}
                  className={`py-2 rounded-lg text-xs font-medium transition-all ${
                    mealType === mt.value
                      ? 'bg-primary-500 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {mt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Basic Nutrition Fields */}
          <div>
            <label className="label">Food Name</label>
            <input
              type="text"
              placeholder="e.g. Chicken Breast & Rice"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Calories</label>
              <input type="number" placeholder="0" value={calories} onChange={(e) => setCalories(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="label">Protein (g)</label>
              <input type="number" placeholder="0" value={protein} onChange={(e) => setProtein(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="label">Carbs (g)</label>
              <input type="number" placeholder="0" value={carbs} onChange={(e) => setCarbs(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="label">Fat (g)</label>
              <input type="number" placeholder="0" value={fat} onChange={(e) => setFat(e.target.value)} className="input-field" />
            </div>
          </div>

          {/* Detailed Nutrition Toggle */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
          >
            {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {showDetails ? 'Hide detailed nutrition' : 'Show detailed nutrition'}
          </button>

          {showDetails && (
            <NutritionDetailsView
              details={nutritionDetails}
              editable
              onChange={setNutritionDetails}
            />
          )}

          <button
            onClick={handleSave}
            disabled={loading || !name.trim()}
            className="btn-primary w-full"
          >
            {loading ? 'Saving...' : 'Save Meal'}
          </button>
        </div>
      )}

      {/* Meal List */}
      <div className="space-y-3">
        {MEAL_TYPES.map((mt) => {
          const typeMeals = meals.filter((m) => m.meal_type === mt.value)
          if (typeMeals.length === 0) return null
          return (
            <div key={mt.value}>
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">
                {mt.label}
              </h3>
              <div className="space-y-2">
                {typeMeals.map((meal) => (
                  <div key={meal.id} className="card !p-0 overflow-hidden">
                    <div className="flex items-center gap-3 p-3">
                      <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
                        <UtensilsCrossed className="w-5 h-5 text-primary-600" />
                      </div>
                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => setExpandedMeal(expandedMeal === meal.id ? null : meal.id)}
                      >
                        <p className="font-medium text-slate-900 truncate">{meal.name}</p>
                        <p className="text-xs text-slate-500">
                          P:{Math.round(Number(meal.protein))}g · C:{Math.round(Number(meal.carbs))}g · F:{Math.round(Number(meal.fat))}g
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-semibold text-slate-900">{Math.round(Number(meal.calories))}</p>
                        <p className="text-[10px] text-slate-500">kcal</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {meal.nutrition_details && (
                          <button
                            onClick={() => setExpandedMeal(expandedMeal === meal.id ? null : meal.id)}
                            className="p-1.5 text-slate-400 hover:text-primary-500 transition-colors"
                          >
                            {expandedMeal === meal.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(meal.id)}
                          className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {expandedMeal === meal.id && meal.nutrition_details && (
                      <div className="px-3 pb-3 border-t border-slate-100 pt-3">
                        <NutritionDetailsView details={meal.nutrition_details} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
        {meals.length === 0 && !showAdd && (
          <div className="text-center py-12">
            <UtensilsCrossed className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No meals logged today</p>
            <button onClick={() => setShowAdd(true)} className="btn-primary mt-4">
              Log Your First Meal
            </button>
          </div>
        )}
      </div>

      {/* Barcode Scanner Overlay */}
      {scanning && (
        <BarcodeScanner
          onScan={handleBarcodeLookup}
          onClose={() => setScanning(false)}
        />
      )}
    </div>
  )
}
