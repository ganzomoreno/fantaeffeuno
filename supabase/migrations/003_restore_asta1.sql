-- ============================================================
--  Migration 003 — RESTORE ASTA 1 (dati ufficiali)
--
--  ZetaRacing          →  LEC 54M · ANT 36M · LIN 1M     = budget 9M
--  Scudemaria Ferrari  →  NOR 41M · SAI 5M  · BOR 10M    = budget 44M
--  Alpha Chiro Racing  →  PIA 51M · HAD 17M · OCO 6M     = budget 26M
--  Ranocchiettos       →  RUS 68M · HUL 12M · LAW 2M     = budget 18M
--  SF–Scuderia Fainelli→  VER 46M · HAM 34M · ALB 8M     = budget 12M
--  Abdull Mazzar       →  COL 1M  · PER 1M  · BOT 1M     = budget 97M
--  Piloti liberi: ALO, STR, GAS, BEA
-- ============================================================

-- 0. Reset pulito
UPDATE pilots SET owner_team_id = NULL, purchase_price = 0;
UPDATE teams  SET budget = 100, switches_used = 0;

-- 1. ZETARACING
UPDATE pilots SET owner_team_id = (SELECT id FROM teams WHERE name = 'ZetaRacing'), purchase_price = 54 WHERE name = 'Charles Leclerc';
UPDATE pilots SET owner_team_id = (SELECT id FROM teams WHERE name = 'ZetaRacing'), purchase_price = 36 WHERE name = 'Andrea Kimi Antonelli';
UPDATE pilots SET owner_team_id = (SELECT id FROM teams WHERE name = 'ZetaRacing'), purchase_price = 1  WHERE name = 'Arvid Lindblad';
UPDATE teams SET budget = 9 WHERE name = 'ZetaRacing';

-- 2. SCUDEMARIA FERRARI
UPDATE pilots SET owner_team_id = (SELECT id FROM teams WHERE name = 'Scudemaria Ferrari'), purchase_price = 41 WHERE name = 'Lando Norris';
UPDATE pilots SET owner_team_id = (SELECT id FROM teams WHERE name = 'Scudemaria Ferrari'), purchase_price = 5  WHERE name = 'Carlos Sainz';
UPDATE pilots SET owner_team_id = (SELECT id FROM teams WHERE name = 'Scudemaria Ferrari'), purchase_price = 10 WHERE name = 'Gabriel Bortoleto';
UPDATE teams SET budget = 44 WHERE name = 'Scudemaria Ferrari';

-- 3. ALPHA CHIRO RACING
UPDATE pilots SET owner_team_id = (SELECT id FROM teams WHERE name = 'Alpha Chiro Racing'), purchase_price = 51 WHERE name = 'Oscar Piastri';
UPDATE pilots SET owner_team_id = (SELECT id FROM teams WHERE name = 'Alpha Chiro Racing'), purchase_price = 17 WHERE name = 'Isack Hadjar';
UPDATE pilots SET owner_team_id = (SELECT id FROM teams WHERE name = 'Alpha Chiro Racing'), purchase_price = 6  WHERE name = 'Esteban Ocon';
UPDATE teams SET budget = 26 WHERE name = 'Alpha Chiro Racing';

-- 4. RANOCCHIETTOS
UPDATE pilots SET owner_team_id = (SELECT id FROM teams WHERE name = 'Ranocchiettos'), purchase_price = 68 WHERE name = 'George Russell';
UPDATE pilots SET owner_team_id = (SELECT id FROM teams WHERE name = 'Ranocchiettos'), purchase_price = 12 WHERE name = 'Nico Hülkenberg';
UPDATE pilots SET owner_team_id = (SELECT id FROM teams WHERE name = 'Ranocchiettos'), purchase_price = 2  WHERE name = 'Liam Lawson';
UPDATE teams SET budget = 18 WHERE name = 'Ranocchiettos';

-- 5. SF – SCUDERIA FAINELLI
UPDATE pilots SET owner_team_id = (SELECT id FROM teams WHERE name = 'SF – Scuderia Fainelli'), purchase_price = 46 WHERE name = 'Max Verstappen';
UPDATE pilots SET owner_team_id = (SELECT id FROM teams WHERE name = 'SF – Scuderia Fainelli'), purchase_price = 34 WHERE name = 'Lewis Hamilton';
UPDATE pilots SET owner_team_id = (SELECT id FROM teams WHERE name = 'SF – Scuderia Fainelli'), purchase_price = 8  WHERE name = 'Alexander Albon';
UPDATE teams SET budget = 12 WHERE name = 'SF – Scuderia Fainelli';

-- 6. ABDULL MAZZAR
UPDATE pilots SET owner_team_id = (SELECT id FROM teams WHERE name = 'Abdull Mazzar'), purchase_price = 1 WHERE name = 'Franco Colapinto';
UPDATE pilots SET owner_team_id = (SELECT id FROM teams WHERE name = 'Abdull Mazzar'), purchase_price = 1 WHERE name = 'Sergio Pérez';
UPDATE pilots SET owner_team_id = (SELECT id FROM teams WHERE name = 'Abdull Mazzar'), purchase_price = 1 WHERE name = 'Valtteri Bottas';
UPDATE teams SET budget = 97 WHERE name = 'Abdull Mazzar';

-- VERIFICA
SELECT
  t.name AS squadra,
  t.budget AS budget_residuo,
  COUNT(p.id) AS n_piloti,
  STRING_AGG(p.name || ' ' || p.purchase_price::TEXT || 'M', ' · ' ORDER BY p.purchase_price DESC) AS rosa
FROM teams t
LEFT JOIN pilots p ON p.owner_team_id = t.id
GROUP BY t.id, t.name, t.budget
ORDER BY t.budget DESC;
