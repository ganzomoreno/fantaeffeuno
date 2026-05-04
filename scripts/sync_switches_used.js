/**
 * Backfill teams.switches_used in linea con lo stato reale delle lineups.
 * Conta per ogni team le race distinte con almeno una riserva subbed_in_manually=true.
 */
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const SK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwY2h1dXF3a25sZHFland4dGF6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjAwMDkxNCwiZXhwIjoyMDg3NTc2OTE0fQ.kyBXfpPY0xvbqNDxpvZLfi75m0abEcSNpx3k39qH60I';
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, SK);

(async () => {
  const { data: rows } = await s.from('lineups')
    .select('team_id, race_id')
    .eq('subbed_in_manually', true)
    .eq('is_reserve', true);
  const derived = new Map();
  rows.forEach(r => {
    if (!derived.has(r.team_id)) derived.set(r.team_id, new Set());
    derived.get(r.team_id).add(r.race_id);
  });
  const { data: teams } = await s.from('teams').select('id, name, switches_used');
  console.log('=== SYNC switches_used ===');
  for (const t of teams) {
    const real = (derived.get(t.id) || new Set()).size;
    if (real !== t.switches_used) {
      await s.from('teams').update({ switches_used: real }).eq('id', t.id);
      console.log(`  ${t.name}: ${t.switches_used} → ${real}`);
    } else {
      console.log(`  ${t.name}: ${t.switches_used} (ok)`);
    }
  }
})();
