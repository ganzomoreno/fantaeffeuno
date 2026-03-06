/**
 * db.js — Supabase API layer
 * Tutti i dati vengono trasformati nel formato atteso dall'app
 * (compatibile con scoring.js e tutti i componenti esistenti).
 */

import { supabase } from './supabase';

// ─── AUCTIONS ─────────────────────────────────────────────────────────────────

/**
 * Restituisce lo stato dell'asta corrente (prima non completata).
 * { id, auctionNumber, isCompleted, location, sortOrder } | null se tutte chiuse
 */
export async function fetchCurrentAuction() {
  const { data, error } = await supabase
    .from('auctions')
    .select('id, auction_number, is_completed, budget_added, calendar_events(sort_order, location)')
    .order('auction_number')
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    auctionNumber: data.auction_number,
    isCompleted: data.is_completed,
    budgetAdded: data.budget_added,
    location: data.calendar_events?.location,
    sortOrder: data.calendar_events?.sort_order,
  };
}

/** Chiude l'asta corrente (is_completed = true). */
export async function closeAuction(auctionId) {
  const { error } = await supabase
    .from('auctions')
    .update({ is_completed: true })
    .eq('id', auctionId);
  if (error) throw error;
}

/**
 * Recupera lo storico dei lotti per un'asta specifica (o per tutte se non specificato)
 */
export async function fetchAuctionLots(auctionId = null) {
  let query = supabase
    .from('auction_lots')
    .select(`
      id, final_price, lot_order,
      auctions!inner(auction_number, budget_added),
      pilots!inner(id, name, abbreviation, f1_team),
      teams!inner(id, name)
    `)
    .order('lot_order', { ascending: true });

  if (auctionId) query = query.eq('auction_id', auctionId);

  const { data, error } = await query;
  if (error) throw error;

  return data.map(row => ({
    id: row.id,
    auctionNumber: row.auctions.auction_number,
    budgetAdded: row.auctions.budget_added,
    finalPrice: row.final_price,
    lotOrder: row.lot_order,
    pilot: {
      id: row.pilots.id,
      name: row.pilots.name,
      abbreviation: row.pilots.abbreviation,
      team: row.pilots.f1_team
    },
    team: {
      id: row.teams.id,
      name: row.teams.name
    }
  }));
}

/**
 * Apre l'asta successiva:
 * 1. Aggiunge budgetAdded FM al budget di ogni squadra
 * 2. Marca la prossima asta come corrente (lascia is_completed=false, già di default)
 * Restituisce il nuovo oggetto asta.
 */
export async function openNextAuction(budgetToAdd) {
  // 1. Leggi tutte le squadre
  const { data: teams, error: e1 } = await supabase
    .from('teams').select('id, budget');
  if (e1) throw e1;

  // 2. Aggiorna budget in parallelo
  await Promise.all(teams.map(t =>
    supabase.from('teams').update({ budget: t.budget + budgetToAdd }).eq('id', t.id)
  ));

  // 3. Trova la prossima asta non completata
  const { data: next, error: e2 } = await supabase
    .from('auctions')
    .select('id, auction_number, is_completed, budget_added, calendar_events(sort_order, location)')
    .eq('is_completed', false)
    .order('auction_number')
    .limit(1)
    .maybeSingle();
  if (e2) throw e2;
  if (!next) return null;
  return {
    id: next.id,
    auctionNumber: next.auction_number,
    isCompleted: next.is_completed,
    budgetAdded: next.budget_added,
    location: next.calendar_events?.location,
    sortOrder: next.calendar_events?.sort_order,
  };
}

// ─── TEAMS ────────────────────────────────────────────────────────────────────

/** Converte riga DB → formato app */
function toAppTeam(row) {
  return {
    id: row.id,
    name: row.name,
    owner: row.owner_name,
    budget: row.budget,
    switchesUsed: row.switches_used,
    isAdmin: row.is_admin,
  };
}

export async function fetchTeams() {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .order('created_at');
  if (error) throw error;
  return data.map(toAppTeam);
}

export async function updateTeam(teamId, fields) {
  // fields: oggetto con chiavi DB (owner_name, switches_used, budget, name)
  const { error } = await supabase
    .from('teams')
    .update(fields)
    .eq('id', teamId);
  if (error) throw error;
}

// ─── PILOTS ───────────────────────────────────────────────────────────────────

function toAppPilot(row) {
  return {
    id: row.id,
    name: row.name,
    abbreviation: row.abbreviation || row.name.split(' ').pop().slice(0, 3).toUpperCase(),
    team: row.f1_team,
    price: row.purchase_price,
    owner: row.owner_team_id,  // UUID | null
  };
}

