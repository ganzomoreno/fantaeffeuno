-- ============================================================
-- SPRINT RACE CINA 2026 — Risultati + Formazioni
-- Da eseguire nell'SQL Editor di Supabase
-- ============================================================
-- Fonte risultati: Formula1.com / PlanetF1 / The-Race (14/03/2026)
-- Classifica Sprint:
--  P1 RUS (8pt) | P2 LEC (7pt) | P3 HAM (6pt) | P4 NOR (5pt)
--  P5 ANT (4pt) | P6 PIA (3pt) | P7 LAW (2pt) | P8 BEA (1pt)
--  P9+ = 0pt. Niente bonus (regola Sprint).
--  HUL: DNF (ha causato Safety Car)
-- ============================================================

-- STEP 1: Crea/Recupera il calendar_event per la Sprint Cina
-- (sort_order 1 = Cina Sprint, come da migrazione 20260314000002)
-- Se non hai ancora eseguito 20260314000002, la sprint non esiste:
-- in quel caso usa direttamente sort_order=0 (Australia) con is_sprint=true
-- oppure esegui prima lo script 20260314000002.

-- Per sicurezza, usiamo una funzione per trovare il sort_order Cina Sprint
DO $$
DECLARE
  v_cal_event_id  UUID;
  v_race_id       UUID;

  -- Piloti (da backup)
  RUS UUID := '122c3cb3-8cd9-4a05-a338-11d04bb4ed4f';
  LEC UUID := '9b4dbed8-7bb1-4ab8-804c-856a85c068a6';
  HAM UUID := '49f08caa-45a8-4caa-ae6a-4a051319fbc0';
  NOR UUID := 'a38bd3af-cb5a-4711-a7f2-93f6c5254fcd';
  ANT UUID := '5c174c52-94b3-4e4a-b02c-7766e5f869be';
  PIA UUID := 'e5a8a166-220d-4fed-bcde-d98a7c49d380';
  LAW UUID := '10d3d199-0da3-4c7b-bd34-2d79f991929f';
  BEA UUID := '39059fd0-87a5-43c6-be25-db3016925291';
  VER UUID := 'a13c41e1-9a48-4918-8e70-42830d0906aa';
  HUL UUID := 'cd3ac1ea-ed24-4bc0-8504-da3b5620901a';
  GAS UUID := '1a2b0ef6-a966-4ef7-b800-a0c55d358e36';
  SAI UUID := '3f430732-59be-4606-a308-31da305d96b0';
  BOR UUID := '78f81f97-e152-4636-9bf4-03695002bacb';
  COL UUID := '11529f53-0826-49e7-bf3f-74e98f5a05a7';
  BOT UUID := '0556d919-d8d4-4f68-9d73-ab094c03462a';
  HAD UUID := 'f01a3ef7-6121-4fd5-b858-030da09605e2';
  OCO UUID := '347a271f-e95a-44cb-8860-4a1f2b2cd8d1';
  LIN UUID := 'f945a18b-0d3d-47fb-95db-bd489838a505';

  -- Team IDs (da backup)
  ZETARACING       UUID := 'fe291964-2daf-407e-aa7f-e5aeb21acba2';
  ABDULLMAZZAR     UUID := 'fbffdb1c-1e87-473f-9132-5e2009233795';
  ALPHACHIRO       UUID := '3034f5d6-aa87-41df-af5c-975d463fe8b0';
  RANOCCHIETTOS    UUID := '16bd7ed4-06e0-462a-bfd0-be084e8d7e75';
  SFAINELLI        UUID := 'f7bfa2d5-9896-4dee-ac87-ff801a91e71f';
  SCUDEMARIA       UUID := '05086247-5ec5-4adf-8845-63262ecc9838';

