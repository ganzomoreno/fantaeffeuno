-- ==========================================
-- Permette ai team owner autenticati di creare/aggiornare righe in `races`.
--
-- Motivazione: salvando una formazione (anche sprint) per un calendar_event
-- non ancora "materializzato" come gara, lib/db.js::getOrCreateRace tenta un
-- INSERT in `races`. La policy precedente esponeva solo SELECT pubblico,
-- bloccando il salvataggio con errore RLS.
--
-- La tabella `races` contiene solo il legame calendar_event ↔ is_sprint;
-- i dati sensibili stanno in `race_results` (già protetta admin-only).
-- ==========================================

CREATE POLICY "authenticated_can_manage_races" ON races
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
