import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qpchuuqwknldqejwxtaz.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwY2h1dXF3a25sZHFland4dGF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMDA5MTQsImV4cCI6MjA4NzU3NjkxNH0.EswT82yM6PK0jZ7WvIrSO-tOQLUYVZkzhmU9AARhpOA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('Simulating 5 Races...');

    const { data: teams, error: e1 } = await supabase.from('teams').select('*');
    const { data: pilots, error: e2 } = await supabase.from('pilots').select('*');
    const { data: events, error: e3 } = await supabase
        .from('calendar_events')
        .select('*')
        .in('sort_order', [0, 1, 3, 4, 6]);

    if (e1) console.error('Error fetching teams:', e1);
    if (e2) console.error('Error fetching pilots:', e2);
    if (e3) console.error('Error fetching events:', e3);

    if (!teams || !pilots || !events || events.length === 0) {
        console.error('Missing fundamental DB data! Teams:', teams?.length, 'Pilots:', pilots?.length, 'Events:', events?.length);
        return;
    }

    // 1. Assign pilots to teams evenly (simulate Auction)
    console.log('Distributing pilots to teams...');
    let teamIdx = 0;
    for (const p of pilots) {
        await supabase
            .from('pilots')
            .update({ owner_team_id: teams[teamIdx].id, purchase_price: Math.floor(Math.random() * 20) + 1 })
            .eq('id', p.id);
        teamIdx = (teamIdx + 1) % teams.length;
    }

    // Refresh pilots after ownership distribution
    const { data: updatedPilots } = await supabase.from('pilots').select('*');

    // 2. Loop through first 5 races and generate results + lineups
    for (const evt of events) {
        console.log(`Simulating Race: ${evt.location}...`);

        // Get/create race
        let { data: race } = await supabase.from('races').select('*').eq('calendar_event_id', evt.id).maybeSingle();
        if (!race) {
            const { data: newRace, error: eRace } = await supabase.from('races').insert({ calendar_event_id: evt.id }).select().single();
            if (eRace) console.error('Error inserting race:', eRace);
            race = newRace;
        }

        if (!race) continue;

        // Generate random results for all 22 pilots
        const shuffledPilots = [...updatedPilots].sort(() => 0.5 - Math.random());
        const raceResults = [];

        // Randomize 3 DNFs
        const dnfIndices = [Math.floor(Math.random() * 22), Math.floor(Math.random() * 22), Math.floor(Math.random() * 22)];

        shuffledPilots.forEach((p, idx) => {
            const position = idx + 1;
            const dnf = dnfIndices.includes(idx);

            raceResults.push({
                race_id: race.id,
                pilot_id: p.id,
                grid_position: Math.min(22, Math.max(1, position + Math.floor(Math.random() * 7) - 3)), // Random grid pos close to finish
                position: dnf ? null : position,
                dnf: dnf,
                overtakes: dnf ? 0 : Math.floor(Math.random() * 5),
                dotd_rank: position === 1 ? 1 : position === 2 ? 2 : position === 3 ? 3 : null,
            });
        });

        // Save results
        await supabase.from('race_results').delete().eq('race_id', race.id);
        const { error: eRes } = await supabase.from('race_results').insert(raceResults);
        if (eRes) console.error('Error inserting race results:', eRes);

        // Generate Lineups for each team (3 starters, 1 reserve if they have 4)
        for (const t of teams) {
            const teamPilots = updatedPilots.filter(p => p.owner_team_id === t.id);
            if (teamPilots.length < 3) continue;

            const starters = teamPilots.slice(0, 3);
            const reserve = teamPilots.length > 3 ? teamPilots[3] : null;

            await supabase.from('lineups').delete().eq('race_id', race.id).eq('team_id', t.id);

            const lineupRows = starters.map(p => ({
                race_id: race.id,
                team_id: t.id,
                pilot_id: p.id,
                is_reserve: false
            }));

            if (reserve) {
                lineupRows.push({
                    race_id: race.id,
                    team_id: t.id,
                    pilot_id: reserve.id,
                    is_reserve: true
                });
            }

            const { error: eLin } = await supabase.from('lineups').insert(lineupRows);
            if (eLin) console.error('Error inserting lineup:', eLin);
        }
    }

    console.log('5 Races Simulated Successfully!');
}

run().catch(console.error);
