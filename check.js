const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres' });
client.connect().then(() => client.query("select version from supabase_migrations.schema_migrations order by version desc limit 5"))
  .then(res => { console.log(res.rows); process.exit(0) });
