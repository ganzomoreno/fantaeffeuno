'use client';

import { useState, useMemo } from 'react';
import { DEFAULT_TEAMS, DEFAULT_PILOTS, CALENDAR } from '@/lib/data';
import { calculateTeamScores } from '@/lib/scoring';
import { useLocalStorage } from '@/lib/useLocalStorage';
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
  const [currentUser, setCurrentUser] = useLocalStorage("ff1_current_user", null);
  const [showAste, setShowAste] = useState(false);

  // Persisted state
  const [teams, setTeams] = useLocalStorage("ff1_teams", DEFAULT_TEAMS);
  const [pilots, setPilots] = useLocalStorage("ff1_pilots", DEFAULT_PILOTS);
  const [races, setRaces] = useLocalStorage("ff1_races", []);
  const [lineups, setLineups] = useLocalStorage("ff1_lineups", {});

  // Scoring
  const teamScores = useMemo(
    () => calculateTeamScores(teams, pilots, races, lineups),
    [teams, pilots, races, lineups]
  );

  const sortedTeams = useMemo(
    () => [...teams].sort((a, b) => (teamScores[b.id] || 0) - (teamScores[a.id] || 0)),
    [teams, teamScores]
  );

  // Sync currentUser with latest team data (in case name/budget changed)
  const currentTeam = currentUser ? teams.find(t => t.id === currentUser.id) || currentUser : null;

  const handleLogin = (team) => setCurrentUser(team);
  const handleLogout = () => { setCurrentUser(null); setShowAdmin(false); };

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
            {/* Current user badge */}
            <div style={{
              background: "rgba(0,0,0,0.3)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 8,
              padding: "4px 10px",
              fontSize: 11,
              color: "#ccc",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}>
              <span style={{ opacity: 0.5 }}>▸</span>
              <span style={{ fontWeight: 700, color: "#fff" }}>{currentTeam?.name}</span>
              <button
                onClick={handleLogout}
                style={{
                  background: "none",
                  border: "none",
                  color: "#888",
                  cursor: "pointer",
                  fontSize: 10,
                  padding: "0 0 0 6px",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                Esci
              </button>
            </div>
            {/* Admin buttons — only for admin teams */}
            {currentTeam?.isAdmin && (
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => setShowAste(true)} style={{
                  background: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: 8,
                  color: "#fff",
                  padding: "6px 12px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  transition: "all 0.2s",
                }}>
                  🔨 Aste
                </button>
                <button onClick={() => setShowAdmin(!showAdmin)} style={{
                  background: showAdmin ? "#e10600" : "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: 8,
                  color: "#fff",
                  padding: "6px 12px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  transition: "all 0.2s",
                }}>
                  <Icon type="settings" size={16}/> Admin
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* NAV */}
      <nav style={{
        display: "flex",
        background: "#141414",
        borderBottom: "1px solid #222",
        overflowX: "auto",
      }}>
        {nav.map(n => (
          <button key={n.id} onClick={() => setPage(n.id)} style={{
            flex: 1,
            padding: "12px 8px 10px",
            background: page === n.id ? "rgba(225,6,0,0.15)" : "transparent",
            border: "none",
            borderBottom: page === n.id ? "2px solid #e10600" : "2px solid transparent",
            color: page === n.id ? "#e10600" : "#888",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
            fontSize: 10,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: 1,
            transition: "all 0.2s",
            minWidth: 70,
          }}>
            <Icon type={n.icon} size={18}/> {n.label}
          </button>
        ))}
      </nav>

      {/* CONTENT */}
      <main style={{ padding: "20px 16px 100px" }}>
        {page === "classifica" && <Classifica teams={sortedTeams} scores={teamScores} races={races}/>}
        {page === "squadre" && <Squadre teams={teams} pilots={pilots} scores={teamScores}/>}
        {page === "piloti" && <Piloti pilots={pilots} teams={teams}/>}
        {page === "calendario" && <Calendario calendar={CALENDAR} races={races}/>}
        {page === "gara" && <GaraManager races={races} setRaces={setRaces} pilots={pilots} teams={teams} lineups={lineups} setLineups={setLineups} calendar={CALENDAR} currentUser={currentTeam}/>}
      </main>

      {/* ADMIN PANEL */}
      {showAdmin && (
        <AdminPanel
          teams={teams} setTeams={setTeams}
          pilots={pilots} setPilots={setPilots}
          races={races} setRaces={setRaces}
          lineups={lineups} setLineups={setLineups}
          onClose={() => setShowAdmin(false)}
        />
      )}

      {/* GESTIONE ASTE */}
      {showAste && (
        <GestioneAste
          teams={teams} setTeams={setTeams}
          pilots={pilots} setPilots={setPilots}
          onClose={() => setShowAste(false)}
        />
      )}
    </div>
  );
}
