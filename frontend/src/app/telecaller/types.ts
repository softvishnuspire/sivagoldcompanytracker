// --- Frontend UI Types (camelCase) ---

export interface Document {
  id: string;
  leadId: string;
  documentType: 'LOAN_SLIP' | 'KYC' | 'ADDITIONAL';
  fileName: string;
  fileUrl: string;
  uploadedBy: string;
  createdAt: string;
}

export interface Followup {
  id: string;
  leadId: string;
  followupDate: string; // YYYY-MM-DD
  remarks: string;
  status: 'PENDING' | 'COMPLETED';
  createdBy: string;
  createdAt: string;
}

export type LeadStatus =
  | 'CUSTOMER_DETAILS_CREATED'
  | 'FOLLOWUP_IN_PROGRESS'
  | 'DETAILS_COLLECTED'
  | 'DOCUMENTS_RECEIVED'
  | 'PRICE_CONFIRMED'
  | 'SENT_TO_RM'
  | 'RM_APPROVED'
  | 'RM_REVERIFICATION'
  | 'RM_REJECTED'
  | 'EXECUTIVE_ASSIGNED'
  | 'CUSTOMER_CALLED'
  | 'VISIT_CONFIRMED'
  | 'MD_FUNDS_APPROVED'
  | 'JOURNEY_STARTED'
  | 'REACHED_CUSTOMER'
  | 'CUSTOMER_INTERACTION'
  | 'BANK_VISIT'
  | 'AGREEMENT_PENDING'
  | 'PAYMENT_COMPLETED'
  | 'GOLD_RECEIVED'
  | 'BALANCE_SETTLED'
  | 'IMAGES_UPLOADED'
  | 'CASE_COMPLETED';

export interface Lead {
  id: string;
  leadNumber: string;
  customerName: string;
  mobile: string;
  alternateMobile?: string;
  address: string;
  district: string;
  goldWeight: number;
  goldType: string;
  estimatedValue: number;
  bankName: string;
  branchName: string;
  loanAmount: number;
  loanAccountNumber: string;
  source?: string;
  status: LeadStatus;
  telecallerId: string;
  rmId?: string;
  executiveId?: string;
  createdAt: string;
  updatedAt: string;
  documents?: Document[];
  followups?: Followup[];
  reverificationRemarks?: string;
  customerInterest?: string;
  priceCommunicated?: boolean;
  remarks?: string;
}

export interface DashboardStats {
  newLeads: number;
  pendingFollowups: number;
  qualifiedLeads: number;
  rejectedLeads: number;
  sentToRM: number;
}


// --- Supabase PostgreSQL Database Models (snake_case) ---

export interface DbBranch {
  id: string; // uuid
  branch_name: string;
  city?: string;
  state?: string;
  address?: string;
  manager_id?: string;
  status: string;
  created_at: string;
}

export interface DbUser {
  id: string; // uuid
  employee_code: string;
  name: string;
  mobile: string;
  email: string;
  password_hash: string;
  role: 'telecaller' | 'rm' | 'executive' | 'md';
  branch_id?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface DbLeadDocument {
  id: string; // uuid
  lead_id: string;
  document_type: 'LOAN_SLIP' | 'KYC' | 'ADDITIONAL';
  file_url: string;
  uploaded_by?: string;
  created_at: string;
}

export interface DbCustomerInteraction {
  id: string; // uuid
  lead_id: string;
  employee_id?: string;
  interaction_type: 'CALL' | 'VISIT' | 'FOLLOWUP' | 'SYSTEM';
  notes?: string;
  created_at: string;
}

export interface DbLeadTimeline {
  id: string; // uuid
  lead_id: string;
  status: string;
  remarks?: string;
  updated_by?: string;
  latitude?: number;
  longitude?: number;
  created_at: string;
}

export interface DbLead {
  id: string; // uuid
  lead_number: string;
  customer_name: string;
  mobile: string;
  alternate_mobile?: string;
  address?: string;
  district?: string;
  state?: string;
  pincode?: string;
  source?: string;
  source_remarks?: string;
  gold_weight?: number;
  gold_type?: string;
  estimated_value?: number;
  bank_name?: string;
  branch_name?: string;
  loan_account_number?: string;
  loan_amount?: number;
  telecaller_id?: string; // uuid
  rm_id?: string; // uuid
  executive_id?: string; // uuid
  current_status: string;
  customer_interest?: string;
  expected_price?: number;
  remarks?: string;
  price_communicated?: boolean;
  created_at: string;
  updated_at: string;
  
  // Joins
  documents?: DbLeadDocument[];
  interactions?: DbCustomerInteraction[];
  timeline?: DbLeadTimeline[];
}
