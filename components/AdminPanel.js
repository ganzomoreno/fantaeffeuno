'use client';

import { useState, useEffect } from 'react';
import { CALENDAR, F1_TEAM_COLORS } from '@/lib/data';
import * as db from '@/lib/db';
import { AdminCard, MiniInput, Chip, selectStyle, inputStyle, btnPrimary, btnSmall } from './ui';

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const abbrevName = (name) => {
  const parts = name.trim().split(/\s+/);
  const initials = parts.slice(0, -1).map(p => p[0] + '.').join('');
  return `${initials} ${parts[parts.length - 1]}`;
};

// ─── MAIN ADMIN PANEL ────────────────────────────────────────────────────────
export default function AdminPanel({ teams, pilots, races, lineups, onRefresh, onClose }) {
  const [tab, setTab] = useState("asta");

  const tabs = [
    { id: "asta",        label: "Asta" },
    { id: "risultati",   label: "Risultati Gara" },
    { id: "teams",       label: "Squadre" },
    { id: "piloti",      label: "Piloti" },
    { id: "budget",      label: "Budget" },
    { id: "formazioni",  label: "Formazioni" },
  ];

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.85)", backdropFilter: "blur(10px)",
      overflowY: "auto",
    }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontFamily: "'Orbitron'", fontSize: 20, fontWeight: 900, color: "#e10600", margin: 0 }}>
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

        {tab === "asta"        && <AdminAsta       teams={teams} pilots={pilots} onRefresh={onRefresh}/>}
        {tab === "risultati"   && <AdminRisultati   races={races} pilots={pilots} lineups={lineups} teams={teams} onRefresh={onRefresh}/>}
        {tab === "teams"       && <AdminTeams       teams={teams} onRefresh={onRefresh}/>}
        {tab === "piloti"      && <AdminPiloti      pilots={pilots} teams={teams} onRefresh={onRefresh}/>}
        {tab === "budget"      && <AdminBudget      teams={teams} onRefresh={onRefresh}/>}
        {tab === "formazioni"  && <AdminFormazioni  onRefresh={onRefresh}/>}
      </div>
    </div>
  );
}

// ─── ASTA ─────────────────────────────────────────────────────────────────────
function AdminAsta({ teams, pilots, onRefresh }) {
  const [selectedPilot, setSelectedPilot] = useState("");
  const [selectedTeam, setSelectedTeam]   = useState("");
  const [price, setPrice]                 = useState(1);
  const [busy, setBusy]                   = useState(false);

  const freePilots = pilots.filter(p => !p.owner);

  const assignPilot = async () => {
    if (!selectedPilot || !selectedTeam || price < 1) return;
    const team = teams.find(t => t.id === selectedTeam);
    if (!team || team.budget < price) return alert("Budget insufficiente!");

    setBusy(true);
    try {
      await db.assignPilot(selectedPilot, selectedTeam, price);
      await onRefresh();
      setSelectedPilot(""); setPrice(1);
    } catch(e) { alert("Errore: " + e.message); }
    setBusy(false);
  };

  const releasePilot = async (pilotId) => {
    setBusy(true);
    try {
      await db.releasePilot(pilotId);
      await onRefresh();
    } catch(e) { alert("Errore: " + e.message); }
    setBusy(false);
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
          <input type="number" min="1" value={price}
            onChange={e => setPrice(Number(e.target.value))} style={inputStyle}/>

          <button onClick={assignPilot} disabled={busy} style={{ ...btnPrimary, opacity: busy ? 0.6 : 1 }}>
            {busy ? "..." : "Assegna Pilota"}
          </button>
        </div>
      </AdminCard>

      <AdminCard title="Piloti Assegnati">
        {pilots.filter(p => p.owner).map(p => {
          const t = teams.find(t => t.id === p.owner);
          return (
            <div key={p.id} style={{ padding: "8px 0", borderBottom: "1px solid #222" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 5, height: 22, borderRadius: 3, background: F1_TEAM_COLORS[p.team], flexShrink: 0 }}/>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {p.name}
                </span>
                <span style={{ fontSize: 12, fontFamily: "'Orbitron'", color: "#e10600", fontWeight: 700, flexShrink: 0 }}>
                  {p.price}M
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5, paddingLeft: 13 }}>
                <Chip label={t?.name || "?"} color="#e10600"/>
                <button onClick={() => releasePilot(p.id)} disabled={busy}
                  style={{ ...btnSmall, color: "#ff4444", marginLeft: "auto" }}>
                  Rilascia
                </button>
              </div>
            </div>
          );
        })}
      </AdminCard>
    </div>
  );
}

