-- ================================================
-- FIX CALENDARIO: GP Olanda 2026 (Zandvoort)
-- Data reale weekend: ven 21 - dom 23 agosto 2026
-- Sprint Qualifying ven 21, Sprint Race sab 22 12:00,
-- Qualifiche sab 22 16:00, GP dom 23 agosto 15:00
-- Zandvoort ospita per la prima (e ultima) volta una Sprint.
-- Fonte: formula1.com / sky sport / oasport
-- ================================================

-- Il seed aveva: date '2026-08-31', is_sprint = false  --> ENTRAMBI ERRATI
UPDATE races
SET date = '2026-08-23',
    is_sprint = true
WHERE season = 2026
  AND name = 'Olanda';

-- Verifica
SELECT round, name, circuit, date, is_sprint, results_published
FROM races
WHERE season = 2026
ORDER BY date
LIMIT 5;

-- ================================================
-- SPRINT: risultato sprint nella stessa riga del weekend
-- Regolamento: Sprint e GP fanno UN SOLO punteggio di weekend
-- (docs/REGOLAMENTO.md), quindi niente riga gara separata e
-- niente seconda riga risultati: due colonne in più bastano.
-- ================================================

ALTER TABLE race_results
  ADD COLUMN IF NOT EXISTS sprint_position integer,
  ADD COLUMN IF NOT EXISTS sprint_dnf boolean DEFAULT false;

COMMENT ON COLUMN race_results.sprint_position IS
  'Posizione nella Sprint del sabato. Scala top-8: 1°=8pt ... 8°=1pt, 9°+ = 0. Niente bonus.';

-- ================================================
-- RLS: permessi di scrittura per il SuperAdmin
--
-- PROBLEMA: race_results, race_scores e races hanno RLS attiva ma SOLO
-- policy di SELECT. Nessuna policy di INSERT/UPDATE significa scrittura
-- negata: il bottone "Pubblica risultati e calcola punteggi" di /admin
-- fallisce con "new row violates row-level security policy".
-- Finora funzionava solo passando dal SQL Editor di Supabase, che gira
-- come service_role e bypassa la RLS.
-- ================================================

CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS boolean
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(auth.jwt() ->> 'email', '') = 'zanin.ale95@gmail.com';
$$;

DROP POLICY IF EXISTS "superadmin write race_results" ON race_results;
CREATE POLICY "superadmin write race_results" ON race_results
  FOR ALL USING (is_superadmin()) WITH CHECK (is_superadmin());

DROP POLICY IF EXISTS "superadmin write race_scores" ON race_scores;
CREATE POLICY "superadmin write race_scores" ON race_scores
  FOR ALL USING (is_superadmin()) WITH CHECK (is_superadmin());

DROP POLICY IF EXISTS "superadmin write races" ON races;
CREATE POLICY "superadmin write races" ON races
  FOR ALL USING (is_superadmin()) WITH CHECK (is_superadmin());

-- Nota: lo stesso buco esiste sul flusso aste (team_drivers, teams,
-- auctions: assegnazione pilota e scalo fantamilioni da /admin).
-- Non toccato qui perché fuori dal weekend di Olanda, ma da sistemare
-- prima della prossima asta.
