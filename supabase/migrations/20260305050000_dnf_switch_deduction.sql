-- 20260305050000_dnf_switch_deduction.sql

-- Riscriviamo la funzione di ricalcolo punteggi gara per fare due cose cruciali:
-- 1. Includere esplicitamente la logica del DNF e subentro della panchina anche nel motore SQL (fino ad ora lo faceva solo JS in frontend).
-- 2. Decrementare uno switch alla squadra (switches_used = switches_used + 1) e registrare lo "switch dnf" se non è già stato fatto.

CREATE OR REPLACE FUNCTION recompute_team_race_scores(p_race_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_team             RECORD;
  v_pts              NUMERIC(8,2);
  v_is_sprint        BOOLEAN;
  v_penalty          NUMERIC(4,2);
  v_has_lineup       BOOLEAN;
  
  v_dnf_count        INTEGER;
  v_out_pilot_id     UUID;
  
  v_reserve_pilot_id UUID;
  v_reserve_pts      NUMERIC(8,2);
  v_reserve_dnf      BOOLEAN;
BEGIN
  -- Controlla se è una sprint race
  SELECT is_sprint INTO v_is_sprint FROM races WHERE id = p_race_id;

  -- Per ogni squadra
  FOR v_team IN SELECT id FROM teams LOOP
    
    -- 1. Somma punti dei piloti TITOLARI (non panchinari)
    SELECT COALESCE(SUM(rr.points_scored), 0)
    INTO v_pts
    FROM lineups l
    JOIN race_results rr
      ON rr.race_id  = l.race_id
     AND rr.pilot_id = l.pilot_id
    WHERE l.race_id   = p_race_id
      AND l.team_id   = v_team.id
      AND l.is_reserve = FALSE;

    -- 2. Penalità mancato schieramento (almeno un titolare schierato)
    SELECT EXISTS (
      SELECT 1 FROM lineups
      WHERE race_id = p_race_id AND team_id = v_team.id AND is_reserve = FALSE
    ) INTO v_has_lineup;

    v_penalty := CASE
      WHEN NOT v_has_lineup AND v_is_sprint THEN 2
      WHEN NOT v_has_lineup                 THEN 5
      ELSE 0
    END;

    -- 3. Logica DNF: Conta i ritirati tra i titolari
    SELECT COUNT(*), MIN(l.pilot_id) -- Prendiamo il primo DNF come "out_pilot" simbolico per il log
    INTO v_dnf_count, v_out_pilot_id
    FROM lineups l
    JOIN race_results rr
      ON rr.race_id  = l.race_id
     AND rr.pilot_id = l.pilot_id
    WHERE l.race_id   = p_race_id
      AND l.team_id   = v_team.id
      AND l.is_reserve = FALSE
      AND rr.dnf = TRUE;

    -- Cerca la riserva
    v_reserve_pilot_id := NULL;
    v_reserve_pts := 0;
    v_reserve_dnf := FALSE;

    SELECT rr.pilot_id, COALESCE(rr.points_scored, 0), COALESCE(rr.dnf, FALSE)
    INTO v_reserve_pilot_id, v_reserve_pts, v_reserve_dnf
    FROM lineups l
    LEFT JOIN race_results rr
      ON rr.race_id  = l.race_id
     AND rr.pilot_id = l.pilot_id
    WHERE l.race_id   = p_race_id
      AND l.team_id   = v_team.id
      AND l.is_reserve = TRUE
    LIMIT 1;

    -- Se c'è un DNF, c'è una riserva, e la riserva NON è a sua volta DNF
    IF v_dnf_count > 0 AND v_reserve_pilot_id IS NOT NULL AND v_reserve_dnf = FALSE THEN
      -- Aggiungi i punti della riserva al totale
      v_pts := v_pts + v_reserve_pts;

      -- Consuma lo switch in modo idempotente (is_free = FALSE dato che costa 1 token switch)
      IF NOT EXISTS (
        SELECT 1 FROM switches 
        WHERE team_id = v_team.id 
          AND effective_from_race_id = p_race_id 
          AND reason = 'dnf'
      ) THEN
        INSERT INTO switches (team_id, out_pilot_id, in_pilot_id, effective_from_race_id, is_free, reason)
        VALUES (v_team.id, v_out_pilot_id, v_reserve_pilot_id, p_race_id, FALSE, 'dnf');

        -- Decrementa il budget switch (switches_used = switches_used + 1)
        UPDATE teams 
        SET switches_used = switches_used + 1 
        WHERE id = v_team.id;
      END IF;
    END IF;

    -- Upsert del punteggio totale di squadra (inclusivo di panchina se entrata)
    INSERT INTO team_race_scores (team_id, race_id, points, penalty)
      VALUES (v_team.id, p_race_id, v_pts, v_penalty)
    ON CONFLICT (team_id, race_id)
      DO UPDATE SET points = EXCLUDED.points, penalty = EXCLUDED.penalty;

  END LOOP;
END;
$$;
