/**
 * publish_hungary_2026_results.js — GP Ungheria (Hungaroring), 26/07/2026.
 * Fonti concordi: the-race.com (classifica finale) + Wikipedia/motorsport.com (griglia post-penalità).
 * Griglia: HAM -3 e ANT -3 posti (penalità post-qualifica).
 * DNF: PIA (cambio), PER, BOT (Cadillac).
 * DOTD (top 3): 1° Verstappen (+3), 2° Norris (+2), 3° Antonelli (+1).
 * Sorpassi: li calcola il trigger DB (cap +3). Nessuna eccezione manuale.
 */
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const SORT = 22; // Ungheria
const DRY = process.argv.includes('--dry');

// Griglia di partenza ufficiale post-penalità
const GRID = {
  NOR:1, LEC:2, PIA:3, VER:4, HAM:5, RUS:6, ANT:7, HAD:8, LIN:9, HUL:10,
  LAW:11, GAS:12, COL:13, BOR:14, OCO:15, ALO:16, BEA:17, SAI:18, ALB:19,
  STR:20, BOT:21, PER:22
};

// Classifica finale ufficiale
const RESULTS = [
  { abbr:'NOR', pos:1,    dotd:2,    dnf:false }, // DOTD 2°
  { abbr:'VER', pos:2,    dotd:1,    dnf:false }, // DOTD 1°
  { abbr:'ANT', pos:3,    dotd:3,    dnf:false }, // DOTD 3°
  { abbr:'LEC', pos:4,    dotd:null, dnf:false },
  { abbr:'HAM', pos:5,    dotd:null, dnf:false },
  { abbr:'HAD', pos:6,    dotd:null, dnf:false },
  { abbr:'RUS', pos:7,    dotd:null, dnf:false },
  { abbr:'LAW', pos:8,    dotd:null, dnf:false },
  { abbr:'HUL', pos:9,    dotd:null, dnf:false },
  { abbr:'LIN', pos:10,   dotd:null, dnf:false },
  { abbr:'BOR', pos:11,   dotd:null, dnf:false },
  { abbr:'GAS', pos:12,   dotd:null, dnf:false },
  { abbr:'STR', pos:13,   dotd:null, dnf:false },
  { abbr:'ALO', pos:14,   dotd:null, dnf:false },
  { abbr:'COL', pos:15,   dotd:null, dnf:false },
  { abbr:'OCO', pos:16,   dotd:null, dnf:false },
  { abbr:'ALB', pos:17,   dotd:null, dnf:false },
  { abbr:'SAI', pos:18,   dotd:null, dnf:false },
  { abbr:'BEA', pos:19,   dotd:null, dnf:false },
  { abbr:'PIA', pos:null, dotd:null, dnf:true  }, // cambio
  { abbr:'PER', pos:null, dotd:null, dnf:true  },
  { abbr:'BOT', pos:null, dotd:null, dnf:true  },
];

async function main() {
  const { data: cal } = await sb.from('calendar_events').select('id, location').eq('sort_order', SORT).single();
  const { data: race } = await sb.from('races').select('id').eq('calendar_event_id', cal.id).single();
  const RACE_ID = race.id;
  const { data: pilots } = await sb.from('pilots').select('id, abbreviation, name');
  const byAbbr = Object.fromEntries(pilots.map(p => [p.abbreviation, p]));
  const abbrById = Object.fromEntries(pilots.map(p => [p.id, p.abbreviation]));

  if (RESULTS.length !== 22) throw new Error(`RESULTS ha ${RESULTS.length} righe`);
  for (const r of RESULTS) { if (!byAbbr[r.abbr]) throw new Error(`Pilota mancante: ${r.abbr}`); if (GRID[r.abbr]===undefined) throw new Error(`Grid mancante: ${r.abbr}`); }
  if (Object.values(GRID).sort((a,b)=>a-b).join(',') !== Array.from({length:22},(_,i)=>i+1).join(',')) throw new Error('Griglia non 1..22 univoca');
  console.log(`✓ Validazione OK — ${cal.location} race ${RACE_ID}`);

  if (DRY) { console.log('(--dry: nessuna scrittura)'); return; }

  await sb.from('race_results').delete().eq('race_id', RACE_ID);
  const rows = RESULTS.map(r => ({ race_id: RACE_ID, pilot_id: byAbbr[r.abbr].id, grid_position: GRID[r.abbr], position: r.pos, dotd_rank: r.dotd, dnf: r.dnf }));
  const { error } = await sb.from('race_results').insert(rows);
  if (error) throw error;
  console.log('✓ race_results inseriti (trigger: sorpassi + punti)');

  const { data: dbRes } = await sb.from('race_results')
    .select('grid_position, position, overtakes, dotd_rank, dnf, points_scored, pilots(abbreviation)')
    .eq('race_id', RACE_ID);
  const pts = {};
  console.log('\n--- PUNTI PILOTA ---');
  dbRes.sort((a,b)=>(b.points_scored||0)-(a.points_scored||0)).forEach(r => {
    pts[r.pilots.abbreviation] = r.points_scored || 0;
    console.log(`  ${r.pilots.abbreviation.padEnd(4)} grid=${String(r.grid_position).padStart(2)} pos=${String(r.position||'-').padStart(2)} ovt=${r.overtakes||0} dotd=${r.dotd_rank||'-'} pts=${r.points_scored}${r.dnf?' [DNF]':''}`);
  });

  const { data: teams } = await sb.from('teams').select('id, name');
  const tName = Object.fromEntries(teams.map(t=>[t.id,t.name]));
  const { data: lu } = await sb.from('lineups').select('team_id, pilot_id, is_reserve').eq('race_id', RACE_ID);
  const teamPts = {}, reserves = {};
  lu.forEach(l => { const a = abbrById[l.pilot_id]; if (l.is_reserve) reserves[l.team_id] = a; else teamPts[l.team_id] = (teamPts[l.team_id]||0) + (pts[a]||0); });
  console.log('\n--- CLASSIFICA GP (titolari) ---');
  Object.entries(teamPts).sort((a,b)=>b[1]-a[1]).forEach(([tid,p],i)=>
    console.log(`  ${i+1}. ${tName[tid].padEnd(24)} ${p} pt${reserves[tid]?`   (ris ${reserves[tid]}=${pts[reserves[tid]]||0})`:''}`));
  console.log('\n✅ GP Ungheria pubblicato.');
}
main().catch(e => { console.error('ERRORE:', e.message || e); process.exit(1); });
