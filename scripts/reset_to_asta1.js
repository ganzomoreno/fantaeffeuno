import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qpchuuqwknldqejwxtaz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwY2h1dXF3a25sZHFland4dGF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMDA5MTQsImV4cCI6MjA4NzU3NjkxNH0.EswT82yM6PK0jZ7WvIrSO-tOQLUYVZkzhmU9AARhpOA';
const supabase = createClient(supabaseUrl, supabaseKey);

const pilotAssignments = [
    { abbr: 'LEC', team: 'ZetaRacing', price: 54 },
    { abbr: 'ALO', team: 'ZetaRacing', price: 15 },
    { abbr: 'LIN', team: 'ZetaRacing', price: 1 },
    { abbr: 'ANT', team: 'ZetaRacing', price: 20 },

    { abbr: 'PER', team: 'Abdull Mazzar', price: 1 },
    { abbr: 'COL', team: 'Abdull Mazzar', price: 1 },
    { abbr: 'BEA', team: 'Abdull Mazzar', price: 1 },
    { abbr: 'BOT', team: 'Abdull Mazzar', price: 1 },

    { abbr: 'VER', team: 'SF – Scuderia Fainelli', price: 46 },
    { abbr: 'HAM', team: 'SF – Scuderia Fainelli', price: 34 },
    { abbr: 'ALB', team: 'SF – Scuderia Fainelli', price: 8 },
    { abbr: 'GAS', team: 'SF – Scuderia Fainelli', price: 10 },

    { abbr: 'RUS', team: 'Ranocchiettos', price: 68 },
    { abbr: 'HUL', team: 'Ranocchiettos', price: 12 },
    { abbr: 'LAW', team: 'Ranocchiettos', price: 2 },
    { abbr: 'STR', team: 'Ranocchiettos', price: 5 },

    { abbr: 'NOR', team: 'Scudemaria Ferrari', price: 41 },
    { abbr: 'SAI', team: 'Scudemaria Ferrari', price: 5 },
    { abbr: 'BOR', team: 'Scudemaria Ferrari', price: 10 },

    { abbr: 'PIA', team: 'Alpha Chiro Racing', price: 51 },
    { abbr: 'HAD', team: 'Alpha Chiro Racing', price: 17 },
    { abbr: 'OCO', team: 'Alpha Chiro Racing', price: 6 }
];

async function run() {
    console.log('--- DEFINITIVE RESET TO ASTA 1 ---');

    // 1. CLEANUP
    console.log('Cleaning up old data...');
    await supabase.from('lineups').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('race_results').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('races').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('auction_lots').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('auctions').delete().eq('auction_number', 2);
    await supabase.from('pilots').update({ owner_team_id: null, purchase_price: null }).neq('id', '0');
    await supabase.from('teams').update({ switches_used: 0, budget: 100 }).neq('id', '0');

    // 2. FETCH IDs
    const { data: teams } = await supabase.from('teams').select('id, name');
    const { data: pilots } = await supabase.from('pilots').select('id, abbreviation');
    const { data: auction1 } = await supabase.from('auctions').select('id').eq('auction_number', 1).single();

    if (!auction1) {
        console.error('Auction 1 not found!');
        return;
    }

    const teamSpent = {};
    teams.forEach(t => teamSpent[t.id] = 0);

    const lotsToInsert = [];

    // 3. APPLY ASSIGNMENTS
    console.log('Applying pilot assignments...');
    for (let i = 0; i < pilotAssignments.length; i++) {
        const assignment = pilotAssignments[i];
        const pilot = pilots.find(p => p.abbreviation === assignment.abbr);
        const team = teams.find(t => t.name === assignment.team);

        if (!pilot || !team) {
            console.error(`Could not find pilot ${assignment.abbr} or team ${assignment.team}`);
            continue;
        }

        // Update Pilot
        await supabase.from('pilots').update({
            owner_team_id: team.id,
            purchase_price: assignment.price
        }).eq('id', pilot.id);

        // Add to Lots list
        lotsToInsert.push({
            auction_id: auction1.id,
            pilot_id: pilot.id,
            winner_team_id: team.id,
            final_price: assignment.price,
            lot_order: i + 1
        });

        teamSpent[team.id] += assignment.price;
    }

    // 4. POPULATE AUCTION_LOTS
    console.log(`Inserting ${lotsToInsert.length} auction lots...`);
    await supabase.from('auction_lots').insert(lotsToInsert);

    // 5. UPDATE TEAM BUDGETS
    console.log('Updating team budgets...');
    for (const team of teams) {
        const currentBudget = 100 - (teamSpent[team.id] || 0);
        await supabase.from('teams').update({ budget: currentBudget }).eq('id', team.id);
        console.log(`Team: ${team.name} | Spent: ${teamSpent[team.id]} | Remaining: ${currentBudget}`);
    }

    console.log('--- RESET COMPLETED SUCCESSFULLY ---');
}

run();
