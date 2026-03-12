'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin() {
    setLoading(true)
    setError('')

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
        // Clear any stale session data and retry once
        localStorage.removeItem('lil-outing-auth')
        await supabase.auth.signOut()
        
        const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({ email, password })
        
        if (retryError) {
        setError(retryError.message)
        setLoading(false)
        return
        }
        
        router.push('/')
        return
    }

    router.push('/')
    }

  return (
    <main className="min-h-screen bg-warm-white flex flex-col">
      <div className="px-6 pt-20 pb-10">
        <h1
          className="font-playfair text-5xl text-charcoal mb-3"
          style={{ fontFamily: 'var(--font-playfair)' }}
        >
          Lil <em className="text-terracotta">Outing</em>
        </h1>
        <p className="text-muted text-sm tracking-widest uppercase">
          go out. help out.
        </p>
      </div>

      <div className="flex-1 px-6 flex flex-col gap-4">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-cream border border-sand rounded-2xl px-4 py-3.5 text-charcoal placeholder:text-muted outline-none focus:border-terracotta transition-colors"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          className="w-full bg-cream border border-sand rounded-2xl px-4 py-3.5 text-charcoal placeholder:text-muted outline-none focus:border-terracotta transition-colors"
        />

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          onClick={handleLogin}
          disabled={!email || !password || loading}
          className="w-full bg-charcoal text-cream py-4 rounded-2xl font-medium text-sm disabled:opacity-40"
        >
          {loading ? 'Signing in...' : 'Sign in →'}
        </button>

        <p className="text-sm text-muted text-center">
          No account?{' '}
          <a href="/signup" className="text-terracotta font-medium">Sign up</a>
        </p>
      </div>

      <div className="px-6 pb-12">
        <p className="text-muted text-xs text-center">Your outing awaits. 🥐</p>
      </div>
    </main>
  )
}