require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Helper to validate and default UUIDs
function toValidUuid(id) {
  if (!id) return null;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id) ? id : null;
}

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'shivagold_super_secret_jwt_key_2026';

// Enable Helmet to set security headers and hide X-Powered-By
app.use(helmet());

// CORS configuration - limit origins, allow localhost:3000, 127.0.0.1:3000 and process.env.FRONTEND_URL
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
        return callback(null, true);
      }
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

// Enable JSON and urlencoded parsing with large limit for documents/attachments
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ limit: '200mb', extended: true }));

// Rate Limiting (limit every endpoint)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs for development / analytics queries
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP, please try again after 15 minutes.' }
});
app.use(globalLimiter);

// Auth Rate Limiter
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // Limit login attempts to 15 per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again after 15 minutes.' }
});

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
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('CRITICAL: Supabase environment variables are missing!');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// =========================================================================
// SECURITY MIDDLEWARES & HELPERS
// =========================================================================

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Shiva Gold Management System Backend API is active.', dbConnected: !!supabaseUrl });
});

// Authentication Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required. Please sign in.' });
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Session expired or invalid token. Please sign in again.' });
    }
    req.user = user;
    next();
  });
}

// Role Authorization Middleware
function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }
    
    const userRole = req.user.role.toUpperCase();
    const normalizedRoles = allowedRoles.map(r => r.toUpperCase());
    
    if (!normalizedRoles.includes(userRole)) {
      return res.status(403).json({ error: `Forbidden: This action requires one of the following roles: ${allowedRoles.join(', ')}` });
    }
    next();
  };
}

// Migrate legacy plain 'hash' passwords to bcrypt
async function migrateLegacyPasswords() {
  try {
    const { data: usersToMigrate, error: findError } = await supabase
      .from('users')
      .select('id, password_hash')
      .eq('password_hash', 'hash');
    
    if (findError) {
      console.warn('[Security] Password migration check warning (tables might not be ready yet):', findError.message);
      return;
    }
    
    if (usersToMigrate && usersToMigrate.length > 0) {
      console.log(`[Security] Migrating ${usersToMigrate.length} legacy users with plain password hashes...`);
      const salt = bcrypt.genSaltSync(10);
      const defaultHash = bcrypt.hashSync('password123', salt);
      
      for (const user of usersToMigrate) {
        const { error: updateError } = await supabase
          .from('users')
          .update({ password_hash: defaultHash })
          .eq('id', user.id);
        
        if (updateError) {
          console.error(`[Security] Failed to migrate user ${user.id}:`, updateError.message);
        } else {
          console.log(`[Security] User ${user.id} password hash successfully updated to bcrypt`);
        }
      }
    }
  } catch (err) {
    console.error('[Security] Migration error:', err.message);
  }
}

