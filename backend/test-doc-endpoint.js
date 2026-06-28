const { supabase } = require('./db/supabase');

async function testQueries() {
  console.log('Testing leads query...');
  const leadsRes = await supabase
    .from('leads')
    .select('id, lead_number, customer_name, current_status, created_at')
    .order('created_at', { ascending: false });
  console.log('Leads Res Error:', leadsRes.error);

  console.log('Testing lead_documents query...');
  const docsRes = await supabase
    .from('lead_documents')
    .select('id, lead_id, document_type, file_url, created_at, uploaded_by, uploader:uploaded_by (name, role)');
  console.log('Docs Res Error:', docsRes.error);

  console.log('Testing gold_images query...');
  const goldRes = await supabase
    .from('gold_images')
    .select('id, lead_id, image_url, created_at, uploaded_by, uploader:uploaded_by (name, role)');
  console.log('Gold Res Error:', goldRes.error);

  console.log('Testing payments query...');
  const paymentsRes = await supabase
    .from('payments')
    .select('id, lead_id, payment_proof, created_at, created_by, uploader:created_by (name, role)');
  console.log('Payments Res Error:', paymentsRes.error);
}

testQueries();
