/**
 * Genera un file Excel (.xlsx) con backup completo del DB FantaF1.
 * Foglio per ogni tabella: Teams, Pilots, Calendar, Races,
 * RaceResults (con join leggibile), Lineups (con join), Auctions,
 * AuctionLots, Switches, TeamSummary, RaceTeamScores.
 */
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const path = require('path');

const SK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwY2h1dXF3a25sZHFland4dGF6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjAwMDkxNCwiZXhwIjoyMDg3NTc2OTE0fQ.kyBXfpPY0xvbqNDxpvZLfi75m0abEcSNpx3k39qH60I';
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, SK);

(async () => {
  console.log('📥 Scarico tutti i dati dal DB...');

  const [
    teamsRes, pilotsRes, calRes, racesRes, rrRes,
    lineupsRes, auctionsRes, lotsRes, switchesRes,
  ] = await Promise.all([
    s.from('teams').select('*').order('created_at'),
    s.from('pilots').select('*').order('sort_order'),
    s.from('calendar_events').select('*').order('sort_order'),
    s.from('races').select('id, calendar_event_id, is_sprint, created_at'),
    s.from('race_results').select('id, race_id, pilot_id, position, grid_position, overtakes, dotd_rank, dnf, points_scored'),
    s.from('lineups').select('id, race_id, team_id, pilot_id, is_reserve, subbed_in_manually, subbed_out_for'),
    s.from('auctions').select('id, calendar_event_id, auction_number, budget_added, is_completed, created_at'),
    s.from('auction_lots').select('id, auction_id, pilot_id, winner_team_id, final_price, lot_order'),
    s.from('switches').select('*'),
  ]);

  const teams = teamsRes.data || [];
  const pilots = pilotsRes.data || [];
  const cal = calRes.data || [];
  const races = racesRes.data || [];
  const rr = rrRes.data || [];
  const lineups = lineupsRes.data || [];
  const auctions = auctionsRes.data || [];
  const lots = lotsRes.data || [];
  const switches = switchesRes.data || [];

  // Lookup maps
  const teamById = Object.fromEntries(teams.map(t => [t.id, t]));
  const pilotById = Object.fromEntries(pilots.map(p => [p.id, p]));
  const calById = Object.fromEntries(cal.map(c => [c.id, c]));
  const raceById = Object.fromEntries(races.map(r => [r.id, r]));
  const auctionById = Object.fromEntries(auctions.map(a => [a.id, a]));

  const wb = XLSX.utils.book_new();

  // 1) Teams
  const teamsSheet = teams.map(t => ({
    Nome: t.name,
    Manager: t.owner_name,
    Budget_Residuo: t.budget,
    Switches_Used: t.switches_used,
    Is_Admin: t.is_admin ? 'SI' : '',
    Auth_User_Id: t.auth_user_id || '',
    ID: t.id,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(teamsSheet), 'Teams');

  // 2) Pilots con owner
  const pilotsSheet = pilots.map(p => ({
    Abbr: p.abbreviation,
    Nome: p.name,
    Team_F1: p.team,
    Owner_FantaTeam: p.owner_team_id ? teamById[p.owner_team_id]?.name : '— libero —',
    Prezzo_M: p.purchase_price,
    Sort_Order: p.sort_order,
    ID: p.id,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(pilotsSheet), 'Pilots');

  // 3) Calendar
  const calSheet = cal.map(c => ({
    Sort_Order: c.sort_order,
    Data: c.event_date,
    Tipo: c.event_type,
    Location: c.location,
    Round: c.round_number,
    Is_Sprint: c.is_sprint ? 'SI' : '',
    Is_Completed: c.is_completed ? 'SI' : '',
    ID: c.id,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(calSheet), 'Calendar');

  // 4) Races (eventi con risultati)
  const racesSheet = races.map(r => {
    const ev = calById[r.calendar_event_id];
    return {
      Sort_Order: ev?.sort_order ?? '',
      Location: ev?.location ?? '',
      Data: ev?.event_date ?? '',
      Tipo: r.is_sprint ? 'SPRINT' : 'GP',
      ID: r.id,
      Calendar_Event_Id: r.calendar_event_id,
    };
  }).sort((a, b) => (a.Sort_Order || 0) - (b.Sort_Order || 0));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(racesSheet), 'Races');

  // 5) Race Results (join completo)
  const rrSheet = rr.map(r => {
    const race = raceById[r.race_id];
    const ev = race ? calById[race.calendar_event_id] : null;
    const p = pilotById[r.pilot_id];
    return {
      Gara_Sort: ev?.sort_order ?? '',
      Gara_Location: ev?.location ?? '',
      Gara_Data: ev?.event_date ?? '',
      Tipo: race?.is_sprint ? 'SPRINT' : 'GP',
      Pilota_Abbr: p?.abbreviation ?? '',
      Pilota_Nome: p?.name ?? '',
      Team_F1: p?.team ?? '',
      Grid: r.grid_position ?? '',
      Posizione: r.position ?? '',
      DNF: r.dnf ? 'SI' : '',
      Sorpassi: r.overtakes ?? 0,
      DOTD_Rank: r.dotd_rank ?? '',
      Punti_Scorati: r.points_scored,
    };
  }).sort((a, b) => {
    if (a.Gara_Sort !== b.Gara_Sort) return (a.Gara_Sort || 0) - (b.Gara_Sort || 0);
    return (a.Posizione || 99) - (b.Posizione || 99);
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rrSheet), 'RaceResults');

  // 6) Lineups (join)
  const lineupsSheet = lineups.map(l => {
    const race = raceById[l.race_id];
    const ev = race ? calById[race.calendar_event_id] : null;
    const t = teamById[l.team_id];
    const p = pilotById[l.pilot_id];
    const subOut = l.subbed_out_for ? pilotById[l.subbed_out_for]?.abbreviation : '';
    return {
      Gara_Sort: ev?.sort_order ?? '',
      Gara_Location: ev?.location ?? '',
      Gara_Data: ev?.event_date ?? '',
      Tipo: race?.is_sprint ? 'SPRINT' : 'GP',
      Team: t?.name ?? '',
      Pilota: p?.abbreviation ?? '',
      Ruolo: l.is_reserve ? 'RISERVA' : 'TITOLARE',
      Subbed_In_Manually: l.subbed_in_manually ? 'SI' : '',
      Subbed_Out_For: subOut,
    };
  }).sort((a, b) => {
    if (a.Gara_Sort !== b.Gara_Sort) return (a.Gara_Sort || 0) - (b.Gara_Sort || 0);
    if (a.Team !== b.Team) return a.Team.localeCompare(b.Team);
    return a.Ruolo.localeCompare(b.Ruolo);
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(lineupsSheet), 'Lineups');

  // 7) Auctions
  const auctionsSheet = auctions.map(a => {
    const ev = calById[a.calendar_event_id];
    return {
      Asta_Numero: a.auction_number,
      Data: ev?.event_date ?? '',
      Location: ev?.location ?? '',
      Budget_Aggiunto: a.budget_added,
      Completata: a.is_completed ? 'SI' : '',
      Created_At: a.created_at,
      ID: a.id,
    };
  }).sort((a, b) => a.Asta_Numero - b.Asta_Numero);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(auctionsSheet), 'Auctions');

  // 8) Auction Lots (join)
  const lotsSheet = lots.map(l => {
    const auction = auctionById[l.auction_id];
    const p = pilotById[l.pilot_id];
    const t = teamById[l.winner_team_id];
    return {
      Asta_Numero: auction?.auction_number ?? '',
      Lot_Order: l.lot_order,
      Pilota_Abbr: p?.abbreviation ?? '',
      Pilota_Nome: p?.name ?? '',
      Team_F1: p?.team ?? '',
      Vincitore_FantaTeam: t?.name ?? '— non aggiudicato —',
      Prezzo_Finale_M: l.final_price,
    };
  }).sort((a, b) => {
    if (a.Asta_Numero !== b.Asta_Numero) return a.Asta_Numero - b.Asta_Numero;
    return a.Lot_Order - b.Lot_Order;
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(lotsSheet), 'AuctionLots');

  // 9) Switches storico (tabella switches)
  const switchesSheet = switches.map(sw => ({
    Team: teamById[sw.team_id]?.name ?? '',
    Pilota_Out: pilotById[sw.out_pilot_id]?.abbreviation ?? '',
    Pilota_In: pilotById[sw.in_pilot_id]?.abbreviation ?? '',
    Effective_From_Race: sw.effective_from_race_id ?
      (() => { const r = raceById[sw.effective_from_race_id]; const ev = r ? calById[r.calendar_event_id] : null; return ev?.location ?? ''; })()
      : '',
    Reason: sw.reason,
    Is_Free: sw.is_free ? 'SI' : '',
    Created_At: sw.created_at,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(switchesSheet), 'Switches');

  // 10) Punteggi pilota cumulativi (riepilogo)
  const pilotTotals = {};
  pilots.forEach(p => { pilotTotals[p.id] = { abbr: p.abbreviation, name: p.name, team: p.team, totale: 0, gare: 0, dnfs: 0 }; });
  rr.forEach(r => {
    const t = pilotTotals[r.pilot_id];
    if (!t) return;
    t.totale += Number(r.points_scored || 0);
    t.gare += 1;
    if (r.dnf) t.dnfs += 1;
  });
  const pilotSummary = Object.values(pilotTotals)
    .map(t => ({ Pilota: t.abbr, Nome: t.name, Team_F1: t.team, Gare: t.gare, DNF: t.dnfs, Punti_Totali: Number(t.totale.toFixed(2)) }))
    .sort((a, b) => b.Punti_Totali - a.Punti_Totali);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(pilotSummary), 'PilotSummary');

  // 11) Punteggio team per gara (matrix)
  const lineupsByRaceTeam = {};
  lineups.forEach(l => {
    const k = `${l.race_id}|${l.team_id}`;
    if (!lineupsByRaceTeam[k]) lineupsByRaceTeam[k] = { starters: [], reserve: null, subOut: null, subInManual: false };
    if (l.is_reserve) {
      lineupsByRaceTeam[k].reserve = l;
      if (l.subbed_in_manually) lineupsByRaceTeam[k].subInManual = true;
    } else {
      lineupsByRaceTeam[k].starters.push(l);
      if (l.subbed_out_for) lineupsByRaceTeam[k].subOut = l;
    }
  });
  const rrByRacePilot = {};
  rr.forEach(r => { rrByRacePilot[`${r.race_id}|${r.pilot_id}`] = r; });

  const raceTeamScores = [];
  races.forEach(race => {
    const ev = calById[race.calendar_event_id];
    teams.forEach(t => {
      const lu = lineupsByRaceTeam[`${race.id}|${t.id}`];
      if (!lu) return;
      let total = 0;
      let detail = [];
      lu.starters.forEach(st => {
        if (lu.reserve && st.subbed_out_for === lu.reserve.pilot_id) {
          detail.push(`${pilotById[st.pilot_id]?.abbreviation}(SWAP)`);
          return;
        }
        const res = rrByRacePilot[`${race.id}|${st.pilot_id}`];
        if (res && !res.dnf) {
          total += Number(res.points_scored || 0);
          detail.push(`${pilotById[st.pilot_id]?.abbreviation}=${res.points_scored}`);
        } else {
          detail.push(`${pilotById[st.pilot_id]?.abbreviation}=DNF`);
        }
      });
      if (lu.reserve && lu.subInManual) {
        const res = rrByRacePilot[`${race.id}|${lu.reserve.pilot_id}`];
        if (res && !res.dnf) {
          total += Number(res.points_scored || 0);
          detail.push(`${pilotById[lu.reserve.pilot_id]?.abbreviation}(SUB)=${res.points_scored}`);
        }
      }
      raceTeamScores.push({
        Gara_Sort: ev?.sort_order ?? '',
        Gara: ev?.location ?? '',
        Data: ev?.event_date ?? '',
        Tipo: race.is_sprint ? 'SPRINT' : 'GP',
        Team: t.name,
        Punti: Number(total.toFixed(2)),
        Dettaglio: detail.join(' + '),
      });
    });
  });
  raceTeamScores.sort((a, b) => {
    if (a.Gara_Sort !== b.Gara_Sort) return (a.Gara_Sort || 0) - (b.Gara_Sort || 0);
    return b.Punti - a.Punti;
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(raceTeamScores), 'RaceTeamScores');

  // 12) Classifica generale team (somma da raceTeamScores)
  const teamTotals = {};
  teams.forEach(t => { teamTotals[t.id] = { name: t.name, owner: t.owner_name, totale: 0, gare: 0 }; });
  raceTeamScores.forEach(r => {
    const t = Object.values(teamTotals).find(x => x.name === r.Team);
    if (t) { t.totale += r.Punti; t.gare += 1; }
  });
  const standings = Object.values(teamTotals)
    .map(t => ({ Team: t.name, Manager: t.owner, Gare_Disputate: t.gare, Punti_Totali: Number(t.totale.toFixed(2)) }))
    .sort((a, b) => b.Punti_Totali - a.Punti_Totali)
    .map((r, i) => ({ Posizione: i + 1, ...r }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(standings), 'Standings');

  // Output
  const ts = new Date().toISOString().slice(0, 10);
  const file = path.join(process.cwd(), `fantaf1_backup_${ts}.xlsx`);
  XLSX.writeFile(wb, file);
  console.log(`\n✅ Backup generato: ${file}`);
  console.log(`   Fogli: Teams, Pilots, Calendar, Races, RaceResults, Lineups, Auctions, AuctionLots, Switches, PilotSummary, RaceTeamScores, Standings`);
})();
