/**
 * publish_silverstone_sprint_2026_results.js — SPRINT GP Gran Bretagna (Silverstone), 04/07/2026.
 * Fonti concordi: the-race.com (classifica completa) + RacingNews365/PlanetF1 (podio).
 * Sprint: punteggio SOLO piazzamento top 8 (8-7-6-5-4-3-2-1). Niente sorpassi, niente DOTD.
 * Nessun DNF. scoring.js applica la tabella sprint via race.isSprint.
 * grid_position = position (irrilevante nelle sprint, evita sorpassi fantasma).
 */
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const RACE_ID = '7bcfa798-471c-4617-9283-da732dd2b5d5'; // Gran Bretagna sprint, sort_order 18
const DRY = process.argv.includes('--dry');

// Ordine d'arrivo ufficiale della Sprint (P1..P22)
const ORDER = ['ANT','HAM','NOR','RUS','LEC','VER','PIA','LAW','HAD','LIN','GAS','COL','HUL','BOR','BEA','OCO','SAI','ALB','BOT','ALO','STR','PER'];
const SPRINT_POINTS = {1:8,2:7,3:6,4:5,5:4,6:3,7:2,8:1};

async function main() {
  const { data: pilots } = await sb.from('pilots').select('id, abbreviation, name');
  const byAbbr = Object.fromEntries(pilots.map(p => [p.abbreviation, p]));
  const abbrById = Object.fromEntries(pilots.map(p => [p.id, p.abbreviation]));

  if (ORDER.length !== 22) throw new Error(`ORDER ha ${ORDER.length} piloti, attesi 22`);
  const uniq = new Set(ORDER);
  if (uniq.size !== 22) throw new Error('Abbreviazioni duplicate in ORDER');
  for (const a of ORDER) if (!byAbbr[a]) throw new Error(`Pilota mancante: ${a}`);
  console.log('✓ Validazione OK (22 piloti unici)');

  // Verifica che sia una sprint
  const { data: race } = await sb.from('races').select('id, is_sprint').eq('id', RACE_ID).single();
  if (!race.is_sprint) throw new Error('La race non è marcata come sprint!');

  if (DRY) { console.log('(--dry: nessuna scrittura)'); return; }

  await sb.from('race_results').delete().eq('race_id', RACE_ID);
  const rows = ORDER.map((abbr, i) => ({
    race_id: RACE_ID, pilot_id: byAbbr[abbr].id,
    grid_position: i + 1, position: i + 1, dotd_rank: null, dnf: false,
  }));
  const { error } = await sb.from('race_results').insert(rows);
  if (error) throw error;
  console.log('✓ race_results sprint inseriti');

  // Punti pilota (tabella sprint, calcolati qui)
  console.log('\n--- PUNTI PILOTA (sprint) ---');
  ORDER.forEach((abbr, i) => {
    const pos = i + 1; const pts = SPRINT_POINTS[pos] || 0;
    if (pos <= 10) console.log(`  P${String(pos).padStart(2)} ${abbr.padEnd(4)} ${byAbbr[abbr].name.padEnd(22)} ${pts} pt`);
  });
  console.log('  (dal 9° in giù = 0 pt)');

  // Totali squadra: somma titolari via lineups
  const { data: teams } = await sb.from('teams').select('id, name');
  const teamName = Object.fromEntries(teams.map(t => [t.id, t.name]));
  const { data: lineups } = await sb.from('lineups').select('team_id, pilot_id, is_reserve').eq('race_id', RACE_ID).eq('is_reserve', false);
  const posByAbbr = Object.fromEntries(ORDER.map((a, i) => [a, i + 1]));
  const teamPts = {};
  lineups.forEach(l => {
    const abbr = abbrById[l.pilot_id];
    teamPts[l.team_id] = (teamPts[l.team_id] || 0) + (SPRINT_POINTS[posByAbbr[abbr]] || 0);
  });
  console.log('\n--- CLASSIFICA SPRINT (titolari) ---');
  Object.entries(teamPts).sort((a,b)=>b[1]-a[1]).forEach(([tid,pts],i)=>
    console.log(`  ${i+1}. ${teamName[tid].padEnd(24)} ${pts} pt`));
  console.log('\n✅ Sprint Silverstone pubblicata.');
}
main().catch(e => { console.error('ERRORE:', e.message || e); process.exit(1); });
