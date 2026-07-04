/**
 * publish_austria_2026_results.js — GP Austria (Red Bull Ring), 28/06/2026.
 * Fonti ufficiali: formula1.com / GPFans (classifica finale) + Wikipedia (griglia).
 * DOTD (fan vote ufficiale, 2 fonti concordi): 1° VER 39.6%, 2° RUS 11.4%, 3° HAM 10.3%.
 * Sorpassi: li calcola il trigger DB (nessuna eccezione manuale).
 * NB: NON uso la RPC recompute_team_race_scores (rotta). Calcolo i totali squadra
 * sommando i points_scored dei titolari via lineups.
 */
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const RACE_ID = '6135eb2e-5034-420e-af32-b86e8a2ecd03'; // Austria sort_order 17
const DRY = process.argv.includes('--dry');

// Griglia di partenza ufficiale P1–P22
const GRID = {
  RUS:1, LEC:2, HAM:3, ANT:4, VER:5, NOR:6, PIA:7, HAD:8, LAW:9, LIN:10,
  GAS:11, BOR:12, BEA:13, HUL:14, OCO:15, COL:16, SAI:17, ALB:18, PER:19,
  BOT:20, ALO:21, STR:22
};

// Classifica finale ufficiale (dopo penalità)
const RESULTS = [
  { abbr:'RUS', pos:1,    dotd:2,    dnf:false }, // DOTD 2°
  { abbr:'VER', pos:2,    dotd:1,    dnf:false }, // DOTD 1°
  { abbr:'ANT', pos:3,    dotd:null, dnf:false },
  { abbr:'PIA', pos:4,    dotd:null, dnf:false },
  { abbr:'HAM', pos:5,    dotd:3,    dnf:false }, // DOTD 3°
  { abbr:'HAD', pos:6,    dotd:null, dnf:false },
  { abbr:'NOR', pos:7,    dotd:null, dnf:false },
  { abbr:'LEC', pos:8,    dotd:null, dnf:false },
  { abbr:'LAW', pos:9,    dotd:null, dnf:false },
  { abbr:'LIN', pos:10,   dotd:null, dnf:false },
  { abbr:'BOR', pos:11,   dotd:null, dnf:false },
  { abbr:'HUL', pos:12,   dotd:null, dnf:false },
  { abbr:'GAS', pos:13,   dotd:null, dnf:false },
  { abbr:'BEA', pos:14,   dotd:null, dnf:false },
  { abbr:'COL', pos:15,   dotd:null, dnf:false },
  { abbr:'OCO', pos:16,   dotd:null, dnf:false },
  { abbr:'ALB', pos:17,   dotd:null, dnf:false },
  { abbr:'ALO', pos:18,   dotd:null, dnf:false },
  { abbr:'STR', pos:null, dotd:null, dnf:true  }, // ERS
  { abbr:'SAI', pos:null, dotd:null, dnf:true  }, // elettrico
  { abbr:'PER', pos:null, dotd:null, dnf:true  }, // freni
  { abbr:'BOT', pos:null, dotd:null, dnf:true  }, // freni
];

async function main() {
  const { data: pilots } = await sb.from('pilots').select('id, abbreviation, name, owner_team_id');
  const byAbbr = Object.fromEntries(pilots.map(p => [p.abbreviation, p]));

  // Validazione copertura
  if (RESULTS.length !== 22) throw new Error(`RESULTS ha ${RESULTS.length} righe, attese 22`);
  for (const r of RESULTS) {
    if (!byAbbr[r.abbr]) throw new Error(`Pilota mancante: ${r.abbr}`);
    if (GRID[r.abbr] === undefined) throw new Error(`Grid mancante: ${r.abbr}`);
  }
  const gridVals = Object.values(GRID).sort((a,b)=>a-b).join(',');
  if (gridVals !== Array.from({length:22},(_,i)=>i+1).join(',')) throw new Error('Griglia non 1..22 univoca');
  console.log('✓ Validazione OK (22 piloti, griglia 1..22 univoca)');

  if (DRY) { console.log('(--dry: nessuna scrittura)'); return; }

  await sb.from('race_results').delete().eq('race_id', RACE_ID);
  const rows = RESULTS.map(r => ({
    race_id: RACE_ID, pilot_id: byAbbr[r.abbr].id,
    grid_position: GRID[r.abbr], position: r.pos, dotd_rank: r.dotd, dnf: r.dnf,
  }));
  const { error: insErr } = await sb.from('race_results').insert(rows);
  if (insErr) throw insErr;
  console.log('✓ race_results inseriti (trigger ha calcolato sorpassi + punti)');

  // Rileggi con punti
  const { data: dbRes } = await sb.from('race_results')
    .select('grid_position, position, overtakes, dotd_rank, dnf, points_scored, pilots(abbreviation, name, owner_team_id)')
    .eq('race_id', RACE_ID);
  const ptsByPilotAbbr = {};
  console.log('\n--- PUNTI PILOTA ---');
  dbRes.sort((a,b)=>(b.points_scored||0)-(a.points_scored||0)).forEach(r => {
    ptsByPilotAbbr[r.pilots.abbreviation] = r.points_scored || 0;
    console.log(`  ${r.pilots.abbreviation.padEnd(4)} ${r.pilots.name.padEnd(22)} grid=${String(r.grid_position).padStart(2)} pos=${String(r.position||'-').padStart(2)} ovt=${r.overtakes||0} dotd=${r.dotd_rank||'-'} pts=${r.points_scored}${r.dnf?' [DNF]':''}`);
  });

  // Totali squadra: somma titolari (is_reserve=false) via lineups
  const { data: teams } = await sb.from('teams').select('id, name');
  const teamName = Object.fromEntries(teams.map(t=>[t.id,t.name]));
  const { data: lineups } = await sb.from('lineups')
    .select('team_id, pilot_id, is_reserve').eq('race_id', RACE_ID).eq('is_reserve', false);
  const abbrById = Object.fromEntries(pilots.map(p=>[p.id, p.abbreviation]));
  const teamPts = {};
  lineups.forEach(l => {
    const abbr = abbrById[l.pilot_id];
    teamPts[l.team_id] = (teamPts[l.team_id]||0) + (ptsByPilotAbbr[abbr]||0);
  });
  console.log('\n--- CLASSIFICA GP (titolari) ---');
  Object.entries(teamPts).sort((a,b)=>b[1]-a[1]).forEach(([tid,pts],i)=>
    console.log(`  ${i+1}. ${teamName[tid].padEnd(24)} ${pts} pt`));
  console.log('\n✅ Austria pubblicato.');
}
main().catch(e => { console.error('ERRORE:', e.message || e); process.exit(1); });
