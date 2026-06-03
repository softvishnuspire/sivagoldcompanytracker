const { supabase } = require('./db/supabase');

async function clearSeedUsers() {
  console.log('Starting seed users cleanup...');

  const mobilesToRemove = [
    '9000000001',
    '9000000002',
    '9000000003',
    '9000000500', // precautionary
    '9000000004',
    '9000000005'
  ];

  const { data, error } = await supabase
    .from('users')
    .delete()
    .in('mobile', mobilesToRemove)
    .select();

  if (error) {
    console.error('Error deleting seed users:', error.message);
  } else {
    console.log(`Successfully deleted ${data ? data.length : 0} seeded users:`, data);
  }

  console.log('Cleanup finished.');
}

clearSeedUsers().catch((err) => {
  console.error('Cleanup crashed:', err);
  process.exit(1);
});
