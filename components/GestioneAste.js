'use client';

import { useState, useRef, useEffect } from 'react';
import { F1_TEAM_COLORS } from '@/lib/data';
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
    <div style={{
      position: "fixed", inset: 0, background: "#050505", zIndex: 2000,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        fontFamily: "'Orbitron', monospace", fontSize: 11, letterSpacing: 6,
        color: "#e10600", textTransform: "uppercase", marginBottom: 8, opacity: 0.8,
      }}>
        Area Riservata
      </div>
      <div style={{
        fontFamily: "'Orbitron', monospace", fontSize: 32, fontWeight: 900,
        color: "#fff", marginBottom: 4, letterSpacing: 2,
      }}>
        ASTA LIVE
      </div>
      <div style={{ fontSize: 12, color: "#555", marginBottom: 40, letterSpacing: 3 }}>
        2026 Season
      </div>
      <div style={{
        background: "#111", border: "1px solid #222", borderRadius: 16,
        padding: 32, width: 320, maxWidth: "calc(100vw - 32px)",
      }}>
        <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 2, marginBottom: 12 }}>
          Password Admin
        </div>
        <input
          ref={inputRef}
          type="password"
          value={pw}
          onChange={e => { setPw(e.target.value); setError(''); }}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="••••"
          style={{
            width: "100%", background: "#1a1a1a",
            border: error ? "1px solid #e10600" : "1px solid #2a2a2a",
            borderRadius: 10, color: "#fff", padding: "14px 16px",
            fontSize: 18, fontFamily: "'Orbitron', monospace",
            letterSpacing: 8, marginBottom: 8, boxSizing: "border-box",
          }}
        />
        {error && <div style={{ color: "#e10600", fontSize: 12, marginBottom: 8 }}>{error}</div>}
        <button onClick={submit} style={{
          width: "100%", background: "linear-gradient(135deg, #e10600, #a00)",
          border: "none", borderRadius: 10, color: "#fff", padding: "13px 0",
          fontSize: 13, fontWeight: 700, fontFamily: "'Orbitron', monospace",
          letterSpacing: 2, textTransform: "uppercase", cursor: "pointer", marginBottom: 12,
        }}>
          Accedi
        </button>
        <button onClick={onClose} style={{
          width: "100%", background: "transparent", border: "1px solid #222",
          borderRadius: 10, color: "#555", padding: "10px 0", fontSize: 12, cursor: "pointer",
        }}>
          Annulla
        </button>
      </div>
    </div>
  );
}

