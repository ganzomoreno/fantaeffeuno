/**
 * publish_singapore_gp_2026_results.js — GP Singapore (Marina Bay), 11/10/2026.
 *
 * Fonti: gpfans/grandepremio (griglia FIA emendata: RUS -60 → 19°, ALO/HAD/STR
 * dalla pit lane), formula1.com/the-race/f1i (classifica finale, nessuna
 * penalita' post-gara), formula1.com (DOTD: VER 30.7%, LEC 11.6%, RUS 11.5%).
 *
 * Note:
 *  - Pit lane: ALO 20, STR 21, HAD 22 (convenzione: pit lane in coda). Conta
 *    solo per ALO (16°): HAD arriva 10° (sorpassi al cap comunque), STR e' DNF.
 *  - ALB fermo al giro 59 su 62 ma CLASSIFICATO 18° (oltre il 90% della
 *    distanza): conta come arrivato, non come DNF.
 *  - Ritirati: STR, COL, BOR.
 *
 * NON impostare overtakes: li calcola il trigger DB (cap 3 pt).
 */
require('dotenv').config({ path: '.env.local', quiet: true });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const DRY = process.argv.includes('--dry');

const RACE_ID = '191c009d-4cf5-4841-95fc-e092d6271d04'; // GP Singapore

// [griglia, arrivo, dnf, dotd_rank]
const RESULTS = {
  VER: [1, 1, false, 1], LEC: [2, 2, false, 2], ANT: [4, 3, false, null],
  NOR: [5, 4, false, null], PIA: [6, 5, false, null], HAM: [3, 6, false, null],
  LAW: [8, 7, false, null], HUL: [10, 8, false, null], RUS: [19, 9, false, 3],
  HAD: [22, 10, false, null], GAS: [7, 11, false, null], BEA: [11, 12, false, null],
  OCO: [12, 13, false, null], SAI: [13, 14, false, null], LIN: [9, 15, false, null],
  ALO: [20, 16, false, null], PER: [17, 17, false, null], ALB: [16, 18, false, null],
  BOT: [18, 19, false, null],
  STR: [21, null, true, null], COL: [15, null, true, null], BOR: [14, null, true, null],
};

async function main() {
  const { data: pilots, error } = await sb.from('pilots').select('id, abbreviation, owner_team_id');
  if (error) throw error;
  const byAbbr = Object.fromEntries(pilots.map(p => [p.abbreviation, p]));
  for (const a of Object.keys(RESULTS)) if (!byAbbr[a]) throw new Error(`Pilota mancante: ${a}`);
  if (Object.keys(RESULTS).length !== 22) throw new Error('Servono 22 righe');
  const fin = Object.values(RESULTS).filter(r => r[1]).map(r => r[1]);
  if (new Set(fin).size !== fin.length) throw new Error('Arrivi duplicati');
  if (new Set(Object.values(RESULTS).map(r => r[0])).size !== 22) throw new Error('Griglia duplicata');
  const { data: lu } = await sb.from('lineups').select('team_id, pilot_id, teams:team_id(name)').eq('race_id', RACE_ID);
  const owner = Object.fromEntries(pilots.map(p => [p.id, p.owner_team_id]));
  const bad = lu.filter(l => owner[l.pilot_id] !== l.team_id);
  if (bad.length) throw new Error(`Formazioni con piloti non in rosa: ${bad.map(b => b.teams.name).join(', ')}`);
  console.log(`✓ Validazione OK: 22 righe, ${lu.length} righe formazione coerenti`);
  const rows = Object.entries(RESULTS).map(([a, [g, pos, dnf, dotd]]) => ({
    race_id: RACE_ID, pilot_id: byAbbr[a].id, grid_position: g, position: pos, dotd_rank: dotd, dnf }));
  if (DRY) { console.log('(--dry: nessuna scrittura)'); return; }
  const { error: eDel } = await sb.from('race_results').delete().eq('race_id', RACE_ID);
  if (eDel) throw eDel;
  const { error: eIns } = await sb.from('race_results').insert(rows);
  if (eIns) throw eIns;
  console.log(`✓ race_results GP Singapore inseriti: ${rows.length} righe`);
}
main().catch(e => { console.error('ERRORE:', e.message || e); process.exit(1); });