// ─── RISULTATI GARA ───────────────────────────────────────────────────────────
function AdminRisultati({ races, pilots, onRefresh }) {
  const raceEvents = CALENDAR.map((ev, i) => ({ ...ev, index: i })).filter(ev => ev.type === "race");
  const [selectedRace, setSelectedRace] = useState("");
  const [results, setResults]           = useState([]);
  const [busy, setBusy]                 = useState(false);

  const initResults = (raceIdx) => {
    setSelectedRace(raceIdx);
    const existing = races.find(r => r.calendarIndex === Number(raceIdx));
    if (existing) {
      setResults(existing.results);
    } else {
      setResults(pilots.map(p => ({
        pilotId: p.id, position: 0, dnf: false,
        overtakes: 0, fastestLap: false, dotdRank: 0,
      })));
    }
  };

  const updateResult = (pilotId, field, value) => {
    setResults(prev => prev.map(r => r.pilotId === pilotId ? { ...r, [field]: value } : r));
  };

  const saveResults = async () => {
    if (!selectedRace) return;
    setBusy(true);
    try {
      await db.saveRaceResults(Number(selectedRace), results);
      await onRefresh();
      alert("Risultati salvati!");
    } catch(e) { alert("Errore: " + e.message); }
    setBusy(false);
  };

  const deleteRace = async (calIdx) => {
    setBusy(true);
    try {
      await db.deleteRace(calIdx);
      await onRefresh();
    } catch(e) { alert("Errore: " + e.message); }
    setBusy(false);
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
            <div style={{ maxHeight: 440, overflowY: "auto" }}>
              {pilots.map(p => {
                const res = results.find(r => r.pilotId === p.id) || {};
                return (
                  <div key={p.id} style={{ padding: "7px 0", borderBottom: "1px solid #1a1a1a" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                      <div style={{ width: 4, height: 18, borderRadius: 2, background: F1_TEAM_COLORS[p.team], flexShrink: 0 }}/>
                      <span style={{ flex: 1, fontSize: 12, fontWeight: 700 }}>{abbrevName(p.name)}</span>
                      <label style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 3, cursor: "pointer" }}>
                        <input type="checkbox" checked={!!res.fastestLap}
                          onChange={e => updateResult(p.id, "fastestLap", e.target.checked)}/>
                        <span style={{ color: "#f0c040" }}>FL</span>
                      </label>
                      <label style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 3, color: "#ff4444", cursor: "pointer" }}>
                        <input type="checkbox" checked={!!res.dnf}
                          onChange={e => updateResult(p.id, "dnf", e.target.checked)}/> DNF
                      </label>
                    </div>
                    <div style={{ display: "flex", gap: 6, paddingLeft: 10 }}>
                      {[
                        { label: "Pos",  field: "position",  val: res.position  || 0 },
                        { label: "Sorp", field: "overtakes", val: res.overtakes || 0 },
                        { label: "DOTD", field: "dotdRank",  val: res.dotdRank  || 0 },
                      ].map(({ label, field, val }) => (
                        <div key={field} style={{ flex: 1 }}>
                          <span style={{ fontSize: 10, opacity: 0.5, display: "block", marginBottom: 2 }}>{label}</span>
                          <input type="number" value={val}
                            onChange={e => updateResult(p.id, field, Number(e.target.value))}
                            style={{ ...inputStyle, width: "100%", boxSizing: "border-box", padding: "4px 6px", fontSize: 12 }}/>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <button onClick={saveResults} disabled={busy}
              style={{ ...btnPrimary, marginTop: 12, opacity: busy ? 0.6 : 1 }}>
              {busy ? "Salvataggio..." : "Salva Risultati"}
            </button>
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
                <button onClick={() => initResults(String(r.calendarIndex))} style={btnSmall}>
                  Modifica
                </button>
                <button onClick={() => deleteRace(r.calendarIndex)} disabled={busy}
                  style={{ ...btnSmall, color: "#ff4444" }}>
                  Elimina
                </button>
              </div>
            </div>
          );
        })}
      </AdminCard>
    </div>
  );
}

// ─── TEAMS ────────────────────────────────────────────────────────────────────
function AdminTeams({ teams, onRefresh }) {
  const [localTeams, setLocalTeams] = useState(teams);
  const [busy, setBusy] = useState(false);

  useEffect(() => { setLocalTeams(teams); }, [teams]);

  const updateLocal = (id, field, value) => {
    setLocalTeams(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const saveTeam = async (team) => {
    setBusy(true);
    try {
      await db.updateTeam(team.id, {
        name:          team.name,
        owner_name:    team.owner,
        switches_used: team.switchesUsed,
      });
      await onRefresh();
    } catch(e) { alert("Errore: " + e.message); }
    setBusy(false);
  };

  return (
    <AdminCard title="Gestione Squadre">
      {localTeams.map(t => (
        <div key={t.id} style={{ padding: "10px 0", borderBottom: "1px solid #222" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
            <MiniInput label="Nome"    value={t.name}         onChange={v => updateLocal(t.id, "name", v)}         width={180}/>
            <MiniInput label="Owner"   value={t.owner}        onChange={v => updateLocal(t.id, "owner", v)}        width={150}/>
            <MiniInput label="Switch"  type="number" value={t.switchesUsed}
              onChange={v => updateLocal(t.id, "switchesUsed", Number(v))} width={60}/>
            <button onClick={() => saveTeam(t)} disabled={busy}
              style={{ ...btnPrimary, padding: "6px 14px", fontSize: 12 }}>
              Salva
            </button>
          </div>
        </div>
      ))}
    </AdminCard>
  );
}

// ─── PILOTI ───────────────────────────────────────────────────────────────────
function AdminPiloti({ pilots, teams, onRefresh }) {
  const [localPilots, setLocalPilots] = useState(pilots);
  const [busy, setBusy] = useState(false);

  useEffect(() => { setLocalPilots(pilots); }, [pilots]);

  const updateLocal = (id, field, value) => {
    setLocalPilots(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const savePilot = async (pilot) => {
    setBusy(true);
    try {
      await db.updatePilotFields(pilot.id, {
        name:           pilot.name,
        f1_team:        pilot.team,
        owner_team_id:  pilot.owner || null,
        purchase_price: pilot.price,
      });
      await onRefresh();
    } catch(e) { alert("Errore: " + e.message); }
    setBusy(false);
  };

  return (
    <AdminCard title="Gestione Piloti">
      <div style={{ maxHeight: 500, overflowY: "auto" }}>
        {localPilots.map(p => (
          <div key={p.id} style={{
            display: "flex", gap: 6, padding: "6px 0",
            borderBottom: "1px solid #1a1a1a", flexWrap: "wrap", alignItems: "flex-end",
          }}>
            <div style={{ width: 4, height: 20, borderRadius: 2, background: F1_TEAM_COLORS[p.team], alignSelf: "center" }}/>
            <MiniInput label="Nome"     value={p.name}  onChange={v => updateLocal(p.id, "name", v)}  width={140}/>
            <MiniInput label="Scuderia" value={p.team}  onChange={v => updateLocal(p.id, "team", v)}  width={120}/>
            <div>
              <span style={{ fontSize: 10, opacity: 0.5 }}>Owner</span>
              <select value={p.owner || ""}
                onChange={e => updateLocal(p.id, "owner", e.target.value || null)}
                style={{ ...selectStyle, width: 130, padding: "4px 6px", fontSize: 11 }}>
                <option value="">Free Agent</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <MiniInput label="Prezzo" type="number" value={p.price}
              onChange={v => updateLocal(p.id, "price", Number(v))} width={60}/>
            <button onClick={() => savePilot(p)} disabled={busy}
              style={{ ...btnPrimary, padding: "6px 14px", fontSize: 12 }}>
              Salva
            </button>
          </div>
        ))}
      </div>
    </AdminCard>
  );
}

// ─── BUDGET ───────────────────────────────────────────────────────────────────
function AdminBudget({ teams, onRefresh }) {
  const [busy, setBusy] = useState(false);

  const adjustBudget = async (teamId, delta) => {
    const team = teams.find(t => t.id === teamId);
    if (!team) return;
    setBusy(true);
    try {
      await db.updateTeam(teamId, { budget: team.budget + delta });
      await onRefresh();
    } catch(e) { alert("Errore: " + e.message); }
    setBusy(false);
  };

  const setBudgetDirect = async (teamId, value) => {
    setBusy(true);
    try {
      await db.updateTeam(teamId, { budget: Number(value) });
      await onRefresh();
    } catch(e) { alert("Errore: " + e.message); }
    setBusy(false);
  };

  const addBudgetAll = async () => {
    setBusy(true);
    try {
      await Promise.all(teams.map(t => db.updateTeam(t.id, { budget: t.budget + 100 })));
      await onRefresh();
    } catch(e) { alert("Errore: " + e.message); }
    setBusy(false);
  };

  return (
    <AdminCard title="Gestione Budget">
      <p style={{ fontSize: 12, opacity: 0.5, marginBottom: 12 }}>
        Dopo ogni asta, aggiungi +100 FantaMilioni al budget residuo di ogni squadra.
      </p>
      <button onClick={addBudgetAll} disabled={busy}
        style={{ ...btnPrimary, marginBottom: 16, opacity: busy ? 0.6 : 1 }}>
        +100M a tutte le squadre (Nuova Asta)
      </button>
      {teams.map(t => (
        <div key={t.id} style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "8px 0", borderBottom: "1px solid #222",
        }}>
          <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{t.name}</span>
          <span style={{ fontFamily: "'Orbitron'", fontSize: 16, fontWeight: 700, color: "#e10600" }}>
            {t.budget}M
          </span>
          <button onClick={() => adjustBudget(t.id, +10)} disabled={busy} style={btnSmall}>+10</button>
          <button onClick={() => adjustBudget(t.id, -10)} disabled={busy} style={btnSmall}>-10</button>
          <MiniInput label="" type="number" value={t.budget}
            onChange={v => setBudgetDirect(t.id, v)} width={70}/>
        </div>
      ))}
    </AdminCard>
  );
}

// ─── FORMAZIONI ───────────────────────────────────────────────────────────────
function AdminFormazioni({ onRefresh }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  // Indici nel calendario: Sprint Cina = 1, GP Cina = 2
  const SPRINT_IDX = 1;
  const RACE_IDX   = 2;

  const handleCopySprintToRace = async () => {
    if (!window.confirm(`Copia le formazioni della Sprint Cina (idx ${SPRINT_IDX}) al GP Cina (idx ${RACE_IDX})?\nLe formazioni già salvate per il GP verranno sovrascritte.`)) return;
    setBusy(true);
    setMsg(null);
    try {
      const result = await db.copyLineupsFromSprintToRace(SPRINT_IDX, RACE_IDX);
      setMsg({ ok: true, text: `✅ Copiate ${result.copiedRows} formazioni di ${result.copiedTeams} squadre.` });
      await onRefresh();
    } catch (e) {
      setMsg({ ok: false, text: `❌ Errore: ${e.message}` });
    }
    setBusy(false);
  };

  return (
    <AdminCard title="Gestione Formazioni">
      <p style={{ fontSize: 12, color: '#A9ABBA', marginBottom: 16 }}>
        Usa questa sezione per operazioni speciali sulle formazioni dei team.
      </p>

      {/* ── COPIA SPRINT → GP ───────────────────────────── */}
      <div style={{
        border: '1px solid #2A2D3A', borderRadius: 10, padding: 16, marginBottom: 12,
        background: '#1A1B24',
      }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, color: '#FFB700' }}>
          🏎️ Copia formazioni Sprint → GP Cina
        </div>
        <p style={{ fontSize: 12, color: '#A9ABBA', margin: '0 0 12px' }}>
          Imposta le formazioni del <strong style={{ color: '#EDEEF3' }}>GP Cina (domenica)</strong> uguali
          a quelle già salvate per la <strong style={{ color: '#EDEEF3' }}>Sprint Cina (sabato)</strong>.
          Le formazioni esistenti per il GP saranno sovrascritte.
        </p>
        <button
          onClick={handleCopySprintToRace}
          disabled={busy}
          style={{
            ...btnPrimary,
            opacity: busy ? 0.6 : 1,
            background: '#FFB700',
            color: '#000',
          }}
        >
          {busy ? 'Copio...' : 'Copia Sprint → GP Cina'}
        </button>

        {msg && (
          <div style={{
            marginTop: 10, fontSize: 12, padding: '8px 12px', borderRadius: 6,
            background: msg.ok ? 'rgba(0,255,65,0.08)' : 'rgba(225,6,0,0.1)',
            color: msg.ok ? '#00FF41' : '#ff6b6b',
            border: `1px solid ${msg.ok ? 'rgba(0,255,65,0.2)' : 'rgba(225,6,0,0.3)'}`,
          }}>
            {msg.text}
          </div>
        )}
      </div>
    </AdminCard>
  );
}
