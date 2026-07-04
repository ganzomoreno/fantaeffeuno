// Annulla l'apertura accidentale dell'Asta 5 (2026-06-27):
//   1. verifica che Asta 5 sia APERTA e abbia 0 lotti
//   2. cancella la riga auctions #5
//   3. sottrae 100M al budget di ogni squadra
// Idempotente: se l'Asta 5 non esiste più, non fa nulla.
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BUDGET_TO_REMOVE = 100;

async function main() {
  // 1. Trova l'Asta 5
  const { data: a5, error: eA } = await supabase
    .from('auctions')
    .select('id, auction_number, is_completed, budget_added')
    .eq('auction_number', 5)
    .maybeSingle();
  if (eA) throw eA;

  if (!a5) {
    console.log('Nessuna Asta 5 trovata — già annullata o mai creata. Niente da fare.');
    return;
  }
  if (a5.is_completed) {
    console.log('⚠️  Asta 5 risulta CHIUSA: non la tocco (non è un\'apertura accidentale).');
    return;
  }

  // 2. Sicurezza: deve avere 0 lotti
  const { count: lotCount, error: eL } = await supabase
    .from('auction_lots')
    .select('id', { count: 'exact', head: true })
    .eq('auction_id', a5.id);
  if (eL) throw eL;
  if (lotCount && lotCount > 0) {
    console.log(`⚠️  Asta 5 ha ${lotCount} lotti: ci sono assegnazioni reali. ANNULLO per sicurezza.`);
    return;
  }
  console.log(`Asta 5 (id=${a5.id}) aperta, 0 lotti, budget_added=${a5.budget_added}M. OK procedo.`);

  // 3. Cancella PRIMA la riga asta (se fallisce per FK, abortisce prima di toccare i budget)
  const { error: eDel } = await supabase.from('auctions').delete().eq('id', a5.id);
  if (eDel) throw eDel;
  console.log('✓ Riga auctions #5 cancellata.');

  // 4. Sottrai 100M a ogni squadra
  const remove = a5.budget_added || BUDGET_TO_REMOVE;
  const { data: teams, error: eT } = await supabase.from('teams').select('id, name, budget');
  if (eT) throw eT;
  for (const t of teams) {
    const newBudget = t.budget - remove;
    const { error: eU } = await supabase.from('teams').update({ budget: newBudget }).eq('id', t.id);
    if (eU) throw eU;
    console.log(`  ${t.name}: ${t.budget}M → ${newBudget}M`);
  }

  console.log('\n✅ Annullamento completato. Asta corrente ora torna a essere Asta 4 (chiusa).');
}

main().catch(e => { console.error('ERRORE:', e.message || e); process.exit(1); });
