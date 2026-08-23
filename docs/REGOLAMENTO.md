# FantaFormula1 — Regolamento (fonte di verità)

> Questo file è la fonte di verità del regolamento. Il codice in `src/lib/scoring.ts`
> deve sempre rispecchiare quanto scritto qui. Se cambia una regola: si aggiorna
> **prima** questo file, poi il codice.

## Ruoli

- **SuperAdmin**: Alessandro Zanin (`zanin.ale95@gmail.com`). Unico abilitato a
  `/admin`, alla pubblicazione risultati e alla gestione aste.
- **Partecipanti**: 5 team, uno per utente registrato.

## Rosa e budget

- Budget iniziale: **100 fantamilioni** per team.
- 6 aste per stagione: 1 iniziale libera (round 0) + 5 a busta chiusa (round 1-5).
- 3 **switch stagionali** per team (cambio pilota fuori asta).

## Formazione

- Ogni gara si schierano **3 titolari + 1 panchinaro**.
- **Auto-sostituzione**: se un titolare non è classificato (DNF o assente dai
  risultati), subentra il panchinaro con i suoi punti.
  Il panchinaro subentra **una sola volta per weekend**: se più titolari sono DNF,
  copre il primo in ordine di schieramento (driver1 → driver2 → driver3),
  gli altri DNF valgono 0.
- **Penalità mancato schieramento**: **−5** per weekend, sprint o non sprint.
  > ⚠️ Da confermare con il SuperAdmin. Il codice originale applicava −2 sui
  > weekend sprint e −5 sugli altri: aveva senso quando la Sprint era un evento
  > separato e leggero. Con il punteggio unico di weekend un weekend sprint vale
  > *di più* (sprint + gara), quindi penalizzarlo meno era invertito. Fissato a
  > −5 uniforme finché non viene deciso diversamente.

## Punteggi

### Gara (GP domenicale)

| Voce | Punti |
|---|---|
| Posizione di arrivo | `21 − posizione` (1° = 20 … 20° = 1) |
| Driver of the Day 1°/2°/3° | +3 / +2 / +1 |
| Giro veloce | +1 |
| Pole position | +1 |
| Sorpasso | +0,5 ciascuno |
| DNF / non classificato | 0 (subentra la panchina) |

### Sprint

La Sprint usa una **scala ridotta top-8**: fanno punti solo i primi 8.

| Pos | 1° | 2° | 3° | 4° | 5° | 6° | 7° | 8° | 9°+ |
|---|---|---|---|---|---|---|---|---|---|
| Punti | 8 | 7 | 6 | 5 | 4 | 3 | 2 | 1 | 0 |

Nella Sprint **non si assegnano bonus**: niente Driver of the Day, niente giro
veloce, niente pole, niente sorpassi. Solo la posizione.
(Rispecchia la F1 reale: la Sprint non ha DotD né punto per il giro veloce.)

### Weekend con Sprint — punteggio unico

Su un weekend sprint **non esistono due punteggi separati**: Sprint e GP si
sommano in **un solo punteggio di weekend**, pubblicato a fine gara domenicale.

```
punti_pilota = punti_sprint(top-8) + punti_gara(scala piena + bonus)
punti_team   = somma dei 3 titolari (con auto-sostituzione panchina)
```

Di conseguenza la classifica registra **una riga per weekend**, non due.

## Calendario 2026 — weekend Sprint

Zandvoort (Olanda, 21–23 agosto 2026) è un weekend Sprint: Sprint Qualifying
venerdì, Sprint Race sabato 12:00, Qualifiche sabato 16:00, GP domenica 15:00.
È la prima e ultima Sprint di Zandvoort: il circuito esce dal calendario nel 2027.
