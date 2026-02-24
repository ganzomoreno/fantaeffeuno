'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import type { Driver, Lineup, Race } from '@/types'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { cn } from '@/lib/utils'

export default function FormazionePage() {
  const params = useParams()
  const raceId = params.raceId as string
  const supabase = createClient()

  const [race, setRace] = useState<Race | null>(null)
  const [myDrivers, setMyDrivers] = useState<Driver[]>([])
  const [currentLineup, setCurrentLineup] = useState<Lineup | null>(null)
  const [selected, setSelected] = useState<string[]>([]) // 3 starters
  const [bench, setBench] = useState<string>('')
  const [teamId, setTeamId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [switchesLeft, setSwitchesLeft] = useState(3)

  useEffect(() => {
    loadData()
  }, [raceId])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [raceRes, teamRes] = await Promise.all([
      supabase.from('races').select('*').eq('id', raceId).single(),
      supabase.from('teams').select('*').eq('user_id', user.id).single(),
    ])

    setRace(raceRes.data)
    setTeamId(teamRes.data?.id ?? '')

    const [driversRes, lineupRes, switchesRes] = await Promise.all([
      supabase.from('team_drivers')
        .select('*, driver:drivers(*)')
        .eq('team_id', teamRes.data?.id ?? '')
        .eq('is_active', true),
      supabase.from('lineups')
        .select('*')
        .eq('team_id', teamRes.data?.id ?? '')
        .eq('race_id', raceId)
        .single(),
      supabase.from('season_switches')
        .select('id')
        .eq('team_id', teamRes.data?.id ?? ''),
    ])

    const drivers = driversRes.data?.map((td: { driver: Driver }) => td.driver).filter(Boolean) ?? []
    setMyDrivers(drivers)
    setSwitchesLeft(3 - (switchesRes.data?.length ?? 0))

    if (lineupRes.data) {
      setCurrentLineup(lineupRes.data)
      setSelected([lineupRes.data.driver1_id, lineupRes.data.driver2_id, lineupRes.data.driver3_id])
      setBench(lineupRes.data.bench_driver_id)
    }

    setLoading(false)
  }

  function toggleDriver(driverId: string) {
    if (bench === driverId) {
      setBench('')
      return
    }

    if (selected.includes(driverId)) {
      setSelected(prev => prev.filter(id => id !== driverId))
    } else {
      if (selected.length < 3) {
        setSelected(prev => [...prev, driverId])
      } else {
        toast.error('Hai già 3 titolari. Rimuovi uno prima di aggiungerne un altro.')
      }
    }
  }

  function setBenchDriver(driverId: string) {
    if (selected.includes(driverId)) {
      toast.error('Questo pilota è già titolare')
      return
    }
    setBench(driverId)
  }

  async function saveLineup() {
    if (selected.length !== 3) {
      toast.error('Devi selezionare esattamente 3 titolari')
      return
    }
    if (!bench) {
      toast.error('Devi selezionare un panchinaro')
      return
    }

    setSaving(true)
    try {
      const payload = {
        team_id: teamId,
        race_id: raceId,
        driver1_id: selected[0],
        driver2_id: selected[1],
        driver3_id: selected[2],
        bench_driver_id: bench,
        submitted_at: new Date().toISOString(),
      }

      const { error } = await supabase
        .from('lineups')
        .upsert(payload, { onConflict: 'team_id,race_id' })

      if (error) throw error
      toast.success('Formazione salvata!')
      loadData()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Errore nel salvataggio')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="text-zinc-400 text-center py-24">Caricamento...</div>
  }

  const isDeadlinePassed = race ? new Date() > new Date(race.date) : false

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Race header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-black text-white">Formazione</h1>
          {race && (
            <div className="mt-1">
              <span className="text-xl font-bold text-red-400">{race.name}</span>
              <span className="text-zinc-400 text-sm ml-2">
                {format(new Date(race.date), 'dd MMM yyyy', { locale: it })}
              </span>
              {race.is_sprint && (
                <Badge className="ml-2 bg-yellow-900 text-yellow-400">SPRINT</Badge>
              )}
            </div>
          )}
        </div>
        <div className="text-right text-xs text-zinc-500">
          <div>Switch rimasti</div>
          <div className="text-lg font-black text-white">{switchesLeft}/3</div>
        </div>
      </div>

      {isDeadlinePassed && (
        <div className="bg-red-950/50 border border-red-800 rounded-lg p-3 text-red-400 text-sm">
          ⚠️ La deadline è passata. La formazione non può essere modificata.
        </div>
      )}

      {/* Selection summary */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-sm">Riepilogo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-zinc-400 mb-2">TITOLARI ({selected.length}/3)</div>
              {[0, 1, 2].map(i => (
                <div key={i} className="h-8 border border-dashed border-zinc-700 rounded flex items-center px-3 mb-1">
                  {selected[i] ? (
                    <span className="text-sm text-white font-medium">
                      {myDrivers.find(d => d.id === selected[i])?.name}
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-600">Seleziona pilota {i + 1}</span>
                  )}
                </div>
              ))}
            </div>
            <div>
              <div className="text-xs text-zinc-400 mb-2">PANCHINA</div>
              <div className="h-8 border border-dashed border-yellow-800 rounded flex items-center px-3">
                {bench ? (
                  <span className="text-sm text-yellow-400 font-medium">
                    {myDrivers.find(d => d.id === bench)?.name}
                  </span>
                ) : (
                  <span className="text-xs text-zinc-600">Seleziona panchinaro</span>
                )}
              </div>
              <div className="text-xs text-zinc-500 mt-1">
                Sostituisce auto se DNF
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Driver selection */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-white">I tuoi piloti</CardTitle>
        </CardHeader>
        <CardContent>
          {myDrivers.length === 0 ? (
            <div className="text-zinc-500 text-center py-8">
              Non hai ancora piloti. Partecipa all&apos;asta!
            </div>
          ) : (
            <div className="space-y-2">
              {myDrivers.map(driver => {
                const isStarter = selected.includes(driver.id)
                const isBench = bench === driver.id
                return (
                  <div
                    key={driver.id}
                    className={cn(
                      'flex items-center justify-between p-3 rounded-lg border transition-all',
                      isStarter && 'bg-red-950/30 border-red-800',
                      isBench && 'bg-yellow-950/30 border-yellow-800',
                      !isStarter && !isBench && 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600'
                    )}
                  >
                    <div>
                      <div className="font-medium text-white">{driver.name}</div>
                      <div className="text-xs text-zinc-400">
                        {driver.constructor} · #{driver.number}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {!isDeadlinePassed && (
                        <>
                          <Button
                            size="sm"
                            variant={isStarter ? 'destructive' : 'outline'}
                            onClick={() => toggleDriver(driver.id)}
                            disabled={!isStarter && selected.length >= 3 && !isBench}
                            className="text-xs h-7"
                          >
                            {isStarter ? 'Rimuovi' : 'Titolare'}
                          </Button>
                          <Button
                            size="sm"
                            variant={isBench ? 'secondary' : 'outline'}
                            onClick={() => setBenchDriver(driver.id)}
                            disabled={isStarter}
                            className="text-xs h-7 border-yellow-800 text-yellow-400 hover:bg-yellow-950"
                          >
                            {isBench ? '✓ Panchina' : 'Panchina'}
                          </Button>
                        </>
                      )}
                      {(isStarter || isBench) && (
                        <Badge className={isStarter ? 'bg-red-900 text-red-300' : 'bg-yellow-900 text-yellow-300'}>
                          {isStarter ? 'Titolare' : 'Panchina'}
                        </Badge>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {!isDeadlinePassed && myDrivers.length > 0 && (
        <Button
          onClick={saveLineup}
          disabled={saving || selected.length !== 3 || !bench}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold h-12"
        >
          {saving ? 'Salvataggio...' : currentLineup ? 'Aggiorna formazione' : 'Salva formazione'}
        </Button>
      )}
    </div>
  )
}
