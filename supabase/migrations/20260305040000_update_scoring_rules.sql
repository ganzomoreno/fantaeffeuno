-- 20260305040000_update_scoring_rules.sql

-- 1. Aggiungiamo grid_position
ALTER TABLE public.race_results ADD COLUMN IF NOT EXISTS grid_position INTEGER CHECK (grid_position BETWEEN 1 AND 22);

-- 2. Eliminiamo fastest_lap
ALTER TABLE public.race_results DROP COLUMN IF EXISTS fastest_lap CASCADE;

-- 3. Aggiorniamo le logiche di calcolo rimuovendo fastest_lap dai parametri
DROP TRIGGER IF EXISTS set_race_result_points ON public.race_results;
DROP FUNCTION IF EXISTS trg_set_race_result_points();
DROP FUNCTION IF EXISTS compute_pilot_points(INTEGER, INTEGER, BOOLEAN, INTEGER, BOOLEAN);

CREATE OR REPLACE FUNCTION compute_pilot_points(
  p_position    INTEGER,
  p_overtakes   INTEGER,
  p_dotd_rank   INTEGER,
  p_dnf         BOOLEAN
)
RETURNS NUMERIC(6,2)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_pts NUMERIC(6,2) := 0;
BEGIN
  -- DNF → zero punti
  IF p_dnf THEN
    RETURN 0;
  END IF;

  -- Punti posizione (P1=25 … P20=1, P21-22=0)
  v_pts := CASE p_position
    WHEN 1  THEN 25
    WHEN 2  THEN 22
    WHEN 3  THEN 20
    WHEN 4  THEN 18
    WHEN 5  THEN 16
    WHEN 6  THEN 15
    WHEN 7  THEN 14
    WHEN 8  THEN 13
    WHEN 9  THEN 12
    WHEN 10 THEN 11
    WHEN 11 THEN 10
    WHEN 12 THEN 9
    WHEN 13 THEN 8
    WHEN 14 THEN 7
    WHEN 15 THEN 6
    WHEN 16 THEN 5
    WHEN 17 THEN 4
    WHEN 18 THEN 3
    WHEN 19 THEN 2
    WHEN 20 THEN 1
    ELSE 0
  END;

  -- Bonus sorpassi: calcolati come max 3.0 punti
  IF p_overtakes > 0 THEN
    v_pts := v_pts + LEAST(p_overtakes * 0.5, 3.0);
  END IF;

  -- Driver of the Day: 1°→+3, 2°→+2, 3°→+1
  v_pts := v_pts + CASE p_dotd_rank
    WHEN 1 THEN 3
    WHEN 2 THEN 2
    WHEN 3 THEN 1
    ELSE 0
  END;

  RETURN v_pts;
END;
$$;

CREATE OR REPLACE FUNCTION trg_set_race_result_points()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Calcolo automatico sorpassi se c'è grid position ed end position
  IF NEW.grid_position IS NOT NULL AND NEW.position IS NOT NULL AND NOT NEW.dnf THEN
    NEW.overtakes := GREATEST(0, NEW.grid_position - NEW.position);
  END IF;

  -- Ricalcola punti col nuovo motore
  NEW.points_scored := compute_pilot_points(
    NEW.position,
    NEW.overtakes,
    NEW.dotd_rank,
    NEW.dnf
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_race_result_points
  BEFORE INSERT OR UPDATE ON public.race_results
  FOR EACH ROW
  EXECUTE FUNCTION trg_set_race_result_points();
