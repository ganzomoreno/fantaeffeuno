/**
 * publish_mexico_gp_2026_results.js — GP Citta' del Messico, 01/11/2026.
 * Antonelli campione del mondo (3°). Vince Verstappen.
 *
 * Griglia (formula1.com + gpblog/gpfans): VER e LAW -1 (contatto FP2), LAW squalificato
 * dalla qualifica e dalla pit lane (22), BOT -50, Hirakawa 18°.
 * Classifica dopo le penalita' post-gara (the-race, crash.net, formula1.com, motorsport.com):
 *   PIA +10s (contatto con LIN) → 13°; COL +10s (gialle) → 15°; GAS +30s (stop&go convertito) → 17°.
 *   HUL aveva gia' scontato in gara 10s (contatto con BEA).
 * DOTD (formula1.com + F1 su X): VER 20.6%, PER 18.6%, HAM 15.4%.
 *
 * SOSTITUZIONE: Haas ha sostituito OCON con Ryo HIRAKAWA (non nel roster) per tutto il
 * weekend. Regola sostituzione pilota: la riga OCO porta il risultato di Hirakawa (18 → P10).
 * Ritirati: LIN, BEA, BOT, STR, ALO.
 *
 * NON impostare overtakes: li calcola il trigger DB (cap 3 pt).
 */
require('dotenv').config({ path: '.env.local', quiet: true });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const DRY = process.argv.includes('--dry');

const RACE_ID = '9347cdc9-1b97-4061-8502-524318d836d1'; // GP Messico

// [griglia, arrivo, dnf, dotd_rank]
const RESULTS = {
  VER: [5, 1, false, 1], HAM: [1, 2, false, 3], ANT: [4, 3, false, null], LEC: [3, 4, false, null],
  NOR: [6, 5, false, null], RUS: [2, 6, false, null], LAW: [22, 7, false, null], BOR: [13, 8, false, null],
  HAD: [7, 9, false, null],
  OCO: [18, 10, false, null], // = Hirakawa (sostituto di Ocon)
  ALB: [16, 11, false, null], SAI: [15, 12, false, null], PIA: [12, 13, false, null],
  HUL: [10, 14, false, null], COL: [11, 15, false, null], PER: [20, 16, false, 2], GAS: [9, 17, false, null],
  LIN: [8, null, true, null], BEA: [14, null, true, null], BOT: [21, null, true, null],
  STR: [19, null, true, null], ALO: [17, null, true, null],
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
  console.log(`✓ race_results GP Messico inseriti: ${rows.length} righe`);
}
main().catch(e => { console.error('ERRORE:', e.message || e); process.exit(1); });
