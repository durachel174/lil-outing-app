'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { formatTimeLeft } from '@/lib/utils'

type RunnerSession = {
  id: string
  location_name: string
  max_orders: number
  orders_claimed: number
  delivery_type: string
  available_until: string
  runner: { full_name: string; rating_as_runner: number }
}

export default function SessionsPage() {
  const router = useRouter()
  const [sessions, setSessions] = useState<RunnerSession[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSessions()
  }, [])

  async function fetchSessions() {
    const { data } = await supabase
      .from('runner_sessions')
      .select('*, runner:users!runner_id(full_name, rating_as_runner)')
      .eq('status', 'active')
      .gt('available_until', new Date().toISOString())
      .order('created_at', { ascending: false })

    setSessions((data as RunnerSession[]) ?? [])
    setLoading(false)
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
          Runners <em className="text-terracotta">out now</em>
        </h1>
      </div>

      <div className="px-6 flex flex-col gap-4">
        {loading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="h-28 bg-cream rounded-3xl animate-pulse" />
          ))
        ) : sessions.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🏃</p>
            <p className="text-charcoal font-medium mb-1">No runners out right now</p>
            <p className="text-muted text-sm">Check back soon or post a request</p>
          </div>
        ) : (
          sessions.map(s => (
            <div key={s.id} className="bg-charcoal rounded-3xl p-5 relative overflow-hidden">
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
                  {s.location_name}
                </h2>
                <p className="text-sm text-cream/60 mb-4">
                  {s.max_orders - s.orders_claimed} spot{s.max_orders - s.orders_claimed !== 1 ? 's' : ''} left · {formatTimeLeft(s.available_until)}
                </p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-cream/50">Runner</p>
                    <p className="text-sm text-cream font-medium">
                      {s.runner?.full_name} · ⭐ {s.runner?.rating_as_runner?.toFixed(1)}
                    </p>
                  </div>
                  <button
                    onClick={() => router.push(`/session/${s.id}/order`)}
                    className="bg-terracotta text-cream px-4 py-2 rounded-xl text-sm font-medium"
                  >
                    Order now →
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  )
}