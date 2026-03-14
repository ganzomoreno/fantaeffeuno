-- ==========================================
-- Migrazione Supabase Auth e Policy RLS
-- ==========================================

-- 1. Aggiungo la colonna auth_user_id alla tabella teams
ALTER TABLE teams ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Abilito la RLS su tutte le tabelle interessate
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE pilots ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE races ENABLE ROW LEVEL SECURITY;
ALTER TABLE race_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE lineups ENABLE ROW LEVEL SECURITY;
ALTER TABLE auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE auction_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE switches ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_race_scores ENABLE ROW LEVEL SECURITY;

-- 3. Policy di lettura (Public Read) per tutti gli utenti autenticati (o open in base alle esigenze)
-- In questo MVP lasciamo la lettura aperta per semplificare i test
CREATE POLICY "public_read_teams" ON teams FOR SELECT USING (true);
CREATE POLICY "public_read_pilots" ON pilots FOR SELECT USING (true);
CREATE POLICY "public_read_events" ON calendar_events FOR SELECT USING (true);
CREATE POLICY "public_read_races" ON races FOR SELECT USING (true);
CREATE POLICY "public_read_race_results" ON race_results FOR SELECT USING (true);
CREATE POLICY "public_read_lineups" ON lineups FOR SELECT USING (true);
CREATE POLICY "public_read_auctions" ON auctions FOR SELECT USING (true);
CREATE POLICY "public_read_auction_lots" ON auction_lots FOR SELECT USING (true);
CREATE POLICY "public_read_team_race_scores" ON team_race_scores FOR SELECT USING (true);

-- 4. Policy di Scrittura (Lineups) -> Un utente salva solo per la propria squadra
-- 'auth.uid()' è la funzione standard Supabase che estrae l'UUID dello user dalla sessione JWT
CREATE POLICY "owner_can_manage_lineups" ON lineups
  FOR ALL USING (team_id IN (
    SELECT id FROM teams WHERE auth_user_id = auth.uid()
  ));

-- 5. Policy di Scrittura Admin -> Risultati gara, switch manuali, aste...
CREATE POLICY "admin_all_results" ON race_results
  FOR ALL USING (EXISTS (
    SELECT 1 FROM teams WHERE is_admin = true AND auth_user_id = auth.uid()
  ));

CREATE POLICY "admin_all_auctions" ON auctions
  FOR ALL USING (EXISTS (
    SELECT 1 FROM teams WHERE is_admin = true AND auth_user_id = auth.uid()
  ));

CREATE POLICY "admin_all_auction_lots" ON auction_lots
  FOR ALL USING (EXISTS (
    SELECT 1 FROM teams WHERE is_admin = true AND auth_user_id = auth.uid()
  ));

CREATE POLICY "admin_all_switches" ON switches
  FOR ALL USING (EXISTS (
    SELECT 1 FROM teams WHERE is_admin = true AND auth_user_id = auth.uid()
  ));

CREATE POLICY "admin_all_teams" ON teams
  FOR ALL USING (EXISTS (
    SELECT 1 FROM teams WHERE is_admin = true AND auth_user_id = auth.uid()
  ));
  
CREATE POLICY "admin_all_pilots" ON pilots
  FOR ALL USING (EXISTS (
    SELECT 1 FROM teams WHERE is_admin = true AND auth_user_id = auth.uid()
  ));
