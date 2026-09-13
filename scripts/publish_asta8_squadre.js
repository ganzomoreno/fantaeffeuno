/**
 * publish_asta8_squadre.js
 * Pubblica le squadre dell'ASTA 8 (2026) — asta a buste chiuse, re-draft completo.
 *
 * Budget di partenza = residuo Asta 7 + 100M (gia' accreditati da open_next_auction.js).
 * Il costo rosa NON si rimborsa. I budget finali sono espliciti (start - speso).
 *
 * Nota su HAD/LAW (sedili incrociati per l'infortunio di Hadjar):
 *   - Scudemaria compra LAW (Lawson, 17M), che guida la Red Bull di Hadjar.
 *   - ZetaRacing compra TSU (38M), che guida la Racing Bulls lasciata da Lawson.
 *     TSU non ha un record proprio nel roster: e' lo slot HAD, che finche'
 *     Hadjar e' infortunato rende i punti di Tsunoda (regola sostituzione
 *     pilota, vedi CLAUDE.md e RUNBOOK_RISULTATI_GARA.md).
 *
 * Uso:
 *   node scripts/publish_asta8_squadre.js --dry   → mostra il diff, NON scrive
 *   node scripts/publish_asta8_squadre.js         → applica su Supabase
 */
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const DRY_RUN = process.argv.includes('--dry');
const AUCTION_NUMBER = 8;
const BUDGET_ADDED = 100;

// abbreviazione pilota → [nome squadra DB, prezzo]
const ASSIGN = {
  // Scudemaria Ferrari (start 100, residuo 25)
  ANT: ['Scudemaria Ferrari', 4], RUS: ['Scudemaria Ferrari', 51],
  LAW: ['Scudemaria Ferrari', 17], PER: ['Scudemaria Ferrari', 3],
  // SF – Scuderia Fainelli (start 101, residuo 0)
  NOR: ['SF – Scuderia Fainelli', 52], VER: ['SF – Scuderia Fainelli', 48],
  STR: ['SF – Scuderia Fainelli', 1],
  // ZetaRacing (start 141, residuo 79) — HAD = slot oggi occupato da TSU
  GAS: ['ZetaRacing', 5], HAD: ['ZetaRacing', 38], HUL: ['ZetaRacing', 15], ALB: ['ZetaRacing', 4],
  // Alpha Chiro Racing (start 117, residuo 71)
  HAM: ['Alpha Chiro Racing', 15], LEC: ['Alpha Chiro Racing', 8],
  BEA: ['Alpha Chiro Racing', 12], OCO: ['Alpha Chiro Racing', 11],
  // Ranocchiettos (start 103, residuo 6)
  PIA: ['Ranocchiettos', 42], LIN: ['Ranocchiettos', 26],
  COL: ['Ranocchiettos', 25], BOR: ['Ranocchiettos', 4],
  // Abdull Mazzar (start 132, residuo 118)
  SAI: ['Abdull Mazzar', 9], ALO: ['Abdull Mazzar', 3], BOT: ['Abdull Mazzar', 2],
};

