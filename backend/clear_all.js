const { supabase } = require('./db/supabase');

async function clearAllDatabase() {
  console.log('Starting full database cleanup (all tables)...');

  // Order of tables to delete (child tables first to avoid FK constraint errors)
  const tables = [
    'audit_logs',
    'notifications',
    'customer_interactions',
    'gold_images',
    'gold_collection',
    'payments',
    'executive_visits',
    'lead_documents',
    'lead_timeline',
    'fund_requests',
    'leads',
    'users',
    'branches',
    'lead_sources'
  ];

  for (const table of tables) {
    try {
      console.log(`Clearing table: ${table}...`);
      // Delete all records in table
      const { data, error } = await supabase
        .from(table)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000') // matches all UUIDs
        .select();

      if (error) {
        console.warn(`Warning clearing ${table}:`, error.message);
        // Try fallback delete if UUID match failed (e.g. if ID is not a UUID or table has different primary keys)
        const { error: fallbackError } = await supabase
          .from(table)
          .delete()
          .gte('created_at', '1970-01-01T00:00:00Z');
          
        if (fallbackError) {
          console.error(`Failed fallback clearing on ${table}:`, fallbackError.message);
        } else {
          console.log(`Successfully cleared ${table} using fallback.`);
        }
      } else {
        console.log(`Successfully cleared ${table} (${data ? data.length : 0} rows deleted).`);
      }
    } catch (err) {
      console.error(`Exception clearing ${table}:`, err);
    }
  }

  console.log('Full database cleanup completed.');
}

clearAllDatabase().catch((err) => {
  console.error('Database cleanup crashed:', err);
  process.exit(1);
});
