'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

export default function RatePage() {
  const router = useRouter()
  const { id } = useParams()
  const { session } = useAuth()
  const [rating, setRating] = useState(0)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    if (!session || rating === 0) return
    setSubmitting(true)

    // Get the request to find the other party
    const { data: request } = await supabase
      .from('requests')
      .select('buyer_id, runner_id')
      .eq('id', id)
      .single()

    if (!request) { setSubmitting(false); return }

    const isBuyer = session.user.id === request.buyer_id
    const rateeId = isBuyer ? request.runner_id : request.buyer_id
    const role = isBuyer ? 'buyer_rating_runner' : 'runner_rating_buyer'
    const ratingField = isBuyer ? 'rating_as_runner' : 'rating_as_buyer'

    // Insert rating
    await supabase.from('ratings').insert({
      request_id: id,
      rater_id: session.user.id,
      ratee_id: rateeId,
      role,
      score: rating,
      note: note.trim() || null,
    })

    // Update user's average rating
    const { data: allRatings } = await supabase
      .from('ratings')
      .select('score')
      .eq('ratee_id', rateeId)
      .eq('role', role)

    if (allRatings && allRatings.length > 0) {
      const avg = allRatings.reduce((sum, r) => sum + r.score, 0) / allRatings.length
      await supabase
        .from('users')
        .update({ [ratingField]: avg })
        .eq('id', rateeId)
    }

    // Mark request as completed
    await supabase
      .from('requests')
      .update({ status: 'completed' })
      .eq('id', id)

    router.push('/')
  }

  return (
    <main className="min-h-screen bg-warm-white flex flex-col px-6 pt-14 pb-24">
      <h1
        className="font-playfair text-3xl text-charcoal mb-2"
        style={{ fontFamily: 'var(--font-playfair)' }}
      >
        Rate your <em className="text-terracotta">runner</em>
      </h1>
      <p className="text-muted text-sm mb-10">How did the run go?</p>

      {/* Stars */}
      <div className="flex justify-center gap-4 mb-10">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            onClick={() => setRating(star)}
            className={`text-5xl transition-transform ${
              star <= rating ? 'scale-110' : 'opacity-30'
            }`}
          >
            ⭐
          </button>
        ))}
      </div>

      {/* Labels */}
      <div className="flex justify-between px-2 mb-10">
        {['Terrible', 'Bad', 'OK', 'Good', 'Amazing'].map((label, i) => (
          <span
            key={label}
            className={`text-xs ${rating === i + 1 ? 'text-terracotta font-medium' : 'text-muted'}`}
          >
            {label}
          </span>
        ))}
      </div>

      {/* Note */}
      <div className="bg-cream rounded-2xl p-4 mb-6">
        <p className="text-xs text-muted uppercase tracking-wider mb-2">Leave a note (optional)</p>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Fast, friendly, got exactly what I asked for..."
          className="w-full bg-transparent text-sm text-charcoal resize-none outline-none h-20 placeholder:text-muted/50"
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={rating === 0 || submitting}
        className="w-full bg-charcoal text-cream py-4 rounded-2xl font-medium text-sm disabled:opacity-40"
      >
        {submitting ? 'Submitting...' : 'Submit & complete run →'}
      </button>

      <button
        onClick={() => router.push('/')}
        className="w-full text-muted text-sm py-3 mt-2"
      >
        Skip for now
      </button>
    </main>
  )
}