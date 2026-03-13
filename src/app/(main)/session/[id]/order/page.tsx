'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { formatTimeLeft } from '@/lib/utils'

export default function SessionOrderPage() {
  const router = useRouter()
  const { id } = useParams()
  const { session } = useAuth()

  const [runnerSession, setRunnerSession] = useState<any>(null)
  const [description, setDescription] = useState('')
  const [offerAmount, setOfferAmount] = useState(15)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchSession()
  }, [id])

  async function fetchSession() {
    const { data } = await supabase
      .from('runner_sessions')
      .select('*, runner:users!runner_id(full_name, rating_as_runner)')
      .eq('id', id)
      .single()
    setRunnerSession(data)
    setLoading(false)
  }

  async function handleSubmit() {
    if (!session || !runnerSession) return
    setSubmitting(true)
    setError('')

    const { error } = await supabase.from('requests').insert({
      buyer_id: session.user.id,
      runner_id: runnerSession.runner_id,
      category: 'food',
      title: runnerSession.location_name,
      description,
      location_name: runnerSession.location_name,
      offer_amount: offerAmount,
      goods_estimate: 0,
      runner_session_id: id,
      initiation_type: 'runner_initiated',
      status: 'claimed',
      claimed_at: new Date().toISOString(),
      expires_at: runnerSession.available_until,
    })

    if (error) {
      setError(error.message)
      setSubmitting(false)
      return
    }

    // Increment orders_claimed on the session
    await supabase
      .from('runner_sessions')
      .update({ orders_claimed: runnerSession.orders_claimed + 1 })
      .eq('id', id)

    router.push('/')
  }

  if (loading) return (
    <main className="min-h-screen bg-warm-white flex items-center justify-center">
      <p className="text-4xl animate-pulse">🥐</p>
    </main>
  )

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
          Place an <em className="text-terracotta">order</em>
        </h1>
      </div>

      <div className="px-6 flex flex-col gap-5">
        {/* Runner info */}
        <div className="bg-charcoal rounded-3xl p-5 relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-terracotta opacity-20" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-sage animate-pulse" />
              <span className="text-xs text-cream/50 uppercase tracking-wider">Runner already in line</span>
            </div>
            <h2
              className="font-playfair text-xl text-cream italic mb-1"
              style={{ fontFamily: 'var(--font-playfair)' }}
            >
              {runnerSession.location_name}
            </h2>
            <p className="text-sm text-cream/60">
              {runnerSession.max_orders - runnerSession.orders_claimed} spots left · {formatTimeLeft(runnerSession.available_until)}
            </p>
            <p className="text-sm text-cream/60 mt-1">
              Runner: {runnerSession.runner?.full_name} · ⭐ {runnerSession.runner?.rating_as_runner?.toFixed(1)}
            </p>
          </div>
        </div>

        {/* What do you want */}
        <div className="bg-cream rounded-3xl p-5">
          <p className="text-xs text-muted uppercase tracking-wider mb-3">What do you want?</p>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="1 almond croissant, 1 butter croissant. No substitutions please!"
            className="w-full bg-warm-white rounded-2xl px-4 py-3 text-charcoal placeholder:text-muted/50 outline-none text-sm resize-none h-24"
          />
        </div>

        {/* Offer */}
        <div className="bg-cream rounded-3xl p-5">
          <p className="text-xs text-muted uppercase tracking-wider mb-3">Your offer</p>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted">How much are you offering?</span>
            <span
              className="font-playfair text-2xl italic text-terracotta"
              style={{ fontFamily: 'var(--font-playfair)' }}
            >
              ${offerAmount}
            </span>
          </div>
          <input
            type="range"
            min={5}
            max={50}
            step={5}
            value={offerAmount}
            onChange={e => setOfferAmount(Number(e.target.value))}
            className="w-full accent-terracotta"
          />
          <div className="flex justify-between mt-1">
            <span className="text-xs text-muted">$5</span>
            <span className="text-xs text-muted">$50</span>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 rounded-2xl p-4">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!description || submitting}
          className="w-full bg-charcoal text-cream py-4 rounded-2xl font-medium text-sm disabled:opacity-40"
        >
          {submitting ? 'Placing order...' : 'Place order 🥐'}
        </button>
      </div>
    </main>
  )
}