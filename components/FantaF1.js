'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { CALENDAR } from '@/lib/data';
import { calculateTeamScores } from '@/lib/scoring';
import { useLocalStorage } from '@/lib/useLocalStorage';
import * as db from '@/lib/db';
import { Icon } from './ui';
import Classifica from './Classifica';
import Squadre from './Squadre';
import Piloti from './Piloti';
import Calendario from './Calendario';
import GaraManager from './GaraManager';
import AdminPanel from './AdminPanel';
import LoginPage from './LoginPage';
import GestioneAste from './GestioneAste';

export default function FantaF1() {
  const [page, setPage] = useState("classifica");
  const [showAdmin, setShowAdmin] = useState(false);
  const [showAste, setShowAste] = useState(false);
  const [currentUser, setCurrentUser] = useLocalStorage("ff1_current_user", null);

  // Dati dal DB
  const [teams, setTeams] = useState([]);
  const [pilots, setPilots] = useState([]);
  const [races, setRaces] = useState([]);
  const [lineups, setLineups] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── Caricamento dati da Supabase ──────────────────────────────────────────
  const refresh = useCallback(async () => {
    try {
      const [t, p, r, l] = await Promise.all([
        db.fetchTeams(),
        db.fetchPilots(),
        db.fetchRaces(),
        db.fetchLineups(),
      ]);
      setTeams(t);
      setPilots(p);
      setRaces(r);
      setLineups(l);
      setError(null);
    } catch (e) {
      console.error('Errore caricamento dati:', e);
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  // ── Scoring ───────────────────────────────────────────────────────────────
  const teamScores = useMemo(
    () => calculateTeamScores(teams, pilots, races, lineups),
    [teams, pilots, races, lineups]
  );

  const sortedTeams = useMemo(
    () => [...teams].sort((a, b) => (teamScores[b.id] || 0) - (teamScores[a.id] || 0)),
    [teams, teamScores]
  );

  // ── Lineup toggle (ottimistico + salvataggio DB) ───────────────────────────
  const handleTogglePilot = useCallback(async (calendarIndex, teamId, pilotId) => {
    const rKey = `race_${calendarIndex}`;
    const raceLineups = { ...(lineups[rKey] || {}) };
    let tLineup = [...(raceLineups[teamId] || [])];

    if (tLineup.includes(pilotId)) {
      tLineup = tLineup.filter(x => x !== pilotId);
    } else if (tLineup.length < 3) {
      tLineup.push(pilotId);
    }

    // Aggiorna stato locale immediatamente (UX fluida)
    raceLineups[teamId] = tLineup;
    setLineups(prev => ({ ...prev, [rKey]: raceLineups }));

    // Salva su DB in background
    db.saveLineup(calendarIndex, teamId, tLineup).catch(err => {
      console.error('Errore salvataggio formazione:', err);
    });
  }, [lineups]);

  // ── Sessione utente ───────────────────────────────────────────────────────
  const currentTeam = currentUser ? teams.find(t => t.id === currentUser.id) || currentUser : null;
  const handleLogin  = (team) => setCurrentUser(team);
  const handleLogout = () => { setCurrentUser(null); setShowAdmin(false); };

  if (loading) {
    return (
      <div style={{
        background: "#0a0a0a", minHeight: "100vh", display: "flex",
        alignItems: "center", justifyContent: "center",
        fontFamily: "'Orbitron', monospace", color: "#e10600", fontSize: 14,
        letterSpacing: 3,
      }}>
        CARICAMENTO...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        background: "#0a0a0a", minHeight: "100vh", display: "flex",
        flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16,
        fontFamily: "'Titillium Web', sans-serif", color: "#e8e8e8",
      }}>
        <div style={{ color: "#e10600", fontSize: 14 }}>Errore connessione DB</div>
        <div style={{ fontSize: 12, color: "#555" }}>{error}</div>
        <button onClick={refresh} style={{
          background: "#e10600", border: "none", borderRadius: 8,
          color: "#fff", padding: "10px 24px", cursor: "pointer", fontWeight: 700,
        }}>Riprova</button>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginPage teams={teams} onLogin={handleLogin} />;
  }

  const nav = [
    { id: "classifica", label: "Classifica", icon: "trophy" },
    { id: "squadre",    label: "Squadre",    icon: "users" },
    { id: "piloti",     label: "Piloti",     icon: "helmet" },
    { id: "calendario", label: "Calendario", icon: "calendar" },
    { id: "gara",       label: "Gara",       icon: "flag" },
  ];

  return (
    <div style={{
      fontFamily: "'Titillium Web', 'Segoe UI', sans-serif",
      background: "#0a0a0a",
      color: "#e8e8e8",
      minHeight: "100vh",
      maxWidth: 960,
      margin: "0 auto",
      position: "relative",
    }}>
      {/* HEADER */}
      <header style={{
        background: "linear-gradient(135deg, #e10600 0%, #900 50%, #1e1e1e 100%)",
        padding: "20px 24px 16px",
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: 0, right: 0, width: 200, height: "100%",
          background: "repeating-linear-gradient(90deg, transparent, transparent 14px, rgba(255,255,255,0.05) 14px, rgba(255,255,255,0.05) 16px)",
          pointerEvents: "none",
        }}/>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{
              fontFamily: "'Orbitron', monospace", fontSize: 28, fontWeight: 900,
              margin: 0, letterSpacing: 2, textTransform: "uppercase",
              textShadow: "0 2px 20px rgba(225,6,0,0.5)",
            }}>
              FANTA<span style={{ color: "#fff", opacity: 0.6 }}>F1</span>
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: 11, opacity: 0.6, letterSpacing: 3, textTransform: "uppercase" }}>
              2026 Season
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
            {/* Badge utente */}
            <div style={{
              background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 8, padding: "4px 10px", fontSize: 11, color: "#ccc",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <span style={{ opacity: 0.5 }}>▸</span>
              <span style={{ fontWeight: 700, color: "#fff" }}>{currentTeam?.name}</span>
              <button onClick={handleLogout} style={{
                background: "none", border: "none", color: "#888", cursor: "pointer",
                fontSize: 10, padding: "0 0 0 6px", fontWeight: 600,
                textTransform: "uppercase", letterSpacing: 1,
              }}>
                Esci
              </button>
            </div>
            {/* Bottoni admin */}
            {currentTeam?.isAdmin && (
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => setShowAste(true)} style={{
                  background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: 8, color: "#fff", padding: "6px 12px", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600,
                }}>
                  🔨 Aste
                </button>
                <button onClick={() => setShowAdmin(!showAdmin)} style={{
                  background: showAdmin ? "#e10600" : "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: 8, color: "#fff", padding: "6px 12px", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600,
                }}>
                  <Icon type="settings" size={16}/> Admin
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* NAV */}
      <nav style={{ display: "flex", background: "#141414", borderBottom: "1px solid #222", overflowX: "auto" }}>
        {nav.map(n => (
          <button key={n.id} onClick={() => setPage(n.id)} style={{
            flex: 1, padding: "12px 8px 10px",
            background: page === n.id ? "rgba(225,6,0,0.15)" : "transparent",
            border: "none",
            borderBottom: page === n.id ? "2px solid #e10600" : "2px solid transparent",
            color: page === n.id ? "#e10600" : "#888",
            cursor: "pointer", display: "flex", flexDirection: "column",
            alignItems: "center", gap: 4, fontSize: 10, fontWeight: 600,
            textTransform: "uppercase", letterSpacing: 1, transition: "all 0.2s", minWidth: 70,
          }}>
            <Icon type={n.icon} size={18}/> {n.label}
          </button>
        ))}
      </nav>

      {/* CONTENT */}
      <main style={{ padding: "20px 16px 100px" }}>
        {page === "classifica" && <Classifica teams={sortedTeams} scores={teamScores} races={races}/>}
        {page === "squadre"    && <Squadre teams={teams} pilots={pilots} scores={teamScores}/>}
        {page === "piloti"     && <Piloti pilots={pilots} teams={teams}/>}
        {page === "calendario" && <Calendario calendar={CALENDAR} races={races}/>}
        {page === "gara"       && (
          <GaraManager
            races={races} pilots={pilots} teams={teams}
            lineups={lineups} calendar={CALENDAR}
            currentUser={currentTeam}
            onTogglePilot={handleTogglePilot}
          />
        )}
      </main>

      {/* ADMIN PANEL */}
      {showAdmin && (
        <AdminPanel
          teams={teams} pilots={pilots} races={races} lineups={lineups}
          onRefresh={refresh}
          onClose={() => setShowAdmin(false)}
        />
      )}

      {/* GESTIONE ASTE */}
      {showAste && (
        <GestioneAste
          teams={teams} pilots={pilots}
          onRefresh={refresh}
          onClose={() => setShowAste(false)}
        />
      )}
    </div>
  );
}
