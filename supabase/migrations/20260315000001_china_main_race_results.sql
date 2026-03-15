-- ============================================================
-- GP CINA 2026 — Gara Principale (15/03/2026)
-- Da eseguire nell'SQL Editor di Supabase
-- ============================================================
-- Fonte risultati: formula1.com, motorsportweek.com, gpfans.com
-- Classifica:
--  P1  ANT | P2  RUS | P3  HAM | P4  LEC | P5  BEA | P6  GAS
--  P7  LAW | P8  HAD | P9  SAI | P10 COL | P11 HUL | P12 LIN
--  P13 BOT | P14 PER | P15 OCO
--  DNF: VER (ritiro ~10 giri dalla fine), ALO (health scare), STR (safety car)
--  DNS: NOR (problemi elettrici), PIA (problemi elettrici), BOR, ALB (pit lane)
--
-- DOTD: ANT rank 1 (+3 pts), HAM rank 2 (+2 pts)
-- Giro veloce: ANT (1:35.275, giro 52) — non in scoring DB
-- ============================================================

DO $$
DECLARE
  v_cal_event_id  UUID;
  v_race_id       UUID;

  -- Piloti (lookup per abbreviazione — sicuro anche se gli UUID cambiano)
  ANT UUID := (SELECT id FROM pilots WHERE abbreviation = 'ANT');
  RUS UUID := (SELECT id FROM pilots WHERE abbreviation = 'RUS');
  HAM UUID := (SELECT id FROM pilots WHERE abbreviation = 'HAM');
  LEC UUID := (SELECT id FROM pilots WHERE abbreviation = 'LEC');
  BEA UUID := (SELECT id FROM pilots WHERE abbreviation = 'BEA');
  GAS UUID := (SELECT id FROM pilots WHERE abbreviation = 'GAS');
  LAW UUID := (SELECT id FROM pilots WHERE abbreviation = 'LAW');
  HAD UUID := (SELECT id FROM pilots WHERE abbreviation = 'HAD');
  SAI UUID := (SELECT id FROM pilots WHERE abbreviation = 'SAI');
  COL UUID := (SELECT id FROM pilots WHERE abbreviation = 'COL');
  HUL UUID := (SELECT id FROM pilots WHERE abbreviation = 'HUL');
  LIN UUID := (SELECT id FROM pilots WHERE abbreviation = 'LIN');
  BOT UUID := (SELECT id FROM pilots WHERE abbreviation = 'BOT');
  PER UUID := (SELECT id FROM pilots WHERE abbreviation = 'PER');
  OCO UUID := (SELECT id FROM pilots WHERE abbreviation = 'OCO');
  VER UUID := (SELECT id FROM pilots WHERE abbreviation = 'VER');
  ALO UUID := (SELECT id FROM pilots WHERE abbreviation = 'ALO');
  STR UUID := (SELECT id FROM pilots WHERE abbreviation = 'STR');
  NOR UUID := (SELECT id FROM pilots WHERE abbreviation = 'NOR');
  PIA UUID := (SELECT id FROM pilots WHERE abbreviation = 'PIA');
  BOR UUID := (SELECT id FROM pilots WHERE abbreviation = 'BOR');
  ALB UUID := (SELECT id FROM pilots WHERE abbreviation = 'ALB');

  -- Team IDs (da backup sprint)
  ZETARACING    UUID := 'fe291964-2daf-407e-aa7f-e5aeb21acba2';
  ABDULLMAZZAR  UUID := 'fbffdb1c-1e87-473f-9132-5e2009233795';
  ALPHACHIRO    UUID := '3034f5d6-aa87-41df-af5c-975d463fe8b0';
  RANOCCHIETTOS UUID := '16bd7ed4-06e0-462a-bfd0-be084e8d7e75';
  SFAINELLI     UUID := 'f7bfa2d5-9896-4dee-ac87-ff801a91e71f';
  SCUDEMARIA    UUID := '05086247-5ec5-4adf-8845-63262ecc9838';

