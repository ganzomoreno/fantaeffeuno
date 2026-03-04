require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Must use SERVICE_ROLE_KEY to create auth users and bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // We need to make sure this is available, or use anon key if we disable RLS.
);

// We will use anon key + fetch to bypass if we don't have service_role_key in env, but let's assume we can auth as admin via SQL using npx supabase.
// Actually, it's safer to just run this via `npx supabase seed` or an SQL script locally to push to the db.

const sql = `
-- Since profiles.id must reference auth.users, for a quick local/remote fix we can just insert fake UUIDs if we disable the foreign key, or we create real auth users.
-- To do this cleanly in SQL over remote, let's just insert into auth.users directly.

-- First, let's create the pilots since they don't depend on auth.
INSERT INTO public.pilots (name, abbreviation, f1_team, price) VALUES
('Lando Norris', 'NOR', 'McLaren', 0),
('Oscar Piastri', 'PIA', 'McLaren', 0),
('George Russell', 'RUS', 'Mercedes', 0),
('Andrea Kimi Antonelli', 'ANT', 'Mercedes', 0),
('Max Verstappen', 'VER', 'Red Bull Racing', 0),
('Isack Hadjar', 'HAD', 'Red Bull Racing', 0),
('Charles Leclerc', 'LEC', 'Ferrari', 0),
('Lewis Hamilton', 'HAM', 'Ferrari', 0),
('Alexander Albon', 'ALB', 'Williams', 0),
('Carlos Sainz', 'SAI', 'Williams', 0),
('Arvid Lindblad', 'LIN', 'Racing Bulls', 0),
('Liam Lawson', 'LAW', 'Racing Bulls', 0),
('Fernando Alonso', 'ALO', 'Aston Martin', 0),
('Lance Stroll', 'STR', 'Aston Martin', 0),
('Esteban Ocon', 'OCO', 'Haas', 0),
('Oliver Bearman', 'BEA', 'Haas', 0),
('Nico Hülkenberg', 'HUL', 'Audi', 0),
('Gabriel Bortoleto', 'BOR', 'Audi', 0),
('Pierre Gasly', 'GAS', 'Alpine', 0),
('Franco Colapinto', 'COL', 'Alpine', 0),
('Sergio Pérez', 'PER', 'Cadillac', 0),
('Valtteri Bottas', 'BOT', 'Cadillac', 0)
ON CONFLICT DO NOTHING;
`;
