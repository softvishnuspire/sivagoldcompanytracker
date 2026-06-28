'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  PlusCircle, 
  ListTodo, 
  FileText, 
  BarChart3, 
  LogOut, 
  LayoutDashboard,
  Bell,
  Menu,
  X,
  Clock
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Lead, LeadStatus, DashboardStats } from './types';
// Import components
import StatsOverview from './components/StatsOverview';
import LeadForm from './components/LeadForm';
import LeadList from './components/LeadList';
import ReportsView from './components/ReportsView';
import PendingFollowupsList from './components/PendingFollowupsList';
import DocumentManager from '@/components/DocumentManager';
import { TableSkeleton, CardSkeleton } from '../../components/ui/SkeletonLoaders';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function TelecallerDashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'add-lead' | 'leads-list' | 'pending-followups' | 'reports' | 'document-manager'>('dashboard');
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  
  // Current logged in agent session
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [dbConnected, setDbConnected] = useState(false);

  // Data mapping helper: DB snake_case status -> valid LeadStatus
  const dbToUiStatus = (dbStatus: string): LeadStatus => {
    switch (dbStatus) {
      case 'CUSTOMER_DETAILS_CREATED': return 'CUSTOMER_DETAILS_CREATED';
      case 'FOLLOWUP_IN_PROGRESS': return 'FOLLOWUP_IN_PROGRESS';
      case 'DETAILS_COLLECTED': return 'DETAILS_COLLECTED';
      case 'DOCUMENTS_RECEIVED': return 'DOCUMENTS_RECEIVED';
      case 'PRICE_CONFIRMED': return 'PRICE_CONFIRMED';
      case 'SENT_TO_RM': return 'SENT_TO_RM';
      case 'RM_APPROVED': return 'RM_APPROVED';
      case 'RM_REVERIFICATION': return 'RM_REVERIFICATION';
      case 'RM_REJECTED': return 'RM_REJECTED';
      case 'EXECUTIVE_ASSIGNED': return 'EXECUTIVE_ASSIGNED';
      case 'CUSTOMER_CALLED': return 'CUSTOMER_CALLED';
      case 'VISIT_CONFIRMED': return 'VISIT_CONFIRMED';
      case 'MD_FUNDS_APPROVED': return 'MD_FUNDS_APPROVED';
      case 'JOURNEY_STARTED': return 'JOURNEY_STARTED';
      case 'REACHED_CUSTOMER': return 'REACHED_CUSTOMER';
      case 'CUSTOMER_INTERACTION': return 'CUSTOMER_INTERACTION';
      case 'BANK_VISIT': return 'BANK_VISIT';
      case 'AGREEMENT_PENDING': return 'AGREEMENT_PENDING';
      case 'PAYMENT_COMPLETED': return 'PAYMENT_COMPLETED';
      case 'GOLD_RECEIVED': return 'GOLD_RECEIVED';
      case 'BALANCE_SETTLED': return 'BALANCE_SETTLED';
      case 'IMAGES_UPLOADED': return 'IMAGES_UPLOADED';
      case 'CASE_COMPLETED': return 'CASE_COMPLETED';
      default: return 'CUSTOMER_DETAILS_CREATED';
    }
  };

  const mapDbToLead = (db: any): Lead => {
    const documents = (db.documents || []).map((doc: any) => ({
      id: doc.id,
      leadId: doc.lead_id,
      documentType: doc.document_type,
      fileName: (doc.file_url || '').split('/').pop() || 'document.pdf',
      fileUrl: doc.file_url || '',
      uploadedBy: doc.uploaded_by,
      createdAt: doc.created_at
    }));

    const followups = (db.interactions || [])
      .filter((i: any) => i.interaction_type === 'FOLLOWUP' || i.interaction_type === 'CALL')
      .map((i: any) => ({
        id: i.id,
        leadId: i.lead_id,
        followupDate: new Date(i.created_at).toISOString().split('T')[0],
        remarks: i.notes || '',
        status: i.interaction_type === 'FOLLOWUP' ? 'PENDING' : 'COMPLETED',
        createdBy: i.employee_id,
        createdAt: i.created_at
      }));

    const reverificationTimeline = (db.timeline || [])
      .filter((t: any) => t.status === 'RM_REVERIFICATION')
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const reverificationRemarks = reverificationTimeline[0]?.remarks || undefined;

    return {
      id: db.id,
      leadNumber: db.lead_number,
      customerName: db.customer_name,
      mobile: db.mobile,
      alternateMobile: db.alternate_mobile,
      address: db.address,
      district: db.district,
      goldWeight: Number(db.gold_weight || 0),
      goldType: db.gold_type,
      estimatedValue: Number(db.estimated_value || 0),
      bankName: db.bank_name,
      branchName: db.branch_name,
      loanAmount: Number(db.loan_amount || 0),
      loanAccountNumber: db.loan_account_number,
      status: dbToUiStatus(db.current_status),
      telecallerId: db.telecaller_id,
      rmId: db.rm_id,
      executiveId: db.executive_id,
      createdAt: db.created_at,
      updatedAt: db.updated_at,
      customerInterest: db.customer_interest,
      priceCommunicated: db.price_communicated,
      remarks: db.remarks,
      documents,
      followups,
      reverificationRemarks
    };
  };

  // Authenticated fetch helper with JWT token
  const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('siva_token');
    const userStr = localStorage.getItem('siva_user');
    if (!token || !userStr) {
      localStorage.removeItem('siva_user');
      window.location.href = '/';
      throw new Error('Authentication token missing. Logging out...');
    }

    try {
      const user = JSON.parse(userStr);
      if (user.role.toUpperCase() !== 'TELECALLER') {
        window.location.href = '/';
        throw new Error('Role mismatch. Redirecting to home...');
      }
    } catch (err: any) {
      if (err.message && err.message.includes('Role mismatch')) {
        throw err;
      }
      localStorage.removeItem('siva_token');
      localStorage.removeItem('siva_user');
      window.location.href = '/';
      throw err;
    }

    const headers = {
      ...(options.headers || {}),
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    const res = await fetch(url, { ...options, headers });
    
    if (res.status === 401 || res.status === 403) {
      localStorage.removeItem('siva_token');
      localStorage.removeItem('siva_user');
      window.location.href = '/';
      throw new Error('Session expired. Logging out...');
    }

    return res;
  };

  // Authenticate user session
  useEffect(() => {
    const token = localStorage.getItem('siva_token');
    const sessionUser = localStorage.getItem('siva_user');
    if (!token || !sessionUser) {
      window.location.href = '/';
      return;
    }
    try {
      const user = JSON.parse(sessionUser);
      if (user.role.toLowerCase() !== 'telecaller') {
        window.location.href = '/';
        return;
      }
      setCurrentUser(user);
    } catch (e) {
      window.location.href = '/';
      return;
    }
  }, []);

  // React Query Fetch Leads
  const { data: leads = [], isLoading: isLeadsLoading } = useQuery<Lead[]>({
    queryKey: ['telecaller', 'leads'],
    queryFn: async () => {
      const res = await authenticatedFetch(`${API_BASE}/telecaller/leads`);
      if (!res.ok) {
        throw new Error('Failed to fetch leads');
      }
      const dbLeads = await res.json();
      setDbConnected(true);
      return dbLeads.map(mapDbToLead);
    },
    enabled: !!currentUser,
  });

  const { data: leadSourcesList = [] } = useQuery<any[]>({
    queryKey: ['telecaller', 'leadSources'],
    queryFn: async () => {
      const res = await authenticatedFetch(`${API_BASE}/lead-sources`);
      if (!res.ok) {
        throw new Error('Failed to fetch lead sources');
      }
      return await res.json();
    },
    enabled: !!currentUser,
  });

  // Helper to compute stats dynamically
  const getStats = (): DashboardStats => {
    const newLeads = leads.filter(l => l.status === 'CUSTOMER_DETAILS_CREATED').length;
    
    const pendingFollowups = leads.filter(lead => {
      const isFollowup = lead.status === 'FOLLOWUP_IN_PROGRESS';
      const isMissingDetails = 
        lead.goldWeight === 0 || 
        !lead.bankName || 
        lead.loanAmount === 0 ||
        !lead.documents || 
        lead.documents.length === 0;
      return isFollowup && isMissingDetails;
    }).length;

    const qualifiedLeads = leads.filter(l => l.status === 'SENT_TO_RM').length;
    const rejectedLeads = leads.filter(l => l.status === 'RM_REJECTED').length;
    
    const sentToRM = leads.filter(l => 
      !['CUSTOMER_DETAILS_CREATED', 'FOLLOWUP_IN_PROGRESS', 'RM_REJECTED'].includes(l.status)
    ).length;

    return { newLeads, pendingFollowups, qualifiedLeads, rejectedLeads, sentToRM };
  };

  // Save Lead Mutation
  const saveLeadMutation = useMutation({
    mutationFn: async (formData: Omit<Lead, 'id' | 'leadNumber' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
      let res;
      if (formData.id) {
        const targetStatus = formData.status === 'RM_REVERIFICATION' ? 'SENT_TO_RM' : formData.status;
        res = await authenticatedFetch(`${API_BASE}/telecaller/leads/${formData.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            customerName: formData.customerName,
            mobile: formData.mobile,
            alternateMobile: formData.alternateMobile,
            address: formData.address,
            district: formData.district,
            goldWeight: formData.goldWeight,
            goldType: formData.goldType,
            estimatedValue: formData.estimatedValue,
            bankName: formData.bankName,
            branchName: formData.branchName,
            loanAmount: formData.loanAmount,
            loanAccountNumber: formData.loanAccountNumber,
            status: targetStatus,
            documents: formData.documents
          })
        });
      } else {
        res = await authenticatedFetch(`${API_BASE}/telecaller/leads`, {
          method: 'POST',
          body: JSON.stringify({
            customerName: formData.customerName,
            mobile: formData.mobile,
            alternateMobile: formData.alternateMobile,
            address: formData.address,
            district: formData.district,
            goldWeight: formData.goldWeight,
            goldType: formData.goldType,
            estimatedValue: formData.estimatedValue,
            bankName: formData.bankName,
            branchName: formData.branchName,
            loanAmount: formData.loanAmount,
            loanAccountNumber: formData.loanAccountNumber,
            status: formData.status,
            documents: formData.documents
          })
        });
      }

      if (!res.ok) {
        throw new Error('Failed to save lead');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telecaller', 'leads'] });
      toast.success("Lead Saved Successfully");
      setEditingLead(null);
      setActiveTab('leads-list');
    },
    onError: (err: any) => {
      console.error('Save lead failed:', err);
      toast.error(err.message || "Failed to save lead details to backend server.");
    }
  });

  const handleSaveLead = async (formData: Omit<Lead, 'id' | 'leadNumber' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
    await saveLeadMutation.mutateAsync(formData);
  };

  // Update Status Mutation (with Optimistic UI Rollback)
  const updateStatusMutation = useMutation({
    mutationFn: async ({ leadId, status, remarks, customerInterest, priceCommunicated }: {
      leadId: string;
      status: LeadStatus;
      remarks?: string;
      customerInterest?: string;
      priceCommunicated?: boolean;
    }) => {
      const leadToUpdate = leads.find(l => l.id === leadId);
      if (!leadToUpdate) throw new Error("Lead not found");

      const res = await authenticatedFetch(`${API_BASE}/telecaller/leads/${leadId}`, {
        method: 'PUT',
        body: JSON.stringify({
          customerName: leadToUpdate.customerName,
          mobile: leadToUpdate.mobile,
          alternateMobile: leadToUpdate.alternateMobile,
          address: leadToUpdate.address,
          district: leadToUpdate.district,
          goldWeight: leadToUpdate.goldWeight,
          goldType: leadToUpdate.goldType,
          estimatedValue: leadToUpdate.estimatedValue,
          bankName: leadToUpdate.bankName,
          branchName: leadToUpdate.branchName,
          loanAmount: leadToUpdate.loanAmount,
          loanAccountNumber: leadToUpdate.loanAccountNumber,
          status: status,
          remarks: remarks !== undefined ? remarks : leadToUpdate.remarks,
          customerInterest: customerInterest !== undefined ? customerInterest : leadToUpdate.customerInterest,
          priceCommunicated: priceCommunicated !== undefined ? priceCommunicated : leadToUpdate.priceCommunicated
        })
      });

      if (!res.ok) {
        throw new Error('Failed to update lead status');
      }
      return res.json();
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ['telecaller', 'leads'] });
      const previousLeads = queryClient.getQueryData<Lead[]>(['telecaller', 'leads']);

      if (previousLeads) {
        queryClient.setQueryData<Lead[]>(
          ['telecaller', 'leads'],
          previousLeads.map(l => l.id === variables.leadId ? { ...l, status: variables.status } : l)
        );
      }

      return { previousLeads };
    },
    onError: (err, variables, context: any) => {
      if (context?.previousLeads) {
        queryClient.setQueryData(['telecaller', 'leads'], context.previousLeads);
      }
      toast.error(err.message || "Failed to update lead status on the server.");
    },
    onSuccess: () => {
      toast.success("Status Updated Successfully");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['telecaller', 'leads'] });
    }
  });

  const handleUpdateLeadStatus = async (
    leadId: string, 
    status: LeadStatus, 
    remarks?: string,
    customerInterest?: string,
    priceCommunicated?: boolean
  ) => {
    updateStatusMutation.mutate({ leadId, status, remarks, customerInterest, priceCommunicated });
  };

  // Add Followup Mutation
  const addFollowupMutation = useMutation({
    mutationFn: async ({ leadId, date, remarks }: { leadId: string; date: string; remarks: string }) => {
      const res = await authenticatedFetch(`${API_BASE}/telecaller/leads/${leadId}/followup`, {
        method: 'POST',
        body: JSON.stringify({ date, remarks })
      });

      if (!res.ok) {
        throw new Error('Failed to add followup');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telecaller', 'leads'] });
      toast.success("Follow-up Interaction Logged Successfully");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to add followup interaction log.");
    }
  });

  const handleAddFollowup = async (leadId: string, date: string, remarks: string) => {
    addFollowupMutation.mutate({ leadId, date, remarks });
  };

  const handleDeleteLead = async (leadId: string) => {
    console.warn('Delete lead requested for:', leadId, '— no backend DELETE endpoint available yet.');
    toast.error('Lead deletion is not supported yet. Contact your administrator.');
  };

  const handleEditLeadTrigger = async (lead: Lead) => {
    try {
      const res = await authenticatedFetch(`${API_BASE}/telecaller/leads/${lead.id}`);
      if (!res.ok) {
        throw new Error('Failed to load lead details from backend server.');
      }
      const fullLead = await res.json();
      setEditingLead(mapDbToLead(fullLead));
      setActiveTab('add-lead');
    } catch (err: any) {
      console.error('Fetch full lead details failed:', err);
      toast.error(err.message || 'Failed to load lead details.');
    }
  };

  const stats = getStats();

  const navigationItems = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'leads-list' as const, label: 'Lead Management', icon: ListTodo },
    { id: 'add-lead' as const, label: 'Add Lead', icon: PlusCircle },
    { id: 'pending-followups' as const, label: 'Pending Followups', icon: Clock },
    { id: 'document-manager' as const, label: 'Document Manager', icon: FileText },
    { id: 'reports' as const, label: 'Reports', icon: BarChart3 }
  ];

  return (
    <div className="min-h-screen bg-[#f4f5f8] text-slate-800 flex flex-col font-sans selection:bg-[#c3902c] selection:text-black">
      {/* Mobile Header */}
      <header className="lg:hidden flex items-center justify-between p-4 bg-[#4d0711] border-b border-[#691823]/20 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg hover:bg-[#4d0b13]/20 text-amber-100/60 hover:text-amber-300 transition-colors"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="font-extrabold text-sm tracking-tight text-amber-300 flex items-center gap-2">
            <div className="w-8 h-8 flex items-center justify-center overflow-hidden">
              <img src="/logo.png" alt="Siva Gold Logo" className="w-full h-full object-contain" />
            </div>
            <span className="text-amber-400 font-black">SIVA GOLD</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-bold text-emerald-400 tracking-wide uppercase">Online</span>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex flex-1 relative">
        {/* Sidebar for PC / Navigation Drawer for Mobile */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#4d0711] border-r border-[#691823]/20 flex flex-col justify-between transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static hide-scrollbar ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div>
            {/* Sidebar Logo */}
            <div className="py-2 px-4 border-b border-[#691823]/20 hidden lg:flex flex-col items-center justify-center w-full bg-white/5">
              <div className="w-full h-32 flex items-center justify-center overflow-hidden">
                <img src="/logo.png" alt="Siva Gold Logo" className="w-full h-auto" />
              </div>
            </div>

            {/* Agent Profile */}
            <div className="p-5 border-b border-[#691823]/20 bg-white/5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold">
                TC
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-amber-100 truncate">{currentUser?.name || 'Telecaller Agent 01'}</h4>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[9px] text-amber-300 font-bold uppercase tracking-wider">
                    {dbConnected ? 'Live Connection' : 'Fallback offline'}
                  </span>
                </div>
              </div>
            </div>

            {/* Navigation links */}
            <nav className="p-4 space-y-1.5">
              {navigationItems.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setSidebarOpen(false);
                      if (item.id !== 'add-lead') {
                        setEditingLead(null);
                      }
                    }}
                    className={`w-full flex items-center gap-3 py-3 px-4 rounded-xl text-xs font-semibold tracking-wide transition-all group cursor-pointer ${
                      isActive
                        ? 'bg-amber-500/15 border border-amber-500/30 text-amber-400 font-bold'
                        : 'text-amber-100/60 hover:bg-[#c3902c]/10 hover:text-amber-300'
                    }`}
                  >
                    <Icon size={16} className={`transition-colors ${isActive ? 'text-amber-400' : 'text-amber-100/40 group-hover:text-amber-300'}`} />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-[#691823]/10">
            <button
              onClick={() => {
                localStorage.removeItem('siva_user');
                router.push('/');
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-amber-300 hover:bg-rose-500/10 hover:text-rose-300 border border-amber-500/30 hover:border-rose-500/40 transition-all cursor-pointer"
            >
              <LogOut size={15} className="text-amber-300 shrink-0" />
              Logout Portal
            </button>
          </div>
        </aside>

        {/* Overlay when sidebar open on mobile */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-[#200206]/80 backdrop-blur-sm lg:hidden"
          />
        )}

        {/* Main Content Workspace */}
        <main className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-7xl mx-auto w-full space-y-6 pb-6 sm:pb-8">
          {/* Header Title bar */}
          <div className="hidden lg:flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-800 capitalize">
                {activeTab === 'dashboard' ? `Welcome Back, ${currentUser?.name?.split(' ')[0] || 'Agent'}` : activeTab.replace('-', ' ')}
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Monitor incoming customer gold pledge requests and initiate outbound callbacks.
              </p>
            </div>

            {/* Top Toolbar */}
            <div className="flex items-center gap-3 relative">
              <button 
                onClick={() => setShowNotification(!showNotification)}
                className="p-2 rounded-xl bg-white border border-slate-200 hover:border-slate-350 text-slate-400 hover:text-slate-600 shadow-sm transition-all relative cursor-pointer"
              >
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-500" />
                <Bell size={16} />
              </button>

              {showNotification && (
                <div className="absolute right-0 top-12 w-72 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xl z-50 animate-scaleUp text-slate-800">
                  <h4 className="text-xs font-extrabold text-slate-900 border-b border-slate-100 pb-2 mb-2 uppercase tracking-wide">Notifications</h4>
                  <div className="space-y-3">
                    <div className="text-[11px] text-slate-600 hover:text-slate-900 transition-colors">
                      <span className="font-bold text-[#c3902c]">Database Info:</span> {dbConnected ? 'Supabase connected successfully.' : 'Running in fallback offline storage.'}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold text-emerald-600 tracking-wide uppercase">Agent Active</span>
              </div>
            </div>
          </div>

          {/* Active View Router */}
          <div className="flex-1 space-y-6">
            {activeTab === 'dashboard' && (
              <div className="space-y-8 animate-fadeIn">
                {isLeadsLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <CardSkeleton count={5} />
                  </div>
                ) : (
                  <StatsOverview stats={stats} onSelectTab={(tab) => setActiveTab(tab)} />
                )}
                
                {/* Dashboard Summary cards */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Performance Summary */}
                  <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between gap-6">
                    <div>
                      <h3 className="text-base font-bold text-slate-800 mb-1">Incomplete Leads Queue</h3>
                      <p className="text-xs text-slate-500">Leads requiring completion of gold weight, bank details, or documents.</p>
                    </div>

                    <div className="space-y-3.5">
                      {isLeadsLoading ? (
                        <div className="space-y-2">
                          <div className="h-10 w-full rounded bg-slate-100 animate-pulse" />
                          <div className="h-10 w-full rounded bg-slate-100 animate-pulse" />
                        </div>
                      ) : (
                        leads.filter(lead => {
                          const isFollowup = lead.status === 'FOLLOWUP_IN_PROGRESS';
                          const isMissingDetails = 
                            lead.goldWeight === 0 || 
                            !lead.bankName || 
                            lead.loanAmount === 0 ||
                            !lead.documents || 
                            lead.documents.length === 0;
                          return isFollowup && isMissingDetails;
                        }).slice(0, 3).map((lead, index) => (
                          <div key={index} className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 flex items-center justify-center font-bold text-xs">
                                {lead.customerName.charAt(0)}
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-slate-800">{lead.customerName}</h4>
                                <p className="text-[10px] text-slate-500 mt-0.5">{lead.mobile} | {lead.district}</p>
                              </div>
                            </div>

                            <button
                              onClick={() => handleEditLeadTrigger(lead)}
                              className="flex items-center gap-1.5 py-1.5 px-3.5 rounded-lg bg-[#c3902c] hover:bg-amber-600 text-white text-[10px] font-bold transition-all cursor-pointer shadow-sm"
                            >
                              Complete Details
                            </button>
                          </div>
                        ))
                      )}
                      {!isLeadsLoading && leads.filter(lead => {
                        const isFollowup = lead.status === 'FOLLOWUP_IN_PROGRESS';
                        const isMissingDetails = 
                          lead.goldWeight === 0 || 
                          !lead.bankName || 
                          lead.loanAmount === 0 ||
                          !lead.documents || 
                          lead.documents.length === 0;
                        return isFollowup && isMissingDetails;
                      }).length === 0 && (
                        <div className="py-8 text-center text-xs text-slate-400 uppercase tracking-widest font-medium">
                          Queue is currently empty.
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => setActiveTab('pending-followups')}
                      className="w-full text-center py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors border border-dashed border-slate-200 hover:border-slate-400 rounded-xl bg-white"
                    >
                      View All Pending Follow-ups
                    </button>
                  </div>

                  {/* Daily Gold Rate Banner */}
                  <div className="bg-white border border-slate-200/80 rounded-2xl p-6 flex flex-col justify-between gap-6 shadow-sm">
                    <div>
                      <span className="text-[9px] bg-amber-500/10 text-amber-800 border border-amber-500/30 px-2 py-0.5 rounded-full font-extrabold uppercase tracking-wider">
                        Market Info
                      </span>
                      <h3 className="text-lg font-extrabold text-slate-800 mt-3">Live Gold Rate Today</h3>
                      <p className="text-xs text-slate-500 mt-1">Simulated spot exchange price for standard 22K/24K purity benchmarks.</p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-slate-100">
                        <span className="text-xs text-slate-600 font-medium">Standard Gold (24K/1g)</span>
                        <span className="text-sm font-bold text-slate-800">₹7,450.00</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-slate-100">
                        <span className="text-xs text-slate-600 font-medium">Standard Gold (22K/1g)</span>
                        <span className="text-sm font-bold text-slate-800">₹6,830.00</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-xs text-slate-600 font-medium">Silver Spot (1kg)</span>
                        <span className="text-sm font-bold text-slate-800">₹92,500.00</span>
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-400 italic text-center">
                      Rates updated 10 mins ago. Source spot index.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'add-lead' && (
              <div className="animate-fadeIn">
                <LeadForm
                  onSave={handleSaveLead}
                  editingLead={editingLead}
                  leadSources={leadSourcesList.map((s: any) => s.source_name)}
                  onCancel={() => {
                    setActiveTab('leads-list');
                    setEditingLead(null);
                  }}
                />
              </div>
            )}

            {activeTab === 'leads-list' && (
              <div className="animate-fadeIn">
                {isLeadsLoading ? (
                  <TableSkeleton rows={5} cols={5} />
                ) : (
                  <LeadList
                    leads={leads}
                    onEdit={handleEditLeadTrigger}
                    onUpdateStatus={handleUpdateLeadStatus}
                    onAddFollowup={handleAddFollowup}
                    onDelete={handleDeleteLead}
                  />
                )}
              </div>
            )}

            {activeTab === 'pending-followups' && (
              <div className="animate-fadeIn">
                {isLeadsLoading ? (
                  <TableSkeleton rows={3} cols={4} />
                ) : (
                  <PendingFollowupsList
                    leads={leads}
                    onEdit={handleEditLeadTrigger}
                    onDelete={handleDeleteLead}
                  />
                )}
              </div>
            )}

            {activeTab === 'reports' && (
              <div className="animate-fadeIn">
                <ReportsView leads={leads} />
              </div>
            )}

            {activeTab === 'document-manager' && (
              <div className="animate-fadeIn">
                <DocumentManager />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
