/**
 * open_asta6.js — Apre l'Asta 6 (mirror di lib/db.js openNextAuction).
 * 1. mostra budget attuali + rose con prezzi (valori in campo)
 * 2. se non --dry: crea la riga auctions #6 (aperta) e aggiunge +100M a ogni squadra
 * Idempotente: se esiste già un'asta aperta, NON ri-aggiunge budget.
 *
 * Uso: node scripts/open_asta6.js --dry   (mostra, non scrive)
 *      node scripts/open_asta6.js         (apre l'asta)
 */
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const DRY = process.argv.includes('--dry');
const BUDGET_TO_ADD = 100;

async function main() {
  const { data: teams } = await sb.from('teams').select('id, name, budget').order('created_at');
  const { data: pilots } = await sb.from('pilots').select('id, name, abbreviation, f1_team, purchase_price, owner_team_id').order('sort_order');
  const { data: auctions } = await sb.from('auctions').select('id, auction_number, is_completed, budget_added').order('auction_number');
  const tById = Object.fromEntries(teams.map(t => [t.id, t.name]));

  console.log('=== VALORI IN CAMPO (rose Asta 5) ===');
  for (const t of teams) {
    const rosa = pilots.filter(p => p.owner_team_id === t.id);
    const spesa = rosa.reduce((s, p) => s + (p.purchase_price || 0), 0);
    console.log(`\n${t.name}  —  budget ${t.budget}M  (rosa: ${rosa.length} piloti, valore ${spesa}M)`);
    rosa.sort((a,b)=>(b.purchase_price||0)-(a.purchase_price||0))
        .forEach(p => console.log(`   ${p.abbreviation.padEnd(4)} ${p.name.padEnd(22)} ${String(p.purchase_price||0).padStart(3)}M  (${p.f1_team})`));
  }
  const freeP = pilots.filter(p => !p.owner_team_id);
  if (freeP.length) console.log(`\nPiloti liberi: ${freeP.map(p=>p.abbreviation).join(', ')}`);

  console.log('\n=== STATO ASTE ===');
  auctions.forEach(a => console.log(`  Asta ${a.auction_number}: ${a.is_completed ? 'chiusa' : 'APERTA'} (budget_added=${a.budget_added})`));

  const alreadyOpen = auctions.find(a => !a.is_completed);
  const nextNumber = auctions.reduce((m,a)=>Math.max(m,a.auction_number),0) + 1;

  console.log('\n=== BUDGET: ATTUALE → DOPO APERTURA (+100M) ===');
  teams.forEach(t => console.log(`  ${t.name.padEnd(24)} ${String(t.budget).padStart(4)} → ${String(t.budget + BUDGET_TO_ADD).padStart(4)}`));

  if (alreadyOpen) { console.log(`\n⚠️  Esiste già l'Asta ${alreadyOpen.auction_number} APERTA: non apro nulla, non ri-aggiungo budget.`); return; }

  // Trova il calendar_event "Asta N"
  const { data: calEv } = await sb.from('calendar_events').select('id, sort_order, location')
    .eq('event_type', 'auction').eq('location', `Asta ${nextNumber}`).maybeSingle();
  console.log(`\nProssima asta: Asta ${nextNumber} | calendar_event: ${calEv ? calEv.id : '⚠️ NON TROVATO'}`);
  if (!calEv) throw new Error(`Calendar event "Asta ${nextNumber}" non trovato.`);

  if (DRY) { console.log('\n(--dry: nessuna scrittura — asta NON aperta)'); return; }

  // 1. Crea la riga asta (aperta)
  const { data: created, error: eIns } = await sb.from('auctions')
    .insert({ calendar_event_id: calEv.id, auction_number: nextNumber, budget_added: BUDGET_TO_ADD, is_completed: false })
    .select('id, auction_number').single();
  if (eIns) throw eIns;
  console.log(`\n✓ Creata Asta ${created.auction_number} (id=${created.id}, aperta)`);

  // 2. +100M a ogni squadra
  for (const t of teams) {
    const { error } = await sb.from('teams').update({ budget: t.budget + BUDGET_TO_ADD }).eq('id', t.id);
    if (error) throw error;
  }
  console.log('✓ +100M aggiunti a tutte le squadre');

  const { data: after } = await sb.from('teams').select('name, budget').order('created_at');
  console.log('\n=== BUDGET DOPO ===');
  after.forEach(t => console.log(`  ${t.name.padEnd(24)} ${t.budget}M`));
  console.log(`\n✅ Asta ${created.auction_number} APERTA. Ora gestibile dall'app.`);
}
main().catch(e => { console.error('ERRORE:', e.message || e); process.exit(1); });
