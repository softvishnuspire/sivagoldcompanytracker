const { supabase } = require('./db/supabase');

async function checkLeadStatus() {
  const leadId = '9d875ffb-d4c7-4f94-a681-a847d82cca5b';
  try {
    const { data: lead, error } = await supabase
      .from('leads')
      .select('id, lead_number, customer_name, current_status, updated_at')
      .eq('id', leadId)
      .single();

    if (error) {
      console.error('ERROR FETCHING LEAD:', error);
      return;
    }

    console.log('LEAD DETAILS:', lead);

    const { data: timeline, error: timelineErr } = await supabase
      .from('lead_timeline')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

    if (timelineErr) {
      console.error('ERROR FETCHING TIMELINE:', timelineErr);
      return;
    }

    console.log('TIMELINE EVENTS:', timeline.map(t => `${t.status} | ${t.remarks} | ${t.created_at}`));
  } catch (err) {
    console.error('EXCEPTION:', err);
  }
}

checkLeadStatus();
