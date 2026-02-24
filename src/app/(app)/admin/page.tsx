'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import type { Race, Driver, Auction } from '@/types'
import { calculateTeamScore } from '@/lib/scoring'
import type { Lineup } from '@/types'

const SUPER_ADMIN_EMAIL = 'zanin.ale95@gmail.com' // Alessandro Zanin

type ResultRow = {
  driver_id: string
  position: string
  dnf: boolean
  dotd_position: string
  fastest_lap: boolean
  pole_position: boolean
  overtakes: string
}

export default function AdminPage() {
  const supabase = createClient()

  const [isAdmin, setIsAdmin] = useState(false)
  const [races, setRaces] = useState<Race[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [auctions, setAuctions] = useState<Auction[]>([])
  const [selectedRace, setSelectedRace] = useState<string>('')
  const [resultRows, setResultRows] = useState<ResultRow[]>([])
  const [loading, setLoading] = useState(true)
  const [publishing, setPublishing] = useState(false)

  // Open auction management
  const [currentBids, setCurrentBids] = useState<{
    driver_id: string
    team_id: string
    amount: number
    team_name: string
    driver_name: string
  }[]>([])

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    if (user.email !== SUPER_ADMIN_EMAIL) {
      setIsAdmin(false)
      setLoading(false)
      return
    }
    setIsAdmin(true)

    const [racesRes, driversRes, auctionsRes] = await Promise.all([
      supabase.from('races').select('*').order('round'),
      supabase.from('drivers').select('*').eq('is_active', true).order('constructor'),
      supabase.from('auctions').select('*').order('round'),
    ])

    setRaces(racesRes.data ?? [])
    setDrivers(driversRes.data ?? [])
    setAuctions(auctionsRes.data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    if (!selectedRace) return
    // Init result rows for all drivers
    setResultRows(drivers.map(d => ({
      driver_id: d.id,
      position: '',
      dnf: false,
      dotd_position: '',
      fastest_lap: false,
      pole_position: false,
      overtakes: '0',
    })))
    // Load existing results if any
    supabase.from('race_results').select('*').eq('race_id', selectedRace).then(({ data }) => {
      if (!data || data.length === 0) return
      setResultRows(drivers.map(d => {
        const existing = data.find(r => r.driver_id === d.id)
        if (existing) {
          return {
            driver_id: d.id,
            position: existing.position?.toString() ?? '',
            dnf: existing.dnf,
            dotd_position: existing.dotd_position?.toString() ?? '',
            fastest_lap: existing.fastest_lap,
            pole_position: existing.pole_position,
            overtakes: existing.overtakes?.toString() ?? '0',
          }
        }
        return { driver_id: d.id, position: '', dnf: false, dotd_position: '', fastest_lap: false, pole_position: false, overtakes: '0' }
      }))
    })
  }, [selectedRace, drivers, supabase])

  function updateRow(driverId: string, field: keyof ResultRow, value: string | boolean) {
    setResultRows(prev => prev.map(r =>
      r.driver_id === driverId ? { ...r, [field]: value } : r
    ))
  }

  async function publishResults() {
    if (!selectedRace) return
    setPublishing(true)

    try {
      // Upsert results
      const resultsPayload = resultRows.map(r => ({
        race_id: selectedRace,
        driver_id: r.driver_id,
        position: r.dnf ? null : (parseInt(r.position) || null),
        dnf: r.dnf,
        dotd_position: parseInt(r.dotd_position) || null,
        fastest_lap: r.fastest_lap,
        pole_position: r.pole_position,
        overtakes: parseInt(r.overtakes) || 0,
      }))

      const { error: resultsError } = await supabase
        .from('race_results')
        .upsert(resultsPayload, { onConflict: 'race_id,driver_id' })

      if (resultsError) throw resultsError

      // Mark race as published
      await supabase.from('races').update({ results_published: true }).eq('id', selectedRace)

      // Calculate scores for all teams
      const [lineupRes, teamsRes] = await Promise.all([
        supabase.from('lineups').select('*').eq('race_id', selectedRace),
        supabase.from('teams').select('*'),
      ])

      const race = races.find(r => r.id === selectedRace)

      const scorePayloads = (lineupRes.data ?? []).map((lineup: Lineup) => {
        const score = calculateTeamScore(lineup, resultsPayload.map(r => ({
          ...r,
          id: '',
          race_id: selectedRace,
        })), race?.is_sprint ?? false)

        return {
          team_id: lineup.team_id,
          race_id: selectedRace,
          driver1_id: lineup.driver1_id,
          driver2_id: lineup.driver2_id,
          driver3_id: lineup.driver3_id,
          driver1_points: score.driver1_points,
          driver2_points: score.driver2_points,
          driver3_points: score.driver3_points,
          total_points: score.total_points,
          breakdown: score.breakdown,
        }
      })

      // Apply missing lineup penalty (-5 race, -2 sprint)
      const teamsWithLineup = new Set(lineupRes.data?.map((l: Lineup) => l.team_id))
      const penalty = race?.is_sprint ? -2 : -5

      for (const team of (teamsRes.data ?? [])) {
        if (!teamsWithLineup.has(team.id)) {
          scorePayloads.push({
            team_id: team.id,
            race_id: selectedRace,
            driver1_id: null,
            driver2_id: null,
            driver3_id: null,
            driver1_points: 0,
            driver2_points: 0,
            driver3_points: penalty,
            total_points: penalty,
            breakdown: [{ note: 'Penalità mancato schieramento', points: penalty }],
          })
        }
      }

      if (scorePayloads.length > 0) {
        const { error: scoreError } = await supabase
          .from('race_scores')
          .upsert(scorePayloads, { onConflict: 'team_id,race_id' })
        if (scoreError) throw scoreError
      }

      toast.success('Risultati pubblicati e punteggi calcolati!')
      loadData()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Errore')
    } finally {
      setPublishing(false)
    }
  }

  async function toggleAuctionStatus(auctionId: string, currentStatus: string) {
    const newStatus = currentStatus === 'open' ? 'closed' : currentStatus === 'pending' ? 'open' : 'closed'
    const { error } = await supabase.from('auctions').update({ status: newStatus }).eq('id', auctionId)
    if (error) { toast.error(error.message); return }
    toast.success(`Asta ${newStatus === 'open' ? 'aperta' : 'chiusa'}`)
    loadData()
  }

  async function loadOpenBids(auctionId: string) {
    const { data } = await supabase
      .from('open_auction_bids')
      .select('*, team:teams(name), driver:drivers(name)')
      .eq('auction_id', auctionId)
      .order('created_at', { ascending: false })

    setCurrentBids(data?.map((b: { driver_id: string; team_id: string; amount: number; team: { name: string }; driver: { name: string } }) => ({
      driver_id: b.driver_id,
      team_id: b.team_id,
      amount: b.amount,
      team_name: b.team?.name ?? '',
      driver_name: b.driver?.name ?? '',
    })) ?? [])
  }

  async function assignDriver(driverId: string, teamId: string, price: number, auctionId: string) {
    try {
      // Add to team_drivers
      const { error: tdError } = await supabase.from('team_drivers').upsert({
        team_id: teamId,
        driver_id: driverId,
        purchase_price: price,
        auction_id: auctionId,
      }, { onConflict: 'team_id,driver_id' })
      if (tdError) throw tdError

      // Deduct fantamilioni
      const { data: team } = await supabase.from('teams').select('fantamilioni').eq('id', teamId).single()
      if (team) {
        await supabase.from('teams').update({ fantamilioni: team.fantamilioni - price }).eq('id', teamId)
      }

      toast.success('Pilota assegnato!')
      loadData()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Errore')
    }
  }

  if (loading) return <div className="text-zinc-400 text-center py-24">Caricamento...</div>

  if (!isAdmin) {
    return (
      <div className="text-center py-24 space-y-3">
        <div className="text-4xl">🔒</div>
        <h2 className="text-xl font-black text-white">Accesso negato</h2>
        <p className="text-zinc-400">Solo il SuperAdmin può accedere a questa pagina.</p>
        <p className="text-zinc-500 text-sm italic">
          &quot;I partecipanti concordano nel nominare SuperAdmin Alessandro Zanin.&quot;
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-3xl font-black text-white">Admin Panel</h1>
        <Badge className="bg-red-900 text-red-300">SuperAdmin</Badge>
      </div>

      <Tabs defaultValue="results">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="results">Risultati gara</TabsTrigger>
          <TabsTrigger value="auctions">Gestione aste</TabsTrigger>
        </TabsList>

        {/* Race results */}
        <TabsContent value="results" className="space-y-4 mt-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">Inserisci risultati</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={selectedRace} onValueChange={setSelectedRace}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue placeholder="Seleziona gara" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  {races.map(r => (
                    <SelectItem key={r.id} value={r.id}>
                      Round {r.round} · {r.name} {r.is_sprint ? '(Sprint)' : ''} {r.results_published ? '✓' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedRace && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-zinc-800">
                        <th className="text-left text-zinc-400 pb-2 font-medium w-40">Pilota</th>
                        <th className="text-center text-zinc-400 pb-2 font-medium">Pos</th>
                        <th className="text-center text-zinc-400 pb-2 font-medium">DNF</th>
                        <th className="text-center text-zinc-400 pb-2 font-medium">DotD</th>
                        <th className="text-center text-zinc-400 pb-2 font-medium">FL</th>
                        <th className="text-center text-zinc-400 pb-2 font-medium">Pole</th>
                        <th className="text-center text-zinc-400 pb-2 font-medium">OVT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultRows.map(row => {
                        const driver = drivers.find(d => d.id === row.driver_id)
                        return (
                          <tr key={row.driver_id} className="border-b border-zinc-800/50">
                            <td className="py-1.5 pr-2">
                              <div className="font-medium text-white">{driver?.name}</div>
                              <div className="text-zinc-500">{driver?.constructor}</div>
                            </td>
                            <td className="text-center py-1.5">
                              <Input
                                type="number" min="1" max="20"
                                value={row.position}
                                onChange={e => updateRow(row.driver_id, 'position', e.target.value)}
                                disabled={row.dnf}
                                className="w-14 h-7 bg-zinc-800 border-zinc-700 text-center text-xs"
                              />
                            </td>
                            <td className="text-center py-1.5">
                              <input
                                type="checkbox"
                                checked={row.dnf}
                                onChange={e => updateRow(row.driver_id, 'dnf', e.target.checked)}
                                className="accent-red-600 w-4 h-4"
                              />
                            </td>
                            <td className="text-center py-1.5">
                              <Select
                                value={row.dotd_position || 'none'}
                                onValueChange={v => updateRow(row.driver_id, 'dotd_position', v === 'none' ? '' : v)}
                              >
                                <SelectTrigger className="w-16 h-7 bg-zinc-800 border-zinc-700 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-zinc-700">
                                  <SelectItem value="none">-</SelectItem>
                                  <SelectItem value="1">1°</SelectItem>
                                  <SelectItem value="2">2°</SelectItem>
                                  <SelectItem value="3">3°</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="text-center py-1.5">
                              <input
                                type="checkbox"
                                checked={row.fastest_lap}
                                onChange={e => updateRow(row.driver_id, 'fastest_lap', e.target.checked)}
                                className="accent-red-600 w-4 h-4"
                              />
                            </td>
                            <td className="text-center py-1.5">
                              <input
                                type="checkbox"
                                checked={row.pole_position}
                                onChange={e => updateRow(row.driver_id, 'pole_position', e.target.checked)}
                                className="accent-red-600 w-4 h-4"
                              />
                            </td>
                            <td className="text-center py-1.5">
                              <Input
                                type="number" min="0"
                                value={row.overtakes}
                                onChange={e => updateRow(row.driver_id, 'overtakes', e.target.value)}
                                className="w-14 h-7 bg-zinc-800 border-zinc-700 text-center text-xs"
                              />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {selectedRace && (
                <Button
                  onClick={publishResults}
                  disabled={publishing}
                  className="w-full bg-red-600 hover:bg-red-700 font-bold"
                >
                  {publishing ? 'Pubblicazione...' : 'Pubblica risultati e calcola punteggi'}
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Auction management */}
        <TabsContent value="auctions" className="space-y-4 mt-4">
          {auctions.map(auction => (
            <Card key={auction.id} className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-white">
                      {auction.round === 0 ? 'Asta Iniziale' : `Asta Round ${auction.round}`}
                    </div>
                    <div className="text-xs text-zinc-400">
                      {auction.type === 'open' ? 'Asta libera' : 'Asta chiusa'} · {auction.status}
                    </div>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Badge className={
                      auction.status === 'open' ? 'bg-green-900 text-green-300' :
                      auction.status === 'pending' ? 'bg-yellow-900 text-yellow-300' :
                      'bg-zinc-700 text-zinc-400'
                    }>
                      {auction.status}
                    </Badge>
                    {auction.status !== 'closed' && (
                      <Button
                        size="sm"
                        onClick={() => toggleAuctionStatus(auction.id, auction.status)}
                        className={auction.status === 'open' ? 'bg-zinc-700 hover:bg-zinc-600 text-xs' : 'bg-green-700 hover:bg-green-600 text-xs'}
                      >
                        {auction.status === 'open' ? 'Chiudi' : 'Apri'}
                      </Button>
                    )}
                    {auction.type === 'open' && auction.status === 'open' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => loadOpenBids(auction.id)}
                        className="text-xs border-zinc-600"
                      >
                        Vedi offerte
                      </Button>
                    )}
                  </div>
                </div>

                {/* Open bids table */}
                {currentBids.length > 0 && (
                  <div className="mt-4 space-y-1">
                    {currentBids.map((bid, i) => (
                      <div key={i} className="flex items-center justify-between text-sm p-2 bg-zinc-800 rounded">
                        <span className="text-white">{bid.driver_name}</span>
                        <span className="text-zinc-400">{bid.team_name}</span>
                        <span className="font-mono text-yellow-400">{bid.amount}M</span>
                        <Button
                          size="sm"
                          onClick={() => assignDriver(bid.driver_id, bid.team_id, bid.amount, auction.id)}
                          className="text-xs bg-green-800 hover:bg-green-700 h-6"
                        >
                          Assegna
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}
