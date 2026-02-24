'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import type { Driver, Team, Trade } from '@/types'

type TeamDriver = { team_id: string; driver: Driver }

export default function MercatoPage() {
  const supabase = createClient()

  const [myTeam, setMyTeam] = useState<Team | null>(null)
  const [myDrivers, setMyDrivers] = useState<Driver[]>([])
  const [allTeams, setAllTeams] = useState<Team[]>([])
  const [teamDrivers, setTeamDrivers] = useState<TeamDriver[]>([])
  const [incomingTrades, setIncomingTrades] = useState<Trade[]>([])
  const [outgoingTrades, setOutgoingTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)

  // New trade form
  const [tradeForm, setTradeForm] = useState({
    recipientTeamId: '',
    offeredDriverId: '',
    requestedDriverId: '',
    cashAddition: '0',
  })

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: team } = await supabase.from('teams').select('*').eq('user_id', user.id).single()
    setMyTeam(team)

    const [teamsRes, myDriversRes, allDriversRes, tradesRes] = await Promise.all([
      supabase.from('teams').select('*'),
      supabase.from('team_drivers').select('*, driver:drivers(*)').eq('team_id', team?.id ?? '').eq('is_active', true),
      supabase.from('team_drivers').select('team_id, driver:drivers(*)').eq('is_active', true),
      supabase.from('trades').select(`
        *,
        proposer_team:teams!trades_proposer_team_id_fkey(*),
        recipient_team:teams!trades_recipient_team_id_fkey(*),
        offered_driver:drivers!trades_offered_driver_id_fkey(*),
        requested_driver:drivers!trades_requested_driver_id_fkey(*)
      `).or(`proposer_team_id.eq.${team?.id},recipient_team_id.eq.${team?.id}`).order('created_at', { ascending: false }),
    ])

    setAllTeams(teamsRes.data ?? [])
    setMyDrivers(myDriversRes.data?.map((td: { driver: Driver }) => td.driver).filter(Boolean) ?? [])
    setTeamDrivers(allDriversRes.data?.map((td: { team_id: string; driver: Driver }) => ({
      team_id: td.team_id,
      driver: td.driver,
    })).filter((td: TeamDriver) => td.driver) ?? [])

    const trades = tradesRes.data ?? []
    setIncomingTrades(trades.filter((t: Trade) => t.recipient_team_id === team?.id && t.status === 'pending'))
    setOutgoingTrades(trades.filter((t: Trade) => t.proposer_team_id === team?.id))

    setLoading(false)
  }, [supabase])

  useEffect(() => { loadData() }, [loadData])

  const recipientTeamDrivers = teamDrivers.filter(td => td.team_id === tradeForm.recipientTeamId)

  async function proposeTrade() {
    if (!tradeForm.recipientTeamId || !tradeForm.offeredDriverId || !tradeForm.requestedDriverId) {
      toast.error('Compila tutti i campi')
      return
    }
    if (!myTeam) return

    const cash = parseInt(tradeForm.cashAddition) || 0
    if (cash < 0 && Math.abs(cash) > myTeam.fantamilioni) {
      toast.error('FantaMilioni insufficienti per questa proposta')
      return
    }

    try {
      const { error } = await supabase.from('trades').insert({
        proposer_team_id: myTeam.id,
        recipient_team_id: tradeForm.recipientTeamId,
        offered_driver_id: tradeForm.offeredDriverId,
        requested_driver_id: tradeForm.requestedDriverId,
        cash_addition: cash,
      })
      if (error) throw error
      toast.success('Proposta di scambio inviata!')
      setTradeForm({ recipientTeamId: '', offeredDriverId: '', requestedDriverId: '', cashAddition: '0' })
      loadData()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Errore')
    }
  }

  async function respondTrade(tradeId: string, accept: boolean) {
    try {
      const trade = incomingTrades.find(t => t.id === tradeId)
      if (!trade || !myTeam) return

      if (accept) {
        // Swap drivers
        const { error: e1 } = await supabase.from('team_drivers')
          .update({ team_id: trade.recipient_team_id })
          .eq('driver_id', trade.offered_driver_id)
          .eq('team_id', trade.proposer_team_id)

        const { error: e2 } = await supabase.from('team_drivers')
          .update({ team_id: trade.proposer_team_id })
          .eq('driver_id', trade.requested_driver_id)
          .eq('team_id', trade.recipient_team_id)

        if (e1 || e2) throw e1 ?? e2

        // Transfer cash
        if (trade.cash_addition !== 0) {
          await supabase.from('teams')
            .update({ fantamilioni: myTeam.fantamilioni - trade.cash_addition })
            .eq('id', trade.recipient_team_id)
        }
      }

      await supabase.from('trades')
        .update({ status: accept ? 'accepted' : 'rejected', resolved_at: new Date().toISOString() })
        .eq('id', tradeId)

      toast.success(accept ? 'Scambio accettato!' : 'Proposta rifiutata')
      loadData()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Errore')
    }
  }

  if (loading) return <div className="text-zinc-400 text-center py-24">Caricamento...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white">Mercato Piloti</h1>
          <p className="text-zinc-400 text-sm mt-1">Budget disponibile: <span className="text-white font-bold font-mono">{myTeam?.fantamilioni}M</span></p>
        </div>

        {/* New trade button */}
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-red-600 hover:bg-red-700">Proponi scambio</Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
            <DialogHeader>
              <DialogTitle>Nuova proposta di scambio</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Con quale team?</Label>
                <Select value={tradeForm.recipientTeamId} onValueChange={v => setTradeForm(p => ({ ...p, recipientTeamId: v }))}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue placeholder="Scegli team" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    {allTeams.filter(t => t.id !== myTeam?.id).map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Offri (tuo pilota)</Label>
                <Select value={tradeForm.offeredDriverId} onValueChange={v => setTradeForm(p => ({ ...p, offeredDriverId: v }))}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue placeholder="Pilota da cedere" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    {myDrivers.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.name} ({d.constructor})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Richiedi (loro pilota)</Label>
                <Select
                  value={tradeForm.requestedDriverId}
                  onValueChange={v => setTradeForm(p => ({ ...p, requestedDriverId: v }))}
                  disabled={!tradeForm.recipientTeamId}
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue placeholder="Pilota che vuoi" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    {recipientTeamDrivers.map(td => (
                      <SelectItem key={td.driver.id} value={td.driver.id}>{td.driver.name} ({td.driver.constructor})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Cash aggiuntivo (negativo = ricevi)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={tradeForm.cashAddition}
                  onChange={e => setTradeForm(p => ({ ...p, cashAddition: e.target.value }))}
                  className="bg-zinc-800 border-zinc-700 font-mono"
                />
                <div className="text-xs text-zinc-500">
                  Positivo = paghi tu · Negativo = ricevi
                </div>
              </div>

              <Button onClick={proposeTrade} className="w-full bg-red-600 hover:bg-red-700">
                Invia proposta
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="incoming">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="incoming">
            Ricevute
            {incomingTrades.length > 0 && (
              <Badge className="ml-2 bg-red-700 text-white text-xs">{incomingTrades.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="outgoing">Inviate</TabsTrigger>
          <TabsTrigger value="roster">Rosa piloti</TabsTrigger>
        </TabsList>

        {/* Incoming trades */}
        <TabsContent value="incoming" className="space-y-3 mt-4">
          {incomingTrades.length === 0 ? (
            <div className="text-zinc-500 text-center py-8">Nessuna proposta ricevuta</div>
          ) : (
            incomingTrades.map(trade => (
              <Card key={trade.id} className="bg-zinc-900 border-zinc-800 border-yellow-800">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-bold text-yellow-400">
                      Da: {(trade.proposer_team as Team)?.name}
                    </div>
                    <div className="text-xs text-zinc-500">
                      {new Date(trade.created_at).toLocaleDateString('it')}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="text-green-400">+ {(trade.offered_driver as Driver)?.name}</div>
                    <div className="text-zinc-500">↔</div>
                    <div className="text-red-400">- {(trade.requested_driver as Driver)?.name}</div>
                    {trade.cash_addition !== 0 && (
                      <Badge className={trade.cash_addition > 0 ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}>
                        {trade.cash_addition > 0 ? `+${trade.cash_addition}M` : `${trade.cash_addition}M`}
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" onClick={() => respondTrade(trade.id, true)} className="bg-green-700 hover:bg-green-600 text-xs">
                      Accetta
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => respondTrade(trade.id, false)} className="border-red-800 text-red-400 text-xs">
                      Rifiuta
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Outgoing trades */}
        <TabsContent value="outgoing" className="space-y-3 mt-4">
          {outgoingTrades.length === 0 ? (
            <div className="text-zinc-500 text-center py-8">Nessuna proposta inviata</div>
          ) : (
            outgoingTrades.map(trade => (
              <Card key={trade.id} className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm">
                      <span className="text-zinc-400">Per:</span>{' '}
                      <span className="font-bold text-white">{(trade.recipient_team as Team)?.name}</span>
                    </div>
                    <Badge className={
                      trade.status === 'accepted' ? 'bg-green-900 text-green-300' :
                      trade.status === 'rejected' ? 'bg-red-900 text-red-300' :
                      'bg-yellow-900 text-yellow-300'
                    }>
                      {trade.status === 'accepted' ? 'Accettata' : trade.status === 'rejected' ? 'Rifiutata' : 'In attesa'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="text-red-400">- {(trade.offered_driver as Driver)?.name}</div>
                    <div className="text-zinc-500">↔</div>
                    <div className="text-green-400">+ {(trade.requested_driver as Driver)?.name}</div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Roster overview */}
        <TabsContent value="roster" className="mt-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allTeams.map(team => {
              const tDrivers = teamDrivers.filter(td => td.team_id === team.id)
              return (
                <Card key={team.id} className={`bg-zinc-900 border-zinc-800 ${team.id === myTeam?.id ? 'border-red-800' : ''}`}>
                  <CardHeader className="pb-2">
                    <CardTitle className={`text-sm ${team.id === myTeam?.id ? 'text-red-400' : 'text-white'}`}>
                      {team.name}
                      <span className="text-zinc-500 font-normal ml-1">· {team.fantamilioni}M</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {tDrivers.length === 0 ? (
                      <div className="text-zinc-600 text-xs">Nessun pilota</div>
                    ) : (
                      <div className="space-y-1">
                        {tDrivers.map(td => (
                          <div key={td.driver.id} className="flex justify-between text-sm">
                            <span className="text-white">{td.driver.name}</span>
                            <span className="text-zinc-500 text-xs">{td.driver.constructor}</span>
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
      </Tabs>
    </div>
  )
}
