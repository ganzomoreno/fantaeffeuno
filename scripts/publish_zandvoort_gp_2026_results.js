/**
 * publish_zandvoort_gp_2026_results.js — GP Olanda (Zandvoort), 23/08/2026.
 *
 * Fonti ufficiali: the-race/RacingNews365 (griglia con pit-lane PER),
 * Autosport/GPFans (classifica finale dopo penalità: il 10s a LAW non
 * cambia posizioni). DOTD indicato dal SuperAdmin: NOR +3, ALO +2, HAM +1.
 *
 * Regola sostituzione pilota (runbook): HAD infortunato → chi lo schiera
 * viene conteggiato col sostituto TSU, quindi la riga di HAD porta
 * griglia/arrivo di TSU (12 → P11).
 *
 * NON impostare overtakes: li calcola il trigger DB (grid - position, cap 3 pt).
 * Giro veloce: mai conteggiato. DNF: 0 su piazzamento e sorpassi.
 *
 * Uso:
 *   node scripts/publish_zandvoort_gp_2026_results.js --dry
 *   node scripts/publish_zandvoort_gp_2026_results.js
 */
const fs = require('fs');
for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const DRY = process.argv.includes('--dry');

const RACE_ID = 'e7bbd74c-8a7a-4127-95f5-3058eaf39b17'; // GP Olanda (event 2fdbc348..., domenica)

// [griglia, arrivo, dnf, dotd_rank]
const RESULTS = {
  NOR: [1, 1, false, 1], ANT: [3, 2, false, null], RUS: [2, 3, false, null],
  HAM: [5, 4, false, 3], LEC: [6, 5, false, null], PIA: [4, 6, false, null],
  LAW: [8, 7, false, null], HUL: [13, 8, false, null], ALO: [18, 9, false, 2],
  GAS: [11, 10, false, null], LIN: [10, 12, false, null],
  BOR: [9, 13, false, null], COL: [14, 14, false, null], PER: [22, 15, false, null],
  SAI: [17, 16, false, null], ALB: [16, 17, false, null],
  VER: [7, null, true, null], BOT: [21, null, true, null], OCO: [15, null, true, null],
  STR: [19, null, true, null], BEA: [20, null, true, null],
  // TSU non e' nel roster fantacalcio: il suo risultato (griglia 12 -> P11) va
  // sulla riga di HAD, che sostituisce (regola sostituzione pilota).
  HAD: [12, 11, false, null],
};

async function main() {
  const { data: pilots, error: eP } = await sb.from('pilots').select('id, abbreviation, name');
  if (eP) throw eP;
  const byAbbr = Object.fromEntries(pilots.map(p => [p.abbreviation, p]));
  for (const a of Object.keys(RESULTS)) if (!byAbbr[a]) throw new Error(`Pilota mancante in DB: ${a}`);

  const finishers = Object.values(RESULTS).filter(r => r[1]).map(r => r[1]);
  if (new Set(finishers).size !== finishers.length) throw new Error('Posizioni di arrivo duplicate');
  console.log(`✓ Validazione OK: ${Object.keys(RESULTS).length} righe (HAD conteggiato con TSU)`);

  const rows = Object.entries(RESULTS).map(([abbr, [grid, pos, dnf, dotd]]) => ({
    race_id: RACE_ID,
    pilot_id: byAbbr[abbr].id,
    grid_position: grid,
    position: pos,
    dotd_rank: dotd,
    dnf,
  }));

  if (DRY) { console.log('(--dry: nessuna scrittura)'); return; }
  const { error: eDel } = await sb.from('race_results').delete().eq('race_id', RACE_ID);
  if (eDel) throw eDel;
  const { error: eIns } = await sb.from('race_results').insert(rows);
  if (eIns) throw eIns;
  console.log(`✓ race_results GP Olanda inseriti: ${rows.length} righe`);

  const { data: check } = await sb.from('race_results')
    .select('position, dnf, points_scored, overtakes, pilots:pilot_id(abbreviation)')
    .eq('race_id', RACE_ID);
  console.log('\n--- VERIFICA DB (points_scored dal trigger) ---');
  check.sort((a, b) => (a.position ?? 99) - (b.position ?? 99)).forEach(r =>
    console.log(`  ${r.pilots.abbreviation.padEnd(4)} ${r.dnf ? 'DNF' : 'P' + String(r.position).padStart(2)}  sorp ${String(r.overtakes ?? 0).padStart(2)}  pt ${r.points_scored}`));
}
main().catch(e => { console.error('ERRORE:', e.message || e); process.exit(1); });
