/**
 * db.js — Supabase API layer
 * Tutti i dati vengono trasformati nel formato atteso dall'app
 * (compatibile con scoring.js e tutti i componenti esistenti).
 */

import { supabase } from './supabase.js';

// ─── AUCTIONS ─────────────────────────────────────────────────────────────────

/**
 * Restituisce lo stato dell'asta corrente (prima non completata).
 * { id, auctionNumber, isCompleted, location, sortOrder } | null se tutte chiuse
 */
export async function fetchCurrentAuction() {
  const { data, error } = await supabase
    .from('auctions')
    .select('id, auction_number, is_completed, budget_added, calendar_events(sort_order, location)')
    .order('auction_number');
  if (error) throw error;
  if (!data || data.length === 0) return null;
  // L'asta "corrente" è la prima ancora APERTA (non completata). Se sono tutte
  // chiuse, è l'ultima in ordine di numero: così l'admin vede l'ultima asta
  // chiusa (sola lettura) e può aprire quella successiva.
  const row = data.find(a => !a.is_completed) || data[data.length - 1];
  return {
    id: row.id,
    auctionNumber: row.auction_number,
    isCompleted: row.is_completed,
    budgetAdded: row.budget_added,
    location: row.calendar_events?.location,
    sortOrder: row.calendar_events?.sort_order,
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
  // 1. Leggi tutte le aste esistenti
  const { data: auctions, error: eA } = await supabase
    .from('auctions')
    .select('id, auction_number, is_completed, budget_added, calendar_events(sort_order, location)')
    .order('auction_number');
  if (eA) throw eA;

  // Idempotenza: se esiste già un'asta APERTA, è quella la "corrente".
  // Restituiscila senza ri-aggiungere budget (evita il +100M doppio).
  const alreadyOpen = (auctions || []).find(a => !a.is_completed);
  if (alreadyOpen) {
    return {
      id: alreadyOpen.id,
      auctionNumber: alreadyOpen.auction_number,
      isCompleted: alreadyOpen.is_completed,
      budgetAdded: alreadyOpen.budget_added,
      location: alreadyOpen.calendar_events?.location,
      sortOrder: alreadyOpen.calendar_events?.sort_order,
    };
  }

  // 2. Calcola il numero della prossima asta e trova il suo calendar_event
  const lastNumber = (auctions || []).reduce((m, a) => Math.max(m, a.auction_number), 0);
  const nextNumber = lastNumber + 1;
  const { data: calEv, error: eC } = await supabase
    .from('calendar_events')
    .select('id, sort_order, location')
    .eq('event_type', 'auction')
    .eq('location', `Asta ${nextNumber}`)
    .maybeSingle();
  if (eC) throw eC;
  if (!calEv) throw new Error(`Calendar event "Asta ${nextNumber}" non trovato: impossibile aprire la prossima asta.`);

  // 3. Crea la riga dell'asta successiva (aperta)
  const { data: created, error: eIns } = await supabase
    .from('auctions')
    .insert({
      calendar_event_id: calEv.id,
      auction_number: nextNumber,
      budget_added: budgetToAdd,
      is_completed: false,
    })
    .select('id, auction_number, is_completed, budget_added')
    .single();
  if (eIns) throw eIns;

  // 4. Solo ora che l'asta è creata, aggiungi il budget a ogni squadra
  const { data: teams, error: eT } = await supabase.from('teams').select('id, budget');
  if (eT) throw eT;
  await Promise.all(teams.map(t =>
    supabase.from('teams').update({ budget: t.budget + budgetToAdd }).eq('id', t.id)
  ));

  return {
    id: created.id,
    auctionNumber: created.auction_number,
    isCompleted: created.is_completed,
    budgetAdded: created.budget_added,
    location: calEv.location,
    sortOrder: calEv.sort_order,
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
    authUserId: row.auth_user_id,
  };
}

export async function fetchTeams() {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .order('created_at');
  if (error) throw error;

  // Deriva switches_used DINAMICAMENTE dalle lineups del DB:
  // counter = numero di race distinte in cui il team ha almeno una lineup
  // con subbed_in_manually = true. Questo rende il sistema self-healing
  // anche se il campo teams.switches_used (denormalizzato) e' fuori sync.
  const { data: switchRows } = await supabase
    .from('lineups')
    .select('team_id, race_id')
    .eq('subbed_in_manually', true)
    .eq('is_reserve', true);

  const derived = new Map();
  (switchRows || []).forEach(r => {
    const key = r.team_id;
    if (!derived.has(key)) derived.set(key, new Set());
    derived.get(key).add(r.race_id);
  });

  return data.map(row => {
    const t = toAppTeam(row);
    const realCount = (derived.get(row.id) || new Set()).size;
    // Usa il valore derivato — autoritativo. Logga in dev se differisce.
    if (process.env.NODE_ENV !== 'production' && realCount !== row.switches_used) {
      console.warn(`[fetchTeams] ${row.name}: derived ${realCount} switches, DB ${row.switches_used}`);
    }
    t.switchesUsed = realCount;
    return t;
  });
}

/**
 * Sincronizza teams.switches_used col conteggio reale derivato dalle lineups.
 * Da chiamare una tantum o come migrazione di consistenza.
 */
export async function syncSwitchesUsedAll() {
  const { data: switchRows } = await supabase
    .from('lineups')
    .select('team_id, race_id')
    .eq('subbed_in_manually', true)
    .eq('is_reserve', true);
  const derived = new Map();
  (switchRows || []).forEach(r => {
    if (!derived.has(r.team_id)) derived.set(r.team_id, new Set());
    derived.get(r.team_id).add(r.race_id);
  });
  const { data: teams } = await supabase.from('teams').select('id, name, switches_used');
  const out = [];
  for (const t of teams) {
    const real = (derived.get(t.id) || new Set()).size;
    if (real !== t.switches_used) {
      await supabase.from('teams').update({ switches_used: real }).eq('id', t.id);
      out.push({ name: t.name, before: t.switches_used, after: real });
    }
  }
  return out;
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
  // 1. Get current state to handle budget differential
  const { data: oldData, error: eFetch } = await supabase
    .from('pilots')
    .select('purchase_price, owner_team_id')
    .eq('id', pilotId)
    .single();
  if (eFetch) throw eFetch;

  const oldPrice = oldData.purchase_price || 0;
  const oldOwner = oldData.owner_team_id;

  // 2. Perform the update on pilots table
  const { error: eUpdate } = await supabase
    .from('pilots')
    .update(fields)
    .eq('id', pilotId);
  if (eUpdate) throw eUpdate;

  // 3. Sync with auction_lots (Auction 1 is the primary focus for historical data)
  if (fields.purchase_price !== undefined || fields.owner_team_id !== undefined) {
    const { data: auction1 } = await supabase
      .from('auctions')
      .select('id')
      .eq('auction_number', 1)
      .single();

    if (auction1) {
      // Upsert/Update the lot for this pilot in Auction 1
      await supabase.from('auction_lots').upsert({
        auction_id: auction1.id,
        pilot_id: pilotId,
        winner_team_id: fields.owner_team_id !== undefined ? fields.owner_team_id : oldOwner,
        final_price: fields.purchase_price !== undefined ? fields.purchase_price : oldPrice,
        lot_order: 1 // Default if not existing, but reset script already populated these
      }, { onConflict: 'auction_id,pilot_id' });
    }
  }

  // 4. Update Team Budgets if price or owner changed
  const newPrice = fields.purchase_price !== undefined ? fields.purchase_price : oldPrice;
  const newOwner = fields.owner_team_id !== undefined ? fields.owner_team_id : oldOwner;

  // Case A: Price changed for the same owner
  if (oldOwner === newOwner && oldOwner !== null && oldPrice !== newPrice) {
    const diff = newPrice - oldPrice;
    const { data: t } = await supabase.from('teams').select('budget').eq('id', oldOwner).single();
    if (t) {
      await supabase.from('teams').update({ budget: t.budget - diff }).eq('id', oldOwner);
    }
  }

  // Case B: Owner changed
  if (oldOwner !== newOwner) {
    // Refund old owner
    if (oldOwner) {
      const { data: ot } = await supabase.from('teams').select('budget').eq('id', oldOwner).single();
      if (ot) await supabase.from('teams').update({ budget: ot.budget + oldPrice }).eq('id', oldOwner);
    }
    // Charge new owner
    if (newOwner) {
      const { data: nt } = await supabase.from('teams').select('budget').eq('id', newOwner).single();
      if (nt) await supabase.from('teams').update({ budget: nt.budget - newPrice }).eq('id', newOwner);
    }
  }
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

/** Ottiene o crea una race per il calendar event dato, copiando is_sprint */
async function getOrCreateRace(calendarEventId) {
  // Leggi is_sprint dal calendar_event
  const { data: calEv } = await supabase
    .from('calendar_events')
    .select('is_sprint')
    .eq('id', calendarEventId)
    .single();

  const isSprint = calEv?.is_sprint ?? false;

  const { data: existing } = await supabase
    .from('races')
    .select('id, is_sprint')
    .eq('calendar_event_id', calendarEventId)
    .maybeSingle();

  if (existing) {
    // Correggi is_sprint se non aggiornato
    if (existing.is_sprint !== isSprint) {
      await supabase.from('races').update({ is_sprint: isSprint }).eq('id', existing.id);
    }
    return existing.id;
  }

  const { data, error } = await supabase
    .from('races')
    .insert({ calendar_event_id: calendarEventId, is_sprint: isSprint })
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
      id: r.id,
      isSprint: r.is_sprint || false,
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
 * Copia le formazioni dalla sprint alla gara principale dello stesso weekend.
 * Per ogni team, prende titolari e riserva dalla sprint e li sovrascrive nel GP.
 */
export async function copyLineupsFromSprintToRace(sprintCalendarIndex, raceCalendarIndex) {
  // 1. Ottieni gli ID degli eventi
  const sprintCalEventId = await getCalendarEventId(sprintCalendarIndex);
  const raceCalEventId = await getCalendarEventId(raceCalendarIndex);

  // 2. Trova la race della sprint
  const { data: sprintRace, error: eFind } = await supabase
    .from('races')
    .select('id')
    .eq('calendar_event_id', sprintCalEventId)
    .maybeSingle();
  if (eFind) throw eFind;
  if (!sprintRace) throw new Error('Nessuna race sprint trovata per copiare le formazioni.');

  // 3. Ottieni tutte le formazioni della sprint
  const { data: sprintLineups, error: eFetch } = await supabase
    .from('lineups')
    .select('team_id, pilot_id, is_reserve')
    .eq('race_id', sprintRace.id);
  if (eFetch) throw eFetch;
  if (!sprintLineups || sprintLineups.length === 0) throw new Error('Nessuna formazione trovata per la sprint.');

  // 4. Ottieni/crea la race del GP
  const gpRaceId = await getOrCreateRace(raceCalEventId);

  // 5. Cancella le formazioni esistenti nel GP per ogni team coinvolto
  const teamIds = [...new Set(sprintLineups.map(l => l.team_id))];
  for (const teamId of teamIds) {
    await supabase.from('lineups').delete().eq('race_id', gpRaceId).eq('team_id', teamId);
  }

  // 6. Copia le formazioni sprint → GP (reset subbed flags)
  const newRows = sprintLineups.map(l => ({
    race_id: gpRaceId,
    team_id: l.team_id,
    pilot_id: l.pilot_id,
    is_reserve: l.is_reserve,
    subbed_in_manually: false,
    subbed_out_for: null,
  }));
  const { error: eInsert } = await supabase.from('lineups').insert(newRows);
  if (eInsert) throw eInsert;

  return { copiedTeams: teamIds.length, copiedRows: newRows.length };
}

/**
 * Applica uno switch manuale post-gara.
 * IDEMPOTENTE: se la riserva è già subbed_in_manually per questa race+team,
 * NON ri-incrementa il counter switches_used. Cosi' lo switch counter
 * conta solo una volta per (team, race) anche se l'admin clicca due volte.
 */
export async function applyManualSwitch(calendarIndex, teamId, starterPilotId, reservePilotId) {
  const calEventId = await getCalendarEventId(calendarIndex);
  const raceId = await getOrCreateRace(calEventId);

  // Verifica se uno switch manuale esiste già per questa race+team
  const { data: existing, error: eExist } = await supabase
    .from('lineups')
    .select('id, pilot_id, is_reserve, subbed_in_manually, subbed_out_for')
    .eq('race_id', raceId).eq('team_id', teamId);
  if (eExist) throw eExist;

  const alreadySwitched = existing.some(l => l.is_reserve && l.subbed_in_manually);

  if (!alreadySwitched) {
    const { data: team, error: e1 } = await supabase.from('teams').select('switches_used').eq('id', teamId).single();
    if (e1) throw e1;
    const { error: e2 } = await supabase.from('teams')
      .update({ switches_used: (team.switches_used || 0) + 1 }).eq('id', teamId);
    if (e2) throw e2;
  }

  // Reset eventuali precedenti subbed_out_for su altri titolari di questo team+race
  await supabase.from('lineups')
    .update({ subbed_out_for: null })
    .eq('race_id', raceId).eq('team_id', teamId).eq('is_reserve', false);

  // Marca il nuovo titolare uscente
  const { error: e3 } = await supabase.from('lineups').update({ subbed_out_for: reservePilotId })
    .eq('race_id', raceId).eq('team_id', teamId).eq('pilot_id', starterPilotId);
  if (e3) throw e3;

  // Marca la riserva come subbed_in_manually
  const { error: e4 } = await supabase.from('lineups').update({ subbed_in_manually: true })
    .eq('race_id', raceId).eq('team_id', teamId).eq('pilot_id', reservePilotId);
  if (e4) throw e4;
}

/**
 * Annulla lo switch manuale post-gara. Decrementa il counter switches_used
 * (mai sotto 0) e resetta i flag sulla lineup di questa race+team.
 */
export async function revertManualSwitch(calendarIndex, teamId) {
  const calEventId = await getCalendarEventId(calendarIndex);
  const raceId = await getOrCreateRace(calEventId);

  const { data: existing } = await supabase
    .from('lineups')
    .select('is_reserve, subbed_in_manually')
    .eq('race_id', raceId).eq('team_id', teamId);
  const wasSwitched = existing?.some(l => l.is_reserve && l.subbed_in_manually);
  if (!wasSwitched) return;

  const { data: team } = await supabase.from('teams').select('switches_used').eq('id', teamId).single();
  const newCount = Math.max(0, (team?.switches_used || 0) - 1);
  await supabase.from('teams').update({ switches_used: newCount }).eq('id', teamId);

  await supabase.from('lineups')
    .update({ subbed_out_for: null })
    .eq('race_id', raceId).eq('team_id', teamId);
  await supabase.from('lineups')
    .update({ subbed_in_manually: false })
    .eq('race_id', raceId).eq('team_id', teamId).eq('is_reserve', true);
}
