'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { CALENDAR } from '@/lib/data';
import { calculateTeamScores } from '@/lib/scoring';
import * as db from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { Icon } from './ui';
import Classifica from './Classifica';
import Squadre from './Squadre';
import Calendario from './Calendario';
import GaraManager from './GaraManager';
import Risultati from './Risultati';
import Aste from './Aste';
import AdminPanel from './AdminPanel';
import LoginPage from './LoginPage';

export default function FantaF1() {
  const [page, setPage] = useState("classifica");
  const [showAdmin, setShowAdmin] = useState(false);

  const [session, setSession] = useState(null);
  const [currentUser, setCurrentUser] = useState(null); // team matched to user

  const [teams, setTeams] = useState([]);
  const [pilots, setPilots] = useState([]);
  const [races, setRaces] = useState([]);
  const [lineups, setLineups] = useState({});
  const [dbLineups, setDbLineups] = useState({});
  const [reserves, setReserves] = useState({});
  const [dbReserves, setDbReserves] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const [t, p, r, l] = await Promise.all([
        db.fetchTeams(), db.fetchPilots(), db.fetchRaces(), db.fetchLineups(),
      ]);
      setTeams(t); setPilots(p); setRaces(r);
      setLineups(JSON.parse(JSON.stringify(l.starters)));
      setDbLineups(JSON.parse(JSON.stringify(l.starters)));
      setReserves(JSON.parse(JSON.stringify(l.reserves)));
      setDbReserves(JSON.parse(JSON.stringify(l.reserves)));
      setError(null);
      return t;
    } catch (e) {
      console.error('Errore caricamento dati:', e);
      setError(e.message);
      return null;
    }
  }, []);

  useEffect(() => {
    // 1. Fetch data initially
    refresh().then((fetchedTeams) => {
      // 2. Setup Supabase Auth listener
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        if (session && fetchedTeams) {
          const matchedTeam = fetchedTeams.find(t => t.authUserId === session.user.id) || fetchedTeams.find(t => t.id === session.user.id);
          setCurrentUser(matchedTeam || null);
        }
        setLoading(false);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
        if (session && fetchedTeams) {
          // Temporarily match by auth_user_id or id if mock
          const matchedTeam = fetchedTeams.find(t => t.authUserId === session.user.id) || fetchedTeams.find(t => t.id === session.user.id);
          setCurrentUser(matchedTeam || null);
        } else {
          setCurrentUser(null);
        }
      });

      return () => subscription.unsubscribe();
    });
  }, [refresh]);

  const teamScores = useMemo(
    () => calculateTeamScores(teams, pilots, races, dbLineups, dbReserves),
    [teams, pilots, races, dbLineups, dbReserves]
  );
  const sortedTeams = useMemo(
    () => [...teams].sort((a, b) => {
      const scoreB = teamScores[b.id] || 0;
      const scoreA = teamScores[a.id] || 0;
      if (scoreB !== scoreA) return scoreB - scoreA;
      // Tie-breaker: higher budget left wins
      return b.budget - a.budget;
    }),
    [teams, teamScores]
  );

  const handleTogglePilot = useCallback((calendarIndex, teamId, pilotId) => {
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
  }, [lineups]);

  const handleSaveLineup = useCallback(async (calendarIndex, teamId) => {
    const rKey = `race_${calendarIndex}`;
    const tLineup = (lineups[rKey] || {})[teamId] || [];
    if (tLineup.length !== 3) return { success: false, error: 'Serve selezionare 3 titolari.' };

    const myPilots = pilots.filter(p => p.owner === teamId);
    const benchPilot = myPilots.find(p => !tLineup.includes(p.id)) || null;

    try {
      await db.saveLineup(calendarIndex, teamId, tLineup, benchPilot?.id);
      
      setDbLineups(prev => {
        const raceLineups = { ...(prev[rKey] || {}) };
        raceLineups[teamId] = tLineup;
        return { ...prev, [rKey]: raceLineups };
      });
      return { success: true };
    } catch (err) {
      console.error('Errore Salvataggio DB:', err);
      return { success: false, error: err.message };
    }
  }, [lineups, pilots]);

  // Se la sessione Supabase manca The user needs to login
  const currentTeam = currentUser;
  
  const handleLoginSuccess = (newSession) => {
    setSession(newSession);
  };

  const handleLogout = async () => { 
    await supabase.auth.signOut();
    setShowAdmin(false); 
  };

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

  // Manca la sessione Auth di Supabase
  if (!session || !currentTeam) return <LoginPage onLoginSuccess={handleLoginSuccess} />;

  const nav = [
    { id: "classifica", label: "Home", icon: "trophy" },
    { id: "squadre", label: "Scuderia", icon: "users" },
    { id: "calendario", label: "Calendario", icon: "calendar" },
    { id: "gara", label: "Gara", icon: "flag" },
    { id: "risultati", label: "Risultati", icon: "activity" },
    { id: "aste", label: "Aste", icon: "hammer" },
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
        }} />

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
                  <Icon type="settings" size={13} /> Admin
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
            pilots={pilots} lineups={dbLineups} reserves={dbReserves} calendar={CALENDAR}
            currentUser={currentTeam} onNavigate={setPage}
          />
        )}
        {page === "squadre" && (
          <Squadre
            teams={sortedTeams} pilots={pilots} scores={teamScores}
            currentUser={currentTeam} lineups={lineups} dbLineups={dbLineups}
            calendar={CALENDAR} races={races}
            onTogglePilot={handleTogglePilot}
            onSaveLineup={handleSaveLineup}
          />
        )}
        {page === "calendario" && <Calendario calendar={CALENDAR} races={races} />}
        {page === "gara" && (
          <GaraManager
            races={races} pilots={pilots} teams={teams}
            lineups={dbLineups} reserves={dbReserves} calendar={CALENDAR}
            currentUser={currentTeam}
            onTogglePilot={handleTogglePilot}
          />
        )}
        {page === "risultati" && (
          <Risultati
            races={races} pilots={pilots} teams={sortedTeams}
            scores={teamScores} lineups={dbLineups} reserves={dbReserves}
          />
        )}
        {page === "aste" && <Aste calendar={CALENDAR} />}
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
                gap: active ? 2 : 1,
                padding: active ? "8px 12px" : "8px 10px",
                borderRadius: 100,
                border: "none",
                background: active ? "#e10600" : "transparent",
                color: active ? "#fff" : "#666",
                cursor: "pointer",
                transition: "all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
                fontSize: 8,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: active ? 0.3 : 0.5,
                boxShadow: active ? "0 4px 16px rgba(225,6,0,0.45)" : "none",
                whiteSpace: "nowrap",
                minWidth: 48,
              }}
            >
              <Icon type={n.icon} size={active ? 16 : 14} />
              {n.label}
            </button>
          );
        })}
      </nav>

      {/* ── ADMIN PANEL ─────────────────────────────────────────────────────── */}
      {showAdmin && (
        <AdminPanel teams={teams} pilots={pilots} races={races} lineups={lineups} onRefresh={refresh} onClose={() => setShowAdmin(false)} />
      )}
    </div>
  );
}
