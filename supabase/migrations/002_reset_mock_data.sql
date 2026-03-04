-- ============================================================
--  Migration 002 — Reset dati mockati / test
--  Esegui nell'SQL Editor di Supabase UNA SOLA VOLTA
--  prima dell'asta reale.
--
--  Cosa fa:
--  1. Rimuove tutte le assegnazioni piloti (rosa → libera)
--  2. Azzera i prezzi di acquisto
--  3. Ripristina il budget a 100M per tutte le squadre
--  4. Azzera i contatori switch
--  5. Rimuove lineups, race_results, races e team_race_scores di test
--  6. NON tocca calendar_events, auctions, teams, pilots (struttura)
-- ============================================================

-- 1. Rimuovi tutti i punteggi cache di gara
DELETE FROM team_race_scores;

-- 2. Rimuovi tutte le formazioni
DELETE FROM lineups;

-- 3. Rimuovi tutti i risultati gara
DELETE FROM race_results;

-- 4. Rimuovi tutte le gare inserite
DELETE FROM races;

-- 5. Libera tutti i piloti (reset assegnazioni asta)
UPDATE pilots
SET owner_team_id  = NULL,
    purchase_price = 0;

-- 6. Ripristina budget e switch per tutte le squadre
UPDATE teams
SET budget        = 100,
    switches_used = 0;

-- Verifica
SELECT 'Piloti liberi: ' || COUNT(*) FROM pilots WHERE owner_team_id IS NULL;
SELECT 'Budget squadre:' || STRING_AGG(name || '=' || budget::TEXT || 'M', ', ' ORDER BY name) FROM teams;
