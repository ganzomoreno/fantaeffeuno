import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qpchuuqwknldqejwxtaz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwY2h1dXF3a25sZHFland4dGF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMDA5MTQsImV4cCI6MjA4NzU3NjkxNH0.EswT82yM6PK0jZ7WvIrSO-tOQLUYVZkzhmU9AARhpOA';
const supabase = createClient(supabaseUrl, supabaseKey);

const ZETA_RACING_ID = 'fe291964-2daf-407e-aa7f-e5aeb24e10df';

async function verify() {
    console.log('--- VERIFYING RESET ---');

    // Check Zeta Racing pilots
    const { data: zetaPilots } = await supabase.from('pilots').select('name, abbreviation').eq('owner_team_id', ZETA_RACING_ID);
    console.log('Zeta Racing Pilots:', JSON.stringify(zetaPilots));

    // Check race results
    const { data: results } = await supabase.from('race_results').select('id');
    console.log('Total Race Results:', results ? results.length : 0);

    // Check line-ups
    const { data: lineups } = await supabase.from('lineups').select('id');
    console.log('Total Lineups:', lineups ? lineups.length : 0);

    // Check Auction 2
    const { data: auction2 } = await supabase.from('auctions').select('id').eq('auction_number', 2);
    console.log('Auction 2 records:', auction2 ? auction2.length : 0);

    console.log('--- VERIFICATION COMPLETE ---');
}

verify();
