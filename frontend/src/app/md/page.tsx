'use client';

import { useEffect, useState } from 'react';
import DocumentManager from '@/components/DocumentManager';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

// =========================================================================
// TYPES & INTERFACES
// =========================================================================
interface Lead {
  id: string;
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
  gold_weight: number;
  gold_type?: string;
  estimated_value: number;
  bank_name?: string;
  branch_name?: string;
  loan_account_number?: string;
  loan_amount: number;
  telecaller_id?: string;
  rm_id?: string;
  executive_id?: string;
  current_status: string;
  customer_interest?: string;
  expected_price?: number;
  remarks?: string;
  created_at: string;
  updated_at: string;
  telecaller?: { name: string };
  rm?: { name: string };
  executive?: { name: string };
}

interface FundRequest {
  id: string;
  lead_id: string;
  requested_amount: number;
  approved_amount: number | null;
  requested_by: string;
  approved_by: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_at: string;
  lead?: {
    lead_number: string;
    customer_name: string;
    current_status: string;
  };
  requested_by_user?: {
    name: string;
  };
}

interface TimelineEvent {
  id: string;
  lead_id: string;
  status: string;
  remarks: string;
  updated_by: string;
  created_at: string;
  user?: { name: string };
  lead?: { lead_number: string; customer_name: string };
}

interface Document {
  id: string;
  lead_id: string;
  document_type: string;
  file_url: string;
  uploaded_by?: string;
  created_at: string;
}

interface Payment {
  id: string;
  approved_amount?: number;
  loan_amount?: number;
  balance_amount?: number;
  total_paid: number;
  payment_mode?: string;
  transaction_number?: string;
  payment_date?: string;
}

interface GoldCollectionItem {
  id: string;
  lead_id: string;
  lead_number: string;
  customer_name: string;
  executive_name: string;
  gross_weight: number;
  net_weight: number;
  purity: number;
  purchase_amount: number;
  received_date: string;
}

interface DashboardStats {
  totalLeads: number;
  qualifiedLeads: number;
  rmApprovedLeads: number;
  activeCases: number;
  completedCases: number;
  goldCollectedToday: number;
  revenueToday: number;
  conversionRate: number;
}
const STATUS_STEPS = [
  { status: 'CUSTOMER_CALLED', label: 'Customer Called', icon: '📞' },
  { status: 'VISIT_CONFIRMED', label: 'Visit Confirmed', icon: '📅' },
  { status: 'MD_FUNDS_APPROVED', label: 'MD Funds Approved', icon: '💰' },
  { status: 'JOURNEY_STARTED', label: 'Journey Started', icon: '🚗' },
  { status: 'REACHED_CUSTOMER', label: 'Reached Customer', icon: '📍' },
  { status: 'CUSTOMER_INTERACTION', label: 'Customer Interaction', icon: '🤝' },
  { status: 'BANK_VISIT', label: 'Bank Visit', icon: '🏦' },
  { status: 'AGREEMENT_PENDING', label: 'Agreement Pending', icon: '📄' },
  { status: 'PAYMENT_COMPLETED', label: 'Payment Done', icon: '💳' },
  { status: 'GOLD_RECEIVED', label: 'Receiving Gold', icon: '🏆' },
  { status: 'BALANCE_SETTLED', label: 'Settling Balance', icon: '⚖️' },
  { status: 'IMAGES_UPLOADED', label: 'Images Upload', icon: '📷' },
  { status: 'CASE_COMPLETED', label: 'Case Closed', icon: '🏁' },
];

const getActiveStepIndex = (status: string): number => {
  const normStatus = status.toUpperCase().replace(/[\s_]+/g, '_');
  switch (normStatus) {
    case 'EXECUTIVE_ASSIGNED': return 0;
    case 'CUSTOMER_CALLED': return 1;
    case 'VISIT_CONFIRMED': return 2;
    case 'MD_FUNDS_APPROVED': return 3;
    case 'JOURNEY_STARTED': return 4;
    case 'REACHED_CUSTOMER': return 5;
    case 'CUSTOMER_INTERACTION': return 6;
    case 'BANK_VISIT': return 7;
    case 'AGREEMENT_PENDING': return 8;
    case 'PAYMENT_COMPLETED': return 9;
    case 'GOLD_RECEIVED': return 10;
    case 'BALANCE_SETTLED': return 11;
    case 'IMAGES_UPLOADED': return 12;
    case 'CASE_COMPLETED': return 13;
    default: return 0;
  }
};

