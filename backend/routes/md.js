const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const { supabase } = require('../db/supabase');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Apply authentication and gating to all MD routes
router.use(authenticateToken);
router.use(authorizeRoles('MD'));

// Helper: Normalize status
function normalizeStatus(status) {
  if (!status) return '';
  return status.toUpperCase().replace(/[\s_]+/g, '_');
}

// 1. GET /api/md/dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [leadsRes, goldRes, payRes] = await Promise.all([
      supabase.from('leads').select('id, current_status'),
      supabase.from('gold_collection').select('net_weight, created_at').gte('created_at', todayStart.toISOString()).lte('created_at', todayEnd.toISOString()),
      supabase.from('payments').select('total_paid, created_at').gte('created_at', todayStart.toISOString()).lte('created_at', todayEnd.toISOString())
    ]);

    if (leadsRes.error) throw leadsRes.error;
    if (goldRes.error) throw goldRes.error;
    if (payRes.error) throw payRes.error;

    const leads = leadsRes.data || [];
    const totalLeads = leads.length;
    
    const qualifiedLeads = leads.filter(l => 
      ['DETAILS_COLLECTED', 'DOCUMENTS_RECEIVED', 'PRICE_CONFIRMED', 'SENT_TO_RM'].includes(l.current_status)
    ).length;

    const rmApprovedLeads = leads.filter(l => l.current_status === 'RM_APPROVED').length;
    
    const activeCases = leads.filter(l => 
      !['CASE_COMPLETED', 'RM_REJECTED'].includes(l.current_status)
    ).length;
    
    const completedCases = leads.filter(l => l.current_status === 'CASE_COMPLETED').length;

    const goldCollectedToday = goldRes.data.reduce((sum, item) => sum + Number(item.net_weight || 0), 0);
    const revenueToday = payRes.data.reduce((sum, item) => sum + Number(item.total_paid || 0), 0);

    const conversionRate = totalLeads > 0 ? Number(((completedCases / totalLeads) * 100).toFixed(2)) : 0;

    res.json({
      totalLeads,
      qualifiedLeads,
      rmApprovedLeads,
      activeCases,
      completedCases,
      goldCollectedToday,
      revenueToday,
      conversionRate
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. GET /api/md/leads
router.get('/leads', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('leads')
      .select(`
        id,
        lead_number,
        customer_name,
        district,
        current_status,
        created_at,
        rm:rm_id ( name ),
        executive:executive_id ( name )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. GET /api/md/lead/:id
router.get('/lead/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select(`
        *,
        telecaller:telecaller_id ( name ),
        rm:rm_id ( name ),
        executive:executive_id ( name )
      `)
      .eq('id', id)
      .single();

    if (leadError) throw leadError;

    const { data: documents, error: docsError } = await supabase
      .from('lead_documents')
      .select('*')
      .eq('lead_id', id);

    if (docsError) throw docsError;

    const { data: timeline, error: timelineError } = await supabase
      .from('lead_timeline')
      .select(`
        *,
        user:updated_by ( name )
      `)
      .eq('lead_id', id)
      .order('created_at', { ascending: true });

    if (timelineError) throw timelineError;

    const { data: payments, error: payError } = await supabase
      .from('payments')
      .select('*')
      .eq('lead_id', id);

    if (payError) throw payError;

    const { data: goldCollection, error: goldError } = await supabase
      .from('gold_collection')
      .select('*')
      .eq('lead_id', id);

    if (goldError) throw goldError;

    const { data: goldImages, error: imgError } = await supabase
      .from('gold_images')
      .select('*')
      .eq('lead_id', id);

    if (imgError) throw imgError;

    const { data: expenseLogs, error: expenseError } = await supabase
      .from('audit_logs')
      .select('id, user_id, created_at, new_value, users:user_id ( name )')
      .eq('module', 'EXPENSE')
      .eq('action', 'SUBMIT');

    if (expenseError) {
      console.error(`[GET /api/md/lead/${id}] expenseLogs fetch error:`, expenseError.message);
    }

    console.log(`[GET /api/md/lead/${id}] Total expense logs fetched:`, expenseLogs ? expenseLogs.length : 0);

    const leadExpense = expenseLogs 
      ? expenseLogs.find(log => {
          let payload = log.new_value;
          if (typeof payload === 'string') {
            try {
              payload = JSON.parse(payload);
            } catch (e) {
              payload = {};
            }
          }
          const logLeadId = payload?.lead_id;
          return logLeadId && String(logLeadId).toLowerCase() === String(id).toLowerCase();
        })
      : null;

    let parsedPayload = {};
    if (leadExpense) {
      parsedPayload = leadExpense.new_value;
      if (typeof parsedPayload === 'string') {
        try {
          parsedPayload = JSON.parse(parsedPayload);
        } catch (e) {
          parsedPayload = {};
        }
      }
      console.log(`[GET /api/md/lead/${id}] Found matching expense:`, parsedPayload);
    } else {
      console.log(`[GET /api/md/lead/${id}] No matching expense found in logs`);
    }

    const formattedExpense = leadExpense ? {
      amount: Number(parsedPayload?.amount || 0),
      remarks: parsedPayload?.remarks || '',
      submitted_by: leadExpense.users?.name || 'Field Executive',
      created_at: leadExpense.created_at
    } : null;

    res.json({
      lead,
      documents: documents || [],
      timeline: timeline || [],
      payments: payments || [],
      goldCollectionDetails: goldCollection || [],
      goldImages: goldImages || [],
      expense: formattedExpense
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. GET /api/md/fund-requests
router.get('/fund-requests', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('fund_requests')
      .select(`
        *,
        lead:lead_id ( lead_number, customer_name, current_status ),
        requested_by_user:requested_by ( name )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. POST /api/md/fund-approval
router.post('/fund-approval', async (req, res) => {
  try {
    const { requestId, approvedAmount, remarks } = req.body;

    if (!requestId || approvedAmount === undefined) {
      return res.status(400).json({ error: 'requestId and approvedAmount are required.' });
    }

    const { data: request, error: reqErr } = await supabase
      .from('fund_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (reqErr || !request) {
      return res.status(404).json({ error: 'Fund request not found.' });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({ error: 'Fund request has already been processed.' });
    }

    if (Number(approvedAmount) > Number(request.requested_amount)) {
      return res.status(400).json({ error: 'Approved amount cannot exceed requested amount.' });
    }

    // 1. Update request status
    const { error: updateReqErr } = await supabase
      .from('fund_requests')
      .update({
        status: 'APPROVED',
        approved_amount: Number(approvedAmount),
        approved_by: req.user.id,
        approved_at: new Date().toISOString()
      })
      .eq('id', requestId);

    if (updateReqErr) throw updateReqErr;

    // 2. Advance lead status to MD_FUNDS_APPROVED and update loan_amount
    const { error: updateLeadErr } = await supabase
      .from('leads')
      .update({
        current_status: 'MD_FUNDS_APPROVED',
        loan_amount: Number(approvedAmount),
        updated_at: new Date().toISOString()
      })
      .eq('id', request.lead_id);

    if (updateLeadErr) throw updateLeadErr;

    // 3. Log timeline entry
    const fullRemarks = `Approved Amount: ₹${Number(approvedAmount).toLocaleString('en-IN')}. MD Remarks: ${remarks || 'None'}`;
    const { error: timelineErr } = await supabase
      .from('lead_timeline')
      .insert({
        lead_id: request.lead_id,
        status: 'MD_FUNDS_APPROVED',
        remarks: fullRemarks,
        updated_by: req.user.id
      });

    if (timelineErr) throw timelineErr;

    res.json({ success: true, message: 'Fund request approved and lead advanced.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 6. POST /api/md/fund-rejection
router.post('/fund-rejection', async (req, res) => {
  try {
    const { requestId, reason, remarks } = req.body;

    if (!requestId || !reason) {
      return res.status(400).json({ error: 'requestId and reason are required.' });
    }

    const { data: request, error: reqErr } = await supabase
      .from('fund_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (reqErr || !request) {
      return res.status(404).json({ error: 'Fund request not found.' });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({ error: 'Fund request has already been processed.' });
    }

    // 1. Update request status (rejection)
    const { error: updateReqErr } = await supabase
      .from('fund_requests')
      .update({
        status: 'REJECTED',
        approved_by: req.user.id,
        approved_at: new Date().toISOString()
      })
      .eq('id', requestId);

    if (updateReqErr) throw updateReqErr;

    // 2. Create rejection timeline entry (lead status remains unchanged)
    const rejectionRemarks = `Reason: ${reason}. Remarks: ${remarks || 'None'}`;
    const { error: timelineErr } = await supabase
      .from('lead_timeline')
      .insert({
        lead_id: request.lead_id,
        status: 'MD_FUNDS_REJECTED',
        remarks: rejectionRemarks,
        updated_by: req.user.id
      });

    if (timelineErr) throw timelineErr;

    res.json({ success: true, message: 'Fund request rejected.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 7. GET /api/md/revenue
router.get('/revenue', async (req, res) => {
  try {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const { data: payments, error } = await supabase
      .from('payments')
      .select('total_paid, payment_date')
      .gte('payment_date', startOfYear.toISOString());

    if (error) throw error;

    let todayRevenue = 0;
    let weeklyRevenue = 0;
    let monthlyRevenue = 0;
    let yearlyRevenue = 0;

    const todayStr = now.toDateString();

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    payments.forEach(p => {
      const pDate = new Date(p.payment_date);
      const amount = Number(p.total_paid || 0);

      if (pDate.toDateString() === todayStr) {
        todayRevenue += amount;
      }
      if (pDate >= startOfWeek) {
        weeklyRevenue += amount;
      }
      if (pDate.getMonth() === currentMonth && pDate.getFullYear() === currentYear) {
        monthlyRevenue += amount;
      }
      yearlyRevenue += amount;
    });

    // 30 days trends
    const trend = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dStr = d.toDateString();
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const dayAmount = payments
        .filter(p => new Date(p.payment_date).toDateString() === dStr)
        .reduce((sum, p) => sum + Number(p.total_paid || 0), 0);
      trend.push({ date: label, revenue: dayAmount });
    }

    // 6 months comparison
    const comparison = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth();
      const y = d.getFullYear();
      const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      const monthAmount = payments
        .filter(p => {
          const pDate = new Date(p.payment_date);
          return pDate.getMonth() === m && pDate.getFullYear() === y;
        })
        .reduce((sum, p) => sum + Number(p.total_paid || 0), 0);
      comparison.push({ month: label, revenue: monthAmount });
    }

    res.json({
      today: todayRevenue,
      week: weeklyRevenue,
      month: monthlyRevenue,
      year: yearlyRevenue,
      trend,
      comparison
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 8. GET /api/md/gold-collection
router.get('/gold-collection', async (req, res) => {
  try {
    const [collectionsRes, summaryRes] = await Promise.all([
      supabase
        .from('gold_collection')
        .select(`
          *,
          lead:lead_id ( lead_number, customer_name, executive:executive_id ( name ) )
        `)
        .order('received_date', { ascending: false }),
      supabase
        .from('gold_collection')
        .select('net_weight, received_date')
    ]);

    if (collectionsRes.error) throw collectionsRes.error;
    if (summaryRes.error) throw summaryRes.error;

    const now = new Date();
    const todayStr = now.toDateString();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let todayGold = 0;
    let monthGold = 0;
    let totalGold = 0;

    summaryRes.data.forEach(g => {
      const gDate = new Date(g.received_date);
      const weight = Number(g.net_weight || 0);

      if (gDate.toDateString() === todayStr) {
        todayGold += weight;
      }
      if (gDate.getMonth() === currentMonth && gDate.getFullYear() === currentYear) {
        monthGold += weight;
      }
      totalGold += weight;
    });

    const list = collectionsRes.data.map(item => ({
      id: item.id,
      lead_id: item.lead_id,
      lead_number: item.lead?.lead_number || 'N/A',
      customer_name: item.lead?.customer_name || 'N/A',
      executive_name: item.lead?.executive?.name || 'Unassigned',
      gross_weight: item.gross_weight,
      net_weight: item.net_weight,
      purity: item.purity,
      purchase_amount: item.purchase_amount,
      received_date: item.received_date
    }));

    res.json({
      today: todayGold,
      month: monthGold,
      total: totalGold,
      list
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 9. GET /api/md/employee-performance
router.get('/employee-performance', async (req, res) => {
  try {
    const [usersRes, leadsRes, goldRes, paymentsRes] = await Promise.all([
      supabase.from('users').select('id, name, role'),
      supabase.from('leads').select('id, telecaller_id, rm_id, executive_id, current_status'),
      supabase.from('gold_collection').select('net_weight, received_by'),
      supabase.from('payments').select('total_paid, created_by')
    ]);

    if (usersRes.error) throw usersRes.error;
    if (leadsRes.error) throw leadsRes.error;

    const users = usersRes.data || [];
    const leads = leadsRes.data || [];
    const gold = goldRes.data || [];
    const payments = paymentsRes.data || [];

    const telecallerList = users.filter(u => u.role === 'TELECALLER').map(tc => {
      const tcLeads = leads.filter(l => l.telecaller_id === tc.id);
      const totalLeadsCreated = tcLeads.length;
      
      const leadsSentToRm = tcLeads.filter(l => 
        l.current_status !== 'CUSTOMER_DETAILS_CREATED' && l.current_status !== 'FOLLOWUP_IN_PROGRESS'
      ).length;

      const completed = tcLeads.filter(l => l.current_status === 'CASE_COMPLETED').length;
      const conversionRate = totalLeadsCreated > 0 ? Number(((completed / totalLeadsCreated) * 100).toFixed(2)) : 0;

      return {
        name: tc.name,
        totalLeadsCreated,
        leadsSentToRm,
        conversionRate
      };
    });

    const rmList = users.filter(u => u.role === 'RM').map(rm => {
      const rmLeads = leads.filter(l => l.rm_id === rm.id);
      const leadsReviewed = rmLeads.length;
      
      const approved = rmLeads.filter(l => 
        !['CUSTOMER_DETAILS_CREATED', 'FOLLOWUP_IN_PROGRESS', 'DETAILS_COLLECTED', 'DOCUMENTS_RECEIVED', 'PRICE_CONFIRMED', 'SENT_TO_RM', 'RM_REJECTED', 'RM_REVERIFICATION'].includes(l.current_status)
      ).length;

      const rejected = rmLeads.filter(l => l.current_status === 'RM_REJECTED').length;
      const approvalRate = leadsReviewed > 0 ? Number(((approved / leadsReviewed) * 100).toFixed(2)) : 0;

      return {
        name: rm.name,
        leadsReviewed,
        approved,
        rejected,
        approvalRate
      };
    });

    const executiveList = users.filter(u => u.role === 'EXECUTIVE').map(exec => {
      const execLeads = leads.filter(l => l.executive_id === exec.id);
      const assignedLeads = execLeads.length;
      const completedCases = execLeads.filter(l => l.current_status === 'CASE_COMPLETED').length;
      
      const execGold = gold
        .filter(g => g.received_by === exec.id)
        .reduce((sum, g) => sum + Number(g.net_weight || 0), 0);

      const amountHandled = payments
        .filter(p => p.created_by === exec.id)
        .reduce((sum, p) => sum + Number(p.total_paid || 0), 0);

      const completionRate = assignedLeads > 0 ? Number(((completedCases / assignedLeads) * 100).toFixed(2)) : 0;

      return {
        name: exec.name,
        assignedLeads,
        completedCases,
        goldCollected: execGold,
        amountHandled,
        completionRate
      };
    });

    res.json({
      telecaller: telecallerList,
      rm: rmList,
      executive: executiveList
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 10. GET /api/md/branch-performance
router.get('/branch-performance', async (req, res) => {
  try {
    const [branchesRes, leadsRes, goldRes, paymentsRes, usersRes] = await Promise.all([
      supabase.from('branches').select('id, branch_name'),
      supabase.from('leads').select('id, current_status, telecaller_id, executive_id'),
      supabase.from('gold_collection').select('net_weight, received_by'),
      supabase.from('payments').select('total_paid, created_by'),
      supabase.from('users').select('id, branch_id')
    ]);

    if (branchesRes.error) throw branchesRes.error;
    if (leadsRes.error) throw leadsRes.error;

    const branches = branchesRes.data || [];
    const leads = leadsRes.data || [];
    const gold = goldRes.data || [];
    const payments = paymentsRes.data || [];
    const users = usersRes.data || [];

    const result = branches.map(branch => {
      const branchUserIds = users.filter(u => u.branch_id === branch.id).map(u => u.id);

      const branchLeads = leads.filter(l => 
        branchUserIds.includes(l.telecaller_id) || branchUserIds.includes(l.executive_id)
      );

      const totalLeads = branchLeads.length;
      
      const approvedLeads = branchLeads.filter(l => 
        !['CUSTOMER_DETAILS_CREATED', 'FOLLOWUP_IN_PROGRESS', 'DETAILS_COLLECTED', 'DOCUMENTS_RECEIVED', 'PRICE_CONFIRMED', 'SENT_TO_RM', 'RM_REJECTED', 'RM_REVERIFICATION'].includes(l.current_status)
      ).length;

      const completedCases = branchLeads.filter(l => l.current_status === 'CASE_COMPLETED').length;

      const revenue = payments
        .filter(p => branchUserIds.includes(p.created_by))
        .reduce((sum, p) => sum + Number(p.total_paid || 0), 0);

      const goldCollected = gold
        .filter(g => branchUserIds.includes(g.received_by))
        .reduce((sum, g) => sum + Number(g.net_weight || 0), 0);

      return {
        branch: branch.branch_name,
        totalLeads,
        approvedLeads,
        completedCases,
        revenue,
        goldCollected
      };
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 11. GET /api/md/timeline
router.get('/timeline', async (req, res) => {
  try {
    const { leadNumber, status, startDate, endDate } = req.query;

    let query = supabase
      .from('lead_timeline')
      .select(`
        *,
        lead:lead_id ( lead_number, customer_name ),
        user:updated_by ( name )
      `);

    if (status) {
      query = query.eq('status', status);
    }
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    let { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    if (leadNumber) {
      data = data.filter(item => 
        item.lead?.lead_number?.toLowerCase().includes(leadNumber.toLowerCase())
      );
    }

    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 11.5 POST /api/md/branch (Disabled)
router.post('/branch', async (req, res) => {
  res.status(403).json({ error: 'Branch creation is disabled. Only Hyderabad and Vijayawada branches are supported.' });
});
// 12. GET /api/md/branches-list
router.get('/branches-list', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('branches')
      .select('id, branch_name')
      .in('branch_name', ['Vijayawada', 'Hyderabad'])
      .order('branch_name', { ascending: true });

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 13. GET /api/md/employees
router.get('/employees', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select(`
        id,
        name,
        email,
        mobile,
        role,
        status,
        branch_id,
        created_at,
        branches:branch_id ( branch_name )
      `)
      .in('role', ['TELECALLER', 'RM', 'EXECUTIVE'])
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 14. POST /api/md/employee
router.post('/employee', async (req, res) => {
  try {
    const { branch_id, name, role, mobile, email, password } = req.body;

    if (!name || !role || !mobile || !email || !password) {
      return res.status(400).json({ error: 'All fields including password are required' });
    }

    // Check if email or mobile already exists
    const { data: existingUser, error: checkErr } = await supabase
      .from('users')
      .select('id')
      .or(`email.eq.${email.toLowerCase()},mobile.eq.${mobile}`);

    if (checkErr) throw checkErr;
    if (existingUser && existingUser.length > 0) {
      return res.status(400).json({ error: 'Email or Mobile number already in use.' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const rolePrefix = role.substring(0, 2).toUpperCase();
    const uniqueId = Math.floor(1000 + Math.random() * 9000);
    const employee_code = `${rolePrefix}${uniqueId}`;

    const { data, error } = await supabase
      .from('users')
      .insert([{
        employee_code,
        branch_id: branch_id || null,
        name,
        role: role.toUpperCase(),
        mobile,
        email: email.toLowerCase(),
        password_hash,
        status: 'active'
      }])
      .select('id, employee_code, name, email, mobile, role, status, branch_id');

    if (error) throw error;
    res.json({ success: true, employee: data[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 15. PUT /api/md/employee/:id
router.put('/employee/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { branch_id, name, role, mobile, email, password } = req.body;

    const updates = {
      name,
      role: role ? role.toUpperCase() : undefined,
      mobile,
      email: email ? email.toLowerCase() : undefined,
      branch_id: branch_id || null,
      updated_at: new Date().toISOString()
    };

    if (password) {
      const salt = await bcrypt.genSalt(10);
      updates.password_hash = await bcrypt.hash(password, salt);
    }

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select('id, name, email, mobile, role, status, branch_id');

    if (error) throw error;
    res.json({ success: true, employee: data[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 16. DELETE /api/md/employee/:id (Soft delete/Deactivate)
router.delete('/employee/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Soft delete by setting status to 'inactive'
    const { data, error } = await supabase
      .from('users')
      .update({ status: 'inactive', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select();

    if (error) throw error;
    res.json({ success: true, message: 'Employee deactivated successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Helper: Query core tables to compile standard list items for reports
async function getReportData(type) {
  if (type === 'lead') {
    const { data } = await supabase
      .from('leads')
      .select('id, lead_number, customer_name, mobile, district, current_status, gold_weight, estimated_value, loan_amount, created_at')
      .order('created_at', { ascending: false });
    return data || [];
  } else if (type === 'revenue') {
    const { data } = await supabase
      .from('payments')
      .select('id, total_paid, payment_mode, transaction_number, payment_date, lead:lead_id(lead_number, customer_name)')
      .order('payment_date', { ascending: false });
    return data || [];
  } else if (type === 'gold') {
    const { data } = await supabase
      .from('gold_collection')
      .select('id, gross_weight, net_weight, purity, purchase_amount, received_date, lead:lead_id(lead_number, customer_name)')
      .order('received_date', { ascending: false });
    return data || [];
  } else if (type === 'branch') {
    const [branchesRes, leadsRes, goldRes, paymentsRes, usersRes] = await Promise.all([
      supabase.from('branches').select('id, branch_name'),
      supabase.from('leads').select('id, current_status, telecaller_id, executive_id'),
      supabase.from('gold_collection').select('net_weight, received_by'),
      supabase.from('payments').select('total_paid, created_by'),
      supabase.from('users').select('id, branch_id')
    ]);

    const branches = branchesRes.data || [];
    const leads = leadsRes.data || [];
    const gold = goldRes.data || [];
    const payments = paymentsRes.data || [];
    const users = usersRes.data || [];

    return branches.map(branch => {
      const branchUserIds = users.filter(u => u.branch_id === branch.id).map(u => u.id);
      const branchLeads = leads.filter(l => branchUserIds.includes(l.telecaller_id) || branchUserIds.includes(l.executive_id));
      const totalLeads = branchLeads.length;
      const approvedLeads = branchLeads.filter(l => !['CUSTOMER_DETAILS_CREATED', 'FOLLOWUP_IN_PROGRESS', 'DETAILS_COLLECTED', 'DOCUMENTS_RECEIVED', 'PRICE_CONFIRMED', 'SENT_TO_RM', 'RM_REJECTED', 'RM_REVERIFICATION'].includes(l.current_status)).length;
      const completedCases = branchLeads.filter(l => l.current_status === 'CASE_COMPLETED').length;
      const revenue = payments.filter(p => branchUserIds.includes(p.created_by)).reduce((sum, p) => sum + Number(p.total_paid || 0), 0);
      const goldCollected = gold.filter(g => branchUserIds.includes(g.received_by)).reduce((sum, g) => sum + Number(g.net_weight || 0), 0);

      return {
        branch: branch.branch_name,
        totalLeads,
        approvedLeads,
        completedCases,
        revenue,
        goldCollected
      };
    });
  } else {
    return [];
  }
}

// 12. GET /api/md/reports
router.get('/reports', async (req, res) => {
  try {
    const { type } = req.query; // 'lead', 'revenue', 'gold', 'branch'
    const data = await getReportData(type);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// EXPORT TO EXCEL: GET /api/md/reports/export/excel
router.get('/reports/export/excel', async (req, res) => {
  try {
    const { type } = req.query;
    const data = await getReportData(type);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`${type || 'Report'} List`);

    // Styling helpers
    const headerFill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4D0711' } // Shiva Burgundy
    };
    const headerFont = {
      name: 'Arial',
      size: 11,
      bold: true,
      color: { argb: 'FFFFFFFF' }
    };

    if (type === 'lead') {
      worksheet.columns = [
        { header: 'Lead Number', key: 'lead_number', width: 20 },
        { header: 'Customer Name', key: 'customer_name', width: 25 },
        { header: 'Mobile', key: 'mobile', width: 15 },
        { header: 'District', key: 'district', width: 15 },
        { header: 'Status', key: 'current_status', width: 25 },
        { header: 'Gold Weight (g)', key: 'gold_weight', width: 15 },
        { header: 'Estimated Value (₹)', key: 'estimated_value', width: 20 },
        { header: 'Loan Amount (₹)', key: 'loan_amount', width: 20 },
        { header: 'Created Date', key: 'created_at', width: 25 }
      ];

      data.forEach(item => {
        worksheet.addRow({
          lead_number: item.lead_number,
          customer_name: item.customer_name,
          mobile: item.mobile,
          district: item.district || 'N/A',
          current_status: item.current_status.replace(/_/g, ' '),
          gold_weight: Number(item.gold_weight || 0),
          estimated_value: Number(item.estimated_value || 0),
          loan_amount: Number(item.loan_amount || 0),
          created_at: new Date(item.created_at).toLocaleString()
        });
      });
    } else if (type === 'revenue') {
      worksheet.columns = [
        { header: 'Lead Number', key: 'lead_number', width: 20 },
        { header: 'Customer Name', key: 'customer_name', width: 25 },
        { header: 'Amount Paid (₹)', key: 'total_paid', width: 20 },
        { header: 'Payment Mode', key: 'payment_mode', width: 15 },
        { header: 'Transaction ID', key: 'transaction_number', width: 25 },
        { header: 'Payment Date', key: 'payment_date', width: 25 }
      ];

      data.forEach(item => {
        worksheet.addRow({
          lead_number: item.lead?.lead_number || 'N/A',
          customer_name: item.lead?.customer_name || 'N/A',
          total_paid: Number(item.total_paid || 0),
          payment_mode: item.payment_mode || 'N/A',
          transaction_number: item.transaction_number || 'N/A',
          payment_date: item.payment_date ? new Date(item.payment_date).toLocaleString() : 'N/A'
        });
      });
    } else if (type === 'gold') {
      worksheet.columns = [
        { header: 'Lead Number', key: 'lead_number', width: 20 },
        { header: 'Customer Name', key: 'customer_name', width: 25 },
        { header: 'Gross Weight (g)', key: 'gross_weight', width: 18 },
        { header: 'Net Weight (g)', key: 'net_weight', width: 18 },
        { header: 'Purity (%)', key: 'purity', width: 12 },
        { header: 'Purchase Value (₹)', key: 'purchase_amount', width: 20 },
        { header: 'Received Date', key: 'received_date', width: 25 }
      ];

      data.forEach(item => {
        worksheet.addRow({
          lead_number: item.lead?.lead_number || 'N/A',
          customer_name: item.lead?.customer_name || 'N/A',
          gross_weight: Number(item.gross_weight || 0),
          net_weight: Number(item.net_weight || 0),
          purity: Number(item.purity || 0),
          purchase_amount: Number(item.purchase_amount || 0),
          received_date: item.received_date ? new Date(item.received_date).toLocaleString() : 'N/A'
        });
      });
    } else if (type === 'branch') {
      worksheet.columns = [
        { header: 'Branch Name', key: 'branch', width: 25 },
        { header: 'Total Leads', key: 'totalLeads', width: 15 },
        { header: 'Approved Leads', key: 'approvedLeads', width: 18 },
        { header: 'Completed Cases', key: 'completedCases', width: 18 },
        { header: 'Revenue (₹)', key: 'revenue', width: 20 },
        { header: 'Gold Collected (g)', key: 'goldCollected', width: 20 }
      ];

      data.forEach(item => {
        worksheet.addRow({
          branch: item.branch,
          totalLeads: item.totalLeads,
          approvedLeads: item.approvedLeads,
          completedCases: item.completedCases,
          revenue: Number(item.revenue || 0),
          goldCollected: Number(item.goldCollected || 0)
        });
      });
    }

    // Apply header style
    worksheet.getRow(1).eachCell(cell => {
      cell.fill = headerFill;
      cell.font = headerFont;
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=ShivaGold_${type || 'report'}_${Date.now()}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// EXPORT TO PDF: GET /api/md/reports/export/pdf
router.get('/reports/export/pdf', async (req, res) => {
  try {
    const { type } = req.query;
    const data = await getReportData(type);

    const doc = new PDFDocument({ margin: 30, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=ShivaGold_${type || 'report'}_${Date.now()}.pdf`);
    doc.pipe(res);

    // Title
    doc.fillColor('#4d0711').fontSize(18).text('SHIVA GOLD COMPANY', { align: 'center', bold: true });
    doc.fontSize(12).fillColor('#c3902c').text(`Managing Director Report: ${type.toUpperCase()} LIST`, { align: 'center' });
    doc.moveDown(1.5);

    // Metadata
    doc.fillColor('#333333').fontSize(9).text(`Report Generated On: ${new Date().toLocaleString()}`, { align: 'right' });
    doc.moveDown(1);

    // Draw content depending on type
    if (type === 'lead') {
      doc.fontSize(10);
      data.forEach((item, index) => {
        if (index > 0 && index % 6 === 0) doc.addPage();
        
        doc.fillColor('#4d0711').text(`Lead #${item.lead_number} - ${item.customer_name}`, { bold: true });
        doc.fillColor('#333333')
          .text(`  Mobile: ${item.mobile} | District: ${item.district || 'N/A'}`)
          .text(`  Status: ${item.current_status.replace(/_/g, ' ')}`)
          .text(`  Gold weight: ${item.gold_weight} g | Estimated Value: ₹${Number(item.estimated_value || 0).toLocaleString('en-IN')}`)
          .text(`  Loan Amount: ₹${Number(item.loan_amount || 0).toLocaleString('en-IN')}`)
          .text(`  Created Date: ${new Date(item.created_at).toLocaleString()}`);
        doc.moveDown(1);
      });
    } else if (type === 'revenue') {
      doc.fontSize(10);
      data.forEach((item, index) => {
        if (index > 0 && index % 7 === 0) doc.addPage();

        doc.fillColor('#4d0711').text(`Receipt for Lead: ${item.lead?.lead_number || 'N/A'} - ${item.lead?.customer_name || 'N/A'}`, { bold: true });
        doc.fillColor('#333333')
          .text(`  Total Paid: ₹${Number(item.total_paid || 0).toLocaleString('en-IN')}`)
          .text(`  Payment Mode: ${item.payment_mode || 'N/A'} | Tx: ${item.transaction_number || 'N/A'}`)
          .text(`  Payment Date: ${item.payment_date ? new Date(item.payment_date).toLocaleString() : 'N/A'}`);
        doc.moveDown(1);
      });
    } else if (type === 'gold') {
      doc.fontSize(10);
      data.forEach((item, index) => {
        if (index > 0 && index % 7 === 0) doc.addPage();

        doc.fillColor('#4d0711').text(`Collection for Lead: ${item.lead?.lead_number || 'N/A'} - ${item.lead?.customer_name || 'N/A'}`, { bold: true });
        doc.fillColor('#333333')
          .text(`  Gross Weight: ${item.gross_weight}g | Net Weight: ${item.net_weight}g | Purity: ${item.purity}%`)
          .text(`  Purchase Amount: ₹${Number(item.purchase_amount || 0).toLocaleString('en-IN')}`)
          .text(`  Received Date: ${item.received_date ? new Date(item.received_date).toLocaleString() : 'N/A'}`);
        doc.moveDown(1);
      });
    } else if (type === 'branch') {
      doc.fontSize(10);
      data.forEach((item, index) => {
        doc.fillColor('#4d0711').text(`Branch: ${item.branch}`, { bold: true });
        doc.fillColor('#333333')
          .text(`  Leads Total: ${item.totalLeads} | Approved Leads: ${item.approvedLeads}`)
          .text(`  Completed Cases: ${item.completedCases}`)
          .text(`  Revenue Generated: ₹${Number(item.revenue || 0).toLocaleString('en-IN')}`)
          .text(`  Gold ornaments collected: ${item.goldCollected} g`);
        doc.moveDown(1.5);
      });
    }

    doc.end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 30. GET /api/md/expenses (Retrieves all executive expenses and analytics)
router.get('/expenses', async (req, res) => {
  try {
    const { data: logs, error } = await supabase
      .from('audit_logs')
      .select(`
        id,
        user_id,
        created_at,
        new_value,
        users:user_id ( name, employee_code )
      `)
      .eq('module', 'EXPENSE')
      .eq('action', 'SUBMIT')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const leadIds = logs
      .map(log => log.new_value?.lead_id)
      .filter(id => !!id);

    let leadsMap = {};
    if (leadIds.length > 0) {
      const { data: leads, error: leadsErr } = await supabase
        .from('leads')
        .select('id, lead_number, customer_name')
        .in('id', leadIds);
      if (leadsErr) throw leadsErr;
      
      leads.forEach(l => {
        leadsMap[l.id] = l;
      });
    }

    let totalExpenses = 0;
    const executiveSummary = {};

    const formattedLogs = logs.map(log => {
      let payload = log.new_value || {};
      if (typeof payload === 'string') {
        try {
          payload = JSON.parse(payload);
        } catch (e) {
          payload = {};
        }
      }
      const amount = Number(payload.amount || 0);
      const leadId = payload.lead_id;
      const lead = leadsMap[leadId] || { lead_number: 'N/A', customer_name: 'N/A' };
      const execName = log.users?.name || 'Unknown Executive';
      const execCode = log.users?.employee_code || 'EX-N/A';

      totalExpenses += amount;

      if (log.user_id) {
        if (!executiveSummary[log.user_id]) {
          executiveSummary[log.user_id] = {
            id: log.user_id,
            name: execName,
            employee_code: execCode,
            totalAmount: 0,
            count: 0
          };
        }
        executiveSummary[log.user_id].totalAmount += amount;
        executiveSummary[log.user_id].count += 1;
      }

      return {
        id: log.id,
        executive_id: log.user_id,
        executive_name: execName,
        executive_code: execCode,
        lead_id: leadId,
        lead_number: lead.lead_number,
        customer_name: lead.customer_name,
        amount,
        remarks: payload.remarks || 'No remarks provided',
        created_at: log.created_at
      };
    });

    res.json({
      totalExpenses,
      executiveSummary: Object.values(executiveSummary),
      logs: formattedLogs
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
