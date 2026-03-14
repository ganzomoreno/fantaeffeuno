'use client';

import { useState } from 'react';

import { supabase } from '@/lib/supabase';

export default function LoginPage({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Inserisci email e password.');
      return;
    }
    
    setIsLoading(true);
    setError('');

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;
      
      if (data.session) {
        onLoginSuccess(data.session);
      }
    } catch (err) {
      console.error('Login error:', err);
      // Mostriamo l'errore esatto di Supabase per facilitare il debug
      setError(`Errore: ${err.message || 'Credenziali non valide o errore di rete'}`);
    } finally {
      setIsLoading(false);
    }
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

        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email fanta-manager"
            value={email}
            onChange={e => { setEmail(e.target.value); setError(''); }}
            style={{
              width: "100%",
              background: "#1e1e1e",
              border: error ? "1px solid #e10600" : "1px solid #333",
              borderRadius: 10,
              color: "#e8e8e8",
              padding: "14px 16px",
              fontSize: 14,
              fontFamily: "'Titillium Web', sans-serif",
              marginBottom: 12,
              outline: "none"
            }}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(''); }}
            style={{
              width: "100%",
              background: "#1e1e1e",
              border: error ? "1px solid #e10600" : "1px solid #333",
              borderRadius: 10,
              color: "#e8e8e8",
              padding: "14px 16px",
              fontSize: 14,
              fontFamily: "'Titillium Web', sans-serif",
              marginBottom: 16,
              outline: "none"
            }}
          />

          {error && (
            <div style={{ fontSize: 12, color: "#e10600", marginBottom: 12 }}>{error}</div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: "100%",
              background: isLoading ? "#555" : "linear-gradient(135deg, #e10600, #a00)",
              border: "none",
              borderRadius: 10,
              color: "#fff",
              padding: "14px 0",
              fontSize: 14,
              fontWeight: 700,
              fontFamily: "'Orbitron', monospace",
              letterSpacing: 2,
              textTransform: "uppercase",
              cursor: isLoading ? "not-allowed" : "pointer",
              transition: "opacity 0.2s",
            }}
            onMouseEnter={e => { if(!isLoading) e.target.style.opacity = "0.85" }}
            onMouseLeave={e => { if(!isLoading) e.target.style.opacity = "1" }}
          >
            {isLoading ? "ACCESSO..." : "Entra →"}
          </button>
        </form>
      </div>


    </div>
  );
}
