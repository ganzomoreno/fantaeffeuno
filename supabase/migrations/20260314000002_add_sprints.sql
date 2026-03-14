-- ==========================================
-- Migrazione: Sprint Races 2026 + Scoring (v4 — DEFINITIVO)
-- Approccio: boost +1000 → insert missing → renumber 0-based
-- ==========================================

-- 1. Funzione compute_pilot_points (senza fastest_lap)
DROP FUNCTION IF EXISTS compute_pilot_points(INTEGER, INTEGER, BOOLEAN, INTEGER, BOOLEAN);
DROP FUNCTION IF EXISTS compute_pilot_points(INTEGER, INTEGER, INTEGER, BOOLEAN);
DROP FUNCTION IF EXISTS compute_pilot_points(INTEGER, INTEGER, INTEGER, BOOLEAN, BOOLEAN);

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
  IF p_dnf THEN RETURN 0; END IF;

  IF p_is_sprint THEN
    RETURN CASE p_position
      WHEN 1 THEN 8 WHEN 2 THEN 7 WHEN 3 THEN 6 WHEN 4 THEN 5
      WHEN 5 THEN 4 WHEN 6 THEN 3 WHEN 7 THEN 2 WHEN 8 THEN 1
      ELSE 0
    END;
  END IF;

  v_pts := CASE p_position
    WHEN 1  THEN 25 WHEN 2  THEN 22 WHEN 3  THEN 20 WHEN 4  THEN 18
    WHEN 5  THEN 16 WHEN 6  THEN 15 WHEN 7  THEN 14 WHEN 8  THEN 13
    WHEN 9  THEN 12 WHEN 10 THEN 11 WHEN 11 THEN 10 WHEN 12 THEN 9
    WHEN 13 THEN 8  WHEN 14 THEN 7  WHEN 15 THEN 6  WHEN 16 THEN 5
    WHEN 17 THEN 4  WHEN 18 THEN 3  WHEN 19 THEN 2  WHEN 20 THEN 1
    ELSE 0
  END;

  IF p_overtakes > 0 THEN
    v_pts := v_pts + LEAST(p_overtakes * 0.5, 3.0);
  END IF;

  v_pts := v_pts + CASE p_dotd_rank
    WHEN 1 THEN 3 WHEN 2 THEN 2 WHEN 3 THEN 1 ELSE 0
  END;

  RETURN v_pts;
END;
$$;

-- 2. Trigger aggiornato
DROP TRIGGER IF EXISTS set_race_result_points ON public.race_results;
DROP FUNCTION IF EXISTS trg_set_race_result_points();

CREATE OR REPLACE FUNCTION trg_set_race_result_points()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_is_sprint BOOLEAN;
BEGIN
  SELECT is_sprint INTO v_is_sprint FROM races WHERE id = NEW.race_id;

  IF NOT COALESCE(v_is_sprint, FALSE) THEN
    IF NEW.grid_position IS NOT NULL AND NEW.position IS NOT NULL AND NOT NEW.dnf THEN
      NEW.overtakes := GREATEST(0, NEW.grid_position - NEW.position);
    END IF;
  ELSE
    NEW.overtakes := 0;
  END IF;

  NEW.points_scored := compute_pilot_points(
    NEW.position, NEW.overtakes, NEW.dotd_rank, NEW.dnf,
    COALESCE(v_is_sprint, FALSE)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_race_result_points
  BEFORE INSERT OR UPDATE ON public.race_results
  FOR EACH ROW
  EXECUTE FUNCTION trg_set_race_result_points();

-- Ricalcola punteggi esistenti
UPDATE race_results SET id = id;

-- 3. Inserimento Sprint — SAFE via boost+renumber
DO $$
DECLARE
  v_next_so INTEGER;
  v_sprint  RECORD;
BEGIN
  -- ── FASE A: Porta tutti i sort_order a 1000+ ────────────────────────────────
  -- In questo range non esiste nulla → nessun conflitto durante l'UPDATE
  UPDATE calendar_events SET sort_order = sort_order + 1000;
  RAISE NOTICE 'Boost +1000 applicato a tutti i calendar_events.';

  -- ── FASE B: Inserisci le Sprint mancanti con sort_order > di tutti ──────────
  SELECT COALESCE(MAX(sort_order), 1999) + 1 INTO v_next_so FROM calendar_events;

  FOR v_sprint IN
    SELECT * FROM (VALUES
      ('Cina',          '2026-03-14'::DATE),
      ('Miami',         '2026-05-02'::DATE),
      ('Canada',        '2026-05-23'::DATE),
      ('Gran Bretagna', '2026-07-04'::DATE),
      ('Paesi Bassi',   '2026-08-22'::DATE),
      ('Singapore',     '2026-10-10'::DATE)
    ) AS t(location, sprint_date)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM calendar_events
      WHERE location = v_sprint.location AND is_sprint = TRUE
    ) THEN
      INSERT INTO calendar_events (sort_order, event_date, event_type, location, is_sprint)
      VALUES (v_next_so, v_sprint.sprint_date, 'sprint', v_sprint.location, TRUE);
      v_next_so := v_next_so + 1;
      RAISE NOTICE 'Sprint % inserita (event_date: %).', v_sprint.location, v_sprint.sprint_date;
    ELSE
      RAISE NOTICE 'Sprint % già presente, salto.', v_sprint.location;
    END IF;
  END LOOP;

  -- ── FASE C: Rinumera tutti gli eventi 0-based in ordine di data ─────────────
  -- SICURO: i valori correnti sono tutti 1000+, i nuovi sono 0, 1, 2...
  -- Non ci sarà mai collisione intermedia perché 0 < 1000.
  WITH ordered AS (
    SELECT id,
           (ROW_NUMBER() OVER (ORDER BY event_date ASC) - 1) AS new_so
    FROM calendar_events
  )
  UPDATE calendar_events c
  SET sort_order = o.new_so
  FROM ordered o
  WHERE c.id = o.id;

  RAISE NOTICE '=== COMPLETATO ===';
  RAISE NOTICE 'Totale calendar_events: %', (SELECT COUNT(*) FROM calendar_events);
  RAISE NOTICE 'Di cui Sprint:          %', (SELECT COUNT(*) FROM calendar_events WHERE is_sprint = TRUE);
END $$;
