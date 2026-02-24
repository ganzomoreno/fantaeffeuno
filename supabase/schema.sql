-- ================================
-- FANTA FORMULA 1 - Database Schema
-- Run this in Supabase SQL Editor
-- ================================

-- Teams (one per user)
CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL UNIQUE,
  name text NOT NULL,
  fantamilioni integer DEFAULT 100,
  created_at timestamptz DEFAULT now()
);

-- 2026 F1 Drivers
CREATE TABLE IF NOT EXISTS drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  constructor text NOT NULL,
  number integer,
  country text,
  is_active boolean DEFAULT true
);

-- 2026 Season Calendar
CREATE TABLE IF NOT EXISTS races (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  circuit text NOT NULL,
  date date NOT NULL,
  is_sprint boolean DEFAULT false,
  round integer NOT NULL,
  season integer DEFAULT 2026,
  results_published boolean DEFAULT false
);

-- Auctions (6 total: 1 initial open + 5 sealed)
CREATE TABLE IF NOT EXISTS auctions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round integer NOT NULL,          -- 0=initial, 1-5=subsequent
  type text DEFAULT 'open',        -- 'open' | 'sealed'
  status text DEFAULT 'pending',   -- 'pending' | 'open' | 'closed'
  opens_at timestamptz,
  closes_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Current driver roster per team
CREATE TABLE IF NOT EXISTS team_drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES teams NOT NULL,
  driver_id uuid REFERENCES drivers NOT NULL,
  purchase_price integer NOT NULL,
  auction_id uuid REFERENCES auctions,
  acquired_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  UNIQUE(team_id, driver_id)
);

-- Sealed auction bids
CREATE TABLE IF NOT EXISTS auction_bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id uuid REFERENCES auctions NOT NULL,
  team_id uuid REFERENCES teams NOT NULL,
  driver_id uuid REFERENCES drivers NOT NULL,
  amount integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(auction_id, team_id, driver_id)
);

-- Open auction live bids (for initial asta libera)
CREATE TABLE IF NOT EXISTS open_auction_bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id uuid REFERENCES auctions NOT NULL,
  driver_id uuid REFERENCES drivers NOT NULL,
  team_id uuid REFERENCES teams NOT NULL,
  amount integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Race lineups (3 starters + 1 bench per team per race)
CREATE TABLE IF NOT EXISTS lineups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES teams NOT NULL,
  race_id uuid REFERENCES races NOT NULL,
  driver1_id uuid REFERENCES drivers NOT NULL,
  driver2_id uuid REFERENCES drivers NOT NULL,
  driver3_id uuid REFERENCES drivers NOT NULL,
  bench_driver_id uuid REFERENCES drivers NOT NULL,
  submitted_at timestamptz DEFAULT now(),
  UNIQUE(team_id, race_id)
);

-- Race results (inserted by admin)
CREATE TABLE IF NOT EXISTS race_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  race_id uuid REFERENCES races NOT NULL,
  driver_id uuid REFERENCES drivers NOT NULL,
  position integer,         -- null if DNF
  dnf boolean DEFAULT false,
  dotd_position integer,    -- 1=dotd, 2=2nd, 3=3rd
  fastest_lap boolean DEFAULT false,
  pole_position boolean DEFAULT false,
  overtakes integer DEFAULT 0,
  UNIQUE(race_id, driver_id)
);

-- Calculated scores per team per race
CREATE TABLE IF NOT EXISTS race_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES teams NOT NULL,
  race_id uuid REFERENCES races NOT NULL,
  driver1_id uuid REFERENCES drivers,
  driver2_id uuid REFERENCES drivers,
  driver3_id uuid REFERENCES drivers,
  driver1_points numeric DEFAULT 0,
  driver2_points numeric DEFAULT 0,
  driver3_points numeric DEFAULT 0,
  total_points numeric DEFAULT 0,
  breakdown jsonb,
  UNIQUE(team_id, race_id)
);

