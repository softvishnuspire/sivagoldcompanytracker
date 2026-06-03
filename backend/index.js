require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 5000;

// Security Middleware
app.use(helmet());
app.use(cors({
  origin: '*', // Allow all for development. In production, restrict to frontend domain.
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Enable JSON and urlencoded parsing with large limit for documents/attachments
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ limit: '200mb', extended: true }));

// Rate Limiter: Limit requests to 100 per 15 minutes window
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { error: 'Too many requests from this IP, please try again after 15 minutes.' }
});
app.use('/api', limiter);

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('WARNING: Supabase URL or Anon Key is missing in backend/.env');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper to sanitize UUID inputs
const toValidUuid = (uuidStr) => {
  if (!uuidStr) return null;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuidStr) ? uuidStr : null;
};

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Shiva Gold Management System Backend API is active.', dbConnected: !!supabaseUrl });
});

// Temp Endpoint to check existing users
app.get('/api/users', async (req, res) => {
  try {
    const { data, error } = await supabase.from('users').select('*');
    if (error) return res.status(400).json({ error: error.message });
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Import and Register Routers for auth and executive
const authRoutes = require('./routes/auth');
const executiveRoutes = require('./routes/executive');

app.use('/api/auth', authRoutes);
app.use('/api/executive', executiveRoutes);

// 1. GET /api/leads - Fetch all leads with nested relationships
app.get('/api/leads', async (req, res) => {
  try {
    const { data: dbLeads, error } = await supabase
      .from('leads')
      .select(`
        *,
        documents:lead_documents(*),
        interactions:customer_interactions(*),
        timeline:lead_timeline(*)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[GET /leads] Supabase error:', error.message);
      return res.status(400).json({ error: error.message });
    }

    // Debug: log document counts per lead
    if (dbLeads) {
      dbLeads.forEach(lead => {
        if (lead.documents && lead.documents.length > 0) {
          console.log(`[GET /leads] Lead ${lead.lead_number}: ${lead.documents.length} documents found`);
        } else {
          console.log(`[GET /leads] Lead ${lead.lead_number}: 0 documents (raw: ${JSON.stringify(lead.documents)})`);
        }
      });
    }

    res.json(dbLeads || []);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// 2. POST /api/leads - Create a new lead
app.post('/api/leads', async (req, res) => {
  try {
    const {
      customer_name,
      mobile,
      alternate_mobile,
      address,
      district,
      gold_weight,
      gold_type,
      estimated_value,
      bank_name,
      branch_name,
      loan_amount,
      loan_account_number,
      current_status,
      telecaller_id,
      source,
      documents
    } = req.body;

    const leadId = crypto.randomUUID();
    
    // Fetch count or generate a unique lead number
    const { count, error: countError } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      return res.status(400).json({ error: countError.message });
    }

    const nextNum = (count || 0) + 1;
    const lead_number = `SGL-2026-${nextNum.toString().padStart(4, '0')}`;

    // Insert lead
    const { data: leadData, error: leadError } = await supabase
      .from('leads')
      .insert({
        id: leadId,
        lead_number,
        customer_name,
        mobile,
        alternate_mobile,
        address,
        district,
        gold_weight: Number(gold_weight || 0),
        gold_type,
        estimated_value: Number(estimated_value || 0),
        bank_name,
        branch_name,
        loan_amount: Number(loan_amount || 0),
        loan_account_number,
        current_status: current_status || 'CUSTOMER_DETAILS_CREATED',
        source: source || null,
        telecaller_id: toValidUuid(telecaller_id)
      })
      .select()
      .single();

    if (leadError) {
      return res.status(400).json({ error: leadError.message });
    }

    // Insert initial timeline entry
    await supabase.from('lead_timeline').insert({
      lead_id: leadId,
      status: current_status || 'CUSTOMER_DETAILS_CREATED',
      remarks: 'Lead created in systems directory',
      updated_by: toValidUuid(telecaller_id)
    });

    // Insert documents if provided
    if (documents && Array.isArray(documents) && documents.length > 0) {
      const dbDocs = documents.map(d => {
        let docType = d.documentType || 'OTHER';
        if (docType === 'KYC') {
          const lowerName = (d.fileName || '').toLowerCase();
          docType = lowerName.includes('pan') ? 'PAN' : 'AADHAR';
        } else if (docType === 'ADDITIONAL') {
          docType = 'OTHER';
        }
        return {
          id: crypto.randomUUID(),
          lead_id: leadId,
          document_type: docType,
          file_url: d.fileUrl || '#',
          uploaded_by: toValidUuid(telecaller_id)
        };
      });
      console.log(`[POST /leads] Inserting ${dbDocs.length} documents for lead ${leadId}`);
      const { error: docError } = await supabase.from('lead_documents').insert(dbDocs);
      if (docError) {
        console.error('[POST /leads] Document insert failed:', docError.message);
      }
    }

    res.status(201).json(leadData);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// 3. PUT /api/leads/:id - Update lead details
app.put('/api/leads/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      customer_name,
      mobile,
      alternate_mobile,
      address,
      district,
      gold_weight,
      gold_type,
      estimated_value,
      bank_name,
      branch_name,
      loan_amount,
      loan_account_number,
      current_status,
      telecaller_id,
      source,
      documents
    } = req.body;

    const { data: leadData, error: updateError } = await supabase
      .from('leads')
      .update({
        customer_name,
        mobile,
        alternate_mobile,
        address,
        district,
        gold_weight: Number(gold_weight || 0),
        gold_type,
        estimated_value: Number(estimated_value || 0),
        bank_name,
        branch_name,
        loan_amount: Number(loan_amount || 0),
        loan_account_number,
        current_status,
        source: source || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return res.status(400).json({ error: updateError.message });
    }

    // Add timeline entry
    await supabase.from('lead_timeline').insert({
      lead_id: id,
      status: current_status,
      remarks: 'Lead details modified by Telecaller',
      updated_by: toValidUuid(telecaller_id)
    });

    // Update documents if provided
    if (documents) {
      // 1. Delete old documents first
      await supabase.from('lead_documents').delete().eq('lead_id', id);

      // 2. Insert new documents if any
      if (Array.isArray(documents) && documents.length > 0) {
        const dbDocs = documents.map(d => {
          let docType = d.documentType || 'OTHER';
          if (docType === 'KYC') {
            const lowerName = (d.fileName || '').toLowerCase();
            docType = lowerName.includes('pan') ? 'PAN' : 'AADHAR';
          } else if (docType === 'ADDITIONAL') {
            docType = 'OTHER';
          }
          return {
            id: crypto.randomUUID(),
            lead_id: id,
            document_type: docType,
            file_url: d.fileUrl || '#',
            uploaded_by: toValidUuid(telecaller_id)
          };
        });
        console.log(`[PUT /leads/${id}] Inserting ${dbDocs.length} documents`);
        const { error: docError } = await supabase.from('lead_documents').insert(dbDocs);
        if (docError) {
          console.error(`[PUT /leads/${id}] Document insert failed:`, docError.message);
        }
      }
    }

    res.json(leadData);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// 4. PATCH /api/leads/:id/status - Update lead status
app.patch('/api/leads/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { current_status, remarks, telecaller_id } = req.body;

    const { data: leadData, error: updateError } = await supabase
      .from('leads')
      .update({
        current_status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return res.status(400).json({ error: updateError.message });
    }

    // Add timeline log
    await supabase.from('lead_timeline').insert({
      lead_id: id,
      status: current_status,
      remarks: remarks || `Status updated to ${current_status}`,
      updated_by: toValidUuid(telecaller_id)
    });

    res.json(leadData);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// 5. POST /api/leads/:id/followups - Schedule a follow-up
app.post('/api/leads/:id/followups', async (req, res) => {
  try {
    const { id } = req.params;
    const { date, remarks, telecaller_id } = req.body;

    // Add customer interaction log
    const { error: interactionError } = await supabase
      .from('customer_interactions')
      .insert({
        id: crypto.randomUUID(),
        lead_id: id,
        employee_id: toValidUuid(telecaller_id),
        interaction_type: 'FOLLOWUP',
        notes: `Followup Date: ${date} - ${remarks}`
      });

    if (interactionError) {
      return res.status(400).json({ error: interactionError.message });
    }

    // Update lead status to FOLLOWUP_IN_PROGRESS
    const { data: leadData, error: updateError } = await supabase
      .from('leads')
      .update({
        current_status: 'FOLLOWUP_IN_PROGRESS',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return res.status(400).json({ error: updateError.message });
    }

    // Add timeline log
    await supabase.from('lead_timeline').insert({
      lead_id: id,
      status: 'FOLLOWUP_IN_PROGRESS',
      remarks: `Follow-up scheduled: ${remarks}`,
      updated_by: toValidUuid(telecaller_id)
    });

    res.json(leadData);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// 6. PATCH /api/leads/:id/followups/:followupId/complete - Complete a follow-up
app.patch('/api/leads/:id/followups/:followupId/complete', async (req, res) => {
  try {
    const { id, followupId } = req.params;
    const { remarks, telecaller_id } = req.body;

    // Add completed interaction log
    const { error: interactionError } = await supabase
      .from('customer_interactions')
      .insert({
        id: crypto.randomUUID(),
        lead_id: id,
        employee_id: toValidUuid(telecaller_id),
        interaction_type: 'CALL',
        notes: `Completed followup call: ${remarks}`
      });

    if (interactionError) {
      return res.status(400).json({ error: interactionError.message });
    }

    // Update lead status back to DETAILS_COLLECTED (followup completed, details verified)
    const { data: leadData, error: updateError } = await supabase
      .from('leads')
      .update({
        current_status: 'DETAILS_COLLECTED',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return res.status(400).json({ error: updateError.message });
    }

    // Add timeline log
    await supabase.from('lead_timeline').insert({
      lead_id: id,
      status: 'DETAILS_COLLECTED',
      remarks: `Completed followup call log: ${remarks}`,
      updated_by: toValidUuid(telecaller_id)
    });

    res.json(leadData);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// 7. DELETE /api/leads/:id - Delete a lead and its related records
app.delete('/api/leads/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Delete from lead_documents
    const { error: docsError } = await supabase
      .from('lead_documents')
      .delete()
      .eq('lead_id', id);

    if (docsError) {
      return res.status(400).json({ error: docsError.message });
    }

    // 2. Delete from lead_timeline
    const { error: timelineError } = await supabase
      .from('lead_timeline')
      .delete()
      .eq('lead_id', id);

    if (timelineError) {
      return res.status(400).json({ error: timelineError.message });
    }

    // 3. Delete from customer_interactions
    const { error: interactionsError } = await supabase
      .from('customer_interactions')
      .delete()
      .eq('lead_id', id);

    if (interactionsError) {
      return res.status(400).json({ error: interactionsError.message });
    }

    // 4. Delete the lead itself
    const { error: leadError } = await supabase
      .from('leads')
      .delete()
      .eq('id', id);

    if (leadError) {
      return res.status(400).json({ error: leadError.message });
    }

    res.json({ success: true, message: 'Lead and related entries deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// 404 Route handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found.' });
});

// Global Error Handler Middleware
app.use((err, req, res, next) => {
  console.error('Express Error Handler:', err);
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request entity too large. Maximum limit is 200MB.' });
  }
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
