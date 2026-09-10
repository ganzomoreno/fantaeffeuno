/**
 * recap_pre_asta.js — SOLA LETTURA: fotografia della lega prima di aprire un'asta.
 * Replica lib/scoring.js (calculateTeamScores) per la classifica stagionale,
 * più budget, rose attuali e switch usati. Non scrive nulla.
 */
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const POINTS = { 1:25,2:22,3:20,4:18,5:16,6:15,7:14,8:13,9:12,10:11,11:10,12:9,13:8,14:7,15:6,16:5,17:4,18:3,19:2,20:1,21:0,22:0 };
const SPRINT = { 1:8,2:7,3:6,4:5,5:4,6:3,7:2,8:1 };
const DOTD = { 1:3, 2:2, 3:1 };
const PENALTIES = [{ team: 'Abdull Mazzar', points: 5, reason: 'Mancato schieramento in tempo (Monaco)' }];

function pilotPoints(r, isSprint) {
  let tot = 0;
  if (!isSprint && r.dotd_rank && DOTD[r.dotd_rank]) tot += DOTD[r.dotd_rank];
  if (r.dnf) return tot;
  if (isSprint) return tot + (SPRINT[r.position] || 0);
  tot += POINTS[r.position] || 0;
  if (r.overtakes > 0) tot += Math.min(r.overtakes * 0.5, 3);
  return tot;
}

async function main() {
  const [{ data: teams }, { data: pilots }, { data: races }, { data: lineups }, { data: results }, { data: auctions }] =
    await Promise.all([
      sb.from('teams').select('id, name, budget, switches_used').order('created_at'),
      sb.from('pilots').select('id, abbreviation, name, owner_team_id, purchase_price'),
      sb.from('races').select('id, is_sprint, calendar_events(location, sort_order, event_date)'),
      sb.from('lineups').select('race_id, team_id, pilot_id, is_reserve, subbed_in_manually, subbed_out_for'),
      sb.from('race_results').select('race_id, pilot_id, position, dnf, overtakes, dotd_rank'),
      sb.from('auctions').select('auction_number, is_completed, budget_added').order('auction_number'),
    ]);

  const resByRace = {};
  results.forEach(r => (resByRace[r.race_id] ||= []).push(r));
  const racesRun = races.filter(r => resByRace[r.id]?.length)
    .sort((a, b) => a.calendar_events.sort_order - b.calendar_events.sort_order);

  // Classifica stagionale — stessa logica di lib/scoring.js
  const scores = {}, perRace = {};
  teams.forEach(t => { scores[t.id] = 0; perRace[t.id] = {}; });
  for (const race of racesRun) {
    const rs = resByRace[race.id];
    const lu = lineups.filter(l => l.race_id === race.id);
    for (const t of teams) {
      const starters = lu.filter(l => l.team_id === t.id && !l.is_reserve);
      const reserve = lu.find(l => l.team_id === t.id && l.is_reserve);
      let tot;
      if (starters.length < 3) tot = -5;
      else {
        tot = 0;
        starters.forEach(s => {
          if (reserve && s.subbed_out_for === reserve.pilot_id) return;
          const r = rs.find(x => x.pilot_id === s.pilot_id);
          if (r) tot += pilotPoints(r, race.is_sprint);
        });
        if (reserve?.subbed_in_manually) {
          const r = rs.find(x => x.pilot_id === reserve.pilot_id);
          if (r) tot += pilotPoints(r, race.is_sprint);
        }
      }
      scores[t.id] += tot;
      perRace[t.id][race.calendar_events.location + (race.is_sprint ? ' (S)' : '')] = tot;
    }
  }
  teams.forEach(t => {
    const pen = PENALTIES.filter(p => p.team === t.name).reduce((s, p) => s + p.points, 0);
    scores[t.id] -= pen;
  });

  console.log(`=== GARE DISPUTATE: ${racesRun.length} ===`);
  console.log('  ' + racesRun.map(r => r.calendar_events.location + (r.is_sprint ? '(S)' : '')).join(', '));

  console.log('\n=== CLASSIFICA GENERALE (come la mostra l\'app) ===');
  const rank = [...teams].sort((a, b) => scores[b.id] - scores[a.id]);
  const leader = scores[rank[0].id];
  rank.forEach((t, i) => {
    const pen = PENALTIES.filter(p => p.team === t.name).reduce((s, p) => s + p.points, 0);
    console.log(`  ${i + 1}. ${t.name.padEnd(24)} ${String(scores[t.id]).padStart(7)} pt   (-${leader - scores[t.id]} dal leader)${pen ? '  [penalità -' + pen + ']' : ''}`);
  });

  const lastTwo = racesRun.slice(-2);
  console.log(`\n=== ULTIME 2 GARE (${lastTwo.map(r => r.calendar_events.location + (r.is_sprint ? '(S)' : '')).join(' + ')}) ===`);
  rank.forEach(t => {
    const d = lastTwo.map(r => {
      const k = r.calendar_events.location + (r.is_sprint ? ' (S)' : '');
      return `${k}: ${perRace[t.id][k]}`;
    }).join('  |  ');
    console.log(`  ${t.name.padEnd(24)} ${d}`);
  });

  console.log('\n=== BUDGET E ROSE ATTUALI (prima dell\'asta) ===');
  for (const t of rank) {
    const rosa = pilots.filter(p => p.owner_team_id === t.id)
      .sort((a, b) => b.purchase_price - a.purchase_price);
    const spesa = rosa.reduce((s, p) => s + (p.purchase_price || 0), 0);
    console.log(`\n  ${t.name}  —  budget ${t.budget}M  ·  switch usati ${t.switches_used ?? 0}/5`);
    console.log(`    rosa (${rosa.length}): ${rosa.map(p => `${p.abbreviation} ${p.purchase_price}M`).join(' · ')}   [investiti ${spesa}M]`);
  }

  console.log('\n=== STATO ASTE ===');
  auctions.forEach(a => console.log(`  Asta ${a.auction_number}: ${a.is_completed ? 'completata' : '⚠️ APERTA'} (+${a.budget_added}M)`));
  const open = auctions.find(a => !a.is_completed);
  console.log(open ? `\n⚠️  C'è già un'asta aperta (${open.auction_number}): open_next_auction non farà nulla.`
                   : `\n→ Prossima asta da aprire: Asta ${auctions.length + 1}`);
}
main().catch(e => { console.error('ERRORE:', e.message || e); process.exit(1); });
