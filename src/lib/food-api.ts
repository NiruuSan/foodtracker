import type { NutritionDetails } from './types'

interface OpenFoodFactsProduct {
  product_name?: string
  nutriments?: Record<string, number | undefined>
  serving_size?: string
  image_url?: string
}

export interface FoodLookupResult {
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  servingSize: string
  imageUrl?: string
  nutrition_details?: NutritionDetails
}

export async function lookupBarcode(barcode: string): Promise<FoodLookupResult | null> {
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`)
    const data = await res.json()

    if (data.status !== 1 || !data.product) return null

    const p: OpenFoodFactsProduct = data.product
    const n = p.nutriments ?? {}

    const s = n['energy-kcal_serving'] != null
    const g = (key: string) => Math.round(s ? (n[`${key}_serving`] ?? 0) : (n[`${key}_100g`] ?? 0))
    const v = (key: string) => {
      const val = s ? n[`${key}_serving`] : n[`${key}_100g`]
      return val != null ? Math.round(val * 100) / 100 : undefined
    }

    return {
      name: p.product_name ?? 'Unknown Product',
      calories: g('energy-kcal'),
      protein: g('proteins'),
      carbs: g('carbohydrates'),
      fat: g('fat'),
      servingSize: p.serving_size ?? (s ? '1 serving' : '100g'),
      imageUrl: p.image_url,
      nutrition_details: {
        fat_details: {
          saturated: v('saturated-fat'),
          monounsaturated: v('monounsaturated-fat'),
          polyunsaturated: v('polyunsaturated-fat'),
          omega3: v('omega-3-fat'),
          omega6: v('omega-6-fat'),
          trans: v('trans-fat'),
          cholesterol: v('cholesterol'),
        },
        carb_details: {
          sugar: v('sugars'),
          fiber: v('fiber'),
          starch: v('starch'),
          polyols: v('polyols'),
        },
        vitamins: {
          a: v('vitamin-a'),
          c: v('vitamin-c'),
          d: v('vitamin-d'),
          e: v('vitamin-e'),
          k: v('vitamin-k'),
          b1: v('vitamin-b1'),
          b2: v('vitamin-b2'),
          b3: v('vitamin-pp'),
          b5: v('pantothenic-acid'),
          b6: v('vitamin-b6'),
          b9: v('vitamin-b9'),
          b12: v('vitamin-b12'),
        },
        minerals: {
          calcium: v('calcium'),
          iron: v('iron'),
          magnesium: v('magnesium'),
          phosphorus: v('phosphorus'),
          potassium: v('potassium'),
          sodium: v('sodium'),
          zinc: v('zinc'),
          selenium: v('selenium'),
          manganese: v('manganese'),
          copper: v('copper'),
          iodine: v('iodine'),
        },
      },
    }
  } catch {
    return null
  }
}

const NUTRITION_PROMPT = `You are a nutrition analyst. Given a food item or meal, estimate its detailed nutritional content for a typical serving. Respond with ONLY a raw JSON object (no markdown, no explanation). Use this exact structure — include your best estimates for all fields, use null only if truly unknown:
{
  "name": "meal name",
  "calories": 250,
  "protein": 10,
  "carbs": 30,
  "fat": 8,
  "servingSize": "1 medium (118g)",
  "nutrition_details": {
    "fat_details": {
      "saturated": 2.5,
      "monounsaturated": 3,
      "polyunsaturated": 1.5,
      "omega3": 0.1,
      "omega6": 1.4,
      "trans": 0,
      "cholesterol": 30
    },
    "carb_details": {
      "sugar": 12,
      "fiber": 3,
      "starch": 15,
      "polyols": 0,
      "glycemic_index": 55
    },
    "vitamins": {
      "a": 100, "c": 15, "d": 0, "e": 1.5, "k": 5,
      "b1": 0.1, "b2": 0.1, "b3": 2, "b5": 0.5, "b6": 0.2, "b9": 25, "b12": 0
    },
    "minerals": {
      "calcium": 20, "iron": 1.5, "magnesium": 30, "phosphorus": 50,
      "potassium": 300, "sodium": 150, "zinc": 1, "selenium": 5
    }
  }
}`

function getGroqKey(): string {
  const key = import.meta.env.VITE_GROQ_API_KEY
  if (!key) {
    throw new Error('Groq API key not configured. Get a free key at https://console.groq.com and add VITE_GROQ_API_KEY to your .env file.')
  }
  return key
}

function parseJsonResponse(text: string): FoodLookupResult | null {
  try {
    const cleaned = text
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim()
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null
    return JSON.parse(jsonMatch[0])
  } catch {
    return null
  }
}

async function callGroq(messages: { role: string; content: unknown }[]): Promise<string> {
  const apiKey = getGroqKey()

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages,
      temperature: 0.1,
      max_tokens: 800,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('[AI] Groq error:', res.status, err)
    if (res.status === 429) {
      throw new Error('Rate limited. Please wait a moment and try again.')
    }
    throw new Error(`AI service error: ${res.status}`)
  }

  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? ''
}

export async function analyzePhoto(file: File): Promise<FoodLookupResult | null> {
  const apiKey = getGroqKey()
  const base64 = await fileToBase64(file)

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.2-11b-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: `${NUTRITION_PROMPT}\n\nAnalyze this food photo and estimate its nutritional content:` },
            { type: 'image_url', image_url: { url: base64 } },
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: 800,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('[AI] Groq vision error:', res.status, err)
    if (res.status === 429) throw new Error('Rate limited. Please wait a moment and try again.')
    throw new Error(`AI service error: ${res.status}`)
  }

  const data = await res.json()
  const content = data.choices?.[0]?.message?.content ?? ''
  return parseJsonResponse(content)
}

export async function analyzeText(description: string): Promise<FoodLookupResult | null> {
  const content = await callGroq([
    { role: 'system', content: NUTRITION_PROMPT },
    { role: 'user', content: `Estimate the detailed nutritional content for a typical serving of: ${description}` },
  ])
  return parseJsonResponse(content)
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
