/**
 * insert_miami_sprint_2026.js
 * Risultati ufficiali Miami Sprint 2026 (02/05/2026, sort_order=8 nel calendario)
 * + formazioni schierate dai 6 team.
 * Fonte: formula1.com / racingnews365.com (con penalità Antonelli e DSQ Bortoleto applicate)
 */
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwY2h1dXF3a25sZHFland4dGF6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjAwMDkxNCwiZXhwIjoyMDg3NTc2OTE0fQ.kyBXfpPY0xvbqNDxpvZLfi75m0abEcSNpx3k39qH60I';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, SERVICE_ROLE_KEY);

const SORT_ORDER = 8;

const SPRINT_RESULTS = [
  { abbr: 'NOR', pos: 1,  dnf: false },
  { abbr: 'PIA', pos: 2,  dnf: false },
  { abbr: 'LEC', pos: 3,  dnf: false },
  { abbr: 'RUS', pos: 4,  dnf: false },
  { abbr: 'VER', pos: 5,  dnf: false },
  { abbr: 'ANT', pos: 6,  dnf: false }, // 5s penalty (track limits) → da P4 a P6
  { abbr: 'HAM', pos: 7,  dnf: false },
  { abbr: 'GAS', pos: 8,  dnf: false },
  { abbr: 'HAD', pos: 9,  dnf: false },
  { abbr: 'COL', pos: 10, dnf: false },
  { abbr: 'OCO', pos: 11, dnf: false },
  { abbr: 'BEA', pos: 12, dnf: false },
  { abbr: 'SAI', pos: 13, dnf: false },
  { abbr: 'LAW', pos: 14, dnf: false },
  { abbr: 'ALO', pos: 15, dnf: false },
  { abbr: 'PER', pos: 16, dnf: false },
  { abbr: 'STR', pos: 17, dnf: false },
  { abbr: 'ALB', pos: 18, dnf: false },
  { abbr: 'BOT', pos: 19, dnf: false },
  { abbr: 'BOR', pos: null, dnf: true }, // DSQ engine technical infringement
  { abbr: 'HUL', pos: null, dnf: true }, // DNS
  { abbr: 'LIN', pos: null, dnf: true }, // DNS
];

// Formazioni: 3 titolari (+ riserva se rosa = 4)
const LINEUPS = [
  { team: 'Scudemaria Ferrari',     starters: ['ALO','ANT','HAD'], reserve: 'BOT' },
  { team: 'Abdull Mazzar',          starters: ['LEC','NOR','PIA'], reserve: 'VER' },
  { team: 'Alpha Chiro Racing',     starters: ['RUS','HUL','ALB'], reserve: 'SAI' },
  { team: 'SF – Scuderia Fainelli', starters: ['BEA','PER','STR'], reserve: null  },
  { team: 'Ranocchiettos',          starters: ['HAM','OCO','GAS'], reserve: 'LAW' },
  { team: 'ZetaRacing',             starters: ['BOR','LIN','COL'], reserve: null  },
];

async function run() {
  console.log('🏎️  Miami Sprint 2026 — risultati + formazioni\n');

  const { data: pilots } = await supabase.from('pilots').select('id, abbreviation');
  const { data: teams } = await supabase.from('teams').select('id, name');
  const pilotByAbbr = Object.fromEntries(pilots.map(p => [p.abbreviation, p.id]));
  const teamByName = Object.fromEntries(teams.map(t => [t.name, t.id]));

  // 1. Trova calendar event
  const { data: calEv, error: eCal } = await supabase
    .from('calendar_events')
    .select('id, location, event_type')
    .eq('sort_order', SORT_ORDER).single();
  if (eCal) { console.error('calendar_event non trovato', eCal); process.exit(1); }
  console.log(`Evento: ${calEv.location} (${calEv.event_type})`);

  // 2. Crea/aggiorna race row sprint
  let raceId;
  const { data: existingRace } = await supabase
    .from('races').select('id').eq('calendar_event_id', calEv.id).maybeSingle();
  if (existingRace) {
    raceId = existingRace.id;
    await supabase.from('races').update({ is_sprint: true }).eq('id', raceId);
    console.log(`  Race esistente, is_sprint=true (id ${raceId})`);
  } else {
    const { data: newRace, error: eRace } = await supabase
      .from('races').insert({ calendar_event_id: calEv.id, is_sprint: true })
      .select('id').single();
    if (eRace) { console.error(eRace); process.exit(1); }
    raceId = newRace.id;
    console.log(`  Race creata (id ${raceId})`);
  }

  // 3. Cancella e reinserisci race_results
  await supabase.from('race_results').delete().eq('race_id', raceId);
  const rrRows = SPRINT_RESULTS.filter(r => pilotByAbbr[r.abbr]).map(r => ({
    race_id: raceId,
    pilot_id: pilotByAbbr[r.abbr],
    position: r.pos,
    overtakes: 0,
    dotd_rank: null,
    dnf: r.dnf,
  }));
  const { error: eRR } = await supabase.from('race_results').insert(rrRows);
  if (eRR) console.error('  ERR results:', eRR.message);
  else console.log(`  ${rrRows.length} race_results inseriti`);

  // 4. Cancella e reinserisci lineups per ogni team
  console.log('\n--- Formazioni ---');
  for (const lu of LINEUPS) {
    const teamId = teamByName[lu.team];
    if (!teamId) { console.error(`  team non trovato: ${lu.team}`); continue; }
    await supabase.from('lineups').delete().eq('race_id', raceId).eq('team_id', teamId);

    const rows = lu.starters.map(abbr => ({
      race_id: raceId,
      team_id: teamId,
      pilot_id: pilotByAbbr[abbr],
      is_reserve: false,
      subbed_in_manually: false,
      subbed_out_for: null,
    }));
    if (lu.reserve) rows.push({
      race_id: raceId,
      team_id: teamId,
      pilot_id: pilotByAbbr[lu.reserve],
      is_reserve: true,
      subbed_in_manually: false,
      subbed_out_for: null,
    });

    const { error: eL } = await supabase.from('lineups').insert(rows);
    if (eL) console.error(`  ERR ${lu.team}: ${eL.message}`);
    else console.log(`  ${lu.team}: ${lu.starters.join(' / ')}${lu.reserve ? ' [+' + lu.reserve + ']' : ''}`);
  }

  // 5. Riepilogo punteggi sprint
  console.log('\n--- Punteggi sprint (verifica trigger) ---');
  const { data: scored } = await supabase
    .from('race_results')
    .select('points_scored, position, dnf, pilots:pilot_id(abbreviation)')
    .eq('race_id', raceId)
    .order('points_scored', { ascending: false });
  scored.slice(0, 10).forEach(s => {
    console.log(`  ${s.pilots?.abbreviation} P${s.position ?? 'DNF'}: ${s.points_scored} pt`);
  });

  console.log('\n✅ Miami Sprint inserita.');
}

run().catch(console.error);
