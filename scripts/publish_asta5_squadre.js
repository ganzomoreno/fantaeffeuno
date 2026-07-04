/**
 * publish_asta5_squadre.js
 * Pubblica le squadre dell'ASTA 5 (2026) — re-draft completo.
 *
 * Modello lega: ogni asta è un re-draft. Budget di partenza = residuo Asta 4 + 100M.
 * Il costo rosa NON si rimborsa. I budget finali qui sono impostati in modo
 * ESPLICITO (residuo = start - speso), così si corregge anche l'eventuale
 * disallineamento del campo teams.budget (es. Fainelli era 25, deve essere 112).
 *
 * Uso:
 *   node scripts/publish_asta5_squadre.js --dry   → mostra il diff, NON scrive
 *   node scripts/publish_asta5_squadre.js         → applica su Supabase
 */
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const DRY_RUN = process.argv.includes('--dry');
const AUCTION_NUMBER = 5;
const BUDGET_ADDED = 100;

// Assegnazioni: abbreviazione pilota → [nome squadra DB, prezzo]
const ASSIGN = {
  // ZetaRacing (start 275, residuo 56)
  NOR: ['ZetaRacing', 60], HAM: ['ZetaRacing', 82], VER: ['ZetaRacing', 65], BEA: ['ZetaRacing', 12],
  // Alpha Chiro Racing (start 156, residuo 1)
  LEC: ['Alpha Chiro Racing', 81], ALB: ['Alpha Chiro Racing', 2], RUS: ['Alpha Chiro Racing', 70], HUL: ['Alpha Chiro Racing', 2],
  // Abdull Mazzar (start 139, residuo 93)
  GAS: ['Abdull Mazzar', 26], SAI: ['Abdull Mazzar', 8], BOR: ['Abdull Mazzar', 12],
  // Ranocchiettos (start 132, residuo 41)
  COL: ['Ranocchiettos', 6], OCO: ['Ranocchiettos', 5], PIA: ['Ranocchiettos', 50], LAW: ['Ranocchiettos', 30],
  // Scudemaria Ferrari (start 128, residuo 0)
  LIN: ['Scudemaria Ferrari', 5], ANT: ['Scudemaria Ferrari', 89], HAD: ['Scudemaria Ferrari', 34],
  // SF – Scuderia Fainelli (start 116, residuo 112)
  PER: ['SF – Scuderia Fainelli', 1], BOT: ['SF – Scuderia Fainelli', 1], ALO: ['SF – Scuderia Fainelli', 1], STR: ['SF – Scuderia Fainelli', 1],
};

