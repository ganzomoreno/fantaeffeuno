/**
 * Copia le formazioni dalla Miami Sprint al Miami GP come baseline.
 * Gli utenti possono poi modificarle prima del lights-out.
 */
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwY2h1dXF3a25sZHFland4dGF6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjAwMDkxNCwiZXhwIjoyMDg3NTc2OTE0fQ.kyBXfpPY0xvbqNDxpvZLfi75m0abEcSNpx3k39qH60I';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, SK);

const SPRINT_SORT = 8;
const GP_SORT = 9;

(async () => {
  const { data: calEvents } = await supabase
    .from('calendar_events').select('id, sort_order, location').in('sort_order', [SPRINT_SORT, GP_SORT]);
  const sprintCal = calEvents.find(c => c.sort_order === SPRINT_SORT);
  const gpCal = calEvents.find(c => c.sort_order === GP_SORT);

  const { data: sprintRace } = await supabase.from('races').select('id').eq('calendar_event_id', sprintCal.id).maybeSingle();
  if (!sprintRace) { console.error('Sprint race non trovata'); return; }

  let { data: gpRace } = await supabase.from('races').select('id').eq('calendar_event_id', gpCal.id).maybeSingle();
  if (!gpRace) {
    const { data: created } = await supabase.from('races')
      .insert({ calendar_event_id: gpCal.id, is_sprint: false }).select('id').single();
    gpRace = created;
    console.log('  Race GP creata:', gpRace.id);
  } else {
    await supabase.from('races').update({ is_sprint: false }).eq('id', gpRace.id);
  }

  const { data: sprintLineups } = await supabase.from('lineups')
    .select('team_id, pilot_id, is_reserve').eq('race_id', sprintRace.id);
  if (!sprintLineups?.length) { console.error('Nessuna lineup sprint'); return; }

  const teamIds = [...new Set(sprintLineups.map(l => l.team_id))];
  for (const tid of teamIds) {
    await supabase.from('lineups').delete().eq('race_id', gpRace.id).eq('team_id', tid);
  }

  const newRows = sprintLineups.map(l => ({
    race_id: gpRace.id,
    team_id: l.team_id,
    pilot_id: l.pilot_id,
    is_reserve: l.is_reserve,
    subbed_in_manually: false,
    subbed_out_for: null,
  }));
  const { error } = await supabase.from('lineups').insert(newRows);
  if (error) console.error('  ERR:', error.message);
  else console.log(`  ${newRows.length} lineup rows copiate sprint → GP (${teamIds.length} team)`);
})();
