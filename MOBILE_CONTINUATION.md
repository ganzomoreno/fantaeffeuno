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
  db.js           → Supabase client (persistenza dati)
  scoring.js      → Engine punteggi (autoritativo, lato client)
  useLocalStorage.js → Solo preferenze UI locali
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

### Opzione 2: Claude Code Web (consigliato per vibecoding ovunque)
- Apri **claude.ai/code** da qualsiasi device → collega GitHub `ganzomoreno/fantaeffeuno` → branch `master`.
- Vibecodi in linguaggio naturale, le modifiche diventano commit/PR. Deploy automatico al push.

### Opzione 3: GitHub (già attivo ✅)
Il repo è **già su GitHub**: `ganzomoreno/fantaeffeuno`.
- Clona da mobile via Termux (Android) o usa GitHub mobile per PR/issues.
- App live = branch **`master`**, deploy automatico ad ogni push.

---

## 💡 Tips per Mobile Development

✅ **Do**
- Vibecoda da claude.ai/code (cloud) o `npm run dev` per hot reload in locale
- Test responsivo: `F12` → Device Toolbar (mobile view)
- I dati stanno su **Supabase**: ispezionali dalla dashboard Supabase, non da localStorage

❌ **Don't**
- Non fare `git push --force` senza review
- Non aggiungere feature non concordate
- Non lavorare sul branch `feature/fanta-formula1-app` (vecchio): usa `master`

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
