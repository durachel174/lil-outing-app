import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export const supabase = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storageKey: 'lil-outing-auth',
      storage: {
        getItem: (key) => {
          if (typeof window === 'undefined') return null
          return window.localStorage.getItem(key)
        },
        setItem: (key, value) => {
          if (typeof window === 'undefined') return
          window.localStorage.setItem(key, value)
        },
        removeItem: (key) => {
          if (typeof window === 'undefined') return
          window.localStorage.removeItem(key)
        },
      },
    }
  }
)

export function createClient() { return supabase }