/**
 * publish_britishgp_2026_results.js — GP Gran Bretagna (Silverstone), 05/07/2026.
 * Fonti concordi: formula1.com (classifica ufficiale post-penalità + griglia) +
 *   the-race.com / Wikipedia (classifica). Griglia Gasly P15 (penalità 3 posti,
 *   confermata da F1.com starting-grid + race report).
 * DNF: VER (crash Stowe), ALB, HUL.
 * DOTD (top 3): 1° Leclerc (+3), 2° Hamilton (+2), 3° Verstappen (+1, vale anche da DNF).
 * Sorpassi: li calcola il trigger DB (cap +3). Nessuna eccezione manuale.
 */
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const RACE_ID = '22ae131c-3321-4a65-995a-5df05aa5cff6'; // Gran Bretagna main, sort_order 19
const DRY = process.argv.includes('--dry');

// Griglia di partenza ufficiale post-penalità (F1.com)
const GRID = {
  ANT:1, LEC:2, HAM:3, RUS:4, HAD:5, NOR:6, VER:7, PIA:8, LIN:9, LAW:10,
  BOR:11, HUL:12, BEA:13, SAI:14, GAS:15, ALB:16, OCO:17, BOT:18, COL:19,
  PER:20, ALO:21, STR:22
};

// Classifica finale ufficiale (dopo penalità; ANT già scontato +5s → P16)
const RESULTS = [
  { abbr:'LEC', pos:1,    dotd:1,    dnf:false }, // DOTD 1°
  { abbr:'RUS', pos:2,    dotd:null, dnf:false },
  { abbr:'HAM', pos:3,    dotd:2,    dnf:false }, // DOTD 2°
  { abbr:'NOR', pos:4,    dotd:null, dnf:false },
  { abbr:'HAD', pos:5,    dotd:null, dnf:false },
  { abbr:'LAW', pos:6,    dotd:null, dnf:false },
  { abbr:'LIN', pos:7,    dotd:null, dnf:false },
  { abbr:'BOR', pos:8,    dotd:null, dnf:false },
  { abbr:'COL', pos:9,    dotd:null, dnf:false },
  { abbr:'GAS', pos:10,   dotd:null, dnf:false },
  { abbr:'PIA', pos:11,   dotd:null, dnf:false },
  { abbr:'SAI', pos:12,   dotd:null, dnf:false },
  { abbr:'BEA', pos:13,   dotd:null, dnf:false },
  { abbr:'OCO', pos:14,   dotd:null, dnf:false },
  { abbr:'PER', pos:15,   dotd:null, dnf:false },
  { abbr:'ANT', pos:16,   dotd:null, dnf:false },
  { abbr:'BOT', pos:17,   dotd:null, dnf:false },
  { abbr:'ALO', pos:18,   dotd:null, dnf:false },
  { abbr:'STR', pos:19,   dotd:null, dnf:false },
  { abbr:'VER', pos:null, dotd:3,    dnf:true  }, // crash Stowe — DOTD 3° (vale anche da DNF)
  { abbr:'ALB', pos:null, dotd:null, dnf:true  },
  { abbr:'HUL', pos:null, dotd:null, dnf:true  },
];

async function main() {
  const { data: pilots } = await sb.from('pilots').select('id, abbreviation, name');
  const byAbbr = Object.fromEntries(pilots.map(p => [p.abbreviation, p]));
  const abbrById = Object.fromEntries(pilots.map(p => [p.id, p.abbreviation]));

  if (RESULTS.length !== 22) throw new Error(`RESULTS ha ${RESULTS.length} righe, attese 22`);
  for (const r of RESULTS) { if (!byAbbr[r.abbr]) throw new Error(`Pilota mancante: ${r.abbr}`); if (GRID[r.abbr]===undefined) throw new Error(`Grid mancante: ${r.abbr}`); }
  const gv = Object.values(GRID).sort((a,b)=>a-b).join(',');
  if (gv !== Array.from({length:22},(_,i)=>i+1).join(',')) throw new Error('Griglia non 1..22 univoca');
  console.log('✓ Validazione OK (22 piloti, griglia 1..22 univoca)');

  if (DRY) { console.log('(--dry: nessuna scrittura)'); return; }

  await sb.from('race_results').delete().eq('race_id', RACE_ID);
  const rows = RESULTS.map(r => ({ race_id: RACE_ID, pilot_id: byAbbr[r.abbr].id, grid_position: GRID[r.abbr], position: r.pos, dotd_rank: r.dotd, dnf: r.dnf }));
  const { error } = await sb.from('race_results').insert(rows);
  if (error) throw error;
  console.log('✓ race_results inseriti (trigger: sorpassi + punti)');

  const { data: dbRes } = await sb.from('race_results')
    .select('grid_position, position, overtakes, dotd_rank, dnf, points_scored, pilots(abbreviation, name)')
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
  console.log('\n✅ GP Gran Bretagna pubblicato.');
}
main().catch(e => { console.error('ERRORE:', e.message || e); process.exit(1); });
