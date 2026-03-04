// ─── GAME RULES ──────────────────────────────────────────────────────────────
export const INITIAL_BUDGET = 100;
export const BUDGET_PER_AUCTION = 100;
export const MAX_SWITCHES = 5;
export const LINEUP_SIZE = 3;
export const PENALTY_MISSED_RACE = 5;
export const PENALTY_MISSED_SPRINT = 2;

// Position → Points (P1=25 down to P20=1, P21-22=0)
export const POINTS_TABLE = {
  1:25, 2:22, 3:20, 4:18, 5:16, 6:15, 7:14, 8:13, 9:12, 10:11,
  11:10, 12:9, 13:8, 14:7, 15:6, 16:5, 17:4, 18:3, 19:2, 20:1,
  21:0, 22:0
};

// Bonus rules
export const OVERTAKE_BONUS = 0.5;     // per overtake
export const MAX_OVERTAKE_POINTS = 3;  // cap (= 6 overtakes)
export const FASTEST_LAP_BONUS = 1;
export const DOTD_POINTS = { 1: 3, 2: 2, 3: 1 };

// ─── TEAMS ───────────────────────────────────────────────────────────────────
export const DEFAULT_TEAMS = [
  { id: "t1", name: "ZetaRacing", owner: "Alessandro Zanin", budget: INITIAL_BUDGET, pilots: [], switchesUsed: 0, isAdmin: true },
  { id: "t2", name: "SF – Scuderia Fainelli", owner: "Alessandro Fainelli", budget: INITIAL_BUDGET, pilots: [], switchesUsed: 0 },
  { id: "t3", name: "Ranocchiettos", owner: "Leonardo Cedaro", budget: INITIAL_BUDGET, pilots: [], switchesUsed: 0 },
  { id: "t4", name: "Abdull Mazzar", owner: "Dario Mazzanti", budget: INITIAL_BUDGET, pilots: [], switchesUsed: 0 },
  { id: "t5", name: "Alpha Chiro Racing", owner: "Andrea Chirizzi", budget: INITIAL_BUDGET, pilots: [], switchesUsed: 0 },
  { id: "t6", name: "Scudemaria Ferrari", owner: "Carlo Maria Ferrari", budget: INITIAL_BUDGET, pilots: [], switchesUsed: 0 },
];

// ─── PILOTS ──────────────────────────────────────────────────────────────────
export const DEFAULT_PILOTS = [
  { id:"p1",  name:"Lando Norris",           abbreviation:"NOR", team:"McLaren",        price:0, owner:null },
  { id:"p2",  name:"Oscar Piastri",          abbreviation:"PIA", team:"McLaren",        price:0, owner:null },
  { id:"p3",  name:"George Russell",         abbreviation:"RUS", team:"Mercedes",       price:0, owner:null },
  { id:"p4",  name:"Andrea Kimi Antonelli",  abbreviation:"ANT", team:"Mercedes",       price:0, owner:null },
  { id:"p5",  name:"Max Verstappen",         abbreviation:"VER", team:"Red Bull Racing",price:0, owner:null },
  { id:"p6",  name:"Isack Hadjar",           abbreviation:"HAD", team:"Red Bull Racing",price:0, owner:null },
  { id:"p7",  name:"Charles Leclerc",        abbreviation:"LEC", team:"Ferrari",        price:0, owner:null },
  { id:"p8",  name:"Lewis Hamilton",         abbreviation:"HAM", team:"Ferrari",        price:0, owner:null },
  { id:"p9",  name:"Alexander Albon",        abbreviation:"ALB", team:"Williams",       price:0, owner:null },
  { id:"p10", name:"Carlos Sainz",           abbreviation:"SAI", team:"Williams",       price:0, owner:null },
  { id:"p11", name:"Arvid Lindblad",         abbreviation:"LIN", team:"Racing Bulls",   price:0, owner:null },
  { id:"p12", name:"Liam Lawson",            abbreviation:"LAW", team:"Racing Bulls",   price:0, owner:null },
  { id:"p13", name:"Fernando Alonso",        abbreviation:"ALO", team:"Aston Martin",   price:0, owner:null },
  { id:"p14", name:"Lance Stroll",           abbreviation:"STR", team:"Aston Martin",   price:0, owner:null },
  { id:"p15", name:"Esteban Ocon",           abbreviation:"OCO", team:"Haas",           price:0, owner:null },
  { id:"p16", name:"Oliver Bearman",         abbreviation:"BEA", team:"Haas",           price:0, owner:null },
  { id:"p17", name:"Nico Hülkenberg",        abbreviation:"HUL", team:"Audi",           price:0, owner:null },
  { id:"p18", name:"Gabriel Bortoleto",      abbreviation:"BOR", team:"Audi",           price:0, owner:null },
  { id:"p19", name:"Pierre Gasly",           abbreviation:"GAS", team:"Alpine",         price:0, owner:null },
  { id:"p20", name:"Franco Colapinto",       abbreviation:"COL", team:"Alpine",         price:0, owner:null },
  { id:"p21", name:"Sergio Pérez",           abbreviation:"PER", team:"Cadillac",       price:0, owner:null },
  { id:"p22", name:"Valtteri Bottas",        abbreviation:"BOT", team:"Cadillac",       price:0, owner:null },
];

