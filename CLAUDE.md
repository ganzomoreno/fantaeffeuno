# FantaFormula1 - 2026 Season

## Progetto
App web per gestire una lega di Fantasy Formula 1 tra 6 amici.
React + Next.js 14 (App Router).

## Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Frontend**: React 18, CSS-in-JS inline
- **State**: useState + localStorage (hook `useLocalStorage`)
- **Styling**: Inline styles, dark theme F1 (#e10600 rosso, #0a0a0a sfondo)
- **Fonts**: Orbitron (display/numeri), Titillium Web (body) via Google Fonts

## Struttura
```
app/
  layout.js           → Root layout (fonts, global CSS)
  page.js             → Home page (monta FantaF1)

components/
  FantaF1.js          → Componente principale, state management, nav
  Classifica.js       → Classifica generale con punteggi
  Squadre.js          → Dettaglio squadre (rosa, budget, switch)
  Piloti.js           → Lista piloti raggruppati per scuderia F1
  Calendario.js       → Timeline gare + aste
  GaraManager.js      → Selezione formazioni + risultati passati
  AdminPanel.js       → Pannello admin completo (asta, risultati, team, piloti, budget)
  ui.js               → Componenti shared (SectionTitle, Chip, AdminCard, MiniInput, Icon, stili)

lib/
  data.js             → Costanti, regole, piloti, squadre, calendario, colori F1
  scoring.js          → Engine calcolo punteggi (pilota singolo + team totali)
  useLocalStorage.js  → Hook per persistenza state in localStorage
```

## Comandi
```bash
npm install     # Installa dipendenze
npm run dev     # Dev server su localhost:3000
npm run build   # Build produzione
npm start       # Serve la build
```

## Regole di Gioco (sintesi)
- 6 squadre, 22 piloti totali
- Ogni squadra ha 3 o 4 piloti (acquistati all'asta)
- Budget iniziale: 100 FantaMilioni, +100 ad ogni asta successiva
- Ogni gara: schierare 3 piloti su max 4 (1 panchinaro)
- Punteggio: P1=25, P2=22, P3=20, P4=18... P20=1, P21-22=0
- Bonus sorpassi: +0.5 per sorpasso (max 3 punti = 6 sorpassi)
- Giro veloce: +1 punto
- Driver of the Day: +3/+2/+1 (top 3)
- DNF = 0 punti
- 5 switch totali a stagione
- Asta ogni 2 gare (calendario in lib/data.js)
- Penalità mancato schieramento: -5 punti gara, -2 sprint
- Switch gratuito in caso di DNF (panchinaro entra automaticamente)
- Switch obbligatorio ma gratuito per infortunio pilota

## Partecipanti
1. Alessandro Zanin → "ZetaRacing" (SuperAdmin)
2. Alessandro Fainelli → "SF – Scuderia Fainelli"
3. Leonardo Cedaro → "Ranocchiettos"
4. Dario Mazzanti → "Abdull Mazzar"
5. Andrea Chirizzi → "Alpha Chiro Racing"
6. Carlo Maria Ferrari → "Scudemaria Ferrari"

## Persistenza
I dati sono salvati in localStorage con le chiavi:
- `ff1_teams` → squadre e budget
- `ff1_pilots` → piloti con owner e prezzo
- `ff1_races` → risultati gare
- `ff1_lineups` → formazioni per gara

## Prossimi Step (TODO)
- [ ] Splittare AdminPanel.js in sub-componenti separati
- [ ] Sostituzione automatica panchinaro in caso di DNF
- [ ] Penalità mancato schieramento (-5 punti gara, -2 sprint)
- [ ] Gestione sprint race con regole e punteggi dedicati
- [ ] Log storico aste con prezzi pagati
- [ ] Export/import dati JSON (backup)
- [ ] Migrazione a Supabase o altro DB per multi-utente
- [ ] Autenticazione (ogni owner vede solo la sua squadra)
- [ ] Notifiche scadenza formazione pre-gara
- [ ] Grafico andamento punteggi nel tempo (recharts)
- [ ] Gestione scambi pilota-per-pilota + FantaMilioni
- [ ] Mobile responsive polish
