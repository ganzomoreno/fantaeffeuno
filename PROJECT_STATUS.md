# FantaF1 2026 — Project Overview & Status

## 🏎️ Descrizione del Progetto
**FantaF1 2026** è una web application premium dedicata al fantacalcio della Formula 1 per la stagione 2026. La piattaforma permette agli utenti di vestire i panni di un Team Principal, gestendo piloti, budget e strategie di gara.

### Caratteristiche Principali:
- **Gestione Squadre**: Ogni manager gestisce una scuderia con un budget di 100M per acquistare piloti.
- **Sistema Aste**: Supporto per sessioni di asta piloti integrate.
- **Schieramento Dinamico**: Possibilità di impostare i titolari e una riserva per ogni weekend di gara.
- **Scoring Intelligente**: Calcolo automatico dei punti basato su risultati reali (Posizione, Sorpassi, Driver of the Day, DNF).
- **Supporto Sprint**: Logica dedicata per i weekend con gare Sprint (punteggi 8→1).

## 🛠️ Stack Tecnologico
- **Framework**: [Next.js 14](https://nextjs.org/) (App Router).
- **Database & Auth**: [Supabase](https://supabase.com/) (PostgreSQL con RLS).
- **Design**: Vanilla CSS con estetica "Dark Mode" premium e font *Orbitron* per un look racing.

## 📈 Ultimi Lavori (Sessione 14/03/2026)

### 1. Supporto Completo Sprint Races
Abbiamo integrato le Sprint Races in tutto lo stack tecnologico:
- **Backend**: Creata la funzione `compute_pilot_points` e il trigger associato per gestire la logica 8-1 punti senza bonus.
- **Frontend**: Aggiornati i componenti `GaraManager`, `Risultati` e `Classifica` per distinguere tra GP e Sprint.
- **Sincronizzazione**: Standardizzato l'utilizzo del flag `isSprint` tra DB e Client per evitare errori di calcolo.

### 2. Logica di Schieramento "Smart"
Migliorata la gestione delle scadenze in `Squadre.js`:
- L'app ora riconosce quando una Sprint è scaduta e sposta automaticamente il focus sulla **Gara di domenica**, evitando blocchi dell'interfaccia.
- Implementato un `parseDate` robusto per gestire correttamente i fusi orari e i formati data ISO provenienti dal Database.

### 3. Database & Migrazioni
- Creati script SQL idempotenti (v2-v5) per:
    - Inserimento calendari 2026.
    - Inserimento risultati reali Cina GP.
    - Correzione massiva dei punteggi esistenti (Recalculate Patch).

### 4. Fix UI/UX
- Aggiunti indicatori visivi ambra e asterischi per identificare immediatamente gli eventi Sprint.
- Migliorato il feedback durante il salvataggio della formazione (In corso / Successo / Errore).
- Risolto un bug critico di ricorsione nelle policy RLS della tabella `teams`.

---
*Documento generato da Antigravity per il team di sviluppo FantaF1.*
