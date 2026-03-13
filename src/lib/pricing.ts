import Fuse from 'fuse.js'

// Normalize item names for comparison
export function normalizeItemName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '') // strip punctuation
    .replace(/\s+/g, ' ')        // collapse whitespace
    .replace(/s$/, '')           // naive stemming — strip trailing s
    .replace(/cookies$/, 'cookie')
    .replace(/croissants$/, 'croissant')
    .replace(/muffins$/, 'muffin')
    .replace(/choco\b/, 'chocolate')
    .replace(/choc\b/, 'chocolate')
}


// Find matching canonical item from existing prices
export function findCanonicalItem(
  inputName: string,
  existingItems: { item_name: string; item_name_normalized: string }[]
): { item_name: string; item_name_normalized: string } | null {
  if (existingItems.length === 0) return null

  const fuse = new Fuse(existingItems, {
    keys: ['item_name_normalized'],
    threshold: 0.35, // 0 = exact, 1 = match anything
    includeScore: true,
  })

  const normalized = normalizeItemName(inputName)
  const results = fuse.search(normalized)

  if (results.length > 0 && results[0].score !== undefined && results[0].score < 0.35) {
    return results[0].item
  }

  return null
}

// Get price stats for an item at a location
export function getPriceStats(prices: number[]): {
  avg: number
  min: number
  max: number
  count: number
} {
  if (prices.length === 0) return { avg: 0, min: 0, max: 0, count: 0 }
  const avg = prices.reduce((a, b) => a + b, 0) / prices.length
  return {
    avg: Math.round(avg * 100) / 100,
    min: Math.min(...prices),
    max: Math.max(...prices),
    count: prices.length,
  }
}

export function normalizeLocationName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s*(bakery|café|cafe|coffee|market|bar|restaurant|burger)\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
}