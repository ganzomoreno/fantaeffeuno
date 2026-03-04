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

## MVP Plan - 2026 Q1

### Design System
**Palette (F1-like dark)**
- Background: #0B0C10 → #12131A (gradient)
- Surface/Card: #14151C / #1A1B24
- Border: 1px #2A2D3A
- Text primary: #EDEEF3
- Text secondary: #A9ABBA
- Accent (racing red): #E10600 + hover lighter
- Success: neon green (formazione ok)
- Warning: amber (deadline imminente)
- Danger: dark red (penalità / lock)

**Typography**
- Headlines: Titillium Web / Oswald, uppercase, condensed
- Body: Titillium Web, regular
- Numbers: monospace-like (grid-aligned)

**Spacing**: 8/12/16px grid
**Components**: KPI Tile, Status Pill, Driver Card, Telemetry Divider, Table rows

---

### MVP Pages (4 core screens)

#### 1. HOME — Dashboard giocatore
**Section A: Hero KPI** (3 cards)
- [ ] Posizione: "#2 / 6" + delta vs gara precedente
- [ ] Punti totali: "187.5" + delta ultima gara
- [ ] Prossima Gara: "Bahrain GP" + countdown + lock status
- [ ] CTA primaria: "SCHIERA ORA" (se non confermato o deadline)

**Section B: Race Readiness**
- [ ] Card formazione prossima gara
- [ ] Status: "Confermata ✅" / "Non impostata ⚠️" / "LOCKED 🔒"
- [ ] Timestamp ultimo salvataggio
- [ ] Mini preview: 3 titolari + panchina
- [ ] CTAs: "Modifica formazione" + "Vedi scuderia"

**Section C: Trend (ultime 5 gare)**
- [ ] Grafico line/area minimal
- [ ] Tooltip su gara

**Section D: Ultima gara (recap)**
- [ ] Card con punti fatti
- [ ] Top driver della squadra
- [ ] Badge: DOTD / FL / DNF
- [ ] CTA: "Apri dettagli gara"

**Header sticky**
- [ ] Titolo: FANTA F1 / STAGIONE 2026
- [ ] Avatar team (a destra)
- [ ] Chip: "Switch: 3/5"
- [ ] Chip stato formazione

---

#### 2. GARA — Risultati e breakdown
**Top controls (sticky)**
- [ ] Race selector (dropdown, default ultima)
- [ ] Pill: "Risultati ufficiali" / "Provvisori"
- [ ] Toggle (optional): "Vista: Squadre / Piloti"

**2A: Vista Squadre (default)**
- [ ] Leaderboard table (6 righe)
  - Colonne: Pos | Squadra | Punti gara | Punti totali | Delta
  - Righe hover highlight + clickable
- [ ] Team detail drawer (side panel / bottom sheet mobile)
  - Header: nome squadra + posizione
  - Lineup della gara (3 titolari + panchina)
  - Breakdown punti (tabella per pilota: Piazzamento | Sorpassi | DOTD | FL | Totale)
  - Badge DNF (se applicabile)
  - Nota: "Panchinaro entrato per DNF" (se accaduto)
  - CTA: "Confronta con me" (highlight tua squadra)
- [ ] Link "Come si calcola?" → modal con regole punteggio (10 righe)

**2B: Vista Piloti (optional ma MVP-safe)**
- [ ] Lista piloti ordinata per punteggio gara
- [ ] Filtri chip:
  - Team F1 (McLaren, Ferrari…)
  - "Solo miei"
  - "Con DOTD / FL / DNF"
- [ ] Driver drawer con:
  - Punti piazzamento + spiegazione
  - Sorpassi (cap raggiunto)
  - DOTD position (1/2/3)
  - Giro veloce sì/no

---

#### 3. SCUDERIA — Rosa, stats, schieramento
**Header**
- [ ] Nome squadra
- [ ] Chip: "Switch rimanenti 2/5"
- [ ] Chip stato: "Formazione confermata / da confermare / locked"

