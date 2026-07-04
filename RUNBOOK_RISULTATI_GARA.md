# Runbook — Pubblicazione risultati di una gara (Fanta F1)

> Procedura definitiva per calcolare e pubblicare i punteggi di un GP.
> Obiettivo: l'utente dice **"calcola i punteggi del GP di <luogo>"** e si fa tutto senza ping-pong.
> Le decisioni qui sotto sono **già concordate**: NON serve richiederle ogni volta.

---

## Metodo rapido (button nel sito) — DEFAULT
Nell'app, **AdminPanel → Risultati Gara**, c'è il bottone **"📥 Importa ultima gara (auto)"**:
1. L'admin lo clicca → trova l'ultima gara passata, scarica da **Jolpica** griglia/arrivo/DNF
   e popola il grid (i **sorpassi** li calcola il trigger DB al salvataggio). Codice: `lib/f1import.js`.
2. **DOTD**: non è in nessuna API → Claude fa **un paio di ricerche online** (2 fonti concordi)
   e **pubblica direttamente il top-3** (1°/2°/3°) nel grid, senza chiedere conferma all'utente.
3. Preme **"Salva Risultati"**. Fine.

Lo script manuale qui sotto resta come **fallback** (se Jolpica non ha ancora i dati, codici non
combacianti, o per inserimenti speciali).

## TL;DR procedura (manuale / fallback)

1. **Trova la gara** nel DB (race_id) e verifica che ci siano le **formazioni**.
2. **Cerca i dati ufficiali online** (canali F1): griglia di partenza, classifica finale (post-penalità), lista DNF, Driver of the Day (top 3 fan vote).
3. **Scrivi i `race_results`** (griglia, posizione, dotd_rank, dnf) con uno script sul modello di `scripts/publish_canada_2026_results.js`. Il **trigger DB calcola da solo i sorpassi e i punti**.
4. **Pubblica direttamente**, poi **mostra il riepilogo** completo (piloti + squadre). Se c'è un errore, correggi.
5. **Segnala** (senza applicarle) le situazioni che richiedono una scelta del proprietario (switch DNF) o eccezioni sorpassi.

---

## Decisioni concordate (NON richiederle più)

| Tema | Regola definitiva |
|------|-------------------|
| **Fonte dati** | Sempre dai **canali ufficiali F1 online** (formula1.com, gpfans, racingnews365, racefans, total-motorsport, crash.net, motorsport.com). Valgono per **griglia, risultati E Driver of the Day**. Mai inventare, mai chiedere all'utente di fornirli. |
| **Classifica da usare** | La **classifica finale UFFICIALE dopo le penalità** (cercare le pagine "after penalties / final classification"). |
| **Sorpassi** | Default = **netti**: `posizioni guadagnate = max(0, griglia − arrivo)`, cap 6 (= +3 pt max). Lo calcola **da solo il trigger DB**. **Eccezione**: se nei report ufficiali emerge un caso evidente (recovery drive, partenza dalla pit-lane, incidente al via — es. VER a Miami) → **segnalalo e aggiusta** manualmente quel pilota. |
| **Driver of the Day** | Fai **un paio di ricerche online** (bastano **2 fonti concordi**, es. total-motorsport, formula1.com, racefans) e **pubblica direttamente il top 3**: 1°=+3, 2°=+2, 3°=+1. **NON chiedere conferma all'utente** e non limitarti al solo vincitore: cerca fin da subito il podio completo del fan vote. Solo se dopo le ricerche il 2°/3° è davvero introvabile, assegna quello che hai e segnalalo. |
| **DOTD + DNF** | Il DOTD è una **mini-sfida accessoria**: vale **anche se il pilota è DNF**. (Il DNF azzera SOLO piazzamento e sorpassi, non il DOTD.) |
| **Giro veloce** | ❌ **NON si conteggia MAI.** Non proporlo nemmeno. |
| **DNF** | 0 punti su piazzamento e sorpassi (il DOTD resta, vedi sopra). |
| **Switch DNF (riserva al posto del titolare DNF)** | ❌ **Non lo applico io.** Lo decide il **proprietario dall'app**. Io mi limito a **segnalare** quali squadre potrebbero usarlo (titolare DNF + riserva che ha concluso). Lo switch DNF è gratis e non conta tra i 5 stagionali. |
| **Workflow** | **Pubblico direttamente nel DB**, poi mostro il riepilogo. Niente conferma preventiva. |
| **Penalità mancato schieramento** | Se una squadra ha <3 titolari schierati → **−5 pt gara** (−2 sprint). Già gestito da `scoring.js`. |

---

## Sistema di punteggio (riferimento)

Punti pilota = **Piazzamento + Sorpassi + DOTD** (giro veloce escluso).

- **Piazzamento** (gara main): P1=25, P2=22, P3=20, P4=18, P5=16, P6=15, P7=14, P8=13, P9=12, P10=11, P11=10, P12=9, P13=8, P14=7, P15=6, P16=5, P17=4, P18=3, P19=2, P20=1, P21–22=0.
- **Sprint**: P1=8, P2=7 … P8=1 (nessun bonus sorpassi/DOTD nelle sprint).
- **Sorpassi**: +0,5 ciascuno, **cap +3 pt** (6 sorpassi). Nessun malus per sorpassi subiti.
- **DOTD**: +3 / +2 / +1 (top 3). Vale anche sui DNF.
- **DNF**: 0 su piazzamento+sorpassi, DOTD sì.

