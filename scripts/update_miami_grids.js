/**
 * Aggiorna grid_position per Miami Sprint (sort=8) e Miami GP (sort=9).
 */
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const SK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwY2h1dXF3a25sZHFland4dGF6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjAwMDkxNCwiZXhwIjoyMDg3NTc2OTE0fQ.kyBXfpPY0xvbqNDxpvZLfi75m0abEcSNpx3k39qH60I';
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, SK);

// Miami Sprint Shootout grid (sort_order=8) — fonte: formula1.com sprint-grid
const SPRINT_GRID = [
  'NOR','ANT','PIA','LEC','VER','RUS','HAM','COL','HAD','GAS',
  'BOR','HUL','BEA','SAI','LAW','OCO','PER','ALB','BOT','ALO',
  'STR','LIN',
];

// Miami GP qualifying grid (sort_order=9) — fonte: formula1.com qualifying
// BOR e HAD DSQ in qualifica → partono dal pit lane, posizioni 21-22.
const GP_GRID = [
  'ANT','VER','LEC','NOR','RUS','HAM','PIA','COL','GAS','HUL',
  'LAW','BEA','SAI','OCO','ALB','LIN','ALO','STR','BOT','PER',
  'BOR','HAD',
];

async function applyGrid(sortOrder, abbrList, label) {
  const { data: cal } = await s.from('calendar_events').select('id').eq('sort_order', sortOrder).single();
  const { data: race } = await s.from('races').select('id').eq('calendar_event_id', cal.id).single();
  const { data: pilots } = await s.from('pilots').select('id, abbreviation');
  const pilotByAbbr = Object.fromEntries(pilots.map(p => [p.abbreviation, p.id]));

  console.log(`\n${label} (sort=${sortOrder}, race=${race.id}):`);
  for (let i = 0; i < abbrList.length; i++) {
    const abbr = abbrList[i];
    const pid = pilotByAbbr[abbr];
    if (!pid) { console.error(`  ${abbr} non trovato`); continue; }
    const { error } = await s.from('race_results')
      .update({ grid_position: i + 1 })
      .eq('race_id', race.id).eq('pilot_id', pid);
    if (error) console.error(`  ${abbr}: ${error.message}`);
    else process.stdout.write(`  ${abbr}=P${i + 1}`);
  }
  console.log();
}

(async () => {
  await applyGrid(8, SPRINT_GRID, 'Miami Sprint');
  await applyGrid(9, GP_GRID, 'Miami GP');
  console.log('\n✅ Grid applicate');
})();
