import { Request } from '@/types'
import { formatCurrency, formatTimeAgo, getCategoryEmoji, getInitials } from '@/lib/utils'

type Props = {
  request: Request
  onClaim?: (id: string) => void
}

export default function RequestCard({ request, onClaim }: Props) {
  return (
    <div className="bg-warm-white border border-sand-light rounded-2xl p-4 flex flex-col gap-3">
      {/* Top row */}
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-cream flex items-center justify-center text-base flex-shrink-0">
              {getCategoryEmoji(request.category)}
            </div>
            <span className="font-medium text-charcoal text-sm">
              {request.title}
            </span>
          </div>
          <div className="flex items-center gap-2 pl-10">
            <span className="text-xs text-muted">{request.location_name}</span>
            <span className="w-1 h-1 rounded-full bg-sand" />
            <span className="text-xs text-muted">
              {formatTimeAgo(request.created_at)}
            </span>
          </div>
        </div>

        {/* Earn amount */}
        <div className="flex flex-col items-end">
          <span className="font-playfair text-xl italic text-terracotta leading-none">
            {formatCurrency(request.offer_amount)}
          </span>
          <span className="text-xs text-muted mt-0.5">to earn</span>
        </div>
      </div>

      {/* Description */}
      {request.description && (
        <p className="text-xs text-muted leading-relaxed line-clamp-2 pl-10">
          {request.description}
        </p>
      )}

      {/* Bottom row */}
      <div className="flex justify-between items-center pt-1 border-t border-sand-light">
        <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-sand flex items-center justify-center text-xs font-medium text-charcoal">
                {request.buyer ? getInitials(request.buyer.full_name) : '?'}
            </div>
            <span className="text-xs text-muted">
                {request.buyer?.full_name ?? 'Someone'} ·{' '}
                ⭐ {request.buyer?.rating_as_buyer?.toFixed(1) ?? '5.0'}
            </span>
            </div>

        <button
          onClick={() => onClaim?.(request.id)}
          className="bg-charcoal text-cream text-xs font-medium px-4 py-1.5 rounded-full"
        >
          I'm going →
        </button>
      </div>
    </div>
  )
}