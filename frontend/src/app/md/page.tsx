'use client';

import { useEffect, useState } from 'react';
import DocumentManager from '@/components/DocumentManager';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
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

export default function MDDashboard() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [loading, setLoading] = useState<boolean>(true);
  const [isClient, setIsClient] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

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

  const loadInitialData = async () => {
    setLoading(true);
    try {
      // Load user profile from stored user info or backend
      const userStr = localStorage.getItem('siva_user');
      if (userStr) {
        setProfile(JSON.parse(userStr));
      }
      await fetchDashboardStats();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
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

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch('http://localhost:5000/api/md/leads');
      if (res.ok) {
        const data = await res.json();
        setLeads(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeadDetails = async (id: string) => {
    try {
      const res = await authenticatedFetch(`http://localhost:5000/api/md/lead/${id}`);
      if (res.ok) {
        const data = await res.json();
        setLeadDetail(data);
        if (data.documents && data.documents.length > 0) {
          setPreviewDoc(data.documents[0].file_url);
        } else {
          setPreviewDoc(null);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchFundRequests = async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch('http://localhost:5000/api/md/fund-requests');
      if (res.ok) {
        const data = await res.json();
        setFundRequests(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRevenueData = async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch('http://localhost:5000/api/md/revenue');
      if (res.ok) {
        const data = await res.json();
        setRevenueData(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchGoldData = async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch('http://localhost:5000/api/md/gold-collection');
      if (res.ok) {
        const data = await res.json();
        setGoldData(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmpPerformance = async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch('http://localhost:5000/api/md/employee-performance');
      if (res.ok) {
        const data = await res.json();
        setEmpPerformance(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBranchPerformance = async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch('http://localhost:5000/api/md/branch-performance');
      if (res.ok) {
        const data = await res.json();
        setBranchPerformance(data);
      }
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
      fetchDashboardStats();
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
    } else if (activeTab === 'branches') {
      fetchBranchPerformance();
    } else if (activeTab === 'timeline') {
      fetchTimeline();
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

  const filteredLeads = leads.filter(l => 
    l.customer_name.toLowerCase().includes(leadsSearch.toLowerCase()) ||
    l.lead_number.toLowerCase().includes(leadsSearch.toLowerCase()) ||
    (l.district && l.district.toLowerCase().includes(leadsSearch.toLowerCase()))
  );

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
            <img src="/logo.png" alt="Shiva Gold Logo" className="w-full h-auto" onError={(e) => {
              e.currentTarget.style.display = 'none';
            }} />
            <span className="text-xl font-black text-amber-500 tracking-wider font-mono">SHIVA GOLD CO.</span>
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
            { id: 'employees', label: 'Employee Performance', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
            { id: 'branches', label: 'Branch Performance', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
            { id: 'timeline', label: 'Case Timeline', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
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
                          leadDetail.documents.map((doc: Document) => (
                            <button
                              key={doc.id}
                              onClick={() => setPreviewDoc(doc.file_url)}
                              className={`w-full flex items-center justify-between p-3 rounded-xl border text-left cursor-pointer transition-all ${
                                previewDoc === doc.file_url
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
                          ))
                        )}
                      </div>

                      <div className="md:col-span-2 bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center min-h-[250px] overflow-hidden">
                        {previewDoc ? (
                          <div className="w-full h-full flex flex-col gap-2">
                            <div className="flex justify-between items-center text-[10px] text-slate-400 border-b border-slate-200 pb-1.5">
                              <span>In-App Preview</span>
                              <a href={previewDoc} download target="_blank" rel="noreferrer" className="text-amber-600 font-bold hover:underline">
                                Open in New Tab ↗
                              </a>
                            </div>
                            <div className="flex-1 relative w-full h-[180px] sm:h-[220px] bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center">
                              {previewDoc.startsWith('data:image') || previewDoc.includes('.png') || previewDoc.includes('.jpg') || previewDoc.includes('.jpeg') ? (
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

                  {/* Corporate Overview Note */}
                  <div className="bg-gradient-to-r from-[#4d0711] to-[#200206] border border-[#691823]/30 p-6 rounded-3xl text-amber-100/90 flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg">
                    <div className="flex flex-col gap-1">
                      <h3 className="font-extrabold text-amber-400 text-sm uppercase tracking-wider">Strategic Operations Control</h3>
                      <p className="text-xs max-w-xl text-amber-100/70 leading-relaxed mt-1">
                        Welcome, Managing Director. You have administrative override privileges. Monitor branch volumes, employee conversions, revenue margins, and approve pending operational funds.
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => setActiveTab('funds')} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-extrabold text-xs rounded-xl shadow-md cursor-pointer transition-all active:scale-95">
                        💳 View Fund Requests
                      </button>
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
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-3 mb-4">Branch Performance</h3>
                  <div className="overflow-x-auto w-full -mx-4 px-4 sm:mx-0 sm:px-0">
                    <table className="w-full min-w-[700px] border-collapse text-left text-xs">
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

    </div>
  );
}
