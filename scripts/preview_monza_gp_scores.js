/**
 * preview_monza_gp_scores.js — SOLA LETTURA: anteprima punteggi GP Italia 2026 (Monza, 06/09).
 * Non scrive nulla sul DB. Regola sostituzione: HAD (infortunato, polso) → TSU.
 */
const fs = require('fs');
for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const RACE_ID = '46cc5c1d-6c17-48cf-bca2-cd44925ed769'; // GP Italia

// { abbr: [griglia, arrivo, dnf, dotd_rank] } — ALO e LAW dalla pit lane (21/22)
const DATA = {
  ANT: [19, 1, false, 1], RUS: [2, 2, false, 3], VER: [5, 3, false, 2],
  NOR: [8, 4, false, null], PIA: [6, 5, false, null], HAM: [4, 6, false, null],
  GAS: [1, 7, false, null], LIN: [9, 8, false, null], COL: [7, 9, false, null],
  TSU: [15, 10, false, null], BOR: [10, 11, false, null], HUL: [12, 12, false, null],
  SAI: [13, 13, false, null], LAW: [22, 14, false, null], BEA: [11, 15, false, null],
  OCO: [14, 16, false, null], ALB: [20, 17, false, null], PER: [17, 18, false, null],
  BOT: [16, 19, false, null],
  LEC: [3, null, true, null], ALO: [21, null, true, null], STR: [18, null, true, null],
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
  console.log('--- PUNTI PILOTA (GP Italia, Monza) ---');
  Object.keys(DATA).sort((a, b) => points(b).tot - points(a).tot).forEach(abbr => {
    const [grid, pos, dnf] = DATA[abbr];
    const p = points(abbr);
    console.log(`  ${abbr} griglia ${String(grid).padStart(2)} → ${dnf ? 'DNF' : 'P' + pos}`.padEnd(28)
      + ` piazz ${p.place} + sorp ${p.otPts} (${p.ot}) + dotd ${p.dotdPts} = ${p.tot}`);
  });

  const { data: lineups, error } = await sb.from('lineups')
    .select('is_reserve, teams:team_id(name), pilots:pilot_id(abbreviation)').eq('race_id', RACE_ID);
  if (error) throw error;

  const teams = {};
  for (const l of lineups) {
    const t = (teams[l.teams.name] ||= { starters: [], reserve: null });
    if (l.is_reserve) t.reserve = l.pilots.abbreviation;
    else t.starters.push(l.pilots.abbreviation);
  }
  const rows = Object.entries(teams).map(([name, t]) => {
    let tot = 0;
    const det = t.starters.map(a => {
      const eff = a === 'HAD' ? 'TSU' : a;
      const p = DATA[eff] ? points(eff) : { tot: 0 };
      tot += p.tot;
      return `${a}${a !== eff ? '→' + eff : ''} ${p.tot}${DATA[eff]?.[2] ? ' DNF' : ''}`;
    });
    return { name, tot, det, reserve: t.reserve, starters: t.starters };
  }).sort((a, b) => b.tot - a.tot);

  console.log('\n--- CLASSIFICA SQUADRE (GP Italia) ---');
  rows.forEach((r, i) => {
    const res = r.reserve === 'HAD' ? 'TSU' : r.reserve;
    const resPts = res && DATA[res] ? points(res).tot : null;
    console.log(`  ${i + 1}. ${r.name.padEnd(24)} ${String(r.tot).padStart(5)}  [${r.det.join(' | ')}]  panchina: ${r.reserve || '—'}${resPts !== null ? ' (' + resPts + ')' : ''}`);
  });

  console.log('\n--- SEGNALAZIONI ---');
  for (const r of rows) {
    if (r.starters.includes('HAD')) console.log(`  • ${r.name}: HAD titolare (ancora infortunato) → conteggiato con TSU`);
    const dnfSt = r.starters.filter(a => DATA[a === 'HAD' ? 'TSU' : a]?.[2]);
    const res = r.reserve === 'HAD' ? 'TSU' : r.reserve;
    if (dnfSt.length && res && DATA[res] && !DATA[res][2])
      console.log(`  • ${r.name}: titolare DNF (${dnfSt.join(',')}) + riserva ${r.reserve} a punti (${points(res).tot}) → switch DNF disponibile`);
    else if (dnfSt.length)
      console.log(`  • ${r.name}: titolare DNF (${dnfSt.join(',')}), riserva ${r.reserve || '—'}${res && DATA[res]?.[2] ? ' anch\'essa DNF' : ''} → nessuno switch utile`);
    if (r.starters.length < 3) console.log(`  • ${r.name}: SOLO ${r.starters.length} titolari → penalità -5`);
  }
}
main().catch(e => { console.error('ERRORE:', e.message || e); process.exit(1); });
