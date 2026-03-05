import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qpchuuqwknldqejwxtaz.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwY2h1dXF3a25sZHFland4dGF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMDA5MTQsImV4cCI6MjA4NzU3NjkxNH0.EswT82yM6PK0jZ7WvIrSO-tOQLUYVZkzhmU9AARhpOA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('--- STARTING AUCTION AND SWITCH HISTORY SIMULATION ---');

    // 1. Fetch Fundamental Data
    const { data: teams, error: e1 } = await supabase.from('teams').select('*');
    const { data: pilots, error: e2 } = await supabase.from('pilots').select('*');
    const { data: events, error: e3 } = await supabase.from('calendar_events').select('*').order('sort_order');
    const { data: races, error: e4 } = await supabase.from('races').select('id, calendar_event_id');

    if (e1 || e2 || e3 || e4) {
        console.error('Error fetching fundamental data', { e1, e2, e3, e4 });
        return;
    }

    // Clear previous auction and lot history
    console.log('Clearing old auction lots...');
    await supabase.from('auction_lots').delete().neq('id', 0);
    await supabase.from('auctions').update({ is_completed: true }).neq('id', 0); // we mark all as completed if any exist

    // Index 2 is Asta 1, Index 5 is Asta 2 based on lib/data.js CALENDAR
    const pastAuctionEvents = events.filter(e => e.sort_order === 2 || e.sort_order === 5);

    if (pastAuctionEvents.length < 2) {
        console.error("Not enough past auction events found in DB to simulate", pastAuctionEvents);
        // Continuing anyway to try...
    }

    let auctionCounter = 1;
    const lotsToInsert = [];

    // Group current pilots by their currently assigned teams.
    // We'll simulate that they were bought in "Asta 1" and "Asta 2"
    const ownedPilots = pilots.filter(p => p.owner_team_id !== null);

    for (const p of ownedPilots) {
        // Arbitrarily assign half the purchases to Auction 1, and half to Auction 2
        const targetAuctionEvent = pastAuctionEvents[(auctionCounter - 1) % pastAuctionEvents.length];

        // Ensure the `auctions` record exists for this event
        let { data: auctionInfo } = await supabase.from('auctions').select('*').eq('calendar_event_id', targetAuctionEvent.id).maybeSingle();
        if (!auctionInfo) {
            const { data: newAu } = await supabase.from('auctions')
                .insert({ calendar_event_id: targetAuctionEvent.id, auction_number: auctionCounter, is_completed: true })
                .select()
                .single();
            auctionInfo = newAu;
            auctionCounter++;
        }

        lotsToInsert.push({
            auction_id: auctionInfo.id,
            pilot_id: p.id,
            winner_team_id: p.owner_team_id,
            final_price: p.purchase_price || Math.floor(Math.random() * 20) + 1,
            lot_order: lotsToInsert.length + 1
        });
    }

    console.log(`Inserting ${lotsToInsert.length} historical auction lots...`);
    const { error: lotErr } = await supabase.from('auction_lots').insert(lotsToInsert);
    if (lotErr) console.error("Error inserting lots", lotErr);


    // 2. Simulate Switch Usage (DNFs)
    // Look at all races. Look at all lineups. Look at race results.
    // If a lineup starter DNF'd, AND a reserve existed, AND reserve didn't DNF => Switch Used +1

    console.log('Calculating Switches Used based on past Race History...');
    const switchCounts = {};
    teams.forEach(t => switchCounts[t.id] = 0);

    const { data: lineups, error: eL } = await supabase.from('lineups').select('*');
    const { data: raceResults, error: eR } = await supabase.from('race_results').select('*');

    if (eL || eR) {
        console.error('Error fetching lineups/results', { eL, eR });
        return;
    }

    for (const race of races) {
        const rLineups = lineups.filter(l => l.race_id === race.id);
        const rResults = raceResults.filter(rr => rr.race_id === race.id);

        for (const t of teams) {
            const tLineup = rLineups.filter(l => l.team_id === t.id);
            const starters = tLineup.filter(l => !l.is_reserve).map(l => l.pilot_id);
            const reserveRow = tLineup.find(l => l.is_reserve);
            const reserveId = reserveRow ? reserveRow.pilot_id : null;

            if (starters.length === 0) continue;

            let dnfCount = 0;
            starters.forEach(pid => {
                const rr = rResults.find(r => r.pilot_id === pid);
                if (rr && rr.dnf) dnfCount++;
            });

            if (dnfCount > 0 && reserveId) {
                // Did the reserve finish?
                const resRR = rResults.find(r => r.pilot_id === reserveId);
                if (resRR && !resRR.dnf) {
                    switchCounts[t.id] += 1;
                }
            }
        }
    }

    console.log('Updating team switch counters:', switchCounts);
    for (const tId of Object.keys(switchCounts)) {
        await supabase.from('teams').update({ switches_used: switchCounts[tId] }).eq('id', tId);
    }

    console.log('--- SIMULATION COMPLETE ---');
}

run().catch(console.error);