BEGIN

  -- ==========================================================
  -- STEP 1: Trova calendar_event Sprint Cina 2026
  -- La Sprint Cina ha location='Cina' e is_sprint=true
  -- ==========================================================
  SELECT id INTO v_cal_event_id
  FROM calendar_events
  WHERE location = 'Cina' AND is_sprint = TRUE
  LIMIT 1;

  IF v_cal_event_id IS NULL THEN
    RAISE EXCEPTION 'Calendar event Sprint Cina non trovato! Esegui prima 20260314000002_add_sprints.sql';
  END IF;

  RAISE NOTICE 'Calendar Event Sprint Cina: %', v_cal_event_id;

  -- ==========================================================
  -- STEP 2: Crea o recupera la Race per questo evento
  -- ==========================================================
  SELECT id INTO v_race_id FROM races WHERE calendar_event_id = v_cal_event_id;

  IF v_race_id IS NULL THEN
    INSERT INTO races (calendar_event_id, is_sprint)
    VALUES (v_cal_event_id, TRUE)
    RETURNING id INTO v_race_id;
    RAISE NOTICE 'Race creata: %', v_race_id;
  ELSE
    -- Aggiorna is_sprint se non lo era già
    UPDATE races SET is_sprint = TRUE WHERE id = v_race_id;
    RAISE NOTICE 'Race esistente: %', v_race_id;
  END IF;

  -- ==========================================================
  -- STEP 3: Inserisce i risultati Sprint (pulisce prima)
  -- Regola: niente overtakes, niente dotd_rank, is_sprint→no bonus
  -- ==========================================================
  DELETE FROM race_results WHERE race_id = v_race_id;

  INSERT INTO race_results (race_id, pilot_id, position, grid_position, overtakes, dotd_rank, dnf) VALUES
    -- TOP 8 con punti
    (v_race_id, RUS, 1,  1,  0, NULL, FALSE),  -- 8 pts
    (v_race_id, LEC, 2,  3,  0, NULL, FALSE),  -- 7 pts
    (v_race_id, HAM, 3,  4,  0, NULL, FALSE),  -- 6 pts
    (v_race_id, NOR, 4,  2,  0, NULL, FALSE),  -- 5 pts
    (v_race_id, ANT, 5,  5,  0, NULL, FALSE),  -- 4 pts (penalità 10s ma P5 finale)
    (v_race_id, PIA, 6,  7,  0, NULL, FALSE),  -- 3 pts
    (v_race_id, LAW, 7,  6,  0, NULL, FALSE),  -- 2 pts
    (v_race_id, BEA, 8,  9,  0, NULL, FALSE),  -- 1 pt
    -- Da P9 in poi: 0 punti
    (v_race_id, VER, 9,  8,  0, NULL, FALSE),  -- 0 pts
    (v_race_id, GAS, 11, 11, 0, NULL, FALSE),  -- 0 pts
    (v_race_id, SAI, 12, 12, 0, NULL, FALSE),  -- 0 pts
    (v_race_id, BOR, 13, 13, 0, NULL, FALSE),  -- 0 pts
    (v_race_id, HAD, 15, 10, 0, NULL, FALSE),  -- 0 pts
    (v_race_id, COL, 17, 17, 0, NULL, FALSE),  -- 0 pts
    (v_race_id, BOT, 18, 18, 0, NULL, FALSE),  -- 0 pts
    (v_race_id, OCO, 10, 16, 0, NULL, FALSE),  -- 0 pts
    -- HUL: DNF (ha causato il SC)
    (v_race_id, HUL, NULL, 14, 0, NULL, TRUE); -- 0 pts (DNF)
    -- LIN e altri non inseriti = 0 pts di default

  RAISE NOTICE 'Risultati Sprint inseriti: 17 piloti';

  -- ==========================================================
  -- STEP 4: Inserisce le formazioni (lineups) dei 6 team
  -- ==========================================================
  -- Pulisce eventuali lineup precedenti per questa race
  DELETE FROM lineups WHERE race_id = v_race_id;

  -- ZetaRacing: LEC (titolare), ANT (titolare), LIN (titolare)
  -- Panchina: nessuna (solo 3 piloti in rosa = tutti titolari, no bench)
  INSERT INTO lineups (race_id, team_id, pilot_id, is_reserve, subbed_in_manually, subbed_out_for) VALUES
    (v_race_id, ZETARACING, LEC, FALSE, FALSE, NULL),
    (v_race_id, ZETARACING, ANT, FALSE, FALSE, NULL),
    (v_race_id, ZETARACING, LIN, FALSE, FALSE, NULL);

  -- Abdull Mazzar: BEA (T), COL (T), BOT (T)
  -- Panchina: PER (non in formazione, auto-panchina)
  INSERT INTO lineups (race_id, team_id, pilot_id, is_reserve, subbed_in_manually, subbed_out_for) VALUES
    (v_race_id, ABDULLMAZZAR, BEA, FALSE, FALSE, NULL),
    (v_race_id, ABDULLMAZZAR, COL, FALSE, FALSE, NULL),
    (v_race_id, ABDULLMAZZAR, BOT, FALSE, FALSE, NULL);

  -- Alpha Chiro Racing: HAD (T), OCO (T), PIA (T)
  -- Panchina: nessuna esplicita (solo 3 piloti)
  INSERT INTO lineups (race_id, team_id, pilot_id, is_reserve, subbed_in_manually, subbed_out_for) VALUES
    (v_race_id, ALPHACHIRO, HAD, FALSE, FALSE, NULL),
    (v_race_id, ALPHACHIRO, OCO, FALSE, FALSE, NULL),
    (v_race_id, ALPHACHIRO, PIA, FALSE, FALSE, NULL);

  -- Ranocchiettos: RUS (T), LAW (T), HUL (T)
  -- HUL DNF → panchina auto se esiste; qui inseriamo solo i 3 titolari dichiarati
  INSERT INTO lineups (race_id, team_id, pilot_id, is_reserve, subbed_in_manually, subbed_out_for) VALUES
    (v_race_id, RANOCCHIETTOS, RUS, FALSE, FALSE, NULL),
    (v_race_id, RANOCCHIETTOS, LAW, FALSE, FALSE, NULL),
    (v_race_id, RANOCCHIETTOS, HUL, FALSE, FALSE, NULL);

  -- SF Scuderia Fainelli: VER (T), HAM (T), GAS (T)
  -- Panchina: ALB (4° pilota della rosa)
  INSERT INTO lineups (race_id, team_id, pilot_id, is_reserve, subbed_in_manually, subbed_out_for) VALUES
    (v_race_id, SFAINELLI, VER, FALSE, FALSE, NULL),
    (v_race_id, SFAINELLI, HAM, FALSE, FALSE, NULL),
    (v_race_id, SFAINELLI, GAS, FALSE, FALSE, NULL);

  -- Scudemaria Ferrari: NOR (T), SAI (T), BOR (T)
  INSERT INTO lineups (race_id, team_id, pilot_id, is_reserve, subbed_in_manually, subbed_out_for) VALUES
    (v_race_id, SCUDEMARIA, NOR, FALSE, FALSE, NULL),
    (v_race_id, SCUDEMARIA, SAI, FALSE, FALSE, NULL),
    (v_race_id, SCUDEMARIA, BOR, FALSE, FALSE, NULL);

  RAISE NOTICE '===================================';
  RAISE NOTICE 'SCRIPT COMPLETATO CON SUCCESSO!';
  RAISE NOTICE 'Race Sprint Cina ID: %', v_race_id;
  RAISE NOTICE '===================================';
  RAISE NOTICE 'PUNTEGGI ATTESI (regola Sprint, no bonus):';
  RAISE NOTICE '  ZetaRacing:      LEC(7) + ANT(4) + LIN(0) = 11 pts';
  RAISE NOTICE '  Abdull Mazzar:   BEA(1) + COL(0) + BOT(0) = 1 pt';
  RAISE NOTICE '  Alpha Chiro:     HAD(0) + OCO(0) + PIA(3) = 3 pts';
  RAISE NOTICE '  Ranocchiettos:   RUS(8) + LAW(2) + HUL(0) = 10 pts';
  RAISE NOTICE '  SF Fainelli:     VER(0) + HAM(6) + GAS(0) = 6 pts';
  RAISE NOTICE '  Scudemaria:      NOR(5) + SAI(0) + BOR(0) = 5 pts';

END $$;
