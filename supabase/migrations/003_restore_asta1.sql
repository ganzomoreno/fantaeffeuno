-- ============================================================
--  Migration 003 — RESTORE ASTA 1 (dati ufficiali)
--  Ricostruito dai dati visibili nell'app prima del reset.
--
--  ROSA DEFINITIVA POST-ASTA 1:
--
--  ZetaRacing          →  LEC 54M · ANT 36M · LIN 1M     = budget 9M
--  Scudemaria Ferrari  →  NOR 41M · SAI 5M  · BOR 10M    = budget 44M
--  Alpha Chiro Racing  →  PIA 51M · HAD 17M · OCO 6M     = budget 26M
--  Ranocchiettos       →  RUS 68M · HUL 12M · LAW 2M     = budget 18M
--  SF–Scuderia Fainelli→  VER 46M · HAM 34M · ALB 8M     = budget 12M
--  Abdull Mazzar       →  COL 1M  · PER 1M  · BOT 1M     = budget 97M
--
--  Piloti liberi (4): ALO, STR, GAS, BEA
-- ============================================================

-- ─── 0. Reset pulito (per sicurezza) ─────────────────────────────────────────
UPDATE pilots SET owner_team_id = NULL, purchase_price = 0;
UPDATE teams  SET budget = 100, switches_used = 0;

-- ─── 1. ZETARACING ────────────────────────────────────────────────────────────
UPDATE pilots SET
  owner_team_id  = (SELECT id FROM teams WHERE name = 'ZetaRacing'),
  purchase_price = 54
WHERE abbreviation = 'LEC';

UPDATE pilots SET
  owner_team_id  = (SELECT id FROM teams WHERE name = 'ZetaRacing'),
  purchase_price = 36
WHERE abbreviation = 'ANT';

UPDATE pilots SET
  owner_team_id  = (SELECT id FROM teams WHERE name = 'ZetaRacing'),
  purchase_price = 1
WHERE abbreviation = 'LIN';

UPDATE teams SET budget = 9 WHERE name = 'ZetaRacing';

-- ─── 2. SCUDEMARIA FERRARI ────────────────────────────────────────────────────
UPDATE pilots SET
  owner_team_id  = (SELECT id FROM teams WHERE name = 'Scudemaria Ferrari'),
  purchase_price = 41
WHERE abbreviation = 'NOR';

UPDATE pilots SET
  owner_team_id  = (SELECT id FROM teams WHERE name = 'Scudemaria Ferrari'),
  purchase_price = 5
WHERE abbreviation = 'SAI';

UPDATE pilots SET
  owner_team_id  = (SELECT id FROM teams WHERE name = 'Scudemaria Ferrari'),
  purchase_price = 10
WHERE abbreviation = 'BOR';

UPDATE teams SET budget = 44 WHERE name = 'Scudemaria Ferrari';

-- ─── 3. ALPHA CHIRO RACING ────────────────────────────────────────────────────
UPDATE pilots SET
  owner_team_id  = (SELECT id FROM teams WHERE name = 'Alpha Chiro Racing'),
  purchase_price = 51
WHERE abbreviation = 'PIA';

UPDATE pilots SET
  owner_team_id  = (SELECT id FROM teams WHERE name = 'Alpha Chiro Racing'),
  purchase_price = 17
WHERE abbreviation = 'HAD';

UPDATE pilots SET
  owner_team_id  = (SELECT id FROM teams WHERE name = 'Alpha Chiro Racing'),
  purchase_price = 6
WHERE abbreviation = 'OCO';

UPDATE teams SET budget = 26 WHERE name = 'Alpha Chiro Racing';

-- ─── 4. RANOCCHIETTOS ────────────────────────────────────────────────────────
UPDATE pilots SET
  owner_team_id  = (SELECT id FROM teams WHERE name = 'Ranocchiettos'),
  purchase_price = 68
WHERE abbreviation = 'RUS';

UPDATE pilots SET
  owner_team_id  = (SELECT id FROM teams WHERE name = 'Ranocchiettos'),
  purchase_price = 12
WHERE abbreviation = 'HUL';

UPDATE pilots SET
  owner_team_id  = (SELECT id FROM teams WHERE name = 'Ranocchiettos'),
  purchase_price = 2
WHERE abbreviation = 'LAW';

UPDATE teams SET budget = 18 WHERE name = 'Ranocchiettos';

-- ─── 5. SF – SCUDERIA FAINELLI ───────────────────────────────────────────────
UPDATE pilots SET
  owner_team_id  = (SELECT id FROM teams WHERE name = 'SF – Scuderia Fainelli'),
  purchase_price = 46
WHERE abbreviation = 'VER';

UPDATE pilots SET
  owner_team_id  = (SELECT id FROM teams WHERE name = 'SF – Scuderia Fainelli'),
  purchase_price = 34
WHERE abbreviation = 'HAM';

UPDATE pilots SET
  owner_team_id  = (SELECT id FROM teams WHERE name = 'SF – Scuderia Fainelli'),
  purchase_price = 8
WHERE abbreviation = 'ALB';

UPDATE teams SET budget = 12 WHERE name = 'SF – Scuderia Fainelli';

-- ─── 6. ABDULL MAZZAR ────────────────────────────────────────────────────────
UPDATE pilots SET
  owner_team_id  = (SELECT id FROM teams WHERE name = 'Abdull Mazzar'),
  purchase_price = 1
WHERE abbreviation = 'COL';

UPDATE pilots SET
  owner_team_id  = (SELECT id FROM teams WHERE name = 'Abdull Mazzar'),
  purchase_price = 1
WHERE abbreviation = 'PER';

UPDATE pilots SET
  owner_team_id  = (SELECT id FROM teams WHERE name = 'Abdull Mazzar'),
  purchase_price = 1
WHERE abbreviation = 'BOT';

UPDATE teams SET budget = 97 WHERE name = 'Abdull Mazzar';

-- ─── VERIFICA ─────────────────────────────────────────────────────────────────
SELECT
  t.name                                      AS squadra,
  t.budget                                    AS budget_residuo,
  COUNT(p.id)                                 AS n_piloti,
  STRING_AGG(p.abbreviation || ' ' || p.purchase_price::TEXT || 'M', ' · ' ORDER BY p.purchase_price DESC) AS rosa
FROM teams t
LEFT JOIN pilots p ON p.owner_team_id = t.id
GROUP BY t.id, t.name, t.budget
ORDER BY t.budget DESC;
