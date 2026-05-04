/**
 * insert_miami_gp_2026.js
 * Risultati ufficiali Miami GP 2026 (03/05/2026, sort_order=9)
 * Fonti: formula1.com, racingnews365.com, crash.net, sky sports.
 *
 * Vincitore: Antonelli (3a vittoria consecutiva)
 * FL: Norris  (DB non traccia fastest_lap → il bonus FL non viene applicato)
 * DOTD: 1° VER (26.3%), 2° ANT (18.3%), 3° LEC (13.2%)
 * DNF: HUL, LAW, GAS, HAD
 * Penalità: LEC +20s (da P6 a P8), VER +5s (resta P5)
 */
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwY2h1dXF3a25sZHFland4dGF6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjAwMDkxNCwiZXhwIjoyMDg3NTc2OTE0fQ.kyBXfpPY0xvbqNDxpvZLfi75m0abEcSNpx3k39qH60I';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, SK);

const SORT_ORDER = 9;

const RESULTS = [
  { abbr: 'ANT', pos: 1,  dnf: false, dotd: 2 },           // Driver of the Day 2°
  { abbr: 'NOR', pos: 2,  dnf: false },                    // Fastest Lap (non scorato in DB)
  { abbr: 'PIA', pos: 3,  dnf: false },
  { abbr: 'RUS', pos: 4,  dnf: false },
  { abbr: 'VER', pos: 5,  dnf: false, dotd: 1 },           // Driver of the Day 1°
  { abbr: 'HAM', pos: 6,  dnf: false },
  { abbr: 'COL', pos: 7,  dnf: false },
  { abbr: 'LEC', pos: 8,  dnf: false, dotd: 3 },           // 20s penalty: P6 → P8. DOTD 3°
  { abbr: 'SAI', pos: 9,  dnf: false },
  { abbr: 'ALB', pos: 10, dnf: false },
  { abbr: 'BEA', pos: 11, dnf: false },
  { abbr: 'BOR', pos: 12, dnf: false },
  { abbr: 'OCO', pos: 13, dnf: false },
  { abbr: 'LIN', pos: 14, dnf: false },
  { abbr: 'ALO', pos: 15, dnf: false },
  { abbr: 'PER', pos: 16, dnf: false },
  { abbr: 'STR', pos: 17, dnf: false },
  { abbr: 'BOT', pos: 18, dnf: false },
  { abbr: 'HUL', pos: null, dnf: true },
  { abbr: 'LAW', pos: null, dnf: true },
  { abbr: 'GAS', pos: null, dnf: true },
  { abbr: 'HAD', pos: null, dnf: true },
];

(async () => {
  console.log('🏁 Miami GP 2026 — risultati ufficiali');

  const { data: pilots } = await supabase.from('pilots').select('id, abbreviation');
  const pilotByAbbr = Object.fromEntries(pilots.map(p => [p.abbreviation, p.id]));

  const { data: cal } = await supabase.from('calendar_events').select('id').eq('sort_order', SORT_ORDER).single();

  let { data: race } = await supabase.from('races').select('id').eq('calendar_event_id', cal.id).maybeSingle();
  if (!race) {
    const { data: c } = await supabase.from('races').insert({ calendar_event_id: cal.id, is_sprint: false }).select('id').single();
    race = c;
  } else {
    await supabase.from('races').update({ is_sprint: false }).eq('id', race.id);
  }

  await supabase.from('race_results').delete().eq('race_id', race.id);

  const rows = RESULTS.map(r => ({
    race_id: race.id,
    pilot_id: pilotByAbbr[r.abbr],
    position: r.pos,
    overtakes: 0,
    dotd_rank: r.dotd || null,
    dnf: r.dnf,
  }));

  const { error } = await supabase.from('race_results').insert(rows);
  if (error) { console.error(error); return; }
  console.log(`  ✅ ${rows.length} race_results inseriti (race_id ${race.id})`);

  // Verifica trigger
  const { data: scored } = await supabase
    .from('race_results')
    .select('points_scored, position, dnf, dotd_rank, pilots:pilot_id(abbreviation)')
    .eq('race_id', race.id)
    .order('points_scored', { ascending: false });

  console.log('\n  Punteggi pilota (top 12):');
  scored.slice(0, 12).forEach(s => {
    const dotdLabel = s.dotd_rank ? ` 🏅DOTD${s.dotd_rank}` : '';
    console.log(`    ${s.pilots?.abbreviation} P${s.position ?? 'DNF'}${dotdLabel}: ${s.points_scored} pt`);
  });
})();
