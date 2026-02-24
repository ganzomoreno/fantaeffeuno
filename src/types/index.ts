export type Team = {
  id: string
  user_id: string
  name: string
  fantamilioni: number
  created_at: string
  // joined
  user_email?: string
}

export type Driver = {
  id: string
  name: string
  constructor: string
  number: number
  country: string
  is_active: boolean
}

export type Race = {
  id: string
  name: string
  circuit: string
  date: string
  is_sprint: boolean
  round: number
  season: number
  results_published: boolean
}

export type Auction = {
  id: string
  round: number
  type: 'open' | 'sealed'
  status: 'pending' | 'open' | 'closed'
  opens_at: string | null
  closes_at: string | null
  created_at: string
}

export type AuctionBid = {
  id: string
  auction_id: string
  team_id: string
  driver_id: string
  amount: number
  created_at: string
  // joined
  team?: Team
  driver?: Driver
}

export type TeamDriver = {
  id: string
  team_id: string
  driver_id: string
  purchase_price: number
  auction_id: string | null
  acquired_at: string
  is_active: boolean
  // joined
  driver?: Driver
  team?: Team
}

export type Lineup = {
  id: string
  team_id: string
  race_id: string
  driver1_id: string
  driver2_id: string
  driver3_id: string
  bench_driver_id: string
  submitted_at: string
  // joined
  driver1?: Driver
  driver2?: Driver
  driver3?: Driver
  bench_driver?: Driver
}

export type RaceResult = {
  id: string
  race_id: string
  driver_id: string
  position: number | null
  dnf: boolean
  dotd_position: number | null // 1=dotd winner, 2=2nd, 3=3rd
  fastest_lap: boolean
  pole_position: boolean
  overtakes: number
  // joined
  driver?: Driver
}

export type RaceScore = {
  id: string
  team_id: string
  race_id: string
  driver1_id: string | null
  driver2_id: string | null
  driver3_id: string | null
  driver1_points: number
  driver2_points: number
  driver3_points: number
  total_points: number
  breakdown: Record<string, unknown>
  // joined
  team?: Team
  race?: Race
}

export type Trade = {
  id: string
  proposer_team_id: string
  recipient_team_id: string
  offered_driver_id: string
  requested_driver_id: string
  cash_addition: number
  status: 'pending' | 'accepted' | 'rejected'
  created_at: string
  resolved_at: string | null
  // joined
  proposer_team?: Team
  recipient_team?: Team
  offered_driver?: Driver
  requested_driver?: Driver
}

export type SeasonStanding = {
  team_id: string
  team_name: string
  total_points: number
  races_scored: number
}

export type DriverPoints = {
  driver_id: string
  driver_name: string
  race_points: number
  position_points: number
  bonus_points: number
  total: number
}
