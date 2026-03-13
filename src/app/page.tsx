'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Request, RunnerSession, Category } from '@/types'
import { getInitials } from '@/lib/utils'
import RequestCard from '@/components/ui/RequestCard'
import BottomNav from '@/components/layout/BottomNav'

const categories: { key: Category | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'food', label: '🥐 Food' },
  { key: 'grocery', label: '🛒 Grocery' },
  { key: 'bar', label: '🍸 Bars' },
  { key: 'event', label: '🎵 Events' },
]

export default function Home() {
  const router = useRouter()
  const { session, profile } = useAuth()
  const [mode, setMode] = useState<'runner' | 'buyer'>('buyer')
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>('all')
  const [requests, setRequests] = useState<Request[]>([])
  const [featuredSession, setFeaturedSession] = useState<RunnerSession | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRequests()
    fetchFeaturedSession()

    const channel = supabase
      .channel('requests-feed')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'requests',
      }, () => fetchRequests())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [activeCategory])

  async function fetchRequests() {
    setLoading(true)
    let query = supabase
      .from('requests')
      .select('*, buyer:users!buyer_id(full_name, rating_as_buyer, avatar_url)')
      .eq('status', 'open')
      .order('created_at', { ascending: false })

    if (activeCategory !== 'all') {
      query = query.eq('category', activeCategory)
    }

    const { data } = await query
    setRequests((data as Request[]) ?? [])
    setLoading(false)
  }

  async function fetchFeaturedSession() {
    const { data } = await supabase
      .from('runner_sessions')
      .select('*, runner:users!runner_id(full_name, rating_as_runner)')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    setFeaturedSession(data as RunnerSession)
  }

  function handleClaim(id: string) {
    if (!session) { router.push('/login'); return }
    router.push(`/request/${id}`)
  }

  return (
    <main className="min-h-screen bg-warm-white pb-24">
      {/* Top nav */}
      <div className="bg-warm-white px-6 pt-14 pb-3 flex justify-between items-center">
        <h1
          className="font-playfair text-2xl text-charcoal"
          style={{ fontFamily: 'var(--font-playfair)' }}
        >
          Lil <em className="text-terracotta">Outing</em>
        </h1>
        <button
          onClick={() => router.push(session ? '/profile' : '/login')}
          className="w-9 h-9 rounded-full bg-charcoal flex items-center justify-center text-cream text-xs font-medium"
        >
          {profile ? getInitials(profile.full_name) : 'LO'}
        </button>
      </div>

      {/* Greeting */}
      <div className="px-6 pb-5">
        <p className="text-xs text-muted uppercase tracking-wider mb-1">
          {profile ? `Hey ${profile.full_name.split(' ')[0]} ·` : 'Saturday morning ·'} Bay Area
        </p>
        <h2
          className="font-playfair text-2xl text-charcoal"
          style={{ fontFamily: 'var(--font-playfair)' }}
        >
          What's your <em className="text-terracotta">lil outing</em> today?
        </h2>
      </div>

      {/* Mode toggle */}
      <div className="mx-6 mb-5 bg-cream rounded-2xl p-1 flex gap-1">
        <button
          onClick={() => session ? router.push('/session/new') : router.push('/login')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
            mode === 'runner' ? 'bg-charcoal text-cream shadow-sm' : 'text-muted'
          }`}
        >
          🏃 I'm heading out
        </button>
        <button
          onClick={() => setMode('buyer')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
            mode === 'buyer' ? 'bg-charcoal text-cream shadow-sm' : 'text-muted'
          }`}
        >
          🙋 I need a runner
        </button>
      </div>

      {/* Category pills */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide px-6 pr-6 pb-1 mb-4">        
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm whitespace-nowrap transition-all ${
              activeCategory === cat.key
                ? 'bg-charcoal text-cream'
                : 'bg-cream text-charcoal border border-sand-light'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Featured runner session */}
      {featuredSession && (
        <div className="mx-6 mb-5">
          <div className="flex justify-between items-baseline mb-3">
            <h3
              className="font-playfair text-lg text-charcoal"
              style={{ fontFamily: 'var(--font-playfair)' }}
            >
              Hot right now
            </h3>
            <button
              onClick={() => router.push('/runners')}
              className="text-xs text-terracotta font-medium"
            >
              See all
            </button>
          </div>

          <div className="bg-charcoal rounded-3xl p-6 relative overflow-hidden">
            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-terracotta opacity-20" />
            <div className="absolute -bottom-6 left-8 w-20 h-20 rounded-full bg-sage opacity-10" />

            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-sage animate-pulse" />
                <span className="text-xs text-cream/50">Runner already in line</span>
              </div>
              <h4
                className="font-playfair text-2xl text-cream italic mb-1"
                style={{ fontFamily: 'var(--font-playfair)' }}
              >
                {featuredSession.location_name}
              </h4>
              <p className="text-sm text-cream/50 mb-5">
                {featuredSession.max_orders - featuredSession.orders_claimed} spot
                {featuredSession.max_orders - featuredSession.orders_claimed !== 1 ? 's' : ''} left
              </p>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-xs text-cream/40 uppercase tracking-wider mb-0.5">You'd earn</p>
                  <p
                    className="font-playfair text-3xl italic text-terracotta-light"
                    style={{ fontFamily: 'var(--font-playfair)' }}
                  >
                    +$18
                  </p>
                </div>
                <button
                  onClick={() => handleClaim(featuredSession.id)}
                  className="bg-terracotta text-cream text-sm font-medium px-5 py-2.5 rounded-full"
                >
                  Order now →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Open requests */}
      <div className="px-6">
        <div className="flex justify-between items-baseline mb-3">
          <h3
            className="font-playfair text-lg text-charcoal"
            style={{ fontFamily: 'var(--font-playfair)' }}
          >
            Open nearby
          </h3>
          <span className="text-xs text-terracotta font-medium">Map view</span>
        </div>

        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-cream rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-3xl mb-3">🥐</p>
            <p className="text-charcoal font-medium mb-1">No requests nearby</p>
            <p className="text-muted text-sm">Be the first to post one</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {requests.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                onClaim={handleClaim}
              />
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </main>
  )
}