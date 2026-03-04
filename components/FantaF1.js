'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { CALENDAR } from '@/lib/data';
import { calculateTeamScores } from '@/lib/scoring';
import { useLocalStorage } from '@/lib/useLocalStorage';
import * as db from '@/lib/db';
import { Icon } from './ui';
import Classifica from './Classifica';
import Squadre from './Squadre';
import Calendario from './Calendario';
import GaraManager from './GaraManager';
import AdminPanel from './AdminPanel';
import LoginPage from './LoginPage';

export default function FantaF1() {
  const [page, setPage] = useState("classifica");
  const [showAdmin, setShowAdmin] = useState(false);

  const [currentUser, setCurrentUser] = useLocalStorage("ff1_current_user", null);

  const [teams, setTeams] = useState([]);
  const [pilots, setPilots] = useState([]);
  const [races, setRaces] = useState([]);
  const [lineups, setLineups] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const [t, p, r, l] = await Promise.all([
        db.fetchTeams(), db.fetchPilots(), db.fetchRaces(), db.fetchLineups(),
      ]);
      setTeams(t); setPilots(p); setRaces(r); setLineups(l); setError(null);
    } catch (e) {
      console.error('Errore caricamento dati:', e);
      setError(e.message);
    }
  }, []);

  useEffect(() => { refresh().finally(() => setLoading(false)); }, [refresh]);

  const teamScores = useMemo(
    () => calculateTeamScores(teams, pilots, races, lineups),
    [teams, pilots, races, lineups]
  );
  const sortedTeams = useMemo(
    () => [...teams].sort((a, b) => (teamScores[b.id] || 0) - (teamScores[a.id] || 0)),
    [teams, teamScores]
  );

  const handleTogglePilot = useCallback(async (calendarIndex, teamId, pilotId) => {
    const rKey = `race_${calendarIndex}`;
    const raceLineups = { ...(lineups[rKey] || {}) };
    let tLineup = [...(raceLineups[teamId] || [])];
    if (tLineup.includes(pilotId)) {
      tLineup = tLineup.filter(x => x !== pilotId);
    } else if (tLineup.length < 3) {
      tLineup.push(pilotId);
    }
    raceLineups[teamId] = tLineup;
    setLineups(prev => ({ ...prev, [rKey]: raceLineups }));
    db.saveLineup(calendarIndex, teamId, tLineup).catch(err => console.error(err));
  }, [lineups]);

  const currentTeam = currentUser ? teams.find(t => t.id === currentUser.id) || currentUser : null;
  const handleLogin  = (team) => setCurrentUser(team);
  const handleLogout = () => { setCurrentUser(null); setShowAdmin(false); };

  if (loading) {
    return (
      <div style={{ background: "#0B0C10", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Orbitron', monospace", color: "#e10600", fontSize: 13, letterSpacing: 4 }}>
        CARICAMENTO...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ background: "#0B0C10", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, fontFamily: "'Titillium Web', sans-serif", color: "#e8e8e8" }}>
        <div style={{ color: "#e10600", fontSize: 14 }}>Errore connessione DB</div>
        <div style={{ fontSize: 12, color: "#555" }}>{error}</div>
        <button onClick={refresh} style={{ background: "#e10600", border: "none", borderRadius: 8, color: "#fff", padding: "10px 24px", cursor: "pointer", fontWeight: 700 }}>Riprova</button>
      </div>
    );
  }

  if (!currentUser) return <LoginPage teams={teams} onLogin={handleLogin} />;

  const nav = [
    { id: "classifica", label: "Home",       icon: "trophy"    },
    { id: "squadre",    label: "Scuderia",   icon: "users"     },
    { id: "calendario", label: "Calendario", icon: "calendar"  },
    { id: "gara",       label: "Gara",       icon: "flag"      },
  ];

  return (
    <div style={{
      fontFamily: "'Titillium Web', 'Segoe UI', sans-serif",
      background: "linear-gradient(160deg, #0B0C10 0%, #12131A 100%)",
      color: "#EDEEF3",
      minHeight: "100vh",
      maxWidth: 960,
      margin: "0 auto",
      position: "relative",
    }}>

      {/* ── HEADER ──────────────────────────────────────────────────────────── */}
      <header style={{
        background: "linear-gradient(135deg, #c80000 0%, #7a0000 55%, #111318 100%)",
        padding: "18px 20px 14px",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Racing stripe texture */}
        <div style={{
          position: "absolute", top: 0, right: 0, width: 220, height: "100%",
          background: "repeating-linear-gradient(90deg, transparent, transparent 14px, rgba(255,255,255,0.04) 14px, rgba(255,255,255,0.04) 16px)",
          pointerEvents: "none",
        }}/>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          {/* Logo */}
          <div>
            <h1 style={{ fontFamily: "'Orbitron', monospace", fontSize: 26, fontWeight: 900, margin: 0, letterSpacing: 2, textTransform: "uppercase" }}>
              FANTA<span style={{ opacity: 0.5 }}>F1</span>
            </h1>
            <p style={{ margin: "3px 0 0", fontSize: 10, opacity: 0.5, letterSpacing: 4, textTransform: "uppercase" }}>2026 Season</p>
          </div>

          {/* Right: user badge + admin */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
            {/* User pill */}
            <div style={{
              background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 100, padding: "5px 12px 5px 8px",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#e10600", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 900 }}>
                {currentTeam?.name?.charAt(0)}
              </div>
              <span style={{ fontWeight: 700, fontSize: 12, color: "#fff" }}>{currentTeam?.name}</span>
              <button onClick={handleLogout} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 100, color: "#aaa", cursor: "pointer", fontSize: 10, padding: "2px 8px", fontWeight: 600 }}>
                Esci
              </button>
            </div>

            {/* Admin buttons */}
            {currentTeam?.isAdmin && (
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => window.location.href = '/asta'} style={{
                  background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 100, color: "#fff", padding: "5px 12px", cursor: "pointer",
                  fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 5,
                }}>
                  🔨 Aste
                </button>
                <button onClick={() => setShowAdmin(!showAdmin)} style={{
                  background: showAdmin ? "#e10600" : "rgba(255,255,255,0.08)",
                  border: `1px solid ${showAdmin ? "#e10600" : "rgba(255,255,255,0.15)"}`,
                  borderRadius: 100, color: "#fff", padding: "5px 12px", cursor: "pointer",
                  fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 5,
                }}>
                  <Icon type="settings" size={13}/> Admin
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── CONTENT ─────────────────────────────────────────────────────────── */}
      <main style={{ padding: "20px 16px 110px" }}>
        {page === "classifica" && (
          <Classifica
            teams={sortedTeams} scores={teamScores} races={races}
            pilots={pilots} lineups={lineups} calendar={CALENDAR}
            currentUser={currentTeam} onNavigate={setPage}
          />
        )}
        {page === "squadre" && (
          <Squadre
            teams={teams} pilots={pilots} scores={teamScores}
            currentUser={currentTeam} lineups={lineups}
            calendar={CALENDAR} races={races}
            onTogglePilot={handleTogglePilot}
          />
        )}
        {page === "calendario" && <Calendario calendar={CALENDAR} races={races}/>}
        {page === "gara" && (
          <GaraManager
            races={races} pilots={pilots} teams={teams}
            lineups={lineups} calendar={CALENDAR}
            currentUser={currentTeam}
            onTogglePilot={handleTogglePilot}
          />
        )}
      </main>

      {/* ── FLOATING BOTTOM NAV ─────────────────────────────────────────────── */}
      <nav style={{
        position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)",
        zIndex: 100,
        background: "rgba(14, 15, 20, 0.82)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 100,
        padding: "6px",
        display: "flex", gap: 2,
        boxShadow: "0 8px 40px rgba(0,0,0,0.55), 0 1px 0 rgba(255,255,255,0.06) inset",
        maxWidth: "calc(100vw - 32px)",
      }}>
        {nav.map(n => {
          const active = page === n.id;
          return (
            <button
              key={n.id}
              onClick={() => setPage(n.id)}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                gap: active ? 3 : 2,
                padding: active ? "9px 18px" : "9px 14px",
                borderRadius: 100,
                border: "none",
                background: active ? "#e10600" : "transparent",
                color: active ? "#fff" : "#666",
                cursor: "pointer",
                transition: "all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
                fontSize: 9,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: active ? 0.5 : 1,
                boxShadow: active ? "0 4px 16px rgba(225,6,0,0.45)" : "none",
                whiteSpace: "nowrap",
              }}
            >
              <Icon type={n.icon} size={active ? 17 : 16}/>
              {n.label}
            </button>
          );
        })}
      </nav>

      {/* ── ADMIN PANEL ─────────────────────────────────────────────────────── */}
      {showAdmin && (
        <AdminPanel teams={teams} pilots={pilots} races={races} lineups={lineups} onRefresh={refresh} onClose={() => setShowAdmin(false)}/>
      )}
    </div>
  );
}
