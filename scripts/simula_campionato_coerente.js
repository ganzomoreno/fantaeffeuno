import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qpchuuqwknldqejwxtaz.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwY2h1dXF3a25sZHFland4dGF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMDA5MTQsImV4cCI6MjA4NzU3NjkxNH0.EswT82yM6PK0jZ7WvIrSO-tOQLUYVZkzhmU9AARhpOA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('--- STARTING COHERENT CHAMPIONSHIP SIMULATION ---');

    // 1. CLEANUP EVERYTHING
    console.log('Step 1: Cleaning up database...');
    await supabase.from('lineups').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('race_results').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('auction_lots').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('auctions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('races').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('pilots').update({ owner_team_id: null, purchase_price: null }).neq('id', '0');
    await supabase.from('teams').update({ switches_used: 0 }).neq('id', '0');

    // 2. FETCH FUNDAMENTALS
    const { data: teams } = await supabase.from('teams').select('*');
    const { data: pilots } = await supabase.from('pilots').select('*').order('id');
    const { data: events } = await supabase.from('calendar_events').select('*').order('sort_order');

    // 3. ASTA 1 (INIZIALE)
    console.log('Step 2: Simulating Auction 1 (Initial)...');
    const asta1Event = events.find(e => e.sort_order === 2);
    const { data: auction1 } = await supabase.from('auctions').insert({
        calendar_event_id: asta1Event.id,
        auction_number: 1,
        budget_added: 100,
        is_completed: true
    }).select().single();

    // Assegna TUTTI i 22 piloti (minimo 3 per team, alcuni 4)
    let availablePilots = [...pilots].filter(p => p.id !== '0').sort(() => 0.5 - Math.random());
    const auction1Lots = [];
    const ownershipUpdates = [];

    // Track spent budget to pass to Asta 2
    const spentAsta1 = {};
    teams.forEach(t => spentAsta1[t.id] = 0);

    for (let i = 0; i < 22; i++) {
        const p = availablePilots[i];
        const team = teams[i % teams.length];

        const price = Math.floor(Math.random() * 15) + 1;
        spentAsta1[team.id] += price;

        auction1Lots.push({
            auction_id: auction1.id,
            pilot_id: p.id,
            winner_team_id: team.id,
            final_price: price,
            lot_order: i + 1
        });
        ownershipUpdates.push({ id: p.id, owner_team_id: team.id, purchase_price: price });
    }
    await supabase.from('auction_lots').insert(auction1Lots);
    for (const u of ownershipUpdates) {
        await supabase.from('pilots').update({ owner_team_id: u.owner_team_id, purchase_price: u.purchase_price }).eq('id', u.id);
    }

    // 4. GARE 1 & 2
    console.log('Step 3: Simulating Race 1 & 2...');
    const raceEvents1 = events.filter(e => e.sort_order === 0 || e.sort_order === 1);
    for (const ev of raceEvents1) {
        await simulateRaceAndLineups(ev, teams);
    }

    // 5. ASTA 2 (REBOOT)
    console.log('Step 4: Simulating Auction 2 (Full Reboot)...');

    // Reset all pilots before Asta 2
    await supabase.from('pilots').update({ owner_team_id: null, purchase_price: null }).neq('id', '0');

    const asta2Event = events.find(e => e.sort_order === 5);
    const { data: auction2 } = await supabase.from('auctions').insert({
        calendar_event_id: asta2Event.id,
        auction_number: 2,
        budget_added: 100,
        is_completed: true
    }).select().single();

    const auction2Lots = [];
    const ownershipUpdates2 = [];

    availablePilots = [...pilots].filter(p => p.id !== '0').sort(() => 0.5 - Math.random());

    for (let i = 0; i < 22; i++) {
        const p = availablePilots[i];
        const team = teams[i % teams.length];

        let price = Math.floor(Math.random() * 20) + 1;

        auction2Lots.push({
            auction_id: auction2.id,
            pilot_id: p.id,
            winner_team_id: team.id,
            final_price: price,
            lot_order: i + 1
        });
        ownershipUpdates2.push({ id: p.id, owner_team_id: team.id, purchase_price: price });
    }

    await supabase.from('auction_lots').insert(auction2Lots);
    for (const u of ownershipUpdates2) {
        await supabase.from('pilots').update({ owner_team_id: u.owner_team_id, purchase_price: u.purchase_price }).eq('id', u.id);
    }

    // 6. GARE 3, 4, 5
    console.log('Step 5: Simulating Race 3, 4 & 5...');
    const raceEvents2 = events.filter(e => e.sort_order === 3 || e.sort_order === 4 || e.sort_order === 6);
    for (const ev of raceEvents2) {
        await simulateRaceAndLineups(ev, teams);
    }

    // 7. CALCOLO SWITCH FINALE
    await calculateSwitches(teams);

    console.log('--- ALL SIMULATIONS COMPLETED COHERENTLY ---');
}