-- Pilot trades between teams
CREATE TABLE IF NOT EXISTS trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposer_team_id uuid REFERENCES teams NOT NULL,
  recipient_team_id uuid REFERENCES teams NOT NULL,
  offered_driver_id uuid REFERENCES drivers NOT NULL,
  requested_driver_id uuid REFERENCES drivers NOT NULL,
  cash_addition integer DEFAULT 0,
  status text DEFAULT 'pending',  -- 'pending' | 'accepted' | 'rejected'
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

-- Season switches (3 per team per season)
CREATE TABLE IF NOT EXISTS season_switches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES teams NOT NULL,
  race_id uuid REFERENCES races NOT NULL,
  used_at timestamptz DEFAULT now()
);

-- ================================
-- Row Level Security
-- ================================

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE races ENABLE ROW LEVEL SECURITY;
ALTER TABLE auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE auction_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE open_auction_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE lineups ENABLE ROW LEVEL SECURITY;
ALTER TABLE race_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE race_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE season_switches ENABLE ROW LEVEL SECURITY;

-- Everyone can read drivers, races, auctions, race_results, race_scores
CREATE POLICY "public read drivers" ON drivers FOR SELECT USING (true);
CREATE POLICY "public read races" ON races FOR SELECT USING (true);
CREATE POLICY "public read auctions" ON auctions FOR SELECT USING (true);
CREATE POLICY "public read race_results" ON race_results FOR SELECT USING (true);
CREATE POLICY "public read race_scores" ON race_scores FOR SELECT USING (true);
CREATE POLICY "public read teams" ON teams FOR SELECT USING (true);
CREATE POLICY "public read team_drivers" ON team_drivers FOR SELECT USING (true);
CREATE POLICY "public read lineups" ON lineups FOR SELECT USING (true);
CREATE POLICY "public read trades" ON trades FOR SELECT USING (true);
CREATE POLICY "public read season_switches" ON season_switches FOR SELECT USING (true);

-- Users can manage their own team
CREATE POLICY "users manage own team" ON teams
  FOR ALL USING (auth.uid() = user_id);

-- Users can manage their own lineups
CREATE POLICY "users manage own lineups" ON lineups
  FOR ALL USING (
    team_id IN (SELECT id FROM teams WHERE user_id = auth.uid())
  );

-- Users can manage their own bids
CREATE POLICY "users manage own bids" ON auction_bids
  FOR ALL USING (
    team_id IN (SELECT id FROM teams WHERE user_id = auth.uid())
  );

CREATE POLICY "users read other bids" ON auction_bids
  FOR SELECT USING (true);

CREATE POLICY "users manage own open bids" ON open_auction_bids
  FOR ALL USING (
    team_id IN (SELECT id FROM teams WHERE user_id = auth.uid())
  );

CREATE POLICY "users read open bids" ON open_auction_bids
  FOR SELECT USING (true);

-- Users can manage their own trades
CREATE POLICY "users manage own trades" ON trades
  FOR ALL USING (
    proposer_team_id IN (SELECT id FROM teams WHERE user_id = auth.uid())
    OR recipient_team_id IN (SELECT id FROM teams WHERE user_id = auth.uid())
  );

-- ================================
-- Seed: 2026 F1 Drivers
-- ================================

