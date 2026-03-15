'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Category } from '@/types'

const categories: { key: Category; label: string; emoji: string; description: string }[] = [
  { key: 'food', label: 'Food pickup', emoji: '🥐', description: 'Bakery, restaurant, popup' },
  { key: 'grocery', label: 'Grocery run', emoji: '🛒', description: 'Trader Joe\'s, Whole Foods, etc.' },
  { key: 'bar', label: 'Bar queue', emoji: '🍸', description: 'Hold my spot in line' },
  { key: 'event', label: 'Event line', emoji: '🎵', description: 'Concert, show, drop' },
]

type Item = { name: string; quantity: number; estimated_price: string }

export default function PostRequestPage() {
  const router = useRouter()
  const { session } = useAuth()

  const [step, setStep] = useState<'category' | 'details' | 'items' | 'offer'>('category')
  const [category, setCategory] = useState<Category | null>(null)
  const [locationName, setLocationName] = useState('')
  const [description, setDescription] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [items, setItems] = useState<Item[]>([{ name: '', quantity: 1, estimated_price: '' }])
  const [offerAmount, setOfferAmount] = useState('')
  const [spendingCap, setSpendingCap] = useState('')
  const [expiresIn, setExpiresIn] = useState('60')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [locationPrices, setLocationPrices] = useState<Record<string, number>>({})
  const [locationLimits, setLocationLimits] = useState<any[]>([])
  

  function addItem() {
    setItems([...items, { name: '', quantity: 1, estimated_price: '' }])
  }

  function updateItem(index: number, field: keyof Item, value: string | number) {
    const updated = [...items]
    updated[index] = { ...updated[index], [field]: value }
    setItems(updated)
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index))
  }

  async function fetchLocationPrices(location: string) {
    if (!location) return
    const keyword = location.toLowerCase().trim().split(' ')[0]
    const { data } = await supabase
    .from('item_prices')
    .select('item_name_normalized, price')
    .ilike('location_name', `%${keyword}%`)
    
    if (data && data.length > 0) {
        // Average prices per item
        const priceMap: Record<string, number[]> = {}
        data.forEach(row => {
        if (!priceMap[row.item_name_normalized]) priceMap[row.item_name_normalized] = []
        priceMap[row.item_name_normalized].push(row.price)
        })
        const avgMap: Record<string, number> = {}
        Object.entries(priceMap).forEach(([key, prices]) => {
        avgMap[key] = Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100
        })
        setLocationPrices(avgMap)
    }
    }

    async function fetchLocationLimits(location: string) {
  if (!location) return
  try {
    const res = await fetch('/api/location-limits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locationName: location }),
    })
    const data = await res.json()
    if (data.limits && data.limits.length > 0) {
      setLocationLimits(data.limits)
    }
  } catch (e) {
    console.log('location limits fetch failed:', e)
  }
}

  async function handleSubmit() {
    if (!session) {
        router.push('/login')
        return null
    }
    setLoading(true)
    setError('')

    const expiresAt = new Date(Date.now() + parseInt(expiresIn) * 60 * 1000).toISOString()

    const goodsEstimate = items.reduce((sum, item) => {
        return sum + (parseFloat(item.estimated_price) || 0) * item.quantity
    }, 0)

    console.log('submitting with user:', session.user.id)

    const { data: request, error: requestError } = await supabase
        .from('requests')
        .insert({
        buyer_id: session.user.id,
        category,
        title: locationName,
        description,
        location_name: locationName,
        location_lat: 37.7749,
        location_lng: -122.4194,
        delivery_address: deliveryAddress || null,
        offer_amount: parseFloat(offerAmount),
        goods_estimate: goodsEstimate,
        spending_cap: category === 'grocery' ? parseFloat(spendingCap) : null,
        expires_at: expiresAt,
        status: 'open',
        })
        .select()
        .single()

    console.log('request result:', request, 'error:', requestError)

    if (requestError || !request) {
        setError(requestError?.message ?? 'Something went wrong')
        setLoading(false)
        return
    }

    if (category === 'food' && items.some(i => i.name)) {
        const validItems = items
        .filter(i => i.name.trim())
        .map(i => ({
            request_id: request.id,
            item_name: i.name,
            quantity: i.quantity,
            estimated_price: parseFloat(i.estimated_price) || null,
        }))

        if (validItems.length > 0) {
        const { error: itemsError } = await supabase.from('request_items').insert(validItems)
        console.log('items error:', itemsError)
        }
    }

    router.push('/')
    }

  return (
    <main className="min-h-screen bg-warm-white pb-24">
      {/* Header */}
      <div className="px-6 pt-14 pb-4 flex items-center gap-4">
        <button
          onClick={() => step === 'category' ? router.back() : setStep(
            step === 'details' ? 'category' :
            step === 'items' ? 'details' : 'items'
          )}
          className="w-9 h-9 rounded-full bg-cream flex items-center justify-center text-charcoal"
        >
          ←
        </button>
        <h1
          className="font-playfair text-2xl text-charcoal"
          style={{ fontFamily: 'var(--font-playfair)' }}
        >
          {step === 'category' ? 'What do you need?' :
           step === 'details' ? 'Where from?' :
           step === 'items' ? 'What items?' :
           'Set your offer'}
        </h1>
      </div>

      {/* Progress bar */}
      <div className="mx-6 mb-6 h-1 bg-sand-light rounded-full">
        <div
          className="h-1 bg-terracotta rounded-full transition-all"
          style={{ width: `${
            step === 'category' ? 25 :
            step === 'details' ? 50 :
            step === 'items' ? 75 : 100
          }%` }}
        />
      </div>

      <div className="px-6">

        {/* STEP 1 — Category */}
        {step === 'category' && (
          <div className="flex flex-col gap-3">
            {categories.map((cat) => (
              <button
                key={cat.key}
                onClick={() => { setCategory(cat.key); setStep('details') }}
                className="flex items-center gap-4 bg-cream border border-sand-light rounded-2xl p-4 text-left hover:border-terracotta transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-warm-white flex items-center justify-center text-2xl flex-shrink-0">
                  {cat.emoji}
                </div>
                <div>
                  <p className="font-medium text-charcoal">{cat.label}</p>
                  <p className="text-sm text-muted">{cat.description}</p>
                </div>
                <span className="ml-auto text-muted">→</span>
              </button>
            ))}
          </div>
        )}

        {/* STEP 2 — Details */}
        {step === 'details' && (
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-sm font-medium text-charcoal mb-2 block">
                Location name
              </label>
              <input
                type="text"
                value={locationName}
                onChange={(e) => {
                    setLocationName(e.target.value)
                    fetchLocationPrices(e.target.value)
                }}
                placeholder="e.g. Arsicault Bakery"
                className="w-full bg-cream border border-sand rounded-2xl px-4 py-3.5 text-charcoal placeholder:text-muted outline-none focus:border-terracotta transition-colors"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-charcoal mb-2 block">
                Any notes for the runner?
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. No substitutions please, I need the almond croissant specifically"
                rows={3}
                className="w-full bg-cream border border-sand rounded-2xl px-4 py-3.5 text-charcoal placeholder:text-muted outline-none focus:border-terracotta transition-colors resize-none"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-charcoal mb-2 block">
                Delivery address <span className="text-muted font-normal">(optional — or meetup)</span>
              </label>
              <input
                type="text"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="e.g. 123 Arguello Blvd"
                className="w-full bg-cream border border-sand rounded-2xl px-4 py-3.5 text-charcoal placeholder:text-muted outline-none focus:border-terracotta transition-colors"
              />
            </div>

            <button
                onClick={() => {
                    fetchLocationLimits(locationName)
                    setStep(category === 'food' ? 'items' : 'offer')
                }}
                disabled={!locationName}
                className="w-full bg-charcoal text-cream py-4 rounded-2xl font-medium text-sm disabled:opacity-40 mt-2"
                >
                Continue →
                </button>
          </div>
        )}

        {/* STEP 3 — Items (food only) */}
        {step === 'items' && (
          <div className="flex flex-col gap-4">
            {/* Location limits warning */}
            {locationLimits.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <p className="text-sm font-medium text-amber-800 mb-2">⚠️ Purchase limits at {locationName}</p>
                <div className="flex flex-col gap-1">
                {locationLimits.map((limit, i) => (
                    <p key={i} className="text-xs text-amber-700">
                    • {limit.item_name_normalized ?? 'All items'}: max {limit.limit_per_person} per person
                    {limit.limit_notes ? ` — ${limit.limit_notes}` : ''}
                    </p>
                ))}
                </div>
                <p className="text-xs text-amber-500 mt-2">
                {locationLimits[0]?.source === 'gemini' ? 'Based on reported policies — runners will confirm' : 'Confirmed by runners'}
                </p>
            </div>
            )}
            <p className="text-sm text-muted">
              List what you need — the runner will confirm actual prices at the location.
            </p>

            {items.map((item, index) => (
              <div key={index} className="bg-cream rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-charcoal">Item {index + 1}</span>
                  {items.length > 1 && (
                    <button
                      onClick={() => removeItem(index)}
                      className="text-muted text-xs"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => updateItem(index, 'name', e.target.value)}
                  placeholder="e.g. Almond croissant"
                  className="w-full bg-warm-white border border-sand rounded-xl px-4 py-3 text-charcoal placeholder:text-muted outline-none focus:border-terracotta transition-colors text-sm"
                />
                <div className="flex gap-3">
                  <div className="flex-1">
                    <p className="text-xs text-muted mb-1">Qty</p>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value))}
                      min={1}
                      max={10}
                      className="w-full bg-warm-white border border-sand rounded-xl px-4 py-3 text-charcoal outline-none focus:border-terracotta transition-colors text-sm"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted mb-1">Est. price</p>
                    <input
                      type="number"
                      value={item.estimated_price}
                      onChange={(e) => updateItem(index, 'estimated_price', e.target.value)}
                      placeholder="$0.00"
                      step="0.01"
                      className="w-full bg-warm-white border border-sand rounded-xl px-4 py-3 text-charcoal placeholder:text-muted outline-none focus:border-terracotta transition-colors text-sm"
                    />
                    {/* Price hint from historical data */}
                    {item.name && (() => {
                        const normalized = item.name.toLowerCase().trim().replace(/s$/, '')
                        const match = Object.entries(locationPrices).find(([key]) => 
                        key.includes(normalized) || normalized.includes(key)
                        )
                        return match ? (
                        <p className="text-xs text-sage mt-1">
                            💡 Usually ${match[1].toFixed(2)} at {locationName}
                        </p>
                        ) : null
                    })()}
                  </div>
                </div>
              </div>
            ))}

            <button
              onClick={addItem}
              className="w-full border border-dashed border-sand rounded-2xl py-3 text-sm text-muted"
            >
              + Add another item
            </button>

            <button
              onClick={() => setStep('offer')}
              disabled={!items.some(i => i.name.trim())}
              className="w-full bg-charcoal text-cream py-4 rounded-2xl font-medium text-sm disabled:opacity-40"
            >
              Continue →
            </button>
          </div>
        )}

        {/* STEP 4 — Offer */}
        {step === 'offer' && (
          <div className="flex flex-col gap-4">

            {category === 'grocery' && (
              <div>
                <label className="text-sm font-medium text-charcoal mb-2 block">
                  Spending cap
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted">$</span>
                  <input
                    type="number"
                    value={spendingCap}
                    onChange={(e) => setSpendingCap(e.target.value)}
                    placeholder="60.00"
                    className="w-full bg-cream border border-sand rounded-2xl pl-8 pr-4 py-3.5 text-charcoal placeholder:text-muted outline-none focus:border-terracotta transition-colors"
                  />
                </div>
                <p className="text-xs text-muted mt-1">Runner won't spend more than this amount</p>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-charcoal mb-2 block">
                Your offer to the runner
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted">$</span>
                <input
                  type="number"
                  value={offerAmount}
                  onChange={(e) => setOfferAmount(e.target.value)}
                  placeholder="18.00"
                  className="w-full bg-cream border border-sand rounded-2xl pl-8 pr-4 py-3.5 text-charcoal placeholder:text-muted outline-none focus:border-terracotta transition-colors"
                />
              </div>
              <p className="text-xs text-muted mt-1">
                {Object.keys(locationPrices).length > 0
                    ? `Based on recent runs, items here typically cost $${
                        Object.values(locationPrices).reduce((a, b) => a + b, 0).toFixed(2)
                    } total`
                    : `Suggested: ${
                        category === 'food' ? '$12 – $20' :
                        category === 'grocery' ? '$15 – $25' :
                        category === 'bar' ? '$20 – $40' : '$25 – $50'
                    }`
                }
                </p>
            </div>

            <div>
              <label className="text-sm font-medium text-charcoal mb-2 block">
                Request expires in
              </label>
              <div className="flex gap-2">
                {[
                  { value: '30', label: '30 min' },
                  { value: '60', label: '1 hour' },
                  { value: '120', label: '2 hours' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setExpiresIn(opt.value)}
                    className={`flex-1 py-3 rounded-2xl text-sm transition-all ${
                      expiresIn === opt.value
                        ? 'bg-charcoal text-cream'
                        : 'bg-cream text-charcoal border border-sand-light'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="bg-cream rounded-2xl p-4 mt-2">
              <p className="text-sm font-medium text-charcoal mb-3">Summary</p>
              <div className="flex flex-col gap-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Location</span>
                  <span className="text-charcoal font-medium">{locationName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Category</span>
                  <span className="text-charcoal font-medium capitalize">{category}</span>
                </div>
                {category === 'food' && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted">Items</span>
                    <span className="text-charcoal font-medium">{items.filter(i => i.name).length} item{items.filter(i => i.name).length !== 1 ? 's' : ''}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Your offer</span>
                  <span className="text-terracotta font-medium">${parseFloat(offerAmount || '0').toFixed(2)}</span>
                </div>
              </div>
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <button
              onClick={handleSubmit}
              disabled={!offerAmount || loading || (category === 'grocery' && !spendingCap)}
              className="w-full bg-charcoal text-cream py-4 rounded-2xl font-medium text-sm disabled:opacity-40"
            >
              {loading ? 'Posting...' : 'Post request 🥐'}
            </button>
          </div>
        )}
      </div>
    </main>
  )
}