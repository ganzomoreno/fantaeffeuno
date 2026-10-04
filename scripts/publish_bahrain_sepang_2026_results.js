/**
 * publish_bahrain_sepang_2026_results.js — GP Bahrain recuperato a Sepang (Malesia), 04/10/2026.
 * Gara sotto la pioggia: via previsto 15:00 locali (09:00 IT), partenza reale 16:33 (10:33 IT).
 *
 * Fonti ufficiali: planetf1/racingnews365/crash.net (griglia dopo penalita': HAD -5,
 * COL -15, LIN -30), crash.net/gpfans (classifica finale con penalita' applicate),
 * formula1.com (DOTD: VER 25.9%, HAM 25.3%, ALO 11.2%).
 * Ritirati: BOT (giro 9), ALB (cambio, giro 43), RUS (motore, giro 50).
 *
 * NON impostare overtakes: li calcola il trigger DB (cap 3 pt).
 *
 * Uso:
 *   node scripts/publish_bahrain_sepang_2026_results.js --dry
 *   node scripts/publish_bahrain_sepang_2026_results.js
 */
require('dotenv').config({ path: '.env.local', quiet: true });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const DRY = process.argv.includes('--dry');

const RACE_ID = 'd562f33b-27c5-4139-9c1b-42f4d3b76521'; // GP Bahrain (Sepang)

// [griglia, arrivo, dnf, dotd_rank]
const RESULTS = {
  VER: [1, 1, false, 1], ANT: [3, 2, false, null], HAM: [2, 3, false, 2],
  LEC: [4, 4, false, null], HAD: [8, 5, false, null], PIA: [6, 6, false, null],
  LAW: [11, 7, false, null], ALO: [12, 8, false, 3], NOR: [5, 9, false, null],
  LIN: [22, 10, false, null], HUL: [15, 11, false, null], STR: [14, 12, false, null],
  COL: [21, 13, false, null], BEA: [16, 14, false, null], OCO: [17, 15, false, null],
  GAS: [9, 16, false, null], SAI: [13, 17, false, null], BOR: [10, 18, false, null],
  PER: [20, 19, false, null],
  RUS: [7, null, true, null], ALB: [18, null, true, null], BOT: [19, null, true, null],
};

async function main() {
  const { data: pilots, error: eP } = await sb.from('pilots').select('id, abbreviation, owner_team_id');
  if (eP) throw eP;
  const byAbbr = Object.fromEntries(pilots.map(p => [p.abbreviation, p]));
  for (const a of Object.keys(RESULTS)) if (!byAbbr[a]) throw new Error(`Pilota mancante in DB: ${a}`);
  if (Object.keys(RESULTS).length !== 22) throw new Error(`${Object.keys(RESULTS).length} righe, attese 22`);
  const fin = Object.values(RESULTS).filter(r => r[1]).map(r => r[1]);
  if (new Set(fin).size !== fin.length) throw new Error('Posizioni di arrivo duplicate');
  if (new Set(Object.values(RESULTS).map(r => r[0])).size !== 22) throw new Error('Posizioni di griglia duplicate');
  const { data: lu } = await sb.from('lineups').select('team_id, pilot_id, teams:team_id(name)').eq('race_id', RACE_ID);
  const owner = Object.fromEntries(pilots.map(p => [p.id, p.owner_team_id]));
  const bad = lu.filter(l => owner[l.pilot_id] !== l.team_id);
  if (bad.length) throw new Error(`Formazioni con piloti non in rosa: ${bad.map(b => b.teams.name).join(', ')}`);
  console.log(`✓ Validazione OK: 22 righe, ${lu.length} righe formazione coerenti con le rose`);

  const rows = Object.entries(RESULTS).map(([abbr, [g, pos, dnf, dotd]]) => ({
    race_id: RACE_ID, pilot_id: byAbbr[abbr].id, grid_position: g, position: pos, dotd_rank: dotd, dnf,
  }));
  if (DRY) { console.log('(--dry: nessuna scrittura)'); return; }
  const { error: eDel } = await sb.from('race_results').delete().eq('race_id', RACE_ID);
  if (eDel) throw eDel;
  const { error: eIns } = await sb.from('race_results').insert(rows);
  if (eIns) throw eIns;
  console.log(`✓ race_results GP Bahrain (Sepang) inseriti: ${rows.length} righe`);

  const { data: check } = await sb.from('race_results')
    .select('grid_position, position, dnf, points_scored, overtakes, pilots:pilot_id(abbreviation)').eq('race_id', RACE_ID);
  console.log('\n--- VERIFICA DB (points_scored dal trigger) ---');
  check.sort((a, b) => (a.position ?? 99) - (b.position ?? 99)).forEach(r =>
    console.log(`  ${r.pilots.abbreviation.padEnd(4)} griglia ${String(r.grid_position).padStart(2)} ${r.dnf ? 'DNF' : 'P' + String(r.position).padStart(2)}  sorp ${String(r.overtakes ?? 0).padStart(2)}  pt ${r.points_scored}`));
}
main().catch(e => { console.error('ERRORE:', e.message || e); process.exit(1); });
