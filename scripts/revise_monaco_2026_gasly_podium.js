const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, SERVICE_ROLE_KEY);

const RACE_ID = 'bcabb0a8-4f0f-4adb-873a-cae29409ec8f'; // Monaco 2026-06-07

// Griglia ufficiale (INVARIATA).
const GRID = {
  ANT:1, VER:2, HAM:3, LEC:4, HAD:5, RUS:6, PIA:7, NOR:8, GAS:9, LAW:10,
  ALB:11, SAI:12, HUL:13, COL:14, LIN:15, BOR:16, OCO:17, PER:18, BEA:19,
  BOT:20, ALO:21, STR:22,
};

// Classifica ORIGINALE (penalità Gasly +2x5s → P7).
const RESULTS_OLD = [
  { abbr:'ANT', pos:1,  dotd:1 }, { abbr:'HAM', pos:2,  dotd:3 }, { abbr:'HAD', pos:3 },
  { abbr:'PIA', pos:4 }, { abbr:'LAW', pos:5 }, { abbr:'LIN', pos:6 }, { abbr:'GAS', pos:7 },
  { abbr:'ALB', pos:8 }, { abbr:'OCO', pos:9 }, { abbr:'ALO', pos:10 }, { abbr:'BOR', pos:11 },
  { abbr:'RUS', pos:12 }, { abbr:'HUL', pos:13 }, { abbr:'COL', pos:14 }, { abbr:'PER', pos:15 },
  { abbr:'SAI', dnf:true }, { abbr:'LEC', dnf:true, dotd:2 }, { abbr:'STR', dnf:true },
  { abbr:'NOR', dnf:true }, { abbr:'BEA', dnf:true }, { abbr:'BOT', dnf:true }, { abbr:'VER', dnf:true },
];

// Classifica RIVISTA (FIA Right of Review Alpine: penalità Gasly annullate → P3).
// GAS sale a P3; HAD/PIA/LAW/LIN scalano di una posizione. Resto invariato. DOTD invariato.
const RESULTS_NEW = [
  { abbr:'ANT', pos:1,  dotd:1 }, { abbr:'HAM', pos:2,  dotd:3 }, { abbr:'GAS', pos:3 },
  { abbr:'HAD', pos:4 }, { abbr:'PIA', pos:5 }, { abbr:'LAW', pos:6 }, { abbr:'LIN', pos:7 },
  { abbr:'ALB', pos:8 }, { abbr:'OCO', pos:9 }, { abbr:'ALO', pos:10 }, { abbr:'BOR', pos:11 },
  { abbr:'RUS', pos:12 }, { abbr:'HUL', pos:13 }, { abbr:'COL', pos:14 }, { abbr:'PER', pos:15 },
  { abbr:'SAI', dnf:true }, { abbr:'LEC', dnf:true, dotd:2 }, { abbr:'STR', dnf:true },
  { abbr:'NOR', dnf:true }, { abbr:'BEA', dnf:true }, { abbr:'BOT', dnf:true }, { abbr:'VER', dnf:true },
];

// Tabelle punteggio (replica lib/data.js + lib/scoring.js).
const POINTS_TABLE = {1:25,2:22,3:20,4:18,5:16,6:15,7:14,8:13,9:12,10:11,11:10,12:9,13:8,14:7,15:6,16:5,17:4,18:3,19:2,20:1,21:0,22:0};
const DOTD_POINTS = {1:3, 2:2, 3:1};
const OVERTAKE_BONUS = 0.5, MAX_OVERTAKE_POINTS = 3;

function pilotPoints(r) {
  let total = 0;
  if (r.dotd && DOTD_POINTS[r.dotd]) total += DOTD_POINTS[r.dotd];
  if (r.dnf) return total;
  total += POINTS_TABLE[r.pos] || 0;
  const ovt = Math.max(0, (GRID[r.abbr] || 99) - r.pos);
  if (ovt > 0) total += Math.min(ovt * OVERTAKE_BONUS, MAX_OVERTAKE_POINTS);
  return total;
}