**3A: Lineup Builder**
- [ ] Card grande: "SCHIERAMENTO PROSSIMA GARA"
- [ ] 3 slot "TITOLARE" (drag & drop desktop, tap-select mobile)
- [ ] 1 slot "PANCHINA" (se rosa=4, altrimenti nascosto)
- [ ] Regole inline:
  - "Se DNF → entra panchina automaticamente"
  - "Se non schieri → -5"
- [ ] Validazioni UX:
  - Max 3 titolari
  - Se rosa=3, no panchina
  - Bottone "Salva" disabilitato se incomplete
- [ ] CTAs:
  - Primaria: "SALVA FORMAZIONE"
  - Secondaria: "RESET / Ripristina precedente"
- [ ] Feedback: toast "Formazione salvata ✅"
- [ ] Se locked: UI read-only + label "Locked dopo qualifiche"

**3B: Lista piloti (rosa)**
- [ ] Driver cards (vertical list)
  - Nome + team F1 + costo
  - Mini stats: media punti ultime 3 gare, #DNF stagionali
  - Pulsante rapido: "Metti titolare" / "Metti panchina"
  - Badge: "IN LINEUP" (accent) / "BENCH" (secondary)
- [ ] Driver detail drawer
  - Storico punti per gara (mini chart)
  - Breakdown ultime gare
  - "Best finish" / "DOTD count"

---

#### 4. CALENDARIO — Gare + Aste
**Layout**
- [ ] Toggle: "Gare" / "Aste" / "Tutto"
- [ ] Lista cronologica
- [ ] Ogni item:
  - Data + nome evento (GP / Asta)
  - Badge stato: "Prossimo" / "Oggi" / "Completato"
  - CTA contestuale:
    - Gara prossima → "Vai a Scuderia"
    - Asta prossima → "Dettagli asta"
- [ ] Dettagli evento (sheet)
  - GP: sessioni/nota deadline
  - Asta: regole rapide + "inizia alle …"

---

### Componenti riutilizzabili (da creare)

**Core UI Components** (lib/components/)
- [ ] AppShell (Header + Nav Tab/Sidebar)
- [ ] KpiTile (numero + label + delta)
- [ ] StatusPill (LOCKED, DEADLINE, SWITCH RIMASTI)
- [ ] RaceSelector (dropdown)
- [ ] LeaderboardTable (6 squadre)
- [ ] TeamDetailDrawer (side panel / bottom sheet)
- [ ] DriverCard (piccola card pilota)
- [ ] DriverDetailDrawer (side panel / bottom sheet)
- [ ] LineupBuilder (3 slot titolari + 1 panchina)
- [ ] CalendarList (cronologica gare + aste)
- [ ] RulesModal (help "Come si calcola?")
- [ ] ToastSystem (notifiche)

**Pages** (components/)
- [ ] Home.js (4 sezioni + hero KPI)
- [ ] Gara.js (results + breakdowns)
- [ ] Scuderia.js (lineup builder + rosa)
- [ ] Calendario.js (events timeline)
- [ ] DevelopmentPlan.js (tracker MVP in Home)

---

### Player Features (MVP-safe)
- Visualizzare posizione in classifica
- Vedere ultima gara e prossima gara
- Impostare formazione (schieramento)
- Visualizzare risultati gara per gara
- Confrontare la propria squadra con altre
- Accedere al regolamento (help)

### Admin Features (separate, non MVP-critical)
- Inserire risultati gara
- Gestire aste
- Definire calendari
- Configurare squadre

---

### Prossimi Step (POST-MVP)
- [ ] Notifiche in-app (banner Home + Scuderia)
- [ ] "Confronto con un altro team" (side-by-side)
- [ ] Sprint race con regole dedicate
- [ ] Log storico aste con prezzi
- [ ] Export/import dati JSON
- [ ] Migrazione a Supabase (DB + auth)
- [ ] Autenticazione (ogni owner vede solo sua squadra)
- [ ] Grafico andamento punteggi nel tempo (recharts)
- [ ] Gestione scambi pilota + FantaMilioni
- [ ] Mobile responsive polish
- [ ] Splittare AdminPanel.js in sub-componenti
