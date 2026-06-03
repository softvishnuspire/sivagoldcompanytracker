import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Phone, 
  Edit3, 
  MapPin, 
  Coins, 
  Building2, 
  Check, 
  X, 
  Clock, 
  CalendarClock, 
  Loader2, 
  PhoneCall, 
  ChevronRight,
  Info,
  Trash2,
  Send
} from 'lucide-react';
import { Lead, LeadStatus } from '../types';

interface LeadListProps {
  leads: Lead[];
  onEdit: (lead: Lead) => void;
  onUpdateStatus: (leadId: string, status: LeadStatus, remarks?: string) => void;
  onAddFollowup: (leadId: string, date: string, remarks: string) => void;
  onDelete: (leadId: string) => void;
}

export default function LeadList({ leads, onEdit, onUpdateStatus, onAddFollowup, onDelete }: LeadListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [districtFilter, setDistrictFilter] = useState<string>('ALL');
  
  // Call simulation modal states
  const [callingLead, setCallingLead] = useState<Lead | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [callTimer, setCallTimer] = useState<NodeJS.Timeout | null>(null);
  const [showCallOutcome, setShowCallOutcome] = useState(false);
  const [followupDate, setFollowupDate] = useState('');
  const [followupRemarks, setFollowupRemarks] = useState('');

  // Search and filter logic
  const filteredLeads = leads.filter(lead => {
    const matchesSearch = 
      lead.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.mobile.includes(searchTerm) ||
      lead.leadNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.bankName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.district.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || lead.status === statusFilter;
    const matchesDistrict = districtFilter === 'ALL' || lead.district === districtFilter;

    return matchesSearch && matchesStatus && matchesDistrict;
  });

  // Call simulation actions
  const startCall = (lead: Lead) => {
    setCallingLead(lead);
    setCallDuration(0);
    setShowCallOutcome(false);
    
    const interval = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
    setCallTimer(interval);
  };

  const endCall = () => {
    if (callTimer) clearInterval(callTimer);
    setCallTimer(null);
    setShowCallOutcome(true);
  };

  const handleCallOutcome = (outcome: 'DETAILS_COLLECTED' | 'RM_REJECTED' | 'FOLLOWUP_IN_PROGRESS') => {
    if (!callingLead) return;

    if (outcome === 'FOLLOWUP_IN_PROGRESS') {
      if (!followupDate || !followupRemarks) {
        alert('Please enter both followup date and remarks');
        return;
      }
      onAddFollowup(callingLead.id, followupDate, followupRemarks);
      onUpdateStatus(callingLead.id, 'FOLLOWUP_IN_PROGRESS', followupRemarks);
    } else if (outcome === 'DETAILS_COLLECTED') {
      onUpdateStatus(callingLead.id, 'SENT_TO_RM', 'Qualified by telecaller');
    } else {
      onUpdateStatus(callingLead.id, 'RM_REJECTED', 'Rejected by telecaller: Customer not interested');
    }

    setCallingLead(null);
    setFollowupDate('');
    setFollowupRemarks('');
    setShowCallOutcome(false);
  };

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Status Badge Generator
  const getStatusBadge = (status: LeadStatus) => {
    const styles: Record<LeadStatus, string> = {
      'CUSTOMER_DETAILS_CREATED': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      'FOLLOWUP_IN_PROGRESS': 'bg-sky-500/10 text-sky-400 border-sky-500/20',
      'DETAILS_COLLECTED': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      'DOCUMENTS_RECEIVED': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
      'PRICE_CONFIRMED': 'bg-lime-500/10 text-lime-400 border-lime-500/20',
      'SENT_TO_RM': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      'RM_APPROVED': 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
      'RM_REVERIFICATION': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
      'RM_REJECTED': 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      'EXECUTIVE_ASSIGNED': 'bg-teal-500/10 text-teal-400 border-teal-500/20',
      'CUSTOMER_CALLED': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
      'VISIT_CONFIRMED': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      'MD_FUNDS_APPROVED': 'bg-violet-500/10 text-violet-400 border-violet-500/20',
      'JOURNEY_STARTED': 'bg-pink-500/10 text-pink-400 border-pink-500/20',
      'REACHED_CUSTOMER': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      'CUSTOMER_INTERACTION': 'bg-sky-500/10 text-sky-400 border-sky-500/20',
      'BANK_VISIT': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      'AGREEMENT_PENDING': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      'PAYMENT_COMPLETED': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      'GOLD_RECEIVED': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
      'BALANCE_SETTLED': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      'IMAGES_UPLOADED': 'bg-teal-500/10 text-teal-400 border-teal-500/20',
      'CASE_COMPLETED': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    };

    return (
      <span className={`text-[10px] uppercase font-bold px-2 py-1 border rounded-full tracking-wider ${styles[status] || 'bg-brand-mahogany text-brand-slate'}`}>
        {status.replace(/_/g, ' ')}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Search and filter header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-brand-mahogany/40 border border-brand-copper/30 rounded-2xl backdrop-blur-md">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-slate" size={18} />
          <input
            type="text"
            placeholder="Search by customer, mobile, ID, bank..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-brand-cherry/40 border border-brand-copper/20 rounded-xl py-2 px-10 text-sm text-brand-silver outline-none focus:border-brand-copper focus:ring-1 focus:ring-brand-copper/20 placeholder-brand-slate/40"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter size={15} className="text-brand-slate" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-brand-cherry/40 border border-brand-copper/20 rounded-xl py-2 px-3 text-xs text-brand-silver outline-none focus:border-brand-copper cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="CUSTOMER_DETAILS_CREATED">New Lead</option>
              <option value="FOLLOWUP_IN_PROGRESS">Follow-up</option>
              <option value="SENT_TO_RM">Sent to RM</option>
              <option value="DETAILS_COLLECTED">Details Collected</option>
              <option value="RM_REJECTED">Rejected</option>
            </select>
          </div>

          <select
            value={districtFilter}
            onChange={(e) => setDistrictFilter(e.target.value)}
            className="bg-brand-cherry/40 border border-brand-copper/20 rounded-xl py-2 px-3 text-xs text-brand-silver outline-none focus:border-brand-copper cursor-pointer"
          >
            <option value="ALL">All Districts</option>
            <option value="Vijayawada">Vijayawada</option>
            <option value="Hyderabad">Hyderabad</option>
            <option value="Vizag">Vizag</option>
            <option value="Guntur">Guntur</option>
            <option value="Nellore">Nellore</option>
          </select>
        </div>
      </div>

      {/* Grid of cards for Mobile/Tablet, Table for Desktop */}
      <div className="hidden lg:block bg-brand-mahogany/40 border border-brand-copper/30 rounded-2xl shadow-xl overflow-hidden backdrop-blur-md">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-brand-cherry/60 border-b border-brand-copper/20 text-xs font-bold text-brand-slate uppercase tracking-wider">
              <th className="py-4 px-6">Lead ID / Date</th>
              <th className="py-4 px-6">Customer Details</th>
              <th className="py-4 px-6">Gold & Value</th>
              <th className="py-4 px-6">Bank & Loan</th>
              <th className="py-4 px-6 text-center">Status</th>
              <th className="py-4 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-copper/10 text-sm text-brand-silver">
            {filteredLeads.length > 0 ? (
              filteredLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-brand-mahogany/20 transition-colors">
                  <td className="py-4 px-6">
                    <div className="font-bold text-brand-silver text-xs font-mono">{lead.leadNumber}</div>
                    <div className="text-[11px] text-brand-slate mt-1">
                      {new Date(lead.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="font-semibold text-brand-silver">{lead.customerName}</div>
                    <div className="text-xs text-brand-slate flex items-center gap-1 mt-1">
                      <Phone size={11} className="text-brand-slate" /> {lead.mobile}
                    </div>
                    <div className="text-[11px] text-brand-slate flex items-center gap-1 mt-1">
                      <MapPin size={11} className="text-brand-slate" /> {lead.district}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="font-semibold text-brand-silver flex items-center gap-1">
                      <Coins size={13} className="text-brand-copper" /> {lead.goldWeight}g
                    </div>
                    <div className="text-xs text-brand-slate mt-0.5">{lead.goldType}</div>
                    <div className="text-[11px] text-brand-copper font-medium mt-1">
                      Est: ₹{lead.estimatedValue.toLocaleString('en-IN')}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="font-medium text-brand-silver flex items-center gap-1">
                      <Building2 size={13} className="text-brand-slate" /> {lead.bankName}
                    </div>
                    <div className="text-xs text-brand-slate mt-0.5">{lead.branchName}</div>
                    <div className="text-[11px] text-rose-400/80 font-medium mt-1">
                      Loan: ₹{lead.loanAmount.toLocaleString('en-IN')}
                    </div>
                  </td>
                  <td className="py-4 px-6 text-center">
                    {getStatusBadge(lead.status)}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-2.5">
                      {['CUSTOMER_DETAILS_CREATED', 'FOLLOWUP_IN_PROGRESS'].includes(lead.status) && (
                        <button
                          onClick={() => startCall(lead)}
                          className="p-2 rounded-xl bg-brand-copper/20 text-brand-silver hover:bg-brand-copper/40 transition-colors border border-brand-copper/35 cursor-pointer"
                          title="Simulate Call"
                        >
                          <Phone size={15} />
                        </button>
                      )}
                      {lead.status === 'CUSTOMER_DETAILS_CREATED' && (
                        <button
                          onClick={() => onUpdateStatus(lead.id, 'SENT_TO_RM', 'Sent to RM for verification')}
                          className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/30 transition-colors border border-emerald-500/30 cursor-pointer"
                          title="Send to RM"
                        >
                          <Send size={15} />
                        </button>
                      )}
                      <button
                        onClick={() => onEdit(lead)}
                        className="p-2 rounded-xl bg-brand-mahogany text-brand-slate hover:bg-brand-copper/20 hover:text-white transition-colors border border-brand-copper/20 cursor-pointer"
                        title="Edit Lead"
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to delete lead ${lead.leadNumber} (${lead.customerName})?`)) {
                            onDelete(lead.id);
                          }
                        }}
                        className="p-2 rounded-xl bg-brand-mahogany text-rose-400 hover:bg-rose-500/10 hover:text-rose-500 transition-colors border border-brand-copper/20 hover:border-rose-500/30 cursor-pointer"
                        title="Delete Lead"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="py-8 text-center text-brand-slate text-xs uppercase tracking-wider">
                  No leads found matching query.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Grid view for mobile / small viewports */}
      <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredLeads.length > 0 ? (
          filteredLeads.map((lead) => (
            <div 
              key={lead.id} 
              className="bg-brand-mahogany/40 border border-brand-copper/30 rounded-2xl p-5 backdrop-blur-md flex flex-col justify-between gap-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-xs font-bold text-brand-silver bg-brand-copper/20 py-0.5 px-2 rounded-lg border border-brand-copper/35">
                    {lead.leadNumber}
                  </span>
                  <h3 className="text-base font-bold text-brand-silver mt-2">{lead.customerName}</h3>
                  <p className="text-xs text-brand-slate flex items-center gap-1 mt-1">
                    <Phone size={12} className="text-brand-slate" /> {lead.mobile}
                  </p>
                </div>
                {getStatusBadge(lead.status)}
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-brand-cherry/40 border border-brand-copper/15 text-xs">
                <div>
                  <div className="text-brand-slate font-semibold mb-0.5 uppercase tracking-wide">District</div>
                  <div className="text-brand-silver font-medium">{lead.district}</div>
                </div>
                <div>
                  <div className="text-brand-slate font-semibold mb-0.5 uppercase tracking-wide">Gold Weight</div>
                  <div className="text-brand-silver font-bold flex items-center gap-0.5">
                    <Coins size={11} className="text-brand-copper" /> {lead.goldWeight}g
                  </div>
                </div>
                <div>
                  <div className="text-brand-slate font-semibold mb-0.5 uppercase tracking-wide">Loan Amount</div>
                  <div className="text-rose-400 font-medium">₹{lead.loanAmount.toLocaleString('en-IN')}</div>
                </div>
                <div>
                  <div className="text-brand-slate font-semibold mb-0.5 uppercase tracking-wide">Est. Value</div>
                  <div className="text-brand-silver font-bold">₹{lead.estimatedValue.toLocaleString('en-IN')}</div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-brand-copper/10 mt-1">
                <span className="text-[10px] text-brand-slate">
                  Created {new Date(lead.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
                
                <div className="flex gap-2">
                  {['CUSTOMER_DETAILS_CREATED', 'FOLLOWUP_IN_PROGRESS'].includes(lead.status) && (
                    <button
                      onClick={() => startCall(lead)}
                      className="flex items-center gap-1 py-1.5 px-3 rounded-lg bg-brand-copper/20 text-brand-silver border border-brand-copper/35 text-xs font-semibold hover:bg-brand-copper/40 transition-all cursor-pointer"
                    >
                      <Phone size={13} /> Call
                    </button>
                  )}
                  {lead.status === 'CUSTOMER_DETAILS_CREATED' && (
                    <button
                      onClick={() => onUpdateStatus(lead.id, 'SENT_TO_RM', 'Sent to RM for verification')}
                      className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 text-xs font-semibold hover:bg-emerald-500/30 transition-all cursor-pointer"
                    >
                      <Send size={13} /> Send to RM
                    </button>
                  )}
                  <button
                    onClick={() => onEdit(lead)}
                    className="flex items-center gap-1 py-1.5 px-3 rounded-lg bg-brand-mahogany text-brand-slate border border-brand-copper/20 text-xs font-semibold hover:bg-brand-copper/20 transition-all cursor-pointer"
                  >
                    <Edit3 size={13} /> Edit
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`Are you sure you want to delete lead ${lead.leadNumber} (${lead.customerName})?`)) {
                        onDelete(lead.id);
                      }
                    }}
                    className="flex items-center gap-1 py-1.5 px-3 rounded-lg bg-brand-mahogany text-rose-400 border border-brand-copper/20 text-xs font-semibold hover:bg-rose-500/10 hover:text-rose-400 transition-all cursor-pointer"
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-8 text-center text-brand-slate text-xs uppercase tracking-wider bg-brand-mahogany/20 rounded-2xl border border-brand-copper/15">
            No leads found.
          </div>
        )}
      </div>

      {/* Call simulation Modal */}
      {callingLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-cherry/90 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-brand-mahogany border border-brand-copper/35 rounded-3xl p-6 shadow-2xl text-center animate-scaleUp">
            
            {/* Pulsing ring indicator */}
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-brand-copper/20 text-brand-silver mb-6 border border-brand-copper/40 relative">
              <span className="absolute inset-0 rounded-full border border-brand-copper/60 animate-ping opacity-60" />
              <PhoneCall size={32} />
            </div>

            <h3 className="text-xl font-bold text-brand-silver mb-1 font-sans">Simulating Client Call</h3>
            <p className="text-sm text-brand-slate font-semibold mb-4">
              {callingLead.customerName}
            </p>

            <div className="font-mono text-lg font-bold text-brand-silver bg-brand-cherry/80 py-2.5 px-4 rounded-xl border border-brand-copper/25 inline-block mb-6 shadow-inner">
              {formatDuration(callDuration)}
            </div>

            {/* Display caller details */}
            <div className="bg-brand-cherry/30 border border-brand-copper/20 p-4 rounded-2xl text-left text-xs mb-6 space-y-2">
              <div className="flex justify-between">
                <span className="text-brand-slate font-semibold uppercase">Mobile:</span>
                <span className="text-brand-silver font-bold">{callingLead.mobile}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-brand-slate font-semibold uppercase">Pledged Bank:</span>
                <span className="text-brand-silver font-bold">{callingLead.bankName} ({callingLead.branchName})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-brand-slate font-semibold uppercase">Gold Weight:</span>
                <span className="text-brand-silver font-bold">{callingLead.goldWeight}g</span>
              </div>
              <div className="flex justify-between">
                <span className="text-brand-slate font-semibold uppercase">Est. Value:</span>
                <span className="text-brand-silver font-bold">₹{callingLead.estimatedValue.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {!showCallOutcome ? (
              <button
                onClick={endCall}
                className="w-full py-3 bg-rose-700 hover:bg-rose-600 text-white font-bold rounded-xl transition-all shadow-lg cursor-pointer"
              >
                Disconnect Call
              </button>
            ) : (
              <div className="space-y-4 animate-fadeIn">
                <h4 className="text-sm font-bold text-brand-silver text-left border-b border-brand-copper/20 pb-2 mb-2 uppercase tracking-wide">
                  Record Call Outcome
                </h4>
                
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleCallOutcome('DETAILS_COLLECTED')}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all text-xs font-bold cursor-pointer"
                  >
                    <Check size={16} /> Interested
                  </button>
                  <button
                    onClick={() => handleCallOutcome('RM_REJECTED')}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 transition-all text-xs font-bold cursor-pointer"
                  >
                    <X size={16} /> Not Interested
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-brand-cherry/40 border border-brand-copper/20 text-left space-y-3">
                  <span className="text-xs font-bold text-sky-400 uppercase tracking-wide flex items-center gap-1">
                    <CalendarClock size={13} /> Schedule Follow-up
                  </span>

                  <div>
                    <label className="block text-[10px] font-semibold text-brand-slate mb-1">DATE</label>
                    <input
                      type="date"
                      value={followupDate}
                      onChange={(e) => setFollowupDate(e.target.value)}
                      className="w-full bg-brand-mahogany border border-brand-copper/30 rounded-lg py-1.5 px-2.5 text-xs text-brand-silver outline-none focus:border-brand-copper"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-brand-slate mb-1">REMARKS</label>
                    <textarea
                      value={followupRemarks}
                      onChange={(e) => setFollowupRemarks(e.target.value)}
                      placeholder="e.g. Call at 5pm / check documents"
                      rows={2}
                      className="w-full bg-brand-mahogany border border-brand-copper/30 rounded-lg py-1.5 px-2.5 text-xs text-brand-silver outline-none focus:border-brand-copper resize-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCallOutcome('FOLLOWUP_IN_PROGRESS')}
                    className="w-full py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg text-xs transition-all shadow-lg cursor-pointer"
                  >
                    Set Follow-up
                  </button>
                </div>

                <button
                  onClick={() => setCallingLead(null)}
                  className="w-full py-2 border border-brand-copper/20 hover:bg-brand-mahogany text-brand-slate hover:text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Cancel / Record Later
                </button>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
