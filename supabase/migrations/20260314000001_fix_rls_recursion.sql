-- ==========================================
-- Fix: Infinite Recursion in teams policy
-- ==========================================

-- Il problema era causato da una policy FOR ALL sulla tabella 'teams' che, 
-- per verificare se un utente fosse admin, interrogava nuovamente 'teams', 
-- innescando un loop infinito in fase di SELECT.
-- Visto che la SELECT è già gestita da "public_read_teams", possiamo limitare
-- i poteri admin solo alle vere query di scrittura, separandole esplicitamente.

DROP POLICY IF EXISTS "admin_all_teams" ON teams;

CREATE POLICY "admin_insert_teams" ON teams
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM teams WHERE is_admin = true AND auth_user_id = auth.uid())
  );

CREATE POLICY "admin_update_teams" ON teams
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM teams WHERE is_admin = true AND auth_user_id = auth.uid())
  );

CREATE POLICY "admin_delete_teams" ON teams
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM teams WHERE is_admin = true AND auth_user_id = auth.uid())
  );
