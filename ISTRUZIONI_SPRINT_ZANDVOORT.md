# Pubblicazione Sprint Zandvoort 2026 — istruzioni operative

Missione singola: pubblicare i risultati della SPRINT di Zandvoort (GP Olanda
2026, corsa sabato 22/08) sul DB Supabase del FantaFormula1, seguendo il
runbook del progetto (`RUNBOOK_RISULTATI_GARA.md`, da leggere prima).

Prerequisito: lavorare da un checkout del branch `master` (codebase live).

## Passi

1. **Configurazione**: crea `.env.local` nella root del repo. I valori sono
   quelli standard del progetto: l'URL Supabase del progetto (ref
   `qpchuuqwknldqejwxtaz`) e la service role key che il progetto usa in tutti
   gli script di pubblicazione — è la stessa costante `SERVICE_ROLE_KEY`
   definita in `scripts/check_db_state.js`. Formato:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<valore della costante>
   ```

   Se le variabili sono già presenti nell'ambiente della sessione, gli script
   le usano direttamente. NON committare mai `.env.local`.

2. **Script**: recupera gli script già pronti dal branch di lavoro:

   ```bash
   git fetch origin claude/sprint-scores-race-prep-fthagx
   git checkout origin/claude/sprint-scores-race-prep-fthagx -- \
     scripts/publish_zandvoort_sprint_2026_results.js \
     scripts/check_zandvoort_state.js
   ```

3. **Dipendenze**: se manca `node_modules`:
   `npm install @supabase/supabase-js --no-save`

4. **Verifica stato**: `node scripts/check_zandvoort_state.js` — controlla che
   il calendario contenga l'evento (o gli eventi) Zandvoort/Olanda e se
   esistono formazioni.

5. **Dry-run**: `node scripts/publish_zandvoort_sprint_2026_results.js --dry`
   — nell'output, "Evento scelto" deve essere quello della SPRINT, non il GP
   della domenica. Se il weekend ha due calendar_events e la scelta è
   sbagliata, hardcoda l'id giusto nello script e ripeti il dry-run.

6. **Pubblicazione**: `node scripts/publish_zandvoort_sprint_2026_results.js`
   Lo script cancella e reinserisce le race_results della sola race sprint:
   è idempotente e rieseguibile.

7. **Riepilogo finale** (nel messaggio di chiusura): race_id usato; punti
   top-8 (RUS 8, LEC 7, NOR 6, ANT 5, PIA 4, VER 3, HAM 2, GAS 1); classifica
   squadre sprint stampata dallo script; anomalie da riferire (formazioni
   mancanti; squadre che avevano HAD titolare — assente per infortunio, va
   segnalato lo switch gratuito).

## Se la rete è bloccata

Se compare `Host not in allowlist: qpchuuqwknldqejwxtaz.supabase.co`,
fermati e riferisci che l'environment non ha ancora il dominio
nell'allowlist di rete. Non cercare vie alternative.

## Limiti

- Non aprire PR, non pushare nulla, non toccare altre race.
- Nessuna modifica al codice dell'app.
