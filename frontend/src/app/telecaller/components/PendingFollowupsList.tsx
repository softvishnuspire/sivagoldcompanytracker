import React, { useState } from 'react';
import { 
  Search, 
  MapPin, 
  Phone, 
  Clock, 
  AlertTriangle,
  ArrowRightCircle,
  FileEdit,
  ClipboardList,
  Trash2
} from 'lucide-react';
import { Lead } from '../types';

interface PendingFollowupsListProps {
  leads: Lead[];
  onEdit: (lead: Lead) => void;
  onDelete: (leadId: string) => void;
}

export default function PendingFollowupsList({ leads, onEdit, onDelete }: PendingFollowupsListProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // Filter leads that are in 'FOLLOWUP_IN_PROGRESS' status AND are missing critical details
  const pendingLeads = leads.filter(lead => {
    const isFollowup = lead.status === 'FOLLOWUP_IN_PROGRESS';
    const isMissingDetails = 
      lead.goldWeight === 0 || 
      !lead.bankName || 
      lead.loanAmount === 0 ||
      !lead.documents || 
      lead.documents.length === 0;
      
    if (!isFollowup || !isMissingDetails) return false;

    const matchesSearch = 
      (lead.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.mobile || '').includes(searchTerm) ||
      (lead.leadNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.district || '').toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm text-slate-800">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search pending follow-ups by name, phone, district..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-10 text-sm text-slate-800 outline-none focus:border-amber-450 focus:ring-1 focus:ring-amber-500/10 placeholder-slate-400"
          />
        </div>
        <div className="text-xs text-slate-600 font-bold uppercase tracking-wider bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-sm">
          <Clock size={14} className="text-amber-600" />
          Pending Completion: {pendingLeads.length}
        </div>
      </div>

      {/* Grid of Incomplete Leads */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {pendingLeads.length > 0 ? (
          pendingLeads.map((lead) => {
            const isMissingGold = lead.goldWeight === 0;
            const isMissingBank = !lead.bankName || lead.loanAmount === 0;
            const isMissingDocs = !lead.documents || lead.documents.length === 0;

            return (
              <div 
                key={lead.id}
                className="bg-white border border-slate-200/80 hover:border-slate-350 hover:shadow-md transition-all duration-300 rounded-2xl p-5 flex flex-col justify-between gap-4 text-slate-800"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold text-slate-650 bg-slate-100 border border-slate-200 py-0.5 px-2 rounded-md">
                      {lead.leadNumber}
                    </span>
                    <span className="text-[10px] bg-rose-50 text-rose-700 border border-rose-200 py-0.5 px-2 rounded font-bold uppercase tracking-wider flex items-center gap-1">
                      <AlertTriangle size={10} /> Incomplete
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-800 mt-3 font-sans">
                    {lead.customerName}
                  </h3>

                  <div className="space-y-1.5 mt-2 text-slate-500">
                    <p className="text-xs flex items-center gap-1.5">
                      <Phone size={12} className="text-slate-400" /> {lead.mobile}
                    </p>
                    <p className="text-xs flex items-center gap-1.5">
                      <MapPin size={12} className="text-slate-400" /> {lead.address}, {lead.district}
                    </p>
                  </div>

                  {/* Warning Alerts Section */}
                  <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                      Missing Information
                    </span>
                    {isMissingGold && (
                      <div className="text-[11px] text-amber-800 flex items-center gap-1 bg-amber-500/10 py-1 px-2.5 rounded-lg border border-amber-500/15">
                        <AlertTriangle size={11} /> Missing Gold Details
                      </div>
                    )}
                    {isMissingBank && (
                      <div className="text-[11px] text-amber-800 flex items-center gap-1 bg-amber-500/10 py-1 px-2.5 rounded-lg border border-amber-500/15">
                        <AlertTriangle size={11} /> Missing Bank / Pledge Details
                      </div>
                    )}
                    {isMissingDocs && (
                      <div className="text-[11px] text-amber-800 flex items-center gap-1 bg-amber-500/10 py-1 px-2.5 rounded-lg border border-amber-500/15">
                        <AlertTriangle size={11} /> Missing Loan Slip / KYC Docs
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2.5 mt-2">
                  <button
                    onClick={() => onEdit(lead)}
                    className="flex-1 py-2.5 bg-[#c3902c] hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <FileEdit size={14} />
                    Complete Details
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Are you sure you want to delete lead ${lead.leadNumber} (${lead.customerName})?`)) {
                        onDelete(lead.id);
                      }
                    }}
                    className="py-2.5 px-3.5 bg-slate-50 hover:bg-rose-500/10 text-rose-600 hover:text-rose-700 border border-slate-200 hover:border-rose-300 rounded-xl transition-all cursor-pointer flex items-center justify-center"
                    title="Delete Lead"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-16 text-center text-slate-400 text-xs uppercase tracking-widest bg-slate-55 rounded-2xl border border-slate-200 flex flex-col items-center justify-center gap-2.5 shadow-sm">
            <ClipboardList size={30} className="text-slate-400/40" />
            No pending follow-ups with incomplete details found.
          </div>
        )}
      </div>
    </div>
  );
}
