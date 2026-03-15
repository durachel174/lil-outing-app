import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  const { locationName } = await req.json()
  if (!locationName) return NextResponse.json({ error: 'No location' }, { status: 400 })

  // Check if we already have limits for this location
const normalized = locationName.toLowerCase().trim().split(' ')[0]
const { data: existing } = await supabase
  .from('location_limits')
  .select('*')
  .ilike('location_name', `%${normalized}%`)
  .limit(5)

// Only return if it's actually a match for this location
const isMatch = existing && existing.length > 0 && 
  existing.some(row => 
    row.location_name.toLowerCase().includes(normalized) ||
    normalized.includes(row.location_name.toLowerCase().split(' ')[0])
  )

if (isMatch) {
  return NextResponse.json({ limits: existing, source: 'database' })
}

  // Nothing in DB — ask Gemini
  const prompt = `What are the purchase limits or ordering restrictions at "${locationName}"? This could be a bakery, restaurant, or food spot anywhere.

Examples of what I'm looking for:
- "Maximum 2 croissants per person"
- "Limit of 1 loaf of bread per customer"
- "No more than 6 items per order"

Respond ONLY with a JSON array. Each object should have:
- "item_name": the item with a limit (or "all items" if it applies to everything)  
- "limit_per_person": the number limit as an integer
- "limit_notes": a brief note explaining the limit
- "confidence": "high", "medium", or "low"

If you don't know of any specific purchase limits, return an empty array [].
Do not include any text outside the JSON array.`

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1 },
      }),
    }
  )

  const data = await response.json()
  console.log('Full Gemini API response:', JSON.stringify(data, null, 2))
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]'

  let limits: any[] = []
    try {
    const clean = text.replace(/```json|```/g, '').trim()
    console.log('Gemini raw response:', text)
    limits = JSON.parse(clean)
    console.log('Parsed limits:', limits)
    } catch (e) {
    console.log('Parse error:', e)
    limits = []
    }

  // Seed the database with Gemini's response
  if (limits.length > 0) {
    const rows = limits.map((l: any) => ({
      location_name: locationName.toLowerCase().trim().split(' ')[0],
      item_name_normalized: l.item_name.toLowerCase().trim(),
      limit_per_person: l.limit_per_person,
      limit_notes: l.limit_notes,
      confirmed_by: null,
      confirmed_at: null,
    }))

    await supabase.from('location_limits').insert(rows)
  }

  return NextResponse.json({ limits, source: 'gemini' })
}