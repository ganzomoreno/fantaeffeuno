'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

// Helper: estrae il messaggio da qualsiasi tipo di errore (Error, PostgREST, string...)
function extractMessage(err: unknown): string {
  if (!err) return 'Errore sconosciuto'
  if (typeof err === 'string') return err
  if (typeof err === 'object') {
    const e = err as Record<string, unknown>
    if (typeof e.message === 'string') return e.message
    if (typeof e.error_description === 'string') return e.error_description
    if (typeof e.msg === 'string') return e.msg
    return JSON.stringify(e)
  }
  return 'Errore sconosciuto'
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isRegister, setIsRegister] = useState(false)
  const [teamName, setTeamName] = useState('')
  const [pendingConfirmation, setPendingConfirmation] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      if (isRegister) {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error

        if (data.session) {
          // Email confirmation disabilitata → sessione immediata → creo il team subito
          await createTeam(data.user!.id, teamName || email.split('@')[0])
          router.push('/dashboard')
          router.refresh()
        } else {
          // Email confirmation abilitata → salvo il nome team nel localStorage
          // il team viene creato al primo accesso al dashboard
          if (teamName) {
            localStorage.setItem('pendingTeamName', teamName)
          }
          setPendingConfirmation(true)
          toast.success('Registrazione effettuata! Controlla la tua email per confermare l\'account.')
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error

        // Se c'è un team name pendente (dopo conferma email), crealo ora
        const pendingName = localStorage.getItem('pendingTeamName')
        if (pendingName && data.user) {
          await createTeam(data.user.id, pendingName)
          localStorage.removeItem('pendingTeamName')
        }

        router.push('/dashboard')
        router.refresh()
      }
    } catch (err: unknown) {
      toast.error(extractMessage(err))
    } finally {
      setLoading(false)
    }
  }

  async function createTeam(userId: string, name: string) {
    const { error } = await supabase.from('teams').insert({
      user_id: userId,
      name,
      fantamilioni: 100,
    })
    // Ignora "already exists" (duplicate key) — il team c'è già
    if (error && !error.message.includes('duplicate') && !error.message.includes('unique')) {
      console.error('Team creation error:', error)
      // Non bloccare il login per questo errore
    }
  }

  if (pendingConfirmation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black p-4">
        <div className="w-full max-w-md text-center space-y-4">
          <div className="text-5xl">📧</div>
          <h2 className="text-2xl font-black text-white">Controlla la tua email</h2>
          <p className="text-zinc-400">
            Abbiamo inviato un link di conferma a <span className="text-white font-medium">{email}</span>.
            <br />Clicca il link e poi torna qui per accedere.
          </p>
          <Button
            onClick={() => { setPendingConfirmation(false); setIsRegister(false) }}
            className="bg-red-600 hover:bg-red-700 text-white font-bold"
          >
            Vai al login
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-black text-white tracking-tight">
            🏎️ FantaFormula1
          </h1>
          <p className="text-zinc-400 text-sm italic">
            &quot;Un gioco che causerà litigi, rabbia e bestemmie&quot;
          </p>
        </div>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">
              {isRegister ? 'Registrati' : 'Accedi'}
            </CardTitle>
            <CardDescription>
              {isRegister
                ? 'Crea il tuo account per partecipare'
                : 'Bentornato nel circus'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {isRegister && (
                <div className="space-y-2">
                  <Label htmlFor="teamName">Nome team</Label>
                  <Input
                    id="teamName"
                    placeholder="ZetaRacing, Fainellos..."
                    value={teamName}
                    onChange={e => setTeamName(e.target.value)}
                    className="bg-zinc-800 border-zinc-700"
                    required
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="pilota@f1.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="bg-zinc-800 border-zinc-700"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="bg-zinc-800 border-zinc-700"
                  required
                  minLength={6}
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold"
                disabled={loading}
              >
                {loading ? 'Caricamento...' : isRegister ? 'Crea account' : 'Entra nel circus'}
              </Button>
            </form>
            <div className="mt-4 text-center">
              <button
                onClick={() => setIsRegister(!isRegister)}
                className="text-sm text-zinc-400 hover:text-white transition-colors"
              >
                {isRegister
                  ? 'Hai già un account? Accedi'
                  : 'Prima volta? Registrati'}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Participants hint */}
        <div className="text-center text-xs text-zinc-600">
          ZetaRacing · Fainellos · Ranocchiettos · Abdull Mazzar · Alpha Chiro Racing
        </div>
      </div>
    </div>
  )
}
