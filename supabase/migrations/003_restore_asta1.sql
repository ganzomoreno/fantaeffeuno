-- ============================================================
--  Migration 003 — RESTORE ASTA 1 (dati ufficiali da spreadsheet)
--
--  ZetaRacing          →  LIN 1M · LEC 54M · ANT 36M · ALO 1M  = 92M → budget 8M
--  SF–Scuderia Fainelli→  VER 46M · HAM 34M · ALB 8M · GAS 9M  = 97M → budget 3M
--  Ranocchiettos       →  RUS 68M · HUL 12M · LAW 2M            = 82M → budget 18M
--  Abdull Mazzar       →  BOT 1M  · PER 1M  · COL 1M · BEA 22M = 25M → budget 75M
--  Alpha Chiro Racing  →  OCO 6M  · HAD 17M · PIA 51M           = 74M → budget 26M
--  Scudemaria Ferrari  →  SAI 5M  · BOR 10M · NOR 41M           = 56M → budget 44M
--  Pilota libero: STR (Lance Stroll)
-- ============================================================

-- 0. Reset pulito
UPDATE pilots SET owner_team_id = NULL, purchase_price = 0;
UPDATE teams  SET budget = 100, switches_used = 0;

-- 1. ZETARACING (budget residuo: 8M)
UPDATE pilots SET owner_team_id = (SELECT id FROM teams WHERE name = 'ZetaRacing'), purchase_price = 1  WHERE name = 'Arvid Lindblad';
UPDATE pilots SET owner_team_id = (SELECT id FROM teams WHERE name = 'ZetaRacing'), purchase_price = 54 WHERE name = 'Charles Leclerc';
UPDATE pilots SET owner_team_id = (SELECT id FROM teams WHERE name = 'ZetaRacing'), purchase_price = 36 WHERE name = 'Andrea Kimi Antonelli';
UPDATE pilots SET owner_team_id = (SELECT id FROM teams WHERE name = 'ZetaRacing'), purchase_price = 1  WHERE name = 'Fernando Alonso';
UPDATE teams SET budget = 8 WHERE name = 'ZetaRacing';

-- 2. SF – SCUDERIA FAINELLI (budget residuo: 3M)
UPDATE pilots SET owner_team_id = (SELECT id FROM teams WHERE name = 'SF – Scuderia Fainelli'), purchase_price = 46 WHERE name = 'Max Verstappen';
UPDATE pilots SET owner_team_id = (SELECT id FROM teams WHERE name = 'SF – Scuderia Fainelli'), purchase_price = 34 WHERE name = 'Lewis Hamilton';
UPDATE pilots SET owner_team_id = (SELECT id FROM teams WHERE name = 'SF – Scuderia Fainelli'), purchase_price = 8  WHERE name = 'Alexander Albon';
UPDATE pilots SET owner_team_id = (SELECT id FROM teams WHERE name = 'SF – Scuderia Fainelli'), purchase_price = 9  WHERE name = 'Pierre Gasly';
UPDATE teams SET budget = 3 WHERE name = 'SF – Scuderia Fainelli';

-- 3. RANOCCHIETTOS (budget residuo: 18M)
UPDATE pilots SET owner_team_id = (SELECT id FROM teams WHERE name = 'Ranocchiettos'), purchase_price = 68 WHERE name = 'George Russell';
UPDATE pilots SET owner_team_id = (SELECT id FROM teams WHERE name = 'Ranocchiettos'), purchase_price = 12 WHERE name = 'Nico Hülkenberg';
UPDATE pilots SET owner_team_id = (SELECT id FROM teams WHERE name = 'Ranocchiettos'), purchase_price = 2  WHERE name = 'Liam Lawson';
UPDATE teams SET budget = 18 WHERE name = 'Ranocchiettos';

-- 4. ABDULL MAZZAR (budget residuo: 75M)
UPDATE pilots SET owner_team_id = (SELECT id FROM teams WHERE name = 'Abdull Mazzar'), purchase_price = 1  WHERE name = 'Valtteri Bottas';
UPDATE pilots SET owner_team_id = (SELECT id FROM teams WHERE name = 'Abdull Mazzar'), purchase_price = 1  WHERE name = 'Sergio Pérez';
UPDATE pilots SET owner_team_id = (SELECT id FROM teams WHERE name = 'Abdull Mazzar'), purchase_price = 1  WHERE name = 'Franco Colapinto';
UPDATE pilots SET owner_team_id = (SELECT id FROM teams WHERE name = 'Abdull Mazzar'), purchase_price = 22 WHERE name = 'Oliver Bearman';
UPDATE teams SET budget = 75 WHERE name = 'Abdull Mazzar';

-- 5. ALPHA CHIRO RACING (budget residuo: 26M)
UPDATE pilots SET owner_team_id = (SELECT id FROM teams WHERE name = 'Alpha Chiro Racing'), purchase_price = 6  WHERE name = 'Esteban Ocon';
UPDATE pilots SET owner_team_id = (SELECT id FROM teams WHERE name = 'Alpha Chiro Racing'), purchase_price = 17 WHERE name = 'Isack Hadjar';
UPDATE pilots SET owner_team_id = (SELECT id FROM teams WHERE name = 'Alpha Chiro Racing'), purchase_price = 51 WHERE name = 'Oscar Piastri';
UPDATE teams SET budget = 26 WHERE name = 'Alpha Chiro Racing';

-- 6. SCUDEMARIA FERRARI (budget residuo: 44M)
UPDATE pilots SET owner_team_id = (SELECT id FROM teams WHERE name = 'Scudemaria Ferrari'), purchase_price = 5  WHERE name = 'Carlos Sainz';
UPDATE pilots SET owner_team_id = (SELECT id FROM teams WHERE name = 'Scudemaria Ferrari'), purchase_price = 10 WHERE name = 'Gabriel Bortoleto';
UPDATE pilots SET owner_team_id = (SELECT id FROM teams WHERE name = 'Scudemaria Ferrari'), purchase_price = 41 WHERE name = 'Lando Norris';
UPDATE teams SET budget = 44 WHERE name = 'Scudemaria Ferrari';

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
