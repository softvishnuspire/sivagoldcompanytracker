const { supabase } = require('./db/supabase');

async function checkLead() {
  const leadId = '9d875ffb-d4c7-4f94-a681-a847d82cca5b';
  try {
    const { data: logs, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('module', 'EXPENSE');

    if (error) {
      console.error('ERROR FETCHING EXPENSES:', error);
      return;
    }

    console.log('TOTAL EXPENSE LOGS IN DB:', logs.length);
    console.log('LOGS:', JSON.stringify(logs, null, 2));

    const matches = logs.filter(l => l.new_value?.lead_id === leadId);
    console.log(`MATCHES FOR LEAD ${leadId}:`, matches.length);
    if (matches.length > 0) {
      console.log('MATCH DATA:', JSON.stringify(matches[0], null, 2));
    }
  } catch (err) {
    console.error('EXCEPTION:', err);
  }
}

checkLead();
