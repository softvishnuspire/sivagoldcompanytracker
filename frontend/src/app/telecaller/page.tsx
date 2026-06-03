'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  PhoneCall, 
  PlusCircle, 
  ListTodo, 
  FileText, 
  BarChart3, 
  LogOut, 
  User, 
  LayoutDashboard,
  Bell,
  Menu,
  X,
  Phone,
  Coins,
  Clock
} from 'lucide-react';
import { Lead, LeadStatus, DashboardStats, Followup } from './types';
import { INITIAL_LEADS } from './mockData';
// Import components
import StatsOverview from './components/StatsOverview';
import LeadForm from './components/LeadForm';
import LeadList from './components/LeadList';
import FollowupList from './components/FollowupList';
import ReportsView from './components/ReportsView';
import PendingFollowupsList from './components/PendingFollowupsList';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function TelecallerDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'add-lead' | 'leads-list' | 'follow-ups' | 'pending-followups' | 'reports'>('dashboard');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [activeCallLead, setActiveCallLead] = useState<Lead | null>(null);
  
  // Current logged in agent session
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [dbConnected, setDbConnected] = useState(false);

  // 1. Data mapping helpers between DB snake_case and UI camelCase
  const mapDbToLead = (db: any): Lead => {
    // Map documents
    const documents = (db.documents || []).map((doc: any) => ({
      id: doc.id,
      leadId: doc.lead_id,
      documentType: doc.document_type,
      fileName: doc.file_url.split('/').pop() || 'document.pdf',
      fileUrl: doc.file_url,
      uploadedBy: doc.uploaded_by,
      createdAt: doc.created_at
    }));

    // Map interactions into followups
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
      status: db.current_status as LeadStatus,
      telecallerId: db.telecaller_id,
      rmId: db.rm_id,
      executiveId: db.executive_id,
      createdAt: db.created_at,
      updatedAt: db.updated_at,
      documents,
      followups
    };
  };

  // Fetch leads from database
  const fetchLeads = async () => {
    try {
      const response = await fetch(`${API_BASE}/leads`);
      if (!response.ok) {
        throw new Error('Failed to fetch leads from backend API');
      }
      const dbLeads = await response.json();

      if (dbLeads) {
        const mapped = dbLeads.map(mapDbToLead);
        setLeads(mapped);
        setDbConnected(true);
      }
    } catch (err) {
      console.warn('Backend fetch leads failed. Falling back to local storage/mock data.', err);
      setDbConnected(false);
      
      // Fallback local storage
      const stored = localStorage.getItem('siva_leads');
      if (stored) {
        try { setLeads(JSON.parse(stored)); } catch (e) { setLeads(INITIAL_LEADS); }
      } else {
        setLeads(INITIAL_LEADS);
        localStorage.setItem('siva_leads', JSON.stringify(INITIAL_LEADS));
      }
    }
  };

  // Initialize and load
  useEffect(() => {
    // Load current user session
    const sessionUser = localStorage.getItem('siva_user');
    if (sessionUser) {
      try {
        setCurrentUser(JSON.parse(sessionUser));
      } catch (e) {
        setCurrentUser({ id: 'mock-uuid-tc-agent-1', name: 'Dev Agent' });
      }
    } else {
      setCurrentUser({ id: 'mock-uuid-tc-agent-1', name: 'Dev Agent' });
    }

    fetchLeads();
  }, []);

  const saveLeadsFallback = (updatedLeads: Lead[]) => {
    setLeads(updatedLeads);
    localStorage.setItem('siva_leads', JSON.stringify(updatedLeads));
  };

  // Helper to compute stats dynamically
  const getStats = (): DashboardStats => {
    const newLeads = leads.filter(l => l.status === 'NEW LEAD' || l.status === 'CUSTOMER_DETAILS_CREATED').length;
    
    const pendingFollowups = leads.filter(l => 
      l.status === 'FOLLOW-UP' || 
      (l.followups && l.followups.some(f => f.status === 'PENDING'))
    ).length;

    const qualifiedLeads = leads.filter(l => l.status === 'QUALIFIED').length;
    const rejectedLeads = leads.filter(l => l.status === 'REJECTED').length;
    
    const sentToRM = leads.filter(l => 
      !['NEW LEAD', 'CUSTOMER_DETAILS_CREATED', 'FOLLOW-UP', 'QUALIFIED', 'REJECTED'].includes(l.status)
    ).length;

    return { newLeads, pendingFollowups, qualifiedLeads, rejectedLeads, sentToRM };
  };

  const handleSaveLead = async (formData: Omit<Lead, 'id' | 'leadNumber' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
    const telecallerId = currentUser?.id || 'mock-uuid-tc-agent-1';

    if (dbConnected) {
      try {
        if (formData.id) {
          // 1. Editing mode
          const response = await fetch(`${API_BASE}/leads/${formData.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              customer_name: formData.customerName,
              mobile: formData.mobile,
              alternate_mobile: formData.alternateMobile,
              address: formData.address,
              district: formData.district,
              gold_weight: formData.goldWeight,
              gold_type: formData.goldType,
              estimated_value: formData.estimatedValue,
              bank_name: formData.bankName,
              branch_name: formData.branchName,
              loan_account_number: formData.loanAccountNumber,
              loan_amount: formData.loanAmount,
              current_status: formData.status,
              telecaller_id: telecallerId
            })
          });

          if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'Failed to update lead');
          }
        } else {
          // 2. Creation mode
          const response = await fetch(`${API_BASE}/leads`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              customer_name: formData.customerName,
              mobile: formData.mobile,
              alternate_mobile: formData.alternateMobile,
              address: formData.address,
              district: formData.district,
              gold_weight: formData.goldWeight,
              gold_type: formData.goldType,
              estimated_value: formData.estimatedValue,
              bank_name: formData.bankName,
              branch_name: formData.branchName,
              loan_account_number: formData.loanAccountNumber,
              loan_amount: formData.loanAmount,
              current_status: 'CUSTOMER_DETAILS_CREATED',
              telecaller_id: telecallerId,
              documents: formData.documents
            })
          });

          if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'Failed to create lead');
          }
        }

        // Refresh leads
        await fetchLeads();
        setEditingLead(null);
        setActiveTab('leads-list');
        return;

      } catch (err) {
        console.error('Database save lead failed. Saving to fallback storage.', err);
      }
    }

    // Fallback Local Storage Mode
    let updatedLeads = [...leads];
    if (formData.id) {
      updatedLeads = leads.map(l => {
        if (l.id === formData.id) {
          return {
            ...l,
            ...formData,
            updatedAt: new Date().toISOString()
          } as Lead;
        }
        return l;
      });
      setEditingLead(null);
    } else {
      const nextNum = leads.length + 1;
      const leadNumber = `SGL-2026-${nextNum.toString().padStart(4, '0')}`;
      const newLead: Lead = {
        ...formData,
        id: `L-${Date.now()}`,
        leadNumber,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        followups: [],
        documents: formData.documents || []
      } as Lead;
      updatedLeads.unshift(newLead);
    }
    saveLeadsFallback(updatedLeads);
    setActiveTab('leads-list');
  };

  const handleUpdateLeadStatus = async (leadId: string, status: LeadStatus, remarks?: string) => {
    const telecallerId = currentUser?.id || 'mock-uuid-tc-agent-1';

    if (dbConnected) {
      try {
        const response = await fetch(`${API_BASE}/leads/${leadId}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            current_status: status,
            remarks: remarks || `Status updated to ${status}`,
            telecaller_id: telecallerId
          })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'Failed to update status');
        }

        await fetchLeads();
        return;
      } catch (err) {
        console.error('Database update status failed.', err);
      }
    }

    // Fallback mode
    const updated = leads.map(l => {
      if (l.id === leadId) {
        return {
          ...l,
          status,
          updatedAt: new Date().toISOString()
        };
      }
      return l;
    });
    saveLeadsFallback(updated);
  };

  const handleAddFollowup = async (leadId: string, date: string, remarks: string) => {
    const telecallerId = currentUser?.id || 'mock-uuid-tc-agent-1';

    if (dbConnected) {
      try {
        const response = await fetch(`${API_BASE}/leads/${leadId}/followups`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            date,
            remarks,
            telecaller_id: telecallerId
          })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'Failed to add followup');
        }

        await fetchLeads();
        return;
      } catch (err) {
        console.error('Database add followup failed.', err);
      }
    }

    // Fallback Mode
    const newFollowup: Followup = {
      id: `F-${Date.now()}`,
      leadId,
      followupDate: date,
      remarks,
      status: 'PENDING',
      createdBy: telecallerId,
      createdAt: new Date().toISOString()
    };

    const updated = leads.map(l => {
      if (l.id === leadId) {
        return {
          ...l,
          status: 'FOLLOW-UP' as LeadStatus,
          followups: [...(l.followups || []), newFollowup],
          updatedAt: new Date().toISOString()
        };
      }
      return l;
    });
    saveLeadsFallback(updated);
  };

  const handleCompleteFollowup = async (leadId: string, followupId: string, remarks: string) => {
    const telecallerId = currentUser?.id || 'mock-uuid-tc-agent-1';

    if (dbConnected) {
      try {
        const response = await fetch(`${API_BASE}/leads/${leadId}/followups/${followupId}/complete`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            remarks,
            telecaller_id: telecallerId
          })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'Failed to complete followup');
        }

        await fetchLeads();
        return;
      } catch (err) {
        console.error('Database complete followup failed.', err);
      }
    }

    // Fallback Mode
    const updated = leads.map(l => {
      if (l.id === leadId) {
        const updatedFollowups = (l.followups || []).map(f => {
          if (f.id === followupId) {
            return { ...f, status: 'COMPLETED' as const, remarks };
          }
          return f;
        });

        const hasMorePending = updatedFollowups.some(f => f.status === 'PENDING');
        const nextStatus: LeadStatus = hasMorePending ? 'FOLLOW-UP' : 'CUSTOMER_DETAILS_CREATED';

        return {
          ...l,
          status: nextStatus,
          followups: updatedFollowups,
          updatedAt: new Date().toISOString()
        };
      }
      return l;
    });
    saveLeadsFallback(updated);
  };

  const handleEditLeadTrigger = (lead: Lead) => {
    setEditingLead(lead);
    setActiveTab('add-lead');
  };

  const triggerCallSimulationFromFollowup = (lead: Lead) => {
    setActiveTab('leads-list');
    setActiveCallLead(lead);
  };

  const stats = getStats();

  const navigationItems = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'leads-list' as const, label: 'Lead Management', icon: ListTodo },
    { id: 'add-lead' as const, label: 'Add Lead', icon: PlusCircle },
    { id: 'pending-followups' as const, label: 'Pending Followups', icon: Clock },
    { id: 'follow-ups' as const, label: 'Follow-ups', icon: PhoneCall },
    { id: 'reports' as const, label: 'Reports', icon: BarChart3 }
  ];

  return (
    <div className="min-h-screen bg-brand-cherry text-brand-silver flex flex-col font-sans">
      {/* Mobile Header */}
      <header className="lg:hidden flex items-center justify-between p-4 bg-brand-mahogany border-b border-brand-copper/35 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg hover:bg-brand-cherry text-brand-slate hover:text-brand-silver transition-colors"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="font-extrabold text-sm tracking-tight text-brand-silver flex items-center gap-1.5">
            <span className="text-brand-silver font-black">SIVA GOLD</span>
            <span className="text-[10px] bg-brand-copper/20 text-brand-silver py-0.5 px-2 rounded-full border border-brand-copper/30">TRACKER</span>
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
          className={`fixed inset-y-0 left-0 z-50 w-64 bg-brand-mahogany border-r border-brand-copper/30 flex flex-col justify-between transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div>
            {/* Sidebar Logo */}
            <div className="p-6 border-b border-brand-copper/20 hidden lg:flex items-center justify-between">
              <div className="flex flex-col">
                <span className="font-black text-lg text-brand-silver tracking-tight flex items-center gap-1">
                  SHIVA GOLD <span className="text-xs text-brand-silver/80 font-medium">Co.</span>
                </span>
                <span className="text-[10px] text-brand-slate uppercase tracking-widest font-semibold mt-0.5">Management Portal</span>
              </div>
            </div>

            {/* Agent Profile */}
            <div className="p-5 border-b border-brand-copper/25 bg-brand-cherry/40 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-copper/20 border border-brand-copper/30 text-brand-silver flex items-center justify-center font-bold">
                TC
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-brand-silver truncate">{currentUser?.name || 'Telecaller Agent 01'}</h4>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[9px] text-brand-slate font-bold uppercase tracking-wider">
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
                    className={`w-full flex items-center gap-3 py-3 px-4 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer ${
                      isActive
                        ? 'bg-brand-copper text-brand-silver shadow-[0_4px_12px_rgba(101,72,59,0.3)] border border-brand-copper/50'
                        : 'text-brand-slate hover:bg-brand-cherry/60 hover:text-brand-silver'
                    }`}
                  >
                    <Icon size={16} />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-brand-copper/20">
            <button
              onClick={() => {
                localStorage.removeItem('siva_user');
                router.push('/');
              }}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold text-brand-slate hover:bg-rose-500/10 hover:text-rose-400 border border-brand-copper/20 hover:border-rose-500/20 transition-all cursor-pointer"
            >
              <LogOut size={15} />
              Logout Portal
            </button>
          </div>
        </aside>

        {/* Overlay when sidebar open on mobile */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-brand-cherry/80 backdrop-blur-sm lg:hidden"
          />
        )}

        {/* Main Content Workspace */}
        <main className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-7xl mx-auto w-full space-y-6 pb-24 lg:pb-8">
          {/* Header Title bar */}
          <div className="hidden lg:flex items-center justify-between pb-4 border-b border-brand-mahogany">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-brand-silver capitalize">
                {activeTab === 'dashboard' ? `Welcome Back, ${currentUser?.name?.split(' ')[0] || 'Agent'}` : activeTab.replace('-', ' ')}
              </h1>
              <p className="text-xs text-brand-slate mt-1">
                Monitor incoming customer gold pledge requests and initiate outbound callbacks.
              </p>
            </div>

            {/* Top Toolbar */}
            <div className="flex items-center gap-3 relative">
              <button 
                onClick={() => setShowNotification(!showNotification)}
                className="p-2 rounded-xl bg-brand-mahogany border border-brand-copper/30 hover:border-brand-copper text-brand-slate hover:text-brand-silver transition-all relative cursor-pointer"
              >
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-brand-copper" />
                <Bell size={16} />
              </button>

              {showNotification && (
                <div className="absolute right-0 top-12 w-72 bg-brand-mahogany border border-brand-copper/30 rounded-2xl p-4 shadow-2xl z-50 animate-scaleUp">
                  <h4 className="text-xs font-bold text-brand-silver border-b border-brand-copper/20 pb-2 mb-2 uppercase tracking-wide">Notifications</h4>
                  <div className="space-y-3">
                    <div className="text-[11px] text-brand-slate hover:text-brand-silver transition-colors">
                      <span className="font-bold text-brand-copper">Database Info:</span> {dbConnected ? 'Supabase connected successfully.' : 'Running in fallback offline storage.'}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-brand-mahogany border border-brand-copper/30">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold text-emerald-400 tracking-wide uppercase">Agent Active</span>
              </div>
            </div>
          </div>

          {/* Active View Router */}
          <div className="flex-1 space-y-6">
            {activeTab === 'dashboard' && (
              <div className="space-y-8 animate-fadeIn">
                <StatsOverview stats={stats} onSelectTab={(tab) => setActiveTab(tab)} />
                
                {/* Dashboard Summary cards */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Performance Summary */}
                  <div className="lg:col-span-2 bg-brand-mahogany/40 border border-brand-copper/25 rounded-2xl p-6 backdrop-blur-md flex flex-col justify-between gap-6">
                    <div>
                      <h3 className="text-base font-bold text-brand-silver mb-1">Outbound Calling Queue</h3>
                      <p className="text-xs text-brand-slate">Ready numbers selected according to scheduled callback parameters.</p>
                    </div>

                    <div className="space-y-3.5">
                      {leads.filter(l => ['NEW LEAD', 'CUSTOMER_DETAILS_CREATED', 'FOLLOW-UP'].includes(l.status)).slice(0, 3).map((lead, index) => (
                        <div key={index} className="flex items-center justify-between p-3.5 rounded-xl bg-brand-cherry/40 border border-brand-copper/15">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-brand-copper/20 border border-brand-copper/30 text-brand-silver flex items-center justify-center font-bold text-xs">
                              {lead.customerName.charAt(0)}
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-brand-silver">{lead.customerName}</h4>
                              <p className="text-[10px] text-brand-slate mt-0.5">{lead.mobile} | {lead.district}</p>
                            </div>
                          </div>

                          <button
                            onClick={() => triggerCallSimulationFromFollowup(lead)}
                            className="flex items-center gap-1 py-1.5 px-3 rounded-lg bg-brand-copper hover:bg-brand-copper/80 text-brand-silver text-[10px] font-bold transition-all cursor-pointer shadow-md"
                          >
                            <Phone size={11} /> Dial Client
                          </button>
                        </div>
                      ))}
                      {leads.filter(l => ['NEW LEAD', 'CUSTOMER_DETAILS_CREATED', 'FOLLOW-UP'].includes(l.status)).length === 0 && (
                        <div className="py-8 text-center text-xs text-brand-slate/60 uppercase tracking-widest">
                          Queue is currently empty.
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => setActiveTab('leads-list')}
                      className="w-full text-center py-2 text-xs font-bold text-brand-slate hover:text-brand-silver transition-colors border border-dashed border-brand-copper/35 hover:border-brand-copper/60 rounded-xl"
                    >
                      View All Active Leads List
                    </button>
                  </div>

                  {/* Daily Gold Rate Banner */}
                  <div className="bg-gradient-to-br from-brand-mahogany/70 via-brand-cherry/30 to-brand-mahogany border border-brand-copper/30 rounded-2xl p-6 flex flex-col justify-between gap-6 shadow-[0_8px_32px_rgba(61,21,16,0.2)]">
                    <div>
                      <span className="text-[9px] bg-brand-copper/20 text-brand-silver border border-brand-copper/30 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                        Market Info
                      </span>
                      <h3 className="text-lg font-extrabold text-brand-silver mt-3">Live Gold Rate Today</h3>
                      <p className="text-xs text-brand-slate mt-1">Simulated spot exchange price for standard 22K/24K purity benchmarks.</p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-brand-copper/10">
                        <span className="text-xs text-brand-slate font-medium">Standard Gold (24K/1g)</span>
                        <span className="text-sm font-bold text-brand-silver">₹7,450.00</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-brand-copper/10">
                        <span className="text-xs text-brand-slate font-medium">Standard Gold (22K/1g)</span>
                        <span className="text-sm font-bold text-brand-silver">₹6,830.00</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-xs text-brand-slate font-medium">Silver Spot (1kg)</span>
                        <span className="text-sm font-bold text-brand-silver/90">₹92,500.00</span>
                      </div>
                    </div>

                    <div className="text-[10px] text-brand-slate/60 italic text-center">
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
                  onCancel={() => {
                    setActiveTab('leads-list');
                    setEditingLead(null);
                  }}
                />
              </div>
            )}

            {activeTab === 'leads-list' && (
              <div className="animate-fadeIn">
                <LeadList
                  leads={leads}
                  onEdit={handleEditLeadTrigger}
                  onUpdateStatus={handleUpdateLeadStatus}
                  onAddFollowup={handleAddFollowup}
                />
              </div>
            )}

            {activeTab === 'follow-ups' && (
              <div className="animate-fadeIn">
                <FollowupList
                  leads={leads}
                  onCompleteFollowup={handleCompleteFollowup}
                  onSimulateCall={triggerCallSimulationFromFollowup}
                />
              </div>
            )}

            {activeTab === 'pending-followups' && (
              <div className="animate-fadeIn">
                <PendingFollowupsList
                  leads={leads}
                  onEdit={handleEditLeadTrigger}
                />
              </div>
            )}

            {activeTab === 'reports' && (
              <div className="animate-fadeIn">
                <ReportsView leads={leads} />
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-brand-mahogany border-t border-brand-copper/25 p-2 flex items-center justify-around z-40 backdrop-blur-md bg-opacity-95 shadow-2xl">
        {navigationItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                if (item.id !== 'add-lead') {
                  setEditingLead(null);
                }
              }}
              className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl transition-all duration-300 ${
                isActive ? 'text-brand-silver' : 'text-brand-slate hover:text-brand-silver'
              }`}
            >
              <Icon size={18} />
              <span className="text-[9px] font-bold tracking-tight">{item.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