// ─── CALENDAR ────────────────────────────────────────────────────────────────
export const CALENDAR = [
  { date:"08/03/2026", type:"race",    location:"Australia" },
  { date:"15/03/2026", type:"race",    location:"Cina" },
  { date:"16/03/2026", type:"auction", location:"Asta" },
  { date:"29/03/2026", type:"race",    location:"Giappone" },
  { date:"12/04/2026", type:"race",    location:"Bahrain" },
  { date:"13/04/2026", type:"auction", location:"Asta" },
  { date:"19/04/2026", type:"race",    location:"Arabia Saudita" },
  { date:"03/05/2026", type:"race",    location:"Miami" },
  { date:"04/05/2026", type:"auction", location:"Asta" },
  { date:"24/05/2026", type:"race",    location:"Canada" },
  { date:"07/06/2026", type:"race",    location:"Monaco" },
  { date:"08/06/2026", type:"auction", location:"Asta" },
  { date:"14/06/2026", type:"race",    location:"Spagna (Barcellona)" },
  { date:"28/06/2026", type:"race",    location:"Austria" },
  { date:"29/06/2026", type:"auction", location:"Asta" },
  { date:"05/07/2026", type:"race",    location:"Gran Bretagna" },
  { date:"19/07/2026", type:"race",    location:"Belgio" },
  { date:"20/07/2026", type:"auction", location:"Asta" },
  { date:"26/07/2026", type:"race",    location:"Ungheria" },
  { date:"23/08/2026", type:"race",    location:"Paesi Bassi" },
  { date:"24/08/2026", type:"auction", location:"Asta" },
  { date:"06/09/2026", type:"race",    location:"Italia" },
  { date:"13/09/2026", type:"race",    location:"Spagna (Valencia)" },
  { date:"14/09/2026", type:"auction", location:"Asta" },
  { date:"26/09/2026", type:"race",    location:"Azerbaijan" },
  { date:"11/10/2026", type:"race",    location:"Singapore" },
  { date:"12/10/2026", type:"auction", location:"Asta" },
  { date:"25/10/2026", type:"race",    location:"Stati Uniti" },
  { date:"01/11/2026", type:"race",    location:"Messico" },
  { date:"02/11/2026", type:"auction", location:"Asta" },
  { date:"08/11/2026", type:"race",    location:"Brasile" },
  { date:"21/11/2026", type:"race",    location:"Las Vegas" },
  { date:"23/11/2026", type:"auction", location:"Asta" },
  { date:"29/11/2026", type:"race",    location:"Qatar" },
  { date:"06/12/2026", type:"race",    location:"Abu Dhabi" },
];

// ─── F1 TEAM COLORS ──────────────────────────────────────────────────────────
export const F1_TEAM_COLORS = {
  "McLaren":        "#FF8000",
  "Mercedes":       "#27F4D2",
  "Red Bull Racing":"#3671C6",
  "Ferrari":        "#E8002D",
  "Williams":       "#64C4FF",
  "Racing Bulls":   "#6692FF",
  "Aston Martin":   "#229971",
  "Haas":           "#B6BABD",
  "Audi":           "#0b1e32",
  "Alpine":         "#FF87BC",
  "Cadillac":       "#1B2D4B",
};
