'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { formatCurrency } from '@/lib/utils'
import { normalizeItemName, findCanonicalItem, normalizeLocationName } from '@/lib/pricing'

type RequestItem = {
  id: string
  item_name: string
  quantity: number
  estimated_price: number | null
  actual_price: number | null
}

export default function PriceConfirmPage() {
  const router = useRouter()
  const { id } = useParams()
  const { session } = useAuth()

  const [request, setRequest] = useState<any>(null)
  const [items, setItems] = useState<RequestItem[]>([])
  const [manualItems, setManualItems] = useState<{ name: string; price: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchData()
  }, [id])

  async function fetchData() {
    const [requestRes, itemsRes] = await Promise.all([
      supabase.from('requests').select('*').eq('id', id).single(),
      supabase.from('request_items').select('*').eq('request_id', id),
    ])

    setRequest(requestRes.data)

    if (itemsRes.data && itemsRes.data.length > 0) {
      setItems(itemsRes.data.map(item => ({ ...item, actual_price: item.estimated_price })))
    } else {
      // No structured items — use manual entry
      setManualItems([{ name: '', price: '' }])
    }

    setLoading(false)
  }

  function updateActualPrice(itemId: string, price: string) {
    setItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, actual_price: parseFloat(price) || 0 } : item
    ))
  }

  function updateManualItem(index: number, field: 'name' | 'price', value: string) {
    setManualItems(prev => prev.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    ))
  }

  function addManualItem() {
    setManualItems(prev => [...prev, { name: '', price: '' }])
  }

  async function handleSubmit() {
    if (!session || !request) return
    setSubmitting(true)

    const locationName = normalizeLocationName(request.location_name)

    // Write prices to item_prices table
    // Fetch existing items at this location for canonical matching
    const { data: existingPrices } = await supabase
    .from('item_prices')
    .select('item_name, item_name_normalized')
    .eq('location_name', locationName)

    const existingItems = existingPrices ?? []

    const priceRows = items.length > 0
    ? items
        .filter(item => item.actual_price && item.actual_price > 0)
        .map(item => {
            const canonical = findCanonicalItem(item.item_name, existingItems)
            return {
            location_name: locationName,
            item_name: canonical ? canonical.item_name : item.item_name,
            item_name_normalized: canonical ? canonical.item_name_normalized : normalizeItemName(item.item_name),
            price: item.actual_price,
            confirmed_by: session.user.id,
            request_id: id,
            }
        })
    : manualItems
        .filter(item => item.name && item.price)
        .map(item => {
            const canonical = findCanonicalItem(item.name, existingItems)
            return {
            location_name: locationName,
            item_name: canonical ? canonical.item_name : item.name,
            item_name_normalized: canonical ? canonical.item_name_normalized : normalizeItemName(item.name),
            price: parseFloat(item.price),
            confirmed_by: session.user.id,
            request_id: id,
            }
        })

    if (priceRows.length > 0) {
      const { error: priceError } = await supabase.from('item_prices').insert(priceRows)
        console.log('price insert error:', priceError)
        console.log('price rows:', priceRows)
    }

    // Advance request to delivered
    await supabase
      .from('requests')
      .update({ status: 'delivered' })
      .eq('id', request.id)

    await supabase.from('request_events').insert({
      request_id: id,
      actor_id: session.user.id,
      from_status: 'in_transit',
      to_status: 'delivered',
      note: `Runner confirmed prices: ${priceRows.map(p => `${p.item_name} $${p.price}`).join(', ')}`,
    })

    router.push(`/request/${id}/active`)
  }

  const total = items.length > 0
    ? items.reduce((sum, item) => sum + (item.actual_price ?? 0), 0)
    : manualItems.reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0)

  if (loading) return (
    <main className="min-h-screen bg-warm-white flex items-center justify-center">
      <p className="text-4xl animate-pulse">🥐</p>
    </main>
  )

  return (
    <main className="min-h-screen bg-warm-white pb-24">
      <div className="px-6 pt-14 pb-4">
        <p className="text-xs text-muted uppercase tracking-wider mb-1">Price confirmation</p>
        <h1
          className="font-playfair text-3xl text-charcoal"
          style={{ fontFamily: 'var(--font-playfair)' }}
        >
          What did you <em className="text-terracotta">spend?</em>
        </h1>
        <p className="text-sm text-muted mt-1">
          This helps future buyers know what to expect at {request?.location_name}.
        </p>
      </div>

      <div className="px-6 flex flex-col gap-4">
        {/* Structured items */}
        {items.length > 0 && (
          <div className="bg-cream rounded-3xl p-5">
            <p className="text-xs text-muted uppercase tracking-wider mb-4">Items</p>
            <div className="flex flex-col gap-3">
              {items.map(item => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-charcoal">{item.item_name}</p>
                    {item.estimated_price && (
                      <p className="text-xs text-muted">est. {formatCurrency(item.estimated_price)}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-muted text-sm">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={item.actual_price ?? ''}
                      onChange={e => updateActualPrice(item.id, e.target.value)}
                      className="w-20 bg-warm-white rounded-xl px-3 py-2 text-sm text-charcoal outline-none text-right"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Manual items */}
        {manualItems.length > 0 && (
          <div className="bg-cream rounded-3xl p-5">
            <p className="text-xs text-muted uppercase tracking-wider mb-4">What did you get?</p>
            <div className="flex flex-col gap-3">
              {manualItems.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <input
                    type="text"
                    placeholder="Item name"
                    value={item.name}
                    onChange={e => updateManualItem(i, 'name', e.target.value)}
                    className="flex-1 bg-warm-white rounded-xl px-3 py-2 text-sm text-charcoal outline-none placeholder:text-muted/50"
                  />
                  <div className="flex items-center gap-1">
                    <span className="text-muted text-sm">$</span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={item.price}
                      onChange={e => updateManualItem(i, 'price', e.target.value)}
                      className="w-20 bg-warm-white rounded-xl px-3 py-2 text-sm text-charcoal outline-none text-right"
                    />
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={addManualItem}
              className="mt-3 text-sm text-terracotta font-medium"
            >
              + Add item
            </button>
          </div>
        )}

        {/* Total */}
        <div className="bg-cream rounded-3xl p-5 flex justify-between items-center">
          <p className="text-sm font-medium text-charcoal">Total spent</p>
          <p
            className="font-playfair text-2xl italic text-terracotta"
            style={{ fontFamily: 'var(--font-playfair)' }}
          >
            {formatCurrency(total)}
          </p>
        </div>

        {/* Context */}
        <div className="bg-sage/10 rounded-2xl p-4">
          <p className="text-xs text-charcoal/70 leading-relaxed">
            💡 Your prices help future buyers post accurate requests and runners know what to bring. Every confirmed price makes Lil Outing smarter.
          </p>
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full bg-charcoal text-cream py-4 rounded-2xl font-medium text-sm disabled:opacity-40"
        >
          {submitting ? 'Confirming...' : 'Confirm prices & mark delivered →'}
        </button>

        <button
          onClick={async () => {
            await supabase.from('requests').update({ status: 'delivered' }).eq('id', id as string)
            router.push(`/request/${id}/active`)
          }}
          className="w-full text-muted text-sm py-2"
        >
          Skip — I'll enter prices later
        </button>
      </div>
    </main>
  )
}