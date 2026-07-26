const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwY2h1dXF3a25sZHFland4dGF6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjAwMDkxNCwiZXhwIjoyMDg3NTc2OTE0fQ.kyBXfpPY0xvbqNDxpvZLfi75m0abEcSNpx3k39qH60I';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, SERVICE_ROLE_KEY);

const RACE_ID = 'a52f3faa-fbef-46c1-8b1c-30c30b0c5e59'; // Belgio (Spa) 2026-07-19

// Griglia di partenza ufficiale post-penalità (formula1.com)
// NOR -10 (PU), STR -10 (PU); HAD e ALO partiti dalla pit lane (P21/P22)
const GRID = {
  ANT:1, VER:2, RUS:3, LEC:4, HAM:5, PIA:6, LIN:7, BOR:8, LAW:9, GAS:10,
  COL:11, HUL:12, NOR:13, BEA:14, ALB:15, OCO:16, BOT:17, PER:18, SAI:19,
  STR:20, HAD:21, ALO:22
};

// Classifica finale ufficiale (formula1.com / gpfans)
// DOTD secondo indicazione utente: LEC=1, ANT=2, HAD=3
const RESULTS = [
  { abbr:'ANT', pos:1,    dotd:2,    dnf:false },
  { abbr:'LEC', pos:2,    dotd:1,    dnf:false },
  { abbr:'VER', pos:3,    dotd:null, dnf:false },
  { abbr:'HAM', pos:4,    dotd:null, dnf:false },
  { abbr:'PIA', pos:5,    dotd:null, dnf:false },
  { abbr:'HAD', pos:6,    dotd:3,    dnf:false },
  { abbr:'NOR', pos:7,    dotd:null, dnf:false },
  { abbr:'BOR', pos:8,    dotd:null, dnf:false },
  { abbr:'LIN', pos:9,    dotd:null, dnf:false },
  { abbr:'COL', pos:10,   dotd:null, dnf:false },
  { abbr:'GAS', pos:11,   dotd:null, dnf:false },
  { abbr:'LAW', pos:12,   dotd:null, dnf:false },
  { abbr:'HUL', pos:13,   dotd:null, dnf:false },
  { abbr:'BEA', pos:14,   dotd:null, dnf:false },
  { abbr:'ALB', pos:15,   dotd:null, dnf:false },
  { abbr:'SAI', pos:16,   dotd:null, dnf:false },
  { abbr:'OCO', pos:17,   dotd:null, dnf:false },
  { abbr:'BOT', pos:18,   dotd:null, dnf:false },
  { abbr:'ALO', pos:19,   dotd:null, dnf:false },
  { abbr:'STR', pos:null, dotd:null, dnf:true  },
  { abbr:'PER', pos:null, dotd:null, dnf:true  },
  { abbr:'RUS', pos:null, dotd:null, dnf:true  }, // contatto con HAM al via
];

async function main() {
  console.log('Lookup pilot IDs by abbreviation...');
  const { data: pilots, error: pe } = await sb.from('pilots').select('id, abbreviation, name');
  if (pe) throw pe;
  const byAbbr = Object.fromEntries(pilots.map(p => [p.abbreviation, p]));

  for (const r of RESULTS) {
    if (!byAbbr[r.abbr]) throw new Error(`Pilota mancante: ${r.abbr}`);
    if (GRID[r.abbr] === undefined) throw new Error(`Grid mancante: ${r.abbr}`);
  }
  if (RESULTS.length !== 22) throw new Error(`Attesi 22 risultati, trovati ${RESULTS.length}`);

  console.log(`\nDeleting existing race_results for Belgio GP ${RACE_ID}...`);
  const { error: delErr } = await sb.from('race_results').delete().eq('race_id', RACE_ID);
  if (delErr) throw delErr;

  console.log('Inserting new race_results (il trigger calcola sorpassi e punti)...');
  const rows = RESULTS.map(r => ({
    race_id: RACE_ID,
    pilot_id: byAbbr[r.abbr].id,
    grid_position: GRID[r.abbr],
    position: r.pos,
    dotd_rank: r.dotd,
    dnf: r.dnf,
  }));
  const { error: insErr } = await sb.from('race_results').insert(rows);
  if (insErr) throw insErr;

  console.log('\n--- VERIFICA RESULTS DAL DB ---');
  const { data: dbRes } = await sb.from('race_results').select('*, pilots(abbreviation, name)').eq('race_id', RACE_ID).order('points_scored', { ascending: false });
  dbRes.forEach(r => {
    const dnf = r.dnf ? ' [DNF]' : '';
    console.log(`  ${r.pilots.abbreviation.padEnd(4)} ${r.pilots.name.padEnd(28)} grid=${String(r.grid_position).padStart(2)} → pos=${String(r.position||'-').padStart(2)} ovt=${r.overtakes||0} dotd=${r.dotd_rank||'-'} pts=${r.points_scored}${dnf}`);
  });

  // Punteggi squadra dai titolari (la RPC recompute_team_race_scores è rotta e inutilizzata)
  console.log('\n--- PUNTEGGI SQUADRA (somma titolari) ---');
  const { data: lineups } = await sb.from('lineups').select('team_id, pilot_id, is_reserve, teams(name)').eq('race_id', RACE_ID);
  const ptsByPilot = Object.fromEntries(dbRes.map(r => [r.pilot_id, r.points_scored || 0]));
  const teamTotals = {};
  lineups.filter(l => !l.is_reserve).forEach(l => {
    teamTotals[l.teams.name] = (teamTotals[l.teams.name] || 0) + ptsByPilot[l.pilot_id];
  });
  Object.entries(teamTotals).sort((a,b) => b[1]-a[1]).forEach(([name, pts], i) => {
    console.log(`  ${i+1}. ${name.padEnd(28)} ${pts} pt`);
  });

  console.log('\nDone.');
}

main().catch(e => { console.error('ERROR:', e); process.exit(1); });
