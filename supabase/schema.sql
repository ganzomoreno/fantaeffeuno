-- ============================================================
--  FANTAFORMULA1 2026 — Supabase Schema
--  Progetto: qpchuuqwknldqejwxtaz
--  Incolla questo file nell'SQL Editor di Supabase ed esegui
-- ============================================================


-- ─── EXTENSIONS ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ─── ENUMS ───────────────────────────────────────────────────────────────────
CREATE TYPE event_type    AS ENUM ('race', 'sprint', 'auction');
CREATE TYPE switch_reason AS ENUM ('voluntary', 'dnf', 'injury');


-- ═══════════════════════════════════════════════════════════════
--  TABELLE PRINCIPALI
-- ═══════════════════════════════════════════════════════════════

-- ─── TEAMS (Squadre Fanta) ────────────────────────────────────────────────────
CREATE TABLE teams (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT        NOT NULL,
  owner_name     TEXT        NOT NULL,
  budget         INTEGER     NOT NULL DEFAULT 100 CHECK (budget >= 0),
  switches_used  INTEGER     NOT NULL DEFAULT 0
                             CHECK (switches_used >= 0 AND switches_used <= 5),
  is_admin       BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE teams IS '6 squadre fanta dei partecipanti';
COMMENT ON COLUMN teams.budget         IS 'FantaMilioni residui';
COMMENT ON COLUMN teams.switches_used  IS 'Switch usati (max 5 a stagione)';


-- ─── PILOTS (Piloti F1) ──────────────────────────────────────────────────────
CREATE TABLE pilots (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT        NOT NULL,
  f1_team         TEXT        NOT NULL,
  owner_team_id   UUID        REFERENCES teams(id) ON DELETE SET NULL,
  purchase_price  INTEGER     NOT NULL DEFAULT 0 CHECK (purchase_price >= 0),
  is_injured      BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE pilots IS '22 piloti della griglia F1 2026';
COMMENT ON COLUMN pilots.owner_team_id  IS 'NULL = pilota libero (non ancora acquistato)';
COMMENT ON COLUMN pilots.purchase_price IS 'Prezzo pagato in FantaMilioni durante l''asta';


-- ─── CALENDAR EVENTS (Calendario) ────────────────────────────────────────────
CREATE TABLE calendar_events (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  sort_order   INTEGER     NOT NULL UNIQUE,   -- mantiene l'ordine originale (0-34)
  event_date   DATE        NOT NULL,
  event_type   event_type  NOT NULL,
  location     TEXT        NOT NULL,
  round_number INTEGER,                       -- solo per gare (1-24)
  is_sprint    BOOLEAN     NOT NULL DEFAULT FALSE,
  is_completed BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN calendar_events.sort_order   IS 'Indice originale array JS (0-based)';
COMMENT ON COLUMN calendar_events.round_number IS 'Numero round stagione (solo gare)';


-- ─── RACES (Gare completate) ─────────────────────────────────────────────────
-- Una riga per ogni gara i cui risultati sono stati inseriti dall'admin.
CREATE TABLE races (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_event_id  UUID        NOT NULL UNIQUE
                                 REFERENCES calendar_events(id) ON DELETE CASCADE,
  is_sprint          BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─── RACE RESULTS (Risultati per pilota) ─────────────────────────────────────
CREATE TABLE race_results (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  race_id       UUID        NOT NULL REFERENCES races(id) ON DELETE CASCADE,
  pilot_id      UUID        NOT NULL REFERENCES pilots(id) ON DELETE CASCADE,

  -- Dati gara
  position      INTEGER     CHECK (position BETWEEN 1 AND 22),
  overtakes     INTEGER     NOT NULL DEFAULT 0 CHECK (overtakes >= 0),
  fastest_lap   BOOLEAN     NOT NULL DEFAULT FALSE,
  dotd_rank     INTEGER     CHECK (dotd_rank BETWEEN 1 AND 3),  -- Driver of the Day (1°/2°/3°)
  dnf           BOOLEAN     NOT NULL DEFAULT FALSE,

  -- Punti calcolati automaticamente dal trigger
  points_scored NUMERIC(6,2) NOT NULL DEFAULT 0,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(race_id, pilot_id)
);

COMMENT ON COLUMN race_results.dotd_rank     IS '1=+3pt, 2=+2pt, 3=+1pt';
COMMENT ON COLUMN race_results.points_scored IS 'Calcolato automaticamente da trigger';


-- ─── LINEUPS (Formazioni per gara) ───────────────────────────────────────────
CREATE TABLE lineups (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  race_id     UUID        NOT NULL REFERENCES races(id) ON DELETE CASCADE,
  team_id     UUID        NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  pilot_id    UUID        NOT NULL REFERENCES pilots(id) ON DELETE CASCADE,
  is_reserve  BOOLEAN     NOT NULL DEFAULT FALSE,  -- TRUE = panchinaro
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(race_id, team_id, pilot_id)
);

COMMENT ON COLUMN lineups.is_reserve IS 'TRUE = 4° pilota in panchina, non conta per i punti';


-- ─── AUCTIONS (Sessioni d'asta) ───────────────────────────────────────────────
CREATE TABLE auctions (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_event_id  UUID        NOT NULL UNIQUE
                                 REFERENCES calendar_events(id) ON DELETE CASCADE,
  auction_number     INTEGER     NOT NULL,           -- 1ª asta, 2ª asta...
  budget_added       INTEGER     NOT NULL DEFAULT 100, -- FM aggiunti a ogni team
  is_completed       BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN auctions.budget_added IS 'FantaMilioni aggiunti al budget di ogni squadra all''inizio dell''asta';


-- ─── AUCTION LOTS (Singoli acquisti d'asta) ──────────────────────────────────
CREATE TABLE auction_lots (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id       UUID        NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  pilot_id         UUID        NOT NULL REFERENCES pilots(id) ON DELETE CASCADE,
  winner_team_id   UUID        REFERENCES teams(id) ON DELETE SET NULL,
  final_price      INTEGER     CHECK (final_price >= 1),
  lot_order        INTEGER     NOT NULL,  -- ordine di chiamata in asta
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(auction_id, pilot_id)
);

COMMENT ON COLUMN auction_lots.lot_order IS 'Ordine in cui il pilota è stato messo all''asta';


-- ─── SWITCHES (Cambi pilota) ─────────────────────────────────────────────────
CREATE TABLE switches (
  id                      UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id                 UUID          NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  out_pilot_id            UUID          NOT NULL REFERENCES pilots(id) ON DELETE CASCADE,
  in_pilot_id             UUID          NOT NULL REFERENCES pilots(id) ON DELETE CASCADE,
  effective_from_race_id  UUID          REFERENCES races(id) ON DELETE SET NULL,
  is_free                 BOOLEAN       NOT NULL DEFAULT FALSE,
  reason                  switch_reason NOT NULL DEFAULT 'voluntary',
  created_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN switches.is_free IS 'TRUE = switch gratuito (DNF o infortunio), non scala dal contatore';
COMMENT ON COLUMN switches.reason  IS 'voluntary | dnf | injury';


-- ─── TEAM RACE SCORES (Cache punteggi per gara) ──────────────────────────────
-- Aggiornata dal trigger dopo ogni insert/update su race_results o lineups.
CREATE TABLE team_race_scores (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id     UUID         NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  race_id     UUID         NOT NULL REFERENCES races(id) ON DELETE CASCADE,
  points      NUMERIC(8,2) NOT NULL DEFAULT 0,
  penalty     NUMERIC(4,2) NOT NULL DEFAULT 0,  -- penalità mancato schieramento
  net_points  NUMERIC(8,2) GENERATED ALWAYS AS (points - penalty) STORED,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  UNIQUE(team_id, race_id)
);

COMMENT ON COLUMN team_race_scores.penalty    IS '5pt gara / 2pt sprint per mancato schieramento';
COMMENT ON COLUMN team_race_scores.net_points IS 'Colonna calcolata: points - penalty';


-- ═══════════════════════════════════════════════════════════════
--  FUNZIONI & TRIGGER
-- ═══════════════════════════════════════════════════════════════

-- ─── FUNZIONE: calcola punti pilota (replica scoring.js) ─────────────────────
CREATE OR REPLACE FUNCTION compute_pilot_points(
  p_position    INTEGER,
  p_overtakes   INTEGER,
  p_fastest_lap BOOLEAN,
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

  -- Bonus sorpassi: +0.5 per sorpasso, cap a 3 punti (6 sorpassi)
  IF p_overtakes > 0 THEN
    v_pts := v_pts + LEAST(p_overtakes * 0.5, 3.0);
  END IF;

  -- Giro veloce: +1
  IF p_fastest_lap THEN
    v_pts := v_pts + 1;
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


-- ─── TRIGGER: auto-calcola points_scored su race_results ─────────────────────
CREATE OR REPLACE FUNCTION trg_set_race_result_points()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.points_scored := compute_pilot_points(
    NEW.position,
    NEW.overtakes,
    NEW.fastest_lap,
    NEW.dotd_rank,
    NEW.dnf
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_race_result_points
  BEFORE INSERT OR UPDATE ON race_results
  FOR EACH ROW
  EXECUTE FUNCTION trg_set_race_result_points();


-- ─── FUNZIONE: ricalcola team_race_scores per una gara ───────────────────────
CREATE OR REPLACE FUNCTION recompute_team_race_scores(p_race_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_team       RECORD;
  v_pts        NUMERIC(8,2);
  v_is_sprint  BOOLEAN;
  v_penalty    NUMERIC(4,2);
  v_has_lineup BOOLEAN;
BEGIN
  -- Controlla se è una sprint race
  SELECT is_sprint INTO v_is_sprint FROM races WHERE id = p_race_id;

  -- Per ogni squadra
  FOR v_team IN SELECT id FROM teams LOOP

    -- Somma punti dei piloti in formazione (non panchinari)
    SELECT COALESCE(SUM(rr.points_scored), 0)
    INTO v_pts
    FROM lineups l
    JOIN race_results rr
      ON rr.race_id  = l.race_id
     AND rr.pilot_id = l.pilot_id
    WHERE l.race_id   = p_race_id
      AND l.team_id   = v_team.id
      AND l.is_reserve = FALSE;

    -- Penalità mancato schieramento
    SELECT EXISTS (
      SELECT 1 FROM lineups
      WHERE race_id = p_race_id AND team_id = v_team.id AND is_reserve = FALSE
    ) INTO v_has_lineup;

    v_penalty := CASE
      WHEN NOT v_has_lineup AND v_is_sprint THEN 2
      WHEN NOT v_has_lineup                 THEN 5
      ELSE 0
    END;

    -- Upsert
    INSERT INTO team_race_scores (team_id, race_id, points, penalty)
      VALUES (v_team.id, p_race_id, v_pts, v_penalty)
    ON CONFLICT (team_id, race_id)
      DO UPDATE SET points = EXCLUDED.points, penalty = EXCLUDED.penalty;

  END LOOP;
END;
$$;


-- ═══════════════════════════════════════════════════════════════
--  VIEWS
-- ═══════════════════════════════════════════════════════════════

-- Classifica generale
CREATE OR REPLACE VIEW v_leaderboard AS
SELECT
  t.id            AS team_id,
  t.name          AS team_name,
  t.owner_name,
  t.budget,
  t.switches_used,
  COALESCE(SUM(trs.net_points), 0)   AS total_points,
  COUNT(DISTINCT trs.race_id)        AS races_played
FROM teams t
LEFT JOIN team_race_scores trs ON trs.team_id = t.id
GROUP BY t.id, t.name, t.owner_name, t.budget, t.switches_used
ORDER BY total_points DESC;

-- Piloti con info proprietà
CREATE OR REPLACE VIEW v_pilots_with_owners AS
SELECT
  p.id,
  p.name,
  p.f1_team,
  p.purchase_price,
  p.is_injured,
  t.id            AS owner_team_id,
  t.name          AS owner_team_name,
  t.owner_name
FROM pilots p
LEFT JOIN teams t ON t.id = p.owner_team_id
ORDER BY p.f1_team, p.name;

-- Rosa completa per squadra
CREATE OR REPLACE VIEW v_team_roster AS
SELECT
  t.id            AS team_id,
  t.name          AS team_name,
  t.owner_name,
  t.budget,
  t.switches_used,
  COUNT(p.id)     AS pilot_count,
  COALESCE(SUM(p.purchase_price), 0) AS total_spent
FROM teams t
LEFT JOIN pilots p ON p.owner_team_id = t.id
GROUP BY t.id, t.name, t.owner_name, t.budget, t.switches_used
ORDER BY t.name;

-- Punteggi dettagliati per gara
CREATE OR REPLACE VIEW v_race_scores_detail AS
SELECT
  ce.location        AS race_location,
  ce.event_date      AS race_date,
  r.is_sprint,
  t.name             AS team_name,
  trs.points,
  trs.penalty,
  trs.net_points
FROM team_race_scores trs
JOIN races r              ON r.id = trs.race_id
JOIN calendar_events ce   ON ce.id = r.calendar_event_id
JOIN teams t              ON t.id = trs.team_id
ORDER BY ce.sort_order, trs.net_points DESC;


-- ═══════════════════════════════════════════════════════════════
--  DATI INIZIALI
-- ═══════════════════════════════════════════════════════════════

-- ─── TEAMS ───────────────────────────────────────────────────────────────────
INSERT INTO teams (name, owner_name, budget, switches_used, is_admin) VALUES
  ('ZetaRacing',              'Alessandro Zanin',    100, 0, TRUE),
  ('SF – Scuderia Fainelli',  'Alessandro Fainelli', 100, 0, FALSE),
  ('Ranocchiettos',           'Leonardo Cedaro',     100, 0, FALSE),
  ('Abdull Mazzar',           'Dario Mazzanti',      100, 0, FALSE),
  ('Alpha Chiro Racing',      'Andrea Chirizzi',     100, 0, FALSE),
  ('Scudemaria Ferrari',      'Carlo Maria Ferrari', 100, 0, FALSE);


-- ─── PILOTS ──────────────────────────────────────────────────────────────────
INSERT INTO pilots (name, f1_team) VALUES
  ('Lando Norris',           'McLaren'),
  ('Oscar Piastri',          'McLaren'),
  ('George Russell',         'Mercedes'),
  ('Andrea Kimi Antonelli',  'Mercedes'),
  ('Max Verstappen',         'Red Bull Racing'),
  ('Isack Hadjar',           'Red Bull Racing'),
  ('Charles Leclerc',        'Ferrari'),
  ('Lewis Hamilton',         'Ferrari'),
  ('Alexander Albon',        'Williams'),
  ('Carlos Sainz',           'Williams'),
  ('Arvid Lindblad',         'Racing Bulls'),
  ('Liam Lawson',            'Racing Bulls'),
  ('Fernando Alonso',        'Aston Martin'),
  ('Lance Stroll',           'Aston Martin'),
  ('Esteban Ocon',           'Haas'),
  ('Oliver Bearman',         'Haas'),
  ('Nico Hülkenberg',        'Audi'),
  ('Gabriel Bortoleto',      'Audi'),
  ('Pierre Gasly',           'Alpine'),
  ('Franco Colapinto',       'Alpine'),
  ('Sergio Pérez',           'Cadillac'),
  ('Valtteri Bottas',        'Cadillac');


-- ─── CALENDAR EVENTS ─────────────────────────────────────────────────────────
-- sort_order = indice array JS originale (0-based)
-- round_number = numero gara stagione (solo per type='race')
INSERT INTO calendar_events (sort_order, event_date, event_type, location, round_number) VALUES
  ( 0, '2026-03-08', 'race',    'Australia',          1),
  ( 1, '2026-03-15', 'race',    'Cina',               2),
  ( 2, '2026-03-16', 'auction', 'Asta 1',             NULL),
  ( 3, '2026-03-29', 'race',    'Giappone',           3),
  ( 4, '2026-04-12', 'race',    'Bahrain',            4),
  ( 5, '2026-04-13', 'auction', 'Asta 2',             NULL),
  ( 6, '2026-04-19', 'race',    'Arabia Saudita',     5),
  ( 7, '2026-05-03', 'race',    'Miami',              6),
  ( 8, '2026-05-04', 'auction', 'Asta 3',             NULL),
  ( 9, '2026-05-24', 'race',    'Canada',             7),
  (10, '2026-06-07', 'race',    'Monaco',             8),
  (11, '2026-06-08', 'auction', 'Asta 4',             NULL),
  (12, '2026-06-14', 'race',    'Spagna (Barcellona)',9),
  (13, '2026-06-28', 'race',    'Austria',            10),
  (14, '2026-06-29', 'auction', 'Asta 5',             NULL),
  (15, '2026-07-05', 'race',    'Gran Bretagna',      11),
  (16, '2026-07-19', 'race',    'Belgio',             12),
  (17, '2026-07-20', 'auction', 'Asta 6',             NULL),
  (18, '2026-07-26', 'race',    'Ungheria',           13),
  (19, '2026-08-23', 'race',    'Paesi Bassi',        14),
  (20, '2026-08-24', 'auction', 'Asta 7',             NULL),
  (21, '2026-09-06', 'race',    'Italia',             15),
  (22, '2026-09-13', 'race',    'Spagna (Valencia)',  16),
  (23, '2026-09-14', 'auction', 'Asta 8',             NULL),
  (24, '2026-09-26', 'race',    'Azerbaijan',         17),
  (25, '2026-10-11', 'race',    'Singapore',          18),
  (26, '2026-10-12', 'auction', 'Asta 9',             NULL),
  (27, '2026-10-25', 'race',    'Stati Uniti',        19),
  (28, '2026-11-01', 'race',    'Messico',            20),
  (29, '2026-11-02', 'auction', 'Asta 10',            NULL),
  (30, '2026-11-08', 'race',    'Brasile',            21),
  (31, '2026-11-21', 'race',    'Las Vegas',          22),
  (32, '2026-11-23', 'auction', 'Asta 11',            NULL),
  (33, '2026-11-29', 'race',    'Qatar',              23),
  (34, '2026-12-06', 'race',    'Abu Dhabi',          24);


-- ─── AUCTIONS (una per ogni evento di tipo 'auction') ────────────────────────
INSERT INTO auctions (calendar_event_id, auction_number, budget_added)
SELECT id, ROW_NUMBER() OVER (ORDER BY sort_order), 100
FROM calendar_events
WHERE event_type = 'auction'
ORDER BY sort_order;


-- ═══════════════════════════════════════════════════════════════
--  ROW LEVEL SECURITY (abilitare quando si aggiunge l'auth)
-- ═══════════════════════════════════════════════════════════════
-- Al momento le policy sono commentate perché l'app usa localStorage
-- per la "sessione". Quando si aggiunge Supabase Auth, decommentare.

-- ALTER TABLE teams             ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE pilots            ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE calendar_events   ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE races             ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE race_results      ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE lineups           ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE auctions          ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE auction_lots      ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE switches          ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE team_race_scores  ENABLE ROW LEVEL SECURITY;

-- Lettura pubblica (tutti vedono classifica, calendario, piloti)
-- CREATE POLICY "public read" ON teams           FOR SELECT USING (true);
-- CREATE POLICY "public read" ON pilots          FOR SELECT USING (true);
-- CREATE POLICY "public read" ON calendar_events FOR SELECT USING (true);
-- CREATE POLICY "public read" ON races           FOR SELECT USING (true);
-- CREATE POLICY "public read" ON race_results    FOR SELECT USING (true);
-- CREATE POLICY "public read" ON team_race_scores FOR SELECT USING (true);

-- Owner può modificare solo la propria formazione
-- CREATE POLICY "owner lineups" ON lineups
--   FOR ALL USING (team_id = (
--     SELECT id FROM teams WHERE owner_name = auth.jwt() ->> 'name'
--   ));

-- Solo admin può scrivere risultati, aste, switch
-- CREATE POLICY "admin only results" ON race_results
--   FOR ALL USING (EXISTS (
--     SELECT 1 FROM teams WHERE is_admin = true
--       AND owner_name = auth.jwt() ->> 'name'
--   ));