// Residuo finale esplicito per squadra
const FINAL_BUDGET = {
  'ZetaRacing': 56,
  'Alpha Chiro Racing': 1,
  'Abdull Mazzar': 93,
  'Ranocchiettos': 41,
  'Scudemaria Ferrari': 0,
  'SF – Scuderia Fainelli': 112,
};

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN — nessuna scrittura ===\n' : '=== PUBBLICA ASTA 5 ===\n');

  const { data: teams } = await supabase.from('teams').select('id, name, budget');
  const { data: pilots } = await supabase.from('pilots').select('id, name, abbreviation, owner_team_id, purchase_price');
  const teamByName = Object.fromEntries(teams.map(t => [t.name, t]));
  const pilotByAbbr = Object.fromEntries(pilots.map(p => [p.abbreviation, p]));

  // ── Validazioni preliminari ──────────────────────────────────────────────
  const errors = [];
  if (Object.keys(ASSIGN).length !== 22) errors.push(`ASSIGN ha ${Object.keys(ASSIGN).length} piloti, attesi 22`);
  for (const abbr of Object.keys(ASSIGN)) {
    if (!pilotByAbbr[abbr]) errors.push(`Pilota "${abbr}" non trovato nel DB`);
    if (!teamByName[ASSIGN[abbr][0]]) errors.push(`Squadra "${ASSIGN[abbr][0]}" non trovata nel DB`);
  }
  // Coerenza budget: residuo == start(=residuo+speso) → speso == start - residuo
  const spentByTeam = {};
  for (const [abbr, [tname, price]] of Object.entries(ASSIGN)) {
    spentByTeam[tname] = (spentByTeam[tname] || 0) + price;
  }
  const START = { 'ZetaRacing':275,'Alpha Chiro Racing':156,'Abdull Mazzar':139,'Ranocchiettos':132,'Scudemaria Ferrari':128,'SF – Scuderia Fainelli':116 };
  for (const tname of Object.keys(FINAL_BUDGET)) {
    const expected = START[tname] - spentByTeam[tname];
    if (expected !== FINAL_BUDGET[tname]) errors.push(`${tname}: start ${START[tname]} - speso ${spentByTeam[tname]} = ${expected} ≠ residuo dichiarato ${FINAL_BUDGET[tname]}`);
  }
  if (errors.length) { console.error('❌ VALIDAZIONE FALLITA:'); errors.forEach(e => console.error('  - ' + e)); process.exit(1); }
  console.log('✓ Validazione OK: 22 piloti, squadre e budget coerenti.\n');

  // ── Trova/crea la riga Asta 5 ────────────────────────────────────────────
  let { data: a5 } = await supabase.from('auctions').select('id, is_completed').eq('auction_number', AUCTION_NUMBER).maybeSingle();
  const { data: calEv } = await supabase.from('calendar_events').select('id').eq('event_type', 'auction').eq('location', `Asta ${AUCTION_NUMBER}`).maybeSingle();
  console.log(`Asta ${AUCTION_NUMBER} esistente: ${a5 ? `sì (id=${a5.id}, completed=${a5.is_completed})` : 'no, verrà creata'}`);
  console.log(`Calendar event "Asta ${AUCTION_NUMBER}": ${calEv ? calEv.id : '⚠️ NON TROVATO'}`);

  // ── Diff budget ──────────────────────────────────────────────────────────
  console.log('\nBudget: ATTUALE → FINALE');
  for (const t of teams) {
    const fin = FINAL_BUDGET[t.name];
    const flag = fin !== t.budget ? '  ← cambia' : '';
    console.log(`  ${t.name.padEnd(24)} ${String(t.budget).padStart(4)} → ${String(fin).padStart(4)}${flag}`);
  }
  console.log('\nAssegnazioni piloti (22):');
  for (const [abbr, [tname, price]] of Object.entries(ASSIGN)) {
    console.log(`  ${abbr.padEnd(4)} ${pilotByAbbr[abbr].name.padEnd(22)} → ${tname.padEnd(24)} @ ${price}M`);
  }

  if (DRY_RUN) { console.log('\n(--dry: nessuna modifica applicata)'); return; }

  // ── SCRITTURA ────────────────────────────────────────────────────────────
  // 1. Crea Asta 5 se non esiste (senza toccare budget: li impostiamo esplicitamente dopo)
  if (!a5) {
    const { data: created, error } = await supabase.from('auctions')
      .insert({ calendar_event_id: calEv ? calEv.id : null, auction_number: AUCTION_NUMBER, budget_added: BUDGET_ADDED, is_completed: false })
      .select('id').single();
    if (error) throw error;
    a5 = { id: created.id, is_completed: false };
    console.log(`\n✓ Creata Asta 5 (id=${a5.id})`);
  }

  // 2. Libera tutti i piloti (re-draft)
  await supabase.from('pilots').update({ owner_team_id: null, purchase_price: 0 }).not('owner_team_id', 'is', null);
  console.log('✓ Piloti liberati (re-draft)');

  // 3. Assegna piloti + registra i lotti
  let lotOrder = 0;
  for (const [abbr, [tname, price]] of Object.entries(ASSIGN)) {
    lotOrder++;
    const pilot = pilotByAbbr[abbr];
    const team = teamByName[tname];
    const { error: eP } = await supabase.from('pilots').update({ owner_team_id: team.id, purchase_price: price }).eq('id', pilot.id);
    if (eP) throw eP;
    const { error: eL } = await supabase.from('auction_lots').upsert(
      { auction_id: a5.id, pilot_id: pilot.id, winner_team_id: team.id, final_price: price, lot_order: lotOrder },
      { onConflict: 'auction_id,pilot_id' });
    if (eL) throw eL;
  }
  console.log(`✓ 22 piloti assegnati + lotti registrati (Asta 5)`);

  // 4. Imposta i budget finali ESPLICITAMENTE
  for (const t of teams) {
    const { error } = await supabase.from('teams').update({ budget: FINAL_BUDGET[t.name] }).eq('id', t.id);
    if (error) throw error;
  }
  console.log('✓ Budget finali impostati');

  // 5. Chiudi l'Asta 5
  const { error: eC } = await supabase.from('auctions').update({ is_completed: true }).eq('id', a5.id);
  if (eC) throw eC;
  console.log('✓ Asta 5 chiusa (is_completed=true)');

  console.log('\n✅ FATTO — Asta 5 pubblicata.');
}
main().catch(e => { console.error('ERRORE:', e.message || e); process.exit(1); });
