'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Request } from '@/types'
import { formatCurrency, getCategoryEmoji } from '@/lib/utils'

const RUNNER_STEPS = [
  { status: 'claimed', label: 'Head to the location', description: 'Make your way there', action: "I'm at the location", next: 'active' },
  { status: 'active', label: 'You\'re at the location', description: 'Get the items and confirm prices', action: 'On my way to deliver', next: 'in_transit' },
  { status: 'in_transit', label: 'On your way', description: 'Head to the buyer', action: 'I\'ve delivered it', next: 'delivered' },
  { status: 'delivered', label: 'Delivered!', description: 'Waiting for buyer to confirm', action: null, next: null },
]

export default function ActiveRunPage() {
  const router = useRouter()
  const { id } = useParams()
  const { session } = useAuth()

  const [request, setRequest] = useState<Request | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    if (!id) return
    fetchRequest()

    const channel = supabase
      .channel(`active-run-${id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'requests',
        filter: `id=eq.${id}`,
      }, (payload) => {
        setRequest(prev => prev ? { ...prev, ...payload.new } : null)
        if (payload.new.status === 'completed') {
          router.push(`/request/${id}/complete`)
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [id])

  async function fetchRequest() {
    const { data } = await supabase
      .from('requests')
      .select('*, buyer:users!buyer_id(full_name, rating_as_buyer)')
      .eq('id', id)
      .single()

    setRequest(data as Request)
    setLoading(false)
  }

  async function advanceStatus() {
    if (!request || !session) return
    setUpdating(true)

    const currentStep = RUNNER_STEPS.find(s => s.status === request.status)
    if (!currentStep?.next) { setUpdating(false); return }

    const { error } = await supabase
        .from('requests')
        .update({ status: currentStep.next })
        .eq('id', request.id)

    if (error) {
        console.log('update error:', error)
        setUpdating(false)
        return
    }

    await supabase.from('request_events').insert({
        request_id: request.id,
        actor_id: session.user.id,
        from_status: request.status,
        to_status: currentStep.next,
    })

    // Update local state immediately
    setRequest(prev => prev ? { ...prev, status: currentStep.next as any } : null)
    setUpdating(false)
    }

  if (loading) {
    return (
      <main className="min-h-screen bg-warm-white flex items-center justify-center">
        <p className="text-4xl animate-pulse">🥐</p>
      </main>
    )
  }

  if (!request) return null

  const currentStep = RUNNER_STEPS.find(s => s.status === request.status)
  const stepIndex = RUNNER_STEPS.findIndex(s => s.status === request.status)

  return (
    <main className="min-h-screen bg-warm-white pb-24">
      {/* Header */}
      <div className="px-6 pt-14 pb-4">
        <p className="text-xs text-muted uppercase tracking-wider mb-1">Active run</p>
        <h1
          className="font-playfair text-3xl text-charcoal"
          style={{ fontFamily: 'var(--font-playfair)' }}
        >
          {request.title}
        </h1>
      </div>

      {/* Progress steps */}
      <div className="px-6 mb-6">
        <div className="flex items-center gap-2">
          {RUNNER_STEPS.map((step, i) => (
            <div key={step.status} className="flex items-center gap-2 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${
                i < stepIndex ? 'bg-sage text-white' :
                i === stepIndex ? 'bg-charcoal text-cream' :
                'bg-sand-light text-muted'
              }`}>
                {i < stepIndex ? '✓' : i + 1}
              </div>
              {i < RUNNER_STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 ${i < stepIndex ? 'bg-sage' : 'bg-sand-light'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="px-6 flex flex-col gap-5">
        {/* Current status */}
        <div className="bg-charcoal rounded-3xl p-6 relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-terracotta opacity-20" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-sage animate-pulse" />
              <span className="text-xs text-cream/50 uppercase tracking-wider">Current step</span>
            </div>
            <h2
              className="font-playfair text-2xl text-cream italic mb-1"
              style={{ fontFamily: 'var(--font-playfair)' }}
            >
              {currentStep?.label}
            </h2>
            <p className="text-sm text-cream/50">{currentStep?.description}</p>
          </div>
        </div>

        {/* Request summary */}
        <div className="bg-cream rounded-3xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-warm-white flex items-center justify-center text-xl">
              {getCategoryEmoji(request.category)}
            </div>
            <div>
              <p className="font-medium text-charcoal">{request.location_name}</p>
              {request.description && (
                <p className="text-sm text-muted line-clamp-1">{request.description}</p>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-sand-light">
            <span className="text-sm text-muted">You'll earn</span>
            <span
              className="font-playfair text-xl italic text-terracotta"
              style={{ fontFamily: 'var(--font-playfair)' }}
            >
              {formatCurrency(request.offer_amount)}
            </span>
          </div>
        </div>

        {/* Buyer info */}
        <div className="bg-cream rounded-3xl p-5">
          <p className="text-xs text-muted uppercase tracking-wider mb-3">Delivering to</p>
          <p className="font-medium text-charcoal">{request.buyer?.full_name ?? 'Buyer'}</p>
          {request.delivery_address && (
            <p className="text-sm text-muted mt-1">{request.delivery_address}</p>
          )}
        </div>

        {/* Action button */}
        {currentStep?.action && (
          <button
            onClick={advanceStatus}
            disabled={updating}
            className="w-full bg-charcoal text-cream py-4 rounded-2xl font-medium text-sm disabled:opacity-40"
          >
            {updating ? 'Updating...' : currentStep.action + ' →'}
          </button>
        )}

        {request.status === 'delivered' && (
            <div className="flex flex-col gap-3">
                <div className="bg-sage/20 rounded-2xl p-4 text-center">
                <p className="text-sm text-charcoal font-medium mb-1">Waiting for buyer to confirm 🎉</p>
                <p className="text-xs text-muted">Auto-confirms in 10 minutes</p>
                </div>
                <button
                onClick={() => router.push('/')}
                className="w-full bg-cream text-charcoal py-4 rounded-2xl font-medium text-sm"
                >
                Back to feed →
                </button>
            </div>
            )}
      </div>
    </main>
  )
}