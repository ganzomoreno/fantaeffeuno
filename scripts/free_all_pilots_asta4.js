/**
 * free_all_pilots_asta4.js
 * Libera TUTTI i piloti per il re-draft dell'Asta 4, SENZA rimborsare i budget.
 * Modello lega: ogni asta è un re-draft completo; il budget di partenza è
 * (residuo asta precedente + budget aggiunto), e il costo rosa NON si rimborsa.
 * I budget attuali (post-apertura Asta 4) sono già quelli corretti.
 */
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwY2h1dXF3a25sZHFland4dGF6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjAwMDkxNCwiZXhwIjoyMDg3NTc2OTE0fQ.kyBXfpPY0xvbqNDxpvZLfi75m0abEcSNpx3k39qH60I';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, SERVICE_ROLE_KEY);

const DRY_RUN = process.argv.includes('--dry');

async function run() {
  console.log(DRY_RUN ? '=== DRY RUN (nessuna scrittura) ===\n' : '=== LIBERA TUTTI I PILOTI — ASTA 4 ===\n');

  const { data: teamsBefore } = await supabase.from('teams').select('id, name, budget').order('budget', { ascending: false });
  const { data: owned } = await supabase
    .from('pilots')
    .select('id, abbreviation, purchase_price, owner_team_id')
    .not('owner_team_id', 'is', null);

  console.log(`Piloti attualmente assegnati: ${owned.length}/22`);
  console.log('\nBudget PRIMA (devono restare INVARIATI):');
  teamsBefore.forEach(t => console.log(`  ${t.name}: ${t.budget}M`));

  if (DRY_RUN) {
    console.log('\n(--dry: niente modifiche)');
    return;
  }

  // Libera tutti i piloti assegnati — SENZA toccare i budget
  for (const p of owned) {
    const { error } = await supabase.from('pilots')
      .update({ owner_team_id: null, purchase_price: 0 })
      .eq('id', p.id);
    if (error) console.error(`  ERR ${p.abbreviation}: ${error.message}`);
  }
  console.log(`\n✓ ${owned.length} piloti liberati`);

  // Verifica
  const { data: teamsAfter } = await supabase.from('teams').select('name, budget').order('budget', { ascending: false });
  const { count: freeCount } = await supabase.from('pilots').select('*', { count: 'exact', head: true }).is('owner_team_id', null);
  console.log('\nBudget DOPO (devono essere identici):');
  teamsAfter.forEach(t => console.log(`  ${t.name}: ${t.budget}M`));
  console.log(`\nPiloti liberi ora: ${freeCount}/22`);
  console.log('\n=== FATTO: pronti per il re-draft Asta 4 ===');
}
run().catch(console.error);
