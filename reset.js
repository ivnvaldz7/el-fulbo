require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function wipeDatabase() {
  const tables = [
    'notifications',
    'admin_tasks',
    'event_attendances',
    'events',
    'group_recurring_schedules',
    'group_memberships',
    'players',
    'groups'
  ];

  for (const table of tables) {
    console.log(`Wiping ${table}...`);
    // Delete all rows where id is not null (which is all rows)
    const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) {
      console.error(`Error wiping ${table}:`, error.message);
    } else {
      console.log(`Successfully wiped ${table}`);
    }
  }
}

wipeDatabase();
