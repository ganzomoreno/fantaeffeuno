'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import type { Driver, Team, Auction } from '@/types'
import { cn } from '@/lib/utils'

type OpenBid = {
  id: string
  driver_id: string
  team_id: string
  amount: number
  created_at: string
  team?: Team
}

type DriverWithOwner = Driver & {
  owner?: Team
  topBid?: { team: Team; amount: number }
}

export default function AstaPage() {
  const supabase = createClient()

  const [auction, setAuction] = useState<Auction | null>(null)
  const [drivers, setDrivers] = useState<DriverWithOwner[]>([])
  const [myTeam, setMyTeam] = useState<Team | null>(null)
  const [myDrivers, setMyDrivers] = useState<string[]>([])
  const [allTeams, setAllTeams] = useState<Team[]>([])
  const [openBids, setOpenBids] = useState<OpenBid[]>([])
  const [sealedBids, setSealedBids] = useState<{ driver_id: string; amount: number }[]>([])

  // UI state
  const [bidAmounts, setBidAmounts] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [auctionRes, teamRes] = await Promise.all([
      supabase.from('auctions').select('*').in('status', ['open', 'pending']).order('round').limit(1).single(),
      supabase.from('teams').select('*').eq('user_id', user.id).single(),
    ])

    setAuction(auctionRes.data)
    setMyTeam(teamRes.data)

    const [driversRes, teamsRes, myDriversRes, openBidsRes, sealedBidsRes] = await Promise.all([
      supabase.from('drivers').select('*').eq('is_active', true).order('constructor'),
      supabase.from('teams').select('*'),
      supabase.from('team_drivers').select('driver_id').eq('team_id', teamRes.data?.id ?? '').eq('is_active', true),
      auctionRes.data?.type === 'open'
        ? supabase.from('open_auction_bids').select('*, team:teams(*)').eq('auction_id', auctionRes.data.id)
        : Promise.resolve({ data: [] }),
      auctionRes.data?.type === 'sealed' && auctionRes.data.status === 'open'
        ? supabase.from('auction_bids').select('driver_id, amount').eq('auction_id', auctionRes.data?.id ?? '').eq('team_id', teamRes.data?.id ?? '')
        : Promise.resolve({ data: [] }),
    ])

    const allTeamsData = teamsRes.data ?? []
    setAllTeams(allTeamsData)

    const myDriverIds = myDriversRes.data?.map((d: { driver_id: string }) => d.driver_id) ?? []
    setMyDrivers(myDriverIds)

    // Enrich drivers with owner info
    const teamDriversRes = await supabase.from('team_drivers').select('driver_id, team_id').eq('is_active', true)
    const ownerMap: Record<string, string> = {}
    teamDriversRes.data?.forEach((td: { driver_id: string; team_id: string }) => { ownerMap[td.driver_id] = td.team_id })

    const enriched = (driversRes.data ?? []).map((d: Driver) => ({
      ...d,
      owner: allTeamsData.find(t => t.id === ownerMap[d.id]),
    }))
    setDrivers(enriched)

    setOpenBids(openBidsRes.data ?? [])
    setSealedBids(sealedBidsRes.data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Subscribe to realtime open bids
  useEffect(() => {
    if (!auction || auction.type !== 'open') return

    const channel = supabase
      .channel('open_bids')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'open_auction_bids' }, () => {
        loadData()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [auction, supabase, loadData])

  async function placeBid(driverId: string) {
    const amount = parseInt(bidAmounts[driverId] ?? '0')
    if (!amount || amount < 1) {
      toast.error('Inserisci un importo valido')
      return
    }
    if (!myTeam || amount > myTeam.fantamilioni) {
      toast.error('FantaMilioni insufficienti')
      return
    }
    if (myDrivers.length >= 4) {
      toast.error('Hai già 4 piloti! Non puoi fare altre offerte.')
      return
    }

    setSubmitting(driverId)
    try {
      if (auction?.type === 'open') {
        const { error } = await supabase.from('open_auction_bids').insert({
          auction_id: auction.id,
          driver_id: driverId,
          team_id: myTeam.id,
          amount,
        })
        if (error) throw error
        toast.success(`Offerta di ${amount}M inviata!`)
      } else if (auction?.type === 'sealed') {
        const { error } = await supabase.from('auction_bids').upsert(
          { auction_id: auction.id, driver_id: driverId, team_id: myTeam.id, amount },
          { onConflict: 'auction_id,team_id,driver_id' }
        )
        if (error) throw error
        toast.success(`Offerta sigillata di ${amount}M registrata!`)
        setSealedBids(prev => {
          const existing = prev.findIndex(b => b.driver_id === driverId)
          if (existing >= 0) {
            const updated = [...prev]
            updated[existing] = { driver_id: driverId, amount }
            return updated
          }
          return [...prev, { driver_id: driverId, amount }]
        })
      }
      setBidAmounts(prev => ({ ...prev, [driverId]: '' }))
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Errore nell\'offerta')
    } finally {
      setSubmitting(null)
    }
  }

  if (loading) {
    return <div className="text-zinc-400 text-center py-24">Caricamento asta...</div>
  }

  if (!auction) {
    return (
      <div className="text-center py-24 space-y-4">
        <div className="text-4xl">🏁</div>
        <h2 className="text-2xl font-black text-white">Nessuna asta attiva</h2>
        <p className="text-zinc-400">L&apos;asta iniziale è programmata per l&apos;inizio di marzo 2026.</p>
      </div>
    )
  }

  const freeDrivers = drivers.filter(d => !d.owner)
  const ownedDrivers = drivers.filter(d => d.owner)
  const myBudgetLeft = myTeam?.fantamilioni ?? 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-black text-white">Asta Piloti</h1>
          <div className="flex items-center gap-3 mt-1">
            <Badge className={auction.status === 'open' ? 'bg-green-900 text-green-300' : 'bg-zinc-800 text-zinc-400'}>
              {auction.status === 'open' ? '🔴 LIVE' : '⏳ In arrivo'}
            </Badge>
            <span className="text-zinc-400 text-sm">
              {auction.type === 'open' ? 'Asta Libera' : `Asta Chiusa · Round ${auction.round}`}
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-zinc-400">Il tuo budget</div>
          <div className="text-2xl font-black text-white font-mono">{myBudgetLeft}M</div>
          <div className="text-xs text-zinc-500">{myDrivers.length}/4 piloti</div>
        </div>
      </div>

      {auction.status === 'pending' && (
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4 text-zinc-400 text-sm">
          ℹ️ L&apos;asta non è ancora iniziata. Il SuperAdmin (Alessandro Zanin) aprirà l&apos;asta a breve.
        </div>
      )}

      <Tabs defaultValue="free">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="free">
            Piloti disponibili
            <Badge className="ml-2 bg-zinc-700 text-xs">{freeDrivers.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="owned">Piloti assegnati</TabsTrigger>
          {auction.type === 'sealed' && (
            <TabsTrigger value="mybids">
              Le mie offerte
              <Badge className="ml-2 bg-zinc-700 text-xs">{sealedBids.length}</Badge>
            </TabsTrigger>
          )}
        </TabsList>

        {/* Free drivers */}
        <TabsContent value="free" className="space-y-2 mt-4">
          {freeDrivers.length === 0 ? (
            <div className="text-zinc-500 text-center py-8">Tutti i piloti sono stati assegnati</div>
          ) : (
            freeDrivers.map(driver => {
              const myBid = sealedBids.find(b => b.driver_id === driver.id)
              const topOpenBid = openBids
                .filter(b => b.driver_id === driver.id)
                .sort((a, b) => b.amount - a.amount)[0]

              return (
                <Card key={driver.id} className="bg-zinc-900 border-zinc-800">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {/* Driver info */}
                      <div className="flex-1">
                        <div className="font-bold text-white">{driver.name}</div>
                        <div className="text-sm text-zinc-400">
                          {driver.constructor} · #{driver.number} · {driver.country}
                        </div>
                        {auction.type === 'open' && topOpenBid && (
                          <div className="text-xs text-yellow-400 mt-1">
                            Offerta top: {topOpenBid.amount}M da {(topOpenBid.team as Team)?.name}
                          </div>
                        )}
                        {auction.type === 'sealed' && myBid && (
                          <div className="text-xs text-green-400 mt-1">
                            ✓ Tua offerta: {myBid.amount}M
                          </div>
                        )}
                      </div>

                      {/* Bid input */}
                      {auction.status === 'open' && myDrivers.length < 4 && (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="1"
                            max={myBudgetLeft - Math.max(0, 3 - myDrivers.length) + 1}
                            placeholder="xM"
                            value={bidAmounts[driver.id] ?? ''}
                            onChange={e => setBidAmounts(prev => ({ ...prev, [driver.id]: e.target.value }))}
                            className="w-20 bg-zinc-800 border-zinc-700 text-center font-mono"
                          />
                          <Button
                            size="sm"
                            onClick={() => placeBid(driver.id)}
                            disabled={submitting === driver.id}
                            className="bg-red-600 hover:bg-red-700 text-xs"
                          >
                            {submitting === driver.id ? '...' : auction.type === 'open' ? 'Offri' : 'Sigilla'}
                          </Button>
                        </div>
                      )}

                      {myDrivers.includes(driver.id) && (
                        <Badge className="bg-green-900 text-green-300">Tuo</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </TabsContent>

        {/* Owned drivers */}
        <TabsContent value="owned" className="space-y-2 mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            {allTeams.map(team => {
              const teamOwnedDrivers = ownedDrivers.filter(d => d.owner?.id === team.id)
              return (
                <Card key={team.id} className={cn('bg-zinc-900 border-zinc-800', team.id === myTeam?.id && 'border-red-800')}>
                  <CardHeader className="pb-2">
                    <CardTitle className={cn('text-sm', team.id === myTeam?.id ? 'text-red-400' : 'text-white')}>
                      {team.name}
                      <span className="text-zinc-500 font-normal ml-2">· {team.fantamilioni}M rimasti</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {teamOwnedDrivers.length === 0 ? (
                      <div className="text-zinc-600 text-xs">Nessun pilota ancora</div>
                    ) : (
                      <div className="space-y-1">
                        {teamOwnedDrivers.map(d => (
                          <div key={d.id} className="flex justify-between text-sm">
                            <span className="text-white">{d.name}</span>
                            <span className="text-zinc-400">{d.constructor}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* My sealed bids */}
        {auction.type === 'sealed' && (
          <TabsContent value="mybids" className="space-y-2 mt-4">
            {sealedBids.length === 0 ? (
              <div className="text-zinc-500 text-center py-8">Nessuna offerta ancora</div>
            ) : (
              sealedBids.map(bid => {
                const driver = drivers.find(d => d.id === bid.driver_id)
                return (
                  <div key={bid.driver_id} className="flex items-center justify-between p-3 bg-zinc-900 rounded-lg border border-zinc-800">
                    <div>
                      <div className="font-medium text-white">{driver?.name}</div>
                      <div className="text-xs text-zinc-400">{driver?.constructor}</div>
                    </div>
                    <Badge className="bg-green-900 text-green-300 font-mono">{bid.amount}M</Badge>
                  </div>
                )
              })
            )}
            <div className="text-xs text-zinc-500 text-center mt-2">
              Le offerte sono sigillate fino alla chiusura dell&apos;asta
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
