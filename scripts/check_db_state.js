const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwY2h1dXF3a25sZHFland4dGF6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjAwMDkxNCwiZXhwIjoyMDg3NTc2OTE0fQ.kyBXfpPY0xvbqNDxpvZLfi75m0abEcSNpx3k39qH60I';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  SERVICE_ROLE_KEY
);

async function check() {
  console.log('=== PILOTS (con owner) ===');
  const { data: pilots } = await supabase
    .from('pilots')
    .select('abbreviation, name, purchase_price, owner_team_id, teams:owner_team_id(name)')
    .not('owner_team_id', 'is', null)
    .order('purchase_price', { ascending: false });

  pilots.forEach(p => {
    const teamName = p.teams ? p.teams.name : 'N/A';
    console.log(`  ${p.abbreviation} (${p.name}) → ${teamName} | ${p.purchase_price}M`);
  });

  console.log('\n=== PILOTS LIBERI ===');
  const { data: free } = await supabase
    .from('pilots')
    .select('abbreviation, name')
    .is('owner_team_id', null);
  free.forEach(p => console.log(`  ${p.abbreviation} (${p.name})`));

  console.log('\n=== TEAM BUDGETS ===');
  const { data: teams } = await supabase.from('teams').select('name, budget').order('name');
  teams.forEach(t => console.log(`  ${t.name}: ${t.budget}M`));

  console.log('\n=== AUCTION LOTS (Asta 1) ===');
  const { data: lots } = await supabase
    .from('auction_lots')
    .select('final_price, lot_order, pilots:pilot_id(abbreviation, name), teams:winner_team_id(name)')
    .order('lot_order');
  lots.forEach(l => {
    const pName = l.pilots ? `${l.pilots.abbreviation} (${l.pilots.name})` : '?';
    const tName = l.teams ? l.teams.name : '?';
    console.log(`  #${l.lot_order} ${pName} → ${tName} | ${l.final_price}M`);
  });

  console.log('\n=== RACES ===');
  const { data: races } = await supabase.from('races').select('id, is_sprint, status, calendar_event_id');
  races.forEach(r => console.log(`  ${r.id} | sprint=${r.is_sprint} | status=${r.status}`));

  console.log('\n=== RACE RESULTS COUNT ===');
  const { count: resCount } = await supabase.from('race_results').select('*', { count: 'exact', head: true });
  console.log(`  ${resCount} risultati totali`);

  console.log('\n=== LINEUPS COUNT ===');
  const { count: linCount } = await supabase.from('lineups').select('*', { count: 'exact', head: true });
  console.log(`  ${linCount} lineups totali`);
}

check().catch(console.error);
