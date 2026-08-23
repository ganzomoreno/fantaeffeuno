/**
 * preview_zandvoort_gp_scores.js — SOLA LETTURA: anteprima punteggi GP Olanda 2026.
 * Non scrive nulla sul DB. Calcola punti pilota e classifica squadre dai lineups.
 * Regola sostituzione: HAD (infortunato) conteggiato col risultato di TSU.
 */
const fs = require('fs');
for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const RACE_ID = 'e7bbd74c-8a7a-4127-95f5-3058eaf39b17'; // GP Olanda (domenica)

// { abbr: [grid, pos, dnf, dotd_rank] } — PER partito dalla pit lane → grid 22
const DATA = {
  NOR: [1, 1, false, 1], ANT: [3, 2, false, null], RUS: [2, 3, false, null],
  HAM: [5, 4, false, 3], LEC: [6, 5, false, null], PIA: [4, 6, false, null],
  LAW: [8, 7, false, null], HUL: [13, 8, false, null], ALO: [18, 9, false, 2],
  GAS: [11, 10, false, null], TSU: [12, 11, false, null], LIN: [10, 12, false, null],
  BOR: [9, 13, false, null], COL: [14, 14, false, null], PER: [22, 15, false, null],
  SAI: [17, 16, false, null], ALB: [16, 17, false, null],
  VER: [7, null, true, null], BOT: [21, null, true, null], OCO: [15, null, true, null],
  STR: [19, null, true, null], BEA: [20, null, true, null],
};
const PLACE = { 1: 25, 2: 22, 3: 20, 4: 18, 5: 16, 6: 15, 7: 14, 8: 13, 9: 12, 10: 11,
  11: 10, 12: 9, 13: 8, 14: 7, 15: 6, 16: 5, 17: 4, 18: 3, 19: 2, 20: 1, 21: 0, 22: 0 };
const DOTD = { 1: 3, 2: 2, 3: 1 };

function points(abbr) {
  const [grid, pos, dnf, dotd] = DATA[abbr];
  const dotdPts = dotd ? DOTD[dotd] : 0;
  if (dnf) return { place: 0, ot: 0, otPts: 0, dotdPts, tot: dotdPts };
  const ot = Math.max(0, grid - pos);
  const otPts = Math.min(3, ot * 0.5);
  return { place: PLACE[pos], ot, otPts, dotdPts, tot: PLACE[pos] + otPts + dotdPts };
}

async function main() {
  console.log('--- PUNTI PILOTA (GP Olanda) ---');
  const order = Object.keys(DATA).sort((a, b) => points(b).tot - points(a).tot);
  for (const abbr of order) {
    const [grid, pos, dnf] = DATA[abbr];
    const p = points(abbr);
    console.log(`  ${abbr} griglia ${String(grid).padStart(2)} → ${dnf ? 'DNF' : 'P' + pos}`.padEnd(28)
      + ` piazz ${p.place} + sorp ${p.otPts} (${p.ot}) + dotd ${p.dotdPts} = ${p.tot}`);
  }

  const { data: lineups, error } = await sb.from('lineups')
    .select('team_id, pilot_id, is_reserve, teams:team_id(name), pilots:pilot_id(abbreviation)')
    .eq('race_id', RACE_ID);
  if (error) throw error;
  if (!lineups?.length) { console.log('\n⚠️ NESSUNA FORMAZIONE per il GP!'); return; }

  console.log('\n--- FORMAZIONI E CLASSIFICA SQUADRE ---');
  const teams = {};
  for (const l of lineups) {
    const t = (teams[l.teams.name] ||= { starters: [], reserve: null });
    if (l.is_reserve) t.reserve = l.pilots.abbreviation;
    else t.starters.push(l.pilots.abbreviation);
  }
  const rows = Object.entries(teams).map(([name, t]) => {
    let tot = 0;
    const det = t.starters.map(a => {
      const eff = a === 'HAD' ? 'TSU' : a; // regola sostituzione infortunio
      const p = DATA[eff] ? points(eff) : { tot: 0 };
      tot += p.tot;
      return `${a}${a !== eff ? '→' + eff : ''} ${p.tot}${DATA[eff]?.[2] ? ' (DNF)' : ''}`;
    });
    return { name, tot, det, reserve: t.reserve, starters: t.starters };
  }).sort((a, b) => b.tot - a.tot);
  rows.forEach((r, i) => console.log(`  ${i + 1}. ${r.name.padEnd(24)} ${String(r.tot).padStart(5)}  [${r.det.join(' | ')}]  panchina: ${r.reserve || '—'}`));

  console.log('\n--- SEGNALAZIONI ---');
  for (const r of rows) {
    const dnfStarters = r.starters.filter(a => DATA[a === 'HAD' ? 'TSU' : a]?.[2]);
    const resAbbr = r.reserve === 'HAD' ? 'TSU' : r.reserve;
    if (dnfStarters.length && r.reserve && DATA[resAbbr] && !DATA[resAbbr][2])
      console.log(`  • ${r.name}: titolare DNF (${dnfStarters.join(',')}) + riserva ${r.reserve} a punti (${points(resAbbr).tot}) → switch DNF disponibile (decide il proprietario)`);
    if (r.starters.includes('HAD') || r.reserve === 'HAD')
      console.log(`  • ${r.name}: HAD ${r.starters.includes('HAD') ? 'titolare' : 'in panchina'} → conteggiato con TSU (regola sostituzione)`);
    if (r.starters.length < 3) console.log(`  • ${r.name}: SOLO ${r.starters.length} TITOLARI → penalità -5`);
  }
}
main().catch(e => { console.error('ERRORE:', e.message || e); process.exit(1); });
