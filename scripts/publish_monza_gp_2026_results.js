/**
 * publish_monza_gp_2026_results.js — GP Italia (Monza), 06/09/2026.
 *
 * Fonti ufficiali: the-race/f1i (classifica finale), RacingNews365/formula1.com
 * (griglia dopo penalita': ANT 19 per cambio motore, ALB 20, ALO e LAW dalla
 * pit lane), formula1.com + total-motorsport (DOTD: ANT +3, VER +2, RUS +1).
 *
 * Regola sostituzione pilota (runbook): HAD ancora infortunato (polso), il
 * sedile Racing Bulls e' di TSU, che non e' nel roster fantacalcio: il suo
 * risultato (griglia 15 -> P10) va sulla riga di HAD.
 *
 * NON impostare overtakes: li calcola il trigger DB (cap 3 pt).
 * Giro veloce: mai conteggiato. DNF: 0 su piazzamento e sorpassi.
 *
 * Uso:
 *   node scripts/publish_monza_gp_2026_results.js --dry
 *   node scripts/publish_monza_gp_2026_results.js
 */
const fs = require('fs');
for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const DRY = process.argv.includes('--dry');

const RACE_ID = '46cc5c1d-6c17-48cf-bca2-cd44925ed769'; // GP Italia (event b1adbe01...)

// [griglia, arrivo, dnf, dotd_rank]
const RESULTS = {
  ANT: [19, 1, false, 1], RUS: [2, 2, false, 3], VER: [5, 3, false, 2],
  NOR: [8, 4, false, null], PIA: [6, 5, false, null], HAM: [4, 6, false, null],
  GAS: [1, 7, false, null], LIN: [9, 8, false, null], COL: [7, 9, false, null],
  BOR: [10, 11, false, null], HUL: [12, 12, false, null], SAI: [13, 13, false, null],
  LAW: [22, 14, false, null], BEA: [11, 15, false, null], OCO: [14, 16, false, null],
  ALB: [20, 17, false, null], PER: [17, 18, false, null], BOT: [16, 19, false, null],
  LEC: [3, null, true, null], ALO: [21, null, true, null], STR: [18, null, true, null],
  // TSU non e' nel roster: il suo risultato (griglia 15 -> P10) va sulla riga
  // di HAD, che sostituisce (regola sostituzione pilota).
  HAD: [15, 10, false, null],
};

async function main() {
  const { data: pilots, error: eP } = await sb.from('pilots').select('id, abbreviation');
  if (eP) throw eP;
  const byAbbr = Object.fromEntries(pilots.map(p => [p.abbreviation, p]));
  for (const a of Object.keys(RESULTS)) if (!byAbbr[a]) throw new Error(`Pilota mancante in DB: ${a}`);
  const fin = Object.values(RESULTS).filter(r => r[1]).map(r => r[1]);
  if (new Set(fin).size !== fin.length) throw new Error('Posizioni di arrivo duplicate');
  console.log(`✓ Validazione OK: ${Object.keys(RESULTS).length} righe (HAD conteggiato con TSU)`);

  const rows = Object.entries(RESULTS).map(([abbr, [grid, pos, dnf, dotd]]) => ({
    race_id: RACE_ID, pilot_id: byAbbr[abbr].id,
    grid_position: grid, position: pos, dotd_rank: dotd, dnf,
  }));

  if (DRY) { console.log('(--dry: nessuna scrittura)'); return; }
  const { error: eDel } = await sb.from('race_results').delete().eq('race_id', RACE_ID);
  if (eDel) throw eDel;
  const { error: eIns } = await sb.from('race_results').insert(rows);
  if (eIns) throw eIns;
  console.log(`✓ race_results GP Italia inseriti: ${rows.length} righe`);

  const { data: check } = await sb.from('race_results')
    .select('position, dnf, points_scored, overtakes, pilots:pilot_id(abbreviation)').eq('race_id', RACE_ID);
  console.log('\n--- VERIFICA DB (points_scored dal trigger) ---');
  check.sort((a, b) => (a.position ?? 99) - (b.position ?? 99)).forEach(r =>
    console.log(`  ${r.pilots.abbreviation.padEnd(4)} ${r.dnf ? 'DNF' : 'P' + String(r.position).padStart(2)}  sorp ${String(r.overtakes ?? 0).padStart(2)}  pt ${r.points_scored}`));
}
main().catch(e => { console.error('ERRORE:', e.message || e); process.exit(1); });
