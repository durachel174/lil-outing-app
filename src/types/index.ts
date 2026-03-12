export type Category = 'food' | 'grocery' | 'bar' | 'event'

export type RequestStatus =
  | 'open' | 'claimed' | 'active'
  | 'in_transit' | 'delivered' | 'completed'
  | 'expired' | 'cancelled' | 'disputed'

export type User = {
  id: string
  phone: string
  full_name: string
  avatar_url: string | null
  bio: string | null
  neighborhood: string | null
  rating_as_buyer: number
  rating_as_runner: number
  total_runs: number
  total_requests: number
  wallet_balance: number
  is_verified: boolean
  created_at: string
}

export type Request = {
  id: string
  buyer_id: string
  runner_id: string | null
  category: Category
  title: string
  description: string | null
  location_name: string
  location_lat: number
  location_lng: number
  delivery_address: string | null
  offer_amount: number
  goods_estimate: number
  goods_actual: number | null
  spending_cap: number | null
  initiation_type: 'buyer_initiated' | 'runner_initiated'
  runner_session_id: string | null
  status: RequestStatus
  expires_at: string
  claimed_at: string | null
  completed_at: string | null
  created_at: string
  buyer?: User
}

export type RunnerSession = {
  id: string
  runner_id: string
  location_name: string
  location_lat: number
  location_lng: number
  max_orders: number
  orders_claimed: number
  delivery_type: 'deliver' | 'meetup' | 'buyer_choice'
  meetup_description: string | null
  available_until: string
  status: 'active' | 'full' | 'closed'
  created_at: string
  runner?: User
}