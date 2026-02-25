-- ================================================
-- FANTA FORMULA 1 - Aggiornamento dati ufficiali 2026
-- Esegui questo script in Supabase SQL Editor
-- Fonte: formula1.com / motorsport.com / the-race.com
-- ================================================

-- Pulizia dati esistenti
-- (manteniamo teams/users/auctions/scores)
DELETE FROM race_results;
DELETE FROM race_scores;
DELETE FROM lineups;
DELETE FROM team_drivers;
DELETE FROM open_auction_bids;
DELETE FROM auction_bids;
DELETE FROM drivers;
DELETE FROM races;

-- ================================================
-- PILOTI 2026 (22 piloti, 11 team)
-- Norris n°1 come campione in carica 2025
-- Novità: Cadillac (nuovo team), Audi (ex Sauber)
-- ================================================

INSERT INTO drivers (name, constructor, number, country) VALUES

  -- McLaren (Campione Costruttori 2025)
  ('Lando Norris',            'McLaren',       1,  'United Kingdom'),
  ('Oscar Piastri',           'McLaren',       81, 'Australia'),

  -- Ferrari
  ('Charles Leclerc',         'Ferrari',       16, 'Monaco'),
  ('Lewis Hamilton',          'Ferrari',       44, 'United Kingdom'),

  -- Red Bull Racing
  ('Max Verstappen',          'Red Bull',      3,  'Netherlands'),
  ('Isack Hadjar',            'Red Bull',      6,  'France'),

  -- Mercedes
  ('George Russell',          'Mercedes',      63, 'United Kingdom'),
  ('Andrea Kimi Antonelli',   'Mercedes',      12, 'Italy'),

  -- Aston Martin
  ('Fernando Alonso',         'Aston Martin',  14, 'Spain'),
  ('Lance Stroll',            'Aston Martin',  18, 'Canada'),

  -- Alpine
  ('Pierre Gasly',            'Alpine',        10, 'France'),
  ('Franco Colapinto',        'Alpine',        43, 'Argentina'),

  -- Williams
  ('Alexander Albon',         'Williams',      23, 'Thailand'),
  ('Carlos Sainz',            'Williams',      55, 'Spain'),

  -- Racing Bulls (ex RB / AlphaTauri)
  ('Liam Lawson',             'Racing Bulls',  30, 'New Zealand'),
  ('Arvid Lindblad',          'Racing Bulls',  41, 'United Kingdom'),

  -- Haas
  ('Esteban Ocon',            'Haas',          31, 'France'),
  ('Oliver Bearman',          'Haas',          87, 'United Kingdom'),

  -- Audi (ex Sauber)
  ('Nico Hulkenberg',         'Audi',          27, 'Germany'),
  ('Gabriel Bortoleto',       'Audi',          5,  'Brazil'),

  -- Cadillac (NUOVO TEAM 2026)
  ('Sergio Perez',            'Cadillac',      11, 'Mexico'),
  ('Valtteri Bottas',         'Cadillac',      77, 'Finland');

-- ================================================
-- CALENDARIO 2026 (24 gare)
-- Date gara (domenica) + sprint weekend
-- ================================================

INSERT INTO races (name, circuit, date, is_sprint, round, season) VALUES

  -- Marzo
  ('Australia',        'Albert Park, Melbourne',           '2026-03-16', false, 1,  2026),
  ('Cina',             'Shanghai International Circuit',    '2026-03-23', true,  2,  2026),

  -- Aprile
  ('Giappone',         'Suzuka Circuit',                    '2026-04-06', false, 3,  2026),
  ('Bahrain',          'Bahrain International Circuit',     '2026-04-13', false, 4,  2026),
  ('Arabia Saudita',   'Jeddah Corniche Circuit',           '2026-04-20', false, 5,  2026),

  -- Maggio
  ('Miami',            'Miami International Autodrome',     '2026-05-04', true,  6,  2026),
  ('Emilia Romagna',   'Autodromo Enzo e Dino Ferrari',     '2026-05-18', false, 7,  2026),
  ('Monaco',           'Circuit de Monaco',                 '2026-05-25', false, 8,  2026),

  -- Giugno
  ('Spagna',           'Circuit de Barcelona-Catalunya',    '2026-06-01', false, 9,  2026),
  ('Canada',           'Circuit Gilles Villeneuve',         '2026-06-15', false, 10, 2026),
  ('Austria',          'Red Bull Ring',                     '2026-06-29', false, 11, 2026),

  -- Luglio
  ('Gran Bretagna',    'Silverstone Circuit',               '2026-07-06', false, 12, 2026),
  ('Belgio',           'Circuit de Spa-Francorchamps',      '2026-07-27', true,  13, 2026),

  -- Agosto
  ('Ungheria',         'Hungaroring',                       '2026-08-03', false, 14, 2026),
  ('Olanda',           'Circuit Zandvoort',                 '2026-08-31', false, 15, 2026),

  -- Settembre
  ('Italia',           'Autodromo Nazionale Monza',         '2026-09-07', false, 16, 2026),
  ('Azerbaijan',       'Baku City Circuit',                 '2026-09-21', false, 17, 2026),

  -- Ottobre
  ('Singapore',        'Marina Bay Street Circuit',         '2026-10-05', false, 18, 2026),
  ('Stati Uniti',      'Circuit of the Americas',           '2026-10-19', true,  19, 2026),
  ('Messico',          'Autodromo Hermanos Rodriguez',       '2026-10-26', false, 20, 2026),

  -- Novembre
  ('Brasile',          'Autodromo Jose Carlos Pace',        '2026-11-09', true,  21, 2026),
  ('Las Vegas',        'Las Vegas Strip Circuit',           '2026-11-22', false, 22, 2026),
  ('Qatar',            'Lusail International Circuit',      '2026-11-30', true,  23, 2026),

  -- Dicembre
  ('Abu Dhabi',        'Yas Marina Circuit',                '2026-12-07', false, 24, 2026);
