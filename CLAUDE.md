# FantaFormula1

App fantacalcio-style sulla Formula 1 2026. Next.js 16 (App Router) + Supabase + shadcn/ui.
5 partecipanti, rosa comprata all'asta, 3 titolari + 1 panchina a gara.

## ⚠️ Leggi sempre prima di toccare i punteggi

**`docs/REGOLAMENTO.md` è la fonte di verità del regolamento.**
Non dedurre le regole dal codice e non chiederle all'utente: sono scritte lì.
Punti gara, scala Sprint top-8, auto-sostituzione panchina, penalità,
punteggio unico sui weekend sprint — tutto in quel file.

Se una regola cambia: aggiorna **prima** `docs/REGOLAMENTO.md`, poi `src/lib/scoring.ts`.

## Struttura

- `src/lib/scoring.ts` — motore di calcolo punti (unica fonte di verità del codice)
- `src/app/(app)/admin/page.tsx` — pannello SuperAdmin: inserimento risultati e pubblicazione
- `src/app/(app)/formazione/[raceId]/page.tsx` — schieramento formazione
- `supabase/schema.sql` — schema + RLS + seed
- `supabase/seed_2026.sql` — dati ufficiali 2026 (piloti + calendario)
- `supabase/migrations_*.sql` — migrazioni incrementali, da eseguire in ordine di data

## Setup locale

Serve `.env.local` (vedi `.env.local.example`):

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Senza queste due variabili l'app non legge nulla: niente formazioni, niente
risultati, niente classifica. Una sessione senza `.env.local` **non può**
calcolare punteggi reali.

## Comandi

```bash
npm run dev     # dev server su :3000
npm run build   # build di produzione
npm run lint    # eslint
```
