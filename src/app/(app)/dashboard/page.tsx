import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [
    { data: team },
    { data: standings },
    { data: nextRace },
    { data: myDrivers },
    { data: currentAuction },
  ] = await Promise.all([
    supabase.from('teams').select('*').eq('user_id', user!.id).single(),
    supabase.from('season_standings').select('*'),
    supabase.from('races')
      .select('*')
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true })
      .limit(1)
      .single(),
    supabase.from('team_drivers')
      .select('*, driver:drivers(*)')
      .eq('is_active', true)
      .then(async ({ data }) => {
        if (!data || !team) return { data: [] }
        const myTeam = await supabase.from('teams').select('id').eq('user_id', user!.id).single()
        return supabase.from('team_drivers')
          .select('*, driver:drivers(*)')
          .eq('team_id', myTeam.data?.id ?? '')
          .eq('is_active', true)
      }),
    supabase.from('auctions')
      .select('*')
      .in('status', ['open', 'pending'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single(),
  ])

  // Get my team id
  const { data: myTeam } = await supabase.from('teams').select('*').eq('user_id', user!.id).single()

  // Get my drivers
  const { data: teamDrivers } = await supabase
    .from('team_drivers')
    .select('*, driver:drivers(*)')
    .eq('team_id', myTeam?.id ?? '')
    .eq('is_active', true)

  // Get my recent scores
  const { data: recentScores } = await supabase
    .from('race_scores')
    .select('*, race:races(*)')
    .eq('team_id', myTeam?.id ?? '')
    .order('created_at', { ascending: false })
    .limit(3)

  const myStanding = standings?.find(s => s.team_id === myTeam?.id)
  const myPosition = standings ? standings.findIndex(s => s.team_id === myTeam?.id) + 1 : '-'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-black text-white">{myTeam?.name ?? 'Il tuo team'}</h1>
          <p className="text-zinc-400 text-sm mt-1">Stagione 2026</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black text-red-500">#{myPosition}</div>
          <div className="text-xs text-zinc-400">in classifica</div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="text-zinc-400 text-xs mb-1">FantaMilioni</div>
            <div className="text-2xl font-black text-white font-mono">{myTeam?.fantamilioni ?? 0}M</div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="text-zinc-400 text-xs mb-1">Punti totali</div>
            <div className="text-2xl font-black text-white font-mono">
              {myStanding?.total_points ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="text-zinc-400 text-xs mb-1">Piloti</div>
            <div className="text-2xl font-black text-white font-mono">
              {teamDrivers?.length ?? 0}/4
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="text-zinc-400 text-xs mb-1">Gare disputate</div>
            <div className="text-2xl font-black text-white font-mono">
              {myStanding?.races_scored ?? 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* My Drivers */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center justify-between">
              I miei piloti
              <Link href="/mercato">
                <Button variant="ghost" size="sm" className="text-xs text-zinc-400">
                  Mercato →
                </Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {teamDrivers && teamDrivers.length > 0 ? (
              <div className="space-y-2">
                {teamDrivers.map((td: { id: string; purchase_price: number; driver?: { name: string; constructor: string; number: number } }) => (
                  <div key={td.id} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
                    <div>
                      <div className="font-medium text-white text-sm">{td.driver?.name}</div>
                      <div className="text-xs text-zinc-400">{td.driver?.constructor}</div>
                    </div>
                    <Badge variant="outline" className="border-zinc-600 text-zinc-400 font-mono text-xs">
                      {td.purchase_price}M
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-zinc-500 text-sm">
                Nessun pilota. Partecipa all&apos;asta!
                <br />
                <Link href="/asta">
                  <Button className="mt-3 bg-red-600 hover:bg-red-700 text-xs">
                    Vai all&apos;asta
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Next Race + Auction */}
        <div className="space-y-4">
          {/* Next Race */}
          {nextRace && (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-sm text-zinc-400 uppercase tracking-wider">
                  Prossima gara
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-black text-xl text-white">{nextRace.name}</div>
                    <div className="text-zinc-400 text-sm">{nextRace.circuit}</div>
                    <div className="text-xs text-zinc-500 mt-1">
                      {format(new Date(nextRace.date), 'dd MMMM yyyy', { locale: it })}
                      {nextRace.is_sprint && (
                        <Badge className="ml-2 bg-yellow-900 text-yellow-400 text-xs">SPRINT</Badge>
                      )}
                    </div>
                  </div>
                  <Link href={`/formazione/${nextRace.id}`}>
                    <Button size="sm" className="bg-red-600 hover:bg-red-700">
                      Schiera
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Auction status */}
          {currentAuction && (
            <Card className="bg-zinc-900 border-zinc-800 border-red-900">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-white">
                      {currentAuction.status === 'open' ? '🔴 Asta in corso!' : '⏳ Asta in arrivo'}
                    </div>
                    <div className="text-xs text-zinc-400 mt-1">
                      {currentAuction.type === 'open' ? 'Asta libera' : 'Asta chiusa'}
                      {' · '}Round {currentAuction.round === 0 ? 'iniziale' : currentAuction.round}
                    </div>
                  </div>
                  <Link href="/asta">
                    <Button size="sm" className="bg-red-600 hover:bg-red-700">
                      Asta →
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Standings preview */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-white flex items-center justify-between">
                Classifica
                <Link href="/classifica">
                  <Button variant="ghost" size="sm" className="text-xs text-zinc-400">
                    Completa →
                  </Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {standings && standings.length > 0 ? (
                <div className="space-y-2">
                  {standings.slice(0, 5).map((s, i) => (
                    <div
                      key={s.team_id}
                      className={`flex items-center justify-between py-1.5 ${s.team_id === myTeam?.id ? 'text-red-400' : 'text-white'}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-zinc-500 font-mono text-sm w-4">{i + 1}</span>
                        <span className="text-sm font-medium">{s.team_name}</span>
                      </div>
                      <span className="font-mono text-sm font-bold">{s.total_points}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-zinc-500 text-sm text-center py-4">
                  Nessun punto ancora. Che la stagione abbia inizio!
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
