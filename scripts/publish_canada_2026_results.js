const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwY2h1dXF3a25sZHFland4dGF6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjAwMDkxNCwiZXhwIjoyMDg3NTc2OTE0fQ.kyBXfpPY0xvbqNDxpvZLfi75m0abEcSNpx3k39qH60I';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, SERVICE_ROLE_KEY);

const RACE_ID = '75d74cc1-386e-4b47-bfde-93facdf50cbd'; // Canada 2026-05-24

// Griglia di partenza ufficiale (formula1.com)
const GRID = {
  RUS:1, ANT:2, NOR:3, PIA:4, HAM:5, VER:6, HAD:7, LEC:8, LIN:9, COL:10,
  HUL:11, LAW:12, BOR:13, GAS:14, SAI:15, BEA:16, OCO:17, ALB:18, ALO:19,
  PER:20, BOT:21, STR:22
};

// Classifica finale ufficiale (formula1.com / gpfans / wikipedia)
// DOTD secondo indicazione utente (HAM=1, ANT=2, VER=3)
const RESULTS = [
  { abbr:'ANT', pos:1,    dotd:2,    dnf:false },
  { abbr:'HAM', pos:2,    dotd:1,    dnf:false },
  { abbr:'VER', pos:3,    dotd:3,    dnf:false },
  { abbr:'LEC', pos:4,    dotd:null, dnf:false },
  { abbr:'HAD', pos:5,    dotd:null, dnf:false },
  { abbr:'COL', pos:6,    dotd:null, dnf:false },
  { abbr:'LAW', pos:7,    dotd:null, dnf:false },
  { abbr:'GAS', pos:8,    dotd:null, dnf:false },
  { abbr:'SAI', pos:9,    dotd:null, dnf:false },
  { abbr:'BEA', pos:10,   dotd:null, dnf:false },
  { abbr:'PIA', pos:11,   dotd:null, dnf:false },
  { abbr:'HUL', pos:12,   dotd:null, dnf:false },
  { abbr:'BOR', pos:13,   dotd:null, dnf:false },
  { abbr:'OCO', pos:14,   dotd:null, dnf:false },
  { abbr:'STR', pos:15,   dotd:null, dnf:false },
  { abbr:'BOT', pos:16,   dotd:null, dnf:false },
  { abbr:'PER', pos:null, dotd:null, dnf:true  },
  { abbr:'NOR', pos:null, dotd:null, dnf:true  },
  { abbr:'RUS', pos:null, dotd:null, dnf:true  },
  { abbr:'ALO', pos:null, dotd:null, dnf:true  },
  { abbr:'ALB', pos:null, dotd:null, dnf:true  },
  { abbr:'LIN', pos:null, dotd:null, dnf:true  }, // DNS gestito come DNF
];

async function main() {
  console.log('Lookup pilot IDs by abbreviation...');
  const { data: pilots, error: pe } = await sb.from('pilots').select('id, abbreviation, name');
  if (pe) throw pe;
  const byAbbr = Object.fromEntries(pilots.map(p => [p.abbreviation, p]));

  // Verifica copertura
  for (const r of RESULTS) {
    if (!byAbbr[r.abbr]) throw new Error(`Pilota mancante: ${r.abbr}`);
    if (GRID[r.abbr] === undefined) throw new Error(`Grid mancante: ${r.abbr}`);
  }

  console.log(`\nDeleting existing race_results for Canada GP ${RACE_ID}...`);
  const { error: delErr } = await sb.from('race_results').delete().eq('race_id', RACE_ID);
  if (delErr) throw delErr;

  console.log('Inserting new race_results...');
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

  console.log('Recomputing team scores via RPC recompute_team_race_scores...');
  const { error: rpcErr } = await sb.rpc('recompute_team_race_scores', { p_race_id: RACE_ID });
  if (rpcErr) throw rpcErr;

  console.log('\n--- VERIFICA RESULTS DAL DB ---');
  const { data: dbRes } = await sb.from('race_results').select('*, pilots(abbreviation, name)').eq('race_id', RACE_ID).order('points_scored', { ascending: false });
  dbRes.forEach(r => {
    const dnf = r.dnf ? ' [DNF]' : '';
    console.log(`  ${r.pilots.abbreviation.padEnd(4)} ${r.pilots.name.padEnd(28)} grid=${String(r.grid_position).padStart(2)} → pos=${String(r.position||'-').padStart(2)} ovt=${r.overtakes||0} dotd=${r.dotd_rank||'-'} pts=${r.points_scored}${dnf}`);
  });

  console.log('\n--- TEAM RACE SCORES ---');
  const { data: trs } = await sb.from('team_race_scores').select('*, teams(name)').eq('race_id', RACE_ID).order('points', { ascending: false });
  trs.forEach((t,i) => console.log(`  ${i+1}. ${t.teams.name.padEnd(28)} ${t.points} pt`));

  console.log('\nDone.');
}

main().catch(e => { console.error('ERROR:', e); process.exit(1); });
