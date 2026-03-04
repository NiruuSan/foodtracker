import { useState } from 'react'
import type { NutritionDetails as NutritionDetailsType } from '@/lib/types'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface Props {
  details: NutritionDetailsType | null | undefined
  editable?: boolean
  onChange?: (details: NutritionDetailsType) => void
}

interface NutrientRow {
  key: string
  label: string
  unit: string
  indent?: boolean
}

const FAT_ROWS: NutrientRow[] = [
  { key: 'saturated', label: 'Saturated Fat', unit: 'g' },
  { key: 'monounsaturated', label: 'Monounsaturated Fat', unit: 'g' },
  { key: 'polyunsaturated', label: 'Polyunsaturated Fat', unit: 'g' },
  { key: 'omega3', label: 'Omega-3', unit: 'g', indent: true },
  { key: 'omega6', label: 'Omega-6', unit: 'g', indent: true },
  { key: 'trans', label: 'Trans Fat', unit: 'g' },
  { key: 'cholesterol', label: 'Cholesterol', unit: 'mg' },
]

const CARB_ROWS: NutrientRow[] = [
  { key: 'sugar', label: 'Sugars', unit: 'g' },
  { key: 'fiber', label: 'Fiber', unit: 'g' },
  { key: 'starch', label: 'Starch', unit: 'g' },
  { key: 'polyols', label: 'Polyols', unit: 'g' },
  { key: 'glycemic_index', label: 'Glycemic Index', unit: '' },
]

const VITAMIN_ROWS: NutrientRow[] = [
  { key: 'a', label: 'Vitamin A', unit: 'µg' },
  { key: 'c', label: 'Vitamin C', unit: 'mg' },
  { key: 'd', label: 'Vitamin D', unit: 'µg' },
  { key: 'e', label: 'Vitamin E', unit: 'mg' },
  { key: 'k', label: 'Vitamin K', unit: 'µg' },
  { key: 'b1', label: 'B1 (Thiamine)', unit: 'mg' },
  { key: 'b2', label: 'B2 (Riboflavin)', unit: 'mg' },
  { key: 'b3', label: 'B3 (Niacin)', unit: 'mg' },
  { key: 'b5', label: 'B5 (Pantothenic)', unit: 'mg' },
  { key: 'b6', label: 'B6 (Pyridoxine)', unit: 'mg' },
  { key: 'b9', label: 'B9 (Folate)', unit: 'µg' },
  { key: 'b12', label: 'B12 (Cobalamin)', unit: 'µg' },
]

const MINERAL_ROWS: NutrientRow[] = [
  { key: 'calcium', label: 'Calcium', unit: 'mg' },
  { key: 'iron', label: 'Iron', unit: 'mg' },
  { key: 'magnesium', label: 'Magnesium', unit: 'mg' },
  { key: 'phosphorus', label: 'Phosphorus', unit: 'mg' },
  { key: 'potassium', label: 'Potassium', unit: 'mg' },
  { key: 'sodium', label: 'Sodium', unit: 'mg' },
  { key: 'zinc', label: 'Zinc', unit: 'mg' },
  { key: 'selenium', label: 'Selenium', unit: 'µg' },
  { key: 'manganese', label: 'Manganese', unit: 'mg' },
  { key: 'copper', label: 'Copper', unit: 'mg' },
  { key: 'iodine', label: 'Iodine', unit: 'µg' },
]

interface SectionProps {
  title: string
  color: string
  rows: NutrientRow[]
  data: Record<string, number | undefined> | undefined
  sectionKey: string
  editable?: boolean
  onFieldChange?: (section: string, key: string, value: number | undefined) => void
}

function Section({ title, color, rows, data, sectionKey, editable, onFieldChange }: SectionProps) {
  const [open, setOpen] = useState(false)

  const hasData = data && Object.values(data).some((v) => v != null && v > 0)

  return (
    <div className="border border-slate-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-3 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-sm font-semibold text-slate-700">{title}</span>
          {hasData && !open && (
            <span className="text-[10px] text-slate-400 ml-1">
              {Object.values(data!).filter((v) => v != null && v > 0).length} nutrients
            </span>
          )}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-1">
          {rows.map((row) => {
            const val = data?.[row.key]
            return (
              <div key={row.key} className={`flex items-center gap-2 ${row.indent ? 'pl-4' : ''}`}>
                <span className="text-xs text-slate-500 flex-1">{row.label}</span>
                {editable ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={val ?? ''}
                      onChange={(e) => {
                        const v = e.target.value ? parseFloat(e.target.value) : undefined
                        onFieldChange?.(sectionKey, row.key, v)
                      }}
                      placeholder="—"
                      className="w-16 text-right text-xs px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 outline-none"
                      step="any"
                    />
                    {row.unit && <span className="text-[10px] text-slate-400 w-6">{row.unit}</span>}
                  </div>
                ) : (
                  <span className="text-xs font-medium text-slate-700">
                    {val != null ? `${val}${row.unit ? ` ${row.unit}` : ''}` : '—'}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function NutritionDetailsView({ details, editable, onChange }: Props) {
  const d = details ?? {}

  function handleFieldChange(section: string, key: string, value: number | undefined) {
    if (!onChange) return
    const updated = { ...d }
    const sectionMap: Record<string, string> = {
      fat: 'fat_details',
      carbs: 'carb_details',
      vitamins: 'vitamins',
      minerals: 'minerals',
    }
    const sectionName = sectionMap[section] as keyof NutritionDetailsType
    const existing = (updated[sectionName] ?? {}) as Record<string, number | undefined>
    updated[sectionName] = { ...existing, [key]: value } as never
    onChange(updated)
  }

  return (
    <div className="space-y-2">
      <Section
        title="Fat Breakdown"
        color="#ef4444"
        rows={FAT_ROWS}
        data={d.fat_details as Record<string, number | undefined> | undefined}
        sectionKey="fat"
        editable={editable}
        onFieldChange={handleFieldChange}
      />
      <Section
        title="Carbs Breakdown"
        color="#f59e0b"
        rows={CARB_ROWS}
        data={d.carb_details as Record<string, number | undefined> | undefined}
        sectionKey="carbs"
        editable={editable}
        onFieldChange={handleFieldChange}
      />
      <Section
        title="Vitamins"
        color="#10b981"
        rows={VITAMIN_ROWS}
        data={d.vitamins as Record<string, number | undefined> | undefined}
        sectionKey="vitamins"
        editable={editable}
        onFieldChange={handleFieldChange}
      />
      <Section
        title="Minerals"
        color="#3b82f6"
        rows={MINERAL_ROWS}
        data={d.minerals as Record<string, number | undefined> | undefined}
        sectionKey="minerals"
        editable={editable}
        onFieldChange={handleFieldChange}
      />
    </div>
  )
}
