'use client'

import { usePathname, useRouter } from 'next/navigation'

const navItems = [
  { icon: '🏠', label: 'Home', href: '/' },
  { icon: '🗺️', label: 'Explore', href: '/explore' },
  { icon: null, label: 'Post', href: '/post' },
  { icon: '💬', label: 'Messages', href: '/messages' },
  { icon: '👤', label: 'Profile', href: '/profile' },
]

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-warm-white border-t border-sand-light flex justify-around items-center px-2 pb-8 pt-3 z-50">
      {navItems.map((item) => {
        if (!item.icon) {
            return (
                <button
                key={item.href}
                onClick={() => router.push('/post')}
                className="w-13 h-13 rounded-full bg-charcoal flex items-center justify-center shadow-lg -mt-4 px-4 py-4"
                >
                <span className="text-cream text-2xl leading-none">+</span>
                </button>
            )
            }

        const isActive = pathname === item.href

        return (
          <button
            key={item.href}
            onClick={() => router.push(item.href)}
            className="flex flex-col items-center gap-1 px-3 py-1"
          >
            <span className="text-xl">{item.icon}</span>
            <span
              className={`text-xs ${
                isActive ? 'text-terracotta font-medium' : 'text-muted'
              }`}
            >
              {item.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}