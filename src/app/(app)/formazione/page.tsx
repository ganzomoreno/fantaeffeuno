import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function FormazionePage() {
  const supabase = await createClient()

  const { data: nextRace } = await supabase
    .from('races')
    .select('*')
    .gte('date', new Date().toISOString().split('T')[0])
    .order('date', { ascending: true })
    .limit(1)
    .single()

  if (nextRace) {
    redirect(`/formazione/${nextRace.id}`)
  }

  return (
    <div className="text-center py-24 text-zinc-500">
      Nessuna gara in programma. Torna più tardi!
    </div>
  )
}
