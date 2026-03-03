'use client';

import { useState } from 'react';
import { CALENDAR, F1_TEAM_COLORS } from '@/lib/data';
import { AdminCard, MiniInput, Chip, selectStyle, inputStyle, btnPrimary, btnSmall } from './ui';

// ─── MAIN ADMIN PANEL ────────────────────────────────────────────────────────
export default function AdminPanel({ teams, setTeams, pilots, setPilots, races, setRaces, lineups, setLineups, onClose }) {
  const [tab, setTab] = useState("asta");

  const tabs = [
    { id: "asta",      label: "Asta" },
    { id: "risultati", label: "Risultati Gara" },
    { id: "teams",     label: "Squadre" },
    { id: "piloti",    label: "Piloti" },
    { id: "budget",    label: "Budget" },
  ];

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.85)", backdropFilter: "blur(10px)",
      overflowY: "auto",
    }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: 16 }}>
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "center", marginBottom: 16,
        }}>
          <h2 style={{
            fontFamily: "'Orbitron'", fontSize: 20, fontWeight: 900,
            color: "#e10600", margin: 0,
          }}>
            ⚙ ADMIN PANEL
          </h2>
          <button onClick={onClose} style={{
            background: "#333", border: "none", borderRadius: 8,
            color: "#fff", padding: "8px 16px", cursor: "pointer", fontWeight: 600,
          }}>
            Chiudi ✕
          </button>
        </div>

        <div style={{ display: "flex", gap: 4, marginBottom: 16, flexWrap: "wrap" }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: "8px 16px", borderRadius: 8, border: "none",
              background: tab === t.id ? "#e10600" : "#222",
              color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600,
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === "asta"      && <AdminAsta      teams={teams} setTeams={setTeams} pilots={pilots} setPilots={setPilots}/>}
        {tab === "risultati" && <AdminRisultati  races={races} setRaces={setRaces} pilots={pilots} lineups={lineups} setLineups={setLineups} teams={teams}/>}
        {tab === "teams"     && <AdminTeams      teams={teams} setTeams={setTeams}/>}
        {tab === "piloti"    && <AdminPiloti     pilots={pilots} setPilots={setPilots} teams={teams}/>}
        {tab === "budget"    && <AdminBudget     teams={teams} setTeams={setTeams}/>}
      </div>
    </div>
  );
}

// ─── ASTA ────────────────────────────────────────────────────────────────────
function AdminAsta({ teams, setTeams, pilots, setPilots }) {
  const [selectedPilot, setSelectedPilot] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");
  const [price, setPrice] = useState(1);

  const freePilots = pilots.filter(p => !p.owner);

  const assignPilot = () => {
    if (!selectedPilot || !selectedTeam || price < 1) return;
    const team = teams.find(t => t.id === selectedTeam);
    if (!team || team.budget < price) return alert("Budget insufficiente!");

    setPilots(prev => prev.map(p =>
      p.id === selectedPilot ? { ...p, owner: selectedTeam, price } : p
    ));
    setTeams(prev => prev.map(t =>
      t.id === selectedTeam ? { ...t, budget: t.budget - price } : t
    ));
    setSelectedPilot("");
    setPrice(1);
  };

  const releasePilot = (pilotId) => {
    const pilot = pilots.find(p => p.id === pilotId);
    if (!pilot || !pilot.owner) return;
    setPilots(prev => prev.map(p =>
      p.id === pilotId ? { ...p, owner: null, price: 0 } : p
    ));
    setTeams(prev => prev.map(t =>
      t.id === pilot.owner ? { ...t, budget: t.budget + pilot.price } : t
    ));
  };

  return (
    <div>
      <AdminCard title="Assegna Pilota (Asta)">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Pilota</label>
          <select value={selectedPilot} onChange={e => setSelectedPilot(e.target.value)} style={selectStyle}>
            <option value="">-- Seleziona pilota --</option>
            {freePilots.map(p => (
              <option key={p.id} value={p.id}>{p.name} ({p.team})</option>
            ))}
          </select>

          <label style={{ fontSize: 12, fontWeight: 600 }}>Squadra</label>
          <select value={selectedTeam} onChange={e => setSelectedTeam(e.target.value)} style={selectStyle}>
            <option value="">-- Seleziona squadra --</option>
            {teams.map(t => (
              <option key={t.id} value={t.id}>{t.name} (Budget: {t.budget}M)</option>
            ))}
          </select>

          <label style={{ fontSize: 12, fontWeight: 600 }}>Prezzo (FantaMilioni)</label>
          <input type="number" min="1" max="97" value={price}
            onChange={e => setPrice(Number(e.target.value))} style={inputStyle}/>

          <button onClick={assignPilot} style={btnPrimary}>Assegna Pilota</button>
        </div>
      </AdminCard>

      <AdminCard title="Piloti Assegnati">
        {pilots.filter(p => p.owner).map(p => {
          const t = teams.find(t => t.id === p.owner);
          return (
            <div key={p.id} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "6px 0", borderBottom: "1px solid #222",
            }}>
              <div style={{
                width: 6, height: 24, borderRadius: 3,
                background: F1_TEAM_COLORS[p.team],
              }}/>
              <span style={{ flex: 1, fontSize: 13 }}>{p.name}</span>
              <Chip label={t?.name || "?"} color="#e10600"/>
              <span style={{ fontSize: 12, opacity: 0.6 }}>{p.price}M</span>
              <button onClick={() => releasePilot(p.id)} style={{ ...btnSmall, color: "#ff4444" }}>
                Rilascia
              </button>
            </div>
          );
        })}
      </AdminCard>
    </div>
  );
}

