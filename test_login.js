const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkTeams(sessionId) {
  console.log("\nVerifica lettura tabella teams...");
  const { data, error } = await supabase.from('teams').select('*');
  if (error) {
    console.error("ERRORE LETTURA TEAMS:", error.message);
  } else {
    const myTeam = data.find(t => t.auth_user_id === sessionId);
    console.log(`Letti ${data.length} teams.`);
    if (myTeam) {
       console.log("SUCCESSO! Trovato team associato:", myTeam.name);
    } else {
       console.log("ATTENZIONE: Nessun team ha auth_user_id =", sessionId);
       console.log("I team attuali sono:");
       data.forEach(t => console.log(`- ${t.name}: auth_user_id=${t.auth_user_id}`));
    }
  }
}

async function run() {
  console.log("Loggando con ganzomoreno@gmail.com...");
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'ganzomoreno@gmail.com',
    password: 'password' // <- Cambiami se hai usato un'altra password
  });

  if (error) {
    console.error("ERRORE LOGIN:", error.message, error.status);
    console.log("-> Se vedi 'Invalid login credentials', password o mail sono sbagliate, OPPURE serve confermare la mail.");
    console.log("-> In Supabase vai in: Authentication > Providers > Email > e spegni 'Confirm email'.");
    return;
  }
  
  console.log("LOGIN OK, session ID:", data.session.user.id);
  await checkTeams(data.session.user.id);
}

run();
