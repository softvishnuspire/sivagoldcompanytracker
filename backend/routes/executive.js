const express = require('express');
const router = express.Router();
const multer = require('multer');
const { supabase } = require('../db/supabase');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];

// Setup multer in-memory file handling with validation filter
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (!file) {
      return cb(null, true);
    }
    const mimetypeOk = allowedMimeTypes.includes(file.mimetype);
    const extension = file.originalname.substring(file.originalname.lastIndexOf('.')).toLowerCase();
    const extensionOk = allowedExtensions.includes(extension);

    if (mimetypeOk && extensionOk) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, JPG, JPEG, and PNG files are allowed.'), false);
    }
  }
});

// Helper: Inspect file magic bytes to verify content matches signature
function validateMagicBytes(buffer) {
  if (!buffer || buffer.length < 4) return null;
  
  // Check PDF: %PDF
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return 'application/pdf';
  }
  
  // Check PNG: 89 50 4E 47 0D 0A 1A 0A
  if (buffer.length >= 8 &&
      buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47 &&
      buffer[4] === 0x0D && buffer[5] === 0x0A && buffer[6] === 0x1A && buffer[7] === 0x0A) {
    return 'image/png';
  }
  
  // Check JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return 'image/jpeg';
  }
  
  return null;
}

// Helper: Ensure Supabase storage buckets exist
async function ensureBucket(bucketName) {
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error) {
      console.warn(`Could not verify buckets: ${error.message}`);
      return;
    }
    const exists = buckets.some(b => b.name === bucketName);
    if (!exists) {
      console.log(`Bucket "${bucketName}" not found. Creating programmatically...`);
      await supabase.storage.createBucket(bucketName, { public: true });
    }
  } catch (err) {
    console.warn(`Error ensuring bucket ${bucketName}:`, err);
  }
}

// Ensure all buckets are ready
const BUCKETS = ['loan-documents', 'agreements', 'payment-proofs', 'gold-images'];
BUCKETS.forEach(bucket => ensureBucket(bucket));

