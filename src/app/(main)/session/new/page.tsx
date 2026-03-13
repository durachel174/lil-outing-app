'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

const POPULAR_SPOTS = [
  'Arsicault Bakery',
  'Tartine Bakery',
  'Trader Joe\'s',
  'Whole Foods',
  'In-N-Out Burger',
  'Sightglass Coffee',
  'Blue Bottle Coffee',
  'Bi-Rite Market',
  'Trick Dog',
  'Foreign Cinema',
]

export default function NewSessionPage() {
  const router = useRouter()
  const { session } = useAuth()
  const [locationName, setLocationName] = useState('')
  const [maxOrders, setMaxOrders] = useState(2)
  const [deliveryType, setDeliveryType] = useState<'deliver' | 'meetup' | 'buyer_choice'>('buyer_choice')
  const [availableMinutes, setAvailableMinutes] = useState(60)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!session || !locationName) return
    setLoading(true)
    setError('')

    const availableUntil = new Date(Date.now() + availableMinutes * 60 * 1000).toISOString()

    const { error } = await supabase.from('runner_sessions').insert({
      runner_id: session.user.id,
      location_name: locationName,
      max_orders: maxOrders,
      orders_claimed: 0,
      delivery_type: deliveryType,
      available_until: availableUntil,
      status: 'active',
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/')
  }

  return (
    <main className="min-h-screen bg-warm-white pb-24">
      <div className="px-6 pt-14 pb-4 flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-full bg-cream flex items-center justify-center text-charcoal"
        >
          ←
        </button>
        <h1
          className="font-playfair text-2xl text-charcoal"
          style={{ fontFamily: 'var(--font-playfair)' }}
        >
          I'm heading <em className="text-terracotta">out</em>
        </h1>
      </div>

      <div className="px-6 flex flex-col gap-5">
        {/* Location */}
        <div className="bg-cream rounded-3xl p-5">
          <p className="text-xs text-muted uppercase tracking-wider mb-3">Where are you heading?</p>
          <input
            type="text"
            placeholder="e.g. Arsicault Bakery"
            value={locationName}
            onChange={e => setLocationName(e.target.value)}
            className="w-full bg-warm-white rounded-2xl px-4 py-3 text-charcoal placeholder:text-muted outline-none text-sm mb-3"
          />
          <div className="flex flex-wrap gap-2">
            {POPULAR_SPOTS.map(spot => (
              <button
                key={spot}
                onClick={() => setLocationName(spot)}
                className={`px-3 py-1.5 rounded-full text-xs transition-all ${
                  locationName === spot
                    ? 'bg-charcoal text-cream'
                    : 'bg-warm-white text-charcoal border border-sand-light'
                }`}
              >
                {spot}
              </button>
            ))}
          </div>
        </div>

        {/* Capacity */}
        <div className="bg-cream rounded-3xl p-5">
          <p className="text-xs text-muted uppercase tracking-wider mb-3">How many orders can you take?</p>
          <div className="flex gap-3">
            {[1, 2, 3].map(n => (
              <button
                key={n}
                onClick={() => setMaxOrders(n)}
                className={`flex-1 py-3 rounded-2xl text-sm font-medium transition-all ${
                  maxOrders === n ? 'bg-charcoal text-cream' : 'bg-warm-white text-charcoal border border-sand-light'
                }`}
              >
                {n} {n === 1 ? 'order' : 'orders'}
              </button>
            ))}
          </div>
        </div>

        {/* Delivery type */}
        <div className="bg-cream rounded-3xl p-5">
          <p className="text-xs text-muted uppercase tracking-wider mb-3">Delivery preference</p>
          <div className="flex flex-col gap-2">
            {[
              { value: 'buyer_choice', label: "Buyer's choice", desc: 'Let buyers decide' },
              { value: 'deliver', label: 'I can deliver', desc: 'Drop off at their address' },
              { value: 'meetup', label: 'Meetup only', desc: 'They come to me' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setDeliveryType(opt.value as any)}
                className={`flex items-center justify-between p-4 rounded-2xl transition-all ${
                  deliveryType === opt.value
                    ? 'bg-charcoal text-cream'
                    : 'bg-warm-white text-charcoal border border-sand-light'
                }`}
              >
                <div className="text-left">
                  <p className="text-sm font-medium">{opt.label}</p>
                  <p className={`text-xs ${deliveryType === opt.value ? 'text-cream/50' : 'text-muted'}`}>
                    {opt.desc}
                  </p>
                </div>
                {deliveryType === opt.value && <span>✓</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Available for */}
        <div className="bg-cream rounded-3xl p-5">
          <p className="text-xs text-muted uppercase tracking-wider mb-3">Available for</p>
          <div className="flex gap-3">
            {[30, 60, 90, 120].map(mins => (
              <button
                key={mins}
                onClick={() => setAvailableMinutes(mins)}
                className={`flex-1 py-3 rounded-2xl text-sm font-medium transition-all ${
                  availableMinutes === mins ? 'bg-charcoal text-cream' : 'bg-warm-white text-charcoal border border-sand-light'
                }`}
              >
                {mins < 60 ? `${mins}m` : `${mins / 60}h`}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 rounded-2xl p-4">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!locationName || loading}
          className="w-full bg-charcoal text-cream py-4 rounded-2xl font-medium text-sm disabled:opacity-40"
        >
          {loading ? 'Going live...' : "I'm heading out 🏃 →"}
        </button>
      </div>
    </main>
  )
}