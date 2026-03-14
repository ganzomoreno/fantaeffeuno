const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const TABLES_TO_BACKUP = [
  'teams',
  'pilots',
  'calendar_events',
  'auctions',
  'auction_lots',
  'races',
  'race_results',
  'lineups',
  'team_race_scores'
];

async function backup() {
  const backupDir = path.join(__dirname, 'backup_20260314');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
  }

  console.log('🔄 Inizio backup Supabase...');

  for (const table of TABLES_TO_BACKUP) {
    console.log(`- Scaricando tabella: ${table}...`);
    const { data, error } = await supabase.from(table).select('*');
    
    if (error) {
      console.error(`  ❌ Errore durante il backup di ${table}:`, error.message);
    } else {
      const filePath = path.join(backupDir, `${table}.json`);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      console.log(`  ✅ Salvati ${data.length} record in ${filePath}`);
    }
  }

  console.log('🎉 Backup completato! I tuoi dati sono al sicuro nella cartella:', backupDir);
}

backup();