export async function fetchPilots() {
  // Ordine fisso = classifica costruttori 2025 (colonna sort_order)
  const { data, error } = await supabase
    .from('pilots')
    .select('*')
    .order('sort_order');
  if (error) throw error;
  return data.map(toAppPilot);
}

export async function assignPilot(pilotId, teamId, price, auctionId) {
  // Aggiorna il pilota
  const { error: e1 } = await supabase
    .from('pilots')
    .update({ owner_team_id: teamId, purchase_price: price })
    .eq('id', pilotId);
  if (e1) throw e1;

  // Se c'è un'asta attiva, traccia l'acquisto nello storico
  if (auctionId) {
    // Scopri quante chiamate sono state fatte in questa asta (per il lot_order)
    const { count } = await supabase
      .from('auction_lots')
      .select('id', { count: 'exact', head: true })
      .eq('auction_id', auctionId);

    const { error: eLot } = await supabase
      .from('auction_lots')
      .upsert({
        auction_id: auctionId,
        pilot_id: pilotId,
        winner_team_id: teamId,
        final_price: price,
        lot_order: (count || 0) + 1
      }, { onConflict: 'auction_id,pilot_id' });
    if (eLot) throw eLot;
  }

  // Decrementa il budget della squadra
  const { data: team, error: e2 } = await supabase
    .from('teams')
    .select('budget')
    .eq('id', teamId)
    .single();
  if (e2) throw e2;

  const { error: e3 } = await supabase
    .from('teams')
    .update({ budget: team.budget - price })
    .eq('id', teamId);
  if (e3) throw e3;
}

export async function releasePilot(pilotId, auctionId) {
  // Legge owner e prezzo corrente
  const { data: pilot, error: e1 } = await supabase
    .from('pilots')
    .select('owner_team_id, purchase_price')
    .eq('id', pilotId)
    .single();
  if (e1) throw e1;

  if (auctionId) {
    await supabase.from('auction_lots')
      .delete()
      .eq('auction_id', auctionId)
      .eq('pilot_id', pilotId);
  }

  // Restituisce il budget alla squadra
  if (pilot.owner_team_id) {
    const { data: team, error: e2 } = await supabase
      .from('teams')
      .select('budget')
      .eq('id', pilot.owner_team_id)
      .single();
    if (e2) throw e2;

    const { error: e3 } = await supabase
      .from('teams')
      .update({ budget: team.budget + pilot.purchase_price })
      .eq('id', pilot.owner_team_id);
    if (e3) throw e3;
  }

  // Libera il pilota
  const { error: e4 } = await supabase
    .from('pilots')
    .update({ owner_team_id: null, purchase_price: 0 })
    .eq('id', pilotId);
  if (e4) throw e4;
}

export async function updatePilotFields(pilotId, fields) {
  // fields: { name?, f1_team?, owner_team_id?, purchase_price? }
  const { error } = await supabase
    .from('pilots')
    .update(fields)
    .eq('id', pilotId);
  if (error) throw error;
}

// ─── CALENDAR EVENTS ──────────────────────────────────────────────────────────

/** Restituisce la UUID della calendar_event dato il sort_order (0-based index) */
async function getCalendarEventId(sortOrder) {
  const { data, error } = await supabase
    .from('calendar_events')
    .select('id')
    .eq('sort_order', sortOrder)
    .single();
  if (error) throw new Error(`Calendar event non trovato per sort_order=${sortOrder}`);
  return data.id;
}

