# 🏁 FantaFormula1 — MVP Development Plan

**Current Date**: 2026-03-04
**Target**: Q1 2026
**Overall Progress**: 0% (0 / 84 tasks)

---

## 📋 HOME — Dashboard Giocatore

**File**: `components/Classifica.js` + new `components/Home.js`
**Progress**: 0% (0 / 10)

- [ ] **Section A: Hero KPI** (3 cards layout)
  - [ ] Posizione: "#2 / 6" + delta vs gara precedente
  - [ ] Punti totali: "187.5" + delta ultima gara
  - [ ] Prossima Gara: "Bahrain GP" + countdown + lock status
  - [ ] CTA primaria: "SCHIERA ORA" (if not confirmed or deadline)

- [ ] **Section B: Race Readiness**
  - [ ] Card formazione prossima gara
  - [ ] Status: "Confermata ✅" / "Non impostata ⚠️" / "LOCKED 🔒"
  - [ ] Timestamp ultimo salvataggio
  - [ ] Mini preview: 3 titolari + panchina
  - [ ] CTAs: "Modifica formazione" + "Vedi scuderia"

- [ ] **Section C: Trend** (ultime 5 gare)
  - [ ] Grafico line/area minimal
  - [ ] Tooltip su gara

- [ ] **Section D: Ultima Gara** (recap veloce)
  - [ ] Card con punti fatti
  - [ ] Top driver della squadra
  - [ ] Badge: DOTD / FL / DNF
  - [ ] CTA: "Apri dettagli gara"

- [ ] **Header Sticky**
  - [ ] Titolo: FANTA F1 / STAGIONE 2026
  - [ ] Avatar team (destra)
  - [ ] Chip: "Switch: 3/5"
  - [ ] Chip stato formazione

---

## 🏎️ GARA — Risultati e Breakdown

**File**: `components/GaraManager.js` (refactor) + new `components/Gara.js`
**Progress**: 0% (0 / 18)

### Top Controls
- [ ] Race selector (dropdown, default ultima gara)
- [ ] Pill: "Risultati ufficiali" / "Provvisori"
- [ ] Toggle: "Vista: Squadre / Piloti"

### 2A: Vista Squadre (default)
- [ ] Leaderboard table (6 righe squadre)
  - [ ] Colonne: Pos | Squadra | Punti gara | Punti totali | Delta
  - [ ] Righe hover highlight + clickable
- [ ] Team detail drawer (side panel / bottom sheet mobile)
  - [ ] Header: nome squadra + posizione
  - [ ] Lineup della gara (3 titolari + panchina)
  - [ ] Breakdown punti (tabella: Piazzamento | Sorpassi | DOTD | FL | Totale)
  - [ ] Badge DNF (se applicabile)
  - [ ] Nota: "Panchinaro entrato per DNF"
  - [ ] CTA: "Confronta con me" (highlight tua squadra)
- [ ] Link "Come si calcola?" → modal con regole punteggio (10 righe)

### 2B: Vista Piloti (optional ma MVP-safe)
- [ ] Lista piloti ordinata per punteggio gara
- [ ] Filtri chip:
  - [ ] Team F1 (McLaren, Ferrari…)
  - [ ] "Solo miei"
  - [ ] "Con DOTD / FL / DNF"
- [ ] Driver drawer:
  - [ ] Punti piazzamento + spiegazione
  - [ ] Sorpassi (cap raggiunto)
  - [ ] DOTD position (1/2/3)
  - [ ] Giro veloce sì/no

---

## 🏁 SCUDERIA — Rosa, Stats e Schieramento

**File**: `components/Squadre.js` (refactor) + new `components/Scuderia.js`
**Progress**: 0% (0 / 19)

### Header
- [ ] Nome squadra
- [ ] Chip: "Switch rimanenti 2/5"
- [ ] Chip stato: "Formazione confermata / da confermare / locked"

### 3A: Lineup Builder
- [ ] Card: "SCHIERAMENTO PROSSIMA GARA"
- [ ] 3 slot "TITOLARE" (drag & drop desktop, tap-select mobile)
- [ ] 1 slot "PANCHINA" (se rosa=4, altrimenti nascosto)
- [ ] Regole inline:
  - [ ] "Se DNF → entra panchina automaticamente"
  - [ ] "Se non schieri → -5"
- [ ] Validazioni UX:
  - [ ] Max 3 titolari
  - [ ] Se rosa=3, no panchina
  - [ ] Bottone "Salva" disabilitato se incomplete
