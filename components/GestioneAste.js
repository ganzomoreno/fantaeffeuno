'use client';

import { useState, useRef, useEffect } from 'react';
import { F1_TEAM_COLORS, F1_PILOT_NUMBERS } from '@/lib/data';
import * as db from '@/lib/db';

const AUCTION_PASSWORD = "wlf";

// ─── PASSWORD SCREEN ─────────────────────────────────────────────────────────
function PasswordScreen({ onAuth, onClose }) {
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const submit = () => {
    if (pw === AUCTION_PASSWORD) { onAuth(); }
    else { setError('Password errata'); setPw(''); inputRef.current?.focus(); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#050505", zIndex: 2000, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 11, letterSpacing: 6, color: "#e10600", textTransform: "uppercase", marginBottom: 8, opacity: 0.8 }}>
        Area Riservata
      </div>
      <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 32, fontWeight: 900, color: "#fff", marginBottom: 4, letterSpacing: 2 }}>
        ASTA LIVE
      </div>
      <div style={{ fontSize: 12, color: "#555", marginBottom: 40, letterSpacing: 3 }}>2026 Season</div>
      <div style={{ background: "#111", border: "1px solid #222", borderRadius: 16, padding: 32, width: 320, maxWidth: "calc(100vw - 32px)" }}>
        <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 2, marginBottom: 12 }}>Password Admin</div>
        <input
          ref={inputRef} type="password" value={pw}
          onChange={e => { setPw(e.target.value); setError(''); }}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="••••"
          style={{ width: "100%", background: "#1a1a1a", border: error ? "1px solid #e10600" : "1px solid #2a2a2a", borderRadius: 10, color: "#fff", padding: "14px 16px", fontSize: 18, fontFamily: "'Orbitron', monospace", letterSpacing: 8, marginBottom: 8, boxSizing: "border-box" }}
        />
        {error && <div style={{ color: "#e10600", fontSize: 12, marginBottom: 8 }}>{error}</div>}
        <button onClick={submit} style={{ width: "100%", background: "linear-gradient(135deg, #e10600, #a00)", border: "none", borderRadius: 10, color: "#fff", padding: "13px 0", fontSize: 13, fontWeight: 700, fontFamily: "'Orbitron', monospace", letterSpacing: 2, textTransform: "uppercase", cursor: "pointer", marginBottom: 12 }}>
          Accedi
        </button>
        <button onClick={onClose} style={{ width: "100%", background: "transparent", border: "1px solid #222", borderRadius: 10, color: "#555", padding: "10px 0", fontSize: 12, cursor: "pointer" }}>
          Annulla
        </button>
      </div>
    </div>
  );
}