// =========================================================================
// DATABASE SEED ROUTINE
// =========================================================================
async function seedDatabase() {
  try {
    // Check if users already exist
    const { data: existingUsers, error: userCheckError } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    if (userCheckError) {
      console.warn('Seeding check warning (tables might not be ready yet):', userCheckError.message);
      return;
    }

    if (existingUsers && existingUsers.length > 0) {
      console.log('Database already has users. Skipping auto-seed.');
      // Still attempt legacy password hashing upgrade if any exist
      await migrateLegacyPasswords();
      return;
    }

    console.log('Seeding database with default Siva Gold records...');

    // 1. Seed Branches
    const branchesData = [
      { branch_name: 'Vijayawada', city: 'Vijayawada', state: 'Andhra Pradesh', address: 'Vijayawada Branch Office' },
      { branch_name: 'Hyderabad', city: 'Hyderabad', state: 'Telangana', address: 'Hyderabad Branch Office' },
      { branch_name: 'Vizag', city: 'Visakhapatnam', state: 'Andhra Pradesh', address: 'Vizag Branch Office' }
    ];

    const { data: branches, error: branchErr } = await supabase.from('branches').insert(branchesData).select();
    if (branchErr) throw branchErr;

    const vijayawadaBranchId = branches[0].id;
    const hyderabadBranchId = branches[1].id;
    const vizagBranchId = branches[2].id;

    // 2. Seed Users (MD, RM, Telecaller, Executives)
    const salt = bcrypt.genSaltSync(10);
    const defaultHash = bcrypt.hashSync('password123', salt);
    
    const usersData = [
      { employee_code: 'MD001', name: 'Siva Prasad', mobile: '9999999999', email: 'md@sivagold.com', password_hash: defaultHash, role: 'MD', branch_id: vijayawadaBranchId, status: 'active' },
      { employee_code: 'RM001', name: 'Ramesh Kumar', mobile: '9888888888', email: 'rm@sivagold.com', password_hash: defaultHash, role: 'RM', branch_id: vijayawadaBranchId, status: 'active' },
      { employee_code: 'TC001', name: 'Anjali Sharma', mobile: '9777777777', email: 'tc@sivagold.com', password_hash: defaultHash, role: 'TELECALLER', branch_id: vijayawadaBranchId, status: 'active' },
      { employee_code: 'EX001', name: 'Vijay Kumar', mobile: '9666666661', email: 'ex1@sivagold.com', password_hash: defaultHash, role: 'EXECUTIVE', branch_id: vijayawadaBranchId, status: 'active' },
      { employee_code: 'EX002', name: 'Karthik', mobile: '9666666662', email: 'ex2@sivagold.com', password_hash: defaultHash, role: 'EXECUTIVE', branch_id: hyderabadBranchId, status: 'active' },
      { employee_code: 'EX003', name: 'Pradeep', mobile: '9666666663', email: 'ex3@sivagold.com', password_hash: defaultHash, role: 'EXECUTIVE', branch_id: hyderabadBranchId, status: 'active' },
      { employee_code: 'EX004', name: 'Suresh', mobile: '9666666664', email: 'ex4@sivagold.com', password_hash: defaultHash, role: 'EXECUTIVE', branch_id: vizagBranchId, status: 'active' },
      { employee_code: 'EX005', name: 'Ravi Teja', mobile: '9666666665', email: 'ex5@sivagold.com', password_hash: defaultHash, role: 'EXECUTIVE', branch_id: vizagBranchId, status: 'active' }
    ];

    const { data: users, error: userErr } = await supabase.from('users').insert(usersData).select();
    if (userErr) throw userErr;

    const rmUser = users.find(u => u.role === 'RM');
    const tcUser = users.find(u => u.role === 'TELECALLER');
    const exec1 = users.find(u => u.name === 'Vijay Kumar');
    const exec2 = users.find(u => u.name === 'Karthik');

    // Update manager_id for branches
    await supabase.from('branches').update({ manager_id: rmUser.id }).eq('id', vijayawadaBranchId);

    // 3. Seed Leads
    const leadsData = [
      {
        lead_number: 'SGC-2026-1052',
        customer_name: 'Ramesh Babu',
        mobile: '9988776655',
        alternate_mobile: '9988776656',
        address: 'MG Road, Benz Circle',
        district: 'Krishna',
        state: 'Andhra Pradesh',
        pincode: '520010',
        source: 'Website',
        gold_weight: 52.500,
        gold_type: 'Jewellery (Bangles & Chains)',
        estimated_value: 328125.00,
        bank_name: 'Muthoot Finance',
        branch_name: 'Benz Circle',
        loan_account_number: 'LH-99228833',
        loan_amount: 250000.00,
        telecaller_id: tcUser.id,
        rm_id: rmUser.id,
        current_status: 'SENT_TO_RM',
        customer_interest: 'High',
        expected_price: 330000.00,
        remarks: 'Customer wants to release pledged gold immediately.'
      },
      {
        lead_number: 'SGC-2026-1053',
        customer_name: 'Suresh Kumar',
        mobile: '9866554433',
        alternate_mobile: '',
        address: 'KPHB Colony',
        district: 'Hyderabad',
        state: 'Telangana',
        pincode: '500072',
        source: 'Google Ads',
        gold_weight: 40.000,
        gold_type: 'Gold Bars',
        estimated_value: 252000.00,
        bank_name: 'Manappuram',
        branch_name: 'KPHB',
        loan_account_number: 'LN-88339922',
        loan_amount: 180000.00,
        telecaller_id: tcUser.id,
        rm_id: rmUser.id,
        current_status: 'SENT_TO_RM',
        customer_interest: 'Medium',
        expected_price: 260000.00,
        remarks: 'Needs weekend visit'
      },
      {
        lead_number: 'SGC-2026-1054',
        customer_name: 'Anil Kumar',
        mobile: '9677889900',
        alternate_mobile: '',
        address: 'Gajuwaka',
        district: 'Visakhapatnam',
        state: 'Andhra Pradesh',
        pincode: '530026',
        source: 'Referrals',
        gold_weight: 35.200,
        gold_type: 'Jewellery',
        estimated_value: 221760.00,
        bank_name: 'HDFC Bank',
        branch_name: 'Gajuwaka',
        loan_account_number: 'LN-HDFC-991',
        loan_amount: 150000.00,
        telecaller_id: tcUser.id,
        rm_id: rmUser.id,
        current_status: 'SENT_TO_RM',
        customer_interest: 'High',
        expected_price: 225000.00,
        remarks: 'Pledged for 6 months. High interest rate.'
      },
      {
        lead_number: 'SGC-2026-1055',
        customer_name: 'Mahesh Reddy',
        mobile: '9544332211',
        alternate_mobile: '',
        address: 'Madhapur',
        district: 'Hyderabad',
        state: 'Telangana',
        pincode: '500081',
        source: 'Facebook Ads',
        gold_weight: 60.000,
        gold_type: 'Mixed Jewellery',
        estimated_value: 378000.00,
        bank_name: 'IIFL Finance',
        branch_name: 'Madhapur',
        loan_account_number: 'LN-IIFL-2283',
        loan_amount: 300000.00,
        telecaller_id: tcUser.id,
        rm_id: rmUser.id,
        current_status: 'SENT_TO_RM',
        customer_interest: 'High',
        expected_price: 380000.00,
        remarks: 'Customer is ready. Urgently wants to close.'
      },
      {
        lead_number: 'SGC-2026-1056',
        customer_name: 'Krishna Swamy',
        mobile: '9123456780',
        alternate_mobile: '',
        address: 'One Town',
        district: 'Krishna',
        state: 'Andhra Pradesh',
        pincode: '520001',
        source: 'Direct Calls',
        gold_weight: 45.000,
        gold_type: 'Jewellery',
        estimated_value: 283500.00,
        bank_name: 'KVB Finance',
        branch_name: 'One Town',
        loan_account_number: 'LN-KVB-8833',
        loan_amount: 220000.00,
        telecaller_id: tcUser.id,
        rm_id: rmUser.id,
        current_status: 'SENT_TO_RM',
        customer_interest: 'Low',
        expected_price: 290000.00,
        remarks: 'Still negotiating expected price.'
      },
      {
        lead_number: 'SGC-2026-1044',
        customer_name: 'Venkata Rao',
        mobile: '9000112233',
        alternate_mobile: '',
        address: 'Vijayawada Road',
        district: 'Krishna',
        state: 'Andhra Pradesh',
        pincode: '520008',
        source: 'Referrals',
        gold_weight: 25.000,
        gold_type: 'Coins',
        estimated_value: 157500.00,
        bank_name: 'SBI Gold Loan',
        branch_name: 'Patamata',
        loan_account_number: 'LN-SBI-882',
        loan_amount: 110000.00,
        telecaller_id: tcUser.id,
        rm_id: rmUser.id,
        current_status: 'RM_APPROVED',
        customer_interest: 'High',
        expected_price: 160000.00,
        remarks: 'RM Approved. Pending Executive assignment.'
      },
      {
        lead_number: 'SGC-2026-1048',
        customer_name: 'Sita Devi',
        mobile: '9111222333',
        alternate_mobile: '',
        address: 'Nizampet',
        district: 'Hyderabad',
        state: 'Telangana',
        pincode: '500090',
        source: 'Website',
        gold_weight: 30.500,
        gold_type: 'Necklaces',
        estimated_value: 192150.00,
        bank_name: 'ICICI Bank',
        branch_name: 'Nizampet',
        loan_account_number: 'LN-ICICI-881',
        loan_amount: 140000.00,
        telecaller_id: tcUser.id,
        rm_id: rmUser.id,
        current_status: 'RM_REVERIFICATION',
        customer_interest: 'Medium',
        expected_price: 195000.00,
        remarks: 'Returned for reverifying actual gold weight slip.'
      },
      {
        lead_number: 'SGC-2026-1046',
        customer_name: 'Prasad Rao',
        mobile: '9222333444',
        alternate_mobile: '',
        address: 'Dwaraka Nagar',
        district: 'Visakhapatnam',
        state: 'Andhra Pradesh',
        pincode: '530016',
        source: 'Walk-ins',
        gold_weight: 15.000,
        gold_type: 'Rings',
        estimated_value: 94500.00,
        bank_name: 'Muthoot',
        branch_name: 'Dwaraka Nagar',
        loan_account_number: 'LN-MUT-228',
        loan_amount: 80000.00,
        telecaller_id: tcUser.id,
        rm_id: rmUser.id,
        current_status: 'RM_REJECTED',
        customer_interest: 'Low',
        expected_price: 90000.00,
        remarks: 'Rejected: Gold weight discrepancy found in slip.'
      },
      {
        lead_number: 'SGC-2026-1050',
        customer_name: 'Koteswara Rao',
        mobile: '9333444555',
        alternate_mobile: '',
        address: 'Patamata',
        district: 'Krishna',
        state: 'Andhra Pradesh',
        pincode: '520010',
        source: 'Website',
        gold_weight: 80.000,
        gold_type: 'Mixed gold ornaments',
        estimated_value: 504000.00,
        bank_name: 'SBI Patamata',
        branch_name: 'Patamata',
        loan_account_number: 'SBI-PAT-992',
        loan_amount: 400000.00,
        telecaller_id: tcUser.id,
        rm_id: rmUser.id,
        executive_id: exec1.id,
        current_status: 'EXECUTIVE_ASSIGNED',
        customer_interest: 'High',
        expected_price: 510000.00,
        remarks: 'Executive assigned for bank release.'
      },
      {
        lead_number: 'SGC-2026-1042',
        customer_name: 'Rajesh Kumar',
        mobile: '9444555666',
        alternate_mobile: '',
        address: 'Secunderabad',
        district: 'Hyderabad',
        state: 'Telangana',
        pincode: '500003',
        source: 'Facebook Ads',
        gold_weight: 35.000,
        gold_type: 'Bangles',
        estimated_value: 220500.00,
        bank_name: 'SBI Secunderabad',
        branch_name: 'Secunderabad',
        loan_account_number: 'SBI-SEC-883',
        loan_amount: 160000.00,
        telecaller_id: tcUser.id,
        rm_id: rmUser.id,
        executive_id: exec2.id,
        current_status: 'CASE_COMPLETED',
        customer_interest: 'High',
        expected_price: 220000.00,
        remarks: 'Case closed. Payout completed.'
      }
    ];

    const { data: leads, error: leadErr } = await supabase.from('leads').insert(leadsData).select();
    if (leadErr) throw leadErr;

    // 4. Seed Lead Documents & Timeline
    console.log('Seeding documents and timeline details...');
    for (const lead of leads) {
      // Create default timeline
      const timelineData = [
        { lead_id: lead.id, status: 'CUSTOMER_DETAILS_CREATED', remarks: 'Customer details added by Telecaller.', updated_by: tcUser.id },
        { lead_id: lead.id, status: 'DETAILS_COLLECTED', remarks: 'Gold & loan statements gathered.', updated_by: tcUser.id }
      ];

      if (lead.current_status === 'SENT_TO_RM') {
        timelineData.push({ lead_id: lead.id, status: 'SENT_TO_RM', remarks: 'Lead submitted to Regional Manager.', updated_by: tcUser.id });
      } else if (lead.current_status === 'RM_APPROVED') {
        timelineData.push(
          { lead_id: lead.id, status: 'SENT_TO_RM', remarks: 'Lead submitted to Regional Manager.', updated_by: tcUser.id },
          { lead_id: lead.id, status: 'RM_APPROVED', remarks: 'Approved by RM. Ready for Executive.', updated_by: rmUser.id }
        );
      } else if (lead.current_status === 'RM_REVERIFICATION') {
        timelineData.push(
          { lead_id: lead.id, status: 'SENT_TO_RM', remarks: 'Lead submitted to Regional Manager.', updated_by: tcUser.id },
          { lead_id: lead.id, status: 'RM_REVERIFICATION', remarks: 'Returned to Telecaller. Reason: Weight verification.', updated_by: rmUser.id }
        );
      } else if (lead.current_status === 'RM_REJECTED') {
        timelineData.push(
          { lead_id: lead.id, status: 'SENT_TO_RM', remarks: 'Lead submitted to Regional Manager.', updated_by: tcUser.id },
          { lead_id: lead.id, status: 'RM_REJECTED', remarks: 'Rejected. Reason: Gold weight mismatch.', updated_by: rmUser.id }
        );
      } else if (lead.current_status === 'EXECUTIVE_ASSIGNED') {
        timelineData.push(
          { lead_id: lead.id, status: 'SENT_TO_RM', remarks: 'Lead submitted to Regional Manager.', updated_by: tcUser.id },
          { lead_id: lead.id, status: 'RM_APPROVED', remarks: 'Approved by RM.', updated_by: rmUser.id },
          { lead_id: lead.id, status: 'EXECUTIVE_ASSIGNED', remarks: `Executive ${exec1.name} assigned by RM.`, updated_by: rmUser.id }
        );
      } else if (lead.current_status === 'CASE_COMPLETED') {
        timelineData.push(
          { lead_id: lead.id, status: 'SENT_TO_RM', remarks: 'Lead submitted to Regional Manager.', updated_by: tcUser.id },
          { lead_id: lead.id, status: 'RM_APPROVED', remarks: 'Approved by RM.', updated_by: rmUser.id },
          { lead_id: lead.id, status: 'EXECUTIVE_ASSIGNED', remarks: `Executive ${exec2.name} assigned.`, updated_by: rmUser.id },
          { lead_id: lead.id, status: 'BANK_VISIT', remarks: 'Bank visit started.', updated_by: exec2.id },
          { lead_id: lead.id, status: 'PAYMENT_COMPLETED', remarks: 'Pledged amount paid to bank.', updated_by: exec2.id },
          { lead_id: lead.id, status: 'GOLD_RECEIVED', remarks: 'Gold received from bank.', updated_by: exec2.id },
          { lead_id: lead.id, status: 'CASE_COMPLETED', remarks: 'Case completed successfully.', updated_by: exec2.id }
        );
      }

      await supabase.from('lead_timeline').insert(timelineData);

      // Create documents
      const docsData = [
        { lead_id: lead.id, document_type: 'LOAN_SLIP', file_url: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?w=800', uploaded_by: tcUser.id },
        { lead_id: lead.id, document_type: 'AADHAR', file_url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800', uploaded_by: tcUser.id }
      ];
      await supabase.from('lead_documents').insert(docsData);
    }

    console.log('Seeding completed successfully!');
  } catch (error) {
    console.error('Seeding error:', error);
  }
}

// Trigger DB seeding on backend startup
setTimeout(() => {
  seedDatabase();
}, 2000);


// =========================================================================
// AUTHENTICATION ENDPOINTS
// =========================================================================

app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password || !role) {
      return res.status(400).json({ error: 'Email, password and role are required.' });
    }
    
    // Query the user
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.trim().toLowerCase())
      .eq('status', 'active');
    
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    
    if (!users || users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials or user is inactive.' });
    }
    
    const user = users[0];
    
    // Check role
    if (user.role.toUpperCase() !== role.toUpperCase()) {
      return res.status(403).json({ error: `Access denied. Role mismatch for this portal.` });
    }
    
    // Verify password
    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    
    // Generate token
    const token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        employee_code: user.employee_code,
        branch_id: user.branch_id
      },
      JWT_SECRET,
      { expiresIn: '8h' }
    );
    
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        employee_code: user.employee_code,
        branch_id: user.branch_id
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Import and Register Routers for auth, executive and md
const authRoutes = require('./routes/auth');
const executiveRoutes = require('./routes/executive');
const mdRoutes = require('./routes/md');

