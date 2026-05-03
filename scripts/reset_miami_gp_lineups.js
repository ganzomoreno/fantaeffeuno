/**
 * Mantiene SOLO la formazione di Scudemaria Ferrari per il Miami GP.
 * Cancella le lineup auto-copiate dalla sprint per gli altri 5 team.
 */
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwY2h1dXF3a25sZHFland4dGF6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjAwMDkxNCwiZXhwIjoyMDg3NTc2OTE0fQ.kyBXfpPY0xvbqNDxpvZLfi75m0abEcSNpx3k39qH60I';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, SK);

const GP_SORT = 9;
const KEEP_TEAM = 'Scudemaria Ferrari';

(async () => {
  const { data: cal } = await supabase.from('calendar_events').select('id').eq('sort_order', GP_SORT).single();
  const { data: race } = await supabase.from('races').select('id').eq('calendar_event_id', cal.id).single();
  const { data: teams } = await supabase.from('teams').select('id, name');

  const keepTeam = teams.find(t => t.name === KEEP_TEAM);
  const dropTeams = teams.filter(t => t.name !== KEEP_TEAM).map(t => t.id);

  const { error } = await supabase
    .from('lineups')
    .delete()
    .eq('race_id', race.id)
    .in('team_id', dropTeams);
  if (error) { console.error(error); return; }

  const { data: remaining } = await supabase
    .from('lineups')
    .select('is_reserve, pilots:pilot_id(abbreviation), teams:team_id(name)')
    .eq('race_id', race.id);
  console.log(`Lineups Miami GP rimaste: ${remaining.length}`);
  remaining.forEach(l => console.log(`  ${l.teams?.name} - ${l.pilots?.abbreviation}${l.is_reserve ? ' [riserva]' : ''}`));
})();
