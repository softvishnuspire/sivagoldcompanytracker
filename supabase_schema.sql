-- Siva Gold Company Management System - Supabase PostgreSQL Schema
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================================
-- 1. CREATE CUSTOM ENUMS
-- =========================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('MD', 'RM', 'TELECALLER', 'EXECUTIVE', 'ADMIN');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lead_status') THEN
        CREATE TYPE lead_status AS ENUM (
            'CUSTOMER_DETAILS_CREATED',
            'FOLLOWUP_IN_PROGRESS',
            'DETAILS_COLLECTED',
            'DOCUMENTS_RECEIVED',
            'PRICE_CONFIRMED',
            'SENT_TO_RM',
            'RM_APPROVED',
            'RM_REVERIFICATION',
            'RM_REJECTED',
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
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_type') THEN
        CREATE TYPE document_type AS ENUM (
            'LOAN_SLIP',
            'LOAN_STATEMENT',
            'AADHAR',
            'PAN',
            'BANK_DOCUMENT',
            'AGREEMENT',
            'PAYMENT_PROOF',
            'OTHER'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'interaction_type') THEN
        CREATE TYPE interaction_type AS ENUM (
            'CALL',
            'FOLLOWUP',
            'VISIT',
            'WHATSAPP',
            'SMS',
            'MEETING'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fund_request_status') THEN
        CREATE TYPE fund_request_status AS ENUM (
            'PENDING',
            'APPROVED',
            'REJECTED'
        );
    END IF;
END$$;

-- =========================================================================
-- 2. CREATE TABLES
-- =========================================================================

-- Branches Table
CREATE TABLE IF NOT EXISTS branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_name TEXT NOT NULL,
    city TEXT,
    state TEXT,
    address TEXT,
    manager_id UUID, -- Foreign Key referencing users (added via ALTER table to avoid circular ref)
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    mobile TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role user_role NOT NULL,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Link branches manager_id back to users(id) now that users table is created
ALTER TABLE branches 
    DROP CONSTRAINT IF EXISTS fk_branches_manager_id,
    ADD CONSTRAINT fk_branches_manager_id FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL;

-- Lead Sources Master Table
CREATE TABLE IF NOT EXISTS lead_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_name TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'active'
);

-- Leads Table
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_number TEXT UNIQUE NOT NULL,
    customer_name TEXT NOT NULL,
    mobile TEXT NOT NULL,
    alternate_mobile TEXT,
    address TEXT,
    district TEXT,
    state TEXT,
    pincode TEXT,
    source TEXT,
    source_remarks TEXT,
    gold_weight NUMERIC(10,3),
    gold_type TEXT,
    estimated_value NUMERIC(12,2),
    bank_name TEXT,
    branch_name TEXT,
    loan_account_number TEXT,
    loan_amount NUMERIC(12,2),
    telecaller_id UUID REFERENCES users(id) ON DELETE SET NULL,
    rm_id UUID REFERENCES users(id) ON DELETE SET NULL,
    executive_id UUID REFERENCES users(id) ON DELETE SET NULL,
    current_status lead_status NOT NULL DEFAULT 'CUSTOMER_DETAILS_CREATED',
    customer_interest TEXT,
    expected_price NUMERIC(12,2),
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lead Timeline Table
CREATE TABLE IF NOT EXISTS lead_timeline (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    status lead_status NOT NULL,
    remarks TEXT,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    latitude NUMERIC(10,8),
    longitude NUMERIC(11,8),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lead Documents Table
CREATE TABLE IF NOT EXISTS lead_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    document_type document_type NOT NULL,
    file_url TEXT NOT NULL,
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Executive Visits Table
CREATE TABLE IF NOT EXISTS executive_visits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    executive_id UUID REFERENCES users(id) ON DELETE SET NULL,
    visit_date DATE NOT NULL,
    start_time TIMESTAMPTZ,
    reached_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    latitude NUMERIC(10,8),
    longitude NUMERIC(11,8),
    remarks TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Payments Table
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    approved_amount NUMERIC(12,2),
    loan_amount NUMERIC(12,2),
    balance_amount NUMERIC(12,2),
    total_paid NUMERIC(12,2),
    payment_mode TEXT,
    transaction_number TEXT,
    payment_date TIMESTAMPTZ,
    payment_proof TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Gold Collection Table
CREATE TABLE IF NOT EXISTS gold_collection (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    gross_weight NUMERIC(10,3) NOT NULL,
    net_weight NUMERIC(10,3) NOT NULL,
    purity NUMERIC(5,2),
    market_rate NUMERIC(12,2),
    purchase_rate NUMERIC(12,2),
    purchase_amount NUMERIC(12,2),
    received_by UUID REFERENCES users(id) ON DELETE SET NULL,
    received_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Gold Images Table
CREATE TABLE IF NOT EXISTS gold_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Customer Interactions Table
CREATE TABLE IF NOT EXISTS customer_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES users(id) ON DELETE SET NULL,
    interaction_type interaction_type NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    module TEXT NOT NULL,
    action TEXT NOT NULL,
    old_value JSONB,
    new_value JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- MD Fund Approval Table (fund_requests)
CREATE TABLE IF NOT EXISTS fund_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    requested_amount NUMERIC(12,2) NOT NULL,
    approved_amount NUMERIC(12,2),
    requested_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    status fund_request_status NOT NULL DEFAULT 'PENDING',
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================================
-- 3. CREATE INDEXES FOR SEARCH AND PERFORMANCE
-- =========================================================================
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_mobile ON users(mobile);
CREATE INDEX IF NOT EXISTS idx_users_branch_id ON users(branch_id);

CREATE INDEX IF NOT EXISTS idx_leads_lead_number ON leads(lead_number);
CREATE INDEX IF NOT EXISTS idx_leads_mobile ON leads(mobile);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(current_status);
CREATE INDEX IF NOT EXISTS idx_leads_telecaller ON leads(telecaller_id);
CREATE INDEX IF NOT EXISTS idx_leads_rm ON leads(rm_id);
CREATE INDEX IF NOT EXISTS idx_leads_executive ON leads(executive_id);

CREATE INDEX IF NOT EXISTS idx_timeline_lead_id ON lead_timeline(lead_id);
CREATE INDEX IF NOT EXISTS idx_documents_lead_id ON lead_documents(lead_id);
CREATE INDEX IF NOT EXISTS idx_visits_lead_id ON executive_visits(lead_id);
CREATE INDEX IF NOT EXISTS idx_payments_lead_id ON payments(lead_id);
CREATE INDEX IF NOT EXISTS idx_gold_col_lead_id ON gold_collection(lead_id);
CREATE INDEX IF NOT EXISTS idx_gold_img_lead_id ON gold_images(lead_id);
CREATE INDEX IF NOT EXISTS idx_interactions_lead_id ON customer_interactions(lead_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_funds_lead_id ON fund_requests(lead_id);

-- =========================================================================
-- 4. AUTO-UPDATE TIMESTAMPS TRIGGERS
-- =========================================================================
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER set_timestamp_users
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

CREATE OR REPLACE TRIGGER set_timestamp_leads
BEFORE UPDATE ON leads
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- =========================================================================
-- 5. SEED DATA - DEFAULT SOURCES
-- =========================================================================
INSERT INTO lead_sources (source_name) VALUES
('Website'),
('Facebook Ads'),
('Google Ads'),
('Referrals'),
('Direct Calls'),
('Walk-ins')
ON CONFLICT (source_name) DO NOTHING;
