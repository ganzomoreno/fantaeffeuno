/**
 * publish_usa_gp_2026_results.js — GP Stati Uniti (COTA, Austin), 25/10/2026.
 *
 * Fonti: formula1.com/planetf1/gpblog (griglia FIA: LIN -5, COL -10, BOR -80,
 * STR dalla pit lane), formula1.com/grandepremio/si.com (classifica; RUS +5s
 * per vantaggio fuori pista al via, resta 8°).
 * DOTD: non ancora pubblicato alla chiusura → per ora nessun DOTD (da aggiornare).
 *
 * ZetaRacing non aveva schierato: formazione inserita d'ufficio su indicazione
 * del SuperAdmin (OCO, NOR, RUS titolari, SAI panchina) con -5 (lib/data.js PENALTIES).
 *
 * NON impostare overtakes: li calcola il trigger DB (cap 3 pt).
 */
require('dotenv').config({ path: '.env.local', quiet: true });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const DRY = process.argv.includes('--dry');

const RACE_ID = 'fd66aeca-1299-4114-82de-00801078ed63'; // GP Stati Uniti

// DOTD: [abbr 1°, 2°, 3°] — vuoto finche' F1 non pubblica il voto
const DOTD = [];

// [griglia, arrivo, dnf]
const RESULTS = {
  ANT: [1, 1, false], LEC: [4, 2, false], VER: [2, 3, false], HAM: [5, 4, false],
  NOR: [8, 5, false], HAD: [3, 6, false], PIA: [7, 7, false], RUS: [6, 8, false],
  LAW: [9, 9, false], GAS: [10, 10, false], HUL: [11, 11, false], LIN: [14, 12, false],
  BOR: [21, 13, false], OCO: [15, 14, false], STR: [22, 15, false], ALO: [12, 16, false],
  ALB: [17, 17, false], SAI: [16, 18, false], PER: [18, 19, false],
  BOT: [19, null, true], COL: [20, null, true], BEA: [13, null, true],
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

  // Formazione d'ufficio ZetaRacing (solo se assente)
  const { data: teams } = await sb.from('teams').select('id, name');
  const zeta = teams.find(t => t.name === 'ZetaRacing');
  const { data: zl } = await sb.from('lineups').select('id').eq('race_id', RACE_ID).eq('team_id', zeta.id);
  if (!zl.length) {
    const rows = ['OCO', 'NOR', 'RUS'].map(a => ({ race_id: RACE_ID, team_id: zeta.id, pilot_id: byAbbr[a].id, is_reserve: false, subbed_in_manually: false, subbed_out_for: null }));
    rows.push({ race_id: RACE_ID, team_id: zeta.id, pilot_id: byAbbr.SAI.id, is_reserve: true, subbed_in_manually: false, subbed_out_for: null });
    if (!DRY) { const { error: e } = await sb.from('lineups').insert(rows); if (e) throw e; }
    console.log(`${DRY ? '(dry) ' : '✓ '}Formazione d'ufficio ZetaRacing: OCO, NOR, RUS + SAI panchina`);
  }

  const { data: lu } = await sb.from('lineups').select('team_id, pilot_id, teams:team_id(name)').eq('race_id', RACE_ID);
  const owner = Object.fromEntries(pilots.map(p => [p.id, p.owner_team_id]));
  const bad = lu.filter(l => owner[l.pilot_id] !== l.team_id);
  if (bad.length) throw new Error(`Formazioni con piloti non in rosa: ${bad.map(b => b.teams.name).join(', ')}`);
  console.log(`✓ Validazione OK: 22 righe risultato, ${lu.length} righe formazione coerenti`);

  const rows = Object.entries(RESULTS).map(([a, [g, pos, dnf]]) => ({
    race_id: RACE_ID, pilot_id: byAbbr[a].id, grid_position: g, position: pos,
    dotd_rank: DOTD.includes(a) ? DOTD.indexOf(a) + 1 : null, dnf }));
  if (DRY) { console.log('(--dry: nessuna scrittura)'); return; }
  const { error: eDel } = await sb.from('race_results').delete().eq('race_id', RACE_ID);
  if (eDel) throw eDel;
  const { error: eIns } = await sb.from('race_results').insert(rows);
  if (eIns) throw eIns;
  console.log(`✓ race_results GP Stati Uniti inseriti: ${rows.length} righe (DOTD: ${DOTD.join(', ') || 'non assegnato'})`);
}
main().catch(e => { console.error('ERRORE:', e.message || e); process.exit(1); });