app.use('/api/auth', authRoutes);
app.use('/api/executive', executiveRoutes);
app.use('/api/md', mdRoutes);

// =========================================================================
// TELECALLER ENDPOINTS
// =========================================================================

// 1. GET /api/telecaller/leads
app.get('/api/telecaller/leads', authenticateToken, requireRole(['TELECALLER']), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('leads')
      .select(`
        *,
        documents:lead_documents(*),
        interactions:customer_interactions(*),
        timeline:lead_timeline(*)
      `)
      .eq('telecaller_id', req.user.id)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. POST /api/telecaller/leads
app.post('/api/telecaller/leads', authenticateToken, requireRole(['TELECALLER']), async (req, res) => {
  try {
    const {
      customerName,
      mobile,
      alternateMobile,
      address,
      district,
      goldWeight,
      goldType,
      estimatedValue,
      bankName,
      branchName,
      loanAmount,
      loanAccountNumber,
      documents
    } = req.body;

    if (!customerName || !mobile || !goldWeight || !estimatedValue || !bankName || !loanAmount) {
      return res.status(400).json({ error: 'Required fields are missing.' });
    }

    const leadId = crypto.randomUUID();
    
    // Generate lead number based on count
    const { count, error: countErr } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true });
    
    if (countErr) throw countErr;
    
    const nextNum = (count || 0) + 1;
    const leadNumber = `SGC-2026-${nextNum.toString().padStart(4, '0')}`;

    const { data: lead, error: insertError } = await supabase
      .from('leads')
      .insert({
        id: leadId,
        lead_number: leadNumber,
        customer_name: customerName,
        mobile: mobile,
        alternate_mobile: alternateMobile || null,
        address: address || null,
        district: district || null,
        gold_weight: goldWeight,
        gold_type: goldType || null,
        estimated_value: estimatedValue,
        bank_name: bankName,
        branch_name: branchName || null,
        loan_amount: loanAmount,
        loan_account_number: loanAccountNumber || null,
        telecaller_id: req.user.id,
        current_status: 'CUSTOMER_DETAILS_CREATED'
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Insert documents
    if (documents && documents.length > 0) {
      const dbDocs = documents.map(d => ({
        id: crypto.randomUUID(),
        lead_id: leadId,
        document_type: d.documentType,
        file_url: d.fileUrl || '#',
        uploaded_by: req.user.id
      }));
      const { error: docErr } = await supabase.from('lead_documents').insert(dbDocs);
      if (docErr) console.error('Error inserting documents:', docErr);
    }

    // Insert initial timeline
    await supabase.from('lead_timeline').insert({
      lead_id: leadId,
      status: 'CUSTOMER_DETAILS_CREATED',
      remarks: 'Lead created in systems directory by Telecaller',
      updated_by: req.user.id
    });

    res.json({ success: true, lead });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. PUT /api/telecaller/leads/:id
app.put('/api/telecaller/leads/:id', authenticateToken, requireRole(['TELECALLER']), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      customerName,
      mobile,
      alternateMobile,
      address,
      district,
      goldWeight,
      goldType,
      estimatedValue,
      bankName,
      branchName,
      loanAmount,
      loanAccountNumber,
      status
    } = req.body;

    // Verify ownership
    const { data: leadCheck, error: checkError } = await supabase
      .from('leads')
      .select('telecaller_id, current_status')
      .eq('id', id)
      .single();
    
    if (checkError || !leadCheck) {
      return res.status(404).json({ error: 'Lead not found.' });
    }

    if (leadCheck.telecaller_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: You do not own this lead.' });
    }

    const { data: lead, error: updateError } = await supabase
      .from('leads')
      .update({
        customer_name: customerName,
        mobile: mobile,
        alternate_mobile: alternateMobile,
        address: address,
        district: district,
        gold_weight: goldWeight,
        gold_type: goldType,
        estimated_value: estimatedValue,
        bank_name: bankName,
        branch_name: branchName,
        loan_amount: loanAmount,
        loan_account_number: loanAccountNumber,
        current_status: status || leadCheck.current_status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Insert timeline
    await supabase.from('lead_timeline').insert({
      lead_id: id,
      status: status || leadCheck.current_status,
      remarks: 'Lead details modified by Telecaller',
      updated_by: req.user.id
    });

    res.json({ success: true, lead });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. POST /api/telecaller/leads/:id/followup
app.post('/api/telecaller/leads/:id/followup', authenticateToken, requireRole(['TELECALLER']), async (req, res) => {
  try {
    const { id } = req.params;
    const { date, remarks } = req.body;

    if (!date || !remarks) {
      return res.status(400).json({ error: 'Followup date and remarks are required.' });
    }

    // Verify ownership
    const { data: leadCheck, error: checkError } = await supabase
      .from('leads')
      .select('telecaller_id')
      .eq('id', id)
      .single();
    
    if (checkError || !leadCheck) {
      return res.status(404).json({ error: 'Lead not found.' });
    }

    if (leadCheck.telecaller_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: You do not own this lead.' });
    }

    // Add interaction log
    const { error: interactionError } = await supabase
      .from('customer_interactions')
      .insert({
        id: crypto.randomUUID(),
        lead_id: id,
        employee_id: req.user.id,
        interaction_type: 'FOLLOWUP',
        notes: `Followup Date: ${date} - ${remarks}`
      });

    if (interactionError) throw interactionError;

    // Update lead status to FOLLOWUP_IN_PROGRESS
    const { error: leadUpdateError } = await supabase
      .from('leads')
      .update({
        current_status: 'FOLLOWUP_IN_PROGRESS',
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (leadUpdateError) throw leadUpdateError;

    // Add timeline log
    await supabase.from('lead_timeline').insert({
      lead_id: id,
      status: 'FOLLOWUP_IN_PROGRESS',
      remarks: `Follow-up scheduled: ${remarks}`,
      updated_by: req.user.id
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. POST /api/telecaller/leads/:id/complete-followup
app.post('/api/telecaller/leads/:id/complete-followup', authenticateToken, requireRole(['TELECALLER']), async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;

    if (!remarks) {
      return res.status(400).json({ error: 'Remarks are required.' });
    }

    // Verify ownership
    const { data: leadCheck, error: checkError } = await supabase
      .from('leads')
      .select('telecaller_id')
      .eq('id', id)
      .single();
    
    if (checkError || !leadCheck) {
      return res.status(404).json({ error: 'Lead not found.' });
    }

    if (leadCheck.telecaller_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: You do not own this lead.' });
    }

    // Add completed call interaction log
    const { error: interactionError } = await supabase
      .from('customer_interactions')
      .insert({
        id: crypto.randomUUID(),
        lead_id: id,
        employee_id: req.user.id,
        interaction_type: 'CALL',
        notes: `Completed followup call: ${remarks}`
      });

    if (interactionError) throw interactionError;

    // Update lead status back to details created
    const { error: leadUpdateError } = await supabase
      .from('leads')
      .update({
        current_status: 'CUSTOMER_DETAILS_CREATED',
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (leadUpdateError) throw leadUpdateError;

    // Add timeline log
    await supabase.from('lead_timeline').insert({
      lead_id: id,
      status: 'CUSTOMER_DETAILS_CREATED',
      remarks: `Completed followup call log: ${remarks}`,
      updated_by: req.user.id
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =========================================================================
// REGIONAL MANAGER (RM) MODULE ENDPOINTS
// =========================================================================


// Helper to get active executives
app.get('/api/rm/executives', authenticateToken, requireRole(['RM']), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, mobile, status')
      .eq('role', 'EXECUTIVE')
      .eq('status', 'active');
    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper to get RM Profile
app.get('/api/rm/profile', authenticateToken, requireRole(['RM']), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*, branch:branch_id ( branch_name, city )')
      .eq('id', req.user.id)
      .single();
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 1. GET /api/rm/dashboard
app.get('/api/rm/dashboard', authenticateToken, requireRole(['RM']), async (req, res) => {
  try {
    // Get status counts
    const { data: allLeads, error: leadsError } = await supabase
      .from('leads')
      .select('id, current_status');
    if (leadsError) throw leadsError;

    const stats = {
      pendingVerification: 0,
      approvedLeads: 0,
      reVerificationLeads: 0,
      rejectedLeads: 0,
      executiveAssigned: 0,
      completedCases: 0
    };

    allLeads.forEach(lead => {
      const status = lead.current_status;
      if (status === 'SENT_TO_RM') stats.pendingVerification++;
      else if (status === 'RM_APPROVED') stats.approvedLeads++;
      else if (status === 'RM_REVERIFICATION') stats.reVerificationLeads++;
      else if (status === 'RM_REJECTED') stats.rejectedLeads++;
      else if (status === 'EXECUTIVE_ASSIGNED') stats.executiveAssigned++;
      else if (status === 'CASE_COMPLETED') stats.completedCases++;
      else if (['CUSTOMER_CALLED', 'VISIT_CONFIRMED', 'MD_FUNDS_APPROVED', 'JOURNEY_STARTED', 'REACHED_CUSTOMER', 'CUSTOMER_INTERACTION', 'BANK_VISIT', 'AGREEMENT_PENDING', 'PAYMENT_COMPLETED', 'GOLD_RECEIVED', 'BALANCE_SETTLED', 'IMAGES_UPLOADED'].includes(status)) {
        stats.executiveAssigned++;
      }
    });

    // Leads for Verification (SENT_TO_RM) limit 5
    const { data: pendingLeads, error: pendingError } = await supabase
      .from('leads')
      .select(`
        id, lead_number, customer_name, mobile, bank_name, gold_weight, loan_amount, current_status, created_at,
        telecaller:telecaller_id ( name )
      `)
      .eq('current_status', 'SENT_TO_RM')
      .order('created_at', { ascending: false })
      .limit(5);
    if (pendingError) throw pendingError;

    // Executives list and workload
    const { data: executives, error: execError } = await supabase
      .from('users')
      .select('id, name')
      .eq('role', 'EXECUTIVE');
    if (execError) throw execError;

    const executiveLoad = await Promise.all(executives.map(async (exec) => {
      const { count, error: countErr } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('executive_id', exec.id)
        .not('current_status', 'in', '("CASE_COMPLETED", "RM_REJECTED")');

      return {
        id: exec.id,
        name: exec.name,
        assignedCount: count || 0
      };
    }));

    // Recent Activity from timeline
    const { data: timeline, error: timelineError } = await supabase
      .from('lead_timeline')
      .select(`
        id, lead_id, status, remarks, created_at,
        leads:lead_id ( lead_number ),
        users:updated_by ( name )
      `)
      .order('created_at', { ascending: false })
      .limit(5);
    if (timelineError) throw timelineError;

    res.json({
      stats,
      pendingLeads: pendingLeads || [],
      executiveLoad: executiveLoad || [],
      recentActivity: timeline || []
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. GET /api/rm/pending-leads
app.get('/api/rm/pending-leads', authenticateToken, requireRole(['RM']), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('leads')
      .select(`
        id, lead_number, customer_name, mobile, district, gold_weight, loan_amount, current_status, created_at,
        telecaller:telecaller_id ( name )
      `)
      .eq('current_status', 'SENT_TO_RM')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. GET /api/rm/lead/:id
app.get('/api/rm/lead/:id', authenticateToken, requireRole(['RM']), async (req, res) => {
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

    res.json({
      lead,
      documents: documents || [],
      timeline: timeline || []
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. POST /api/rm/approve
app.post('/api/rm/approve', authenticateToken, requireRole(['RM']), async (req, res) => {
  try {
    const { leadId, remarks, approvalNotes } = req.body;
    if (!leadId) return res.status(400).json({ error: 'leadId is required' });

    const rmId = req.user.id;

    const { data, error } = await supabase
      .from('leads')
      .update({ current_status: 'RM_APPROVED', rm_id: rmId })
      .eq('id', leadId)
      .select()
      .single();
    if (error) throw error;

    const fullRemarks = `Approved by RM. Remarks: ${remarks || ''}. Notes: ${approvalNotes || ''}`;
    const { error: timelineErr } = await supabase
      .from('lead_timeline')
      .insert({
        lead_id: leadId,
        status: 'RM_APPROVED',
        remarks: fullRemarks,
        updated_by: rmId
      });
    if (timelineErr) throw timelineErr;

    res.json({ success: true, lead: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. POST /api/rm/reverify
app.post('/api/rm/reverify', authenticateToken, requireRole(['RM']), async (req, res) => {
  try {
    const { leadId, reason, requiredInformation, remarks } = req.body;
    if (!leadId) return res.status(400).json({ error: 'leadId is required' });

    const rmId = req.user.id;

    const { data, error } = await supabase
      .from('leads')
      .update({ current_status: 'RM_REVERIFICATION', rm_id: rmId })
      .eq('id', leadId)
      .select()
      .single();
    if (error) throw error;

    const fullRemarks = `Re-verification requested. Reason: ${reason || ''}. Required: ${requiredInformation || ''}. Remarks: ${remarks || ''}`;
    const { error: timelineErr } = await supabase
      .from('lead_timeline')
      .insert({
        lead_id: leadId,
        status: 'RM_REVERIFICATION',
        remarks: fullRemarks,
        updated_by: rmId
      });
    if (timelineErr) throw timelineErr;

    res.json({ success: true, lead: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 6. POST /api/rm/reject
app.post('/api/rm/reject', authenticateToken, requireRole(['RM']), async (req, res) => {
  try {
    const { leadId, rejectionReason, remarks } = req.body;
    if (!leadId) return res.status(400).json({ error: 'leadId is required' });

    const rmId = req.user.id;

    const { data, error } = await supabase
      .from('leads')
      .update({ current_status: 'RM_REJECTED', rm_id: rmId })
      .eq('id', leadId)
      .select()
      .single();
    if (error) throw error;

    const fullRemarks = `Rejected by RM. Reason: ${rejectionReason || ''}. Remarks: ${remarks || ''}`;
    const { error: timelineErr } = await supabase
      .from('lead_timeline')
      .insert({
        lead_id: leadId,
        status: 'RM_REJECTED',
        remarks: fullRemarks,
        updated_by: rmId
      });
    if (timelineErr) throw timelineErr;

    res.json({ success: true, lead: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 7. POST /api/rm/assign-executive
app.post('/api/rm/assign-executive', authenticateToken, requireRole(['RM']), async (req, res) => {
  try {
    const { leadId, executiveId } = req.body;
    if (!leadId || !executiveId) return res.status(400).json({ error: 'leadId and executiveId are required' });

    const rmId = req.user.id;

    const { data: execUser, error: userError } = await supabase
      .from('users')
      .select('name')
      .eq('id', executiveId)
      .single();
    if (userError) throw userError;

    const { data, error } = await supabase
      .from('leads')
      .update({ 
        current_status: 'EXECUTIVE_ASSIGNED', 
        executive_id: executiveId,
        rm_id: rmId 
      })
      .eq('id', leadId)
      .select()
      .single();
    if (error) throw error;

    const fullRemarks = `Executive assigned: ${execUser.name}`;
    const { error: timelineErr } = await supabase
      .from('lead_timeline')
      .insert({
        lead_id: leadId,
        status: 'EXECUTIVE_ASSIGNED',
        remarks: fullRemarks,
        updated_by: rmId
      });
    if (timelineErr) throw timelineErr;

    res.json({ success: true, lead: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 8. GET /api/rm/approved-leads
app.get('/api/rm/approved-leads', authenticateToken, requireRole(['RM']), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('leads')
      .select(`
        id, lead_number, customer_name, district, gold_weight, loan_amount, current_status, updated_at,
        executive:executive_id ( name )
      `)
      .in('current_status', ['RM_APPROVED', 'EXECUTIVE_ASSIGNED', 'CUSTOMER_CALLED', 'VISIT_CONFIRMED', 'MD_FUNDS_APPROVED', 'JOURNEY_STARTED', 'REACHED_CUSTOMER', 'CUSTOMER_INTERACTION', 'BANK_VISIT', 'AGREEMENT_PENDING', 'PAYMENT_COMPLETED', 'GOLD_RECEIVED', 'BALANCE_SETTLED', 'IMAGES_UPLOADED'])
      .order('updated_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 9. GET /api/rm/rejected-leads
app.get('/api/rm/rejected-leads', authenticateToken, requireRole(['RM']), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('leads')
      .select(`
        id, lead_number, customer_name, current_status, updated_at,
        rm:rm_id ( name ),
        timeline:lead_timeline ( remarks, status )
      `)
      .eq('current_status', 'RM_REJECTED')
      .order('updated_at', { ascending: false });
    if (error) throw error;

    const response = data.map(lead => {
      const rejectTimeline = lead.timeline?.find(t => t.status === 'RM_REJECTED');
      return {
        id: lead.id,
        lead_number: lead.lead_number,
        customer_name: lead.customer_name,
        current_status: lead.current_status,
        updated_at: lead.updated_at,
        rejected_by: lead.rm?.name || 'RM',
        reason: rejectTimeline ? rejectTimeline.remarks.replace('Rejected by RM. Reason: ', '') : 'Gold value / purity issue'
      };
    });

    res.json(response || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 10. GET /api/rm/reverification-leads
app.get('/api/rm/reverification-leads', authenticateToken, requireRole(['RM']), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('leads')
      .select(`
        id, lead_number, customer_name, current_status, updated_at,
        timeline:lead_timeline ( remarks, status )
      `)
      .eq('current_status', 'RM_REVERIFICATION')
      .order('updated_at', { ascending: false });
    if (error) throw error;

    const response = data.map(lead => {
      const reverifyTimeline = lead.timeline?.find(t => t.status === 'RM_REVERIFICATION');
      return {
        id: lead.id,
        lead_number: lead.lead_number,
        customer_name: lead.customer_name,
        current_status: lead.current_status,
        updated_at: lead.updated_at,
        reason: reverifyTimeline ? reverifyTimeline.remarks.replace('Re-verification requested. Reason: ', '') : 'Pending verification details'
      };
    });

    res.json(response || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 11. GET /api/rm/completed-leads
app.get('/api/rm/completed-leads', authenticateToken, requireRole(['RM']), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('leads')
      .select(`
        id, lead_number, customer_name, gold_weight, expected_price, updated_at,
        executive:executive_id ( name )
      `)
      .eq('current_status', 'CASE_COMPLETED')
      .order('updated_at', { ascending: false });
    if (error) throw error;

    const response = data.map(lead => ({
      id: lead.id,
      lead_number: lead.lead_number,
      customer_name: lead.customer_name,
      gold_weight: lead.gold_weight,
      purchase_amount: lead.expected_price || 0,
      completion_date: lead.updated_at,
      executive_name: lead.executive?.name || 'Unassigned'
    }));

    res.json(response || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 12. GET /api/rm/reports
app.get('/api/rm/reports', authenticateToken, requireRole(['RM']), async (req, res) => {
  try {
    const { filter } = req.query; // 'today', 'week', 'month'
    let dateFilter = new Date();
    
    if (filter === 'today') {
      dateFilter.setHours(0, 0, 0, 0);
    } else if (filter === 'week') {
      const day = dateFilter.getDay();
      const diff = dateFilter.getDate() - day + (day === 0 ? -6 : 1);
      dateFilter.setDate(diff);
      dateFilter.setHours(0, 0, 0, 0);
    } else {
      dateFilter.setDate(1);
      dateFilter.setHours(0, 0, 0, 0);
    }

    const { data: leads, error } = await supabase
      .from('leads')
      .select('id, current_status, created_at')
      .gte('created_at', dateFilter.toISOString());
    if (error) throw error;

    const metrics = {
      totalLeads: leads.length,
      approvedLeads: 0,
      rejectedLeads: 0,
      reVerificationLeads: 0,
      executiveAssigned: 0,
      approvalRate: 0
    };

    leads.forEach(lead => {
      const status = lead.current_status;
      if (['RM_APPROVED', 'EXECUTIVE_ASSIGNED', 'CUSTOMER_CALLED', 'VISIT_CONFIRMED', 'MD_FUNDS_APPROVED', 'JOURNEY_STARTED', 'REACHED_CUSTOMER', 'CUSTOMER_INTERACTION', 'BANK_VISIT', 'AGREEMENT_PENDING', 'PAYMENT_COMPLETED', 'GOLD_RECEIVED', 'BALANCE_SETTLED', 'IMAGES_UPLOADED', 'CASE_COMPLETED'].includes(status)) {
        metrics.approvedLeads++;
      }
      if (status === 'RM_REJECTED') {
        metrics.rejectedLeads++;
      }
      if (status === 'RM_REVERIFICATION') {
        metrics.reVerificationLeads++;
      }
      if (['EXECUTIVE_ASSIGNED', 'CUSTOMER_CALLED', 'VISIT_CONFIRMED', 'MD_FUNDS_APPROVED', 'JOURNEY_STARTED', 'REACHED_CUSTOMER', 'CUSTOMER_INTERACTION', 'BANK_VISIT', 'AGREEMENT_PENDING', 'PAYMENT_COMPLETED', 'GOLD_RECEIVED', 'BALANCE_SETTLED', 'IMAGES_UPLOADED', 'CASE_COMPLETED'].includes(status)) {
        metrics.executiveAssigned++;
      }
    });

    metrics.approvalRate = metrics.totalLeads > 0 
      ? Math.round((metrics.approvedLeads / metrics.totalLeads) * 100) 
      : 0;

    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =========================================================================
// STANDARD ENDPOINTS
// =========================================================================
// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running smoothly', dbConnected: !!supabaseUrl });
});

// 1. GET /api/leads - Fetch all leads with nested relationships
app.get('/api/leads', authenticateToken, requireRole(['TELECALLER']), async (req, res) => {
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
      return res.status(400).json({ error: error.message });
    }

    res.json(dbLeads || []);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// 2. POST /api/leads - Create a new lead
app.post('/api/leads', authenticateToken, requireRole(['TELECALLER']), async (req, res) => {
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
      documents
    } = req.body;

    const telecaller_id = req.user.id;

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
        telecaller_id
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
      updated_by: telecaller_id
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
app.put('/api/leads/:id', authenticateToken, requireRole(['TELECALLER']), async (req, res) => {
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
      current_status
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
      updated_by: req.user.id
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
app.patch('/api/leads/:id/status', authenticateToken, requireRole(['TELECALLER']), async (req, res) => {
  try {
    const { id } = req.params;
    const { current_status, remarks } = req.body;
    const telecaller_id = req.user.id;

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
      updated_by: telecaller_id
    });

    res.json(leadData);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// 5. POST /api/leads/:id/followups - Schedule a follow-up
app.post('/api/leads/:id/followups', authenticateToken, requireRole(['TELECALLER']), async (req, res) => {
  try {
    const { id } = req.params;
    const { date, remarks } = req.body;
    const telecaller_id = req.user.id;

    // Add customer interaction log
    const { error: interactionError } = await supabase
      .from('customer_interactions')
      .insert({
        id: crypto.randomUUID(),
        lead_id: id,
        employee_id: telecaller_id,
        interaction_type: 'FOLLOWUP',
        notes: `Followup Date: ${date} - ${remarks}`
      });

    if (interactionError) {
      return res.status(400).json({ error: interactionError.message });
    }

    // Update lead status to FOLLOW-UP
    const { data: leadData, error: updateError } = await supabase
      .from('leads')
      .update({
        current_status: 'FOLLOW-UP',
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
      status: 'FOLLOW-UP',
      remarks: `Follow-up scheduled: ${remarks}`,
      updated_by: telecaller_id
    });

    res.json(leadData);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// 6. PATCH /api/leads/:id/followups/:followupId/complete - Complete a follow-up
app.patch('/api/leads/:id/followups/:followupId/complete', authenticateToken, requireRole(['TELECALLER']), async (req, res) => {
  try {
    const { id, followupId } = req.params;
    const { remarks } = req.body;
    const telecaller_id = req.user.id;

    // Add completed interaction log
    const { error: interactionError } = await supabase
      .from('customer_interactions')
      .insert({
        id: crypto.randomUUID(),
        lead_id: id,
        employee_id: telecaller_id,
        interaction_type: 'CALL',
        notes: `Completed followup call: ${remarks}`
      });

    if (interactionError) {
      return res.status(400).json({ error: interactionError.message });
    }

    // Update lead status back to CUSTOMER_DETAILS_CREATED (or status of choice)
    const { data: leadData, error: updateError } = await supabase
      .from('leads')
      .update({
        current_status: 'CUSTOMER_DETAILS_CREATED',
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
      status: 'CUSTOMER_DETAILS_CREATED',
      remarks: `Completed followup call log: ${remarks}`,
      updated_by: telecaller_id
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

// Endpoint to verify Supabase connection
app.get('/api/supabase-check', async (req, res) => {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      return res.status(500).json({
        status: 'error',
        message: 'Supabase URL or Anon Key is not configured in .env',
      });
    }

    const { error, status } = await supabase
      .from('companies')
      .select('*', { count: 'exact', head: true });

    if (status === 401) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid API key or unauthorized',
        details: error?.message || 'Access denied by database gateway.',
      });
    }

    if (status === 404 && error?.code === 'PGRST205') {
      return res.json({
        status: 'success',
        message: 'Successfully connected to Supabase',
        details: 'Database is online and authenticated. Table "companies" is not found in schema cache, which is expected.',
      });
    }

    if (status >= 200 && status < 300) {
      return res.json({
        status: 'success',
        message: 'Successfully connected to Supabase',
        details: 'Database is online and "companies" table was queried successfully.',
      });
    }

    return res.status(status || 500).json({
      status: 'error',
      message: error?.message || 'Database connection error',
      details: error,
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'Failed to connect to Supabase',
      details: error.message,
    });
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