// Helper: Upload file buffer to Supabase Storage
async function uploadToSupabase(bucket, fileName, buffer, mimetype) {
  const cleanFileName = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9.]/g, '_')}`;
  
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(cleanFileName, buffer, {
      contentType: mimetype,
      upsert: true
    });

  if (error) {
    throw new Error(`Supabase upload failed: ${error.message}`);
  }

  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(cleanFileName);

  return publicUrl;
}

// 14 Sequential statuses
const STATUS_FLOW = [
  'EXECUTIVE_ASSIGNED',
  'CUSTOMER_CALLED',
  'VISIT_CONFIRMED',
  'MD_FUNDS_APPROVED',
  'JOURNEY_STARTED',
  'REACHED_CUSTOMER',
  'CUSTOMER_INTERACTION',
  'BANK_VISIT',
  'AGREEMENT_PENDING',
  'PAYMENT_COMPLETED',
  'GOLD_RECEIVED',
  'BALANCE_SETTLED',
  'IMAGES_UPLOADED',
  'CASE_COMPLETED'
];

// Helper: Normalize status strings for comparison
function normalizeStatus(status) {
  if (!status) return '';
  return status.toUpperCase().replace(/[\s_]+/g, '_');
}

// Helper: Verify and advance status sequentially
async function verifyAndAdvanceStatus(leadId, currentStatusInDb, targetStatus, userId) {
  const normCurrent = normalizeStatus(currentStatusInDb);
  const normTarget = normalizeStatus(targetStatus);

  const currentIndex = STATUS_FLOW.indexOf(normCurrent);
  const targetIndex = STATUS_FLOW.indexOf(normTarget);

  if (targetIndex === -1) {
    throw new Error(`Invalid target status: ${targetStatus}`);
  }

  // Allow starting at EXECUTIVE_ASSIGNED if the status is not in the list (e.g. APPROVED)
  if (currentIndex === -1 && normTarget === 'EXECUTIVE_ASSIGNED') {
    // Valid initial step
  } else if (targetIndex !== currentIndex + 1) {
    throw new Error(`Invalid status transition. Status must move sequentially from ${currentStatusInDb} (${STATUS_FLOW[currentIndex] || 'Initial'}) to ${STATUS_FLOW[currentIndex + 1] || 'None'}. Try target status: ${STATUS_FLOW[currentIndex + 1]}`);
  }

  return true;
}

// Helper: Insert timeline record
async function addTimelineRecord(leadId, status, remarks, userId) {
  const { error } = await supabase
    .from('lead_timeline')
    .insert([{
      lead_id: leadId,
      status: status,
      remarks: remarks || `Moved to ${status}`,
      updated_by: userId
    }]);

  if (error) {
    console.error('Timeline insertion failed:', error.message);
  }
}

// Apply authentication and role check to all routes in this file
router.use(authenticateToken);
router.use(authorizeRoles('EXECUTIVE', 'MD')); // MD has override access, primarily EXECUTIVE

// 1. GET /api/executive/dashboard
router.get('/dashboard', async (req, res) => {
  const executiveId = req.user.id;

  try {
    // 1. Assigned Leads count (all leads assigned to this executive where status is not completed)
    const { data: assignedLeads, error: aleadErr } = await supabase
      .from('leads')
      .select('id, current_status, loan_amount')
      .eq('executive_id', executiveId);

    if (aleadErr) throw aleadErr;

    const totalAssigned = assignedLeads.length;
    
    // 2. Completed cases
    const completedCases = assignedLeads.filter(l => normalizeStatus(l.current_status) === 'CASE_COMPLETED').length;

    // 3. In Progress cases (between CUSTOMER_CALLED and IMAGES_UPLOADED)
    const inProgressCases = assignedLeads.filter(l => {
      const norm = normalizeStatus(l.current_status);
      const index = STATUS_FLOW.indexOf(norm);
      return index >= 1 && index < 13;
    }).length;

    // 4. Today's visits (records in executive_visits for today)
    const todayStr = new Date().toISOString().split('T')[0];
    const { data: todayVisits, error: visitErr } = await supabase
      .from('executive_visits')
      .select('id')
      .eq('executive_id', executiveId)
      .eq('visit_date', todayStr);

    if (visitErr) console.warn('Visits fetch failed:', visitErr.message);
    const totalTodayVisits = todayVisits ? todayVisits.length : 0;

    // 5. Gold Collected (grams)
    const { data: goldCollectedRecords, error: goldErr } = await supabase
      .from('gold_collection')
      .select('net_weight')
      .eq('received_by', executiveId);

    if (goldErr) console.warn('Gold collection fetch failed:', goldErr.message);
    const goldCollectedGrams = goldCollectedRecords 
      ? goldCollectedRecords.reduce((sum, item) => sum + Number(item.net_weight || 0), 0) 
      : 0;

    // 6. Amount Handled (Total paid loan amount + total payments handled)
    const { data: paymentRecords, error: payErr } = await supabase
      .from('payments')
      .select('total_paid, approved_amount')
      .eq('created_by', executiveId);

    if (payErr) console.warn('Payments fetch failed:', payErr.message);
    const amountHandledVal = paymentRecords
      ? paymentRecords.reduce((sum, item) => sum + Number(item.total_paid || item.approved_amount || 0), 0)
      : 0;

    return res.json({
      assignedLeads: totalAssigned,
      todayVisits: totalTodayVisits,
      inProgressCases: inProgressCases,
      completedCases: completedCases,
      goldCollected: goldCollectedGrams,
      amountHandled: amountHandledVal
    });

  } catch (err) {
    console.error('Error fetching dashboard metrics:', err);
    return res.status(500).json({ error: 'Server error loading dashboard metrics' });
  }
});

// 2. GET /api/executive/assigned-leads
router.get('/assigned-leads', async (req, res) => {
  const executiveId = req.user.id;

  try {
    const { data: leads, error } = await supabase
      .from('leads')
      .select('id, lead_number, customer_name, mobile, address, district, bank_name, branch_name, gold_weight, loan_amount, current_status')
      .eq('executive_id', executiveId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return res.json(leads);
  } catch (err) {
    console.error('Error fetching assigned leads:', err);
    return res.status(500).json({ error: 'Server error loading assigned leads' });
  }
});

// 3. GET /api/executive/lead/:id
router.get('/lead/:id', async (req, res) => {
  const { id } = req.params;
  const executiveId = req.user.id;

  try {
    // Fetch lead with related details
    const { data: lead, error } = await supabase
      .from('leads')
      .select(`
        *,
        lead_documents (*),
        lead_timeline (*),
        executive_visits (*),
        payments (*),
        gold_collection (*),
        gold_images (*),
        fund_requests (*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Lead not found or database query failed' });
    }

    // Verify ownership
    if (lead.executive_id !== executiveId && req.user.role !== 'MD') {
      return res.status(403).json({ error: 'Access denied. Lead not assigned to you.' });
    }

    // Return timeline in chronological order
    if (lead.lead_timeline) {
      lead.lead_timeline.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    }

    return res.json(lead);
  } catch (err) {
    console.error('Error fetching lead details:', err);
    return res.status(500).json({ error: 'Server error loading lead details' });
  }
});