/** Ottiene o crea una race per il calendar event dato */
async function getOrCreateRace(calendarEventId) {
  const { data: existing } = await supabase
    .from('races')
    .select('id')
    .eq('calendar_event_id', calendarEventId)
    .maybeSingle();

  if (existing) return existing.id;

  const { data, error } = await supabase
    .from('races')
    .insert({ calendar_event_id: calendarEventId })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

// ─── RACES ────────────────────────────────────────────────────────────────────

/**
 * Restituisce solo le gare con risultati inseriti.
 * Formato: [{ calendarIndex, results: [{ pilotId, position, dnf, overtakes, fastestLap, dotdRank }] }]
 */
export async function fetchRaces() {
  const { data, error } = await supabase
    .from('races')
    .select(`
      id,
      is_sprint,
      calendar_events!inner(sort_order, location),
      race_results(pilot_id, grid_position, position, overtakes, dotd_rank, dnf)
    `);
  if (error) throw error;

  return data
    .filter(r => r.race_results && r.race_results.length > 0)
    .map(r => ({
      calendarIndex: r.calendar_events.sort_order,
      location: r.calendar_events.location,
      results: r.race_results.map(rr => ({
        pilotId: rr.pilot_id,
        gridPosition: rr.grid_position || null,
        position: rr.position || 0,
        dnf: rr.dnf,
        overtakes: rr.overtakes || 0,
        dotdRank: rr.dotd_rank || 0,
      })),
    }));
}

export async function saveRaceResults(calendarIndex, results) {
  const calEventId = await getCalendarEventId(calendarIndex);
  const raceId = await getOrCreateRace(calEventId);

  // Cancella i risultati esistenti e reinserisce
  await supabase.from('race_results').delete().eq('race_id', raceId);

  const rows = results
    .filter(r => r.position > 0 || r.dnf)
    .map(r => ({
      race_id: raceId,
      pilot_id: r.pilotId,
      grid_position: r.gridPosition || null,
      position: r.position || null,
      overtakes: r.overtakes || 0,
      dotd_rank: r.dotdRank || null,
      dnf: r.dnf || false,
    }));

  if (rows.length > 0) {
    const { error } = await supabase.from('race_results').insert(rows);
    if (error) throw error;
  }
}

export async function deleteRace(calendarIndex) {
  const calEventId = await getCalendarEventId(calendarIndex);
  const { error } = await supabase
    .from('races')
    .delete()
    .eq('calendar_event_id', calEventId);
  if (error) throw error;
}

// ─── LINEUPS ──────────────────────────────────────────────────────────────────

/**
 * Restituisce le formazioni nel formato app:
 * { "race_{sortOrder}": { "{teamId}": [{ id: pilotId, subbedOutFor: null }, ...] } }
 */
export async function fetchLineups() {
  const { data, error } = await supabase
    .from('lineups')
    .select(`
      race_id, team_id, pilot_id, is_reserve, subbed_in_manually, subbed_out_for,
      races!inner(calendar_events!inner(sort_order))
    `);
  if (error) throw error;

  const starters = {};
  const reserves = {};
  data.forEach(l => {
    const sortOrder = l.races.calendar_events.sort_order;
    const key = `race_${sortOrder}`;

    // Save lineup item instead of just pilot ID
    const item = {
      id: l.pilot_id,
      subbedInManually: l.subbed_in_manually,
      subbedOutFor: l.subbed_out_for
    };

    if (l.is_reserve) {
      if (!reserves[key]) reserves[key] = {};
      reserves[key][l.team_id] = item;
    } else {
      if (!starters[key]) starters[key] = {};
      if (!starters[key][l.team_id]) starters[key][l.team_id] = [];
      starters[key][l.team_id].push(item);
    }
  });
  return { starters, reserves };
}

/**
 * Salva la formazione (lista piloti titolari) per un team in una gara.
 * Sostituisce integralmente i record precedenti.
 */
export async function saveLineup(calendarIndex, teamId, pilotIds, reservePilotId = null) {
  const calEventId = await getCalendarEventId(calendarIndex);
  const raceId = await getOrCreateRace(calEventId);

  // Cancella la formazione precedente di questo team
  await supabase
    .from('lineups')
    .delete()
    .eq('race_id', raceId)
    .eq('team_id', teamId);

  if (pilotIds.length === 0) return;

  const rows = pilotIds.map(pid => ({
    race_id: raceId,
    team_id: teamId,
    pilot_id: pid,
    is_reserve: false,
    subbed_in_manually: false,
    subbed_out_for: null
  }));

  if (reservePilotId) {
    rows.push({
      race_id: raceId,
      team_id: teamId,
      pilot_id: reservePilotId,
      is_reserve: true,
      subbed_in_manually: false,
      subbed_out_for: null
    });
  }

  const { error } = await supabase.from('lineups').insert(rows);
  if (error) throw error;
}

/**
 * Applica uno switch manuale post-gara.
 */
export async function applyManualSwitch(calendarIndex, teamId, starterPilotId, reservePilotId) {
  const calEventId = await getCalendarEventId(calendarIndex);
  const raceId = await getOrCreateRace(calEventId);

  // Increment team switches used
  const { data: team, error: e1 } = await supabase.from('teams').select('switches_used').eq('id', teamId).single();
  if (e1) throw e1;
  const { error: e2 } = await supabase.from('teams').update({ switches_used: team.switches_used + 1 }).eq('id', teamId);
  if (e2) throw e2;

  // Set starter as subbed_out_for
  const { error: e3 } = await supabase.from('lineups').update({ subbed_out_for: reservePilotId })
    .eq('race_id', raceId).eq('team_id', teamId).eq('pilot_id', starterPilotId);
  if (e3) throw e3;

  // Set reserve as subbed_in_manually
  const { error: e4 } = await supabase.from('lineups').update({ subbed_in_manually: true })
    .eq('race_id', raceId).eq('team_id', teamId).eq('pilot_id', reservePilotId);
  if (e4) throw e4;
}