// ─── MAIN AUCTION PAGE ────────────────────────────────────────────────────────
export default function GestioneAste({ teams, pilots, onRefresh, onClose }) {
  const [authed, setAuthed] = useState(false);
  const [spotNum, setSpotNum] = useState('');
  const [assignTeam, setAssignTeam] = useState('');
  const [assignPrice, setAssignPrice] = useState('');
  const [lastAssigned, setLastAssigned] = useState(null);
  const [confirmRelease, setConfirmRelease] = useState(null);
  const [busy, setBusy] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileTab, setMobileTab] = useState('asta');
  const spotInputRef = useRef(null);
  const pilotListRef = useRef(null);

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
      setSpotNum('');
      setAssignTeam('');
      setAssignPrice('');
      await onRefresh();
      setTimeout(() => spotInputRef.current?.focus(), 50);
    } catch(e) { alert("Errore: " + e.message); }
    setBusy(false);
  };

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
  const freeCount = 22 - assignedCount;

  if (!authed) {
    return <PasswordScreen onAuth={() => setAuthed(true)} onClose={onClose} />;
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "#070707", zIndex: 2000,
      display: "flex", flexDirection: "column", fontFamily: "'Titillium Web', sans-serif",
      color: "#e8e8e8", overflow: "hidden",
    }}>

      {/* ── HEADER ── */}
      <div style={{
        background: "linear-gradient(90deg, #0d0d0d 0%, #1a0000 50%, #0d0d0d 100%)",
        borderBottom: "1px solid #1f1f1f",
        padding: isMobile ? "8px 14px" : "10px 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexShrink: 0, gap: 8,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 16 }}>
          <div style={{
            fontFamily: "'Orbitron', monospace", fontSize: isMobile ? 15 : 20, fontWeight: 900,
            color: "#e10600", letterSpacing: 2,
          }}>
            ASTA LIVE
            <span style={{ fontSize: 10, color: "#555", fontWeight: 400, marginLeft: 8, letterSpacing: 3 }}>
              2026
            </span>
          </div>
          <div style={{
            background: "rgba(225,6,0,0.1)", border: "1px solid rgba(225,6,0,0.25)",
            borderRadius: 20, padding: "3px 10px", fontSize: 11, color: "#e10600", fontWeight: 700,
          }}>
            {assignedCount}/22
          </div>
          {!isMobile && (
            <div style={{
              background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)",
              borderRadius: 20, padding: "3px 12px", fontSize: 11, color: "#4ade80", fontWeight: 700,
            }}>
              {freeCount} disponibili
            </div>
          )}
        </div>
        <button onClick={onClose} style={{
          background: "transparent", border: "1px solid #2a2a2a", borderRadius: 8,
          color: "#666", padding: isMobile ? "6px 12px" : "7px 16px", cursor: "pointer",
          fontSize: 12, fontWeight: 600,
        }}>
          {isMobile ? "✕" : "✕ Chiudi"}
        </button>
      </div>

      {/* ── BODY ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* ── PILOT LIST ── */}
        {(!isMobile || mobileTab === 'piloti') && (
          <div ref={pilotListRef} style={{
            width: isMobile ? "100%" : 230,
            borderRight: isMobile ? "none" : "1px solid #141414",
            overflowY: "auto", background: "#0a0a0a", flexShrink: 0,
          }}>
            <div style={{
              padding: "8px 12px", fontSize: 9, letterSpacing: 3, color: "#333",
              textTransform: "uppercase", borderBottom: "1px solid #111",
              position: "sticky", top: 0, background: "#0a0a0a", zIndex: 1,
            }}>
              {isMobile ? "Tocca un pilota per selezionarlo" : "Piloti"}
            </div>
            {pilots.map((p, i) => {
              const isAssigned = !!p.owner;
              const isHighlighted = spotIndex === i + 1;
              const teamColor = F1_TEAM_COLORS[p.team] || "#666";
              return (
                <div
                  key={p.id}
                  data-idx={i + 1}
                  onClick={() => {
                    setSpotNum(String(i + 1));
                    if (isMobile) setMobileTab('asta');
                  }}
                  style={{
                    display: "flex", alignItems: "center", gap: isMobile ? 8 : 6,
                    padding: isMobile ? "5px 12px" : "3px 10px",
                    background: isHighlighted ? "rgba(225,6,0,0.15)" : "transparent",
                    borderLeft: isHighlighted ? "3px solid #e10600" : "3px solid transparent",
                    borderBottom: "1px solid #0f0f0f",
                    cursor: "pointer", transition: "background 0.15s",
                  }}
                >
                  <span style={{
                    fontFamily: "'Orbitron', monospace", fontSize: 9, fontWeight: 700,
                    color: isHighlighted ? "#e10600" : "#333", width: 18, textAlign: "right", flexShrink: 0,
                  }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div style={{ width: 3, height: 16, borderRadius: 2, background: teamColor, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: isMobile ? 14 : 11, fontWeight: 700,
                      color: isAssigned ? "#444" : "#e8e8e8",
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      lineHeight: 1.1,
                    }}>
                      {p.name}
                    </div>
                    <div style={{ fontSize: isMobile ? 11 : 9, color: isAssigned ? "#333" : "#555", lineHeight: 1.0 }}>
                      {p.team}
                    </div>
                  </div>
                  {isAssigned ? (
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#2a2a2a", flexShrink: 0 }} />
                  ) : (
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ade80", flexShrink: 0, boxShadow: "0 0 4px #4ade80" }} />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── CENTER: SPOTLIGHT + FORM ── */}
        {(!isMobile || mobileTab === 'asta') && (
          <div style={{
            flex: isMobile ? undefined : 1,
            width: isMobile ? "100%" : undefined,
            display: "flex", flexDirection: "column",
            padding: isMobile ? "14px 16px" : "20px 24px",
            overflowY: "auto", gap: 14,
          }}>

            {/* Number picker */}
            <div style={{
              background: "#0f0f0f", border: "1px solid #1a1a1a",
              borderRadius: 12, padding: "12px 16px",
              display: "flex", alignItems: "center", gap: 12,
            }}>
              <span style={{ fontSize: 11, color: "#555", letterSpacing: 1, whiteSpace: "nowrap" }}>
                PILOTA N°
              </span>
              <input
                ref={spotInputRef}
                type="number"
                min="1"
                max="22"
                value={spotNum}
                onChange={e => {
                  const v = e.target.value;
                  if (v === '' || (parseInt(v) >= 1 && parseInt(v) <= 22)) setSpotNum(v);
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && spotPilot && !spotPilot.owner) {
                    document.getElementById('price-input')?.focus();
                  }
                }}
                placeholder="1–22"
                style={{
                  background: "#1a1a1a",
                  border: validSpot ? "2px solid #e10600" : "1px solid #2a2a2a",
                  borderRadius: 8, color: "#fff",
                  padding: "8px 12px", fontSize: 28,
                  fontFamily: "'Orbitron', monospace", fontWeight: 900,
                  width: 80, textAlign: "center",
                }}
              />
              {spotPilot ? (
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, color: "#555", letterSpacing: 1 }}>{spotPilot.team}</div>
                  <div style={{
                    fontSize: isMobile ? 18 : 22, fontWeight: 700,
                    color: spotPilot.owner ? "#444" : "#fff",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>
                    {spotPilot.name}
                  </div>
                </div>
              ) : (
                <div style={{ flex: 1, fontSize: 12, color: "#333" }}>
                  {isMobile ? "oppure vai su Piloti →" : "Inserisci il numero del pilota"}
                </div>
              )}
            </div>

            {/* Spotlight card */}
            {spotPilot && (() => {
              const teamColor = F1_TEAM_COLORS[spotPilot.team] || "#e10600";
              const isAssigned = !!spotPilot.owner;
              const ownerTeam = isAssigned ? teams.find(t => t.id === spotPilot.owner) : null;
              return (
                <div style={{
                  borderRadius: 14,
                  background: `linear-gradient(135deg, #111 0%, ${teamColor}18 100%)`,
                  border: `1px solid ${teamColor}40`,
                  padding: isMobile ? "16px" : "20px 24px",
                  position: "relative", overflow: "hidden",
                }}>
                  <div style={{
                    position: "absolute", right: 20, top: 16,
                    fontFamily: "'Orbitron', monospace", fontSize: 80, fontWeight: 900,
                    color: teamColor, opacity: 0.07, lineHeight: 1, userSelect: "none",
                  }}>
                    {String(spotIndex).padStart(2, '0')}
                  </div>
                  <div style={{ position: "relative" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                      <div style={{ width: 4, height: 40, borderRadius: 2, background: teamColor, flexShrink: 0 }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{
                          fontFamily: "'Orbitron', monospace", fontSize: 9,
                          color: teamColor, letterSpacing: 3, textTransform: "uppercase", marginBottom: 4,
                        }}>
                          {spotPilot.team}
                        </div>
                        <div style={{
                          fontSize: isMobile ? 22 : 28, fontWeight: 900, lineHeight: 1,
                          color: isAssigned ? "#555" : "#fff",
                        }}>
                          {spotPilot.name}
                        </div>
                      </div>
                    </div>

                    {isAssigned ? (
                      <div style={{
                        display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
                        background: "rgba(0,0,0,0.3)", borderRadius: 10, padding: "12px 16px",
                      }}>
                        <span style={{ fontSize: 12, color: "#555" }}>Aggiudicato a</span>
                        <span style={{ fontWeight: 700, color: "#e8e8e8" }}>{ownerTeam?.name}</span>
                        <span style={{
                          fontFamily: "'Orbitron', monospace", fontWeight: 900,
                          color: "#e10600", fontSize: 16,
                        }}>
                          {spotPilot.price}M
                        </span>
                        <button
                          onClick={() => setConfirmRelease(spotPilot.id)}
                          style={{
                            marginLeft: "auto", background: "transparent",
                            border: "1px solid #3a1a1a", borderRadius: 6,
                            color: "#ff4444", padding: "6px 14px",
                            fontSize: 12, cursor: "pointer", fontWeight: 600,
                          }}
                        >
                          Rilascia
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <div>
                          <div style={{ fontSize: 10, color: "#555", letterSpacing: 1, marginBottom: 6 }}>
                            SQUADRA AGGIUDICATARIA
                          </div>
                          <select
                            value={assignTeam}
                            onChange={e => setAssignTeam(e.target.value)}
                            style={{
                              width: "100%", background: "#1a1a1a",
                              border: "1px solid #2a2a2a", borderRadius: 8,
                              color: assignTeam ? "#fff" : "#555",
                              padding: "11px 12px", fontSize: 14,
                              fontFamily: "'Titillium Web', sans-serif",
                            }}
                          >
                            <option value="">— Seleziona squadra —</option>
                            {teams.map(t => (
                              <option key={t.id} value={t.id}>
                                {t.name}  ({t.budget}M)
                              </option>
                            ))}
                          </select>
                        </div>
                        <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 10, color: "#555", letterSpacing: 1, marginBottom: 6 }}>
                              PREZZO (FM)
                            </div>
                            <input
                              id="price-input"
                              type="number"
                              min="1"
                              value={assignPrice}
                              onChange={e => setAssignPrice(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && assignPilot()}
                              placeholder="1"
                              style={{
                                width: "100%", background: "#1a1a1a",
                                border: "1px solid #2a2a2a", borderRadius: 8,
                                color: "#fff", padding: "11px 12px", fontSize: 18,
                                fontFamily: "'Orbitron', monospace", fontWeight: 700,
                                boxSizing: "border-box",
                              }}
                            />
                          </div>
                          <button
                            onClick={assignPilot}
                            disabled={!assignTeam || !assignPrice || busy}
                            style={{
                              background: assignTeam && assignPrice
                                ? `linear-gradient(135deg, ${teamColor}, ${teamColor}99)`
                                : "#1a1a1a",
                              border: "none", borderRadius: 10, color: "#fff",
                              padding: "11px 20px", fontSize: 13, fontWeight: 700,
                              fontFamily: "'Orbitron', monospace", letterSpacing: 1,
                              textTransform: "uppercase",
                              cursor: assignTeam && assignPrice ? "pointer" : "not-allowed",
                              opacity: assignTeam && assignPrice ? 1 : 0.4,
                              whiteSpace: "nowrap", transition: "all 0.15s",
                              flexShrink: 0,
                            }}
                          >
                            Aggiudica
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Last assigned notification */}
            {lastAssigned && (
              <div style={{
                background: "rgba(74,222,128,0.08)",
                border: "1px solid rgba(74,222,128,0.25)",
                borderRadius: 10, padding: "12px 16px",
                display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
              }}>
                <span style={{ fontSize: 13, color: "#4ade80", fontWeight: 700 }}>
                  {lastAssigned.pilotName}
                </span>
                <span style={{ fontSize: 12, color: "#555" }}>→</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>
                  {lastAssigned.teamName}
                </span>
                <span style={{
                  fontFamily: "'Orbitron', monospace", fontWeight: 900,
                  color: "#e10600", marginLeft: "auto",
                }}>
                  {lastAssigned.price}M
                </span>
                <button
                  onClick={() => setLastAssigned(null)}
                  style={{ background: "none", border: "none", color: "#333", cursor: "pointer", fontSize: 14, padding: 0 }}
                >
                  ✕
                </button>
              </div>
            )}

            {!spotPilot && (
              <div style={{
                background: "#0c0c0c", border: "1px dashed #1a1a1a",
                borderRadius: 14, padding: "40px 24px", textAlign: "center",
                color: "#222", fontSize: 13,
              }}>
                {isMobile ? "Vai su Piloti e selezionane uno" : "↑ Inserisci il numero del pilota in asta"}
              </div>
            )}
          </div>
        )}

        {/* ── RIGHT: TEAMS ── */}
        {(!isMobile || mobileTab === 'squadre') && (
          <div style={{
            width: isMobile ? "100%" : 280,
            borderLeft: isMobile ? "none" : "1px solid #141414",
            overflowY: "auto", background: "#0a0a0a", flexShrink: 0,
          }}>
            <div style={{
              padding: "8px 12px", fontSize: 9, letterSpacing: 3, color: "#333",
              textTransform: "uppercase", borderBottom: "1px solid #111",
              position: "sticky", top: 0, background: "#0a0a0a", zIndex: 1,
            }}>
              Squadre
            </div>
            {teams.map(t => {
              const teamPilots = pilots.filter(p => p.owner === t.id);
              const budgetPct = Math.min(100, (t.budget / 100) * 100);
              const budgetColor = t.budget >= 50 ? "#4ade80" : t.budget >= 20 ? "#facc15" : "#e10600";
              return (
                <div key={t.id} style={{ padding: isMobile ? "14px 16px" : "12px", borderBottom: "1px solid #0f0f0f" }}>
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <div style={{ fontSize: isMobile ? 14 : 12, fontWeight: 700, color: "#e8e8e8" }}>
                        {t.name}
                      </div>
                      <div style={{
                        fontFamily: "'Orbitron', monospace", fontSize: isMobile ? 16 : 15,
                        fontWeight: 900, color: budgetColor,
                      }}>
                        {t.budget}M
                      </div>
                    </div>
                    <div style={{ height: 3, background: "#1a1a1a", borderRadius: 2, marginTop: 6 }}>
                      <div style={{
                        height: "100%", borderRadius: 2, background: budgetColor,
                        width: `${budgetPct}%`, transition: "width 0.3s",
                      }} />
                    </div>
                    <div style={{ fontSize: 9, color: "#333", marginTop: 3 }}>
                      {t.owner} · {teamPilots.length} piloti
                    </div>
                  </div>
                  {teamPilots.length === 0 ? (
                    <div style={{ fontSize: 11, color: "#222", fontStyle: "italic" }}>Nessun pilota</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? 5 : 3 }}>
                      {teamPilots.map(p => {
                        const color = F1_TEAM_COLORS[p.team] || "#666";
                        return (
                          <div key={p.id} style={{
                            display: "flex", alignItems: "center", gap: 8,
                            background: "#111", borderRadius: 6, padding: isMobile ? "6px 10px" : "4px 8px",
                          }}>
                            <div style={{ width: 3, height: 18, borderRadius: 1, background: color, flexShrink: 0 }} />
                            <span style={{ flex: 1, fontSize: isMobile ? 13 : 11, color: "#bbb" }}>{p.name}</span>
                            <span style={{
                              fontSize: 10, color: "#555",
                              fontFamily: "'Orbitron', monospace", fontWeight: 700,
                            }}>
                              {p.price}M
                            </span>
                            <button
                              onClick={() => setConfirmRelease(p.id)}
                              title="Rilascia pilota"
                              style={{
                                background: "none", border: "none", color: "#2a2a2a",
                                cursor: "pointer", fontSize: 12, padding: "0 2px", lineHeight: 1,
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── BOTTOM TABS (mobile only) ── */}
      {isMobile && (
        <div style={{
          display: "flex", borderTop: "1px solid #1a1a1a",
          background: "#0a0a0a", flexShrink: 0,
        }}>
          {[
            { id: 'piloti',   label: 'Piloti' },
            { id: 'asta',     label: 'Asta' },
            { id: 'squadre',  label: 'Squadre' },
          ].map(tab => (
            <button key={tab.id} onClick={() => setMobileTab(tab.id)} style={{
              flex: 1, padding: "14px 8px",
              background: mobileTab === tab.id ? "rgba(225,6,0,0.12)" : "transparent",
              border: "none",
              borderTop: mobileTab === tab.id ? "2px solid #e10600" : "2px solid transparent",
              color: mobileTab === tab.id ? "#e10600" : "#555",
              cursor: "pointer", fontSize: 12, fontWeight: 700,
              textTransform: "uppercase", letterSpacing: 1,
            }}>
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* ── CONFIRM RELEASE MODAL ── */}
      {confirmRelease && (() => {
        const p = pilots.find(x => x.id === confirmRelease);
        const owner = p ? teams.find(t => t.id === p.owner) : null;
        return (
          <div style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)",
            zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <div style={{
              background: "#141414", border: "1px solid #2a2a2a",
              borderRadius: 16, padding: 28, width: 300, maxWidth: "calc(100vw - 32px)",
              textAlign: "center",
            }}>
              <div style={{ fontSize: 14, marginBottom: 8 }}>Rilascia pilota?</div>
              <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>{p?.name}</div>
              <div style={{ fontSize: 12, color: "#666", marginBottom: 16 }}>
                da {owner?.name} · restituisce {p?.price}M al budget
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => setConfirmRelease(null)}
                  style={{
                    flex: 1, background: "transparent", border: "1px solid #2a2a2a",
                    borderRadius: 8, color: "#888", padding: "10px 0", cursor: "pointer", fontSize: 13,
                  }}
                >
                  Annulla
                </button>
                <button
                  onClick={() => releasePilot(confirmRelease)}
                  style={{
                    flex: 1, background: "#e10600", border: "none",
                    borderRadius: 8, color: "#fff", padding: "10px 0",
                    cursor: "pointer", fontSize: 13, fontWeight: 700,
                  }}
                >
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