// ─── RISULTATI GARA ──────────────────────────────────────────────────────────
function AdminRisultati({ races, setRaces, pilots }) {
  const raceEvents = CALENDAR.map((ev, i) => ({ ...ev, index: i })).filter(ev => ev.type === "race");
  const [selectedRace, setSelectedRace] = useState("");
  const [results, setResults] = useState([]);
  const [editingRace, setEditingRace] = useState(null);

  const initResults = (raceIdx) => {
    setSelectedRace(raceIdx);
    const existing = races.find(r => r.calendarIndex === Number(raceIdx));
    if (existing) {
      setResults(existing.results);
      setEditingRace(existing);
    } else {
      setResults(pilots.map(p => ({
        pilotId: p.id, position: 0, dnf: false,
        overtakes: 0, fastestLap: false, dotdRank: 0,
      })));
      setEditingRace(null);
    }
  };

  const updateResult = (pilotId, field, value) => {
    setResults(prev => prev.map(r =>
      r.pilotId === pilotId ? { ...r, [field]: value } : r
    ));
  };

  const saveResults = () => {
    if (!selectedRace) return;
    const raceData = { calendarIndex: Number(selectedRace), results };
    if (editingRace) {
      setRaces(prev => prev.map(r =>
        r.calendarIndex === Number(selectedRace) ? raceData : r
      ));
    } else {
      setRaces(prev => [...prev, raceData]);
    }
    alert("Risultati salvati!");
  };

  const deleteRace = (calIdx) => {
    setRaces(prev => prev.filter(r => r.calendarIndex !== calIdx));
  };

  return (
    <div>
      <AdminCard title="Inserisci/Modifica Risultati Gara">
        <select value={selectedRace} onChange={e => initResults(e.target.value)} style={selectStyle}>
          <option value="">-- Seleziona gara --</option>
          {raceEvents.map(ev => (
            <option key={ev.index} value={ev.index}>
              {ev.location} ({ev.date}) {races.some(r => r.calendarIndex === ev.index) ? "✓" : ""}
            </option>
          ))}
        </select>

        {selectedRace !== "" && (
          <div style={{ marginTop: 12 }}>
            <p style={{ fontSize: 11, opacity: 0.5, marginBottom: 8 }}>
              Per ogni pilota: posizione (1-22), sorpassi, giro veloce, DOTD rank (1-3), DNF
            </p>
            <div style={{ maxHeight: 400, overflowY: "auto" }}>
              {pilots.map(p => {
                const res = results.find(r => r.pilotId === p.id) || {};
                return (
                  <div key={p.id} style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "6px 0", borderBottom: "1px solid #1a1a1a", flexWrap: "wrap",
                  }}>
                    <div style={{
                      width: 4, height: 20, borderRadius: 2,
                      background: F1_TEAM_COLORS[p.team],
                    }}/>
                    <span style={{ width: 130, fontSize: 12, fontWeight: 600 }}>{p.name}</span>
                    <MiniInput label="Pos" type="number" value={res.position || 0}
                      onChange={v => updateResult(p.id, "position", Number(v))} width={50}/>
                    <MiniInput label="Sorp" type="number" value={res.overtakes || 0}
                      onChange={v => updateResult(p.id, "overtakes", Number(v))} width={50}/>
                    <MiniInput label="DOTD" type="number" value={res.dotdRank || 0}
                      onChange={v => updateResult(p.id, "dotdRank", Number(v))} width={50}/>
                    <label style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
                      <input type="checkbox" checked={!!res.fastestLap}
                        onChange={e => updateResult(p.id, "fastestLap", e.target.checked)}/> FL
                    </label>
                    <label style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 4, color: "#ff4444" }}>
                      <input type="checkbox" checked={!!res.dnf}
                        onChange={e => updateResult(p.id, "dnf", e.target.checked)}/> DNF
                    </label>
                  </div>
                );
              })}
            </div>
            <button onClick={saveResults} style={{ ...btnPrimary, marginTop: 12 }}>Salva Risultati</button>
          </div>
        )}
      </AdminCard>

      <AdminCard title="Gare Salvate">
        {races.length === 0 && <p style={{ opacity: 0.4, fontSize: 13 }}>Nessuna gara salvata</p>}
        {races.map(r => {
          const ev = CALENDAR[r.calendarIndex];
          return (
            <div key={r.calendarIndex} style={{
              display: "flex", justifyContent: "space-between",
              alignItems: "center", padding: "8px 0", borderBottom: "1px solid #222",
            }}>
              <span style={{ fontSize: 13 }}>🏁 {ev?.location} ({ev?.date})</span>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => initResults(String(r.calendarIndex))} style={btnSmall}>Modifica</button>
                <button onClick={() => deleteRace(r.calendarIndex)} style={{ ...btnSmall, color: "#ff4444" }}>Elimina</button>
              </div>
            </div>
          );
        })}
      </AdminCard>
    </div>
  );
}

