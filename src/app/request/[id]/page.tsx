'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Request } from '@/types'
import { formatCurrency, formatTimeLeft, getCategoryEmoji, getInitials } from '@/lib/utils'

export default function RequestDetailPage() {
  const router = useRouter()
  const { id } = useParams()
  const { session, profile } = useAuth()

  const [request, setRequest] = useState<Request | null>(null)
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    fetchRequest()

    const channel = supabase
      .channel(`request-${id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'requests',
        filter: `id=eq.${id}`,
      }, (payload) => {
        setRequest(prev => prev ? { ...prev, ...payload.new } : null)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [id])

  async function fetchRequest() {
    const { data } = await supabase
      .from('requests')
      .select('*, buyer:users!buyer_id(full_name, rating_as_buyer, avatar_url, neighborhood)')
      .eq('id', id)
      .single()

    setRequest(data as Request)
    setLoading(false)
  }

  async function handleClaim() {
    if (!session || !request) return
    setClaiming(true)
    setError('')

    const { error } = await supabase
      .from('requests')
      .update({
        runner_id: session.user.id,
        status: 'claimed',
        claimed_at: new Date().toISOString(),
      })
      .eq('id', request.id)
      .eq('status', 'open')

    if (error) {
      setError('Could not claim this request — it may have already been taken.')
      setClaiming(false)
      return
    }

    // Log the event
    await supabase.from('request_events').insert({
      request_id: request.id,
      actor_id: session.user.id,
      from_status: 'open',
      to_status: 'claimed',
      note: 'Runner claimed the request',
    })

    router.push(`/request/${request.id}/active`)
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-warm-white flex items-center justify-center">
        <p className="text-4xl animate-pulse">🥐</p>
      </main>
    )
  }

  if (!request) {
    return (
      <main className="min-h-screen bg-warm-white flex flex-col items-center justify-center gap-3">
        <p className="text-3xl">😕</p>
        <p className="text-charcoal font-medium">Request not found</p>
        <button onClick={() => router.push('/')} className="text-terracotta text-sm">
          Back to feed
        </button>
      </main>
    )
  }

  const isOwner = session?.user.id === request.buyer_id
  const isClaimed = request.status !== 'open'

  return (
    <main className="min-h-screen bg-warm-white pb-24">
      {/* Header */}
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
          Request <em className="text-terracotta">details</em>
        </h1>
      </div>

      <div className="px-6 flex flex-col gap-5">
        {/* Main card */}
        <div className="bg-cream rounded-3xl p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-warm-white flex items-center justify-center text-2xl">
                {getCategoryEmoji(request.category)}
              </div>
              <div>
                <h2 className="font-medium text-charcoal text-lg">{request.title}</h2>
                <p className="text-sm text-muted">{request.location_name}</p>
              </div>
            </div>
            <div className="text-right">
              <p
                className="font-playfair text-2xl italic text-terracotta"
                style={{ fontFamily: 'var(--font-playfair)' }}
              >
                {formatCurrency(request.offer_amount)}
              </p>
              <p className="text-xs text-muted">to earn</p>
            </div>
          </div>

          {request.description && (
            <div className="bg-warm-white rounded-2xl p-4 mb-4">
              <p className="text-xs text-muted uppercase tracking-wider mb-1">Notes</p>
              <p className="text-sm text-charcoal leading-relaxed">{request.description}</p>
            </div>
          )}

          {/* Meta */}
          <div className="flex gap-3">
            <div className="flex-1 bg-warm-white rounded-2xl p-3 text-center">
              <p className="text-xs text-muted mb-1">Category</p>
              <p className="text-sm font-medium text-charcoal capitalize">{request.category}</p>
            </div>
            <div className="flex-1 bg-warm-white rounded-2xl p-3 text-center">
              <p className="text-xs text-muted mb-1">Expires</p>
              <p className="text-sm font-medium text-charcoal">{formatTimeLeft(request.expires_at)}</p>
            </div>
            <div className="flex-1 bg-warm-white rounded-2xl p-3 text-center">
              <p className="text-xs text-muted mb-1">Status</p>
              <p className="text-sm font-medium text-charcoal capitalize">{request.status}</p>
            </div>
          </div>
        </div>

        {/* Buyer info */}
        <div className="bg-cream rounded-3xl p-5">
          <p className="text-xs text-muted uppercase tracking-wider mb-3">Posted by</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-sand flex items-center justify-center text-sm font-medium text-charcoal">
              {request.buyer ? getInitials(request.buyer.full_name) : '?'}
            </div>
            <div>
              <p className="font-medium text-charcoal">{request.buyer?.full_name ?? 'Someone'}</p>
              <p className="text-sm text-muted">
                ⭐ {request.buyer?.rating_as_buyer?.toFixed(1) ?? '5.0'} · {(request.buyer as any)?.neighborhood ?? 'Bay Area'}
              </p>
            </div>
          </div>
        </div>

        {/* Goods estimate */}
        {request.goods_estimate > 0 && (
          <div className="bg-cream rounded-3xl p-5">
            <p className="text-xs text-muted uppercase tracking-wider mb-3">Estimated cost</p>
            <div className="flex justify-between items-center">
              <p className="text-sm text-charcoal">Items total (est.)</p>
              <p className="font-medium text-charcoal">{formatCurrency(request.goods_estimate)}</p>
            </div>
            <p className="text-xs text-muted mt-2">
              You'll confirm actual prices at the location before purchasing.
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 rounded-2xl p-4">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Action button */}
        {!isOwner && !isClaimed && (
          <button
            onClick={handleClaim}
            disabled={claiming}
            className="w-full bg-charcoal text-cream py-4 rounded-2xl font-medium text-sm disabled:opacity-40"
          >
            {claiming ? 'Claiming...' : "I'm going here → claim this run"}
          </button>
        )}

        {isOwner && (
          <div className="bg-sage/20 rounded-2xl p-4 text-center">
            <p className="text-sm text-charcoal">This is your request — waiting for a runner 🏃</p>
          </div>
        )}

        {isClaimed && !isOwner && (
          <div className="bg-sand-light rounded-2xl p-4 text-center">
            <p className="text-sm text-charcoal">This request has already been claimed</p>
          </div>
        )}

        {/* Buyer confirm + rate button */}
        {session?.user.id === request.buyer_id && request.status === 'delivered' && (
        <button
            onClick={() => router.push(`/request/${request.id}/rate`)}
            className="w-full bg-terracotta text-cream py-4 rounded-2xl font-medium text-sm"
        >
            Confirm delivery & rate runner →
        </button>
        )}
      </div>
    </main>
  )
}