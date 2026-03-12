'use client'

import { useRouter, useParams } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'

export default function CompletePage() {
  const router = useRouter()
  const { id } = useParams()

  return (
    <main className="min-h-screen bg-warm-white flex flex-col items-center justify-center px-6 text-center">
      <p className="text-6xl mb-6">🥐</p>
      <h1
        className="font-playfair text-4xl text-charcoal mb-3"
        style={{ fontFamily: 'var(--font-playfair)' }}
      >
        Run <em className="text-terracotta">complete!</em>
      </h1>
      <p className="text-muted text-sm mb-10 max-w-xs">
        Your earnings are on their way to your wallet. Thanks for the lil outing.
      </p>
      <button
        onClick={() => router.push('/')}
        className="w-full max-w-xs bg-charcoal text-cream py-4 rounded-2xl font-medium text-sm"
      >
        Back to feed →
      </button>
    </main>
  )
}