-- ==============================================================================
-- SCRIPT DI RIPRISTINO TOTALE SCORING E RISULTATI CINA (v5 — SUPER-DEFINITIVO)
-- ==============================================================================
-- Questo script:
-- 1. Pulisce ogni vecchia versione della funzione di calcolo punti
-- 2. Ricrea la funzione e il trigger (senza fastest_lap)
-- 3. Forza is_sprint = TRUE sulla race "Cina" del 14/03
-- 4. Ricalcola tutti i punti per assicurarci che 8->1 sia applicato
-- ==============================================================================

DO $$ 
BEGIN
    RAISE NOTICE 'Inizio ripristino scoring...';

    -- 1. Pulizia funzioni e trigger
    DROP TRIGGER IF EXISTS set_race_result_points ON race_results;
    DROP FUNCTION IF EXISTS trg_set_race_result_points();
    DROP FUNCTION IF EXISTS compute_pilot_points(INTEGER, INTEGER, BOOLEAN, INTEGER, BOOLEAN);
    DROP FUNCTION IF EXISTS compute_pilot_points(INTEGER, INTEGER, INTEGER, BOOLEAN);
    DROP FUNCTION IF EXISTS compute_pilot_points(INTEGER, INTEGER, INTEGER, BOOLEAN, BOOLEAN);
END $$;

-- 2. Ricreazione funzione compute_pilot_points (5 parametri definitivi)
CREATE OR REPLACE FUNCTION compute_pilot_points(
  p_position    INTEGER,
  p_overtakes   INTEGER,
  p_dotd_rank   INTEGER,
  p_dnf         BOOLEAN,
  p_is_sprint   BOOLEAN DEFAULT FALSE
)
RETURNS NUMERIC(6,2)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_pts NUMERIC(6,2) := 0;
BEGIN
  -- DNF = 0 pt
  IF p_dnf THEN RETURN 0; END IF;

  -- ── LOGICA SPRINT (8 -> 1) ──
  IF p_is_sprint THEN
    RETURN CASE p_position
      WHEN 1 THEN 8 WHEN 2 THEN 7 WHEN 3 THEN 6 WHEN 4 THEN 5
      WHEN 5 THEN 4 WHEN 6 THEN 3 WHEN 7 THEN 2 WHEN 8 THEN 1
      ELSE 0
    END;
  END IF;

  -- ── LOGICA GARA MAIN (25 -> 1) ──
  v_pts := CASE p_position
    WHEN 1  THEN 25 WHEN 2  THEN 22 WHEN 3  THEN 20 WHEN 4  THEN 18
    WHEN 5  THEN 16 WHEN 6  THEN 15 WHEN 7  THEN 14 WHEN 8  THEN 13
    WHEN 9  THEN 12 WHEN 10 THEN 11 WHEN 11 THEN 10 WHEN 12 THEN 9
    WHEN 13 THEN 8  WHEN 14 THEN 7  WHEN 15 THEN 6  WHEN 16 THEN 5
    WHEN 17 THEN 4  WHEN 18 THEN 3  WHEN 19 THEN 2  WHEN 20 THEN 1
    ELSE 0
  END;

  -- Bonus Sorpassi (Main Race)
  IF p_overtakes > 0 THEN
    v_pts := v_pts + LEAST(p_overtakes * 0.5, 3.0);
  END IF;

  -- Driver of the Day (Main Race)
  v_pts := v_pts + CASE p_dotd_rank
    WHEN 1 THEN 3 WHEN 2 THEN 2 WHEN 3 THEN 1 ELSE 0
  END;

  RETURN v_pts;
END;
$$;

-- 3. Ricreazione Trigger trg_set_race_result_points
CREATE OR REPLACE FUNCTION trg_set_race_result_points()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_is_sprint BOOLEAN;
BEGIN
  -- Legge is_sprint dalla race
  SELECT is_sprint INTO v_is_sprint FROM races WHERE id = NEW.race_id;

  -- Gestione overtakes automatica
  IF NOT COALESCE(v_is_sprint, FALSE) THEN
    IF NEW.grid_position IS NOT NULL AND NEW.position IS NOT NULL AND NOT NEW.dnf THEN
      NEW.overtakes := GREATEST(0, NEW.grid_position - NEW.position);
    END IF;
  ELSE
    NEW.overtakes := 0; -- Sprint: niente overtakes manuali per ora
  END IF;

  -- Calcola puntiscored
  NEW.points_scored := compute_pilot_points(
    NEW.position, NEW.overtakes, NEW.dotd_rank, NEW.dnf,
    COALESCE(v_is_sprint, FALSE)
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_race_result_points
  BEFORE INSERT OR UPDATE ON race_results
  FOR EACH ROW
  EXECUTE FUNCTION trg_set_race_result_points();

-- 4. FIX DATI: Forza is_sprint = TRUE per la Cina del 14/03
--    e ricalcola punti per tutti i risultati sprint
DO $$
DECLARE
  v_race_id UUID;
BEGIN
    -- Sincronizza is_sprint da calendar_events a races
    UPDATE races r
    SET is_sprint = TRUE
    FROM calendar_events ce
    WHERE r.calendar_event_id = ce.id
      AND ce.location = 'Cina'
      AND ce.is_sprint = TRUE;

    -- Ricalcolo forzato di TUTTI i risultati di race che sono sprint
    UPDATE race_results
    SET id = id -- Trigger fire
    WHERE race_id IN (SELECT id FROM races WHERE is_sprint = TRUE);

    RAISE NOTICE 'Ripristino completato con successo.';
END $$;

-- 5. VERIFICA FINALE (Lancia questa query separatamente per vedere i risultati)
SELECT 
  p.abbreviation, 
  rr.position, 
  rr.points_scored, 
  r.is_sprint
FROM race_results rr
JOIN races r ON rr.race_id = r.id
JOIN pilots p ON rr.pilot_id = p.id
JOIN calendar_events ce ON r.calendar_event_id = ce.id
WHERE ce.location = 'Cina' AND ce.is_sprint = TRUE;
