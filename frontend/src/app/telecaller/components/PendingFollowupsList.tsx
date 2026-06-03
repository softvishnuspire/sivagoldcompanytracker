import React, { useState } from 'react';
import { 
  Search, 
  MapPin, 
  Phone, 
  Clock, 
  AlertTriangle,
  ArrowRightCircle,
  FileEdit,
  ClipboardList
} from 'lucide-react';
import { Lead } from '../types';

interface PendingFollowupsListProps {
  leads: Lead[];
  onEdit: (lead: Lead) => void;
}

export default function PendingFollowupsList({ leads, onEdit }: PendingFollowupsListProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // Filter leads that are in 'FOLLOW-UP' status AND are missing critical details
  const pendingLeads = leads.filter(lead => {
    const isFollowup = lead.status === 'FOLLOW-UP';
    const isMissingDetails = 
      lead.goldWeight === 0 || 
      !lead.bankName || 
      lead.loanAmount === 0 ||
      !lead.documents || 
      lead.documents.length === 0;
      
    if (!isFollowup || !isMissingDetails) return false;

    const matchesSearch = 
      lead.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.mobile.includes(searchTerm) ||
      lead.leadNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.district.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-brand-mahogany/40 border border-brand-copper/30 rounded-2xl backdrop-blur-md">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-slate" size={18} />
          <input
            type="text"
            placeholder="Search pending follow-ups by name, phone, district..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-brand-cherry/40 border border-brand-copper/20 rounded-xl py-2 px-10 text-sm text-brand-silver outline-none focus:border-brand-copper focus:ring-1 focus:ring-brand-copper/20 placeholder-brand-slate/40"
          />
        </div>
        <div className="text-xs text-brand-slate font-bold uppercase tracking-wider bg-brand-mahogany border border-brand-copper/20 px-3.5 py-2 rounded-xl flex items-center gap-1.5">
          <Clock size={14} className="text-brand-copper" />
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
                className="bg-brand-mahogany/40 border border-brand-copper/35 hover:border-brand-copper hover:shadow-[0_8px_24px_rgba(101,72,59,0.15)] transition-all duration-300 rounded-2xl p-5 backdrop-blur-md flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold text-brand-silver bg-brand-copper/20 border border-brand-copper/30 py-0.5 px-2 rounded-md">
                      {lead.leadNumber}
                    </span>
                    <span className="text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20 py-0.5 px-2 rounded font-bold uppercase tracking-wider flex items-center gap-1">
                      <AlertTriangle size={10} /> Incomplete
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-brand-silver mt-3 font-sans">
                    {lead.customerName}
                  </h3>

                  <div className="space-y-1.5 mt-2">
                    <p className="text-xs text-brand-slate flex items-center gap-1.5">
                      <Phone size={12} className="text-brand-slate/60" /> {lead.mobile}
                    </p>
                    <p className="text-xs text-brand-slate flex items-center gap-1.5">
                      <MapPin size={12} className="text-brand-slate/60" /> {lead.address}, {lead.district}
                    </p>
                  </div>

                  {/* Warning Alerts Section */}
                  <div className="mt-4 space-y-2 border-t border-brand-copper/10 pt-3">
                    <span className="text-[10px] text-brand-slate font-bold uppercase tracking-wider block mb-1">
                      Missing Information
                    </span>
                    {isMissingGold && (
                      <div className="text-[11px] text-amber-400/90 flex items-center gap-1 bg-amber-500/5 py-1 px-2.5 rounded-lg border border-amber-500/10">
                        <AlertTriangle size={11} /> Missing Gold Details
                      </div>
                    )}
                    {isMissingBank && (
                      <div className="text-[11px] text-amber-400/90 flex items-center gap-1 bg-amber-500/5 py-1 px-2.5 rounded-lg border border-amber-500/10">
                        <AlertTriangle size={11} /> Missing Bank / Pledge Details
                      </div>
                    )}
                    {isMissingDocs && (
                      <div className="text-[11px] text-amber-400/90 flex items-center gap-1 bg-amber-500/5 py-1 px-2.5 rounded-lg border border-amber-500/10">
                        <AlertTriangle size={11} /> Missing Loan Slip / KYC Docs
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => onEdit(lead)}
                  className="w-full py-2.5 bg-brand-copper hover:bg-brand-copper/85 text-brand-silver hover:text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                >
                  <FileEdit size={14} />
                  Complete Details
                  <ArrowRightCircle size={13} />
                </button>
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-16 text-center text-brand-slate text-xs uppercase tracking-widest bg-brand-mahogany/20 rounded-2xl border border-brand-copper/15 flex flex-col items-center justify-center gap-2.5">
            <ClipboardList size={30} className="text-brand-slate/40" />
            No pending follow-ups with incomplete details found.
          </div>
        )}
      </div>
    </div>
  );
}