// ─── TEAMS ───────────────────────────────────────────────────────────────────
function AdminTeams({ teams, setTeams }) {
  const updateTeam = (id, field, value) => {
    setTeams(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  return (
    <AdminCard title="Gestione Squadre">
      {teams.map(t => (
        <div key={t.id} style={{ padding: "10px 0", borderBottom: "1px solid #222" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <MiniInput label="Nome" value={t.name} onChange={v => updateTeam(t.id, "name", v)} width={180}/>
            <MiniInput label="Owner" value={t.owner} onChange={v => updateTeam(t.id, "owner", v)} width={150}/>
            <MiniInput label="Switch" type="number" value={t.switchesUsed}
              onChange={v => updateTeam(t.id, "switchesUsed", Number(v))} width={60}/>
          </div>
        </div>
      ))}
    </AdminCard>
  );
}

// ─── PILOTI ──────────────────────────────────────────────────────────────────
function AdminPiloti({ pilots, setPilots, teams }) {
  const updatePilot = (id, field, value) => {
    setPilots(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  return (
    <AdminCard title="Gestione Piloti">
      <div style={{ maxHeight: 500, overflowY: "auto" }}>
        {pilots.map(p => (
          <div key={p.id} style={{
            display: "flex", gap: 6, padding: "6px 0",
            borderBottom: "1px solid #1a1a1a", flexWrap: "wrap", alignItems: "center",
          }}>
            <div style={{
              width: 4, height: 20, borderRadius: 2,
              background: F1_TEAM_COLORS[p.team],
            }}/>
            <MiniInput label="Nome" value={p.name}
              onChange={v => updatePilot(p.id, "name", v)} width={140}/>
            <MiniInput label="Scuderia" value={p.team}
              onChange={v => updatePilot(p.id, "team", v)} width={120}/>
            <div>
              <span style={{ fontSize: 10, opacity: 0.5 }}>Owner</span>
              <select
                value={p.owner || ""}
                onChange={e => updatePilot(p.id, "owner", e.target.value || null)}
                style={{ ...selectStyle, width: 130, padding: "4px 6px", fontSize: 11 }}
              >
                <option value="">Free Agent</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <MiniInput label="Prezzo" type="number" value={p.price}
              onChange={v => updatePilot(p.id, "price", Number(v))} width={60}/>
          </div>
        ))}
      </div>
    </AdminCard>
  );
}

// ─── BUDGET ──────────────────────────────────────────────────────────────────
function AdminBudget({ teams, setTeams }) {
  const addBudgetAll = (amount) => {
    setTeams(prev => prev.map(t => ({ ...t, budget: t.budget + amount })));
  };

  return (
    <AdminCard title="Gestione Budget">
      <p style={{ fontSize: 12, opacity: 0.5, marginBottom: 12 }}>
        Dopo ogni asta, aggiungi +100 FantaMilioni al budget residuo di ogni squadra.
      </p>
      <button onClick={() => addBudgetAll(100)} style={{ ...btnPrimary, marginBottom: 16 }}>
        +100M a tutte le squadre (Nuova Asta)
      </button>
      {teams.map(t => (
        <div key={t.id} style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "8px 0", borderBottom: "1px solid #222",
        }}>
          <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{t.name}</span>
          <span style={{
            fontFamily: "'Orbitron'", fontSize: 16, fontWeight: 700, color: "#e10600",
          }}>
            {t.budget}M
          </span>
          <button onClick={() => setTeams(prev => prev.map(x =>
            x.id === t.id ? { ...x, budget: x.budget + 10 } : x))} style={btnSmall}>+10</button>
          <button onClick={() => setTeams(prev => prev.map(x =>
            x.id === t.id ? { ...x, budget: x.budget - 10 } : x))} style={btnSmall}>-10</button>
          <MiniInput label="" type="number" value={t.budget}
            onChange={v => setTeams(prev => prev.map(x =>
              x.id === t.id ? { ...x, budget: Number(v) } : x))} width={70}/>
        </div>
      ))}
    </AdminCard>
  );
}
