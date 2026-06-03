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
      'CUSTOMER_DETAILS_CREATED': 'bg-amber-50 text-amber-700 border-amber-200',
      'FOLLOWUP_IN_PROGRESS': 'bg-sky-50 text-sky-700 border-sky-200',
      'DETAILS_COLLECTED': 'bg-emerald-50 text-emerald-700 border-emerald-250',
      'DOCUMENTS_RECEIVED': 'bg-cyan-50 text-cyan-700 border-cyan-200',
      'PRICE_CONFIRMED': 'bg-lime-50 text-lime-700 border-lime-200',
      'SENT_TO_RM': 'bg-purple-55 bg-opacity-10 text-purple-700 border-purple-200',
      'RM_APPROVED': 'bg-indigo-50 text-indigo-700 border-indigo-200',
      'RM_REVERIFICATION': 'bg-orange-50 text-orange-700 border-orange-200',
      'RM_REJECTED': 'bg-rose-50 text-rose-700 border-rose-200',
      'EXECUTIVE_ASSIGNED': 'bg-teal-50 text-teal-700 border-teal-200',
      'CUSTOMER_CALLED': 'bg-cyan-50 text-cyan-700 border-cyan-200',
      'VISIT_CONFIRMED': 'bg-blue-50 text-blue-700 border-blue-200',
      'MD_FUNDS_APPROVED': 'bg-violet-50 text-violet-700 border-violet-200',
      'JOURNEY_STARTED': 'bg-pink-50 text-pink-700 border-pink-200',
      'REACHED_CUSTOMER': 'bg-emerald-50 text-emerald-700 border-emerald-200',
      'CUSTOMER_INTERACTION': 'bg-sky-50 text-sky-700 border-sky-200',
      'BANK_VISIT': 'bg-yellow-50 text-yellow-700 border-yellow-200',
      'AGREEMENT_PENDING': 'bg-amber-50 text-amber-700 border-amber-200',
      'PAYMENT_COMPLETED': 'bg-amber-50 text-amber-700 border-amber-200',
      'GOLD_RECEIVED': 'bg-orange-50 text-orange-700 border-orange-200',
      'BALANCE_SETTLED': 'bg-emerald-50 text-emerald-700 border-emerald-200',
      'IMAGES_UPLOADED': 'bg-teal-50 text-teal-700 border-teal-200',
      'CASE_COMPLETED': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    };

    return (
      <span className={`text-[10px] uppercase font-extrabold px-2.5 py-1 border rounded-lg tracking-wider ${styles[status] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
        {status.replace(/_/g, ' ')}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Search and filter header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm text-slate-800">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search by customer, mobile, ID, bank..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-10 text-sm text-slate-800 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-500/10 placeholder-slate-400/85"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter size={15} className="text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-700 outline-none focus:border-amber-450 cursor-pointer"
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
            className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-700 outline-none focus:border-amber-450 cursor-pointer"
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
      <div className="hidden lg:block bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-450 uppercase tracking-wider">
              <th className="py-4 px-6">Lead ID / Date</th>
              <th className="py-4 px-6">Customer Details</th>
              <th className="py-4 px-6">Gold & Value</th>
              <th className="py-4 px-6">Bank & Loan</th>
              <th className="py-4 px-6 text-center">Status</th>
              <th className="py-4 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm text-slate-800">
            {filteredLeads.length > 0 ? (
              filteredLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-6">
                    <div className="font-bold text-slate-700 text-xs font-mono">{lead.leadNumber}</div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      {new Date(lead.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="font-semibold text-slate-800">{lead.customerName}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                      <Phone size={11} className="text-slate-400" /> {lead.mobile}
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-1">
                      <MapPin size={11} className="text-slate-400" /> {lead.district}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="font-semibold text-slate-700 flex items-center gap-1">
                      <Coins size={13} className="text-amber-600" /> {lead.goldWeight}g
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">{lead.goldType}</div>
                    <div className="text-[11px] text-[#c3902c] font-bold mt-1">
                      Est: ₹{lead.estimatedValue.toLocaleString('en-IN')}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="font-medium text-slate-700 flex items-center gap-1">
                      <Building2 size={13} className="text-slate-400" /> {lead.bankName}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">{lead.branchName}</div>
                    <div className="text-[11px] text-rose-605 font-bold mt-1">
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
                          className="p-2 rounded-xl bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 transition-colors border border-amber-500/20 cursor-pointer"
                          title="Simulate Call"
                        >
                          <Phone size={15} />
                        </button>
                      )}
                      {lead.status === 'CUSTOMER_DETAILS_CREATED' && (
                        <button
                          onClick={() => onUpdateStatus(lead.id, 'SENT_TO_RM', 'Sent to RM for verification')}
                          className="p-2 rounded-xl bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 transition-colors border border-emerald-500/20 cursor-pointer"
                          title="Send to RM"
                        >
                          <Send size={15} />
                        </button>
                      )}
                      <button
                        onClick={() => onEdit(lead)}
                        className="p-2 rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors border border-slate-200 cursor-pointer"
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
                        className="p-2 rounded-xl bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 hover:text-rose-700 transition-colors border border-rose-200 cursor-pointer"
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
                <td colSpan={6} className="py-8 text-center text-slate-400 text-xs uppercase tracking-wider">
                  No leads found matching query.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Grid view for mobile / small viewports */}
      <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-800">
        {filteredLeads.length > 0 ? (
          filteredLeads.map((lead) => (
            <div 
              key={lead.id} 
              className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex flex-col justify-between gap-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 py-0.5 px-2 rounded-lg border border-slate-200">
                    {lead.leadNumber}
                  </span>
                  <h3 className="text-base font-bold text-slate-800 mt-2">{lead.customerName}</h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                    <Phone size={12} className="text-slate-400" /> {lead.mobile}
                  </p>
                </div>
                {getStatusBadge(lead.status)}
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/50 text-xs">
                <div>
                  <div className="text-slate-550 font-semibold mb-0.5 uppercase tracking-wide text-[9px]">District</div>
                  <div className="text-slate-700 font-bold">{lead.district}</div>
                </div>
                <div>
                  <div className="text-slate-550 font-semibold mb-0.5 uppercase tracking-wide text-[9px]">Gold Weight</div>
                  <div className="text-slate-800 font-black flex items-center gap-0.5">
                    <Coins size={11} className="text-amber-600" /> {lead.goldWeight}g
                  </div>
                </div>
                <div>
                  <div className="text-slate-550 font-semibold mb-0.5 uppercase tracking-wide text-[9px]">Loan Amount</div>
                  <div className="text-rose-600 font-bold">₹{lead.loanAmount.toLocaleString('en-IN')}</div>
                </div>
                <div>
                  <div className="text-slate-550 font-semibold mb-0.5 uppercase tracking-wide text-[9px]">Est. Value</div>
                  <div className="text-amber-600 font-bold">₹{lead.estimatedValue.toLocaleString('en-IN')}</div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-1">
                <span className="text-[10px] text-slate-400 font-medium">
                  Created {new Date(lead.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
                
                <div className="flex gap-2">
                  {['CUSTOMER_DETAILS_CREATED', 'FOLLOWUP_IN_PROGRESS'].includes(lead.status) && (
                    <button
                      onClick={() => startCall(lead)}
                      className="flex items-center gap-1 py-1.5 px-3 rounded-lg bg-amber-500/10 text-amber-700 border border-amber-500/20 text-xs font-semibold hover:bg-amber-500/20 transition-all cursor-pointer"
                    >
                      <Phone size={13} /> Call
                    </button>
                  )}
                  {lead.status === 'CUSTOMER_DETAILS_CREATED' && (
                    <button
                      onClick={() => onUpdateStatus(lead.id, 'SENT_TO_RM', 'Sent to RM for verification')}
                      className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 text-xs font-semibold hover:bg-emerald-500/20 transition-all cursor-pointer"
                    >
                      <Send size={13} /> Send to RM
                    </button>
                  )}
                  <button
                    onClick={() => onEdit(lead)}
                    className="flex items-center gap-1 py-1.5 px-3 rounded-lg bg-slate-50 text-slate-555 border border-slate-200 text-xs font-semibold hover:bg-slate-100 transition-all cursor-pointer"
                  >
                    <Edit3 size={13} /> Edit
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`Are you sure you want to delete lead ${lead.leadNumber} (${lead.customerName})?`)) {
                        onDelete(lead.id);
                      }
                    }}
                    className="flex items-center gap-1 py-1.5 px-3 rounded-lg bg-rose-500/10 text-rose-600 border border-rose-200 text-xs font-semibold hover:bg-rose-500/20 transition-all cursor-pointer"
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-8 text-center text-slate-400 text-xs uppercase tracking-wider bg-slate-50 rounded-2xl border border-slate-200">
            No leads found.
          </div>
        )}
      </div>

      {/* Call simulation Modal */}
      {callingLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#200206]/85 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl text-center animate-scaleUp text-slate-800">
            
            {/* Pulsing ring indicator */}
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-500/10 text-amber-600 mb-6 border border-amber-500/20 relative">
              <span className="absolute inset-0 rounded-full border border-amber-500/30 animate-ping opacity-60" />
              <PhoneCall size={32} />
            </div>

            <h3 className="text-xl font-bold text-slate-900 mb-1 font-sans">Simulating Client Call</h3>
            <p className="text-sm text-slate-500 font-bold mb-4">
              {callingLead.customerName}
            </p>

            <div className="font-mono text-lg font-bold text-slate-800 bg-slate-50 py-2.5 px-4 rounded-xl border border-slate-200 inline-block mb-6 shadow-inner">
              {formatDuration(callDuration)}
            </div>

            {/* Display caller details */}
            <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl text-left text-xs mb-6 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400 font-semibold uppercase">Mobile:</span>
                <span className="text-slate-800 font-bold">{callingLead.mobile}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-semibold uppercase">Pledged Bank:</span>
                <span className="text-slate-800 font-bold">{callingLead.bankName} ({callingLead.branchName})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-semibold uppercase">Gold Weight:</span>
                <span className="text-slate-800 font-bold">{callingLead.goldWeight}g</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-semibold uppercase">Est. Value:</span>
                <span className="text-[#c3902c] font-black">₹{callingLead.estimatedValue.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {!showCallOutcome ? (
              <button
                onClick={endCall}
                className="w-full py-3 bg-rose-600 hover:bg-rose-705 text-white font-bold rounded-xl transition-all shadow-md cursor-pointer"
              >
                Disconnect Call
              </button>
            ) : (
              <div className="space-y-4 animate-fadeIn">
                <h4 className="text-sm font-bold text-slate-900 text-left border-b border-slate-100 pb-2 mb-2 uppercase tracking-wide">
                  Record Call Outcome
                </h4>
                
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleCallOutcome('DETAILS_COLLECTED')}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 hover:bg-emerald-500/20 transition-all text-xs font-bold cursor-pointer"
                  >
                    <Check size={16} /> Interested
                  </button>
                  <button
                    onClick={() => handleCallOutcome('RM_REJECTED')}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 hover:bg-rose-500/20 transition-all text-xs font-bold cursor-pointer"
                  >
                    <X size={16} /> Not Interested
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-left space-y-3">
                  <span className="text-xs font-bold text-sky-700 uppercase tracking-wide flex items-center gap-1">
                    <CalendarClock size={13} /> Schedule Follow-up
                  </span>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1">DATE</label>
                    <input
                      type="date"
                      value={followupDate}
                      onChange={(e) => setFollowupDate(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2.5 text-xs text-slate-700 outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1">REMARKS</label>
                    <textarea
                      value={followupRemarks}
                      onChange={(e) => setFollowupRemarks(e.target.value)}
                      placeholder="e.g. Call at 5pm / check documents"
                      rows={2}
                      className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2.5 text-xs text-slate-700 outline-none focus:border-amber-500 resize-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCallOutcome('FOLLOWUP_IN_PROGRESS')}
                    className="w-full py-2 bg-sky-600 hover:bg-sky-750 text-white font-bold rounded-lg text-xs transition-all shadow-md cursor-pointer"
                  >
                    Set Follow-up
                  </button>
                </div>

                <button
                  onClick={() => setCallingLead(null)}
                  className="w-full py-2 border border-slate-200 hover:bg-slate-50 text-slate-550 hover:text-slate-800 font-bold text-xs rounded-xl transition-all cursor-pointer"
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