async function simulateRaceAndLineups(event, teams, numPilotsOwned) {
    const { data: race } = await supabase.from('races').insert({ calendar_event_id: event.id }).select().single();
    const { data: allPilots } = await supabase.from('pilots').select('*');

    // Results for ALL 22 pilots
    const shuffled = [...allPilots].sort(() => 0.5 - Math.random());
    const results = shuffled.map((p, i) => ({
        race_id: race.id,
        pilot_id: p.id,
        grid_position: Math.floor(Math.random() * 22) + 1,
        position: (i < 19) ? i + 1 : null, // 3 DNFs
        dnf: i >= 19,
        overtakes: (i < 19) ? Math.floor(Math.random() * 5) : 0,
        dotd_rank: i === 0 ? 1 : i === 1 ? 2 : i === 2 ? 3 : null
    }));
    await supabase.from('race_results').insert(results);

    // Lineups for TEAMS
    for (const t of teams) {
        const teamPilots = allPilots.filter(p => p.owner_team_id === t.id);
        if (teamPilots.length < 3) continue;

        const starters = teamPilots.slice(0, 3);
        const reserve = teamPilots.length > 3 ? teamPilots[3] : null;

        const lineupRows = starters.map(p => ({
            race_id: race.id,
            team_id: t.id,
            pilot_id: p.id,
            is_reserve: false
        }));
        if (reserve) lineupRows.push({
            race_id: race.id,
            team_id: t.id,
            pilot_id: reserve.id,
            is_reserve: true
        });
        await supabase.from('lineups').insert(lineupRows);
    }
}

async function calculateSwitches(teams) {
    console.log('Step 6: Calculating Switches Used...');
    const { data: races } = await supabase.from('races').select('*');
    const { data: lineups } = await supabase.from('lineups').select('*');
    const { data: results } = await supabase.from('race_results').select('*');

    const switchCounts = {};
    teams.forEach(t => switchCounts[t.id] = 0);

    for (const r of races) {
        const rResults = results.filter(res => res.race_id === r.id);
        const rLineups = lineups.filter(l => l.race_id === r.id);

        for (const t of teams) {
            const tLineup = rLineups.filter(l => l.team_id === t.id);
            const starters = tLineup.filter(l => !l.is_reserve);
            const reserve = tLineup.find(l => l.is_reserve);

            if (!reserve) continue;

            const starterDNFed = starters.some(s => {
                const res = rResults.find(rr => rr.pilot_id === s.pilot_id);
                return res && res.dnf;
            });

            if (starterDNFed) {
                const resRes = rResults.find(rr => rr.pilot_id === reserve.pilot_id);
                if (resRes && !resRes.dnf) {
                    switchCounts[t.id] += 1;
                }
            }
        }
    }

    for (const tId in switchCounts) {
        await supabase.from('teams').update({ switches_used: switchCounts[tId] }).eq('id', tId);
    }
}

run();
