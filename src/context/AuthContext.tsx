'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { User as AppUser } from '@/types'
import { Session } from '@supabase/supabase-js'

type AuthContextType = {
  session: Session | null
  profile: AppUser | null
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  profile: null,
  loading: true,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        if (session?.user) await fetchProfile(session.user.id)
        else { setProfile(null); setLoading(false) }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId: string, retries = 3) {
  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (data) {
    setProfile(data as AppUser)
    setLoading(false)
  } else if (retries > 0) {
    // Profile might not be inserted yet — retry after delay
    await new Promise(resolve => setTimeout(resolve, 800))
    fetchProfile(userId, retries - 1)
  } else {
    setLoading(false)
  }
}

  return (
    <AuthContext.Provider value={{ session, profile, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)