**Punteggio squadra** = somma dei 3 **titolari** schierati. Il DNF di un titolare = 0 (nessuna sostituzione automatica della riserva: serve uno switch manuale deciso dal proprietario).

---

## Procedura tecnica dettagliata

### 1. Trovare la gara e le formazioni
- I dati sono su **Supabase**. Gli script usano la **service role key** hardcoded (vedi qualsiasi script in `scripts/`) + `NEXT_PUBLIC_SUPABASE_URL` da `.env.local`.
- Il `calendar_events` ha `location` (es. `"Monaco"`) e `sort_order`. La `races` è collegata via `calendar_event_id`.
- **race_id**: prendilo dalle lineups Monaco oppure da `races` via `calendar_event_id`.
  ⚠️ La tabella `races` **NON ha colonna `status`** (selezionarla dà errore → `data: null`). Colonne reali: `id, calendar_event_id, is_sprint, created_at`.
- Verifica che esistano le **formazioni** (`lineups`, `is_reserve=false` per i titolari). Se mancano, i giocatori non hanno schierato: fermati e segnalalo.

### 2. Recuperare i dati ufficiali (web)
Cerca e scarica da canali F1:
- **Griglia di partenza** completa P1–P22 (qualifiche, con eventuali penalità/pit-lane).
- **Classifica finale** completa + **lista DNF** (usa la versione "dopo penalità").
- **Driver of the Day**: top 3 del fan vote.

### 3. Scrivere i risultati
Copia `scripts/publish_canada_2026_results.js` (o `publish_monaco_2026_results.js`) e adatta:
- `RACE_ID`
- `GRID` = `{ ABBR: posizione_griglia }` per tutti i 22
- `RESULTS` = `[{ abbr, pos|null, dotd|null, dnf }]` per tutti i 22
- Inserisci righe `{ race_id, pilot_id, grid_position, position, dotd_rank, dnf }`.
  **NON impostare `overtakes`**: ci pensa il trigger.

**Cosa fa il trigger** (`set_race_result_points` su `race_results`, vedi `supabase/migrations/20260314000005_definitive_scoring_fix.sql`):
- `overtakes = GREATEST(0, grid_position − position)` (gara main, non-DNF).
- `points_scored = compute_pilot_points(...)` con cap sorpassi a 3 pt e DOTD +3/+2/+1.
- Per le **eccezioni sorpassi** manuali: dopo l'insert, `UPDATE race_results SET overtakes = <n>` per quel pilota (il trigger ricalcola i punti). Vedi `scripts/update_miami_gp_overtakes.js`.

### 4. Verificare i punteggi squadra
- ⚠️ La RPC `recompute_team_race_scores` è **rotta** (errore `function min(uuid) does not exist`) ed è **inutile**: né `lib/db.js` né i componenti leggono `team_race_scores`.
- L'app calcola i punteggi squadra **al volo** lato client con `lib/scoring.js` (`calculateTeamScores`), partendo da `race_results` + `lineups`. Quindi appena i `race_results` sono scritti, **l'app è già aggiornata**.
- Per verificare, somma i `points_scored` dei titolari per ogni team (o replica `calculatePilotPoints`).

### 5. Riepilogo
Mostra: tabella punti pilota (griglia, sorpassi, DOTD, punti) + classifica squadre del GP. Segnala eventuali switch DNF disponibili (senza applicarli) ed eventuali eccezioni sorpassi applicate.

---

## Note tecniche / trappole note

- **App live = branch `master`** su GitHub `ganzomoreno/fantaeffeuno`, deploy automatico. Il branch `feature/fanta-formula1-app` è un **codebase vecchio/diverso** (non ha `lib/` né i componenti attuali): ignorarlo. Per aggiornare il sito: commit + push su `master`.
- **Scoring autoritativo = `lib/scoring.js`** (l'app NON usa `race_results.points_scored` per il display: `fetchRaces` non lo seleziona e ricalcola via `scoring.js`).
- ⚠️ **`compute_pilot_points` (funzione DB) è disallineata** rispetto a `scoring.js` sul caso DOTD-su-DNF: la funzione DB azzera ancora tutto sui DNF, quindi `points_scored` per un pilota DNF con DOTD è errato in DB, **ma l'app mostra il valore giusto** (via scoring.js). Se un giorno serve allineare il DB, va modificata la funzione `compute_pilot_points` con una migrazione SQL.
- **Giro veloce**: volutamente non implementato nel motore (migration "senza fastest_lap"). Coerente con la regola "mai conteggiarlo".

---

## Esempio svolto: GP Monaco 2026 (07/06/2026)
- race_id: `bcabb0a8-4f0f-4adb-873a-cae29409ec8f`
- Vittoria ANT, gara caotica (red flag, penalità), 7 DNF (VER, SAI, LEC, STR, NOR, BEA, BOT).
- DOTD: 1° ANT (+3), 2° LEC (+2, ma DNF → vale comunque), 3° HAM (+1).
- Script: `scripts/publish_monaco_2026_results.js`.
- Risultato squadre: ZetaRacing 54.5, SF Fainelli 43.5, Scudemaria 35.5, Abdull 31, Ranocchiettos 27.5, Alpha Chiro 14.5.
