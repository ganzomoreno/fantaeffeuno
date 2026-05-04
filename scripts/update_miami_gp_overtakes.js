/**
 * Aggiorna overtakes Miami GP 2026 = posizioni guadagnate (grid → finish), cap 6.
 * Eccezione VER: 4 ovt manuali (spin a Lap1 → recovery da P9 a P5, motivo del DOTD).
 *
 * Grid (qualifica): ANT, VER, LEC, NOR, RUS, HAM, PIA, COL, GAS, HUL, LAW,
 *   BEA, SAI, OCO, ALB, LIN, ALO, STR, BOT, PER, [BOR pit lane], [HAD pit lane]
 */
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const SK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwY2h1dXF3a25sZHFland4dGF6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjAwMDkxNCwiZXhwIjoyMDg3NTc2OTE0fQ.kyBXfpPY0xvbqNDxpvZLfi75m0abEcSNpx3k39qH60I';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, SK);

// abbr → overtakes (cap 6 = bonus max 3pt)
const OVT = {
  ANT: 0, NOR: 2, PIA: 4, RUS: 1, VER: 4, HAM: 0, COL: 1, LEC: 0,
  SAI: 4, ALB: 5, BEA: 1, BOR: 6, OCO: 1, LIN: 2, ALO: 2, PER: 4,
  STR: 1, BOT: 1,
  HUL: 0, LAW: 0, GAS: 0, HAD: 0,
};

(async () => {
  const { data: cal } = await supabase.from('calendar_events').select('id').eq('sort_order', 9).single();
  const { data: race } = await supabase.from('races').select('id').eq('calendar_event_id', cal.id).single();
  const { data: pilots } = await supabase.from('pilots').select('id, abbreviation');
  const pilotByAbbr = Object.fromEntries(pilots.map(p => [p.abbreviation, p.id]));

  console.log('🔄 Aggiornamento overtakes Miami GP 2026\n');
  for (const [abbr, n] of Object.entries(OVT)) {
    const pid = pilotByAbbr[abbr];
    if (!pid) continue;
    const { error } = await supabase.from('race_results')
      .update({ overtakes: n })
      .eq('race_id', race.id).eq('pilot_id', pid);
    if (error) console.error(`  ${abbr}: ${error.message}`);
    else if (n > 0) console.log(`  ${abbr}: +${n} ovt (+${Math.min(n*0.5, 3)} pt)`);
  }

  // Verifica trigger ricalcolato
  const { data: scored } = await supabase
    .from('race_results')
    .select('points_scored, position, overtakes, dotd_rank, pilots:pilot_id(abbreviation)')
    .eq('race_id', race.id)
    .order('points_scored', { ascending: false });

  console.log('\n  Punteggi pilota top 12 (con overtake):');
  scored.slice(0, 12).forEach(s => {
    const ovtTxt = s.overtakes > 0 ? ` +${s.overtakes}ovt` : '';
    const dotdTxt = s.dotd_rank ? ` 🏅DOTD${s.dotd_rank}` : '';
    console.log(`    ${s.pilots?.abbreviation} P${s.position ?? 'DNF'}${ovtTxt}${dotdTxt}: ${s.points_scored} pt`);
  });
})();
