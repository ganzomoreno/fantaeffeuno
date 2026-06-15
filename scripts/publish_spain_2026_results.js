const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, SERVICE_ROLE_KEY);

const RACE_ID = '95e1c8db-3d40-4bba-8484-366dcfeb0664'; // Spagna (Barcellona) 2026-06-14

// ── Griglia di partenza ufficiale (qualifiche, formula1.com / crash.net / total-motorsport) ──
// Pole RUSSELL. Leclerc P10 (crash in Q3, nessun tempo).
const GRID = {
  RUS:1, HAM:2, ANT:3, NOR:4, VER:5, HAD:6, PIA:7, LAW:8, HUL:9, LEC:10,
  LIN:11, BOR:12, COL:13, GAS:14, BEA:15, SAI:16, OCO:17, ALB:18, PER:19, BOT:20,
  STR:21, ALO:22,
};

// ── Classifica finale ufficiale (dopo penalità) + DOTD fan vote (formula1.com) ──
// DOTD: 1° HAM (51.9%), 2° VER (8.3%), 3° ANT (7.5% — DNF ma il DOTD vale comunque).
// I sorpassi li calcola il trigger DB: overtakes = max(0, grid - pos), bonus cap +3pt.
const RESULTS = [
  { abbr:'HAM', pos:1,    dotd:1,    dnf:false }, // 1ª vittoria Ferrari, + giro veloce (non conteggiato)
  { abbr:'RUS', pos:2,    dotd:null, dnf:false },
  { abbr:'NOR', pos:3,    dotd:null, dnf:false },
  { abbr:'VER', pos:4,    dotd:2,    dnf:false },
  { abbr:'PIA', pos:5,    dotd:null, dnf:false },
  { abbr:'HAD', pos:6,    dotd:null, dnf:false },
  { abbr:'GAS', pos:7,    dotd:null, dnf:false },
  { abbr:'LAW', pos:8,    dotd:null, dnf:false },
  { abbr:'LIN', pos:9,    dotd:null, dnf:false },
  { abbr:'COL', pos:10,   dotd:null, dnf:false }, // +10s penalità (già nella classifica finale)
  { abbr:'BOR', pos:11,   dotd:null, dnf:false },
  { abbr:'SAI', pos:12,   dotd:null, dnf:false },
  { abbr:'OCO', pos:13,   dotd:null, dnf:false },
  { abbr:'PER', pos:14,   dotd:null, dnf:false },
  { abbr:'LEC', pos:null, dotd:null, dnf:true  },
  { abbr:'ANT', pos:null, dotd:3,    dnf:true  }, // 3° DOTD ma DNF (guasto a 4 giri dalla fine) → vale solo il DOTD (+1)
  { abbr:'BEA', pos:null, dotd:null, dnf:true  },
  { abbr:'ALB', pos:null, dotd:null, dnf:true  },
  { abbr:'ALO', pos:null, dotd:null, dnf:true  },
  { abbr:'HUL', pos:null, dotd:null, dnf:true  },
  { abbr:'BOT', pos:null, dotd:null, dnf:true  },
  { abbr:'STR', pos:null, dotd:null, dnf:true  },
];

// ── Tabelle punteggio (replica di lib/data.js + lib/scoring.js) ──
const POINTS_TABLE = {1:25,2:22,3:20,4:18,5:16,6:15,7:14,8:13,9:12,10:11,11:10,12:9,13:8,14:7,15:6,16:5,17:4,18:3,19:2,20:1,21:0,22:0};
const DOTD_POINTS = {1:3, 2:2, 3:1};
const OVERTAKE_BONUS = 0.5, MAX_OVERTAKE_POINTS = 3;

// Replica esatta di calculatePilotPoints (gara main): DOTD vale anche sui DNF.
function pilotPoints({ position, dnf, overtakes, dotd }) {
  let total = 0;
  if (dotd && DOTD_POINTS[dotd]) total += DOTD_POINTS[dotd];
  if (dnf) return total;
  total += POINTS_TABLE[position] || 0;
  if (overtakes > 0) total += Math.min(overtakes * OVERTAKE_BONUS, MAX_OVERTAKE_POINTS);
  return total;
}

