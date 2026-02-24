import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

export default async function ClassificaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: myTeam } = await supabase.from('teams').select('id').eq('user_id', user!.id).single()

  const [
    { data: standings },
    { data: raceScores },
    { data: races },
  ] = await Promise.all([
    supabase.from('season_standings').select('*'),
    supabase.from('race_scores').select('*, race:races(*), team:teams(*)'),
    supabase.from('races').select('*').eq('results_published', true).order('round', { ascending: true }),
  ])

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-black text-white">Classifica 2026</h1>

      {/* Season standings */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">Classifica Generale</CardTitle>
        </CardHeader>
        <CardContent>
          {standings && standings.length > 0 ? (
            <div className="space-y-0">
              {standings.map((s, i) => (
                <div
                  key={s.team_id}
                  className={`flex items-center gap-4 py-3 border-b border-zinc-800 last:border-0 ${s.team_id === myTeam?.id ? 'bg-red-950/20 -mx-6 px-6' : ''}`}
                >
                  {/* Position */}
                  <div className={`text-2xl font-black w-8 text-center font-mono ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-zinc-300' : i === 2 ? 'text-amber-600' : 'text-zinc-600'}`}>
                    {i + 1}
                  </div>

                  {/* Team info */}
                  <div className="flex-1">
                    <div className={`font-bold ${s.team_id === myTeam?.id ? 'text-red-400' : 'text-white'}`}>
                      {s.team_name}
                      {s.team_id === myTeam?.id && (
                        <Badge className="ml-2 bg-red-900 text-red-300 text-xs">Tu</Badge>
                      )}
                    </div>
                    <div className="text-xs text-zinc-500">{s.races_scored} gare disputate</div>
                  </div>

                  {/* Points */}
                  <div className="text-right">
                    <div className="text-2xl font-black text-white font-mono">{s.total_points}</div>
                    <div className="text-xs text-zinc-500">punti</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-zinc-500">
              La stagione non è ancora iniziata. Che i motori si scaldino!
            </div>
          )}
        </CardContent>
      </Card>

      {/* Per-race breakdown */}
      {races && races.length > 0 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Risultati per Gara</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left text-zinc-400 pb-3 font-medium">Team</th>
                  {races.map(r => (
                    <th key={r.id} className="text-center text-zinc-400 pb-3 font-medium px-2 min-w-[60px]">
                      <div className="text-xs">{r.name}</div>
                      {r.is_sprint && <div className="text-yellow-600 text-xs">SPR</div>}
                    </th>
                  ))}
                  <th className="text-right text-zinc-400 pb-3 font-medium">TOT</th>
                </tr>
              </thead>
              <tbody>
                {standings?.map(team => {
                  const teamScores = raceScores?.filter(rs => rs.team_id === team.team_id) ?? []
                  return (
                    <tr
                      key={team.team_id}
                      className={`border-b border-zinc-800/50 last:border-0 ${team.team_id === myTeam?.id ? 'bg-red-950/10' : ''}`}
                    >
                      <td className={`py-2 font-medium ${team.team_id === myTeam?.id ? 'text-red-400' : 'text-white'}`}>
                        {team.team_name}
                      </td>
                      {races.map(r => {
                        const score = teamScores.find(s => s.race_id === r.id)
                        return (
                          <td key={r.id} className="text-center py-2 px-2 font-mono text-zinc-300">
                            {score ? score.total_points : '-'}
                          </td>
                        )
                      })}
                      <td className="text-right py-2 font-black text-white font-mono">
                        {team.total_points}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
