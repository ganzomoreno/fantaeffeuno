'use client';

// ─── INLINE STYLES ───────────────────────────────────────────────────────────
export const selectStyle = {
  background: "#1a1a1a", border: "1px solid #333", borderRadius: 8,
  color: "#fff", padding: "8px 12px", fontSize: 13, width: "100%",
};

export const inputStyle = {
  background: "#1a1a1a", border: "1px solid #333", borderRadius: 8,
  color: "#fff", padding: "8px 12px", fontSize: 13,
};

export const btnPrimary = {
  background: "#e10600", border: "none", borderRadius: 8,
  color: "#fff", padding: "10px 20px", cursor: "pointer",
  fontWeight: 700, fontSize: 13, textTransform: "uppercase", letterSpacing: 1,
};

export const btnSmall = {
  background: "transparent", border: "1px solid #333", borderRadius: 6,
  color: "#aaa", padding: "4px 10px", cursor: "pointer", fontSize: 11, fontWeight: 600,
};

// ─── SECTION TITLE ───────────────────────────────────────────────────────────
export function SectionTitle({ children, sub }) {
  return (
    <h2 style={{
      fontFamily: sub ? "'Titillium Web'" : "'Orbitron', monospace",
      fontSize: sub ? 14 : 18,
      fontWeight: sub ? 700 : 900,
      textTransform: "uppercase",
      letterSpacing: sub ? 2 : 1,
      color: sub ? "#888" : "#fff",
      margin: sub ? "16px 0 8px" : "0 0 16px",
      paddingBottom: sub ? 0 : 12,
      borderBottom: sub ? "none" : "1px solid #222",
    }}>
      {children}
    </h2>
  );
}

// ─── CHIP ────────────────────────────────────────────────────────────────────
export function Chip({ label, color }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "3px 10px",
      borderRadius: 20, background: color + "22", color,
      border: `1px solid ${color}44`, letterSpacing: 0.5, whiteSpace: "nowrap",
    }}>
      {label}
    </span>
  );
}

// ─── ADMIN CARD ──────────────────────────────────────────────────────────────
export function AdminCard({ title, children }) {
  return (
    <div style={{
      background: "#161616", borderRadius: 12, padding: 16,
      marginBottom: 16, border: "1px solid #222",
    }}>
      <h3 style={{
        fontSize: 14, fontWeight: 700, marginBottom: 12,
        color: "#e10600", textTransform: "uppercase", letterSpacing: 1,
      }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

// ─── MINI INPUT ──────────────────────────────────────────────────────────────
export function MiniInput({ label, type = "text", value, onChange, width = 100 }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {label && <span style={{ fontSize: 10, opacity: 0.5, marginBottom: 2 }}>{label}</span>}
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ ...inputStyle, width, padding: "4px 8px", fontSize: 12 }}
      />
    </div>
  );
}

// ─── ICON COMPONENT ──────────────────────────────────────────────────────────
export function Icon({ type, size = 18 }) {
  const s = { width: size, height: size, display: "inline-block", verticalAlign: "middle" };
  const icons = {
    trophy: (
      <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 9H4.5a2.5 2.5 0 010-5H6m12 5h1.5a2.5 2.5 0 000-5H18M6 4h12v6a6 6 0 01-12 0V4zm3 16h6m-3-4v4" />
      </svg>
    ),
    flag: (
      <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zm0 7v-7" />
      </svg>
    ),
    users: (
      <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2m22 0v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75M8 11a4 4 0 100-8 4 4 0 000 8z" />
      </svg>
    ),
    helmet: (
      <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
      </svg>
    ),
    calendar: (
      <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    ),
    settings: (
      <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
      </svg>
    ),
    activity: (
      <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
      </svg>
    ),
  };
  return icons[type] || null;
}
