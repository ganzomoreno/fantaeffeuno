/**
 * free_all_pilots_asta6.js
 * One-shot: libera TUTTI i piloti per il re-draft dell'Asta 6, SENZA rimborsare.
 * Serve solo perché l'Asta 6 è stata aperta con open_asta6.js PRIMA della fix che
 * fa liberare i piloti automaticamente in openNextAuction. Dalle prossime aste
 * (Asta 7+) il pulsante "Apri Asta" nell'app farà tutto da solo.
 */
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const DRY = process.argv.includes('--dry');

async function main() {
  const { data: teamsBefore } = await sb.from('teams').select('name, budget').order('budget', { ascending: false });
  const { data: owned } = await sb.from('pilots').select('id, abbreviation').not('owner_team_id', 'is', null);
  console.log(`Piloti assegnati: ${owned.length}/22`);
  console.log('Budget (devono restare INVARIATI):');
  teamsBefore.forEach(t => console.log(`  ${t.name.padEnd(24)} ${t.budget}M`));

  if (DRY) { console.log('\n(--dry: nessuna modifica)'); return; }

  const { error } = await sb.from('pilots').update({ owner_team_id: null, purchase_price: 0 }).not('owner_team_id', 'is', null);
  if (error) throw error;

  const { count: free } = await sb.from('pilots').select('*', { count: 'exact', head: true }).is('owner_team_id', null);
  const { data: teamsAfter } = await sb.from('teams').select('name, budget').order('budget', { ascending: false });
  console.log(`\n✓ Piloti liberati. Liberi ora: ${free}/22`);
  console.log('Budget DOPO (invariati):');
  teamsAfter.forEach(t => console.log(`  ${t.name.padEnd(24)} ${t.budget}M`));
  console.log('\n✅ Pronti per il re-draft Asta 6.');
}
main().catch(e => { console.error('ERRORE:', e.message || e); process.exit(1); });
