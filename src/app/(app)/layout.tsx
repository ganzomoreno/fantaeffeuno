import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NavBar from '@/components/features/NavBar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  let { data: team } = await supabase
    .from('teams')
    .select('*')
    .eq('user_id', user.id)
    .single()

  // Safety net: se l'utente non ha ancora un team (es. dopo conferma email),
  // lo crea automaticamente al primo accesso al dashboard
  if (!team) {
    const defaultName = user.email?.split('@')[0] ?? 'Team'
    const { data: newTeam } = await supabase
      .from('teams')
      .insert({ user_id: user.id, name: defaultName, fantamilioni: 100 })
      .select()
      .single()
    team = newTeam
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <NavBar team={team} userEmail={user.email ?? ''} />
      <main className="max-w-6xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