const START = {
  'Scudemaria Ferrari': 100, 'SF – Scuderia Fainelli': 101, 'ZetaRacing': 141,
  'Alpha Chiro Racing': 117, 'Ranocchiettos': 103, 'Abdull Mazzar': 132,
};
const FINAL_BUDGET = {
  'Scudemaria Ferrari': 25, 'SF – Scuderia Fainelli': 0, 'ZetaRacing': 79,
  'Alpha Chiro Racing': 71, 'Ranocchiettos': 6, 'Abdull Mazzar': 118,
};

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN — nessuna scrittura ===\n' : '=== PUBBLICA ASTA 8 ===\n');

  const { data: teams } = await supabase.from('teams').select('id, name, budget');
  const { data: pilots } = await supabase.from('pilots').select('id, name, abbreviation');
  const teamByName = Object.fromEntries(teams.map(t => [t.name, t]));
  const pilotByAbbr = Object.fromEntries(pilots.map(p => [p.abbreviation, p]));

  const errors = [];
  if (Object.keys(ASSIGN).length !== 22) errors.push(`ASSIGN ha ${Object.keys(ASSIGN).length} piloti, attesi 22`);
  for (const abbr of Object.keys(ASSIGN)) {
    if (!pilotByAbbr[abbr]) errors.push(`Pilota "${abbr}" non trovato nel DB`);
    if (!teamByName[ASSIGN[abbr][0]]) errors.push(`Squadra "${ASSIGN[abbr][0]}" non trovata nel DB`);
  }
  const spent = {};
  for (const [, [tname, price]] of Object.entries(ASSIGN)) spent[tname] = (spent[tname] || 0) + price;
  for (const tname of Object.keys(FINAL_BUDGET)) {
    const exp = START[tname] - spent[tname];
    if (exp !== FINAL_BUDGET[tname]) errors.push(`${tname}: start ${START[tname]} - speso ${spent[tname]} = ${exp} ≠ residuo dichiarato ${FINAL_BUDGET[tname]}`);
    if (exp < 0) errors.push(`${tname}: budget NEGATIVO (${exp})`);
  }
  // Ogni squadra deve avere almeno 3 piloti (servono 3 titolari) e al massimo 4
  const roster = {};
  for (const [abbr, [tname]] of Object.entries(ASSIGN)) (roster[tname] ||= []).push(abbr);
  for (const [tname, r] of Object.entries(roster)) {
    if (r.length < 3) errors.push(`${tname}: solo ${r.length} piloti (minimo 3)`);
    if (r.length > 4) errors.push(`${tname}: ${r.length} piloti (massimo 4)`);
  }
  if (errors.length) { console.error('❌ VALIDAZIONE FALLITA:'); errors.forEach(e => console.error('  - ' + e)); process.exit(1); }
  console.log('✓ Validazione OK: 22 piloti, rose 3-4, budget coerenti.\n');

  let { data: a8 } = await supabase.from('auctions').select('id, is_completed').eq('auction_number', AUCTION_NUMBER).maybeSingle();
  const { data: calEv } = await supabase.from('calendar_events').select('id').eq('event_type', 'auction').eq('location', `Asta ${AUCTION_NUMBER}`).maybeSingle();
  console.log(`Asta ${AUCTION_NUMBER}: ${a8 ? `esiste (id=${a8.id}, completed=${a8.is_completed})` : 'non esiste, verra' + "' creata"}`);

  console.log('\nBudget: ATTUALE → FINALE');
  for (const t of teams) {
    const fin = FINAL_BUDGET[t.name];
    console.log(`  ${t.name.padEnd(24)} ${String(t.budget).padStart(4)} → ${String(fin).padStart(4)}${fin !== t.budget ? '  ← cambia' : ''}`);
  }
  console.log('\nRose (22 piloti):');
  for (const [tname, r] of Object.entries(roster)) {
    console.log(`  ${tname.padEnd(24)} ${r.map(a => `${a} ${ASSIGN[a][1]}M`).join(' · ')}   [speso ${spent[tname]}M]`);
  }

  if (DRY_RUN) { console.log('\n(--dry: nessuna modifica applicata)'); return; }

  if (!a8) {
    const { data: created, error } = await supabase.from('auctions')
      .insert({ calendar_event_id: calEv ? calEv.id : null, auction_number: AUCTION_NUMBER, budget_added: BUDGET_ADDED, is_completed: false })
      .select('id').single();
    if (error) throw error;
    a8 = { id: created.id };
    console.log(`\n✓ Creata Asta ${AUCTION_NUMBER} (id=${a8.id})`);
  }

  await supabase.from('pilots').update({ owner_team_id: null, purchase_price: 0 }).not('owner_team_id', 'is', null);
  console.log('✓ Piloti liberati (re-draft)');

  let lotOrder = 0;
  for (const [abbr, [tname, price]] of Object.entries(ASSIGN)) {
    lotOrder++;
    const pilot = pilotByAbbr[abbr], team = teamByName[tname];
    const { error: eP } = await supabase.from('pilots').update({ owner_team_id: team.id, purchase_price: price }).eq('id', pilot.id);
    if (eP) throw eP;
    const { error: eL } = await supabase.from('auction_lots').upsert(
      { auction_id: a8.id, pilot_id: pilot.id, winner_team_id: team.id, final_price: price, lot_order: lotOrder },
      { onConflict: 'auction_id,pilot_id' });
    if (eL) throw eL;
  }
  console.log('✓ 22 piloti assegnati + lotti registrati');

  for (const t of teams) {
    const { error } = await supabase.from('teams').update({ budget: FINAL_BUDGET[t.name] }).eq('id', t.id);
    if (error) throw error;
  }
  console.log('✓ Budget finali impostati');

  const { error: eC } = await supabase.from('auctions').update({ is_completed: true }).eq('id', a8.id);
  if (eC) throw eC;
  console.log(`✓ Asta ${AUCTION_NUMBER} chiusa (is_completed=true)`);

  const { data: check } = await supabase.from('pilots')
    .select('abbreviation, purchase_price, teams:owner_team_id(name)').not('owner_team_id', 'is', null);
  console.log(`\n=== VERIFICA: ${check.length}/22 piloti assegnati ===`);
  const byTeam = {};
  check.forEach(p => (byTeam[p.teams.name] ||= []).push(`${p.abbreviation} ${p.purchase_price}M`));
  Object.entries(byTeam).forEach(([n, r]) => console.log(`  ${n.padEnd(24)} ${r.join(' · ')}`));
  console.log(`\n✅ FATTO — Asta ${AUCTION_NUMBER} pubblicata.`);
}
main().catch(e => { console.error('ERRORE:', e.message || e); process.exit(1); });
