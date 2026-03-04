'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import GestioneAste from '@/components/GestioneAste';
import * as db from '@/lib/db';

export default function AstaPage() {
  const router = useRouter();
  const [teams, setTeams]     = useState([]);
  const [pilots, setPilots]   = useState([]);
  const [auction, setAuction] = useState(undefined); // undefined = loading
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [t, p, a] = await Promise.all([
        db.fetchTeams(), db.fetchPilots(), db.fetchCurrentAuction(),
      ]);
      setTeams(t); setPilots(p); setAuction(a);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div style={{
        position: "fixed", inset: 0, background: "#070707",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'Orbitron', monospace", color: "#e10600", fontSize: 14, letterSpacing: 3,
      }}>
        CARICAMENTO…
      </div>
    );
  }

  return (
    <GestioneAste
      teams={teams}
      pilots={pilots}
      auction={auction}
      onRefresh={load}
      onClose={() => router.push('/')}
    />
  );
}
