/**
 * publish_madrid_gp_2026_results.js — GP di Spagna (Madring, Madrid), 13/09/2026.
 * Prima gara in assoluto sul circuito di Madrid.
 *
 * Fonti ufficiali: the-race/RacingNews365 (griglia dopo penalita': SAI -3, STR -40,
 * BEA dalla pit lane), planetf1/formula1.com (classifica finale e 4 ritiri),
 * total-motorsport + formula1.com (DOTD: vinto da VER).
 *
 * Regola sostituzione pilota: HAD infortunato (polso), il sedile Racing Bulls e'
 * di TSU, che non e' nel roster fantacalcio. Il risultato di TSU (griglia 15 ->
 * P14) va quindi sulla riga di HAD.
 *
 * NON impostare overtakes: li calcola il trigger DB (cap 3 pt).
 *
 * Uso:
 *   node scripts/publish_madrid_gp_2026_results.js --dry
 *   node scripts/publish_madrid_gp_2026_results.js
 */
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const DRY = process.argv.includes('--dry');

const RACE_ID = '58e71898-e6da-4e3f-a3ac-3720878292ee'; // GP Spagna (Madrid)

// [griglia, arrivo, dnf, dotd_rank] — BEA dalla pit lane (griglia 22)
const RESULTS = {
  ANT: [2, 1, false, null], VER: [3, 2, false, 1], NOR: [1, 3, false, 3],
  LEC: [5, 4, false, 2], RUS: [6, 5, false, null], LAW: [8, 6, false, null],
  COL: [9, 7, false, null], PIA: [7, 8, false, null], LIN: [10, 9, false, null],
  HUL: [11, 10, false, null], OCO: [13, 11, false, null], BOR: [12, 12, false, null],
  GAS: [14, 13, false, null], ALB: [16, 15, false, null], BEA: [22, 16, false, null],
  ALO: [17, 17, false, null], BOT: [19, 18, false, null],
  HAM: [4, null, true, null], STR: [21, null, true, null],
  PER: [18, null, true, null], SAI: [20, null, true, null],
  // TSU (griglia 15 -> P14) non e' nel roster: il suo risultato va sulla riga di HAD.
  HAD: [15, 14, false, null],
};

async function main() {
  const { data: pilots, error: eP } = await sb.from('pilots').select('id, abbreviation');
  if (eP) throw eP;
  const byAbbr = Object.fromEntries(pilots.map(p => [p.abbreviation, p]));
  for (const a of Object.keys(RESULTS)) if (!byAbbr[a]) throw new Error(`Pilota mancante in DB: ${a}`);
  if (Object.keys(RESULTS).length !== 22) throw new Error(`${Object.keys(RESULTS).length} righe, attese 22`);
  const fin = Object.values(RESULTS).filter(r => r[1]).map(r => r[1]);
  if (new Set(fin).size !== fin.length) throw new Error('Posizioni di arrivo duplicate');
  const grid = Object.values(RESULTS).map(r => r[0]);
  if (new Set(grid).size !== grid.length) throw new Error('Posizioni di griglia duplicate');
  console.log('✓ Validazione OK: 22 righe, griglia e arrivi senza duplicati (HAD = risultato TSU)');

  const rows = Object.entries(RESULTS).map(([abbr, [g, pos, dnf, dotd]]) => ({
    race_id: RACE_ID, pilot_id: byAbbr[abbr].id,
    grid_position: g, position: pos, dotd_rank: dotd, dnf,
  }));

  if (DRY) { console.log('(--dry: nessuna scrittura)'); return; }
  const { error: eDel } = await sb.from('race_results').delete().eq('race_id', RACE_ID);
  if (eDel) throw eDel;
  const { error: eIns } = await sb.from('race_results').insert(rows);
  if (eIns) throw eIns;
  console.log(`✓ race_results GP Madrid inseriti: ${rows.length} righe`);

  const { data: check } = await sb.from('race_results')
    .select('grid_position, position, dnf, points_scored, overtakes, pilots:pilot_id(abbreviation)').eq('race_id', RACE_ID);
  console.log('\n--- VERIFICA DB (points_scored dal trigger) ---');
  check.sort((a, b) => (a.position ?? 99) - (b.position ?? 99)).forEach(r =>
    console.log(`  ${r.pilots.abbreviation.padEnd(4)} griglia ${String(r.grid_position).padStart(2)} ${r.dnf ? 'DNF' : 'P' + String(r.position).padStart(2)}  sorp ${String(r.overtakes ?? 0).padStart(2)}  pt ${r.points_scored}`));
}
main().catch(e => { console.error('ERRORE:', e.message || e); process.exit(1); });
