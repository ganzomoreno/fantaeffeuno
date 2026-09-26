/**
 * publish_baku_gp_2026_results.js — GP Azerbaijan (Baku), 26/09/2026.
 *
 * Fonti ufficiali: planetf1/racingnews365/the-race (griglia dopo penalita':
 * SAI -5, PER -3, ALO -30, STR -20; ANT 16° dopo il botto in qualifica),
 * racingnews365/crash.net (classifica dopo la penalita' post-gara di BOR:
 * +10s, da 13° a 15°), formula1.com + total-motorsport (DOTD: VER 26.6%,
 * HAD 15.1%, ANT 12.6%).
 *
 * HADJAR RIENTRA dall'infortunio: la riga HAD torna a essere il suo risultato
 * reale (niente piu' sostituzione con TSU). LAW torna in Racing Bulls.
 *
 * NON impostare overtakes: li calcola il trigger DB (cap 3 pt).
 *
 * Uso:
 *   node scripts/publish_baku_gp_2026_results.js --dry
 *   node scripts/publish_baku_gp_2026_results.js
 */
const fs = require('fs');
for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const DRY = process.argv.includes('--dry');

const RACE_ID = '93671d84-f075-4a58-8c94-2a91eab5c1b3'; // GP Azerbaijan

// [griglia, arrivo, dnf, dotd_rank]
const RESULTS = {
  RUS: [1, 1, false, null], VER: [8, 2, false, 1], HAD: [4, 3, false, 2],
  LEC: [2, 4, false, null], ANT: [16, 5, false, 3], HAM: [6, 6, false, null],
  LIN: [15, 7, false, null], OCO: [13, 8, false, null], BEA: [10, 9, false, null],
  SAI: [14, 10, false, null], HUL: [18, 11, false, null], LAW: [11, 12, false, null],
  PIA: [3, 13, false, null], PER: [20, 14, false, null], BOR: [17, 15, false, null],
  BOT: [19, 16, false, null],
  COL: [9, null, true, null], GAS: [7, null, true, null], NOR: [5, null, true, null],
  ALB: [12, null, true, null], ALO: [21, null, true, null], STR: [22, null, true, null],
};

async function main() {
  const { data: pilots, error: eP } = await sb.from('pilots').select('id, abbreviation, owner_team_id');
  if (eP) throw eP;
  const byAbbr = Object.fromEntries(pilots.map(p => [p.abbreviation, p]));
  for (const a of Object.keys(RESULTS)) if (!byAbbr[a]) throw new Error(`Pilota mancante in DB: ${a}`);
  if (Object.keys(RESULTS).length !== 22) throw new Error(`${Object.keys(RESULTS).length} righe, attese 22`);
  const fin = Object.values(RESULTS).filter(r => r[1]).map(r => r[1]);
  if (new Set(fin).size !== fin.length) throw new Error('Posizioni di arrivo duplicate');
  const grid = Object.values(RESULTS).map(r => r[0]);
  if (new Set(grid).size !== 22) throw new Error('Posizioni di griglia duplicate');

  // Formazioni: ogni pilota schierato deve essere nella rosa della squadra
  const { data: lu } = await sb.from('lineups').select('team_id, pilot_id, teams:team_id(name)').eq('race_id', RACE_ID);
  const owner = Object.fromEntries(pilots.map(p => [p.id, p.owner_team_id]));
  const bad = lu.filter(l => owner[l.pilot_id] !== l.team_id);
  if (bad.length) throw new Error(`Formazioni con piloti non in rosa: ${bad.map(b => b.teams.name).join(', ')}`);
  console.log(`✓ Validazione OK: 22 righe, griglia/arrivi univoci, ${lu.length} righe formazione coerenti con le rose`);

  const rows = Object.entries(RESULTS).map(([abbr, [g, pos, dnf, dotd]]) => ({
    race_id: RACE_ID, pilot_id: byAbbr[abbr].id,
    grid_position: g, position: pos, dotd_rank: dotd, dnf,
  }));
  if (DRY) { console.log('(--dry: nessuna scrittura)'); return; }

  const { error: eDel } = await sb.from('race_results').delete().eq('race_id', RACE_ID);
  if (eDel) throw eDel;
  const { error: eIns } = await sb.from('race_results').insert(rows);
  if (eIns) throw eIns;
  console.log(`✓ race_results GP Azerbaijan inseriti: ${rows.length} righe`);

  const { data: check } = await sb.from('race_results')
    .select('grid_position, position, dnf, points_scored, overtakes, pilots:pilot_id(abbreviation)').eq('race_id', RACE_ID);
  console.log('\n--- VERIFICA DB (points_scored dal trigger) ---');
  check.sort((a, b) => (a.position ?? 99) - (b.position ?? 99)).forEach(r =>
    console.log(`  ${r.pilots.abbreviation.padEnd(4)} griglia ${String(r.grid_position).padStart(2)} ${r.dnf ? 'DNF' : 'P' + String(r.position).padStart(2)}  sorp ${String(r.overtakes ?? 0).padStart(2)}  pt ${r.points_scored}`));
}
main().catch(e => { console.error('ERRORE:', e.message || e); process.exit(1); });
