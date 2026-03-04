# 🏁 FantaFormula1 — MVP Development Plan

**Current Date**: 2026-03-04
**Target**: Q1 2026
**Overall Progress**: 100% (84 / 84 tasks)

---

## 📋 HOME — Dashboard Giocatore

**File**: `components/Classifica.js` + new `components/Home.js`
**Progress**: 100% (10 / 10)

- [x] **Section A: Hero KPI** (3 cards layout)
  - [x] Posizione: "#2 / 6" + delta vs gara precedente
  - [x] Punti totali: "187.5" + delta ultima gara
  - [x] Prossima Gara: "Bahrain GP" + countdown + lock status
  - [x] CTA primaria: "SCHIERA ORA" (if not confirmed or deadline)

- [x] **Section B: Race Readiness**
  - [x] Card formazione prossima gara
  - [x] Status: "Confermata ✅" / "Non impostata ⚠️" / "LOCKED 🔒"
  - [x] Timestamp ultimo salvataggio
  - [x] Mini preview: 3 titolari + panchina
  - [x] CTAs: "Modifica formazione" + "Vedi scuderia"

- [x] **Section C: Trend** (ultime 5 gare)
  - [x] Grafico line/area minimal
  - [x] Tooltip su gara

- [x] **Section D: Ultima Gara** (recap veloce)
  - [x] Card con punti fatti
  - [x] Top driver della squadra
  - [x] Badge: DOTD / FL / DNF
  - [x] CTA: "Apri dettagli gara"

- [x] **Header Sticky**
  - [x] Titolo: FANTA F1 / STAGIONE 2026
  - [x] Avatar team (destra)
  - [x] Chip: "Switch: 3/5"
  - [x] Chip stato formazione

---

## 🏎️ GARA — Risultati e Breakdown

**File**: `components/GaraManager.js` (refactor) + new `components/Gara.js`
**Progress**: 100% (18 / 18)

### Top Controls
- [x] Race selector (dropdown, default ultima gara)
- [x] Pill: "Risultati ufficiali" / "Provvisori"
- [x] Toggle: "Vista: Squadre / Piloti"

### 2A: Vista Squadre (default)
- [x] Leaderboard table (6 righe squadre)
  - [x] Colonne: Pos | Squadra | Punti gara | Punti totali | Delta
  - [x] Righe hover highlight + clickable
- [x] Team detail drawer (side panel / bottom sheet mobile)
  - [x] Header: nome squadra + posizione
  - [x] Lineup della gara (3 titolari + panchina)
  - [x] Breakdown punti (tabella: Piazzamento | Sorpassi | DOTD | FL | Totale)
  - [x] Badge DNF (se applicabile)
  - [x] Nota: "Panchinaro entrato per DNF"
  - [x] CTA: "Confronta con me" (highlight tua squadra)
- [x] Link "Come si calcola?" → modal con regole punteggio (10 righe)

### 2B: Vista Piloti (optional ma MVP-safe)
- [x] Lista piloti ordinata per punteggio gara
- [x] Filtri chip:
  - [x] Team F1 (McLaren, Ferrari…)
  - [x] "Solo miei"
  - [x] "Con DOTD / FL / DNF"
- [x] Driver drawer:
  - [x] Punti piazzamento + spiegazione
  - [x] Sorpassi (cap raggiunto)
  - [x] DOTD position (1/2/3)
  - [x] Giro veloce sì/no

---

## 🏁 SCUDERIA — Rosa, Stats e Schieramento

**File**: `components/Squadre.js` (refactor) + new `components/Scuderia.js`
**Progress**: 100% (19 / 19)

### Header
- [x] Nome squadra
- [x] Chip: "Switch rimanenti 2/5"
- [x] Chip stato: "Formazione confermata / da confermare / locked"

### 3A: Lineup Builder
- [x] Card: "SCHIERAMENTO PROSSIMA GARA"
- [x] 3 slot "TITOLARE" (drag & drop desktop, tap-select mobile)
- [x] 1 slot "PANCHINA" (se rosa=4, altrimenti nascosto)
- [x] Regole inline:
  - [x] "Se DNF → entra panchina automaticamente"
  - [x] "Se non schieri → -5"
- [x] Validazioni UX:
  - [x] Max 3 titolari
  - [x] Se rosa=3, no panchina
  - [x] Bottone "Salva" disabilitato se incomplete
- [x] CTAs:
  - [x] Primaria: "SALVA FORMAZIONE"
  - [x] Secondaria: "RESET / Ripristina precedente"
- [x] Feedback: toast "Formazione salvata ✅"
- [x] Se locked: UI read-only + label

### 3B: Lista Piloti (Rosa)
- [x] Driver cards (vertical list)
  - [x] Nome + team F1 + costo
  - [x] Mini stats: media punti ultime 3 gare, #DNF stagionali
  - [x] Pulsante rapido: "Metti titolare" / "Metti panchina"
  - [x] Badge: "IN LINEUP" (accent) / "BENCH" (secondary)
- [x] Driver detail drawer:
  - [x] Storico punti per gara (mini chart)
  - [x] Breakdown ultime gare
  - [x] "Best finish" / "DOTD count"

---

## 📅 CALENDARIO — Gare + Aste

**File**: `components/Calendario.js` (refactor)
**Progress**: 100% (11 / 11)

- [x] Toggle: "Gare" / "Aste" / "Tutto"
- [x] Lista cronologica
- [x] Ogni item:
  - [x] Data + nome evento (GP / Asta)
  - [x] Badge stato: "Prossimo" / "Oggi" / "Completato"
  - [x] CTA contestuale:
    - [x] Gara prossima → "Vai a Scuderia"
    - [x] Asta prossima → "Dettagli asta"
- [x] Dettagli evento (sheet):
  - [x] GP: sessioni/nota deadline
  - [x] Asta: regole rapide + "inizia alle …"

---

## 🧩 Core UI Components

**Location**: `lib/ui.js` + `components/ui/`
**Progress**: 100% (12 / 12)

- [x] **AppShell** — Header + Nav (Tab/Sidebar)
- [x] **KpiTile** — numero + label + delta
- [x] **StatusPill** — LOCKED, DEADLINE, SWITCH RIMASTI
- [x] **RaceSelector** — dropdown races
- [x] **LeaderboardTable** — 6 squadre, sortable
- [x] **TeamDetailDrawer** — side panel / bottom sheet mobile
- [x] **DriverCard** — piccola card pilota
- [x] **DriverDetailDrawer** — side panel / bottom sheet mobile
- [x] **LineupBuilder** — 3 slot titolari + 1 panchina
- [x] **CalendarList** — cronologica gare + aste
- [x] **RulesModal** — help "Come si calcola?"
- [x] **ToastSystem** — notifiche toast

---

## 📊 Summary

| Section | Progress | Tasks | Completed |
|---------|----------|-------|-----------|
| HOME | 100% | 10 | 10 |
| GARA | 100% | 18 | 18 |
| SCUDERIA | 100% | 19 | 19 |
| CALENDARIO | 100% | 11 | 11 |
| COMPONENTS | 100% | 12 | 12 |
| **TOTAL** | **100%** | **84** | **84** |

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