INSERT INTO drivers (name, constructor, number, country) VALUES
  ('Max Verstappen', 'Red Bull', 1, 'Netherlands'),
  ('Liam Lawson', 'Red Bull', 30, 'New Zealand'),
  ('Charles Leclerc', 'Ferrari', 16, 'Monaco'),
  ('Lewis Hamilton', 'Ferrari', 44, 'United Kingdom'),
  ('George Russell', 'Mercedes', 63, 'United Kingdom'),
  ('Andrea Kimi Antonelli', 'Mercedes', 12, 'Italy'),
  ('Lando Norris', 'McLaren', 4, 'United Kingdom'),
  ('Oscar Piastri', 'McLaren', 81, 'Australia'),
  ('Fernando Alonso', 'Aston Martin', 14, 'Spain'),
  ('Lance Stroll', 'Aston Martin', 18, 'Canada'),
  ('Pierre Gasly', 'Alpine', 10, 'France'),
  ('Jack Doohan', 'Alpine', 7, 'Australia'),
  ('Alex Albon', 'Williams', 23, 'Thailand'),
  ('Carlos Sainz', 'Williams', 55, 'Spain'),
  ('Yuki Tsunoda', 'RB', 22, 'Japan'),
  ('Isack Hadjar', 'RB', 6, 'France'),
  ('Esteban Ocon', 'Haas', 31, 'France'),
  ('Oliver Bearman', 'Haas', 87, 'United Kingdom'),
  ('Nico Hulkenberg', 'Sauber', 27, 'Germany'),
  ('Gabriel Bortoleto', 'Sauber', 5, 'Brazil');

-- ================================
-- Seed: 2026 F1 Calendar
-- ================================

INSERT INTO races (name, circuit, date, is_sprint, round) VALUES
  ('Australia', 'Albert Park', '2026-03-16', false, 1),
  ('China', 'Shanghai', '2026-03-23', true, 2),
  ('Japan', 'Suzuka', '2026-04-06', false, 3),
  ('Bahrain', 'Bahrain International', '2026-04-13', false, 4),
  ('Arabia Saudita', 'Jeddah Corniche', '2026-04-20', false, 5),
  ('Miami', 'Miami International', '2026-05-04', true, 6),
  ('Emilia Romagna', 'Imola', '2026-05-18', false, 7),
  ('Monaco', 'Circuit de Monaco', '2026-05-25', false, 8),
  ('Spagna', 'Circuit de Barcelona', '2026-06-01', false, 9),
  ('Canada', 'Circuit Gilles Villeneuve', '2026-06-15', false, 10),
  ('Austria', 'Red Bull Ring', '2026-06-29', false, 11),
  ('Gran Bretagna', 'Silverstone', '2026-07-06', false, 12),
  ('Belgio', 'Spa-Francorchamps', '2026-07-27', true, 13),
  ('Ungheria', 'Hungaroring', '2026-08-03', false, 14),
  ('Olanda', 'Zandvoort', '2026-08-31', false, 15),
  ('Italia', 'Monza', '2026-09-07', false, 16),
  ('Azerbaijan', 'Baku City', '2026-09-21', false, 17),
  ('Singapore', 'Marina Bay', '2026-10-05', false, 18),
  ('Stati Uniti', 'COTA', '2026-10-19', true, 19),
  ('Messico', 'Autodromo Hermanos Rodriguez', '2026-10-26', false, 20),
  ('Brasile', 'Interlagos', '2026-11-09', true, 21),
  ('Las Vegas', 'Las Vegas Strip', '2026-11-22', false, 22),
  ('Qatar', 'Losail', '2026-11-30', true, 23),
  ('Abu Dhabi', 'Yas Marina', '2026-12-07', false, 24);

-- ================================
-- Seed: Teams (5 partecipanti)
-- ================================
-- Note: Insert teams after users register with these emails.
-- Teams are created automatically when user registers.
-- Pre-set team names below via a trigger or manually after registration.

-- ================================
-- Seed: Initial Auction
-- ================================

INSERT INTO auctions (round, type, status, opens_at) VALUES
  (0, 'open', 'pending', '2026-03-06 18:00:00+01');

-- ================================
-- Helper: Get season standings
-- ================================

CREATE OR REPLACE VIEW season_standings AS
SELECT
  t.id as team_id,
  t.name as team_name,
  COALESCE(SUM(rs.total_points), 0) as total_points,
  COUNT(rs.id) as races_scored
FROM teams t
LEFT JOIN race_scores rs ON rs.team_id = t.id
GROUP BY t.id, t.name
ORDER BY total_points DESC;