function teamScores(resultsArr, lineupsByTeam, byAbbrId) {
  const ptByAbbr = Object.fromEntries(resultsArr.map(r => [r.abbr, pilotPoints(r)]));
  return Object.entries(lineupsByTeam).map(([name, t]) => {
    let total = 0;
    const detail = t.starters.map(ab => { const p = ptByAbbr[ab] || 0; total += p; return `${ab}=${p}`; });
    return { name, total, detail };
  });
}

async function main() {
  const { data: pilots } = await sb.from('pilots').select('id, abbreviation');
  const byAbbr = Object.fromEntries(pilots.map(p => [p.abbreviation, p.id]));
  const byId = Object.fromEntries(pilots.map(p => [p.id, p.abbreviation]));

  // Sanity
  for (const arr of [RESULTS_OLD, RESULTS_NEW]) {
    if (arr.length !== 22) throw new Error(`Attesi 22, trovati ${arr.length}`);
    for (const r of arr) if (!byAbbr[r.abbr]) throw new Error(`Pilota mancante: ${r.abbr}`);
  }

  // Lineups Monaco (titolari)
  const { data: lu } = await sb.from('lineups')
    .select('pilot_id, is_reserve, teams(name)').eq('race_id', RACE_ID);
  const lineupsByTeam = {};
  for (const l of lu) {
    const t = (lineupsByTeam[l.teams.name] ||= { starters: [], reserve: null });
    if (l.is_reserve) t.reserve = byId[l.pilot_id]; else t.starters.push(byId[l.pilot_id]);
  }

  // --- Confronto pilota P3..P7 ---
  console.log('--- PILOTI COINVOLTI (prima → dopo) ---');
  ['GAS','HAD','PIA','LAW','LIN'].forEach(ab => {
    const o = RESULTS_OLD.find(r => r.abbr === ab), n = RESULTS_NEW.find(r => r.abbr === ab);
    console.log(`  ${ab}: P${o.pos} (${pilotPoints(o)} pt) → P${n.pos} (${pilotPoints(n)} pt)   Δ ${(pilotPoints(n)-pilotPoints(o)>=0?'+':'')}${(pilotPoints(n)-pilotPoints(o)).toFixed(1)}`);
  });

  // --- Team scores prima/dopo ---
  const oldT = teamScores(RESULTS_OLD, lineupsByTeam, byAbbr);
  const newT = teamScores(RESULTS_NEW, lineupsByTeam, byAbbr);
  const oldMap = Object.fromEntries(oldT.map(t => [t.name, t.total]));
  console.log('\n--- PUNTEGGI SQUADRA MONACO (prima → dopo) ---');
  newT.sort((a,b) => b.total - a.total).forEach((t,i) => {
    const d = t.total - oldMap[t.name];
    const delta = d === 0 ? '   =' : `  ${d>0?'+':''}${d.toFixed(1)}`;
    console.log(`  ${i+1}. ${t.name.padEnd(26)} ${String(oldMap[t.name]).padStart(5)} → ${String(t.total).padStart(5)} pt${delta}   [${t.detail.join(', ')}]`);
  });

  // --- Scrittura DB ---
  console.log('\nAggiorno race_results su Supabase (classifica rivista)...');
  const { error: delErr } = await sb.from('race_results').delete().eq('race_id', RACE_ID);
  if (delErr) throw delErr;
  const rows = RESULTS_NEW.map(r => ({
    race_id: RACE_ID, pilot_id: byAbbr[r.abbr],
    grid_position: GRID[r.abbr], position: r.pos || null,
    dotd_rank: r.dotd || null, dnf: !!r.dnf,
  }));
  const { error: insErr } = await sb.from('race_results').insert(rows);
  if (insErr) throw insErr;

  console.log('Fatto. Classifica Monaco rivista pubblicata (sito già aggiornato via scoring.js).');
}

main().catch(e => { console.error('ERRORE:', e); process.exit(1); });