// ─── MAIN AUCTION PAGE ────────────────────────────────────────────────────────
export default function GestioneAste({ teams, pilots, auction, onRefresh, onClose }) {
  const [authed, setAuthed]           = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [showOpenNext, setShowOpenNext]         = useState(false);
  const [auctionBusy, setAuctionBusy]           = useState(false);
  const [spotNum, setSpotNum]         = useState('');
  const [assignTeam, setAssignTeam]   = useState('');
  const [assignPrice, setAssignPrice] = useState('');
  const [lastAssigned, setLastAssigned] = useState(null);
  const [confirmRelease, setConfirmRelease] = useState(null);
  const [busy, setBusy]               = useState(false);
  const [isMobile, setIsMobile]       = useState(false);
  const [mobileTab, setMobileTab]     = useState('piloti');
  const [extracting, setExtracting]   = useState(false);
  const extractIntervalRef            = useRef(null);
  const spotInputRef  = useRef(null);
  const pilotListRef  = useRef(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 700);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const spotIndex = parseInt(spotNum);
  const validSpot = spotIndex >= 1 && spotIndex <= 22;
  const spotPilot = validSpot ? pilots[spotIndex - 1] : null;

  useEffect(() => {
    if (validSpot && pilotListRef.current) {
      const row = pilotListRef.current.querySelector(`[data-idx="${spotIndex}"]`);
      if (row) row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [spotIndex, validSpot]);

  const assignPilot = async () => {
    if (!spotPilot || !assignTeam || !assignPrice) return;
    const price = parseInt(assignPrice);
    if (isNaN(price) || price < 1) return;
    const team = teams.find(t => t.id === assignTeam);
    if (!team) return;
    if (team.budget < price) { alert(`Budget insufficiente! ${team.name} ha solo ${team.budget}M`); return; }
    if (spotPilot.owner) { alert("Pilota già assegnato!"); return; }
    setBusy(true);
    try {
      await db.assignPilot(spotPilot.id, assignTeam, price);
      setLastAssigned({ pilotName: spotPilot.name, teamName: team.name, price });
      setSpotNum(''); setAssignTeam(''); setAssignPrice('');
      await onRefresh();
      setTimeout(() => spotInputRef.current?.focus(), 50);
    } catch(e) { alert("Errore: " + e.message); }
    setBusy(false);
  };

  const extractPilot = () => {
    const free = pilots.map((p, i) => ({ ...p, idx: i + 1 })).filter(p => !p.owner);
    if (free.length === 0) return;
    setExtracting(true);
    setAssignTeam(''); setAssignPrice('');
    let ticks = 0;
    const totalTicks = 24;
    // Speed: starts fast, slows down (ease-out)
    const delays = Array.from({ length: totalTicks }, (_, i) =>
      40 + Math.floor((i / totalTicks) ** 2 * 320)
    );
    const spin = (tick) => {
      if (tick >= totalTicks) {
        // Final pick
        const winner = free[Math.floor(Math.random() * free.length)];
        setSpotNum(String(winner.idx));
        setExtracting(false);
        return;
      }
      const random = free[Math.floor(Math.random() * free.length)];
      setSpotNum(String(random.idx));
      extractIntervalRef.current = setTimeout(() => spin(tick + 1), delays[tick]);
    };
    spin(0);
  };

  const handleCloseAuction = async () => {
    if (!auction?.id) return;
    setAuctionBusy(true);
    try {
      await db.closeAuction(auction.id);
      await onRefresh();
      setShowCloseConfirm(false);
    } catch(e) { alert("Errore chiusura asta: " + e.message); }
    setAuctionBusy(false);
  };

  const handleOpenNextAuction = async () => {
    setAuctionBusy(true);
    try {
      await db.openNextAuction(auction?.budgetAdded ?? 100);
      await onRefresh();
      setShowOpenNext(false);
    } catch(e) { alert("Errore apertura asta: " + e.message); }
    setAuctionBusy(false);
  };

  const isClosed = auction?.isCompleted === true;

  const releasePilot = async (pilotId) => {
    setBusy(true);
    try {
      await db.releasePilot(pilotId);
      setConfirmRelease(null);
      await onRefresh();
    } catch(e) { alert("Errore: " + e.message); }
    setBusy(false);
  };

  const assignedCount = pilots.filter(p => p.owner).length;
  const freeCount     = 22 - assignedCount;
  // Squadre ordinate per budget decrescente
  const sortedTeams   = [...teams].sort((a, b) => b.budget - a.budget);

  if (!authed) return <PasswordScreen onAuth={() => setAuthed(true)} onClose={onClose} />;

  // ── Assignment panel (used in both layouts) — hidden when auction closed ────
  const AssignmentPanel = (!isClosed && spotPilot) ? (() => {
    const teamColor  = F1_TEAM_COLORS[spotPilot.team] || "#e10600";
    const isAssigned = !!spotPilot.owner;
    const ownerTeam  = isAssigned ? teams.find(t => t.id === spotPilot.owner) : null;
    return (
      <div style={{
        background: `linear-gradient(135deg, #111 0%, ${teamColor}18 100%)`,
        border: `1px solid ${teamColor}55`,
        borderRadius: 12, padding: "14px 16px",
        position: "relative", overflow: "hidden",
      }}>
        {/* big number watermark */}
        <div style={{
          position: "absolute", right: 12, top: 8,
          fontFamily: "'Orbitron', monospace", fontSize: 72, fontWeight: 900,
          color: teamColor, opacity: 0.07, lineHeight: 1, userSelect: "none", pointerEvents: "none",
        }}>
          {F1_PILOT_NUMBERS[spotPilot?.abbreviation] ?? spotIndex}
        </div>

        {/* Pilot identity */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{ width: 4, height: 44, borderRadius: 2, background: teamColor, flexShrink: 0 }}/>
          <div>
            <div style={{ fontSize: 11, color: teamColor, letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>
              {spotPilot.team}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <span style={{ fontFamily: "'Orbitron', monospace", fontSize: 28, fontWeight: 900, letterSpacing: 2, color: isAssigned ? "#444" : teamColor, lineHeight: 1 }}>
                {spotPilot.abbreviation}
              </span>
              <span style={{ fontSize: 15, fontWeight: 600, color: isAssigned ? "#555" : "#aaa", lineHeight: 1 }}>
                {spotPilot.name}
              </span>
            </div>
          </div>
          {isAssigned && (
            <span style={{ marginLeft: "auto", fontSize: 11, padding: "3px 10px", borderRadius: 20, background: "#2a2a2a", color: "#555", border: "1px solid #333", flexShrink: 0 }}>
              Già aggiudicato
            </span>
          )}
        </div>

        {isAssigned ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", background: "rgba(0,0,0,0.3)", borderRadius: 10, padding: "10px 14px" }}>
            <span style={{ fontSize: 13, color: "#888" }}>→</span>
            <span style={{ fontWeight: 700, fontSize: 15, color: "#e8e8e8" }}>{ownerTeam?.name}</span>
            <span style={{ fontFamily: "'Orbitron', monospace", fontWeight: 900, color: "#e10600", fontSize: 16 }}>
              {spotPilot.price}M
            </span>
            <button onClick={() => setConfirmRelease(spotPilot.id)} style={{ marginLeft: "auto", background: "transparent", border: "1px solid #3a1a1a", borderRadius: 6, color: "#ff4444", padding: "6px 14px", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
              Rilascia
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
            <input
              id="price-input" type="number" min="1" value={assignPrice}
              onChange={e => setAssignPrice(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && assignPilot()}
              placeholder="FM"
              style={{ width: 80, background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 8, color: "#fff", padding: "10px 12px", fontSize: 18, fontFamily: "'Orbitron', monospace", fontWeight: 700, textAlign: "center", boxSizing: "border-box" }}
            />
            <select
              value={assignTeam}
              onChange={e => setAssignTeam(e.target.value)}
              style={{ flex: "1 1 160px", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 8, color: assignTeam ? "#fff" : "#555", padding: "10px 12px", fontSize: 14, fontFamily: "'Titillium Web', sans-serif" }}
            >
              <option value="">— Squadra aggiudicataria —</option>
              {teams.map(t => (
                <option key={t.id} value={t.id}>{t.name}  ({t.budget}M)</option>
              ))}
            </select>
            <button
              onClick={assignPilot}
              disabled={!assignTeam || !assignPrice || busy}
              style={{
                background: assignTeam && assignPrice ? `linear-gradient(135deg, ${teamColor}, ${teamColor}bb)` : "#1a1a1a",
                border: "none", borderRadius: 8, color: "#fff",
                padding: "10px 20px", fontSize: 14, fontWeight: 700,
                fontFamily: "'Orbitron', monospace", letterSpacing: 1,
                textTransform: "uppercase", cursor: assignTeam && assignPrice ? "pointer" : "not-allowed",
                opacity: assignTeam && assignPrice ? 1 : 0.4, whiteSpace: "nowrap", transition: "all 0.15s",
              }}
            >
              {busy ? "..." : "Aggiudica"}
            </button>
          </div>
        )}
      </div>
    );
  })() : null;

  return (
    <div style={{
      position: "fixed", inset: 0, background: "#070707", zIndex: 2000,
      display: "flex", flexDirection: "column", fontFamily: "'Titillium Web', sans-serif",
      color: "#e8e8e8", overflow: "hidden",
    }}>
      <style>{`
        @keyframes extractPulse {
          from { box-shadow: 0 0 10px rgba(225,6,0,0.5), 0 0 20px rgba(225,6,0,0.3); }
          to   { box-shadow: 0 0 24px rgba(225,6,0,1),   0 0 48px rgba(225,6,0,0.6); }
        }
      `}</style>

      {/* ── HEADER ── */}
      <div style={{
        background: "linear-gradient(90deg, #0d0d0d 0%, #1a0000 50%, #0d0d0d 100%)",
        borderBottom: "1px solid #1f1f1f",
        padding: isMobile ? "8px 14px" : "10px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexShrink: 0, gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ fontFamily: "'Orbitron', monospace", fontSize: isMobile ? 15 : 22, fontWeight: 900, color: "#e10600", letterSpacing: 2 }}>
            ASTA LIVE
            <span style={{ fontSize: 10, color: "#555", fontWeight: 400, marginLeft: 8, letterSpacing: 3 }}>2026</span>
          </div>
          <div style={{ background: "rgba(225,6,0,0.1)", border: "1px solid rgba(225,6,0,0.3)", borderRadius: 20, padding: "3px 12px", fontSize: 12, color: "#e10600", fontWeight: 700 }}>
            {assignedCount}/22
          </div>
          {!isMobile && (
            <div style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 20, padding: "3px 12px", fontSize: 12, color: "#4ade80", fontWeight: 700 }}>
              {freeCount} disponibili
            </div>
          )}
          {/* Last assigned toast inline */}
          {lastAssigned && !isMobile && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 20, padding: "3px 14px", fontSize: 12 }}>
              <span style={{ color: "#4ade80", fontWeight: 700 }}>{lastAssigned.pilotName}</span>
              <span style={{ color: "#555" }}>→</span>
              <span style={{ color: "#fff", fontWeight: 600 }}>{lastAssigned.teamName}</span>
              <span style={{ fontFamily: "'Orbitron', monospace", color: "#e10600", fontWeight: 900 }}>{lastAssigned.price}M</span>
              <button onClick={() => setLastAssigned(null)} style={{ background: "none", border: "none", color: "#444", cursor: "pointer", fontSize: 13, padding: "0 0 0 4px" }}>✕</button>
            </div>
          )}
        </div>
        {/* Auction control buttons */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {auction && !isClosed && (
            <button onClick={() => setShowCloseConfirm(true)} style={{
              background: "linear-gradient(135deg, #1a0000, #2a0000)",
              border: "1px solid #e10600", borderRadius: 100,
              color: "#e10600", padding: "7px 16px", cursor: "pointer",
              fontSize: 11, fontWeight: 700, letterSpacing: 1,
            }}>
              🔒 CHIUDI ASTA {auction.auctionNumber}
            </button>
          )}
          {auction && isClosed && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.3)", borderRadius: 100, padding: "5px 14px", fontSize: 11, color: "#4ade80", fontWeight: 700 }}>
                ✓ ASTA {auction.auctionNumber} CHIUSA
              </div>
              <button onClick={() => setShowOpenNext(true)} style={{
                background: "linear-gradient(135deg, #001a00, #003000)",
                border: "1px solid #4ade80", borderRadius: 100,
                color: "#4ade80", padding: "7px 16px", cursor: "pointer",
                fontSize: 11, fontWeight: 700, letterSpacing: 1,
              }}>
                ⚡ APRI ASTA {auction.auctionNumber + 1} (+{auction.budgetAdded}M)
              </button>
            </div>
          )}
          <button onClick={onClose} style={{ background: "transparent", border: "1px solid #2a2a2a", borderRadius: 100, color: "#666", padding: isMobile ? "6px 12px" : "7px 18px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
            {isMobile ? "✕" : "✕ Chiudi"}
          </button>
        </div>
      </div>

      {/* ── BANNER ASTA CHIUSA ── */}
      {isClosed && (
        <div style={{
          flexShrink: 0, background: "rgba(74,222,128,0.06)",
          borderBottom: "1px solid rgba(74,222,128,0.2)",
          padding: "10px 24px", display: "flex", alignItems: "center", gap: 12,
        }}>
          <span style={{ fontSize: 18 }}>🔒</span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#4ade80", letterSpacing: 1 }}>
              ASTA {auction.auctionNumber} CHIUSA — SOLA LETTURA
            </div>
            <div style={{ fontSize: 11, color: "#555", marginTop: 1 }}>
              Per modificare le rose aprire l&apos;asta successiva (+{auction.budgetAdded}M a ogni squadra)
            </div>
          </div>
        </div>
      )}

      {/* ── BODY ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* ── LEFT: PILOT LIST ── */}
        {(!isMobile || mobileTab === 'piloti') && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", borderRight: isMobile ? "none" : "1px solid #141414" }}>

            {/* Number input + assignment panel — sticky top */}
            <div style={{ flexShrink: 0, background: "#0c0c0c", borderBottom: "1px solid #141414", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
              {/* Pilot selector row */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {/* Extract button */}
                <button
                  onClick={extractPilot}
                  disabled={extracting || pilots.filter(p => !p.owner).length === 0}
                  title="Estrai pilota casuale"
                  style={{
                    flexShrink: 0,
                    background: extracting
                      ? "linear-gradient(135deg, #ff6b00, #e10600)"
                      : "linear-gradient(135deg, #1a1a1a, #222)",
                    border: `1px solid ${extracting ? "#e10600" : "#333"}`,
                    borderRadius: 8, color: extracting ? "#fff" : "#888",
                    padding: "8px 12px", cursor: extracting ? "not-allowed" : "pointer",
                    fontSize: 16, lineHeight: 1,
                    boxShadow: extracting ? "0 0 16px rgba(225,6,0,0.6)" : "none",
                    animation: extracting ? "extractPulse 0.4s ease-in-out infinite alternate" : "none",
                    transition: "box-shadow 0.2s, border-color 0.2s",
                  }}
                >
                  🎲
                </button>
                <span style={{ fontSize: 11, color: "#555", letterSpacing: 1, whiteSpace: "nowrap" }}>PILOTA N°</span>
                <input
                  ref={spotInputRef}
                  type="number" min="1" max="22" value={spotNum}
                  onChange={e => {
                    const v = e.target.value;
                    if (v === '' || (parseInt(v) >= 1 && parseInt(v) <= 22)) {
                      setSpotNum(v); setAssignTeam(''); setAssignPrice('');
                    }
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && spotPilot && !spotPilot.owner) document.getElementById('price-input')?.focus();
                  }}
                  placeholder="1–22"
                  style={{
                    background: "#1a1a1a", border: validSpot ? "2px solid #e10600" : "1px solid #2a2a2a",
                    borderRadius: 8, color: "#fff", padding: "7px 10px",
                    fontSize: 24, fontFamily: "'Orbitron', monospace", fontWeight: 900,
                    width: 72, textAlign: "center",
                  }}
                />
                {spotPilot ? (
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10, color: "#555", letterSpacing: 1 }}>{spotPilot.team}</div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 7 }}>
                      <span style={{ fontFamily: "'Orbitron', monospace", fontSize: 16, fontWeight: 900, color: spotPilot.owner ? "#444" : "#e10600", letterSpacing: 1 }}>
                        {spotPilot.abbreviation}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: spotPilot.owner ? "#444" : "#ccc", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {spotPilot.name}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div style={{ flex: 1, fontSize: 13, color: "#333" }}>
                    {isMobile ? "oppure seleziona dalla lista →" : "Digita il numero o clicca un pilota dalla lista"}
                  </div>
                )}
                {spotPilot && (
                  <button onClick={() => { setSpotNum(''); setAssignTeam(''); setAssignPrice(''); }} style={{ background: "none", border: "1px solid #2a2a2a", borderRadius: 6, color: "#555", cursor: "pointer", fontSize: 12, padding: "4px 10px" }}>✕</button>
                )}
              </div>
              {/* Assignment panel (shows only when pilot selected) */}
              {AssignmentPanel}
            </div>

            {/* Pilot scrollable list */}
            <div ref={pilotListRef} style={{ flex: 1, overflowY: "auto", background: "#0a0a0a" }}>
              <div style={{ padding: "5px 12px", fontSize: 9, letterSpacing: 2, color: "#444", textTransform: "uppercase", borderBottom: "1px solid #111", position: "sticky", top: 0, background: "#0a0a0a", zIndex: 1 }}>
                Lista piloti
              </div>
              {pilots.map((p, i) => {
                const isAssigned    = !!p.owner;
                const isHighlighted = spotIndex === i + 1;
                const teamColor     = F1_TEAM_COLORS[p.team] || "#666";
                return (
                  <div
                    key={p.id}
                    data-idx={i + 1}
                    onClick={() => {
                      setSpotNum(String(i + 1));
                      setAssignTeam(''); setAssignPrice('');
                      if (isMobile) setMobileTab('piloti');
                    }}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "3px 12px",
                      background: isHighlighted ? "rgba(225,6,0,0.12)" : "transparent",
                      borderLeft: isHighlighted ? "3px solid #e10600" : "3px solid transparent",
                      borderBottom: "1px solid #0d0d0d",
                      cursor: "pointer", transition: "background 0.1s",
                      minHeight: 28,
                    }}
                  >
                    {/* Number */}
                    <span style={{ fontFamily: "'Orbitron', monospace", fontSize: 9, fontWeight: 700, color: isHighlighted ? "#e10600" : "#333", width: 18, textAlign: "right", flexShrink: 0 }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    {/* Team color bar */}
                    <div style={{ width: 2, height: 16, borderRadius: 1, background: teamColor, flexShrink: 0 }}/>
                    {/* Abbreviation */}
                    <span style={{ fontFamily: "'Orbitron', monospace", fontSize: 11, fontWeight: 900, color: isAssigned ? "#2a2a2a" : isHighlighted ? "#e10600" : "#777", letterSpacing: 0.5, width: 30, flexShrink: 0 }}>
                      {p.abbreviation}
                    </span>
                    {/* Name + team inline */}
                    <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: isAssigned ? "#333" : "#bbb", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {p.name}
                    </span>
                    <span style={{ fontSize: 9, color: isAssigned ? "#252525" : "#3a3a3a", flexShrink: 0, whiteSpace: "nowrap" }}>
                      {p.team.replace('Red Bull Racing','RBR').replace('Racing Bulls','RB').replace('Aston Martin','AM')}
                    </span>
                    {/* Status dot */}
                    {isAssigned ? (
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#252525", flexShrink: 0 }}/>
                    ) : (
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", flexShrink: 0, boxShadow: "0 0 4px #4ade8088" }}/>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── RIGHT: TEAMS (sorted by budget desc) ── */}
        {(!isMobile || mobileTab === 'squadre') && (
          <div style={{ width: isMobile ? "100%" : 320, flexShrink: 0, borderLeft: isMobile ? "none" : "1px solid #141414", overflowY: "auto", background: "#090909" }}>
            <div style={{ padding: "10px 16px", fontSize: 11, letterSpacing: 2, color: "#555", textTransform: "uppercase", borderBottom: "1px solid #111", position: "sticky", top: 0, background: "#090909", zIndex: 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Squadre</span>
              <span style={{ fontSize: 10, color: "#333" }}>↓ budget</span>
            </div>
            {(() => {
              const maxPrice = Math.max(1, ...pilots.filter(p => p.owner && p.price > 0).map(p => p.price));
              return sortedTeams.map(t => {
                const teamPilots  = pilots.filter(p => p.owner === t.id);
                const budgetPct   = Math.min(100, (t.budget / 100) * 100);
                const budgetColor = t.budget >= 50 ? "#4ade80" : t.budget >= 20 ? "#facc15" : "#e10600";
                return (
                  <div key={t.id} style={{ padding: "5px 10px", borderBottom: "1px solid #0f0f0f" }}>
                    {/* Team header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                      <div style={{ fontWeight: 700, fontSize: 12, color: "#e8e8e8" }}>{t.name}</div>
                      <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 12, fontWeight: 900, color: budgetColor }}>
                        {t.budget}M
                      </div>
                    </div>
                    {/* Budget bar */}
                    <div style={{ height: 1, background: "#1a1a1a", borderRadius: 1, marginBottom: teamPilots.length > 0 ? 3 : 0 }}>
                      <div style={{ height: "100%", borderRadius: 1, background: budgetColor, width: `${budgetPct}%`, transition: "width 0.4s" }}/>
                    </div>
                    {/* Assigned pilots */}
                    {teamPilots.length > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                        {[...teamPilots].sort((a, b) => b.price - a.price).map(p => {
                          const color    = F1_TEAM_COLORS[p.team] || "#666";
                          const pricePct = Math.round((p.price / maxPrice) * 100);
                          return (
                            <div key={p.id} style={{ borderRadius: 3, padding: "2px 5px" }}>
                              {/* Row: color bar | abbrev | price bar | price | ✕ */}
                              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                <div style={{ width: 2, height: 12, borderRadius: 1, background: color, flexShrink: 0 }}/>
                                <span style={{ fontFamily: "'Orbitron', monospace", fontWeight: 700, fontSize: 10, color: "#e0e0e0", letterSpacing: 0.5, width: 28, flexShrink: 0 }}>
                                  {p.abbreviation || p.name.split(' ').pop().slice(0, 3).toUpperCase()}
                                </span>
                                {/* Inline price bar */}
                                <div style={{ flex: 1, height: 2, background: "#1c1c1c", borderRadius: 1 }}>
                                  <div style={{ height: "100%", borderRadius: 1, background: color, width: `${pricePct}%`, opacity: 0.8, transition: "width 0.5s" }}/>
                                </div>
                                <span style={{ fontSize: 9, color: "#555", fontFamily: "'Orbitron', monospace", fontWeight: 700, flexShrink: 0 }}>{p.price}M</span>
                                <button onClick={() => setConfirmRelease(p.id)} title="Rilascia"
                                  style={{ background: "none", border: "none", color: "#2a2a2a", cursor: "pointer", fontSize: 10, padding: "0", lineHeight: 1, transition: "color 0.15s", flexShrink: 0 }}
                                  onMouseEnter={e => e.target.style.color = "#ff4444"}
                                  onMouseLeave={e => e.target.style.color = "#2a2a2a"}
                                >✕</button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        )}
      </div>

      {/* ── BOTTOM TABS (mobile only) ── */}
      {isMobile && (
        <div style={{ display: "flex", borderTop: "1px solid #1a1a1a", background: "#0a0a0a", flexShrink: 0 }}>
          {[{ id: 'piloti', label: 'Piloti' }, { id: 'squadre', label: 'Squadre' }].map(tab => (
            <button key={tab.id} onClick={() => setMobileTab(tab.id)} style={{
              flex: 1, padding: "14px 8px",
              background: mobileTab === tab.id ? "rgba(225,6,0,0.12)" : "transparent",
              border: "none",
              borderTop: mobileTab === tab.id ? "2px solid #e10600" : "2px solid transparent",
              color: mobileTab === tab.id ? "#e10600" : "#555",
              cursor: "pointer", fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1,
            }}>
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* ── MODAL: CHIUDI ASTA ── */}
      {showCloseConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#111", border: "1px solid #e10600", borderRadius: 16, padding: 28, width: 360, maxWidth: "calc(100vw - 32px)" }}>
            <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 16, fontWeight: 900, color: "#e10600", marginBottom: 8 }}>🔒 CHIUDI ASTA {auction?.auctionNumber}?</div>
            <div style={{ fontSize: 12, color: "#aaa", marginBottom: 16, lineHeight: 1.6 }}>
              L&apos;asta verrà marcata come <strong style={{ color: "#fff" }}>chiusa</strong>. La rosa attuale di ogni squadra viene preservata come dato ufficiale.<br/><br/>
              Potrai riaprire l&apos;asta successiva in qualsiasi momento (ogni squadra riceverà <strong style={{ color: "#4ade80" }}>+{auction?.budgetAdded ?? 100}M</strong>).
            </div>
            <div style={{ fontSize: 11, color: "#555", marginBottom: 20, background: "#0a0a0a", borderRadius: 8, padding: "10px 12px" }}>
              {teams.map(t => {
                const tPilots = pilots.filter(p => p.owner === t.id);
                return (
                  <div key={t.id} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ color: "#888" }}>{t.name}</span>
                    <span style={{ color: "#4ade80", fontFamily: "'Orbitron', monospace", fontSize: 10 }}>{tPilots.length} piloti · {t.budget}M</span>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowCloseConfirm(false)} style={{ flex: 1, background: "transparent", border: "1px solid #333", borderRadius: 10, color: "#666", padding: "12px 0", cursor: "pointer", fontSize: 13 }}>
                Annulla
              </button>
              <button onClick={handleCloseAuction} disabled={auctionBusy} style={{ flex: 1, background: "linear-gradient(135deg, #e10600, #a00)", border: "none", borderRadius: 10, color: "#fff", padding: "12px 0", cursor: auctionBusy ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 700, opacity: auctionBusy ? 0.6 : 1 }}>
                {auctionBusy ? "Chiusura…" : "✓ CONFERMA CHIUSURA"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: APRI ASTA SUCCESSIVA ── */}
      {showOpenNext && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#111", border: "1px solid #4ade80", borderRadius: 16, padding: 28, width: 360, maxWidth: "calc(100vw - 32px)" }}>
            <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 16, fontWeight: 900, color: "#4ade80", marginBottom: 8 }}>⚡ APRI ASTA {(auction?.auctionNumber ?? 0) + 1}</div>
            <div style={{ fontSize: 12, color: "#aaa", marginBottom: 16, lineHeight: 1.6 }}>
              Ogni squadra riceverà <strong style={{ color: "#4ade80" }}>+{auction?.budgetAdded ?? 100}M</strong> di FantaMilioni aggiuntivi. I piloti in rosa restano invariati.
            </div>
            <div style={{ fontSize: 11, color: "#555", marginBottom: 20, background: "#0a0a0a", borderRadius: 8, padding: "10px 12px" }}>
              {teams.map(t => (
                <div key={t.id} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ color: "#888" }}>{t.name}</span>
                  <span style={{ color: "#555", fontFamily: "'Orbitron', monospace", fontSize: 10 }}>
                    {t.budget}M → <strong style={{ color: "#4ade80" }}>{t.budget + (auction?.budgetAdded ?? 100)}M</strong>
                  </span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowOpenNext(false)} style={{ flex: 1, background: "transparent", border: "1px solid #333", borderRadius: 10, color: "#666", padding: "12px 0", cursor: "pointer", fontSize: 13 }}>
                Annulla
              </button>
              <button onClick={handleOpenNextAuction} disabled={auctionBusy} style={{ flex: 1, background: "linear-gradient(135deg, #003300, #004400)", border: "1px solid #4ade80", borderRadius: 10, color: "#4ade80", padding: "12px 0", cursor: auctionBusy ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 700, opacity: auctionBusy ? 0.6 : 1 }}>
                {auctionBusy ? "Apertura…" : "⚡ CONFERMA APERTURA"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIRM RELEASE MODAL ── */}
      {confirmRelease && (() => {
        const p     = pilots.find(x => x.id === confirmRelease);
        const owner = p ? teams.find(t => t.id === p.owner) : null;
        return (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ background: "#141414", border: "1px solid #2a2a2a", borderRadius: 16, padding: 28, width: 300, maxWidth: "calc(100vw - 32px)", textAlign: "center" }}>
              <div style={{ fontSize: 14, marginBottom: 8 }}>Rilascia pilota?</div>
              <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>{p?.name}</div>
              <div style={{ fontSize: 12, color: "#666", marginBottom: 20 }}>
                da {owner?.name} · restituisce {p?.price}M al budget
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setConfirmRelease(null)} style={{ flex: 1, background: "transparent", border: "1px solid #2a2a2a", borderRadius: 8, color: "#888", padding: "11px 0", cursor: "pointer", fontSize: 13 }}>
                  Annulla
                </button>
                <button onClick={() => releasePilot(confirmRelease)} style={{ flex: 1, background: "#e10600", border: "none", borderRadius: 8, color: "#fff", padding: "11px 0", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
                  Rilascia
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