// 4. POST /api/executive/update-status
router.post('/update-status', async (req, res) => {
  const { leadId, targetStatus, remarks } = req.body;
  const userId = req.user.id;

  if (!leadId || !targetStatus) {
    return res.status(400).json({ error: 'leadId and targetStatus are required.' });
  }

  try {
    const { data: lead, error: fetchErr } = await supabase
      .from('leads')
      .select('current_status, executive_id, loan_amount')
      .eq('id', leadId)
      .single();

    if (fetchErr || !lead) {
      return res.status(404).json({ error: 'Lead not found.' });
    }

    if (lead.executive_id !== userId && req.user.role !== 'MD') {
      return res.status(403).json({ error: 'Unauthorized to update this lead.' });
    }

    await verifyAndAdvanceStatus(leadId, lead.current_status, targetStatus, userId);

    // If advancing to MD_FUNDS_APPROVED, ensure a fund request exists and is approved (for simulation/override)
    let approvedAmount = null;
    if (normalizeStatus(targetStatus) === 'MD_FUNDS_APPROVED') {
      const { data: pendingReq } = await supabase
        .from('fund_requests')
        .select('*')
        .eq('lead_id', leadId)
        .eq('status', 'PENDING')
        .maybeSingle();

      if (pendingReq) {
        approvedAmount = pendingReq.requested_amount;
        await supabase
          .from('fund_requests')
          .update({
            status: 'APPROVED',
            approved_amount: approvedAmount,
            approved_by: userId,
            approved_at: new Date()
          })
          .eq('id', pendingReq.id);
      } else {
        const mockAmount = lead.loan_amount ? Number(lead.loan_amount) : 50000;
        approvedAmount = mockAmount;
        await supabase
          .from('fund_requests')
          .insert([{
            lead_id: leadId,
            requested_amount: mockAmount,
            approved_amount: mockAmount,
            requested_by: userId,
            approved_by: userId,
            status: 'APPROVED',
            approved_at: new Date()
          }]);
      }
    }

    const leadUpdates = { current_status: targetStatus, updated_at: new Date() };
    if (approvedAmount !== null) {
      leadUpdates.loan_amount = Number(approvedAmount);
    }

    const { error: updateErr } = await supabase
      .from('leads')
      .update(leadUpdates)
      .eq('id', leadId);

    if (updateErr) throw updateErr;

    await addTimelineRecord(leadId, targetStatus, remarks, userId);

    return res.json({ message: `Successfully updated status to ${targetStatus}` });

  } catch (err) {
    console.error('Error updating status:', err.message);
    return res.status(400).json({ error: err.message });
  }
});

// 4.5 POST /api/executive/request-funds
router.post('/request-funds', async (req, res) => {
  const { leadId, requestedAmount } = req.body;
  const userId = req.user.id;

  if (!leadId || !requestedAmount) {
    return res.status(400).json({ error: 'leadId and requestedAmount are required.' });
  }

  const amount = Number(requestedAmount);
  if (isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: 'requestedAmount must be a positive number.' });
  }

  try {
    const { data: lead, error: fetchErr } = await supabase
      .from('leads')
      .select('current_status, executive_id')
      .eq('id', leadId)
      .single();

    if (fetchErr || !lead) {
      return res.status(404).json({ error: 'Lead not found.' });
    }

    if (lead.executive_id !== userId && req.user.role !== 'MD') {
      return res.status(403).json({ error: 'Unauthorized to request funds for this lead.' });
    }

    const normStatus = normalizeStatus(lead.current_status);
    if (normStatus !== 'VISIT_CONFIRMED') {
      return res.status(400).json({ error: 'Funds can only be requested when status is VISIT_CONFIRMED.' });
    }

    // Check for existing pending request
    const { data: existingReq } = await supabase
      .from('fund_requests')
      .select('id')
      .eq('lead_id', leadId)
      .eq('status', 'PENDING')
      .maybeSingle();

    if (existingReq) {
      return res.status(400).json({ error: 'A pending fund request already exists for this lead.' });
    }

    const { data: newReq, error: insertErr } = await supabase
      .from('fund_requests')
      .insert([{
        lead_id: leadId,
        requested_amount: amount,
        requested_by: userId,
        status: 'PENDING'
      }])
      .select()
      .single();

    if (insertErr) throw insertErr;

    await addTimelineRecord(
      leadId,
      'VISIT_CONFIRMED',
      `Requested funds of ₹${amount.toLocaleString('en-IN')}`,
      userId
    );

    return res.json({ message: 'Fund request submitted successfully.', fundRequest: newReq });
  } catch (err) {
    console.error('Error requesting funds:', err.message);
    return res.status(400).json({ error: err.message });
  }
});