async function main() {
  const { data: pilots, error: pe } = await sb.from('pilots').select('id, abbreviation, name');
  if (pe) throw pe;
  const byAbbr = Object.fromEntries(pilots.map(p => [p.abbreviation, p]));
  const byId = Object.fromEntries(pilots.map(p => [p.id, p]));

  // Verifica copertura: 22 risultati, griglia completa
  if (RESULTS.length !== 22) throw new Error(`Attesi 22 risultati, trovati ${RESULTS.length}`);
  if (Object.keys(GRID).length !== 22) throw new Error('Griglia non completa (servono 22).');
  for (const r of RESULTS) {
    if (!byAbbr[r.abbr]) throw new Error(`Pilota mancante in DB: ${r.abbr}`);
    if (GRID[r.abbr] === undefined) throw new Error(`Grid mancante: ${r.abbr}`);
  }

  console.log(`Cancello eventuali race_results esistenti per Spagna ${RACE_ID}...`);
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

  // NB: NON chiamo recompute_team_race_scores (RPC rotta, vedi runbook).
  // I punteggi squadra li calcola l'app al volo via lib/scoring.js: appena i
  // race_results sono scritti, il sito è già aggiornato. Qui replico lo stesso calcolo.

  // Rileggo i risultati col valore overtakes calcolato dal trigger
  const { data: dbRes } = await sb.from('race_results')
    .select('grid_position, position, overtakes, dotd_rank, dnf, points_scored, pilot_id')
    .eq('race_id', RACE_ID);
  const resByPilot = Object.fromEntries(dbRes.map(r => [r.pilot_id, r]));

  console.log('\n--- RACE_RESULTS (punti calcolati come l\'app, scoring.js) ---');
  const ranked = dbRes.slice().map(r => ({
    abbr: byId[r.pilot_id].abbreviation,
    grid: r.grid_position, pos: r.position, ovt: r.overtakes || 0,
    dotd: r.dotd_rank, dnf: r.dnf,
    pts: pilotPoints({ position: r.position, dnf: r.dnf, overtakes: r.overtakes || 0, dotd: r.dotd_rank }),
  })).sort((a, b) => b.pts - a.pts);
  ranked.forEach(r => {
    const dnf = r.dnf ? ' [DNF]' : '';
    const dotd = r.dotd ? ` DOTD${r.dotd}` : '';
    console.log(`  ${r.abbr.padEnd(4)} grid=${String(r.grid).padStart(2)} → P${String(r.pos||'-').padStart(2)} ovt=${String(r.ovt).padStart(2)}${dotd.padEnd(7)} = ${r.pts} pt${dnf}`);
  });

  // Punteggi squadra: somma dei 3 titolari (is_reserve=false). Niente switch automatici.
  const { data: lu } = await sb.from('lineups')
    .select('team_id, pilot_id, is_reserve, teams(name)')
    .eq('race_id', RACE_ID);
  const teams = {};
  for (const l of lu) {
    const t = (teams[l.team_id] ||= { name: l.teams?.name, starters: [], reserve: null });
    if (l.is_reserve) t.reserve = l.pilot_id; else t.starters.push(l.pilot_id);
  }

  console.log('\n--- PUNTEGGI SQUADRA SPAGNA (solo 3 titolari) ---');
  const teamScores = Object.values(teams).map(t => {
    let total = 0;
    const detail = t.starters.map(pid => {
      const r = resByPilot[pid];
      const pts = r ? pilotPoints({ position: r.position, dnf: r.dnf, overtakes: r.overtakes || 0, dotd: r.dotd_rank }) : 0;
      total += pts;
      const ab = byId[pid].abbreviation;
      return `${ab}${r?.dnf ? '✗' : ''}=${pts}`;
    });
    return { name: t.name, total, detail, reserve: t.reserve ? byId[t.reserve].abbreviation : null };
  }).sort((a, b) => b.total - a.total);
  teamScores.forEach((t, i) => {
    const res = t.reserve ? `  (ris: ${t.reserve})` : '';
    console.log(`  ${i+1}. ${String(t.name).padEnd(26)} ${String(t.total).padStart(5)} pt   [${t.detail.join(', ')}]${res}`);
  });

  console.log('\nFatto. Risultati pubblicati su Supabase (il sito è già aggiornato).');
}

main().catch(e => { console.error('ERRORE:', e); process.exit(1); });