export default function MDDashboard() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [loading, setLoading] = useState<boolean>(true);
  const [isClient, setIsClient] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [logoError, setLogoError] = useState<boolean>(false);

  // Auth states
  const [profile, setProfile] = useState<any>({ name: 'MD Shiva Gold', employee_code: 'MD001', role: 'MD' });

  // Data states
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [fundRequests, setFundRequests] = useState<FundRequest[]>([]);
  const [revenueData, setRevenueData] = useState<any>({ today: 0, week: 0, month: 0, year: 0, trend: [], comparison: [] });
  const [goldData, setGoldData] = useState<any>({ today: 0, month: 0, total: 0, list: [] });
  const [empPerformance, setEmpPerformance] = useState<any>({ telecaller: [], rm: [], executive: [] });
  const [branchPerformance, setBranchPerformance] = useState<any[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [expenseData, setExpenseData] = useState<any>({ totalExpenses: 0, executiveSummary: [], logs: [] });

  // Search, filters, inputs
  const [leadsSearch, setLeadsSearch] = useState('');
  const [timelineLeadNumber, setTimelineLeadNumber] = useState('');
  const [timelineStatus, setTimelineStatus] = useState('');
  const [timelineStartDate, setTimelineStartDate] = useState('');
  const [timelineEndDate, setTimelineEndDate] = useState('');
  const [reportsType, setReportsType] = useState<string>('lead');

  // Inspection states
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [leadDetail, setLeadDetail] = useState<any>(null);
  const [inspecting, setInspecting] = useState<boolean>(false);
  const [previewDoc, setPreviewDoc] = useState<string | null>(null);

  // Fund Request forms
  const [activeFundRequest, setActiveFundRequest] = useState<FundRequest | null>(null);
  const [fundModalType, setFundModalType] = useState<'approve' | 'reject' | null>(null);
  const [approvedAmountInput, setApprovedAmountInput] = useState<string>('');
  const [fundRemarksInput, setFundRemarksInput] = useState<string>('');
  const [rejectionReasonInput, setRejectionReasonInput] = useState<string>('Discrepancy in documentation');

  // Branch forms
  const [isAddBranchModalOpen, setIsAddBranchModalOpen] = useState<boolean>(false);
  const [newBranchData, setNewBranchData] = useState({ branch_name: '', city: '', state: '', address: '' });

  // Employee Management
  const [employeesList, setEmployeesList] = useState<any[]>([]);
  const [branchesList, setBranchesList] = useState<any[]>([]);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [employeeForm, setEmployeeForm] = useState({ id: '', branch_id: '', name: '', role: 'TELECALLER', mobile: '', email: '', password: '' });

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

  const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('siva_token');
    if (!token) {
      localStorage.removeItem('siva_user');
      window.location.href = '/';
      throw new Error('Authentication token missing. Logging out...');
    }

    const headers = {
      ...(options.headers || {}),
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    const cleanApiBase = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
    const finalUrl = url.replace('http://localhost:5000/api', cleanApiBase);
    const res = await fetch(finalUrl, { ...options, headers });

    if (res.status === 401 || res.status === 403) {
      localStorage.removeItem('siva_token');
      localStorage.removeItem('siva_user');
      window.location.href = '/';
      throw new Error('Session expired. Logging out...');
    }

    return res;
  };

  const fetchDashboardStats = async () => {
    try {
      const res = await authenticatedFetch('http://localhost:5000/api/md/dashboard');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    }
  };

  const fetchLeads = async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const res = await authenticatedFetch('http://localhost:5000/api/md/leads');
      if (res.ok) {
        const data = await res.json();
        setLeads(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!quiet) setLoading(false);
    }
  };

  const fetchLeadDetails = async (id: string) => {
    try {
      const res = await authenticatedFetch(`http://localhost:5000/api/md/lead/${id}`);
      if (res.ok) {
        const data = await res.json();
        setLeadDetail(data);
        if (data.documents && data.documents.length > 0) {
          setPreviewDoc(data.documents[0].file_url || data.documents[0].fileUrl || '#');
        } else {
          setPreviewDoc(null);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchFundRequests = async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const res = await authenticatedFetch('http://localhost:5000/api/md/fund-requests');
      if (res.ok) {
        const data = await res.json();
        setFundRequests(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!quiet) setLoading(false);
    }
  };

  const fetchRevenueData = async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const res = await authenticatedFetch('http://localhost:5000/api/md/revenue');
      if (res.ok) {
        const data = await res.json();
        setRevenueData(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!quiet) setLoading(false);
    }
  };

  const fetchGoldData = async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const res = await authenticatedFetch('http://localhost:5000/api/md/gold-collection');
      if (res.ok) {
        const data = await res.json();
        setGoldData(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!quiet) setLoading(false);
    }
  };

  const fetchExpenseData = async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const res = await authenticatedFetch('http://localhost:5000/api/md/expenses');
      if (res.ok) {
        const data = await res.json();
        setExpenseData(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!quiet) setLoading(false);
    }
  };

  const fetchEmpPerformance = async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const res = await authenticatedFetch('http://localhost:5000/api/md/employee-performance');
      if (res.ok) {
        const data = await res.json();
        setEmpPerformance(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!quiet) setLoading(false);
    }
  };

  const fetchBranchPerformance = async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const res = await authenticatedFetch('http://localhost:5000/api/md/branch-performance');
      if (res.ok) {
        const data = await res.json();
        setBranchPerformance(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!quiet) setLoading(false);
    }
  };

  const loadDashboardData = async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      await Promise.all([
        fetchDashboardStats(),
        fetchLeads(true),
        fetchFundRequests(true),
        fetchRevenueData(true),
        fetchGoldData(true),
        fetchEmpPerformance(true),
        fetchBranchPerformance(true),
        fetchExpenseData(true)
      ]);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      if (!quiet) setLoading(false);
    }
  };

  const loadInitialData = async () => {
    setLoading(true);
    try {
      // Load user profile from stored user info or backend
      const userStr = localStorage.getItem('siva_user');
      if (userStr) {
        setProfile(JSON.parse(userStr));
      }
      await loadDashboardData(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTimeline = async () => {
    setLoading(true);
    try {
      let url = 'http://localhost:5000/api/md/timeline?';
      if (timelineLeadNumber) url += `leadNumber=${timelineLeadNumber}&`;
      if (timelineStatus) url += `status=${timelineStatus}&`;
      if (timelineStartDate) url += `startDate=${timelineStartDate}&`;
      if (timelineEndDate) url += `endDate=${timelineEndDate}&`;

      const res = await authenticatedFetch(url);
      if (res.ok) {
        const data = await res.json();
        setTimelineEvents(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Lifecycle effects
  useEffect(() => {
    setIsClient(true);
    const token = localStorage.getItem('siva_token');
    const userStr = localStorage.getItem('siva_user');
    if (!token || !userStr) {
      window.location.href = '/';
      return;
    }
    try {
      const user = JSON.parse(userStr);
      if (user.role.toUpperCase() !== 'MD') {
        window.location.href = '/';
        return;
      }
    } catch (e) {
      window.location.href = '/';
      return;
    }
    loadInitialData();
  }, []);

  useEffect(() => {
    if (activeTab === 'dashboard') {
      loadDashboardData();
    } else if (activeTab === 'leads') {
      fetchLeads();
    } else if (activeTab === 'funds') {
      fetchFundRequests();
    } else if (activeTab === 'revenue') {
      fetchRevenueData();
    } else if (activeTab === 'gold') {
      fetchGoldData();
    } else if (activeTab === 'employees') {
      fetchEmpPerformance();
    } else if (activeTab === 'employee-management') {
      fetchEmployeesList();
      fetchBranchesList();
    } else if (activeTab === 'branches') {
      fetchBranchPerformance();
    } else if (activeTab === 'timeline') {
      fetchTimeline();
    } else if (activeTab === 'expenses') {
      fetchExpenseData();
    } else if (activeTab === 'document-manager') {
      setLoading(false);
    }
  }, [activeTab]);

  const handleInspectLead = (id: string) => {
    setSelectedLeadId(id);
    setInspecting(true);
    fetchLeadDetails(id);
  };

  const closeInspection = () => {
    setInspecting(false);
    setSelectedLeadId(null);
    setLeadDetail(null);
    setPreviewDoc(null);
  };

  // Submit operations
  const handleApproveFund = async () => {
    if (!activeFundRequest) return;
    if (Number(approvedAmountInput) > Number(activeFundRequest.requested_amount)) {
      alert('Approved amount cannot exceed the requested amount.');
      return;
    }

    try {
      const res = await authenticatedFetch('http://localhost:5000/api/md/fund-approval', {
        method: 'POST',
        body: JSON.stringify({
          requestId: activeFundRequest.id,
          approvedAmount: Number(approvedAmountInput),
          remarks: fundRemarksInput
        })
      });

      if (res.ok) {
        setFundModalType(null);
        setActiveFundRequest(null);
        setApprovedAmountInput('');
        setFundRemarksInput('');
        fetchFundRequests();
        fetchDashboardStats();
      } else {
        const err = await res.json();
        alert(`Error: ${err.error}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRejectFund = async () => {
    if (!activeFundRequest) return;

    try {
      const res = await authenticatedFetch('http://localhost:5000/api/md/fund-rejection', {
        method: 'POST',
        body: JSON.stringify({
          requestId: activeFundRequest.id,
          reason: rejectionReasonInput,
          remarks: fundRemarksInput
        })
      });

      if (res.ok) {
        setFundModalType(null);
        setActiveFundRequest(null);
        setFundRemarksInput('');
        fetchFundRequests();
        fetchDashboardStats();
      } else {
        const err = await res.json();
        alert(`Error: ${err.error}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddBranch = async () => {
    if (!newBranchData.branch_name) {
      alert('Branch Name is required');
      return;
    }
    try {
      const res = await authenticatedFetch('http://localhost:5000/api/md/branch', {
        method: 'POST',
        body: JSON.stringify(newBranchData)
      });

      if (res.ok) {
        setIsAddBranchModalOpen(false);
        setNewBranchData({ branch_name: '', city: '', state: '', address: '' });
        fetchBranchPerformance();
      } else {
        const err = await res.json();
        alert(`Error: ${err.error}`);
      }
    } catch (err) {
      console.error(err);
      alert('Error creating branch');
    }
  };

  const fetchEmployeesList = async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch('http://localhost:5000/api/md/employees');
      if (res.ok) {
        const data = await res.json();
        setEmployeesList(data);
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const fetchBranchesList = async () => {
    try {
      const res = await authenticatedFetch('http://localhost:5000/api/md/branches-list');
      if (res.ok) {
        const data = await res.json();
        setBranchesList(data);
      }
    } catch (err) { console.error(err); }
  };

  const handleSaveEmployee = async () => {
    if (!employeeForm.name || !employeeForm.role || !employeeForm.mobile || !employeeForm.email || (!employeeForm.id && !employeeForm.password)) {
      alert('Please fill all required fields');
      return;
    }
    try {
      const method = employeeForm.id ? 'PUT' : 'POST';
      const url = employeeForm.id ? `http://localhost:5000/api/md/employee/${employeeForm.id}` : 'http://localhost:5000/api/md/employee';
      const res = await authenticatedFetch(url, {
        method,
        body: JSON.stringify(employeeForm)
      });
      if (res.ok) {
        setIsEmployeeModalOpen(false);
        fetchEmployeesList();
      } else {
        const err = await res.json();
        alert(`Error: ${err.error}`);
      }
    } catch (err) {
      console.error(err);
      alert('Error saving employee');
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    if (!window.confirm('Are you sure you want to deactivate this employee?')) return;
    try {
      const res = await authenticatedFetch(`http://localhost:5000/api/md/employee/${id}`, { method: 'DELETE' });
      if (res.ok) fetchEmployeesList();
      else alert('Failed to deactivate employee');
    } catch (err) { console.error(err); }
  };

  const getStatusBadge = (status: string) => {
    let classes = 'bg-slate-100 text-slate-700';
    if (status === 'SENT_TO_RM') classes = 'bg-amber-100 text-amber-700 border border-amber-200';
    else if (status === 'RM_APPROVED') classes = 'bg-emerald-100 text-emerald-700 border border-emerald-200';
    else if (status === 'EXECUTIVE_ASSIGNED') classes = 'bg-indigo-100 text-indigo-700 border border-indigo-200';
    else if (status === 'MD_FUNDS_APPROVED') classes = 'bg-teal-100 text-teal-700 border border-teal-200';
    else if (status === 'MD_FUNDS_REJECTED') classes = 'bg-red-100 text-red-700 border border-red-200';
    else if (status === 'RM_REVERIFICATION') classes = 'bg-blue-100 text-blue-700 border border-blue-200';
    else if (status === 'RM_REJECTED') classes = 'bg-rose-100 text-rose-700 border border-rose-200';
    else if (status === 'CASE_COMPLETED') classes = 'bg-teal-100 text-teal-700 border border-teal-200';

    return (
      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wide ${classes}`}>
        {status.replace(/_/g, ' ')}
      </span>
    );
  };

  const getExportUrl = (format: 'excel' | 'pdf') => {
    const token = localStorage.getItem('siva_token');
    const cleanApiBase = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
    return `${cleanApiBase}/md/reports/export/${format}?type=${reportsType}&token=${token}`;
  };

  const triggerExport = (format: 'excel' | 'pdf') => {
    // We append the auth token in query params to authenticate PDF/Excel downloads in browser
    window.open(getExportUrl(format), '_blank');
  };

  const handleOpenOriginal = (url: string) => {
    if (!url) return;
    if (url.startsWith('data:')) {
      const newWindow = window.open();
      if (newWindow) {
        newWindow.document.write(`<img src="${url}" style="max-width:100%; max-height:100%; object-fit:contain;" alt="Original Document" />`);
        newWindow.document.title = "Original Document";
        newWindow.document.close();
      }
    } else {
      window.open(url, '_blank', 'noreferrer');
    }
  };

  const downloadDocument = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.replace(/\s+/g, '_');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredLeads = leads.filter(l => 
    l.customer_name.toLowerCase().includes(leadsSearch.toLowerCase()) ||
    l.lead_number.toLowerCase().includes(leadsSearch.toLowerCase()) ||
    (l.district && l.district.toLowerCase().includes(leadsSearch.toLowerCase()))
  );

  // Dynamic business calculations derived from real database states
  const getExecutiveActivity = (status: string) => {
    switch (status) {
      case 'EXECUTIVE_ASSIGNED':
        return { status: 'Assigned', activity: 'Awaiting Contact', color: 'bg-blue-100 text-blue-700' };
      case 'CUSTOMER_CALLED':
        return { status: 'Contacted', activity: 'Scheduling Visit', color: 'bg-indigo-100 text-indigo-700' };
      case 'VISIT_CONFIRMED':
        return { status: 'Scheduled', activity: 'Awaiting Funds', color: 'bg-amber-100 text-amber-700' };
      case 'MD_FUNDS_APPROVED':
        return { status: 'Funds Approved', activity: 'Awaiting Journey', color: 'bg-emerald-100 text-emerald-700' };
      case 'JOURNEY_STARTED':
        return { status: 'En Route', activity: 'Traveling to Customer', color: 'bg-[#4d0711]/10 text-[#4d0711]' };
      case 'REACHED_CUSTOMER':
        return { status: 'At Customer', activity: 'Meeting Customer', color: 'bg-teal-100 text-teal-700' };
      case 'CUSTOMER_INTERACTION':
        return { status: 'Interacting', activity: 'Verifying Gold', color: 'bg-indigo-100 text-indigo-700' };
      case 'BANK_VISIT':
        return { status: 'At Bank', activity: 'Releasing Gold', color: 'bg-amber-100 text-amber-700' };
      case 'AGREEMENT_PENDING':
        return { status: 'Agreement', activity: 'Signing Paperwork', color: 'bg-orange-100 text-orange-700' };
      case 'PAYMENT_COMPLETED':
        return { status: 'Paying', activity: 'Completing Payment', color: 'bg-emerald-100 text-emerald-700' };
      case 'GOLD_RECEIVED':
        return { status: 'Gold Recd', activity: 'Receiving Gold', color: 'bg-teal-100 text-teal-700' };
      case 'BALANCE_SETTLED':
        return { status: 'Settled', activity: 'Settling Balance', color: 'bg-purple-100 text-purple-700' };
      case 'IMAGES_UPLOADED':
        return { status: 'Completed', activity: 'Images Uploaded', color: 'bg-emerald-100 text-emerald-700' };
      case 'CASE_COMPLETED':
        return { status: 'Closed', activity: 'Case Finished', color: 'bg-slate-100 text-slate-700' };
      default:
        return { status: status.replace(/_/g, ' '), activity: 'Active Operation', color: 'bg-slate-100 text-slate-700' };
    }
  };

  const liveExecutiveStatusList = leads
    .filter(l => l.executive && l.current_status !== 'CASE_COMPLETED' && l.current_status !== 'RM_REJECTED')
    .map(l => {
      const act = getExecutiveActivity(l.current_status);
      return {
        id: l.id,
        name: l.executive?.name || 'Executive',
        avatar: l.executive?.name?.[0]?.toUpperCase() || '👨',
        status: act.status,
        statusColor: act.color,
        activity: act.activity,
        cases: leads.filter(x => x.executive_id === l.executive_id).length
      };
    })
    .filter((v, i, a) => a.findIndex(t => t.name === v.name) === i)
    .slice(0, 5);

  const funnelStages = stats ? [
    { name: 'Leads Received', value: stats.totalLeads, percentage: 100, color: 'bg-[#4d0711]' },
    { name: 'RM Approved', value: stats.rmApprovedLeads, percentage: stats.totalLeads > 0 ? Math.round((stats.rmApprovedLeads / stats.totalLeads) * 100) : 0, color: 'bg-[#c3902c]' },
    { name: 'Executive Assigned', value: leads.filter(l => l.current_status === 'EXECUTIVE_ASSIGNED').length, percentage: stats.totalLeads > 0 ? Math.round((leads.filter(l => l.current_status === 'EXECUTIVE_ASSIGNED').length / stats.totalLeads) * 100) : 0, color: 'bg-[#7c9e31]' },
    { name: 'In Progress', value: leads.filter(l => ['MD_FUNDS_APPROVED', 'MD_FUNDS_REJECTED', 'RM_REVERIFICATION', 'JOURNEY_STARTED', 'REACHED_CUSTOMER', 'CUSTOMER_INTERACTION', 'BANK_VISIT', 'AGREEMENT_PENDING', 'PAYMENT_COMPLETED', 'GOLD_RECEIVED', 'BALANCE_SETTLED', 'IMAGES_UPLOADED'].includes(l.current_status)).length, percentage: stats.totalLeads > 0 ? Math.round((leads.filter(l => ['MD_FUNDS_APPROVED', 'MD_FUNDS_REJECTED', 'RM_REVERIFICATION', 'JOURNEY_STARTED', 'REACHED_CUSTOMER', 'CUSTOMER_INTERACTION', 'BANK_VISIT', 'AGREEMENT_PENDING', 'PAYMENT_COMPLETED', 'GOLD_RECEIVED', 'BALANCE_SETTLED', 'IMAGES_UPLOADED'].includes(l.current_status)).length / stats.totalLeads) * 100) : 0, color: 'bg-[#3b82f6]' },
    { name: 'Completed', value: stats.completedCases, percentage: stats.totalLeads > 0 ? Math.round((stats.completedCases / stats.totalLeads) * 100) : 0, color: 'bg-[#8b5cf6]' },
  ] : [];

  const businessSummary = stats ? [
    { name: 'Leads Received', value: stats.totalLeads, icon: '👥', color: 'text-blue-600' },
    { name: 'RM Approved', value: stats.rmApprovedLeads, icon: '✅', color: 'text-emerald-600' },
    { name: 'Executive Assigned', value: leads.filter(l => l.current_status === 'EXECUTIVE_ASSIGNED').length, icon: '👨‍💼', color: 'text-amber-600' },
    { name: 'In Progress', value: leads.filter(l => ['MD_FUNDS_APPROVED', 'MD_FUNDS_REJECTED', 'RM_REVERIFICATION', 'JOURNEY_STARTED', 'REACHED_CUSTOMER', 'CUSTOMER_INTERACTION', 'BANK_VISIT', 'AGREEMENT_PENDING', 'PAYMENT_COMPLETED', 'GOLD_RECEIVED', 'BALANCE_SETTLED', 'IMAGES_UPLOADED'].includes(l.current_status)).length, icon: '⏳', color: 'text-indigo-600' },
    { name: 'Completed Cases', value: stats.completedCases, icon: '🏆', color: 'text-purple-600' },
  ] : [];

  const businessHighlights = stats ? [
    { name: 'Gold Collected Today', value: `${stats.goldCollectedToday.toFixed(2)} g`, icon: '🌟', color: 'text-amber-500' },
    { name: 'Revenue Today', value: `₹${stats.revenueToday.toLocaleString('en-IN')}`, icon: '💰', color: 'text-emerald-500' },
    { name: 'Monthly Gold', value: `${(goldData.month || 0).toFixed(2)} g`, icon: '🌟', color: 'text-amber-600' },
    { name: 'Monthly Revenue', value: `₹${(revenueData.month || 0).toLocaleString('en-IN')}`, icon: '📈', color: 'text-orange-500' },
    { name: 'Conversion Rate', value: `${stats.conversionRate}%`, icon: '🎯', color: 'text-teal-500' },
  ] : [];

  const getLeadSourcesData = () => {
    const sourcesMap: { [key: string]: number } = {};
    leads.forEach(l => {
      const src = l.source || 'Direct / Walk-in';
      sourcesMap[src] = (sourcesMap[src] || 0) + 1;
    });
    const colors = ['#4d0711', '#c3902c', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#64748b'];
    return Object.keys(sourcesMap).map((name, index) => ({
      name,
      value: sourcesMap[name],
      color: colors[index % colors.length]
    }));
  };

  const leadSourcesList = getLeadSourcesData();

  const sortedExecPerformanceList = empPerformance?.executive
    ? [...empPerformance.executive]
        .sort((a, b) => b.completedCases - a.completedCases || b.goldCollected - a.goldCollected)
        .slice(0, 5)
    : [];

  const dynamicAlertsList = (() => {
    const pendingFunds = fundRequests.filter(r => r.status === 'PENDING').length;
    const reverifications = leads.filter(l => l.current_status === 'RM_REVERIFICATION').length;
    const sentToRm = leads.filter(l => l.current_status === 'SENT_TO_RM').length;
    const execAssigned = leads.filter(l => l.current_status === 'EXECUTIVE_ASSIGNED').length;

    const alerts = [];
    if (pendingFunds > 0) {
      alerts.push({ id: 1, text: 'Pending Fund Requests', count: String(pendingFunds).padStart(2, '0'), color: 'text-[#4d0711]', bg: 'bg-rose-50 border border-rose-100', icon: '❗' });
    }
    if (reverifications > 0) {
      alerts.push({ id: 2, text: 'Re-verification Pending', count: String(reverifications).padStart(2, '0'), color: 'text-amber-700', bg: 'bg-amber-50 border border-amber-100', icon: '🔄' });
    }
    if (sentToRm > 0) {
      alerts.push({ id: 3, text: 'Awaiting RM Review', count: String(sentToRm).padStart(2, '0'), color: 'text-slate-600', bg: 'bg-slate-50 border border-slate-100', icon: '⏳' });
    }
    if (execAssigned > 0) {
      alerts.push({ id: 4, text: 'Executive Assigned', count: String(execAssigned).padStart(2, '0'), color: 'text-blue-600', bg: 'bg-blue-50 border border-blue-100', icon: '🏃' });
    }

    if (alerts.length === 0) {
      alerts.push({ id: 0, text: 'All Operations Clear', count: '00', color: 'text-emerald-700', bg: 'bg-emerald-50 border border-emerald-100', icon: '✅' });
    }
    return alerts;
  })();

  return (
    <div suppressHydrationWarning className="h-screen w-screen overflow-hidden flex bg-[#f4f5f8] text-slate-800 font-sans selection:bg-[#c3902c] selection:text-black">
      
      {/* Backdrop overlay for mobile */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-35 bg-black/40 backdrop-blur-xs md:hidden animate-fadeIn"
        />
      )}

      {/* ===================================================================
          SIDEBAR PANEL (Burgundy Theme matching RM)
          =================================================================== */}
      <aside className={`fixed md:relative top-0 left-0 w-72 h-full bg-gradient-to-b from-[#4d0711] to-[#200206] border-r border-[#691823]/20 flex flex-col z-40 shrink-0 select-none transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        
        {/* Branding Header */}
        <div className="py-2 px-4 border-b border-[#691823]/20 flex flex-col items-center justify-center bg-[#4d0b13]/10">
          <div className="w-full h-36 flex items-center justify-center overflow-hidden">
            {!logoError ? (
              <img
                src="/logo.png"
                alt="Shiva Gold Logo"
                className="w-full h-auto"
                onError={() => setLogoError(true)}
              />
            ) : (
              <span className="text-xl font-black text-amber-500 tracking-wider font-mono">SHIVA GOLD CO.</span>
            )}
          </div>
        </div>

        {/* Navigation Tab Menu */}
        <nav className="flex-1 px-4 py-5 flex flex-col gap-1 overflow-y-auto hide-scrollbar">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
            { id: 'leads', label: 'Lead Monitoring', icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' },
            { id: 'funds', label: 'Fund Approvals', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
            { id: 'revenue', label: 'Revenue Reports', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10a2 2 0 01-2 2h-2a2 2 0 01-2-2zm9-1h2a2 2 0 002-2v-3a2 2 0 00-2-2h-2a2 2 0 00-2 2v3a2 2 0 002 2zm-8-3H8v3h2v-3z' },
            { id: 'gold', label: 'Gold Collection', icon: 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z' },
            { id: 'employee-management', label: 'Employee Management', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
            { id: 'employees', label: 'Employee Performance', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
            { id: 'branches', label: 'Branch Performance', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
            { id: 'timeline', label: 'Case Timeline', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
            { id: 'expenses', label: 'Executive Expenses', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
            { id: 'document-manager', label: 'Document Manager', icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z' },
            { id: 'reports', label: 'Reports', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                closeInspection();
                setIsSidebarOpen(false);
              }}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all group cursor-pointer ${
                activeTab === item.id
                  ? 'bg-amber-500/15 border border-amber-500/30 text-amber-400 font-bold'
                  : 'text-amber-100/60 hover:bg-[#c3902c]/10 hover:text-amber-300'
              }`}
            >
              <svg className={`w-4 h-4 transition-colors ${activeTab === item.id ? 'text-amber-400' : 'text-amber-100/40 group-hover:text-amber-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={item.icon} />
              </svg>
              {item.label}
            </button>
          ))}
        </nav>

        {/* Profile and Logout info */}
        <div className="px-4 pb-4 border-b border-[#691823]/10">
          <button
            onClick={() => {
              localStorage.removeItem('siva_token');
              localStorage.removeItem('siva_user');
              window.location.href = '/';
              setIsSidebarOpen(false);
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-amber-200/70 hover:bg-rose-500/10 hover:text-rose-455 border border-[#691823]/30 hover:border-rose-500/20 transition-all cursor-pointer"
          >
            Logout Portal
          </button>
        </div>

        <div className="p-4 mx-4 mb-4 rounded-2xl bg-[#2e040a]/40 border border-[#691823]/20 flex items-center gap-3">
          <span className="text-xl">👑</span>
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">MD Console</span>
            <span className="text-[11px] font-black text-amber-400 font-mono mt-1">Authorized</span>
          </div>
        </div>
      </aside>

      {/* ===================================================================
          WORKSPACE WORKSPACE
          =================================================================== */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        
        {/* Header Toolbar */}
        <header className="bg-white border-b border-slate-200 px-4 sm:px-8 py-3 sm:py-4 flex items-center justify-between z-20 shadow-sm">
          <div className="flex items-center gap-1.5 sm:gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl md:hidden transition-all cursor-pointer mr-1"
              title="Open Menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h2 className="text-sm sm:text-lg font-extrabold tracking-tight text-slate-900 capitalize truncate">
              {inspecting ? 'Lead Details (Read Only)' : activeTab.replace(/-list|-/g, ' ')}
            </h2>
            {inspecting && leadDetail && (
              <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[10px] sm:text-xs font-mono font-bold text-slate-700">
                {leadDetail.lead.lead_number}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 sm:gap-5">
            <div className="hidden lg:flex text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl items-center gap-1.5 shadow-sm">
              <span>📅</span>
              <span>03 June 2026, Wednesday</span>
            </div>

            {/* User credentials */}
            <div className="flex items-center gap-2 md:border-l md:border-slate-200 md:pl-5">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center font-bold text-xs sm:text-sm text-slate-800 shrink-0">
                MD
              </div>
              <div className="hidden md:flex flex-col">
                <span className="text-xs font-bold text-slate-800 leading-none">{profile.name}</span>
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">Managing Director</span>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Panels */}
        <main className="flex-1 p-4 sm:p-8 overflow-y-auto">
          
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-3">
              <div className="w-10 h-10 border-4 border-amber-500/25 border-t-[#c3902c] rounded-full animate-spin" />
              <span className="text-sm font-semibold text-slate-400">Loading metrics...</span>
            </div>
          ) : inspecting && leadDetail ? (
            
            /* =============================================================
               LEAD INSPECTION VIEW (LEAD DETAILS PAGE)
               ============================================================= */
            <div className="flex flex-col gap-6 animate-fadeIn">
              <div className="flex justify-between items-center bg-white p-4 border border-slate-200 shadow-sm rounded-2xl">
                <button
                  onClick={closeInspection}
                  className="flex items-center gap-2 text-sm font-bold text-amber-600 hover:text-amber-700 cursor-pointer"
                >
                  ← Back to List
                </button>
                <div className="flex gap-2">
                  {getStatusBadge(leadDetail.lead.current_status)}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 flex flex-col gap-6">
                  
                  {/* Grid fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    {/* Customer info */}
                    <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5 flex flex-col gap-3">
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">Customer Information</h3>
                      <div className="grid grid-cols-2 gap-y-3 text-xs">
                        <div>
                          <span className="text-slate-400 block mb-0.5">Customer Name</span>
                          <span className="font-bold text-slate-800">{leadDetail.lead.customer_name}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block mb-0.5">Mobile</span>
                          <span className="font-bold text-slate-800">{leadDetail.lead.mobile}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block mb-0.5">District</span>
                          <span className="font-bold text-slate-800">{leadDetail.lead.district || 'N/A'}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-slate-400 block mb-0.5">Address</span>
                          <span className="font-medium text-slate-800">{leadDetail.lead.address || 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Gold info */}
                    <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5 flex flex-col gap-3">
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">Gold Information</h3>
                      <div className="grid grid-cols-2 gap-y-3 text-xs">
                        <div>
                          <span className="text-slate-400 block mb-0.5">Gold Weight</span>
                          <span className="font-bold text-slate-800">{leadDetail.lead.gold_weight} g</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block mb-0.5">Gold Type</span>
                          <span className="font-bold text-slate-800">{leadDetail.lead.gold_type || 'N/A'}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-slate-400 block mb-0.5">Estimated Value</span>
                          <span className="font-black text-amber-600 text-sm">₹{Number(leadDetail.lead.estimated_value || 0).toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Bank info */}
                    <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5 flex flex-col gap-3">
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">Bank Information</h3>
                      <div className="grid grid-cols-2 gap-y-3 text-xs">
                        <div>
                          <span className="text-slate-400 block mb-0.5">Bank Name</span>
                          <span className="font-bold text-slate-800">{leadDetail.lead.bank_name || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block mb-0.5">Branch Name</span>
                          <span className="font-bold text-slate-800">{leadDetail.lead.branch_name || 'N/A'}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-slate-400 block mb-0.5">Loan Amount</span>
                          <span className="font-bold text-slate-850">₹{Number(leadDetail.lead.loan_amount || 0).toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Assigned Users */}
                    <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5 flex flex-col gap-3">
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">Assigned Users</h3>
                      <div className="grid grid-cols-2 gap-y-3 text-xs">
                        <div>
                          <span className="text-slate-400 block mb-0.5">Telecaller</span>
                          <span className="font-bold text-slate-800">{leadDetail.lead.telecaller?.name || 'Unassigned'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block mb-0.5">RM</span>
                          <span className="font-bold text-slate-800">{leadDetail.lead.rm?.name || 'Unassigned'}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-slate-400 block mb-0.5">Executive</span>
                          <span className="font-bold text-slate-800">{leadDetail.lead.executive?.name || 'Unassigned'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Documents Section */}
                  <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-4 sm:p-5 flex flex-col gap-4">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">Uploaded Documents</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex flex-col gap-2">
                        {leadDetail.documents.length === 0 ? (
                          <span className="text-xs text-slate-400 italic">No documents uploaded.</span>
                        ) : (
                          leadDetail.documents.map((doc: Document) => {
                            const fileUrl = doc.file_url || (doc as any).fileUrl || '#';
                            return (
                              <button
                                key={doc.id}
                                onClick={() => setPreviewDoc(fileUrl)}
                                className={`w-full flex items-center justify-between p-3 rounded-xl border text-left cursor-pointer transition-all ${
                                  previewDoc === fileUrl
                                    ? 'bg-amber-500/5 border-amber-500/30 text-amber-700'
                                    : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-350'
                                }`}
                              >
                                <div className="flex flex-col gap-0.5 min-w-0">
                                  <span className="text-xs font-bold truncate">{doc.document_type.replace(/_/g, ' ')}</span>
                                  <span className="text-[9px] text-slate-400 font-mono">Click to Preview</span>
                                </div>
                                <span className="text-xs">👁️</span>
                              </button>
                            );
                          })
                        )}
                      </div>

                      <div className="md:col-span-2 bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center min-h-[250px] overflow-hidden">
                        {previewDoc ? (
                          <div className="w-full h-full flex flex-col gap-2">
                            <div className="flex justify-between items-center text-[10px] text-slate-400 border-b border-slate-200 pb-1.5">
                              <span>Document Live View</span>
                              <div className="flex gap-2.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenOriginal(previewDoc)}
                                  className="text-amber-600 font-bold hover:underline cursor-pointer bg-transparent border-0 p-0"
                                >
                                  Open Original file
                                </button>
                                <span className="text-slate-350 select-none">|</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const activeDoc = leadDetail.documents.find((d: any) => (d.file_url || (d as any).fileUrl || '#') === previewDoc);
                                    const docType = activeDoc ? activeDoc.document_type : 'Document';
                                    const fileName = `${leadDetail.lead.customer_name}_${docType}`;
                                    downloadDocument(previewDoc, fileName);
                                  }}
                                  className="text-amber-600 font-bold hover:underline cursor-pointer bg-transparent border-0 p-0"
                                >
                                  Download File
                                </button>
                              </div>
                            </div>
                            <div className="flex-1 relative w-full h-[180px] sm:h-[220px] bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center">
                              {previewDoc.startsWith('data:image') || previewDoc.includes('.png') || previewDoc.includes('.jpg') || previewDoc.includes('.jpeg') || previewDoc.startsWith('http') ? (
                                <img
                                  src={previewDoc}
                                  alt="Document Preview"
                                  className="max-w-full max-h-full object-contain"
                                />
                              ) : (
                                <div className="text-center p-4">
                                  <span className="text-3xl block mb-2">📄</span>
                                  <span className="text-xs font-bold text-slate-500">Document Type (PDF/Link)</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="text-slate-400 text-center">
                            <span className="text-2xl">📄</span>
                            <span className="text-xs block mt-1">Select a document to preview</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Gold Ornament Images grid */}
                  <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5 flex flex-col gap-3">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">Gold Ornament Images</h3>
                    {leadDetail.goldImages && leadDetail.goldImages.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {leadDetail.goldImages.map((img: any) => (
                          <div key={img.id} className="relative group aspect-square bg-slate-100 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                            <img src={img.image_url} alt="Gold ornament" className="w-full h-full object-cover" />
                            <a href={img.image_url} target="_blank" rel="noreferrer" className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold transition-all">
                              View Large ↗
                            </a>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">No gold ornament verification photos uploaded yet.</span>
                    )}
                  </div>
                </div>

                {/* Column 3: Timeline & Payments */}
                <div className="flex flex-col gap-6">
                  {/* Payments Ledger */}
                  <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5 flex flex-col gap-3">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">Payments Ledger</h3>
                    {leadDetail.payments && leadDetail.payments.length > 0 ? (
                      <div className="flex flex-col gap-3">
                        {leadDetail.payments.map((p: Payment) => (
                          <div key={p.id} className="text-xs border border-slate-100 p-3 rounded-xl bg-slate-50/50 flex flex-col gap-1.5">
                            <div className="flex justify-between font-bold">
                              <span>Total Paid:</span>
                              <span className="text-emerald-600">₹{p.total_paid.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="grid grid-cols-2 text-[10px] text-slate-400 gap-y-1 mt-1">
                              <span>Mode: {p.payment_mode || 'N/A'}</span>
                              <span>Tx: {p.transaction_number || 'N/A'}</span>
                              <span className="col-span-2">Date: {p.payment_date ? new Date(p.payment_date).toLocaleString() : 'N/A'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">No payments processed yet.</span>
                    )}
                  </div>

                  {/* Executive Visit Expenses */}
                  <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5 flex flex-col gap-3">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">Executive Visit Expenses</h3>
                    {leadDetail.expense ? (
                      <div className="text-xs border border-slate-100 p-3 rounded-xl bg-slate-50/50 flex flex-col gap-1.5 animate-fadeIn">
                        <div className="flex justify-between font-bold">
                          <span>Expense Amount:</span>
                          <span className="text-[#c3902c] font-extrabold text-sm">₹{Number(leadDetail.expense.amount).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium mt-1">
                          Remarks: <span className="text-slate-700">{leadDetail.expense.remarks}</span>
                        </div>
                        <div className="text-[9px] text-slate-400 font-mono mt-1">
                          By: {leadDetail.expense.submitted_by} | {new Date(leadDetail.expense.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">No expenses submitted for this visit.</span>
                    )}
                  </div>

                  {/* Gold Collections list */}
                  <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5 flex flex-col gap-3">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">Gold Collection details</h3>
                    {leadDetail.goldCollectionDetails && leadDetail.goldCollectionDetails.length > 0 ? (
                      <div className="flex flex-col gap-3">
                        {leadDetail.goldCollectionDetails.map((col: any) => (
                          <div key={col.id} className="text-xs border border-slate-100 p-3 rounded-xl bg-slate-50/50 flex flex-col gap-1">
                            <div className="flex justify-between font-bold">
                              <span>Net Weight:</span>
                              <span>{col.net_weight} g</span>
                            </div>
                            <div className="flex justify-between text-[11px]">
                              <span>Gross Weight:</span>
                              <span>{col.gross_weight} g</span>
                            </div>
                            <div className="flex justify-between text-[11px]">
                              <span>Purity:</span>
                              <span>{col.purity}%</span>
                            </div>
                            <div className="flex justify-between font-extrabold text-amber-600 text-[11px] mt-1 pt-1 border-t border-dashed border-slate-150">
                              <span>Purchase:</span>
                              <span>₹{Number(col.purchase_amount || 0).toLocaleString('en-IN')}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">No gold ornament collections recorded yet.</span>
                    )}
                  </div>

                  {/* Lead Workflow Status */}
                  <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5 flex flex-col gap-3">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">Lead Workflow Status</h3>
                    <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
                      {(() => {
                        const currentStepIdx = getActiveStepIndex(leadDetail.lead.current_status);
                        return STATUS_STEPS.map((step, idx) => {
                          const isCompleted = idx < currentStepIdx;
                          const isActive = idx === currentStepIdx;
                          const isPending = idx > currentStepIdx;

                          return (
                            <div
                              key={step.status}
                              className={`relative flex items-center justify-between p-2.5 rounded-xl border transition-all duration-300 ${
                                isActive 
                                  ? 'bg-amber-50/50 border-amber-500/40 text-amber-900 shadow-sm font-bold' 
                                  : isCompleted 
                                    ? 'bg-emerald-50/20 border-emerald-200/20 text-slate-600' 
                                    : 'bg-slate-50/20 border-slate-100 text-slate-400 opacity-60'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0 ${
                                  isActive 
                                    ? 'bg-amber-500 text-white font-extrabold shadow-sm animate-pulse' 
                                    : isCompleted 
                                      ? 'bg-emerald-500 text-white' 
                                      : 'bg-slate-100 text-slate-400'
                                }`}>
                                  {isCompleted ? '✓' : step.icon}
                                </div>
                                <span className={`text-[11px] ${isActive ? 'font-bold text-amber-800' : 'font-medium'}`}>
                                  {step.label}
                                </span>
                              </div>

                              {isActive && (
                                <span className="flex items-center gap-1 text-[8px] font-bold text-amber-700 bg-amber-100/80 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                                  <span className="w-1 h-1 rounded-full bg-amber-500 animate-pulse"></span>
                                  Active
                                </span>
                              )}
                              {isCompleted && (
                                <span className="text-[8px] font-bold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                                  Done
                                </span>
                              )}
                              {isPending && (
                                <span className="text-[8px] font-semibold text-slate-400 bg-slate-100/80 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                                  Pending
                                </span>
                              )}
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>

                  {/* Case Timeline logs */}
                  <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5 flex flex-col gap-3">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">Case Timeline Journey</h3>
                    <div className="flex flex-col gap-4 relative pl-3 border-l-2 border-slate-100 mt-2">
                      {leadDetail.timeline.map((evt: TimelineEvent) => (
                        <div key={evt.id} className="relative flex flex-col gap-0.5">
                          <div className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-amber-500 border-2 border-white shadow-sm" />
                          <span className="text-[10px] font-black uppercase text-amber-700 tracking-wide">
                            {evt.status.replace(/_/g, ' ')}
                          </span>
                          <span className="text-xs font-medium text-slate-600">{evt.remarks}</span>
                          <span className="text-[9px] text-slate-400">
                            By: {evt.user?.name || 'System'} | {new Date(evt.created_at).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            
            /* =============================================================
               STANDARD TABS VIEW
               ============================================================= */
            <div>
              
              {/* 1. DASHBOARD PAGE */}
              {activeTab === 'dashboard' && stats && (
                <div className="flex flex-col gap-8 animate-fadeIn">
                  
                  {/* Top Summary Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                    {[
                      { title: 'Total Leads', val: stats.totalLeads, icon: '📂', bg: 'bg-blue-500/10 text-blue-600 border border-blue-500/20' },
                      { title: 'Qualified Leads', val: stats.qualifiedLeads, icon: '⭐', bg: 'bg-purple-500/10 text-purple-600 border border-purple-500/20' },
                      { title: 'RM Approved Leads', val: stats.rmApprovedLeads, icon: '✅', bg: 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' },
                      { title: 'Active Cases', val: stats.activeCases, icon: '🔥', bg: 'bg-orange-500/10 text-orange-600 border border-orange-500/20' },
                      { title: 'Completed Cases', val: stats.completedCases, icon: '🏆', bg: 'bg-teal-500/10 text-teal-600 border border-teal-500/20' },
                      { title: 'Gold Collected Today', val: `${stats.goldCollectedToday} g`, icon: '🌟', bg: 'bg-amber-500/10 text-amber-600 border border-amber-500/20' },
                      { title: 'Revenue Today', val: `₹${stats.revenueToday.toLocaleString('en-IN')}`, icon: '💰', bg: 'bg-green-500/10 text-green-600 border border-green-500/20' },
                      { title: 'Conversion Rate', val: `${stats.conversionRate}%`, icon: '📈', bg: 'bg-indigo-500/10 text-indigo-600 border border-indigo-500/20' }
                    ].map((card, idx) => (
                      <div key={idx} className="bg-white border border-slate-200/80 shadow-sm p-4 sm:p-6 rounded-2xl flex items-center justify-between hover:shadow-md transition-all">
                        <div className="flex flex-col gap-1.5">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{card.title}</span>
                          <span className="text-2xl font-black text-slate-900">{card.val}</span>
                        </div>
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg ${card.bg}`}>
                          {card.icon}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* MAIN DASHBOARD WIDGETS (12-col grid) */}
                  <div className="grid grid-cols-1 md:grid-cols-6 xl:grid-cols-12 gap-4 sm:gap-6 mt-2">
                    
                    {/* Row 1: Funnel, Summary, Exec Status */}
                    {/* Business Funnel */}
                    <div className="bg-white border border-slate-200/80 shadow-sm rounded-3xl p-6 col-span-1 md:col-span-3 xl:col-span-3 flex flex-col h-full">
                      <h3 className="text-xs font-bold text-[#4d0711] uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Business Funnel (Today)</h3>
                      <div className="flex flex-col w-full gap-1 mt-2 flex-1 justify-center">
                        {funnelStages.map((stage, idx) => {
                          const topInset = idx * 6; 
                          const botInset = (idx + 1) * 6;
                          return (
                            <div key={idx} className="flex items-center w-full relative">
                              <div className="w-[120px] xl:w-[140px] shrink-0 h-9 relative flex items-center justify-center text-white font-bold text-[10px] shadow-sm group cursor-pointer"
                                   style={{ 
                                     clipPath: `polygon(${topInset}% 0%, ${100 - topInset}% 0%, ${100 - botInset}% 100%, ${botInset}% 100%)`
                                    }}
                              >
                                <div className={`absolute inset-0 ${stage.color} group-hover:opacity-90 transition-opacity`} />
                                <span className="relative z-10">{stage.value}</span>
                              </div>
                              <div className="flex-1 ml-3 flex justify-between items-center text-[10px]">
                                <span className="font-bold text-slate-700 leading-tight">{stage.name}</span>
                                <span className="text-slate-500 font-extrabold">{stage.percentage}%</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Today's Business Summary */}
                    <div className="bg-white border border-slate-200/80 shadow-sm rounded-3xl p-6 col-span-1 md:col-span-3 xl:col-span-3 flex flex-col h-full">
                      <h3 className="text-xs font-bold text-[#4d0711] uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Today's Business Summary</h3>
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 flex-1">
                        <div className="flex flex-col gap-3 justify-center">
                          {businessSummary.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                <span className={`w-5 h-5 flex items-center justify-center rounded-md bg-slate-50 ${item.color} text-[10px]`}>{item.icon}</span>
                                <span className="font-semibold text-slate-700 text-[10px]">{item.name}</span>
                              </div>
                              <span className="font-black text-slate-900">{item.value}</span>
                            </div>
                          ))}
                        </div>
                        <div className="flex flex-col gap-3 xl:border-l xl:border-slate-100 xl:pl-4 pt-3 xl:pt-0 border-t xl:border-t-0 border-slate-100 justify-center">
                          <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Business Highlights</h4>
                          {businessHighlights.map((item, idx) => (
                            <div key={idx} className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-semibold">
                                <span className={item.color}>{item.icon}</span> {item.name}
                              </div>
                              <div className="font-black text-slate-900 text-xs ml-5">{item.value}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Live Executive Status */}
                    <div className="bg-white border border-slate-200/80 shadow-sm rounded-3xl p-6 col-span-1 md:col-span-6 xl:col-span-6 flex flex-col h-full">
                      <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                        <h3 className="text-xs font-bold text-[#4d0711] uppercase tracking-wider">Live Executive Status (Today)</h3>
                        <button className="text-[10px] font-bold text-amber-600 hover:underline cursor-pointer">View All Executives →</button>
                      </div>
                      <div className="overflow-x-auto flex-1">
                        <table className="w-full text-left text-xs min-w-[400px]">
                          <thead>
                            <tr className="text-slate-400 border-b border-slate-100/50">
                              <th className="pb-2 font-semibold">Executive</th>
                              <th className="pb-2 font-semibold">Status</th>
                              <th className="pb-2 font-semibold">Today's Activity</th>
                              <th className="pb-2 font-semibold text-center">Cases</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {liveExecutiveStatusList.length === 0 ? (
                              <tr>
                                <td colSpan={4} className="py-8 text-center text-slate-400 italic">
                                  No active Field Executives operations today.
                                </td>
                              </tr>
                            ) : (
                              liveExecutiveStatusList.map(exec => (
                                <tr key={exec.id} className="hover:bg-slate-50 transition-colors group">
                                  <td className="py-2">
                                    <div className="flex items-center gap-2">
                                      <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-black text-[#4d0711]">{exec.avatar}</span>
                                      <span className="font-bold text-slate-800">{exec.name}</span>
                                    </div>
                                  </td>
                                  <td className="py-2">
                                    <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wide ${exec.statusColor}`}>
                                      {exec.status}
                                    </span>
                                  </td>
                                  <td className="py-2 font-medium text-slate-600 text-[11px]">{exec.activity}</td>
                                  <td className="py-2 text-center font-black text-slate-800">{exec.cases}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Row 2: Revenue & Lead Sources */}
                    {/* Revenue Analytics */}
                    <div className="bg-white border border-slate-200/80 shadow-sm rounded-3xl p-6 col-span-1 md:col-span-6 xl:col-span-8 flex flex-col h-full">
                      <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                        <h3 className="text-xs font-bold text-[#4d0711] uppercase tracking-wider">Revenue Analytics</h3>
                        <select className="text-[10px] font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 outline-none cursor-pointer">
                          <option>This Month</option>
                          <option>Last Month</option>
                        </select>
                      </div>
                      <div className="h-[220px] w-full mt-2">
                        {isClient && (
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={revenueData.trend && revenueData.trend.length > 0 ? revenueData.trend : []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                              <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                              <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v/100000}L`} />
                              <Tooltip 
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                formatter={(value) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Revenue']} 
                              />
                              <Line type="monotone" dataKey="revenue" stroke="#4d0711" strokeWidth={3} activeDot={{ r: 6, fill: '#c3902c', stroke: '#fff', strokeWidth: 2 }} dot={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </div>

                    {/* Lead Sources */}
                    <div className="bg-white border border-slate-200/80 shadow-sm rounded-3xl p-6 col-span-1 md:col-span-6 xl:col-span-4 flex flex-col h-full">
                      <h3 className="text-xs font-bold text-[#4d0711] uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Lead Sources (This Month)</h3>
                      <div className="h-[180px] w-full relative">
                        {isClient && leadSourcesList.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={leadSourcesList}
                                cx="50%"
                                cy="50%"
                                innerRadius={50}
                                outerRadius={80}
                                paddingAngle={2}
                                dataKey="value"
                                stroke="none"
                              >
                                {leadSourcesList.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-400 italic">No lead sources recorded</div>
                        )}
                        {leadSourcesList.length > 0 && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-lg font-black text-slate-800">{leads.length}</span>
                            <span className="text-[9px] font-bold text-slate-400">Total Leads</span>
                          </div>
                        )}
                      </div>
                      <div className="mt-2 flex flex-col gap-1.5">
                        {leadSourcesList.slice(0,3).map((item, i) => (
                          <div key={i} className="flex justify-between items-center text-[10px]">
                            <div className="flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                              <span className="font-medium text-slate-600">{item.name}</span>
                            </div>
                            <span className="font-bold text-slate-800">{item.value} <span className="text-slate-400">({leads.length > 0 ? Math.round(item.value/leads.length*100) : 0}%)</span></span>
                          </div>
                        ))}
                        <button className="text-[10px] font-bold text-amber-600 hover:underline text-center mt-1 cursor-pointer">View Full Report →</button>
                      </div>
                    </div>

                    {/* Row 3: Exec Performance, Gold Summary, Alerts */}
                    {/* Executive Performance */}
                    <div className="bg-white border border-slate-200/80 shadow-sm rounded-3xl p-6 col-span-1 md:col-span-6 xl:col-span-6 flex flex-col h-full overflow-hidden">
                      <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                        <h3 className="text-xs font-bold text-[#4d0711] uppercase tracking-wider">Executive Performance (This Month)</h3>
                        <button className="text-[10px] font-bold text-amber-600 hover:underline cursor-pointer">View All</button>
                      </div>
                      <div className="overflow-x-auto flex-1">
                        <table className="w-full text-left text-xs min-w-[500px]">
                          <thead>
                            <tr className="text-slate-400 border-b border-slate-100/50">
                              <th className="pb-2 font-semibold">Rank</th>
                              <th className="pb-2 font-semibold">Executive</th>
                              <th className="pb-2 font-semibold text-center">Assigned Leads</th>
                              <th className="pb-2 font-semibold text-center">Completed Cases</th>
                              <th className="pb-2 font-semibold text-right">Gold (g)</th>
                              <th className="pb-2 font-semibold text-right">Revenue (₹)</th>
                              <th className="pb-2 font-semibold text-right">Conv. Rate</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {sortedExecPerformanceList.length === 0 ? (
                              <tr>
                                <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                                  No performance records available.
                                </td>
                              </tr>
                            ) : (
                              sortedExecPerformanceList.map((exec, idx) => (
                                <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                                  <td className="py-2.5">
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${idx === 0 ? 'bg-amber-100 text-amber-600' : idx === 1 ? 'bg-slate-200 text-slate-600' : idx === 2 ? 'bg-orange-100 text-orange-600' : 'bg-slate-50 text-slate-400'}`}>
                                      {idx + 1}
                                    </div>
                                  </td>
                                  <td className="py-2.5 font-bold text-slate-800">{exec.name}</td>
                                  <td className="py-2.5 text-center font-medium text-slate-600">{exec.assignedLeads}</td>
                                  <td className="py-2.5 text-center font-medium text-slate-600">{exec.completedCases}</td>
                                  <td className="py-2.5 text-right font-medium text-slate-700">{Number(exec.goldCollected || 0).toFixed(2)}</td>
                                  <td className="py-2.5 text-right font-bold text-slate-800">₹{Number(exec.amountHandled || 0).toLocaleString('en-IN')}</td>
                                  <td className={`py-2.5 text-right font-black ${exec.completionRate >= 50 ? 'text-emerald-600' : exec.completionRate >= 30 ? 'text-amber-500' : 'text-rose-500'}`}>
                                    {exec.completionRate}%
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Gold Collection Summary */}
                    <div className="bg-white border border-slate-200/80 shadow-sm rounded-3xl p-6 col-span-1 md:col-span-3 xl:col-span-3 flex flex-col h-full">
                      <h3 className="text-xs font-bold text-[#4d0711] uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Gold Collection Summary</h3>
                      <select className="w-full text-[10px] font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 outline-none mb-4 cursor-pointer">
                        <option>This Month</option>
                        <option>Last Month</option>
                        <option>This Year</option>
                      </select>
                      <div className="flex flex-col gap-3 flex-1 justify-center">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500 font-medium">Today</span>
                          <span className="font-black text-amber-600">🌟 {(goldData.today || 0).toFixed(2)} g</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500 font-medium">This Month</span>
                          <span className="font-bold text-slate-800">{(goldData.month || 0).toFixed(2)} g</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500 font-medium">All Time Total</span>
                          <span className="font-bold text-slate-800">{(goldData.total || 0).toFixed(2)} g</span>
                        </div>
                      </div>
                      <button className="text-[10px] font-bold text-amber-600 hover:underline text-center mt-4 cursor-pointer">View Full Report →</button>
                    </div>

                    {/* Alerts & Notifications */}
                    <div className="bg-white border border-slate-200/80 shadow-sm rounded-3xl p-6 col-span-1 md:col-span-3 xl:col-span-3 flex flex-col h-full">
                      <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                        <h3 className="text-xs font-bold text-[#4d0711] uppercase tracking-wider">Alerts & Notifications</h3>
                        <button className="text-[10px] font-bold text-amber-600 hover:underline cursor-pointer">View All</button>
                      </div>
                      <div className="flex flex-col gap-2.5 flex-1">
                        {dynamicAlertsList.map(alert => (
                          <div key={alert.id} className={`flex justify-between items-center text-[10px] p-1.5 rounded-lg transition-colors group ${alert.bg}`}>
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 flex items-center justify-center rounded-md font-bold">{alert.icon}</span>
                              <span className={`font-semibold ${alert.color}`}>{alert.text}</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full font-black ${alert.color}`}>{alert.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* 2. LEAD MONITORING PAGE */}
              {activeTab === 'leads' && (
                <div className="bg-white border border-slate-200/80 shadow-sm rounded-3xl p-6 flex flex-col gap-6 animate-fadeIn">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <input
                      type="text"
                      placeholder="Search leads by customer, ID, or district..."
                      value={leadsSearch}
                      onChange={(e) => setLeadsSearch(e.target.value)}
                      className="max-w-md w-full border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-amber-500 focus:bg-white transition-all shadow-sm"
                    />
                    <span className="text-xs text-slate-400 font-bold shrink-0">
                      Total: {filteredLeads.length} leads
                    </span>
                  </div>

                  <div className="overflow-x-auto w-full -mx-4 px-4 sm:mx-0 sm:px-0">
                    <table className="w-full min-w-[700px] border-collapse text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 border-b border-slate-100 font-bold">
                          <th className="p-4">Lead ID</th>
                          <th className="p-4">Customer Name</th>
                          <th className="p-4">District</th>
                          <th className="p-4">RM</th>
                          <th className="p-4">Executive</th>
                          <th className="p-4">Current Status</th>
                          <th className="p-4">Created Date</th>
                          <th className="p-4 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredLeads.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="p-8 text-center text-slate-400 italic">No matching leads found.</td>
                          </tr>
                        ) : (
                          filteredLeads.map((l) => (
                            <tr key={l.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="p-4 font-mono font-bold text-slate-600">{l.lead_number}</td>
                              <td className="p-4 font-extrabold text-slate-800">{l.customer_name}</td>
                              <td className="p-4 font-medium text-slate-600">{l.district || 'N/A'}</td>
                              <td className="p-4 font-semibold text-slate-700">{l.rm?.name || 'Unassigned'}</td>
                              <td className="p-4 font-semibold text-slate-700">{l.executive?.name || 'Unassigned'}</td>
                              <td className="p-4">{getStatusBadge(l.current_status)}</td>
                              <td className="p-4 text-slate-400">{new Date(l.created_at).toLocaleDateString()}</td>
                              <td className="p-4 text-center">
                                <button
                                  onClick={() => handleInspectLead(l.id)}
                                  className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/25 text-amber-700 rounded-lg font-bold hover:bg-amber-500 hover:text-black transition-all cursor-pointer text-[10px]"
                                >
                                  View Lead
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 3. FUND APPROVALS PAGE */}
              {activeTab === 'funds' && (
                <div className="bg-white border border-slate-200/80 shadow-sm rounded-3xl p-6 flex flex-col gap-6 animate-fadeIn">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">Fund Requests Approval queue</h3>
                    <span className="text-xs text-slate-400 font-bold">
                      Pending requests: {fundRequests.filter(r => r.status === 'PENDING').length}
                    </span>
                  </div>

                  <div className="overflow-x-auto w-full -mx-4 px-4 sm:mx-0 sm:px-0">
                    <table className="w-full min-w-[800px] border-collapse text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 border-b border-slate-100 font-bold">
                          <th className="p-4">Request ID</th>
                          <th className="p-4">Lead Number</th>
                          <th className="p-4">Customer Name</th>
                          <th className="p-4">Requested Amount</th>
                          <th className="p-4">Requested By</th>
                          <th className="p-4">Request Date</th>
                          <th className="p-4">Status</th>
                          <th className="p-4 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {fundRequests.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="p-8 text-center text-slate-400 italic">No fund requests found in records.</td>
                          </tr>
                        ) : (
                          fundRequests.map((r) => (
                            <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="p-4 font-mono font-bold text-slate-500">#{r.id.slice(0, 8)}</td>
                              <td className="p-4 font-mono font-bold text-slate-800">{r.lead?.lead_number || 'N/A'}</td>
                              <td className="p-4 font-extrabold text-slate-800">{r.lead?.customer_name || 'N/A'}</td>
                              <td className="p-4 font-black text-slate-800">₹{Number(r.requested_amount).toLocaleString('en-IN')}</td>
                              <td className="p-4 font-semibold text-slate-700">{r.requested_by_user?.name || 'Executive'}</td>
                              <td className="p-4 text-slate-400">{new Date(r.created_at).toLocaleDateString()}</td>
                              <td className="p-4">
                                <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase ${
                                  r.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                                  r.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                                }`}>
                                  {r.status}
                                </span>
                              </td>
                              <td className="p-4 text-center">
                                {r.status === 'PENDING' ? (
                                  <div className="flex justify-center">
                                    <button
                                      onClick={() => {
                                        setActiveFundRequest(r);
                                        setApprovedAmountInput(r.requested_amount.toString());
                                        setFundModalType('approve');
                                      }}
                                      className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 transition-all cursor-pointer text-[10px]"
                                    >
                                      Approve
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-slate-400 italic">Processed</span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 4. REVENUE REPORTS PAGE */}
              {activeTab === 'revenue' && (
                <div className="flex flex-col gap-6 animate-fadeIn">
                  
                  {/* Revenue Summary Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                    {[
                      { title: "Today's Revenue", val: revenueData.today, icon: "💵" },
                      { title: "Weekly Revenue", val: revenueData.week, icon: "📊" },
                      { title: "Monthly Revenue", val: revenueData.month, icon: "🏛️" },
                      { title: "Yearly Revenue", val: revenueData.year, icon: "👑" }
                    ].map((card, idx) => (
                      <div key={idx} className="bg-white border border-slate-200/80 shadow-sm p-4 sm:p-6 rounded-2xl flex items-center justify-between">
                        <div className="flex flex-col gap-1.5">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{card.title}</span>
                          <span className="text-2xl font-black text-slate-900">₹{Number(card.val || 0).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="text-2xl">{card.icon}</div>
                      </div>
                    ))}
                  </div>

                  {/* Charts Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Revenue Trend Line */}
                    <div className="bg-white border border-slate-200/80 shadow-sm rounded-3xl p-6">
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-3 mb-4">Revenue Trend (Last 30 Days)</h3>
                      <div className="h-[300px] w-full">
                        {isClient && revenueData.trend && (
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={revenueData.trend}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                              <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} />
                              <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={(v) => `₹${v/1000}k`} />
                              <Tooltip formatter={(value) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Revenue']} />
                              <Line type="monotone" dataKey="revenue" stroke="#4d0711" strokeWidth={3} activeDot={{ r: 6 }} dot={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </div>

                    {/* Monthly Comparison Bar */}
                    <div className="bg-white border border-slate-200/80 shadow-sm rounded-3xl p-6">
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-3 mb-4">Monthly Revenue Comparison (Last 6 Months)</h3>
                      <div className="h-[300px] w-full">
                        {isClient && revenueData.comparison && (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={revenueData.comparison}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                              <XAxis dataKey="month" stroke="#94a3b8" fontSize={10} />
                              <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={(v) => `₹${v/1000}k`} />
                              <Tooltip formatter={(value) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Revenue']} />
                              <Bar dataKey="revenue" fill="#c3902c" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 5. GOLD COLLECTION PAGE */}
              {activeTab === 'gold' && (
                <div className="flex flex-col gap-6 animate-fadeIn">
                  
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                      { title: 'Gold Collected Today', val: `${goldData.today} g`, bg: 'bg-[#4d0711]/5 border border-[#4d0711]/15 text-[#4d0711]' },
                      { title: 'Gold Collected This Month', val: `${goldData.month} g`, bg: 'bg-[#c3902c]/5 border border-[#c3902c]/15 text-amber-800' },
                      { title: 'Total Gold Collected', val: `${goldData.total} g`, bg: 'bg-emerald-500/5 border border-emerald-500/15 text-emerald-800' }
                    ].map((card, idx) => (
                      <div key={idx} className={`p-6 rounded-2xl shadow-sm flex items-center justify-between ${card.bg}`}>
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-bold uppercase tracking-wider">{card.title}</span>
                          <span className="text-2xl font-black">{card.val}</span>
                        </div>
                        <span className="text-2xl">🌟</span>
                      </div>
                    ))}
                  </div>

                  {/* Collections List */}
                  <div className="bg-white border border-slate-200/80 shadow-sm rounded-3xl p-6">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-3 mb-4">Gold Ornaments collection log</h3>
                    <div className="overflow-x-auto w-full -mx-4 px-4 sm:mx-0 sm:px-0">
                      <table className="w-full min-w-[800px] border-collapse text-left text-xs">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 border-b border-slate-100 font-bold">
                            <th className="p-4">Lead ID</th>
                            <th className="p-4">Customer Name</th>
                            <th className="p-4">Executive</th>
                            <th className="p-4">Gross Weight (g)</th>
                            <th className="p-4">Net Weight (g)</th>
                            <th className="p-4">Purity (%)</th>
                            <th className="p-4">Purchase Amount</th>
                            <th className="p-4">Received Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {goldData.list.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="p-8 text-center text-slate-400 italic">No gold collection entries found.</td>
                            </tr>
                          ) : (
                            goldData.list.map((item: GoldCollectionItem) => (
                              <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="p-4 font-mono font-bold text-slate-650">{item.lead_number}</td>
                                <td className="p-4 font-extrabold text-slate-800">{item.customer_name}</td>
                                <td className="p-4 font-semibold text-slate-700">{item.executive_name}</td>
                                <td className="p-4 font-bold text-slate-600">{item.gross_weight} g</td>
                                <td className="p-4 font-black text-slate-800">{item.net_weight} g</td>
                                <td className="p-4 font-medium text-slate-650">{item.purity}%</td>
                                <td className="p-4 font-bold text-amber-700">₹{Number(item.purchase_amount).toLocaleString('en-IN')}</td>
                                <td className="p-4 text-slate-400">{new Date(item.received_date).toLocaleString()}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* 6. EMPLOYEE PERFORMANCE PAGE */}
              {activeTab === 'employees' && (
                <div className="flex flex-col gap-8 animate-fadeIn">
                  
                  {/* Telecallers Performance */}
                  <div className="bg-white border border-slate-200/80 shadow-sm rounded-3xl p-6">
                    <h3 className="text-xs font-bold text-[#4d0711] uppercase tracking-wider border-b border-slate-100 pb-3 mb-4">Telecaller Performance</h3>
                    <div className="overflow-x-auto w-full -mx-4 px-4 sm:mx-0 sm:px-0">
                      <table className="w-full min-w-[600px] border-collapse text-left text-xs">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 border-b border-slate-100 font-bold">
                            <th className="p-4">Telecaller Name</th>
                            <th className="p-4">Total Leads Created</th>
                            <th className="p-4">Leads Sent to RM</th>
                            <th className="p-4">Conversion Rate (%)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {empPerformance.telecaller.map((tc: any, i: number) => (
                            <tr key={i} className="hover:bg-slate-50/50">
                              <td className="p-4 font-bold text-slate-800">{tc.name}</td>
                              <td className="p-4 font-black text-slate-750">{tc.totalLeadsCreated}</td>
                              <td className="p-4 font-semibold text-slate-650">{tc.leadsSentToRm}</td>
                              <td className="p-4 text-emerald-600 font-extrabold">{tc.conversionRate}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* RM Performance */}
                  <div className="bg-white border border-slate-200/80 shadow-sm rounded-3xl p-6">
                    <h3 className="text-xs font-bold text-[#4d0711] uppercase tracking-wider border-b border-slate-100 pb-3 mb-4">RM Performance</h3>
                    <div className="overflow-x-auto w-full -mx-4 px-4 sm:mx-0 sm:px-0">
                      <table className="w-full min-w-[700px] border-collapse text-left text-xs">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 border-b border-slate-100 font-bold">
                            <th className="p-4">RM Name</th>
                            <th className="p-4">Leads Reviewed</th>
                            <th className="p-4">Approved</th>
                            <th className="p-4">Rejected</th>
                            <th className="p-4">Approval Rate (%)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {empPerformance.rm.map((rm: any, i: number) => (
                            <tr key={i} className="hover:bg-slate-50/50">
                              <td className="p-4 font-bold text-slate-800">{rm.name}</td>
                              <td className="p-4 font-black text-slate-750">{rm.leadsReviewed}</td>
                              <td className="p-4 font-semibold text-emerald-650">{rm.approved}</td>
                              <td className="p-4 font-semibold text-rose-650">{rm.rejected}</td>
                              <td className="p-4 text-amber-600 font-extrabold">{rm.approvalRate}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Executive Performance */}
                  <div className="bg-white border border-slate-200/80 shadow-sm rounded-3xl p-6">
                    <h3 className="text-xs font-bold text-[#4d0711] uppercase tracking-wider border-b border-slate-100 pb-3 mb-4">Executive Performance</h3>
                    <div className="overflow-x-auto w-full -mx-4 px-4 sm:mx-0 sm:px-0">
                      <table className="w-full min-w-[800px] border-collapse text-left text-xs">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 border-b border-slate-100 font-bold">
                            <th className="p-4">Executive Name</th>
                            <th className="p-4">Assigned Leads</th>
                            <th className="p-4">Completed Cases</th>
                            <th className="p-4">Gold Collected (g)</th>
                            <th className="p-4">Amount Handled</th>
                            <th className="p-4">Completion Rate (%)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {empPerformance.executive.map((ex: any, i: number) => (
                            <tr key={i} className="hover:bg-slate-50/50">
                              <td className="p-4 font-bold text-slate-800">{ex.name}</td>
                              <td className="p-4 font-black text-slate-750">{ex.assignedLeads}</td>
                              <td className="p-4 font-semibold text-emerald-600">{ex.completedCases}</td>
                              <td className="p-4 font-bold text-slate-700">{ex.goldCollected} g</td>
                              <td className="p-4 font-bold text-slate-700">₹{ex.amountHandled.toLocaleString('en-IN')}</td>
                              <td className="p-4 text-indigo-600 font-extrabold">{ex.completionRate}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              )}

              {/* 7. BRANCH PERFORMANCE PAGE */}
              {activeTab === 'branches' && (
                <div className="bg-white border border-slate-200/80 shadow-sm rounded-3xl p-6 animate-fadeIn">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Branch Performance</h3>
                    <button
                      onClick={() => setIsAddBranchModalOpen(true)}
                      className="px-3 py-1.5 bg-[#4d0711] text-amber-500 rounded-lg text-[10px] font-bold hover:bg-[#2e040a] transition-all cursor-pointer shadow-sm"
                    >
                      + Add New Branch
                    </button>
                  </div>
                  <div className="border border-slate-100 rounded-2xl overflow-hidden">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 border-b border-slate-100 font-bold">
                          <th className="p-4">Branch</th>
                          <th className="p-4">Total Leads</th>
                          <th className="p-4">Approved Leads</th>
                          <th className="p-4">Completed Cases</th>
                          <th className="p-4">Revenue</th>
                          <th className="p-4">Gold Collected (g)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {branchPerformance.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-slate-400 italic">No branch performance records.</td>
                          </tr>
                        ) : (
                          branchPerformance.map((bp, i) => (
                            <tr key={i} className="hover:bg-slate-50/50">
                              <td className="p-4 font-extrabold text-[#4d0711]">{bp.branch}</td>
                              <td className="p-4 font-black text-slate-750">{bp.totalLeads}</td>
                              <td className="p-4 font-semibold text-emerald-600">{bp.approvedLeads}</td>
                              <td className="p-4 font-semibold text-teal-650">{bp.completedCases}</td>
                              <td className="p-4 font-bold text-slate-800">₹{bp.revenue.toLocaleString('en-IN')}</td>
                              <td className="p-4 font-black text-amber-700">{bp.goldCollected} g</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 8. CASE TIMELINE PAGE */}
              {activeTab === 'timeline' && (
                <div className="flex flex-col gap-6 animate-fadeIn">
                  
                  {/* Timeline filters */}
                  <div className="bg-white border border-slate-200/80 shadow-sm rounded-3xl p-6 grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Lead Number</span>
                      <input
                        type="text"
                        placeholder="e.g. SGL-2026-0001"
                        value={timelineLeadNumber}
                        onChange={(e) => setTimelineLeadNumber(e.target.value)}
                        className="border border-slate-200 bg-slate-50/50 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Status filter</span>
                      <select
                        value={timelineStatus}
                        onChange={(e) => setTimelineStatus(e.target.value)}
                        className="border border-slate-200 bg-slate-50/50 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500"
                      >
                        <option value="">All Statuses</option>
                        <option value="CUSTOMER_DETAILS_CREATED">Lead Created</option>
                        <option value="SENT_TO_RM">Sent to RM</option>
                        <option value="RM_APPROVED">Approved by RM</option>
                        <option value="MD_FUNDS_APPROVED">Funds Approved by MD</option>
                        <option value="MD_FUNDS_REJECTED">Funds Rejected by MD</option>
                        <option value="EXECUTIVE_ASSIGNED">Executive Assigned</option>
                        <option value="CASE_COMPLETED">Case Completed</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Start Date</span>
                      <input
                        type="date"
                        value={timelineStartDate}
                        onChange={(e) => setTimelineStartDate(e.target.value)}
                        className="border border-slate-200 bg-slate-50/50 rounded-xl px-3 py-2 text-xs focus:outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1 justify-end">
                      <button
                        onClick={fetchTimeline}
                        className="w-full bg-[#4d0711] hover:bg-[#2e040a] text-amber-250 font-bold text-xs py-2 px-4 rounded-xl shadow-md transition-all cursor-pointer text-center text-white"
                      >
                        Apply Filters
                      </button>
                    </div>
                  </div>

                  {/* Logs Table */}
                  <div className="bg-white border border-slate-200/80 shadow-sm rounded-3xl p-6">
                    <div className="overflow-x-auto w-full -mx-4 px-4 sm:mx-0 sm:px-0">
                      <table className="w-full min-w-[800px] border-collapse text-left text-xs">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 border-b border-slate-100 font-bold">
                            <th className="p-4">Lead ID</th>
                            <th className="p-4">Customer Name</th>
                            <th className="p-4">Timeline Status</th>
                            <th className="p-4">Updated By</th>
                            <th className="p-4">Remarks</th>
                            <th className="p-4">Date & Time</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {timelineEvents.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="p-8 text-center text-slate-400 italic">No timeline matches. Try adjusting filters.</td>
                            </tr>
                          ) : (
                            timelineEvents.map((evt) => (
                              <tr key={evt.id} className="hover:bg-slate-50/50">
                                <td className="p-4 font-mono font-bold text-slate-650">{evt.lead?.lead_number || 'N/A'}</td>
                                <td className="p-4 font-bold text-slate-800">{evt.lead?.customer_name || 'N/A'}</td>
                                <td className="p-4">{getStatusBadge(evt.status)}</td>
                                <td className="p-4 font-semibold text-slate-700">{evt.user?.name || 'System'}</td>
                                <td className="p-4 text-slate-600 font-medium">{evt.remarks}</td>
                                <td className="p-4 text-slate-400">{new Date(evt.created_at).toLocaleString()}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* 8.5 EMPLOYEE MANAGEMENT PAGE */}
              {activeTab === 'employee-management' && (
                <div className="bg-white border border-slate-200/80 shadow-sm rounded-3xl p-6 animate-fadeIn">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Employee Management</h3>
                    <button
                      onClick={() => {
                        setEmployeeForm({ id: '', branch_id: branchesList.length > 0 ? branchesList[0].id : '', name: '', role: 'TELECALLER', mobile: '', email: '', password: '' });
                        setIsEmployeeModalOpen(true);
                      }}
                      className="px-3 py-1.5 bg-[#4d0711] text-amber-500 rounded-lg text-[10px] font-bold hover:bg-[#2e040a] transition-all cursor-pointer shadow-sm"
                    >
                      + Create New Employee
                    </button>
                  </div>
                  <div className="border border-slate-100 rounded-2xl overflow-hidden">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 border-b border-slate-100 font-bold">
                          <th className="p-4">Name</th>
                          <th className="p-4">Role</th>
                          <th className="p-4">Branch</th>
                          <th className="p-4">Mobile</th>
                          <th className="p-4">Email</th>
                          <th className="p-4">Status</th>
                          <th className="p-4 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {employeesList.length === 0 ? (
                          <tr><td colSpan={7} className="p-8 text-center text-slate-400 italic">No employees found.</td></tr>
                        ) : (
                          employeesList.map((emp, i) => (
                            <tr key={i} className="hover:bg-slate-50/50">
                              <td className="p-4 font-extrabold text-[#4d0711]">{emp.name}</td>
                              <td className="p-4 font-black text-slate-750">{emp.role}</td>
                              <td className="p-4 font-semibold text-emerald-600">{emp.branches?.branch_name || 'N/A'}</td>
                              <td className="p-4 font-semibold text-teal-650">{emp.mobile}</td>
                              <td className="p-4 font-bold text-slate-800">{emp.email}</td>
                              <td className="p-4 font-black text-amber-700">
                                <span className={`px-2 py-1 rounded text-[10px] ${emp.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{emp.status}</span>
                              </td>
                              <td className="p-4 flex items-center justify-center gap-2">
                                <button onClick={() => { setEmployeeForm({...emp, password: ''}); setIsEmployeeModalOpen(true); }} className="px-2 py-1 bg-blue-50 text-blue-600 border border-blue-200 rounded text-[10px] font-bold hover:bg-blue-100 cursor-pointer">Edit</button>
                                {emp.status === 'active' && (
                                  <button onClick={() => handleDeleteEmployee(emp.id)} className="px-2 py-1 bg-red-50 text-red-600 border border-red-200 rounded text-[10px] font-bold hover:bg-red-100 cursor-pointer">Deactivate</button>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 9. REPORTS & EXPORTS PAGE */}
              {activeTab === 'reports' && (
                <div className="bg-white border border-slate-200/80 shadow-sm rounded-3xl p-8 flex flex-col gap-6 animate-fadeIn max-w-xl mx-auto">
                  <div className="text-center flex flex-col gap-2">
                    <span className="text-3xl">🖨️</span>
                    <h3 className="text-sm font-extrabold text-[#4d0711] uppercase tracking-wide">Corporate Document Exporter</h3>
                    <p className="text-xs text-slate-400">Select a report module to compile and trigger backend compilation of formatted data sheets.</p>
                  </div>

                  <div className="flex flex-col gap-4 border border-slate-100 p-6 rounded-2xl bg-slate-50/50">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Report Source</span>
                      <select
                        value={reportsType}
                        onChange={(e) => setReportsType(e.target.value)}
                        className="w-full border border-slate-200 bg-white rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-amber-500"
                      >
                        <option value="lead">Lead Reports</option>
                        <option value="revenue">Revenue Reports</option>
                        <option value="gold">Gold Collection Reports</option>
                        <option value="branch">Branch Reports</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <button
                        onClick={() => triggerExport('excel')}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-95"
                      >
                        📥 Export Excel
                      </button>
                      <button
                        onClick={() => triggerExport('pdf')}
                        className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-95"
                      >
                        📥 Export PDF
                      </button>
                  </div>
                </div>
                </div>
              )}

              {/* 9.5 EXECUTIVE EXPENSES PAGE */}
              {activeTab === 'expenses' && (
                <div className="flex flex-col gap-8 animate-fadeIn">
                  
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Executive Expenses Tracker</h3>
                    <button
                      onClick={() => fetchExpenseData()}
                      className="px-3 py-1.5 bg-[#4d0711] text-amber-500 rounded-lg text-[10px] font-bold hover:bg-[#2e040a] transition-all cursor-pointer shadow-sm flex items-center gap-1"
                    >
                      🔄 Refresh Data
                    </button>
                  </div>

                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6 flex items-center justify-between">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Total Executive Expenses</span>
                        <span className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">₹{Number(expenseData.totalExpenses || 0).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center font-bold text-lg text-[#c3902c]">
                        ₹
                      </div>
                    </div>
                    
                    <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6 flex items-center justify-between">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Average Expense per Case</span>
                        <span className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
                          ₹{expenseData.logs?.length > 0 
                            ? Math.round(Number(expenseData.totalExpenses || 0) / expenseData.logs.length).toLocaleString('en-IN')
                            : '0'}
                        </span>
                      </div>
                      <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center font-bold text-lg text-indigo-650">
                        📈
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Left: Summary Table */}
                    <div className="lg:col-span-2 bg-white border border-slate-200 shadow-sm rounded-3xl p-6 flex flex-col gap-4">
                      <h3 className="text-xs font-bold text-[#4d0711] uppercase tracking-wider border-b border-slate-100 pb-3">Expenses by Executive</h3>
                      <div className="overflow-x-auto w-full -mx-4 px-4 sm:mx-0 sm:px-0">
                        <table className="w-full min-w-[500px] border-collapse text-left text-xs">
                          <thead>
                            <tr className="bg-slate-50 text-slate-500 border-b border-slate-100 font-bold">
                              <th className="p-4">Employee Code</th>
                              <th className="p-4">Executive Name</th>
                              <th className="p-4">Cases Closed</th>
                              <th className="p-4">Total Expenses</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {expenseData.executiveSummary?.length === 0 ? (
                              <tr>
                                <td colSpan={4} className="p-8 text-center text-slate-400 italic">No executive expenses logged yet.</td>
                              </tr>
                            ) : (
                              expenseData.executiveSummary?.map((summary: any, i: number) => (
                                <tr key={i} className="hover:bg-slate-50/50">
                                  <td className="p-4 font-mono font-bold text-slate-550">{summary.employee_code}</td>
                                  <td className="p-4 font-bold text-slate-800">{summary.name}</td>
                                  <td className="p-4 font-semibold text-slate-655">{summary.count}</td>
                                  <td className="p-4 font-extrabold text-[#c3902c]">₹{Number(summary.totalAmount || 0).toLocaleString('en-IN')}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Right: Recharts Bar Chart */}
                    <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6 flex flex-col gap-4">
                      <h3 className="text-xs font-bold text-[#4d0711] uppercase tracking-wider border-b border-slate-100 pb-3">Expense Breakdown</h3>
                      <div className="h-64 w-full flex items-center justify-center">
                        {expenseData.executiveSummary?.length === 0 ? (
                          <span className="text-xs text-slate-400 italic">No chart data available</span>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={expenseData.executiveSummary}>
                              <XAxis dataKey="name" stroke="#88868A" fontSize={10} tickLine={false} />
                              <YAxis stroke="#88868A" fontSize={10} tickLine={false} axisLine={false} />
                              <Tooltip 
                                formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Expenses']}
                                contentStyle={{ background: '#3D1510', border: '1px solid #65483B', borderRadius: '12px', color: '#D9D9DA', fontSize: '11px' }}
                              />
                              <Bar dataKey="totalAmount" fill="#c3902c" radius={[8, 8, 0, 0]} barSize={24} />
                            </BarChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </div>

                  </div>

                  {/* Expense Transaction History logs */}
                  <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6">
                    <h3 className="text-xs font-bold text-[#4d0711] uppercase tracking-wider border-b border-slate-100 pb-3 mb-4">Detailed Expense Log</h3>
                    <div className="overflow-x-auto w-full -mx-4 px-4 sm:mx-0 sm:px-0">
                      <table className="w-full min-w-[800px] border-collapse text-left text-xs">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 border-b border-slate-100 font-bold">
                            <th className="p-4">Date</th>
                            <th className="p-4">Executive Name</th>
                            <th className="p-4">Lead Number</th>
                            <th className="p-4">Customer Name</th>
                            <th className="p-4">Expense Amount</th>
                            <th className="p-4">Remarks / Description</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {expenseData.logs?.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="p-8 text-center text-slate-400 italic">No expense entries found.</td>
                            </tr>
                          ) : (
                            expenseData.logs?.map((log: any) => (
                              <tr key={log.id} className="hover:bg-slate-50/50">
                                <td className="p-4 text-slate-400 font-mono">{new Date(log.created_at).toLocaleDateString()}</td>
                                <td className="p-4 font-bold text-slate-800">{log.executive_name} <span className="text-[10px] text-slate-400">({log.executive_code})</span></td>
                                <td className="p-4 font-mono font-bold text-[#4d0711]">{log.lead_number}</td>
                                <td className="p-4 font-semibold text-slate-655">{log.customer_name}</td>
                                <td className="p-4 font-black text-slate-800">₹{Number(log.amount).toLocaleString('en-IN')}</td>
                                <td className="p-4 text-slate-600 font-medium">{log.remarks}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              )}

            {activeTab === 'document-manager' && (
              <DocumentManager />
            )}

            </div>
          )}

        </main>
      </div>

      {/* ===================================================================
          FUND REQUEST DECISION MODALS
          =================================================================== */}
      {fundModalType && activeFundRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col gap-4 animate-scaleUp">
            
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="text-sm font-extrabold uppercase text-[#4d0711] tracking-wide">
                {fundModalType === 'approve' ? 'Approve Fund Request' : 'Reject Fund Request'}
              </h3>
              <button
                onClick={() => {
                  setFundModalType(null);
                  setActiveFundRequest(null);
                }}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-slate-500 bg-slate-50 p-4 rounded-2xl flex flex-col gap-2 font-medium">
              <div>Lead: <span className="font-bold text-slate-800">{activeFundRequest.lead?.lead_number} ({activeFundRequest.lead?.customer_name})</span></div>
              <div>Requested Amount: <span className="font-bold text-slate-850">₹{activeFundRequest.requested_amount.toLocaleString('en-IN')}</span></div>
              <div>Requested By: <span className="font-bold text-slate-800">{activeFundRequest.requested_by_user?.name}</span></div>
            </div>

            {fundModalType === 'approve' ? (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Approved Amount (₹)</span>
                  <input
                    type="number"
                    value={approvedAmountInput}
                    max={activeFundRequest.requested_amount}
                    onChange={(e) => setApprovedAmountInput(e.target.value)}
                    className="border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-[9px] text-slate-400">Must be less than or equal to ₹{activeFundRequest.requested_amount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Remarks / Notes</span>
                  <textarea
                    placeholder="Enter approval details..."
                    value={fundRemarksInput}
                    onChange={(e) => setFundRemarksInput(e.target.value)}
                    rows={3}
                    className="border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-2 text-xs font-medium focus:outline-none focus:border-amber-500 resize-none"
                  />
                </div>
                <button
                  onClick={handleApproveFund}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all mt-2 active:scale-95"
                >
                  Confirm Fund Approval
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Rejection Reason</span>
                  <select
                    value={rejectionReasonInput}
                    onChange={(e) => setRejectionReasonInput(e.target.value)}
                    className="border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-amber-500"
                  >
                    <option value="Discrepancy in documentation">Discrepancy in documentation</option>
                    <option value="Incorrect estimated value">Incorrect estimated value</option>
                    <option value="Exceeds daily branch limit">Exceeds daily branch limit</option>
                    <option value="Purity issues reported by RM">Purity issues reported by RM</option>
                    <option value="Other / Audit rejection">Other / Audit rejection</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Remarks / Reason Remarks</span>
                  <textarea
                    placeholder="Enter rejection notes..."
                    value={fundRemarksInput}
                    onChange={(e) => setFundRemarksInput(e.target.value)}
                    rows={3}
                    className="border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-2 text-xs font-medium focus:outline-none focus:border-amber-500 resize-none"
                  />
                </div>
                <button
                  onClick={handleRejectFund}
                  className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all mt-2 active:scale-95"
                >
                  Reject Fund Request
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ADD BRANCH MODAL */}
      {isAddBranchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full mx-4 shadow-2xl flex flex-col gap-4 animate-scaleUp">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="text-sm font-extrabold uppercase text-[#4d0711] tracking-wide">
                Add New Branch
              </h3>
              <button
                onClick={() => setIsAddBranchModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Branch Name *</label>
                <input
                  type="text"
                  value={newBranchData.branch_name}
                  onChange={(e) => setNewBranchData({ ...newBranchData, branch_name: e.target.value })}
                  placeholder="e.g. Mumbai"
                  className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-amber-500 transition-all"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">City</label>
                <input
                  type="text"
                  value={newBranchData.city}
                  onChange={(e) => setNewBranchData({ ...newBranchData, city: e.target.value })}
                  placeholder="e.g. Mumbai"
                  className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-amber-500 transition-all"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">State</label>
                <input
                  type="text"
                  value={newBranchData.state}
                  onChange={(e) => setNewBranchData({ ...newBranchData, state: e.target.value })}
                  placeholder="e.g. Maharashtra"
                  className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-amber-500 transition-all"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Address</label>
                <textarea
                  value={newBranchData.address}
                  onChange={(e) => setNewBranchData({ ...newBranchData, address: e.target.value })}
                  placeholder="Full branch address..."
                  rows={2}
                  className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-amber-500 transition-all resize-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-2">
              <button
                onClick={() => setIsAddBranchModalOpen(false)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold text-xs rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleAddBranch}
                className="w-full py-2.5 bg-[#4d0711] hover:bg-[#2e040a] text-amber-400 font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer"
              >
                Save Branch
              </button>
            </div>
          </div>
        </div>
  )}

  {/* ADD/EDIT EMPLOYEE MODAL */}
  {isEmployeeModalOpen && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full mx-4 shadow-2xl flex flex-col gap-4 animate-scaleUp">
        <div className="flex justify-between items-center border-b border-slate-100 pb-2">
          <h3 className="text-sm font-extrabold uppercase text-[#4d0711] tracking-wide">
            {employeeForm.id ? 'Edit Employee' : 'Create New Employee'}
          </h3>
          <button onClick={() => setIsEmployeeModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer">✕</button>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Branch *</label>
            <select
              value={employeeForm.branch_id}
              onChange={(e) => setEmployeeForm({ ...employeeForm, branch_id: e.target.value })}
              className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-2 text-xs font-semibold focus:outline-none focus:border-amber-500"
            >
              <option value="">Select Branch</option>
              {branchesList.map(b => (
                <option key={b.id} value={b.id}>{b.branch_name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Role *</label>
            <select
              value={employeeForm.role}
              onChange={(e) => setEmployeeForm({ ...employeeForm, role: e.target.value })}
              className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-2 text-xs font-semibold focus:outline-none focus:border-amber-500"
            >
              <option value="TELECALLER">Telecaller</option>
              <option value="RM">RM (Relationship Manager)</option>
              <option value="EXECUTIVE">Executive</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Name *</label>
            <input
              type="text"
              value={employeeForm.name}
              onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })}
              placeholder="Employee Name"
              className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-2 text-xs font-semibold focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Mobile *</label>
            <input
              type="text"
              value={employeeForm.mobile}
              onChange={(e) => setEmployeeForm({ ...employeeForm, mobile: e.target.value })}
              placeholder="Mobile Number"
              className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-2 text-xs font-semibold focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Email *</label>
            <input
              type="email"
              value={employeeForm.email}
              onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })}
              placeholder="Email Address"
              className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-2 text-xs font-semibold focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Password {employeeForm.id ? '(Leave blank to keep current)' : '*'}</label>
            <input
              type="password"
              value={employeeForm.password}
              onChange={(e) => setEmployeeForm({ ...employeeForm, password: e.target.value })}
              placeholder="Password"
              className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-2 text-xs font-semibold focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-2">
          <button
            onClick={() => setIsEmployeeModalOpen(false)}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold text-xs rounded-xl transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveEmployee}
            className="w-full py-2.5 bg-[#4d0711] hover:bg-[#2e040a] text-amber-400 font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer"
          >
            {employeeForm.id ? 'Save Changes' : 'Create Employee'}
          </button>
        </div>
      </div>
    </div>
  )}

</div>
  );
}