// 5. POST /api/executive/start-journey (Moves status to JOURNEY_STARTED)
router.post('/start-journey', async (req, res) => {
  const { leadId, remarks } = req.body;
  const userId = req.user.id;

  try {
    const { data: lead, error } = await supabase.from('leads').select('current_status').eq('id', leadId).single();
    if (error || !lead) return res.status(404).json({ error: 'Lead not found.' });

    await verifyAndAdvanceStatus(leadId, lead.current_status, 'JOURNEY_STARTED', userId);

    // Update lead status
    await supabase.from('leads').update({ current_status: 'JOURNEY_STARTED', updated_at: new Date() }).eq('id', leadId);

    // Create/update visit
    const todayStr = new Date().toISOString().split('T')[0];
    await supabase.from('executive_visits').insert([{
      lead_id: leadId,
      executive_id: userId,
      visit_date: todayStr,
      start_time: new Date(),
      status: 'started',
      remarks: remarks || 'Journey started'
    }]);

    await addTimelineRecord(leadId, 'JOURNEY_STARTED', remarks || 'Executive started the journey', userId);

    return res.json({ message: 'Journey started successfully' });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// 6. POST /api/executive/reached-customer (Moves status to REACHED_CUSTOMER)
router.post('/reached-customer', upload.single('houseImage'), async (req, res) => {
  const { leadId, remarks } = req.body;
  const userId = req.user.id;

  if (!leadId) {
    return res.status(400).json({ error: 'leadId is required.' });
  }

  try {
    const { data: lead, error } = await supabase.from('leads').select('current_status').eq('id', leadId).single();
    if (error || !lead) return res.status(404).json({ error: 'Lead not found.' });

    await verifyAndAdvanceStatus(leadId, lead.current_status, 'REACHED_CUSTOMER', userId);

    if (!req.file) {
      return res.status(400).json({ error: 'House visited verification photo is required.' });
    }

    const detectedMime = validateMagicBytes(req.file.buffer);
    if (!detectedMime) {
      return res.status(400).json({ error: 'Security Alert: Invalid file content detected for houseImage.' });
    }

    const houseImageUrl = await uploadToSupabase('loan-documents', req.file.originalname, req.file.buffer, detectedMime);

    // Save it in lead_documents
    await supabase.from('lead_documents').insert([{
      lead_id: leadId,
      document_type: 'OTHER',
      file_url: houseImageUrl,
      uploaded_by: userId
    }]);

    await supabase.from('leads').update({ current_status: 'REACHED_CUSTOMER', updated_at: new Date() }).eq('id', leadId);

    // Update visit
    await supabase.from('executive_visits')
      .update({ reached_time: new Date(), status: 'reached' })
      .eq('lead_id', leadId)
      .eq('status', 'started');

    await addTimelineRecord(leadId, 'REACHED_CUSTOMER', remarks || 'Executive reached customer location and uploaded house photo', userId);

    return res.json({ message: 'Reached customer location recorded.' });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// 7. POST /api/executive/customer-interaction (Moves status to CUSTOMER_INTERACTION)
router.post('/customer-interaction', async (req, res) => {
  const { leadId, discussionNotes, customerConfirmation } = req.body;
  const userId = req.user.id;

  if (!discussionNotes) {
    return res.status(400).json({ error: 'Discussion notes are required.' });
  }

  try {
    const { data: lead, error } = await supabase.from('leads').select('current_status').eq('id', leadId).single();
    if (error || !lead) return res.status(404).json({ error: 'Lead not found.' });

    await verifyAndAdvanceStatus(leadId, lead.current_status, 'CUSTOMER_INTERACTION', userId);

    await supabase.from('leads').update({ current_status: 'CUSTOMER_INTERACTION', updated_at: new Date() }).eq('id', leadId);

    // Insert interaction
    await supabase.from('customer_interactions').insert([{
      lead_id: leadId,
      employee_id: userId,
      interaction_type: 'VISIT',
      notes: `Discussion Notes: ${discussionNotes} | Confirmation: ${customerConfirmation ? 'YES' : 'NO'}`
    }]);

    await addTimelineRecord(leadId, 'CUSTOMER_INTERACTION', `Interaction summary: ${discussionNotes}`, userId);

    return res.json({ message: 'Customer interaction documented successfully.' });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// 8. POST /api/executive/bank-visit (Moves status to BANK_VISIT)
router.post('/bank-visit', async (req, res) => {
  const { leadId, vendorName, bankName, verificationNotes } = req.body;
  const userId = req.user.id;

  try {
    const { data: lead, error } = await supabase.from('leads').select('current_status').eq('id', leadId).single();
    if (error || !lead) return res.status(404).json({ error: 'Lead not found.' });

    await verifyAndAdvanceStatus(leadId, lead.current_status, 'BANK_VISIT', userId);

    await supabase.from('leads').update({ 
      current_status: 'BANK_VISIT', 
      bank_name: bankName || lead.bank_name,
      updated_at: new Date() 
    }).eq('id', leadId);

    // Save interaction/verification
    await supabase.from('customer_interactions').insert([{
      lead_id: leadId,
      employee_id: userId,
      interaction_type: 'VISIT',
      notes: `Bank Visit at ${bankName} (${vendorName || 'N/A'}). Notes: ${verificationNotes || 'Verified'}`
    }]);

    await addTimelineRecord(leadId, 'BANK_VISIT', `Bank visit completed: ${bankName}. Notes: ${verificationNotes || ''}`, userId);

    return res.json({ message: 'Bank visit registered successfully.' });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// 8.5 POST /api/executive/upload-agreements (Moves status to AGREEMENT_PENDING)
router.post('/upload-agreements', upload.fields([
  { name: 'agreementCopy', maxCount: 1 },
  { name: 'kycCopy', maxCount: 1 },
  { name: 'bankImage', maxCount: 1 }
]), async (req, res) => {
  const { leadId, remarks } = req.body;
  const userId = req.user.id;

  if (!leadId) {
    return res.status(400).json({ error: 'leadId is required.' });
  }

  try {
    const { data: lead, error } = await supabase.from('leads').select('current_status').eq('id', leadId).single();
    if (error || !lead) return res.status(404).json({ error: 'Lead not found.' });

    await verifyAndAdvanceStatus(leadId, lead.current_status, 'AGREEMENT_PENDING', userId);

    const files = req.files;
    let agreementUrl = '';
    let kycUrl = '';
    let bankImageUrl = '';

    if (files) {
      if (files['agreementCopy'] && files['agreementCopy'][0]) {
        const file = files['agreementCopy'][0];
        const detectedMime = validateMagicBytes(file.buffer);
        if (!detectedMime) {
          return res.status(400).json({ error: 'Security Alert: Invalid file content detected for agreementCopy.' });
        }
        agreementUrl = await uploadToSupabase('agreements', file.originalname, file.buffer, detectedMime);
        await supabase.from('lead_documents').insert([{
          lead_id: leadId,
          document_type: 'AGREEMENT',
          file_url: agreementUrl,
          uploaded_by: userId
        }]);
      }
      if (files['kycCopy'] && files['kycCopy'][0]) {
        const file = files['kycCopy'][0];
        const detectedMime = validateMagicBytes(file.buffer);
        if (!detectedMime) {
          return res.status(400).json({ error: 'Security Alert: Invalid file content detected for kycCopy.' });
        }
        kycUrl = await uploadToSupabase('loan-documents', file.originalname, file.buffer, detectedMime);
        await supabase.from('lead_documents').insert([{
          lead_id: leadId,
          document_type: 'AADHAR',
          file_url: kycUrl,
          uploaded_by: userId
        }]);
      }
      if (files['bankImage'] && files['bankImage'][0]) {
        const file = files['bankImage'][0];
        const detectedMime = validateMagicBytes(file.buffer);
        if (!detectedMime) {
          return res.status(400).json({ error: 'Security Alert: Invalid file content detected for bankImage.' });
        }
        bankImageUrl = await uploadToSupabase('loan-documents', file.originalname, file.buffer, detectedMime);
        await supabase.from('lead_documents').insert([{
          lead_id: leadId,
          document_type: 'BANK_DOCUMENT',
          file_url: bankImageUrl,
          uploaded_by: userId
        }]);
      }
    }

    await supabase.from('leads').update({ current_status: 'AGREEMENT_PENDING', updated_at: new Date() }).eq('id', leadId);

    await addTimelineRecord(leadId, 'AGREEMENT_PENDING', `Uploaded buyout agreement, KYC, and bank visit proof documents.`, userId);

    return res.json({ message: 'Agreements, KYC, and bank visit proof uploaded successfully.' });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// 9. POST /api/executive/payment (Moves status to PAYMENT_COMPLETED)
router.post('/payment', upload.single('paymentProof'), async (req, res) => {
  const { leadId, loanAmountPaid, transactionNumber, paymentDate } = req.body;
  const userId = req.user.id;

  if (!leadId || !loanAmountPaid || !transactionNumber) {
    return res.status(400).json({ error: 'leadId, loanAmountPaid, and transactionNumber are required.' });
  }

  try {
    const { data: lead, error } = await supabase.from('leads').select('current_status').eq('id', leadId).single();
    if (error || !lead) return res.status(404).json({ error: 'Lead not found.' });

    await verifyAndAdvanceStatus(leadId, lead.current_status, 'PAYMENT_COMPLETED', userId);

    let paymentProofUrl = '';
    if (req.file) {
      const detectedMime = validateMagicBytes(req.file.buffer);
      if (!detectedMime) {
        return res.status(400).json({ error: 'Security Alert: Invalid file content detected for paymentProof.' });
      }
      paymentProofUrl = await uploadToSupabase('payment-proofs', req.file.originalname, req.file.buffer, detectedMime);
    }

    // Save payment details
    await supabase.from('payments').insert([{
      lead_id: leadId,
      loan_amount: Number(loanAmountPaid),
      total_paid: Number(loanAmountPaid),
      transaction_number: transactionNumber,
      payment_date: paymentDate ? new Date(paymentDate) : new Date(),
      payment_proof: paymentProofUrl,
      created_by: userId
    }]);

    // Also register in lead_documents
    if (paymentProofUrl) {
      await supabase.from('lead_documents').insert([{
        lead_id: leadId,
        document_type: 'PAYMENT_PROOF',
        file_url: paymentProofUrl,
        uploaded_by: userId
      }]);
    }

    await supabase.from('leads').update({ current_status: 'PAYMENT_COMPLETED', updated_at: new Date() }).eq('id', leadId);

    await addTimelineRecord(leadId, 'PAYMENT_COMPLETED', `Payment recorded. Tx: ${transactionNumber}, Amount: ${loanAmountPaid}`, userId);

    return res.json({ message: 'Payment recorded successfully.' });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// 10. POST /api/executive/gold-received (Moves status to GOLD_RECEIVED)
router.post('/gold-received', async (req, res) => {
  const { leadId, grossWeight, netWeight, purity, receivedDate, remarks } = req.body;
  const userId = req.user.id;

  if (!grossWeight || !netWeight) {
    return res.status(400).json({ error: 'grossWeight and netWeight are required.' });
  }

  try {
    const { data: lead, error } = await supabase.from('leads').select('current_status').eq('id', leadId).single();
    if (error || !lead) return res.status(404).json({ error: 'Lead not found.' });

    await verifyAndAdvanceStatus(leadId, lead.current_status, 'GOLD_RECEIVED', userId);

    await supabase.from('gold_collection').insert([{
      lead_id: leadId,
      gross_weight: Number(grossWeight),
      net_weight: Number(netWeight),
      purity: Number(purity || 91.6),
      received_by: userId,
      received_date: receivedDate ? new Date(receivedDate) : new Date(),
    }]);

    await supabase.from('leads').update({ 
      current_status: 'GOLD_RECEIVED', 
      gold_weight: Number(netWeight),
      updated_at: new Date() 
    }).eq('id', leadId);

    await addTimelineRecord(leadId, 'GOLD_RECEIVED', `Gold received. Gross: ${grossWeight}g, Net: ${netWeight}g, Purity: ${purity || 91.6}%`, userId);

    return res.json({ message: 'Gold collection details saved.' });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// 11. POST /api/executive/balance-settled (Moves status to BALANCE_SETTLED)
router.post('/balance-settled', async (req, res) => {
  const { leadId, balanceAmount, transactionNumber, paymentDate } = req.body;
  const userId = req.user.id;

  if (balanceAmount === undefined || !transactionNumber) {
    return res.status(400).json({ error: 'balanceAmount and transactionNumber are required.' });
  }

  try {
    const { data: lead, error } = await supabase.from('leads').select('current_status').eq('id', leadId).single();
    if (error || !lead) return res.status(404).json({ error: 'Lead not found.' });

    await verifyAndAdvanceStatus(leadId, lead.current_status, 'BALANCE_SETTLED', userId);

    // Update existing payment record or create a new one for balance
    const { data: payments } = await supabase.from('payments').select('id, total_paid').eq('lead_id', leadId).maybeSingle();

    if (payments) {
      await supabase.from('payments').update({
        balance_amount: Number(balanceAmount),
        total_paid: Number(payments.total_paid || 0) + Number(balanceAmount),
        transaction_number: transactionNumber,
        payment_date: paymentDate ? new Date(paymentDate) : new Date(),
      }).eq('id', payments.id);
    } else {
      await supabase.from('payments').insert([{
        lead_id: leadId,
        balance_amount: Number(balanceAmount),
        total_paid: Number(balanceAmount),
        transaction_number: transactionNumber,
        payment_date: paymentDate ? new Date(paymentDate) : new Date(),
        created_by: userId
      }]);
    }

    await supabase.from('leads').update({ current_status: 'BALANCE_SETTLED', updated_at: new Date() }).eq('id', leadId);

    await addTimelineRecord(leadId, 'BALANCE_SETTLED', `Balance amount of ${balanceAmount} settled. Tx: ${transactionNumber}`, userId);

    return res.json({ message: 'Balance settlement details saved.' });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// 12. POST /api/executive/upload-images (Moves status to IMAGES_UPLOADED)
router.post('/upload-images', upload.fields([
  { name: 'image1', maxCount: 1 },
  { name: 'image2', maxCount: 1 },
  { name: 'image3', maxCount: 1 },
  { name: 'image4', maxCount: 1 }
]), async (req, res) => {
  const { leadId } = req.body;
  const userId = req.user.id;

  if (!leadId) {
    return res.status(400).json({ error: 'leadId is required.' });
  }

  try {
    const { data: lead, error } = await supabase.from('leads').select('current_status').eq('id', leadId).single();
    if (error || !lead) return res.status(404).json({ error: 'Lead not found.' });

    await verifyAndAdvanceStatus(leadId, lead.current_status, 'IMAGES_UPLOADED', userId);

    const files = req.files;
    const uploadPromises = [];

    if (files) {
      // Validate all files first
      for (const fieldName of ['image1', 'image2', 'image3', 'image4']) {
        if (files[fieldName] && files[fieldName][0]) {
          const file = files[fieldName][0];
          const detectedMime = validateMagicBytes(file.buffer);
          if (!detectedMime) {
            return res.status(400).json({ error: `Security Alert: Invalid file content detected for ${fieldName}.` });
          }
          file.detectedMime = detectedMime;
        }
      }

      ['image1', 'image2', 'image3', 'image4'].forEach(fieldName => {
        if (files[fieldName] && files[fieldName][0]) {
          const file = files[fieldName][0];
          uploadPromises.push(
            uploadToSupabase('gold-images', file.originalname, file.buffer, file.detectedMime)
               .then(url => {
                 return supabase.from('gold_images').insert([{
                   lead_id: leadId,
                   image_url: url,
                   uploaded_by: userId
                 }]);
               })
          );
        }
      });
    }

    if (uploadPromises.length === 0) {
      return res.status(400).json({ error: 'At least one image file is required.' });
    }

    await Promise.all(uploadPromises);

    await supabase.from('leads').update({ current_status: 'IMAGES_UPLOADED', updated_at: new Date() }).eq('id', leadId);

    await addTimelineRecord(leadId, 'IMAGES_UPLOADED', `Uploaded ${uploadPromises.length} gold images.`, userId);

    return res.json({ message: 'Gold images uploaded successfully.' });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// 13. POST /api/executive/complete-case (Moves status to CASE_COMPLETED)
router.post('/complete-case', async (req, res) => {
  console.log('[POST /complete-case] req.body:', req.body);
  const { leadId, remarks, expenseAmount } = req.body;
  const userId = req.user.id;

  try {
    const { data: lead, error } = await supabase.from('leads').select('current_status').eq('id', leadId).single();
    if (error || !lead) return res.status(404).json({ error: 'Lead not found.' });

    await verifyAndAdvanceStatus(leadId, lead.current_status, 'CASE_COMPLETED', userId);

    // End executive visit
    await supabase.from('executive_visits')
      .update({ end_time: new Date(), status: 'completed' })
      .eq('lead_id', leadId)
      .neq('status', 'completed');

    await supabase.from('leads').update({ current_status: 'CASE_COMPLETED', updated_at: new Date() }).eq('id', leadId);

    // If an expense amount is provided and is a valid number >= 0, log it in audit_logs
    if (expenseAmount !== undefined && expenseAmount !== null && expenseAmount !== '') {
      const amountNum = Number(expenseAmount);
      if (!isNaN(amountNum) && amountNum >= 0) {
        const { error: insertErr } = await supabase.from('audit_logs').insert([{
          user_id: userId,
          module: 'EXPENSE',
          action: 'SUBMIT',
          new_value: {
            lead_id: leadId,
            amount: amountNum,
            remarks: remarks || 'Case completed visit expenses'
          }
        }]);
        if (insertErr) {
          console.error('[POST /complete-case] audit_logs insert failed:', insertErr.message);
        } else {
          console.log('[POST /complete-case] audit_logs insert successful:', amountNum);
        }
      } else {
        console.warn('[POST /complete-case] expenseAmount is not a valid number >= 0:', expenseAmount);
      }
    } else {
      console.log('[POST /complete-case] expenseAmount is empty or undefined:', expenseAmount);
    }

    await addTimelineRecord(leadId, 'CASE_COMPLETED', remarks || 'Case completed successfully.', userId);

    return res.json({ message: 'Case completed successfully.' });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// 14. GET /api/executive/reports
router.get('/reports', async (req, res) => {
  const executiveId = req.user.id;
  const { filter } = req.query; // 'today', 'week', 'month'

  try {
    let query = supabase.from('leads').select('*, payments(*), gold_collection(*)').eq('executive_id', executiveId);

    const now = new Date();
    let startDate;

    if (filter === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (filter === 'week') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
      startDate = new Date(now.setDate(diff));
      startDate.setHours(0, 0, 0, 0);
    } else if (filter === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    if (startDate) {
      query = query.gte('created_at', startDate.toISOString());
    }

    const { data: leads, error } = await query;
    if (error) throw error;

    const assignedLeadsCount = leads.length;
    const completedCases = leads.filter(l => normalizeStatus(l.current_status) === 'CASE_COMPLETED');
    const completedCount = completedCases.length;

    let goldCollectedGrams = 0;
    leads.forEach(l => {
      if (l.gold_collection) {
        l.gold_collection.forEach(g => {
          goldCollectedGrams += Number(g.net_weight || 0);
        });
      }
    });

    let amountHandled = 0;
    leads.forEach(l => {
      if (l.payments) {
        l.payments.forEach(p => {
          amountHandled += Number(p.total_paid || 0);
        });
      }
    });

    const completionRate = assignedLeadsCount > 0 
      ? Math.round((completedCount / assignedLeadsCount) * 100) 
      : 0;

    return res.json({
      assignedLeads: assignedLeadsCount,
      completedCases: completedCount,
      goldCollected: goldCollectedGrams,
      amountHandled: amountHandled,
      completionRate: completionRate
    });

  } catch (err) {
    console.error('Error generating reports:', err);
    return res.status(500).json({ error: 'Server error generating reports' });
  }
});


// 14. POST /api/executive/upload-bank-image (Allows upload of bank proof image at any point)
router.post('/upload-bank-image', upload.single('bankImage'), async (req, res) => {
  const { leadId } = req.body;
  const userId = req.user.id;

  if (!leadId) {
    return res.status(400).json({ error: 'leadId is required.' });
  }

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const detectedMime = validateMagicBytes(req.file.buffer);
    if (!detectedMime) {
      return res.status(400).json({ error: 'Security Alert: Invalid file content detected for bankImage.' });
    }

    const bankImageUrl = await uploadToSupabase('loan-documents', req.file.originalname, req.file.buffer, detectedMime);

    const { data: docData, error: docError } = await supabase.from('lead_documents').insert([{
      lead_id: leadId,
      document_type: 'BANK_DOCUMENT',
      file_url: bankImageUrl,
      uploaded_by: userId
    }]).select();

    if (docError) {
      return res.status(400).json({ error: docError.message });
    }

    await addTimelineRecord(leadId, 'BANK_DOCUMENT_UPLOADED', `Uploaded bank/shop visit proof image.`, userId);

    return res.json({ message: 'Bank image uploaded successfully.', document: docData[0] });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

module.exports = router;

