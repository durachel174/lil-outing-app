'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Request } from '@/types'
import { formatCurrency, formatTimeAgo, getCategoryEmoji, getInitials } from '@/lib/utils'

export default function ProfilePage() {
  const router = useRouter()
  const { session, profile } = useAuth()
  const [myRequests, setMyRequests] = useState<Request[]>([])
  const [myRuns, setMyRuns] = useState<Request[]>([])
  const [activeTab, setActiveTab] = useState<'requests' | 'runs'>('requests')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session) { router.push('/login'); return }
    fetchActivity()
  }, [session])

  async function fetchActivity() {
    const [requestsRes, runsRes] = await Promise.all([
      supabase
        .from('requests')
        .select('*')
        .eq('buyer_id', session!.user.id)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('requests')
        .select('*')
        .eq('runner_id', session!.user.id)
        .order('created_at', { ascending: false })
        .limit(10),
    ])

    setMyRequests((requestsRes.data as Request[]) ?? [])
    setMyRuns((runsRes.data as Request[]) ?? [])
    setLoading(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (!profile) return (
    <main className="min-h-screen bg-warm-white flex items-center justify-center">
      <p className="text-4xl animate-pulse">🥐</p>
    </main>
  )

  const totalEarned = myRuns
    .filter(r => r.status === 'completed')
    .reduce((sum, r) => sum + r.offer_amount, 0)

  return (
    <main className="min-h-screen bg-warm-white pb-24">
      {/* Header */}
      <div className="px-6 pt-14 pb-6">
        <div className="flex justify-between items-start mb-6">
          <h1
            className="font-playfair text-2xl text-charcoal"
            style={{ fontFamily: 'var(--font-playfair)' }}
          >
            My <em className="text-terracotta">profile</em>
          </h1>
          <button
            onClick={handleSignOut}
            className="text-xs text-muted border border-sand-light rounded-full px-3 py-1.5"
          >
            Sign out
          </button>
        </div>

        {/* Avatar + name */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-charcoal flex items-center justify-center text-cream text-xl font-medium">
            {getInitials(profile.full_name)}
          </div>
          <div>
            <h2 className="text-xl font-medium text-charcoal">{profile.full_name}</h2>
            <p className="text-sm text-muted">{profile.neighborhood} · Bay Area</p>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-muted">⭐ {profile.rating_as_runner?.toFixed(1)} runner</span>
              <span className="w-1 h-1 rounded-full bg-sand" />
              <span className="text-xs text-muted">⭐ {profile.rating_as_buyer?.toFixed(1)} buyer</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-cream rounded-2xl p-4 text-center">
            <p
              className="font-playfair text-2xl italic text-terracotta mb-1"
              style={{ fontFamily: 'var(--font-playfair)' }}
            >
              {profile.total_runs ?? 0}
            </p>
            <p className="text-xs text-muted">Runs done</p>
          </div>
          <div className="bg-cream rounded-2xl p-4 text-center">
            <p
              className="font-playfair text-2xl italic text-terracotta mb-1"
              style={{ fontFamily: 'var(--font-playfair)' }}
            >
              {profile.total_requests ?? 0}
            </p>
            <p className="text-xs text-muted">Requests</p>
          </div>
          <div className="bg-cream rounded-2xl p-4 text-center">
            <p
              className="font-playfair text-2xl italic text-terracotta mb-1"
              style={{ fontFamily: 'var(--font-playfair)' }}
            >
              {formatCurrency(totalEarned)}
            </p>
            <p className="text-xs text-muted">Earned</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mx-6 mb-5 bg-cream rounded-2xl p-1 flex gap-1">
        <button
          onClick={() => setActiveTab('requests')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
            activeTab === 'requests' ? 'bg-charcoal text-cream' : 'text-muted'
          }`}
        >
          My requests
        </button>
        <button
          onClick={() => setActiveTab('runs')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
            activeTab === 'runs' ? 'bg-charcoal text-cream' : 'text-muted'
          }`}
        >
          My runs
        </button>
      </div>

      {/* Activity list */}
      <div className="px-6">
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-cream rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (activeTab === 'requests' ? myRequests : myRuns).length === 0 ? (
          <div className="text-center py-12">
            <p className="text-3xl mb-3">{activeTab === 'requests' ? '🙋' : '🏃'}</p>
            <p className="text-charcoal font-medium mb-1">
              {activeTab === 'requests' ? 'No requests yet' : 'No runs yet'}
            </p>
            <p className="text-muted text-sm">
              {activeTab === 'requests' ? 'Post your first request' : 'Claim a request to start running'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {(activeTab === 'requests' ? myRequests : myRuns).map(request => (
              <div
                key={request.id}
                onClick={() => router.push(`/request/${request.id}`)}
                className="bg-cream rounded-2xl p-4 flex items-center gap-3 cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-warm-white flex items-center justify-center text-lg flex-shrink-0">
                  {getCategoryEmoji(request.category)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-charcoal text-sm truncate">{request.title}</p>
                  <p className="text-xs text-muted">{formatTimeAgo(request.created_at)}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-medium text-terracotta">
                    {formatCurrency(request.offer_amount)}
                  </p>
                  <p className={`text-xs capitalize ${
                    request.status === 'completed' ? 'text-sage' :
                    request.status === 'open' ? 'text-muted' :
                    'text-terracotta'
                  }`}>
                    {request.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}