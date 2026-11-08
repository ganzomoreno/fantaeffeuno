/**
 * publish_brazil_gp_2026_results.js — GP San Paolo (Interlagos), 08/11/2026.
 *
 * Griglia (qualifiche formula1.com + penalita' PU: RUS -5, LEC -10, HAM/VER/PER in fondo).
 * Arrivo: classifica a fine gara (giro 71/71) fornita dal SuperAdmin, coincide con planetf1/gpblog.
 * Antonelli sotto indagine per unsafe release: ha ~20s su Piastri, una penalita' di tempo
 * non cambierebbe la posizione.
 * DOTD: non ancora pubblicato → per ora nessuno (da aggiornare).
 *
 * SOSTITUZIONE: Ocon fuori per il resto della stagione, al suo posto Rafael Camara (non nel
 * roster): la riga OCO porta il risultato di Camara (11 → P20).
 * Ritirati: STR, BOT.
 */
require('dotenv').config({ path: '.env.local', quiet: true });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const DRY = process.argv.includes('--dry');

const RACE_ID = '9442d460-7d38-4045-8803-13aed263ff35'; // GP Brasile

// DOTD: [1°, 2°, 3°] — vuoto finche' F1 non pubblica il voto
const DOTD = [];

// [griglia, arrivo, dnf]
const RESULTS = {
  NOR: [1, 1, false], VER: [21, 2, false], HAD: [5, 3, false], RUS: [7, 4, false],
  ANT: [2, 5, false], PIA: [10, 6, false], LEC: [14, 7, false], LAW: [3, 8, false],
  HAM: [20, 9, false], HUL: [4, 10, false], LIN: [12, 11, false], ALO: [8, 12, false],
  COL: [15, 13, false], GAS: [16, 14, false], ALB: [9, 15, false], BOR: [19, 16, false],
  BEA: [6, 17, false], PER: [22, 18, false], SAI: [13, 19, false],
  OCO: [11, 20, false], // = Camara (sostituto di Ocon)
  STR: [17, null, true], BOT: [18, null, true],
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
  const rows = Object.entries(RESULTS).map(([a, [g, pos, dnf]]) => ({
    race_id: RACE_ID, pilot_id: byAbbr[a].id, grid_position: g, position: pos,
    dotd_rank: DOTD.includes(a) ? DOTD.indexOf(a) + 1 : null, dnf }));
  if (DRY) { console.log('(--dry: nessuna scrittura)'); return; }
  const { error: eDel } = await sb.from('race_results').delete().eq('race_id', RACE_ID);
  if (eDel) throw eDel;
  const { error: eIns } = await sb.from('race_results').insert(rows);
  if (eIns) throw eIns;
  console.log(`✓ race_results GP Brasile inseriti: ${rows.length} righe (DOTD: ${DOTD.join(', ') || 'non assegnato'})`);
}
main().catch(e => { console.error('ERRORE:', e.message || e); process.exit(1); });
