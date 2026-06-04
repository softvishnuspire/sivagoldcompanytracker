'use client';

import { useEffect, useState } from 'react';
import DocumentManager from '@/components/DocumentManager';

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
  price_communicated?: boolean;
  created_at: string;
  updated_at: string;
  telecaller?: { name: string };
  rm?: { name: string };
  executive?: { name: string };
}

interface TimelineEvent {
  id: string;
  lead_id: string;
  status: string;
  remarks: string;
  updated_by: string;
  created_at: string;
  user?: { name: string };
}

interface Document {
  id: string;
  lead_id: string;
  document_type: string;
  file_url: string;
  uploaded_by?: string;
  created_at: string;
}

interface Executive {
  id: string;
  name: string;
  mobile: string;
  status: string;
}

interface DashboardStats {
  stats: {
    pendingVerification: number;
    approvedLeads: number;
    reVerificationLeads: number;
    rejectedLeads: number;
    executiveAssigned: number;
    completedCases: number;
  };
  pendingLeads: any[];
  executiveLoad: any[];
  recentActivity: any[];
}

export default function RMDashboard() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [loading, setLoading] = useState<boolean>(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [currentDate, setCurrentDate] = useState<string>('');
  
  // Dashboard statistics & lists
  const [statsData, setStatsData] = useState<DashboardStats | null>(null);
  const [pendingLeads, setPendingLeads] = useState<Lead[]>([]);
  const [approvedLeads, setApprovedLeads] = useState<any[]>([]);
  const [reverifyLeads, setReverifyLeads] = useState<any[]>([]);
  const [rejectedLeads, setRejectedLeads] = useState<any[]>([]);
  const [completedLeads, setCompletedLeads] = useState<any[]>([]);
  const [executives, setExecutives] = useState<Executive[]>([]);
  const [leadSources, setLeadSources] = useState<any[]>([]);
  const [allLeadsList, setAllLeadsList] = useState<Lead[]>([]);
  const [allTimelineEvents, setAllTimelineEvents] = useState<any[]>([]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');

  // Inspection states
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [leadDetail, setLeadDetail] = useState<{ lead: Lead; documents: Document[]; timeline: TimelineEvent[] } | null>(null);
  const [inspecting, setInspecting] = useState<boolean>(false);
  const [previewDoc, setPreviewDoc] = useState<string | null>(null);
  
  // Modals
  const [actionType, setActionType] = useState<'approve' | 'reverify' | 'reject' | 'assign' | null>(null);
  
  // Forms
  const [remarks, setRemarks] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [reverifyReason, setReverifyReason] = useState('Missing Gold Weight Slip');
  const [reverifyReqInfo, setReverifyReqInfo] = useState('');
  const [rejectReason, setRejectReason] = useState('Purity discrepancy');
  const [selectedExecutiveId, setSelectedExecutiveId] = useState('');

  const [profile, setProfile] = useState<any>({ name: '', employee_code: '', role: 'RM', mobile: '', email: '' });
  const [reportFilter, setReportFilter] = useState<'today' | 'week' | 'month'>('month');
  const [reportsData, setReportsData] = useState<any>({ totalLeads: 0, approvedLeads: 0, rejectedLeads: 0, reVerificationLeads: 0, executiveAssigned: 0, approvalRate: 0 });

  // =========================================================================
  // API INTEGRATION FETCHES
  // =========================================================================
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

  const downloadDocument = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.replace(/\s+/g, '_');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  const fetchDashboardData = async () => {
    try {
      const res = await authenticatedFetch('http://localhost:5000/api/rm/dashboard');
      if (res.ok) {
        const data = await res.json();
        setStatsData(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTabList = async (tab: string) => {
    setLoading(true);
    try {
      let url = '';
      if (tab === 'pending' || tab === 'pending-verify') url = 'http://localhost:5000/api/rm/pending-leads';
      else if (tab === 'approved') url = 'http://localhost:5000/api/rm/approved-leads';
      else if (tab === 'reverify') url = 'http://localhost:5000/api/rm/reverification-leads';
      else if (tab === 'rejected') url = 'http://localhost:5000/api/rm/rejected-leads';
      else if (tab === 'completed') url = 'http://localhost:5000/api/rm/completed-leads';
      else if (tab === 'assignment') url = 'http://localhost:5000/api/rm/approved-leads';

      if (url) {
        const res = await authenticatedFetch(url);
        if (res.ok) {
          const data = await res.json();
          if (tab === 'pending' || tab === 'pending-verify') setPendingLeads(data);
          else if (tab === 'approved') setApprovedLeads(data);
          else if (tab === 'reverify') setReverifyLeads(data);
          else if (tab === 'rejected') setRejectedLeads(data);
          else if (tab === 'completed') setCompletedLeads(data);
          else if (tab === 'assignment') setApprovedLeads(data);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllLeads = async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch('http://localhost:5000/api/rm/dashboard');
      if (res.ok) {
        const data = await res.json();
        const resPending = await authenticatedFetch('http://localhost:5000/api/rm/pending-leads');
        const resApproved = await authenticatedFetch('http://localhost:5000/api/rm/approved-leads');
        const pending = resPending.ok ? await resPending.json() : [];
        const approved = resApproved.ok ? await resApproved.json() : [];
        const combined = [...pending, ...approved];
        setAllLeadsList(combined);

        const sourceCounts: Record<string, number> = {};
        combined.forEach(lead => {
          const s = lead.source || 'Direct Calls';
          sourceCounts[s] = (sourceCounts[s] || 0) + 1;
        });

        setLeadSources([
          { id: '1', name: 'Website', status: 'Active', count: sourceCounts['Website'] || 0 },
          { id: '2', name: 'Facebook Ads', status: 'Active', count: sourceCounts['Facebook Ads'] || 0 },
          { id: '3', name: 'Google Ads', status: 'Active', count: sourceCounts['Google Ads'] || 0 },
          { id: '4', name: 'Referrals', status: 'Active', count: sourceCounts['Referrals'] || 0 },
          { id: '5', name: 'Direct Calls', status: 'Active', count: sourceCounts['Direct Calls'] || 0 },
          { id: '6', name: 'Walk-ins', status: 'Active', count: sourceCounts['Walk-ins'] || 0 }
        ]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchExecutives = async () => {
    try {
      const res = await authenticatedFetch('http://localhost:5000/api/rm/executives');
      if (res.ok) {
        const data = await res.json();
        setExecutives(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLeadSources = async () => {
    try {
      const resPending = await authenticatedFetch('http://localhost:5000/api/rm/pending-leads');
      const resApproved = await authenticatedFetch('http://localhost:5000/api/rm/approved-leads');
      const pending = resPending.ok ? await resPending.json() : [];
      const approved = resApproved.ok ? await resApproved.json() : [];
      const combined = [...pending, ...approved];

      const sourceCounts: Record<string, number> = {};
      combined.forEach(lead => {
        const s = lead.source || 'Direct Calls';
        sourceCounts[s] = (sourceCounts[s] || 0) + 1;
      });

      setLeadSources([
        { id: '1', name: 'Website', status: 'Active', count: sourceCounts['Website'] || 0 },
        { id: '2', name: 'Facebook Ads', status: 'Active', count: sourceCounts['Facebook Ads'] || 0 },
        { id: '3', name: 'Google Ads', status: 'Active', count: sourceCounts['Google Ads'] || 0 },
        { id: '4', name: 'Referrals', status: 'Active', count: sourceCounts['Referrals'] || 0 },
        { id: '5', name: 'Direct Calls', status: 'Active', count: sourceCounts['Direct Calls'] || 0 },
        { id: '6', name: 'Walk-ins', status: 'Active', count: sourceCounts['Walk-ins'] || 0 }
      ]);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchActivityLogs = async () => {
    try {
      const res = await authenticatedFetch('http://localhost:5000/api/rm/dashboard');
      if (res.ok) {
        const data = await res.json();
        setAllTimelineEvents(data.recentActivity || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchReports = async (filter: 'today' | 'week' | 'month') => {
    try {
      const res = await authenticatedFetch(`http://localhost:5000/api/rm/reports?filter=${filter}`);
      if (res.ok) {
        const data = await res.json();
        setReportsData(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLeadDetails = async (id: string) => {
    try {
      const res = await authenticatedFetch(`http://localhost:5000/api/rm/lead/${id}`);
      if (res.ok) {
        const data = await res.json();
        setLeadDetail(data);
        if (data.documents && data.documents.length > 0) {
          setPreviewDoc(data.documents[0].file_url || data.documents[0].fileUrl);
        } else {
          setPreviewDoc(null);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadInitialData = async () => {
    setLoading(true);
    await fetchDashboardData();
    await fetchExecutives();
    await fetchReports(reportFilter);
    try {
      const res = await authenticatedFetch('http://localhost:5000/api/rm/profile');
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    const token = localStorage.getItem('siva_token');
    const userStr = localStorage.getItem('siva_user');
    if (!token || !userStr) {
      window.location.href = '/';
      return;
    }
    try {
      const user = JSON.parse(userStr);
      if (user.role.toLowerCase() !== 'rm') {
        window.location.href = '/';
        return;
      }
    } catch (e) {
      window.location.href = '/';
      return;
    }
    const dateOptions: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' };
    setCurrentDate(new Date().toLocaleDateString('en-US', dateOptions));
    loadInitialData();
  }, []);

  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchDashboardData();
    } else if (activeTab === 'all-leads') {
      fetchAllLeads();
    } else if (activeTab === 'executives-list') {
      fetchExecutives();
    } else if (activeTab === 'lead-sources') {
      fetchLeadSources();
    } else if (activeTab === 'activity-log') {
      fetchActivityLogs();
    } else if (activeTab === 'document-manager') {
      setLoading(false);
    } else {
      fetchTabList(activeTab);
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'reports') {
      fetchReports(reportFilter);
    }
  }, [reportFilter, activeTab]);

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

  // Submit Operations
  const handleApproveLead = async () => {
    if (!selectedLeadId) return;
    try {
      const res = await authenticatedFetch('http://localhost:5000/api/rm/approve', {
        method: 'POST',
        body: JSON.stringify({
          leadId: selectedLeadId,
          remarks,
          approvalNotes
        })
      });

      if (res.ok) {
        setActionType(null);
        setRemarks('');
        setApprovalNotes('');
        closeInspection();
        fetchTabList(activeTab);
        fetchDashboardData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleReverifyLead = async () => {
    if (!selectedLeadId) return;
    try {
      const res = await authenticatedFetch('http://localhost:5000/api/rm/reverify', {
        method: 'POST',
        body: JSON.stringify({
          leadId: selectedLeadId,
          reason: reverifyReason,
          requiredInformation: reverifyReqInfo,
          remarks
        })
      });

      if (res.ok) {
        setActionType(null);
        setRemarks('');
        setReverifyReqInfo('');
        closeInspection();
        fetchTabList(activeTab);
        fetchDashboardData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRejectLead = async () => {
    if (!selectedLeadId) return;
    try {
      const res = await authenticatedFetch('http://localhost:5000/api/rm/reject', {
        method: 'POST',
        body: JSON.stringify({
          leadId: selectedLeadId,
          rejectionReason: rejectReason,
          remarks
        })
      });

      if (res.ok) {
        setActionType(null);
        setRemarks('');
        closeInspection();
        fetchTabList(activeTab);
        fetchDashboardData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssignExecutive = async (leadId: string, execId: string) => {
    if (!leadId || !execId) return;
    try {
      const res = await authenticatedFetch('http://localhost:5000/api/rm/assign-executive', {
        method: 'POST',
        body: JSON.stringify({
          leadId,
          executiveId: execId
        })
      });

      if (res.ok) {
        setSelectedExecutiveId('');
        fetchTabList(activeTab);
        fetchDashboardData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Status Badge Formatter
  const getStatusBadge = (status: string) => {
    let classes = 'bg-slate-100 text-slate-700';
    if (status === 'SENT_TO_RM') classes = 'bg-amber-100 text-amber-700 border border-amber-200';
    else if (status === 'RM_APPROVED') classes = 'bg-emerald-100 text-emerald-700 border border-emerald-250';
    else if (status === 'EXECUTIVE_ASSIGNED') classes = 'bg-indigo-100 text-indigo-700 border border-indigo-200';
    else if (status === 'RM_REVERIFICATION') classes = 'bg-blue-100 text-blue-700 border border-blue-200';
    else if (status === 'RM_REJECTED') classes = 'bg-rose-100 text-rose-700 border border-rose-200';
    else if (status === 'CASE_COMPLETED') classes = 'bg-teal-100 text-teal-700 border border-teal-200';

    return (
      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wide ${classes}`}>
        {status.replace(/_/g, ' ')}
      </span>
    );
  };

  const computeDonutSegments = () => {
    if (!statsData || !statsData.stats) return { total: 0, segments: [] };
    const { pendingVerification, approvedLeads, reVerificationLeads, rejectedLeads, executiveAssigned, completedCases } = statsData.stats;
    const total = pendingVerification + approvedLeads + reVerificationLeads + rejectedLeads + executiveAssigned + completedCases;
    if (total === 0) return { total: 0, segments: [] };

    const rawSegments = [
      { label: 'Pending', count: pendingVerification, color: '#f59e0b', bgClass: 'bg-amber-500' },
      { label: 'Approved', count: approvedLeads, color: '#10b981', bgClass: 'bg-emerald-500' },
      { label: 'Re-Verify', count: reVerificationLeads, color: '#3b82f6', bgClass: 'bg-blue-500' },
      { label: 'Rejected', count: rejectedLeads, color: '#f43f5e', bgClass: 'bg-rose-500' },
      { label: 'Assigned', count: executiveAssigned, color: '#6366f1', bgClass: 'bg-indigo-500' },
      { label: 'Completed', count: completedCases, color: '#8b5cf6', bgClass: 'bg-purple-550' }
    ];

    let currentOffset = 100;
    const segments = rawSegments
      .filter(s => s.count > 0)
      .map(s => {
        const percentage = (s.count / total) * 100;
        const dashArray = `${percentage.toFixed(1)} ${(100 - percentage).toFixed(1)}`;
        const offset = currentOffset;
        currentOffset -= percentage;
        return {
          label: s.label,
          count: s.count,
          color: s.color,
          bgClass: s.bgClass,
          percentage,
          dashArray,
          offset
        };
      });

    return { total, segments };
  };

  const { total: donutTotal, segments: donutSegments } = computeDonutSegments();

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
          SIDEBAR PANEL (Burgundy Theme)
          =================================================================== */}
      <aside className={`fixed md:relative top-0 left-0 w-72 h-full bg-[#4d0711] border-r border-[#691823]/20 flex flex-col z-40 shrink-0 select-none transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        
        {/* Branding header */}
        <div className="py-2 px-4 border-b border-[#691823]/20 flex flex-col items-center justify-center bg-white/5">
          <div className="w-full h-36 flex items-center justify-center overflow-hidden">
            <img src="/logo.png" alt="Siva Gold Logo" className="w-full h-auto" />
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-4 py-5 flex flex-col gap-1 overflow-y-auto hide-scrollbar">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
            { id: 'pending', label: 'Leads for Verification', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
            { id: 'approved', label: 'Approved Leads', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
            { id: 'reverify', label: 'Re-Verification', icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 12.06M20 20h-5v-5' },
            { id: 'rejected', label: 'Rejected Leads', icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z' },
            { id: 'assignment', label: 'Assigned to Executives', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
            { id: 'all-leads', label: 'All Leads', icon: 'M4 6h16M4 12h16M4 18h7' },
            { id: 'executives-list', label: 'Executives', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a3 3 0 11-6 0 3 3 0 016 0z' },
            { id: 'reports', label: 'Reports', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10a2 2 0 01-2 2h-2a2 2 0 01-2-2zm9-1h2a2 2 0 002-2v-3a2 2 0 00-2-2h-2a2 2 0 00-2 2v3a2 2 0 002 2zm-8-3H8v3h2v-3z' },
            { id: 'document-manager', label: 'Document Manager', icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z' },
            { id: 'lead-sources', label: 'Lead Sources', icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1' },
            { id: 'activity-log', label: 'Activity Log', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
            { id: 'profile', label: 'My Profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' }
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

        {/* Logout Button */}
        <div className="px-4 pb-4 border-b border-[#691823]/10">
          <button
            onClick={() => {
              localStorage.removeItem('siva_token');
              localStorage.removeItem('siva_user');
              window.location.href = '/';
              setIsSidebarOpen(false);
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-amber-300 hover:bg-rose-500/10 hover:text-rose-300 border border-amber-500/30 hover:border-rose-500/40 transition-all cursor-pointer"
          >
            <svg className="w-4 h-4 shrink-0 text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout Portal
          </button>
        </div>

        {/* Support Sidebar Footer */}
        <div className="p-4 mx-4 mb-4 rounded-2xl bg-white/5 border border-[#691823]/20 flex items-center gap-3">
          <svg className="w-4 h-4 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Need Help?</span>
            <span className="text-[11px] font-black text-amber-400 font-mono mt-1">+91 888 999 5656</span>
          </div>
        </div>
      </aside>

      {/* ===================================================================
          WORKSPACE CONTAINER (Light Theme)
          =================================================================== */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        
        {/* Header Toolbar */}
        <header className="bg-white border-b border-slate-200/80 px-4 sm:px-8 py-3 sm:py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
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
              {inspecting ? 'Lead Verification details' : activeTab.replace(/-list|-/g, ' ')}
            </h2>
            {inspecting && leadDetail && (
              <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[10px] sm:text-xs font-mono font-bold text-slate-700">
                {leadDetail.lead.lead_number}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-3 sm:gap-5">
            {/* Date display */}
            <div className="hidden lg:flex text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl items-center gap-1.5 shadow-sm">
              <span>📅</span>
              <span>{currentDate || 'Loading date...'}</span>
            </div>

            {/* Notification Bell */}
            <button className="relative p-1.5 sm:p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all cursor-pointer">
              <span className="text-base sm:text-lg">🔔</span>
              <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-rose-500 rounded-full text-[8px] sm:text-[9px] font-black text-white flex items-center justify-center">12</span>
            </button>

            {/* Profiles */}
            <div className="flex items-center gap-2 md:border-l md:border-slate-200 md:pl-5">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center font-bold text-xs sm:text-sm text-slate-800 shrink-0">
                {profile.name ? profile.name.split(' ').map((n: any) => n[0]).join('').substring(0, 2).toUpperCase() : 'RM'}
              </div>
              <div className="hidden md:flex flex-col">
                <span className="text-xs font-bold text-slate-800 leading-none">{profile.name}</span>
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">Regional Manager</span>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Panels */}
        <main className="flex-1 p-4 sm:p-8 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-3">
              <div className="w-10 h-10 border-4 border-amber-500/25 border-t-[#c3902c] rounded-full animate-spin" />
              <span className="text-sm font-semibold text-slate-400">Loading modules...</span>
            </div>
          ) : inspecting && leadDetail ? (
            
            /* =============================================================
               LEAD INSPECTION VIEW (LEAD DETAILS PAGE)
               ============================================================= */
            <div className="flex flex-col gap-6 animate-fadeIn">
              {/* Back Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 border border-slate-200/80 shadow-sm rounded-2xl gap-4">
                <button
                  onClick={closeInspection}
                  className="flex items-center gap-2 text-sm font-bold text-amber-500 hover:text-amber-600 cursor-pointer"
                >
                  ← Back to List
                </button>

                {leadDetail.lead.current_status === 'SENT_TO_RM' && (
                  <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-start sm:justify-end">
                    <button
                      onClick={() => setActionType('reverify')}
                      className="flex-1 sm:flex-none px-3 py-2 bg-blue-600 text-white rounded-xl text-[10px] sm:text-xs font-bold hover:bg-blue-700 active:scale-95 transition-all cursor-pointer shadow-md text-center"
                    >
                      🔁 Re-Verify
                    </button>
                    <button
                      onClick={() => setActionType('reject')}
                      className="flex-1 sm:flex-none px-3 py-2 bg-rose-600 text-white rounded-xl text-[10px] sm:text-xs font-bold hover:bg-rose-700 active:scale-95 transition-all cursor-pointer shadow-md text-center"
                    >
                      ❌ Reject
                    </button>
                    <button
                      onClick={() => setActionType('approve')}
                      className="flex-1 sm:flex-none px-3 py-2 bg-[#c3902c] text-white rounded-xl text-[10px] sm:text-xs font-bold hover:bg-amber-600 active:scale-95 transition-all cursor-pointer shadow-md text-center"
                    >
                      ✓ Approve
                    </button>
                  </div>
                )}

                {leadDetail.lead.current_status === 'RM_APPROVED' && (
                  <div className="w-full sm:w-auto flex justify-end">
                    <button
                      onClick={() => setActionType('assign')}
                      className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-755 active:scale-95 transition-all cursor-pointer shadow-md text-center"
                    >
                      👤 Assign Executive
                    </button>
                  </div>
                )}
              </div>

              {/* Grid details */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Columns 1 & 2: Info Cards & Docs */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    
                    {/* Customer info */}
                    <div className="bg-white border border-slate-200/80 shadow-sm rounded-2xl p-5 flex flex-col gap-3">
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">Customer Details</h3>
                      <div className="grid grid-cols-2 gap-y-3 text-xs">
                        <div>
                          <span className="text-slate-400 block mb-0.5">Name</span>
                          <span className="font-bold text-slate-800">{leadDetail.lead.customer_name}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block mb-0.5">Mobile</span>
                          <span className="font-bold text-slate-850">{leadDetail.lead.mobile}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block mb-0.5">Alternate Mobile</span>
                          <span className="font-medium text-slate-800">{leadDetail.lead.alternate_mobile || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block mb-0.5">District</span>
                          <span className="font-medium text-slate-800">{leadDetail.lead.district || 'N/A'}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-slate-400 block mb-0.5">Address</span>
                          <span className="font-medium text-slate-800">{leadDetail.lead.address || 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Gold info */}
                    <div className="bg-white border border-slate-200/80 shadow-sm rounded-2xl p-5 flex flex-col gap-3">
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">Gold Details</h3>
                      <div className="grid grid-cols-2 gap-y-3 text-xs">
                        <div>
                          <span className="text-slate-400 block mb-0.5">Weight (g)</span>
                          <span className="font-black text-slate-800 text-sm">{leadDetail.lead.gold_weight} g</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block mb-0.5">Gold Type</span>
                          <span className="font-bold text-slate-800">{leadDetail.lead.gold_type || 'N/A'}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-slate-400 block mb-0.5">Estimated Value</span>
                          <span className="font-extrabold text-amber-600 text-sm">₹{leadDetail.lead.estimated_value?.toLocaleString('en-IN') || '0.00'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Bank info */}
                    <div className="bg-white border border-slate-200/80 shadow-sm rounded-2xl p-5 flex flex-col gap-3">
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">Bank Details</h3>
                      <div className="grid grid-cols-2 gap-y-3 text-xs">
                        <div>
                          <span className="text-slate-400 block mb-0.5">Bank Name</span>
                          <span className="font-bold text-slate-800">{leadDetail.lead.bank_name || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block mb-0.5">Branch Name</span>
                          <span className="font-bold text-slate-800">{leadDetail.lead.branch_name || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block mb-0.5">Loan Amount</span>
                          <span className="font-bold text-slate-800">₹{leadDetail.lead.loan_amount?.toLocaleString('en-IN') || '0.00'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block mb-0.5">Account Number</span>
                          <span className="font-mono text-slate-800 font-bold">{leadDetail.lead.loan_account_number || 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Notes info */}
                    <div className="bg-white border border-slate-200/80 shadow-sm rounded-2xl p-5 flex flex-col gap-3">
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">Telecaller Notes</h3>
                      <div className="grid grid-cols-2 gap-y-3 text-xs">
                        <div>
                          <span className="text-slate-400 block mb-0.5">Telecaller</span>
                          <span className="font-bold text-slate-800">{leadDetail.lead.telecaller?.name || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block mb-0.5">Customer Interest</span>
                          <span className="font-bold text-slate-800">{leadDetail.lead.customer_interest || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block mb-0.5">Expected Price</span>
                          <span className="font-bold text-slate-800">₹{leadDetail.lead.expected_price?.toLocaleString('en-IN') || '0.00'}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-slate-400 block mb-0.5">Remarks</span>
                          <span className="font-bold text-slate-700 italic">"{leadDetail.lead.remarks || 'No remarks provided'}"</span>
                        </div>
                      </div>
                    </div>

                    {/* Lead Qualification info */}
                    <div className="bg-white border border-slate-200/80 shadow-sm rounded-2xl p-5 flex flex-col gap-3">
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">Lead Qualification</h3>
                      <div className="grid grid-cols-2 gap-y-3 text-xs">
                        <div>
                          <span className="text-slate-400 block mb-0.5">Interested in Selling?</span>
                          <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wide inline-block ${
                            leadDetail.lead.customer_interest === 'Yes' 
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                              : leadDetail.lead.customer_interest === 'No' 
                              ? 'bg-rose-100 text-rose-805 border border-rose-200' 
                              : 'bg-slate-100 text-slate-800 border border-slate-200'
                          }`}>
                            {leadDetail.lead.customer_interest || 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block mb-0.5">Price Communicated?</span>
                          <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wide inline-block ${
                            leadDetail.lead.price_communicated === true 
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                              : leadDetail.lead.price_communicated === false 
                              ? 'bg-rose-100 text-rose-805 border border-rose-200' 
                              : 'bg-slate-100 text-slate-800 border border-slate-200'
                          }`}>
                            {leadDetail.lead.price_communicated === true ? 'Yes' : leadDetail.lead.price_communicated === false ? 'No' : 'N/A'}
                          </span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-slate-400 block mb-0.5">Remarks / Notes</span>
                          <span className="font-bold text-slate-700 italic">"{leadDetail.lead.remarks || 'No remarks provided'}"</span>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Documents Verification List */}
                  <div className="bg-white border border-slate-200/80 shadow-sm rounded-3xl p-4 sm:p-6 flex flex-col gap-4">
                    <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">Verification Documents</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      
                      {/* doc checklist */}
                      <div className="md:col-span-1 flex flex-col gap-1.5">
                        {(!leadDetail.documents || leadDetail.documents.length === 0) ? (
                          <div className="text-xs text-slate-400 p-4 border border-slate-200 border-dashed rounded-xl text-center">
                            No documents attached
                          </div>
                        ) : (
                          leadDetail.documents.map((doc) => {
                            const fileUrl = doc.file_url || (doc as any).fileUrl || '#';
                            const docType = doc.document_type || (doc as any).documentType || 'Document';
                            return (
                              <button
                                key={doc.id}
                                onClick={() => setPreviewDoc(fileUrl)}
                                className={`w-full flex items-center justify-between p-3 rounded-xl border text-left cursor-pointer transition-all ${
                                  previewDoc === fileUrl
                                    ? 'bg-amber-500/5 border-amber-500/35 text-amber-700'
                                    : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'
                                }`}
                              >
                                <div className="flex flex-col gap-0.5 min-w-0">
                                  <span className="text-xs font-bold truncate">{docType.replace(/_/g, ' ')}</span>
                                  <span className="text-[9px] text-slate-400 font-mono">Attachment Link</span>
                                </div>
                                <span className="text-xs">👁️</span>
                              </button>
                            );
                          })
                        )}
                      </div>

                      {/* doc viewer */}
                      <div className="md:col-span-2 bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center min-h-[300px] overflow-hidden">
                        {previewDoc ? (
                          <div className="w-full h-full flex flex-col gap-2">
                            <div className="flex justify-between items-center text-[10px] text-slate-400 border-b border-slate-200 pb-1.5">
                              <span>Document Live View</span>
                              <div className="flex gap-2.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenOriginal(previewDoc)}
                                  className="text-amber-500 font-bold hover:underline cursor-pointer bg-transparent border-0 p-0"
                                >
                                  Open Original file
                                </button>
                                <span className="text-slate-350 select-none">|</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const activeDoc = leadDetail.documents.find(d => (d.file_url || (d as any).fileUrl) === previewDoc);
                                    const docType = activeDoc ? (activeDoc.document_type || (activeDoc as any).documentType) : 'Document';
                                    const fileName = `${leadDetail.lead.customer_name}_${docType}`;
                                    downloadDocument(previewDoc, fileName);
                                  }}
                                  className="text-amber-500 font-bold hover:underline cursor-pointer bg-transparent border-0 p-0"
                                >
                                  Download File
                                </button>
                              </div>
                            </div>
                            <div className="flex-1 relative w-full h-[200px] sm:h-[280px] bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center">
                              <img
                                src={previewDoc}
                                alt="Document Preview"
                                className="max-w-full max-h-full object-contain"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="text-slate-400 text-center flex flex-col items-center gap-1">
                            <span className="text-3xl">📄</span>
                            <span className="text-xs font-bold">Select a document key to preview</span>
                          </div>
                        )}
                      </div>

                    </div>
                  </div>

                </div>

                {/* Column 3: Timeline audit */}
                <div className="bg-white border border-slate-200/80 shadow-sm rounded-3xl p-6 flex flex-col gap-5">
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">Lead Timeline History</h3>
                  <div className="flex-1 flex flex-col gap-4 relative pl-5 border-l border-slate-200 ml-2">
                    {leadDetail.timeline.map((event) => (
                      <div key={event.id} className="relative flex flex-col gap-1 text-xs">
                        <div className="absolute left-[-26px] top-1 w-2.5 h-2.5 rounded-full bg-amber-500 border border-white shadow-sm" />
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-slate-800">{event.status.replace(/_/g, ' ')}</span>
                          <span className="text-[9px] text-slate-400 font-mono">
                            {new Date(event.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-slate-500 font-medium">{event.remarks}</p>
                        {event.user && (
                          <span className="text-[9px] text-slate-400 font-bold">Updated By: {event.user.name}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          ) : activeTab === 'dashboard' && statsData ? (
            
            /* =============================================================
               TAB: DASHBOARD
               ============================================================= */
            <div className="flex flex-col gap-8 animate-fadeIn">
              
              {/* Stat Cards Row */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-6">
                {[
                  { label: 'Pending Verification', val: statsData.stats.pendingVerification, tab: 'pending', border: 'border-amber-200 text-amber-600 bg-amber-50/60', dot: 'bg-amber-500 shadow-sm' },
                  { label: 'Approved Leads', val: statsData.stats.approvedLeads, tab: 'approved', border: 'border-emerald-200 text-emerald-600 bg-emerald-50/60', dot: 'bg-emerald-500 shadow-sm' },
                  { label: 'Re-Verification', val: statsData.stats.reVerificationLeads, tab: 'reverify', border: 'border-blue-200 text-blue-600 bg-blue-50/60', dot: 'bg-blue-500 shadow-sm' },
                  { label: 'Rejected Leads', val: statsData.stats.rejectedLeads, tab: 'rejected', border: 'border-rose-200 text-rose-600 bg-rose-50/60', dot: 'bg-rose-500 shadow-sm' },
                  { label: 'Assigned to Executives', val: statsData.stats.executiveAssigned, tab: 'assignment', border: 'border-purple-200 text-purple-600 bg-purple-50/60', dot: 'bg-purple-500 shadow-sm' }
                ].map((card, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveTab(card.tab)}
                    className={`bg-white border rounded-2xl p-3 sm:p-5 flex flex-col gap-2.5 text-left shadow-sm hover:-translate-y-0.5 transition-all duration-300 group cursor-pointer ${card.border}`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">{card.label}</span>
                      <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${card.dot} shrink-0`} />
                    </div>
                    <span className="text-xl sm:text-3xl font-black text-slate-800 leading-none block">{String(card.val).padStart(2, '0')}</span>
                    <span className="text-[8px] sm:text-[10px] text-slate-400 font-bold group-hover:text-amber-500 transition-colors block">View Details →</span>
                  </button>
                ))}
              </div>

              {/* Grid content Row 2 */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left: Pending Table */}
                <div className="lg:col-span-2 bg-white border border-slate-200/85 rounded-2xl p-4 sm:p-6 flex flex-col gap-4 shadow-sm">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">Leads for Verification</h3>
                    <div className="w-full sm:w-auto flex gap-3">
                      <input
                        type="text"
                        placeholder="Search by name, mobile or ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full sm:w-64 bg-slate-50 border border-slate-200 text-xs px-3 py-1.5 rounded-lg text-slate-650 focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto w-full -mx-4 px-4 sm:mx-0 sm:px-0">
                    <table className="w-full min-w-[700px] text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                          <th className="py-2.5 px-3">Lead ID</th>
                          <th className="py-2.5 px-3">Customer Name</th>
                          <th className="py-2.5 px-3">Mobile Number</th>
                          <th className="py-2.5 px-3">Bank / Finance</th>
                          <th className="py-2.5 px-3">Gold Weight (g)</th>
                          <th className="py-2.5 px-3">Loan Amount</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {statsData.pendingLeads.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="py-8 text-center text-slate-400 font-medium">No pending verification cases</td>
                          </tr>
                        ) : (
                          statsData.pendingLeads
                            .filter(lead => 
                              lead.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              lead.lead_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              lead.mobile.includes(searchQuery)
                            )
                            .map((lead) => (
                              <tr key={lead.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                <td className="py-3 px-3 font-mono font-bold text-slate-600">{lead.lead_number}</td>
                                <td className="py-3 px-3 font-bold text-slate-800">{lead.customer_name}</td>
                                <td className="py-3 px-3 text-slate-500 font-medium">{lead.mobile}</td>
                                <td className="py-3 px-3 text-slate-500 font-medium truncate max-w-[120px]">{lead.bank_name || 'N/A'}</td>
                                <td className="py-3 px-3 font-extrabold text-slate-700">{lead.gold_weight} g</td>
                                <td className="py-3 px-3 text-slate-700 font-bold">₹{lead.loan_amount?.toLocaleString('en-IN')}</td>
                                <td className="py-3 px-3">
                                  <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-lg text-[9px] font-bold">New</span>
                                </td>
                                <td className="py-3 px-3 text-right">
                                  <button
                                    onClick={() => handleInspectLead(lead.id)}
                                    className="p-1.5 bg-slate-100 hover:bg-amber-500 hover:text-white rounded-lg text-slate-500 transition-colors cursor-pointer"
                                    title="Verify"
                                  >
                                    👁️
                                  </button>
                                </td>
                              </tr>
                            ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-center border-t border-slate-100 pt-3">
                    <button
                      onClick={() => setActiveTab('pending')}
                      className="px-5 py-2 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-800 transition-all cursor-pointer"
                    >
                      View All Leads →
                    </button>
                  </div>
                </div>

                {/* Right: Executives load */}
                <div className="bg-white border border-slate-200/85 rounded-2xl p-6 flex flex-col gap-4 shadow-sm">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">Assigned Executives</h3>
                    <button onClick={() => setActiveTab('executives-list')} className="text-xs text-amber-500 font-bold hover:underline cursor-pointer">View All</button>
                  </div>

                  <div className="flex flex-col gap-3">
                    {statsData.executiveLoad.map((exec) => (
                      <div key={exec.id} className="flex justify-between items-center p-3 bg-slate-50/60 border border-slate-200/50 rounded-xl">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-800">{exec.name}</span>
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Field Executive</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            exec.assignedCount > 3 ? 'bg-amber-100 text-amber-700 border border-amber-250' : 'bg-emerald-100 text-emerald-700 border border-emerald-250'
                          }`}>
                            {exec.assignedCount} cases active
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Grid content Row 3 */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Donut chart summary */}
                <div className="bg-white border border-slate-200/85 rounded-2xl p-6 flex flex-col gap-5 shadow-sm">
                  <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">Lead Status Summary</h3>
                  <div className="flex flex-col items-center gap-6 justify-center flex-1">
                    {/* SVG Donut Chart */}
                    <div className="relative w-36 h-36 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 42 42">
                        <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#e2e8f0" strokeWidth="3" />
                        {donutSegments.map((seg, idx) => (
                          <circle
                            key={idx}
                            cx="21"
                            cy="21"
                            r="15.915"
                            fill="transparent"
                            stroke={seg.color}
                            strokeWidth="4"
                            strokeDasharray={seg.dashArray}
                            strokeDashoffset={seg.offset}
                          />
                        ))}
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="text-2xl font-black text-slate-800 leading-none">{donutTotal}</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 block">Total Leads</span>
                      </div>
                    </div>

                    <div className="w-full grid grid-cols-2 gap-y-2 gap-x-4 text-[10px] font-semibold text-slate-500">
                      {donutSegments.length === 0 ? (
                        <div className="col-span-2 text-center text-slate-400 italic">No leads registered</div>
                      ) : (
                        donutSegments.map((seg, idx) => (
                          <div key={idx} className="flex items-center gap-1.5">
                            <span className={`w-2.5 h-2.5 rounded-full ${seg.bgClass} inline-block`} />
                            {seg.label}: {seg.count} ({seg.percentage.toFixed(1)}%)
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Checklist pending widget */}
                <div className="bg-white border border-slate-200/85 rounded-2xl p-6 flex flex-col gap-4 shadow-sm">
                  <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-3">Document Verification (Pending)</h3>
                  
                  <div className="flex-1 flex flex-col gap-3.5">
                    {[
                      { title: 'Awaiting RM Verification', count: statsData.stats.pendingVerification, tab: 'pending' },
                      { title: 'Returned for Re-Verification', count: statsData.stats.reVerificationLeads, tab: 'reverify' },
                      { title: 'Rejected Lead Exceptions', count: statsData.stats.rejectedLeads, tab: 'rejected' },
                      { title: 'Active Executive Cases', count: statsData.stats.executiveAssigned, tab: 'assignment' }
                    ].map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => setActiveTab(item.tab as any)}
                        className="flex justify-between items-center p-3 bg-slate-50/60 border border-slate-200/50 rounded-xl hover:border-amber-500/20 hover:bg-white transition-all cursor-pointer"
                      >
                        <span className="text-xs font-semibold text-slate-650">{item.title}</span>
                        <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 border border-slate-200 font-extrabold text-xs flex items-center justify-center">
                          {String(item.count).padStart(2, '0')}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-center border-t border-slate-100 pt-3">
                    <button className="text-xs font-bold text-amber-500 hover:underline cursor-pointer">View All →</button>
                  </div>
                </div>

                {/* Timeline activity widget */}
                <div className="bg-white border border-slate-200/85 rounded-2xl p-6 flex flex-col gap-4 shadow-sm">
                  <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-3">Recent Activity</h3>
                  
                  <div className="flex-1 flex flex-col gap-4 relative pl-5 border-l border-slate-200 ml-2">
                    {statsData.recentActivity.map((log) => (
                      <div key={log.id} className="relative flex flex-col gap-0.5 text-xs">
                        <div className="absolute left-[-26px] top-1 w-2.5 h-2.5 rounded-full bg-slate-300 border border-white" />
                        <div className="flex justify-between text-[10px] text-slate-400 font-bold mb-0.5">
                          <span>{log.leads?.lead_number}</span>
                          <span>{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-slate-600 font-semibold leading-relaxed">
                          {log.remarks}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-center border-t border-slate-100 pt-3">
                    <button onClick={() => setActiveTab('activity-log')} className="text-xs font-bold text-amber-500 hover:underline cursor-pointer">View All Activity →</button>
                  </div>
                </div>

              </div>

              {/* Bottom Quick actions panel */}
              <div className="bg-white border border-slate-200/85 rounded-2xl p-6 flex flex-col gap-4 shadow-sm">
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">Quick Actions</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-xs font-bold">
                  {[
                    { label: 'View Leads for Verification', action: () => setActiveTab('pending'), icon: '📂' },
                    { label: 'Approved Leads', action: () => setActiveTab('approved'), icon: '✅' },
                    { label: 'Re-Verification Leads', action: () => setActiveTab('reverify'), icon: '🔁' },
                    { label: 'Rejected Leads', action: () => setActiveTab('rejected'), icon: '❌' },
                    { label: 'Assign to Executives', action: () => setActiveTab('assignment'), icon: '👥' },
                    { label: 'Lead Reports', action: () => setActiveTab('reports'), icon: '📊' }
                  ].map((btn, idx) => (
                    <button
                      key={idx}
                      onClick={btn.action}
                      className="bg-slate-50 border border-slate-200 hover:border-amber-400 hover:bg-amber-500/5 p-4 rounded-xl flex flex-col items-center gap-2 text-center transition-all cursor-pointer"
                    >
                      <span className="text-xl">{btn.icon}</span>
                      <span className="text-slate-700 leading-snug">{btn.label}</span>
                    </button>
                  ))}
                </div>
              </div>

            </div>
          ) : (
            
            /* =============================================================
               TABULAR VIEWS (PENDING, APPROVED, RE-VERIFICATION, REJECTED, EXECUTIVE ASSIGNMENT, COMPLETED, SOURCES, ACTIVITY LOG, REPORTS)
               ============================================================= */
            <div className="flex flex-col gap-6 animate-fadeIn">
              
              {activeTab === 'assignment' && (
                <div className="bg-amber-500/5 border border-amber-500/20 text-amber-700 p-4 rounded-2xl text-xs leading-relaxed">
                  <strong>💡 Workflow Rule:</strong> Executives can only be assigned to leads after they are successfully approved (Status: <code>RM_APPROVED</code>). Once assigned, status moves to <code>EXECUTIVE_ASSIGNED</code>.
                </div>
              )}

              {/* Lead Table Container */}
              <div className="bg-white border border-slate-200/85 rounded-2xl p-4 sm:p-6 shadow-sm">
                <div className="overflow-x-auto w-full -mx-4 px-4 sm:mx-0 sm:px-0">
                  
                  {activeTab === 'pending' && (
                    <table className="w-full min-w-[800px] text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                          <th className="py-2.5 px-3">Lead ID</th>
                          <th className="py-2.5 px-3">Customer Name</th>
                          <th className="py-2.5 px-3">Mobile</th>
                          <th className="py-2.5 px-3">District</th>
                          <th className="py-2.5 px-3">Gold Weight</th>
                          <th className="py-2.5 px-3">Loan Amount</th>
                          <th className="py-2.5 px-3">Telecaller</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingLeads.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="py-8 text-center text-slate-400 font-medium">No pending verification cases</td>
                          </tr>
                        ) : (
                          pendingLeads.map((lead) => (
                            <tr key={lead.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                              <td className="py-3 px-3 font-mono font-bold text-slate-650">{lead.lead_number}</td>
                              <td className="py-3 px-3 font-bold text-slate-800">{lead.customer_name}</td>
                              <td className="py-3 px-3 text-slate-500 font-semibold">{lead.mobile}</td>
                              <td className="py-3 px-3 text-slate-500 font-medium">{lead.district || 'N/A'}</td>
                              <td className="py-3 px-3 font-extrabold text-slate-700">{lead.gold_weight} g</td>
                              <td className="py-3 px-3 text-slate-700 font-bold">₹{lead.loan_amount?.toLocaleString('en-IN')}</td>
                              <td className="py-3 px-3 text-slate-500 font-medium">{lead.telecaller?.name || 'N/A'}</td>
                              <td className="py-3 px-3">{getStatusBadge(lead.current_status)}</td>
                              <td className="py-3 px-3 text-right">
                                <button
                                  onClick={() => handleInspectLead(lead.id)}
                                  className="px-3.5 py-2 bg-slate-100 text-slate-750 hover:bg-amber-500 hover:text-white rounded-lg font-bold transition-all cursor-pointer shadow-sm border border-slate-200"
                                >
                                  Verify
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  )}

                  {activeTab === 'assignment' && (
                    <table className="w-full min-w-[800px] text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                          <th className="py-2.5 px-3">Lead ID</th>
                          <th className="py-2.5 px-3">Customer Name</th>
                          <th className="py-2.5 px-3">District</th>
                          <th className="py-2.5 px-3">Gold Weight</th>
                          <th className="py-2.5 px-3">Loan Amount</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3">Executive Assignment</th>
                        </tr>
                      </thead>
                      <tbody>
                        {approvedLeads.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">No approved cases pending assignment</td>
                          </tr>
                        ) : (
                          approvedLeads.map((lead) => (
                            <tr key={lead.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                              <td className="py-3 px-3 font-mono font-bold text-slate-650">{lead.lead_number}</td>
                              <td className="py-3 px-3 font-bold text-slate-800">{lead.customer_name}</td>
                              <td className="py-3 px-3 text-slate-500 font-medium">{lead.district || 'N/A'}</td>
                              <td className="py-3 px-3 font-extrabold text-slate-700">{lead.gold_weight} g</td>
                              <td className="py-3 px-3 text-slate-700 font-bold">₹{lead.loan_amount?.toLocaleString('en-IN')}</td>
                              <td className="py-3 px-3">{getStatusBadge(lead.current_status)}</td>
                              <td className="py-3 px-3">
                                {lead.current_status === 'RM_APPROVED' ? (
                                  <div className="flex gap-2 items-center">
                                    <select
                                      value={selectedExecutiveId}
                                      onChange={(e) => setSelectedExecutiveId(e.target.value)}
                                      className="bg-white border border-slate-200 rounded-lg text-xs p-1.5 text-slate-600 focus:outline-none focus:border-amber-500"
                                    >
                                      <option value="">Select Executive</option>
                                      {executives.map(ex => (
                                        <option key={ex.id} value={ex.id}>{ex.name}</option>
                                      ))}
                                    </select>
                                    <button
                                      onClick={() => handleAssignExecutive(lead.id, selectedExecutiveId)}
                                      disabled={!selectedExecutiveId}
                                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 disabled:pointer-events-none rounded-lg font-bold transition-all cursor-pointer shadow-md"
                                    >
                                      Assign
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-slate-500 font-bold">Assigned to: {lead.executive?.name}</span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  )}

                  {activeTab === 'approved' && (
                    <table className="w-full min-w-[700px] text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                          <th className="py-2.5 px-3">Lead ID</th>
                          <th className="py-2.5 px-3">Customer</th>
                          <th className="py-2.5 px-3">Executive</th>
                          <th className="py-2.5 px-3">Assigned Date</th>
                          <th className="py-2.5 px-3">Current Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {approvedLeads.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-slate-400 font-medium">No approved cases found</td>
                          </tr>
                        ) : (
                          approvedLeads.map((lead) => (
                            <tr key={lead.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                              <td className="py-3 px-3 font-mono font-bold text-slate-650">{lead.lead_number}</td>
                              <td className="py-3 px-3 font-bold text-slate-800">{lead.customer_name}</td>
                              <td className="py-3 px-3 text-slate-500 font-medium">{lead.executive?.name || 'Unassigned'}</td>
                              <td className="py-3 px-3 text-slate-500 font-medium">{new Date(lead.updated_at).toLocaleDateString()}</td>
                              <td className="py-3 px-3">{getStatusBadge(lead.current_status)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  )}

                  {activeTab === 'reverify' && (
                    <table className="w-full min-w-[700px] text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                          <th className="py-2.5 px-3">Lead ID</th>
                          <th className="py-2.5 px-3">Customer</th>
                          <th className="py-2.5 px-3">Reason</th>
                          <th className="py-2.5 px-3">Sent Back Date</th>
                          <th className="py-2.5 px-3">Current Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reverifyLeads.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-slate-400 font-medium">No re-verification cases tracked</td>
                          </tr>
                        ) : (
                          reverifyLeads.map((lead) => (
                            <tr key={lead.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                              <td className="py-3 px-3 font-mono font-bold text-slate-650">{lead.lead_number}</td>
                              <td className="py-3 px-3 font-bold text-slate-800">{lead.customer_name}</td>
                              <td className="py-3 px-3 text-slate-500 font-semibold italic">"{lead.reason}"</td>
                              <td className="py-3 px-3 text-slate-500 font-medium">{new Date(lead.updated_at).toLocaleDateString()}</td>
                              <td className="py-3 px-3">{getStatusBadge(lead.current_status)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  )}

                  {activeTab === 'rejected' && (
                    <table className="w-full min-w-[700px] text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                          <th className="py-2.5 px-3">Lead ID</th>
                          <th className="py-2.5 px-3">Customer</th>
                          <th className="py-2.5 px-3">Reason</th>
                          <th className="py-2.5 px-3">Rejected By</th>
                          <th className="py-2.5 px-3">Rejected Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rejectedLeads.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-slate-400 font-medium">No rejected cases found</td>
                          </tr>
                        ) : (
                          rejectedLeads.map((lead) => (
                            <tr key={lead.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                              <td className="py-3 px-3 font-mono font-bold text-slate-650">{lead.lead_number}</td>
                              <td className="py-3 px-3 font-bold text-slate-800">{lead.customer_name}</td>
                              <td className="py-3 px-3 text-slate-500 font-semibold italic">"{lead.reason}"</td>
                              <td className="py-3 px-3 text-slate-500 font-medium">{lead.rejected_by}</td>
                              <td className="py-3 px-3 text-slate-500 font-medium">{new Date(lead.updated_at).toLocaleDateString()}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  )}

                  {activeTab === 'completed' && (
                    <table className="w-full min-w-[700px] text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                          <th className="py-2.5 px-3">Lead ID</th>
                          <th className="py-2.5 px-3">Customer Name</th>
                          <th className="py-2.5 px-3">Executive</th>
                          <th className="py-2.5 px-3">Gold Weight</th>
                          <th className="py-2.5 px-3">Purchase Amount</th>
                          <th className="py-2.5 px-3">Completion Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {completedLeads.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">No completed cases found</td>
                          </tr>
                        ) : (
                          completedLeads.map((lead) => (
                            <tr key={lead.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                              <td className="py-3 px-3 font-mono font-bold text-slate-650">{lead.lead_number}</td>
                              <td className="py-3 px-3 font-bold text-slate-800">{lead.customer_name}</td>
                              <td className="py-3 px-3 text-slate-500 font-medium">{lead.executive_name}</td>
                              <td className="py-3 px-3 font-extrabold text-slate-700">{lead.gold_weight} g</td>
                              <td className="py-3 px-3 text-slate-750 font-bold">₹{lead.purchase_amount?.toLocaleString('en-IN')}</td>
                              <td className="py-3 px-3 text-slate-500 font-medium">{new Date(lead.completion_date).toLocaleDateString()}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  )}

                  {activeTab === 'all-leads' && (
                    <table className="w-full min-w-[700px] text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                          <th className="py-2.5 px-3">Lead ID</th>
                          <th className="py-2.5 px-3">Customer Name</th>
                          <th className="py-2.5 px-3">Gold Weight</th>
                          <th className="py-2.5 px-3">Loan Amount</th>
                          <th className="py-2.5 px-3">Current Status</th>
                          <th className="py-2.5 px-3 text-right">Inspect</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allLeadsList.map((lead) => (
                          <tr key={lead.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                            <td className="py-3 px-3 font-mono font-bold text-slate-650">{lead.lead_number}</td>
                            <td className="py-3 px-3 font-bold text-slate-800">{lead.customer_name}</td>
                            <td className="py-3 px-3 font-semibold text-slate-700">{lead.gold_weight} g</td>
                            <td className="py-3 px-3 text-slate-700 font-bold">₹{lead.loan_amount?.toLocaleString('en-IN')}</td>
                            <td className="py-3 px-3">{getStatusBadge(lead.current_status)}</td>
                            <td className="py-3 px-3 text-right">
                              <button onClick={() => handleInspectLead(lead.id)} className="text-amber-500 font-bold hover:underline cursor-pointer">View</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {activeTab === 'executives-list' && (
                    <table className="w-full min-w-[600px] text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                          <th className="py-2.5 px-3">Executive ID</th>
                          <th className="py-2.5 px-3">Name</th>
                          <th className="py-2.5 px-3">Contact</th>
                          <th className="py-2.5 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {executives.map((ex, idx) => (
                          <tr key={ex.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                            <td className="py-3 px-3 font-mono font-bold text-slate-500">{(ex as any).employee_code || `EX-${ex.id.substring(0, 5).toUpperCase()}`}</td>
                            <td className="py-3 px-3 font-bold text-slate-800">{ex.name}</td>
                            <td className="py-3 px-3 font-mono text-slate-550">{ex.mobile}</td>
                            <td className="py-3 px-3">
                              <span className={`px-2 py-0.5 rounded-lg font-bold uppercase text-[10px] border ${
                                (ex.status || '').toLowerCase() === 'active'
                                  ? 'bg-emerald-105 text-emerald-700 border-emerald-200/60'
                                  : 'bg-rose-105 text-rose-700 border-rose-200/60'
                              }`}>
                                {ex.status || 'Active'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {activeTab === 'lead-sources' && (
                    <table className="w-full min-w-[400px] text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                          <th className="py-2.5 px-3">Source Name</th>
                          <th className="py-2.5 px-3">Total Leads</th>
                          <th className="py-2.5 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leadSources.map((source) => (
                          <tr key={source.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                            <td className="py-3.5 px-3 font-bold text-slate-800">{source.name}</td>
                            <td className="py-3.5 px-3 font-semibold text-slate-600">{source.count || 0}</td>
                            <td className="py-3.5 px-3">
                              <span className="bg-emerald-100 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-lg font-bold text-[10px]">{source.status}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {activeTab === 'activity-log' && (
                    <div className="flex flex-col gap-4 relative pl-5 border-l border-slate-200 ml-2">
                      {allTimelineEvents.map((event) => (
                        <div key={event.id} className="relative flex flex-col gap-1 text-xs">
                          <div className="absolute left-[-26px] top-1 w-2.5 h-2.5 rounded-full bg-slate-350 border border-white" />
                          <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold mb-0.5">
                            <span>Lead: {event.leads?.lead_number}</span>
                            <span>{new Date(event.created_at).toLocaleString()}</span>
                          </div>
                          <p className="text-slate-650 font-bold">{event.remarks}</p>
                          {event.users && (
                            <span className="text-[9px] text-slate-400 font-bold">Logged by: {event.users.name}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === 'reports' && (
                    <div className="flex flex-col gap-8">
                      {/* date select filters */}
                      <div className="flex gap-2 border-b border-slate-200 pb-4">
                        {['today', 'week', 'month'].map((f) => (
                          <button
                            key={f}
                            onClick={() => setReportFilter(f as any)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                              reportFilter === f
                                ? 'bg-amber-500/10 text-amber-700 border border-amber-500/35 shadow-sm'
                                : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300'
                            }`}
                          >
                            {f}
                          </button>
                        ))}
                      </div>

                      {/* Performance Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-6">
                        {[
                          { label: 'Total Leads Received', val: reportsData.totalLeads },
                          { label: 'Approved Leads', val: reportsData.approvedLeads },
                          { label: 'Rejected Leads', val: reportsData.rejectedLeads },
                          { label: 'Re-Verifications', val: reportsData.reVerificationLeads },
                          { label: 'Executive Assigned', val: reportsData.executiveAssigned },
                          { label: 'Approval Rate', val: `${reportsData.approvalRate}%` }
                        ].map((m, i) => (
                          <div key={i} className="bg-slate-50 border border-slate-200 p-3 sm:p-4 rounded-xl flex flex-col gap-1.5 shadow-sm">
                            <span className="text-[8px] sm:text-[9px] text-slate-500 uppercase tracking-wider font-extrabold">{m.label}</span>
                            <span className="text-lg sm:text-xl font-black text-slate-850">{m.val}</span>
                          </div>
                        ))}
                      </div>

                      {/* conversion graph */}
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-sm">
                        <h4 className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-6">Workflow Conversion funnel</h4>
                        <div className="flex flex-col gap-4">
                          {[
                            { name: 'Leads Received', val: reportsData.totalLeads, color: 'bg-slate-400' },
                            { name: 'RM Approved', val: reportsData.approvedLeads, color: 'bg-emerald-500' },
                            { name: 'Executive Assigned', val: reportsData.executiveAssigned, color: 'bg-indigo-500' }
                          ].map((bar, idx) => {
                            const maxVal = reportsData.totalLeads || 1;
                            const widthPercent = Math.max(5, Math.round((bar.val / maxVal) * 100));
                            return (
                              <div key={idx} className="flex items-center gap-4 text-xs font-bold">
                                <span className="w-24 sm:w-32 text-slate-500 shrink-0 text-[11px] sm:text-xs">{bar.name}</span>
                                <div className="flex-1 h-6 bg-slate-200 rounded-lg overflow-hidden border border-slate-300 relative">
                                  <div
                                    className={`h-full ${bar.color} rounded-r-md transition-all duration-500`}
                                    style={{ width: `${widthPercent}%` }}
                                  />
                                  <span className="absolute left-2.5 top-1/2 translate-y-[-50%] text-[10px] font-black text-slate-850">
                                    {bar.val}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'profile' && (
                    <div className="max-w-xl bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-8 flex flex-col gap-6 shadow-sm">
                      <div className="flex items-center gap-4 border-b border-slate-200 pb-6">
                        <div className="w-16 h-16 rounded-xl bg-[#c3902c]/20 border border-[#c3902c]/40 flex items-center justify-center font-bold text-2xl text-[#c3902c]">
                          {profile.name.split(' ').map((n: string) => n[0]).join('')}
                        </div>
                        <div className="flex flex-col">
                          <h3 className="text-lg font-bold text-slate-800">{profile.name}</h3>
                          <span className="text-xs text-amber-500 font-bold uppercase tracking-wider mt-1">Regional Manager</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 text-xs font-bold">
                        <div>
                          <span className="text-slate-400 block mb-1">Employee Code</span>
                          <span className="text-slate-800 font-mono text-sm">{profile.employee_code}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block mb-1">Branch Office</span>
                          <span className="text-slate-800 text-sm">{profile.branch?.branch_name || 'Vijayawada'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block mb-1">Mobile Number</span>
                          <span className="text-slate-800 text-sm font-mono">{profile.mobile}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block mb-1">Email Address</span>
                          <span className="text-slate-800 text-sm font-mono">{profile.email}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'document-manager' && (
                    <DocumentManager />
                  )}

                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ===================================================================
          ACTION MODALS / OVERLAYS
          =================================================================== */}
      {actionType && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto flex flex-col gap-4 shadow-2xl relative">
            <button
              onClick={() => setActionType(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 cursor-pointer"
            >
              ✕
            </button>

            {actionType === 'approve' && (
              <>
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">Approve Lead Verification</h3>
                <p className="text-xs text-slate-400">Provide final remarks for RM approval to enable executive field assignment.</p>
                
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Approval Notes</label>
                    <input
                      type="text"
                      value={approvalNotes}
                      onChange={(e) => setApprovalNotes(e.target.value)}
                      placeholder="e.g. Valuation verified, files clear."
                      className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-700 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Remarks</label>
                    <textarea
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder="Add any additional details here..."
                      className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-700 h-24 resize-none focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-2">
                  <button
                    onClick={() => setActionType(null)}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-450 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApproveLead}
                    className="px-4 py-2 bg-[#c3902c] text-white rounded-xl text-xs font-bold hover:bg-amber-600 cursor-pointer shadow-md"
                  >
                    Confirm Approval
                  </button>
                </div>
              </>
            )}

            {actionType === 'reverify' && (
              <>
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">Send for Re-Verification</h3>
                <p className="text-xs text-slate-400">Describe what details need to be verified. The lead will return to the Telecaller queue.</p>
                
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Verification Issue Reason</label>
                    <select
                      value={reverifyReason}
                      onChange={(e) => setReverifyReason(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-700 focus:outline-none focus:border-amber-500"
                    >
                      <option value="Missing Gold Weight Slip">Missing Gold Weight Slip</option>
                      <option value="Unclear KYC Document">Unclear KYC Document</option>
                      <option value="Loan Account Discrepancy">Loan Account Discrepancy</option>
                      <option value="Incorrect Customer Phone">Incorrect Customer Phone</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Required Information</label>
                    <input
                      type="text"
                      value={reverifyReqInfo}
                      onChange={(e) => setReverifyReqInfo(e.target.value)}
                      placeholder="e.g. Upload clear bank release statement"
                      className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-700 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Remarks</label>
                    <textarea
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder="Add instructions for Telecaller..."
                      className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-700 h-20 resize-none focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-2">
                  <button
                    onClick={() => setActionType(null)}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-450 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReverifyLead}
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 cursor-pointer shadow-md"
                  >
                    Send Back
                  </button>
                </div>
              </>
            )}

            {actionType === 'reject' && (
              <>
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">Reject Lead Case</h3>
                <p className="text-xs text-slate-400">Provide the rejection reason. This terminates the lead in the workflow.</p>
                
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Rejection Reason</label>
                    <select
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-700 focus:outline-none focus:border-amber-500"
                    >
                      <option value="Purity discrepancy">Gold purity discrepancy</option>
                      <option value="Invalid loan details">Invalid loan details</option>
                      <option value="Customer backed out">Customer backed out</option>
                      <option value="Branch restrictions">Branch restrictions</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Additional Remarks</label>
                    <textarea
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder="Add details about rejection decision..."
                      className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-700 h-24 resize-none focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-2">
                  <button
                    onClick={() => setActionType(null)}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-450 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRejectLead}
                    className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 cursor-pointer shadow-md"
                  >
                    Confirm Rejection
                  </button>
                </div>
              </>
            )}

            {actionType === 'assign' && (
              <>
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">Assign Field Executive</h3>
                <p className="text-xs text-slate-400">Select an active executive to handle bank gold release and payout verification.</p>
                
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Select Executive</label>
                    <select
                      value={selectedExecutiveId}
                      onChange={(e) => setSelectedExecutiveId(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-700 focus:outline-none focus:border-amber-500"
                    >
                      <option value="">Select an Executive...</option>
                      {executives.map(ex => (
                        <option key={ex.id} value={ex.id}>{ex.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-4">
                  <button
                    onClick={() => setActionType(null)}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-450 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (selectedLeadId) {
                        handleAssignExecutive(selectedLeadId, selectedExecutiveId);
                        setActionType(null);
                        closeInspection();
                      }
                    }}
                    disabled={!selectedExecutiveId}
                    className="px-4 py-2 bg-indigo-600 text-white disabled:opacity-50 disabled:pointer-events-none rounded-xl text-xs font-bold hover:bg-indigo-700 cursor-pointer shadow-md"
                  >
                    Confirm Assignment
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