BEGIN

  -- ================================================================
  -- STEP 1: Trova calendar_event GP Cina (gara principale, non sprint)
  -- ================================================================
  SELECT id INTO v_cal_event_id
  FROM calendar_events
  WHERE location = 'Cina' AND is_sprint = FALSE
  LIMIT 1;

  IF v_cal_event_id IS NULL THEN
    RAISE EXCEPTION 'Calendar event GP Cina (principale) non trovato!';
  END IF;

  RAISE NOTICE 'Calendar Event GP Cina: %', v_cal_event_id;

  -- ================================================================
  -- STEP 2: Crea o recupera la Race
  -- ================================================================
  SELECT id INTO v_race_id FROM races WHERE calendar_event_id = v_cal_event_id;

  IF v_race_id IS NULL THEN
    INSERT INTO races (calendar_event_id, is_sprint, status)
    VALUES (v_cal_event_id, FALSE, 'completed')
    RETURNING id INTO v_race_id;
    RAISE NOTICE 'Race creata: %', v_race_id;
  ELSE
    UPDATE races SET is_sprint = FALSE, status = 'completed' WHERE id = v_race_id;
    RAISE NOTICE 'Race esistente: %', v_race_id;
  END IF;

  -- ================================================================
  -- STEP 3: Pulisce e inserisce risultati
  -- Il trigger calcola automaticamente: overtakes = MAX(0, grid - pos)
  -- e i punti (25,22,20,18...1 + bonus sorpassi + DOTD)
  -- ================================================================
  DELETE FROM race_results WHERE race_id = v_race_id;

  INSERT INTO race_results (race_id, pilot_id, grid_position, position, dnf, dotd_rank) VALUES
    -- Classificati
    (v_race_id, ANT,  1,  1,    FALSE, 1),     -- P1: 25 pts + 0 ov + DOTD(3) = 28
    (v_race_id, RUS,  2,  2,    FALSE, NULL),  -- P2: 22 pts + 0 ov = 22
    (v_race_id, HAM,  3,  3,    FALSE, 2),     -- P3: 20 pts + 0 ov + DOTD(2) = 22
    (v_race_id, LEC,  4,  4,    FALSE, NULL),  -- P4: 18 pts + 0 ov = 18
    (v_race_id, BEA,  10, 5,    FALSE, NULL),  -- P5: 16 pts + 2.5ov (5 sorpassi)
    (v_race_id, GAS,  7,  6,    FALSE, NULL),  -- P6: 15 pts + 0.5ov (1 sorpasso)
    (v_race_id, LAW,  14, 7,    FALSE, NULL),  -- P7: 14 pts + 3ov cap (7 sorpassi → cap 6)
    (v_race_id, HAD,  9,  8,    FALSE, NULL),  -- P8: 13 pts + 0.5ov (1 sorpasso)
    (v_race_id, SAI,  17, 9,    FALSE, NULL),  -- P9: 12 pts + 3ov cap (8 sorpassi → cap 6)
    (v_race_id, COL,  12, 10,   FALSE, NULL),  -- P10: 11 pts + 1ov (2 sorpassi)
    (v_race_id, HUL,  11, 11,   FALSE, NULL),  -- P11: 10 pts + 0 ov
    (v_race_id, LIN,  15, 12,   FALSE, NULL),  -- P12:  9 pts + 1.5ov (3 sorpassi)
    (v_race_id, BOT,  19, 13,   FALSE, NULL),  -- P13:  8 pts + 3ov cap (6 sorpassi)
    (v_race_id, PER,  21, 14,   FALSE, NULL),  -- P14:  7 pts + 3ov cap (7 sorpassi → cap 6)
    (v_race_id, OCO,  13, 15,   FALSE, NULL),  -- P15:  6 pts + 0 ov (perso posizioni)
    -- DNF (0 punti)
    (v_race_id, VER,  8,  NULL, TRUE,  3),     -- DNF (~10 giri dalla fine) + DOTD 3° (ma DNF → 0 pts)
    (v_race_id, ALO,  18, NULL, TRUE,  NULL),  -- DNF (health scare)
    (v_race_id, STR,  20, NULL, TRUE,  NULL),  -- DNF (safety car)
    -- DNS trattati come DNF = 0 punti
    (v_race_id, NOR,  6,  NULL, TRUE,  NULL),  -- DNS (problemi elettrici)
    (v_race_id, PIA,  5,  NULL, TRUE,  NULL),  -- DNS (problemi elettrici)
    (v_race_id, BOR,  16, NULL, TRUE,  NULL),  -- DNS
    (v_race_id, ALB,  22, NULL, TRUE,  NULL);  -- DNS (pit lane start, ritirato)

  RAISE NOTICE 'Risultati inseriti: 22 piloti';

  -- ================================================================
  -- STEP 4: Inserisce le formazioni (lineups) dei 6 team
  -- ================================================================
  DELETE FROM lineups WHERE race_id = v_race_id;

  -- ZetaRacing: LEC (T), ANT (T), LIN (T) — nessuna panchina
  INSERT INTO lineups (race_id, team_id, pilot_id, is_reserve) VALUES
    (v_race_id, ZETARACING, LEC, FALSE),
    (v_race_id, ZETARACING, ANT, FALSE),
    (v_race_id, ZETARACING, LIN, FALSE);

  -- Abdull Mazzar: BEA (T), COL (T), BOT (T) — panchina: PER
  INSERT INTO lineups (race_id, team_id, pilot_id, is_reserve) VALUES
    (v_race_id, ABDULLMAZZAR, BEA, FALSE),
    (v_race_id, ABDULLMAZZAR, COL, FALSE),
    (v_race_id, ABDULLMAZZAR, BOT, FALSE);

  -- Alpha Chiro Racing: HAD (T), OCO (T), PIA (T→DNS=0)
  INSERT INTO lineups (race_id, team_id, pilot_id, is_reserve) VALUES
    (v_race_id, ALPHACHIRO, HAD, FALSE),
    (v_race_id, ALPHACHIRO, OCO, FALSE),
    (v_race_id, ALPHACHIRO, PIA, FALSE);

  -- Ranocchiettos: RUS (T), LAW (T), HUL (T)
  INSERT INTO lineups (race_id, team_id, pilot_id, is_reserve) VALUES
    (v_race_id, RANOCCHIETTOS, RUS, FALSE),
    (v_race_id, RANOCCHIETTOS, LAW, FALSE),
    (v_race_id, RANOCCHIETTOS, HUL, FALSE);

  -- SF Fainelli: VER (T→DNF), HAM (T), GAS (T) — panchina: ALB (DNS)
  INSERT INTO lineups (race_id, team_id, pilot_id, is_reserve) VALUES
    (v_race_id, SFAINELLI, VER, FALSE),
    (v_race_id, SFAINELLI, HAM, FALSE),
    (v_race_id, SFAINELLI, GAS, FALSE);

  -- Scudemaria Ferrari: NOR (T→DNS), SAI (T), BOR (T→DNS)
  INSERT INTO lineups (race_id, team_id, pilot_id, is_reserve) VALUES
    (v_race_id, SCUDEMARIA, NOR, FALSE),
    (v_race_id, SCUDEMARIA, SAI, FALSE),
    (v_race_id, SCUDEMARIA, BOR, FALSE);

  -- ================================================================
  -- STEP 5: Ricalcola punteggi team
  -- ================================================================
  BEGIN
    PERFORM recompute_team_race_scores(v_race_id);
    RAISE NOTICE 'Team race scores ricalcolati.';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'recompute_team_race_scores non disponibile (skip): %', SQLERRM;
  END;

  RAISE NOTICE '===================================';
  RAISE NOTICE 'SCRIPT COMPLETATO CON SUCCESSO!';
  RAISE NOTICE 'Race GP Cina ID: %', v_race_id;
  RAISE NOTICE '===================================';
  RAISE NOTICE 'PUNTEGGI ATTESI (con DOTD: ANT=1° +3, HAM=2° +2):';
  RAISE NOTICE '  ZetaRacing:     ANT(25+3dotd) + LEC(18) + LIN(9+1.5) = 56.5 pts';
  RAISE NOTICE '  Ranocchiettos:  RUS(22) + LAW(14+3) + HUL(10)        = 49.0 pts';
  RAISE NOTICE '  Abdull Mazzar:  BEA(16+2.5) + BOT(8+3) + COL(11+1)  = 41.5 pts';
  RAISE NOTICE '  SF Fainelli:    HAM(20+2dotd) + GAS(15+0.5) + VER(0) = 37.5 pts';
  RAISE NOTICE '  Alpha Chiro:    HAD(13+0.5) + OCO(6) + PIA(0)        = 19.5 pts';
  RAISE NOTICE '  Scudemaria:     SAI(12+3) + NOR(0) + BOR(0)          = 15.0 pts';

END $$;

-- Verifica finale
SELECT
  p.abbreviation,
  rr.grid_position  AS grid,
  rr.position       AS pos,
  rr.overtakes,
  rr.dotd_rank,
  rr.dnf,
  rr.points_scored  AS pts
FROM race_results rr
JOIN pilots p ON rr.pilot_id = p.id
JOIN races r ON rr.race_id = r.id
JOIN calendar_events ce ON r.calendar_event_id = ce.id
WHERE ce.location = 'Cina' AND ce.is_sprint = FALSE
ORDER BY rr.position NULLS LAST, p.abbreviation;
