'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const neighborhoods = [
  'Inner Richmond', 'Outer Richmond', 'Mission', 'Castro',
  'Hayes Valley', 'Noe Valley', 'SoMa', 'Marina',
  'Pacific Heights', 'Haight-Ashbury', 'Sunset', 'Potrero Hill',
]

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [neighborhood, setNeighborhood] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSignup() {
    setLoading(true)
    setError('')

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (signUpError || !data.user) {
      setError(signUpError?.message ?? 'Something went wrong')
      setLoading(false)
      return
    }

    const { error: profileError } = await supabase.from('users').insert({
      id: data.user.id,
      email,
      full_name: fullName,
      neighborhood,
    })

    if (profileError) {
      setError(profileError.message)
      setLoading(false)
      return
    }

    router.push('/')
  }

  return (
    <main className="min-h-screen bg-warm-white flex flex-col">
      <div className="px-6 pt-16 pb-6">
        <h1
          className="font-playfair text-4xl text-charcoal mb-2"
          style={{ fontFamily: 'var(--font-playfair)' }}
        >
          Join Lil <em className="text-terracotta">Outing</em>
        </h1>
        <p className="text-muted text-sm">Already heading somewhere? Make it count.</p>
      </div>

      <div className="flex-1 px-6 flex flex-col gap-4">
        <input
          type="text"
          placeholder="Your name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full bg-cream border border-sand rounded-2xl px-4 py-3.5 text-charcoal placeholder:text-muted outline-none focus:border-terracotta transition-colors"
        />
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
          className="w-full bg-cream border border-sand rounded-2xl px-4 py-3.5 text-charcoal placeholder:text-muted outline-none focus:border-terracotta transition-colors"
        />

        <div>
          <p className="text-sm font-medium text-charcoal mb-2">Your neighborhood</p>
          <div className="flex flex-wrap gap-2">
            {neighborhoods.map((n) => (
              <button
                key={n}
                onClick={() => setNeighborhood(n)}
                className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                  neighborhood === n
                    ? 'bg-charcoal text-cream'
                    : 'bg-cream text-charcoal border border-sand-light'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          onClick={handleSignup}
          disabled={!email || !password || !fullName || !neighborhood || loading}
          className="w-full bg-charcoal text-cream py-4 rounded-2xl font-medium text-sm disabled:opacity-40"
        >
          {loading ? 'Creating account...' : "Let's go 🥐"}
        </button>

        <p className="text-sm text-muted text-center">
          Already have an account?{' '}
          <a href="/login" className="text-terracotta font-medium">Sign in</a>
        </p>
      </div>
    </main>
  )
}