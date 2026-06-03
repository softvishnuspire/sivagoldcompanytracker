require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: Environment variables SUPABASE_URL and SUPABASE_ANON_KEY are required.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const tables = [
  'branches',
  'users',
  'lead_sources',
  'leads',
  'lead_timeline',
  'lead_documents',
  'executive_visits',
  'payments',
  'gold_collection',
  'gold_images',
  'customer_interactions',
  'notifications',
  'audit_logs',
  'fund_requests'
];

async function verifySchema() {
  console.log('\n======================================');
  console.log('    SIVA GOLD SCHEMA VERIFICATION     ');
  console.log('======================================');
  console.log(`Target: ${supabaseUrl}`);
  console.log(`Checking ${tables.length} core tables...\n`);

  let successCount = 0;

  for (const table of tables) {
    try {
      // Query table with limit 0 and count to verify existence
      const { error, status } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (status === 401) {
        console.log(`  [401] ❌ ${table.padEnd(25)} | Unauthorized: Invalid API Key`);
      } else if (status === 404 && error?.code === 'PGRST205') {
        console.log(`  [404] ❌ ${table.padEnd(25)} | Missing: Table not found in schema cache`);
      } else {
        console.log(`  [OK ] ✅ ${table.padEnd(25)} | Table exists & is accessible`);
        successCount++;
      }
    } catch (err) {
      console.log(`  [ERR] ❌ ${table.padEnd(25)} | Network exception: ${err.message}`);
    }
  }

  console.log('\n--------------------------------------');
  console.log(`Result: ${successCount} / ${tables.length} tables verified.`);
  console.log('======================================\n');
}

verifySchema();
