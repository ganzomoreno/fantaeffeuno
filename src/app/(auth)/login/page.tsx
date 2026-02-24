'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isRegister, setIsRegister] = useState(false)
  const [teamName, setTeamName] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      if (isRegister) {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        if (data.user) {
          // Create team
          const { error: teamError } = await supabase.from('teams').insert({
            user_id: data.user.id,
            name: teamName || `Team di ${email.split('@')[0]}`,
            fantamilioni: 100,
          })
          if (teamError) throw teamError
          toast.success('Account creato! Controlla la tua email.')
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push('/dashboard')
        router.refresh()
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Errore sconosciuto'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
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
