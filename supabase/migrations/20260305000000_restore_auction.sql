-- 20260305000000_restore_auction.sql

-- 1. Disable the auth.users constraint since the app doesn't have login yet
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 2. Relax RLS for MVP (allow public access because authentication is Post-MVP)
-- DROP existing strict policies
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can insert/update own lineup." ON public.lineups;
DROP POLICY IF EXISTS "Only admins can modify pilots." ON public.pilots;
DROP POLICY IF EXISTS "Only admins can modify races." ON public.races;
DROP POLICY IF EXISTS "Only admins can modify results." ON public.race_results;

-- ADD permissive policies for MVP (anonymously via anon key)
CREATE POLICY "Allow public inserts profiles" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public updates profiles" ON public.profiles FOR UPDATE USING (true);
CREATE POLICY "Allow public all lineups" ON public.lineups FOR ALL USING (true);
CREATE POLICY "Allow public all pilots" ON public.pilots FOR ALL USING (true);
CREATE POLICY "Allow public all races" ON public.races FOR ALL USING (true);
CREATE POLICY "Allow public all race_results" ON public.race_results FOR ALL USING (true);

-- 3. We create fixed UUIDs for the 6 teams so the frontend can store them in localStorage
DO $$ 
DECLARE
  zeta_id uuid := '11111111-1111-1111-1111-111111111111';
  scud_id uuid := '22222222-2222-2222-2222-222222222222';
  chiro_id uuid := '33333333-3333-3333-3333-333333333333';
  rano_id uuid := '44444444-4444-4444-4444-444444444444';
  fain_id uuid := '55555555-5555-5555-5555-555555555555';
  abd_id uuid := '66666666-6666-6666-6666-666666666666';
BEGIN
  -- Insert Teams (Profiles)
  INSERT INTO public.profiles (id, team_name, owner_name, budget, switches_used, is_admin)
  VALUES 
  (zeta_id, 'ZetaRacing', 'Alessandro Zanin', 9, 0, true),
  (scud_id, 'Scudemaria Ferrari', 'Carlo Maria Ferrari', 44, 0, false),
  (chiro_id, 'Alpha Chiro Racing', 'Andrea Chirizzi', 26, 0, false),
  (rano_id, 'Ranocchiettos', 'Leonardo Cedaro', 18, 0, false),
  (fain_id, 'SF – Scuderia Fainelli', 'Alessandro Fainelli', 12, 0, false),
  (abd_id, 'Abdull Mazzar', 'Dario Mazzanti', 97, 0, false)
  ON CONFLICT (id) DO UPDATE SET budget = EXCLUDED.budget;

  -- Insert all 22 Pilots
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

  -- 1. ZETARACING
  UPDATE public.pilots SET owner_id = zeta_id, price = 54 WHERE name = 'Charles Leclerc';
  UPDATE public.pilots SET owner_id = zeta_id, price = 36 WHERE name = 'Andrea Kimi Antonelli';
  UPDATE public.pilots SET owner_id = zeta_id, price = 1  WHERE name = 'Arvid Lindblad';

  -- 2. SCUDEMARIA FERRARI
  UPDATE public.pilots SET owner_id = scud_id, price = 41 WHERE name = 'Lando Norris';
  UPDATE public.pilots SET owner_id = scud_id, price = 5  WHERE name = 'Carlos Sainz';
  UPDATE public.pilots SET owner_id = scud_id, price = 10 WHERE name = 'Gabriel Bortoleto';

  -- 3. ALPHA CHIRO RACING
  UPDATE public.pilots SET owner_id = chiro_id, price = 51 WHERE name = 'Oscar Piastri';
  UPDATE public.pilots SET owner_id = chiro_id, price = 17 WHERE name = 'Isack Hadjar';
  UPDATE public.pilots SET owner_id = chiro_id, price = 6  WHERE name = 'Esteban Ocon';

  -- 4. RANOCCHIETTOS
  UPDATE public.pilots SET owner_id = rano_id, price = 68 WHERE name = 'George Russell';
  UPDATE public.pilots SET owner_id = rano_id, price = 12 WHERE name = 'Nico Hülkenberg';
  UPDATE public.pilots SET owner_id = rano_id, price = 2  WHERE name = 'Liam Lawson';

  -- 5. SF – SCUDERIA FAINELLI
  UPDATE public.pilots SET owner_id = fain_id, price = 46 WHERE name = 'Max Verstappen';
  UPDATE public.pilots SET owner_id = fain_id, price = 34 WHERE name = 'Lewis Hamilton';
  UPDATE public.pilots SET owner_id = fain_id, price = 8  WHERE name = 'Alexander Albon';

  -- 6. ABDULL MAZZAR
  UPDATE public.pilots SET owner_id = abd_id, price = 1 WHERE name = 'Franco Colapinto';
  UPDATE public.pilots SET owner_id = abd_id, price = 1 WHERE name = 'Sergio Pérez';
  UPDATE public.pilots SET owner_id = abd_id, price = 1 WHERE name = 'Valtteri Bottas';

END $$;
