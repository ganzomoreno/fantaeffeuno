'use client';

import { useState } from 'react';

export default function LoginPage({ teams, onLogin }) {
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [error, setError] = useState('');

  const handleLogin = () => {
    if (!selectedTeamId) {
      setError('Seleziona la tua squadra per continuare.');
      return;
    }
    const team = teams.find(t => t.id === selectedTeamId);
    onLogin(team);
  };

  return (
    <div style={{
      fontFamily: "'Titillium Web', 'Segoe UI', sans-serif",
      background: "#0a0a0a",
      color: "#e8e8e8",
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    }}>
      {/* Logo area */}
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <div style={{
          display: "inline-block",
          background: "linear-gradient(135deg, #e10600 0%, #900 60%, #1e1e1e 100%)",
          borderRadius: 16,
          padding: "24px 40px",
          marginBottom: 20,
          position: "relative",
          overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", top: 0, right: 0, width: 120, height: "100%",
            background: "repeating-linear-gradient(90deg, transparent, transparent 10px, rgba(255,255,255,0.05) 10px, rgba(255,255,255,0.05) 12px)",
            pointerEvents: "none",
          }}/>
          <h1 style={{
            fontFamily: "'Orbitron', monospace",
            fontSize: 36,
            fontWeight: 900,
            margin: 0,
            letterSpacing: 3,
            textTransform: "uppercase",
            textShadow: "0 2px 20px rgba(225,6,0,0.5)",
          }}>
            FANTA<span style={{ color: "#fff", opacity: 0.6 }}>F1</span>
          </h1>
        </div>
        <p style={{
          margin: 0,
          fontSize: 11,
          opacity: 0.4,
          letterSpacing: 4,
          textTransform: "uppercase",
        }}>
          2026 Season — Accesso Squadra
        </p>
      </div>

      {/* Login card */}
      <div style={{
        background: "#141414",
        border: "1px solid #2a2a2a",
        borderRadius: 16,
        padding: 32,
        width: "100%",
        maxWidth: 400,
      }}>
        <div style={{
          fontSize: 13,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: 2,
          color: "#e10600",
          marginBottom: 20,
        }}>
          Seleziona la tua squadra
        </div>

        <select
          value={selectedTeamId}
          onChange={e => { setSelectedTeamId(e.target.value); setError(''); }}
          style={{
            width: "100%",
            background: "#1e1e1e",
            border: error ? "1px solid #e10600" : "1px solid #333",
            borderRadius: 10,
            color: selectedTeamId ? "#e8e8e8" : "#555",
            padding: "14px 16px",
            fontSize: 14,
            fontFamily: "'Titillium Web', sans-serif",
            cursor: "pointer",
            marginBottom: 8,
            appearance: "none",
            WebkitAppearance: "none",
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 14px center",
            paddingRight: 40,
          }}
        >
          <option value="" disabled style={{ color: "#555" }}>— Scegli il tuo team —</option>
          {teams.map(t => (
            <option key={t.id} value={t.id} style={{ color: "#e8e8e8", background: "#1e1e1e" }}>
              {t.name}  ({t.owner})
            </option>
          ))}
        </select>

        {error && (
          <div style={{ fontSize: 12, color: "#e10600", marginBottom: 12 }}>{error}</div>
        )}

        {selectedTeamId && (
          <div style={{
            background: "rgba(225,6,0,0.08)",
            border: "1px solid rgba(225,6,0,0.2)",
            borderRadius: 8,
            padding: "10px 14px",
            marginBottom: 16,
            fontSize: 12,
            color: "#ccc",
          }}>
            {(() => {
              const t = teams.find(t => t.id === selectedTeamId);
              return t ? <>Owner: <strong style={{ color: "#fff" }}>{t.owner}</strong>{t.isAdmin && <span style={{ marginLeft: 8, background: "#e10600", borderRadius: 4, padding: "2px 6px", fontSize: 10, fontWeight: 700 }}>ADMIN</span>}</> : null;
            })()}
          </div>
        )}

        <button
          onClick={handleLogin}
          style={{
            width: "100%",
            background: "linear-gradient(135deg, #e10600, #a00)",
            border: "none",
            borderRadius: 10,
            color: "#fff",
            padding: "14px 0",
            fontSize: 14,
            fontWeight: 700,
            fontFamily: "'Orbitron', monospace",
            letterSpacing: 2,
            textTransform: "uppercase",
            cursor: "pointer",
            transition: "opacity 0.2s",
          }}
          onMouseEnter={e => e.target.style.opacity = "0.85"}
          onMouseLeave={e => e.target.style.opacity = "1"}
        >
          Entra →
        </button>
      </div>

      {/* Participants list */}
      <div style={{
        marginTop: 32,
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        justifyContent: "center",
        maxWidth: 400,
      }}>
        {teams.map(t => (
          <button
            key={t.id}
            onClick={() => { setSelectedTeamId(t.id); setError(''); }}
            style={{
              background: selectedTeamId === t.id ? "rgba(225,6,0,0.2)" : "rgba(255,255,255,0.04)",
              border: selectedTeamId === t.id ? "1px solid #e10600" : "1px solid #222",
              borderRadius: 20,
              color: selectedTeamId === t.id ? "#e10600" : "#666",
              padding: "6px 14px",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {t.name}
          </button>
        ))}
      </div>
    </div>
  );
}
