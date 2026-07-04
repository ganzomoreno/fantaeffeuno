const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwY2h1dXF3a25sZHFland4dGF6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjAwMDkxNCwiZXhwIjoyMDg3NTc2OTE0fQ.kyBXfpPY0xvbqNDxpvZLfi75m0abEcSNpx3k39qH60I';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, SERVICE_ROLE_KEY);

const RACE_ID = 'bcabb0a8-4f0f-4adb-873a-cae29409ec8f'; // Monaco 2026-06-07

// ── Griglia di partenza ufficiale (qualifiche, formula1.com / gpfans) ──
const GRID = {
  ANT:1, VER:2, HAM:3, LEC:4, HAD:5, RUS:6, PIA:7, NOR:8, GAS:9, LAW:10,
  ALB:11, SAI:12, HUL:13, COL:14, LIN:15, BOR:16, OCO:17, PER:18, BEA:19,
  BOT:20, ALO:21, STR:22,
};

// ── Classifica finale ufficiale (dopo penalità) + DOTD fan vote ──
// DOTD: 1° ANT (22.4%), 2° LEC (14.1%), 3° HAM (14.1%)
// I sorpassi li calcola il trigger DB: overtakes = max(0, grid - pos), bonus cap +3pt.
const RESULTS = [
  { abbr:'ANT', pos:1,    dotd:1,    dnf:false }, // + giro veloce (non gestito dal DB)
  { abbr:'HAM', pos:2,    dotd:3,    dnf:false },
  { abbr:'HAD', pos:3,    dotd:null, dnf:false },
  { abbr:'PIA', pos:4,    dotd:null, dnf:false },
  { abbr:'LAW', pos:5,    dotd:null, dnf:false },
  { abbr:'LIN', pos:6,    dotd:null, dnf:false },
  { abbr:'GAS', pos:7,    dotd:null, dnf:false },
  { abbr:'ALB', pos:8,    dotd:null, dnf:false },
  { abbr:'OCO', pos:9,    dotd:null, dnf:false },
  { abbr:'ALO', pos:10,   dotd:null, dnf:false },
  { abbr:'BOR', pos:11,   dotd:null, dnf:false },
  { abbr:'RUS', pos:12,   dotd:null, dnf:false },
  { abbr:'HUL', pos:13,   dotd:null, dnf:false },
  { abbr:'COL', pos:14,   dotd:null, dnf:false },
  { abbr:'PER', pos:15,   dotd:null, dnf:false },
  { abbr:'SAI', pos:null, dotd:null, dnf:true  },
  { abbr:'LEC', pos:null, dotd:2,    dnf:true  }, // 2° DOTD ma DNF → 0 pt (DNF azzera)
  { abbr:'STR', pos:null, dotd:null, dnf:true  },
  { abbr:'NOR', pos:null, dotd:null, dnf:true  },
  { abbr:'BEA', pos:null, dotd:null, dnf:true  },
  { abbr:'BOT', pos:null, dotd:null, dnf:true  },
  { abbr:'VER', pos:null, dotd:null, dnf:true  },
];

async function main() {
  const { data: pilots, error: pe } = await sb.from('pilots').select('id, abbreviation, name');
  if (pe) throw pe;
  const byAbbr = Object.fromEntries(pilots.map(p => [p.abbreviation, p]));

  // Verifica copertura: tutti 22 piloti, grid completa
  if (RESULTS.length !== 22) throw new Error(`Attesi 22 risultati, trovati ${RESULTS.length}`);
  for (const r of RESULTS) {
    if (!byAbbr[r.abbr]) throw new Error(`Pilota mancante: ${r.abbr}`);
    if (GRID[r.abbr] === undefined) throw new Error(`Grid mancante: ${r.abbr}`);
  }
  if (Object.keys(GRID).length !== 22) throw new Error('Griglia non completa (servono 22).');

  console.log(`Cancello eventuali race_results esistenti per Monaco ${RACE_ID}...`);
  const { error: delErr } = await sb.from('race_results').delete().eq('race_id', RACE_ID);
  if (delErr) throw delErr;

  console.log('Inserisco i nuovi race_results (il trigger calcola overtakes + punti)...');
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

  console.log('Ricalcolo punteggi squadra (RPC recompute_team_race_scores)...');
  const { error: rpcErr } = await sb.rpc('recompute_team_race_scores', { p_race_id: RACE_ID });
  if (rpcErr) throw rpcErr;

  console.log('\n--- RACE_RESULTS DAL DB (ordinati per punti) ---');
  const { data: dbRes } = await sb.from('race_results')
    .select('grid_position, position, overtakes, dotd_rank, dnf, points_scored, pilots:pilot_id(abbreviation, name)')
    .eq('race_id', RACE_ID).order('points_scored', { ascending: false });
  dbRes.forEach(r => {
    const dnf = r.dnf ? ' [DNF]' : '';
    const dotd = r.dotd_rank ? ` DOTD${r.dotd_rank}` : '';
    console.log(`  ${r.pilots.abbreviation.padEnd(4)} grid=${String(r.grid_position).padStart(2)} → P${String(r.position||'-').padStart(2)} ovt=${String(r.overtakes||0).padStart(2)}${dotd.padEnd(7)} = ${r.points_scored} pt${dnf}`);
  });

  console.log('\n--- PUNTEGGI SQUADRA MONACO ---');
  const { data: trs } = await sb.from('team_race_scores')
    .select('points, teams(name)').eq('race_id', RACE_ID).order('points', { ascending: false });
  trs.forEach((t, i) => console.log(`  ${i+1}. ${t.teams.name.padEnd(26)} ${t.points} pt`));

  console.log('\nFatto.');
}

main().catch(e => { console.error('ERRORE:', e); process.exit(1); });
