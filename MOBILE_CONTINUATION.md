# 📱 FantaF1 — Continua da Mobile

## 🚀 Quick Start (Mobile)

Apri l'**app Claude** dal tuo telefono e condividi questo contesto:

```
Progetto: FantaF1 2026
Repo: C:\Users\azani\Desktop\Vibecodingz\fantaeffeuno
Branch: master → feature/fanta-formula1-app
```

---

## 📊 Status Attuale (14/03/2026)

### ✅ Completato
- Sprint Races: logica 8-1 integrata (DB + Frontend)
- Melbourne 2026: risultati ufficiali + DOTD + Qualifying Grid
- Stat cards: layout single row + medal emoji per DOTD
- RLS ricorsione: fix critico per tabelle teams
- Parsing date: corretto per timezone ISO

### 🔄 In Corso
- Mobile UI polish (responsive design)
- Notifiche in-app
- Autenticazione per squadre (Supabase Auth)

### ⏳ TODO
- Confronto squadre side-by-side
- Grafico andamento punteggi (recharts)
- Export/import JSON
- Scambi piloti + FantaMilioni

---

## 🛠️ Comandi Utili

```bash
# Installa dipendenze
npm install

# Dev server (localhost:3000)
npm run dev

# Build produzione
npm run build

# Start da build
npm start
```

---

## 📁 Struttura Progetto

```
app/
  layout.js       → Root layout (fonts, CSS globale)
  page.js         → Home (monta FantaF1)

components/
  FantaF1.js      → Componente principale (nav, state)
  Classifica.js   → Leaderboard 6 squadre
  GaraManager.js  → Risultati gare + selector
  Squadre.js      → Rosa + Schieramento
  Calendario.js   → Timeline gare + aste
  Risultati.js    → Dettagli gara
  LoginPage.js    → Auth (TODO)

lib/
  data.js         → Costanti, piloti, calendario
  db.js           → Supabase client
  scoring.js      → Engine punteggi
  useLocalStorage.js → Persistenza state
```

---

## 🎨 Design System

**Palette (F1 Dark)**
- Background: #0a0a0a
- Surface: #14151c
- Accent: #e10600 (Racing Red)
- Text: #edeef3

**Font**
- Display: Orbitron (numeri, headline)
- Body: Titillium Web

---

## 🔗 Come Continuare da Mobile

### Opzione 1: Claude App
1. Apri **app Claude** su mobile
2. **Nuova conversazione**
3. Incolla:
   ```
   Sto lavorando a FantaF1 (Fantasy F1 2026).
   Repo: C:\Users\azani\Desktop\Vibecodingz\fantaeffeuno
   Status: CHECK PROJECT_STATUS.md per ultimi lavori
   Task: [descrivi cosa vuoi fare]
   ```

### Opzione 2: Web Browser
Puoi continuare a lavorare direttamente da browser mobile:
- URL: `localhost:3000` (se dev server è running)
- Oppure accedi a una build live (deploy pending)

### Opzione 3: GitHub (coming soon)
Quando il repo sarà su GitHub, puoi:
- Clonare da mobile via Termux (Android)
- Usare GitHub mobile per PR/issues

---

## 💡 Tips per Mobile Development

✅ **Do**
- Usa `npm run dev` per hot reload
- Test responsivo: `F12` → Device Toolbar (mobile view)
- localStorage per debugging: `localStorage.getItem('ff1_teams')`

❌ **Don't**
- Non editare file direttamente da mobile (slow)
- Non fare `git push --force` senza review
- Non aggiungere feature non concordate

---

## 📞 Contatti Rapidi

**Team FantaF1**
1. Alessandro Zanin → "ZetaRacing" (Admin)
2. Alessandro Fainelli → "SF – Scuderia Fainelli"
3. Leonardo Cedaro → "Ranocchiettos"
4. Dario Mazzanti → "Abdull Mazzar"
5. Andrea Chirizzi → "Alpha Chiro Racing"
6. Carlo Maria Ferrari → "Scudemaria Ferrari"

---

**Generato da Claude Code** | *Last updated: 2026-03-14*
