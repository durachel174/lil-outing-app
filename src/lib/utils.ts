export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`
}

export function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export function formatTimeLeft(dateStr: string): string {
  const diff = new Date(dateStr).getTime() - Date.now()
  if (diff <= 0) return 'expired'
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `${minutes}m left`
  const hours = Math.floor(minutes / 60)
  return `${hours}h left`
}

export function getCategoryEmoji(category: string): string {
  const map: Record<string, string> = {
    food: '🥐',
    grocery: '🛒',
    bar: '🍸',
    event: '🎵',
  }
  return map[category] ?? '📦'
}

export function getCategoryLabel(category: string): string {
  const map: Record<string, string> = {
    food: 'Food',
    grocery: 'Grocery',
    bar: 'Bar',
    event: 'Event',
  }
  return map[category] ?? category
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}