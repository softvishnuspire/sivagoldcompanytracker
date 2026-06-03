-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.branches (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  branch_name text NOT NULL,
  city text,
  state text,
  address text,
  manager_id uuid,
  status text NOT NULL DEFAULT 'active'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT branches_pkey PRIMARY KEY (id),
  CONSTRAINT fk_branches_manager_id FOREIGN KEY (manager_id) REFERENCES public.users(id)
);
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  employee_code text NOT NULL UNIQUE,
  name text NOT NULL,
  mobile text NOT NULL UNIQUE,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role USER-DEFINED NOT NULL,
  branch_id uuid,
  status text NOT NULL DEFAULT 'active'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id)
);
CREATE TABLE public.lead_sources (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  source_name text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active'::text,
  CONSTRAINT lead_sources_pkey PRIMARY KEY (id)
);
CREATE TABLE public.leads (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  lead_number text NOT NULL UNIQUE,
  customer_name text NOT NULL,
  mobile text NOT NULL,
  alternate_mobile text,
  address text,
  district text,
  state text,
  pincode text,
  source text,
  source_remarks text,
  gold_weight numeric,
  gold_type text,
  estimated_value numeric,
  bank_name text,
  branch_name text,
  loan_account_number text,
  loan_amount numeric,
  telecaller_id uuid,
  rm_id uuid,
  executive_id uuid,
  current_status USER-DEFINED NOT NULL DEFAULT 'CUSTOMER_DETAILS_CREATED'::lead_status,
  customer_interest text,
  expected_price numeric,
  remarks text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT leads_pkey PRIMARY KEY (id),
  CONSTRAINT leads_telecaller_id_fkey FOREIGN KEY (telecaller_id) REFERENCES public.users(id),
  CONSTRAINT leads_rm_id_fkey FOREIGN KEY (rm_id) REFERENCES public.users(id),
  CONSTRAINT leads_executive_id_fkey FOREIGN KEY (executive_id) REFERENCES public.users(id)
);
CREATE TABLE public.lead_timeline (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  lead_id uuid NOT NULL,
  status USER-DEFINED NOT NULL,
  remarks text,
  updated_by uuid,
  latitude numeric,
  longitude numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT lead_timeline_pkey PRIMARY KEY (id),
  CONSTRAINT lead_timeline_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id),
  CONSTRAINT lead_timeline_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id)
);
CREATE TABLE public.lead_documents (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  lead_id uuid NOT NULL,
  document_type USER-DEFINED NOT NULL,
  file_url text NOT NULL,
  uploaded_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT lead_documents_pkey PRIMARY KEY (id),
  CONSTRAINT lead_documents_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id),
  CONSTRAINT lead_documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id)
);
CREATE TABLE public.executive_visits (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  lead_id uuid NOT NULL,
  executive_id uuid,
  visit_date date NOT NULL,
  start_time timestamp with time zone,
  reached_time timestamp with time zone,
  end_time timestamp with time zone,
  latitude numeric,
  longitude numeric,
  remarks text,
  status text NOT NULL DEFAULT 'pending'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT executive_visits_pkey PRIMARY KEY (id),
  CONSTRAINT executive_visits_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id),
  CONSTRAINT executive_visits_executive_id_fkey FOREIGN KEY (executive_id) REFERENCES public.users(id)
);
CREATE TABLE public.payments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  lead_id uuid NOT NULL,
  approved_amount numeric,
  loan_amount numeric,
  balance_amount numeric,
  total_paid numeric,
  payment_mode text,
  transaction_number text,
  payment_date timestamp with time zone,
  payment_proof text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT payments_pkey PRIMARY KEY (id),
  CONSTRAINT payments_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id),
  CONSTRAINT payments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);
CREATE TABLE public.gold_collection (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  lead_id uuid NOT NULL,
  gross_weight numeric NOT NULL,
  net_weight numeric NOT NULL,
  purity numeric,
  market_rate numeric,
  purchase_rate numeric,
  purchase_amount numeric,
  received_by uuid,
  received_date timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT gold_collection_pkey PRIMARY KEY (id),
  CONSTRAINT gold_collection_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id),
  CONSTRAINT gold_collection_received_by_fkey FOREIGN KEY (received_by) REFERENCES public.users(id)
);
CREATE TABLE public.gold_images (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  lead_id uuid NOT NULL,
  image_url text NOT NULL,
  uploaded_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT gold_images_pkey PRIMARY KEY (id),
  CONSTRAINT gold_images_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id),
  CONSTRAINT gold_images_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id)
);
CREATE TABLE public.customer_interactions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  lead_id uuid NOT NULL,
  employee_id uuid,
  interaction_type USER-DEFINED NOT NULL,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT customer_interactions_pkey PRIMARY KEY (id),
  CONSTRAINT customer_interactions_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id),
  CONSTRAINT customer_interactions_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.users(id)
);
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.audit_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  module text NOT NULL,
  action text NOT NULL,
  old_value jsonb,
  new_value jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT audit_logs_pkey PRIMARY KEY (id),
  CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.fund_requests (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  lead_id uuid NOT NULL,
  requested_amount numeric NOT NULL,
  approved_amount numeric,
  requested_by uuid,
  approved_by uuid,
  status USER-DEFINED NOT NULL DEFAULT 'PENDING'::fund_request_status,
  approved_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT fund_requests_pkey PRIMARY KEY (id),
  CONSTRAINT fund_requests_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id),
  CONSTRAINT fund_requests_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.users(id),
  CONSTRAINT fund_requests_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id)
);