- [ ] CTAs:
  - [ ] Primaria: "SALVA FORMAZIONE"
  - [ ] Secondaria: "RESET / Ripristina precedente"
- [ ] Feedback: toast "Formazione salvata ✅"
- [ ] Se locked: UI read-only + label

### 3B: Lista Piloti (Rosa)
- [ ] Driver cards (vertical list)
  - [ ] Nome + team F1 + costo
  - [ ] Mini stats: media punti ultime 3 gare, #DNF stagionali
  - [ ] Pulsante rapido: "Metti titolare" / "Metti panchina"
  - [ ] Badge: "IN LINEUP" (accent) / "BENCH" (secondary)
- [ ] Driver detail drawer:
  - [ ] Storico punti per gara (mini chart)
  - [ ] Breakdown ultime gare
  - [ ] "Best finish" / "DOTD count"

---

## 📅 CALENDARIO — Gare + Aste

**File**: `components/Calendario.js` (refactor)
**Progress**: 0% (0 / 11)

- [ ] Toggle: "Gare" / "Aste" / "Tutto"
- [ ] Lista cronologica
- [ ] Ogni item:
  - [ ] Data + nome evento (GP / Asta)
  - [ ] Badge stato: "Prossimo" / "Oggi" / "Completato"
  - [ ] CTA contestuale:
    - [ ] Gara prossima → "Vai a Scuderia"
    - [ ] Asta prossima → "Dettagli asta"
- [ ] Dettagli evento (sheet):
  - [ ] GP: sessioni/nota deadline
  - [ ] Asta: regole rapide + "inizia alle …"

---

## 🧩 Core UI Components

**Location**: `lib/ui.js` + `components/ui/`
**Progress**: 0% (0 / 12)

- [ ] **AppShell** — Header + Nav (Tab/Sidebar)
- [ ] **KpiTile** — numero + label + delta
- [ ] **StatusPill** — LOCKED, DEADLINE, SWITCH RIMASTI
- [ ] **RaceSelector** — dropdown races
- [ ] **LeaderboardTable** — 6 squadre, sortable
- [ ] **TeamDetailDrawer** — side panel / bottom sheet mobile
- [ ] **DriverCard** — piccola card pilota
- [ ] **DriverDetailDrawer** — side panel / bottom sheet mobile
- [ ] **LineupBuilder** — 3 slot titolari + 1 panchina
- [ ] **CalendarList** — cronologica gare + aste
- [ ] **RulesModal** — help "Come si calcola?"
- [ ] **ToastSystem** — notifiche toast

---

## 📊 Summary

| Section | Progress | Tasks | Completed |
|---------|----------|-------|-----------|
| HOME | 0% | 10 | 0 |
| GARA | 0% | 18 | 0 |
| SCUDERIA | 0% | 19 | 0 |
| CALENDARIO | 0% | 11 | 0 |
| COMPONENTS | 0% | 12 | 0 |
| **TOTAL** | **0%** | **84** | **0** |

---

## 🎨 Design System Reference

**Palette (F1-like dark)**
- Background: `#0B0C10` → `#12131A` (gradient)
- Surface/Card: `#14151C` / `#1A1B24`
- Border: `1px #2A2D3A`
- Text Primary: `#EDEEF3`
- Text Secondary: `#A9ABBA`
- Accent (racing red): `#E10600` (+ hover lighter)
- Success: `#00FF41` (neon green)
- Warning: `#FFB700` (amber)
- Danger: dark red

**Typography**
- Headlines: Titillium Web / Oswald (uppercase, condensed)
- Body: Titillium Web
- Numbers: monospace-like (grid-aligned)

**Spacing**: 8/12/16px grid

---

## 📝 Notes

- Use **inline styles** (CSS-in-JS) for consistency
- **LocalStorage** keys: `ff1_teams`, `ff1_pilots`, `ff1_races`, `ff1_lineups`, `ff1_dev_plan`
- Test on **mobile first** (375px viewport)
- **Toast feedback** for all user actions (save, delete, error)
- **Dark theme only** — no light mode in MVP

---

## 📌 Useful Links

- **CLAUDE.md** — Full specifications + rules
- **DevelopmentPlan.js** — Interactive tracker component (internal tool)
- **lib/data.js** — Constants, pilots, teams, calendar
- **lib/scoring.js** — Score calculation engine

Last updated: 2026-03-04
