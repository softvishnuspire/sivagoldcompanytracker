import React, { useState } from 'react';
import { 
  Phone, 
  CalendarClock, 
  CheckCircle2, 
  User, 
  PhoneCall, 
  ChevronRight,
  ClipboardList
} from 'lucide-react';
import { Lead, Followup } from '../types';

interface FollowupListProps {
  leads: Lead[];
  onCompleteFollowup: (leadId: string, followupId: string, remarks: string) => void;
  onSimulateCall: (lead: Lead) => void;
}

export default function FollowupList({ leads, onCompleteFollowup, onSimulateCall }: FollowupListProps) {
  const [activeTab, setActiveTab] = useState<'TODAY' | 'PENDING' | 'COMPLETED'>('TODAY');
  const [remarksInput, setRemarksInput] = useState<Record<string, string>>({});

  const todayStr = new Date().toISOString().split('T')[0];

  const allFollowups = leads.flatMap(lead => 
    (lead.followups || []).map(f => ({
      ...f,
      lead
    }))
  );

  const filteredFollowups = allFollowups.filter(item => {
    if (activeTab === 'TODAY') {
      return item.followupDate === todayStr && item.status === 'PENDING';
    } else if (activeTab === 'PENDING') {
      return item.followupDate < todayStr && item.status === 'PENDING';
    } else {
      return item.status === 'COMPLETED';
    }
  });

  const handleComplete = (leadId: string, followupId: string) => {
    const remarks = remarksInput[followupId] || 'Completed callback';
    onCompleteFollowup(leadId, followupId, remarks);
    setRemarksInput(prev => {
      const copy = { ...prev };
      delete copy[followupId];
      return copy;
    });
  };

  const getTabCount = (tab: 'TODAY' | 'PENDING' | 'COMPLETED') => {
    return allFollowups.filter(item => {
      if (tab === 'TODAY') {
        return item.followupDate === todayStr && item.status === 'PENDING';
      } else if (tab === 'PENDING') {
        return item.followupDate < todayStr && item.status === 'PENDING';
      } else {
        return item.status === 'COMPLETED';
      }
    }).length;
  };

  return (
    <div className="space-y-6">
      {/* Tab controls */}
      <div className="flex bg-white border border-slate-200 p-1.5 rounded-2xl max-w-lg shadow-sm">
        {[
          { key: 'TODAY' as const, label: "Today's Calls" },
          { key: 'PENDING' as const, label: 'Pending Calls' },
          { key: 'COMPLETED' as const, label: 'Completed' }
        ].map(tab => {
          const count = getTabCount(tab.key);
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer ${
                isActive
                  ? 'bg-[#c3902c] text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Follow-up list view */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-800">
        {filteredFollowups.length > 0 ? (
          filteredFollowups.map(item => (
            <div 
              key={item.id}
              className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex flex-col justify-between gap-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold text-slate-500">
                      {item.lead.leadNumber}
                    </span>
                    <span className="text-[10px] bg-slate-50 border border-slate-200 py-0.5 px-2 rounded text-slate-500 font-medium flex items-center gap-1">
                      <CalendarClock size={10} /> {item.followupDate}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-805 mt-2 flex items-center gap-1.5">
                    <User size={15} className="text-slate-400" /> {item.lead.customerName}
                  </h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                    <Phone size={12} className="text-slate-400" /> {item.lead.mobile}
                  </p>
                </div>

                {item.status === 'PENDING' ? (
                  <button
                    onClick={() => onSimulateCall(item.lead)}
                    className="p-2 rounded-xl bg-amber-500/10 text-amber-700 border border-amber-500/20 hover:bg-amber-500/20 transition-all cursor-pointer"
                    title="Start simulated call"
                  >
                    <PhoneCall size={16} />
                  </button>
                ) : (
                  <span className="text-[10px] bg-emerald-50 border border-emerald-500/20 text-emerald-705 font-bold px-2.5 py-1 rounded-lg flex items-center gap-1">
                    <CheckCircle2 size={11} /> Call Completed
                  </span>
                )}
              </div>

              {/* Remarks/History section */}
              <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl space-y-2 text-xs">
                <div className="text-slate-500 font-semibold uppercase tracking-wide flex items-center gap-1">
                  <ClipboardList size={11} /> Scheduled Remarks
                </div>
                <p className="text-slate-700 italic">"{item.remarks}"</p>
              </div>

              {/* Log call completion controls */}
              {item.status === 'PENDING' && (
                <div className="pt-3 border-t border-slate-100 mt-1 space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wide">
                      Resolution Log / Remarks
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Spoke to client. Document verified."
                      value={remarksInput[item.id] || ''}
                      onChange={(e) => setRemarksInput(prev => ({ ...prev, [item.id]: e.target.value }))}
                      className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-xs text-slate-800 outline-none focus:border-amber-500 placeholder-slate-400"
                    />
                  </div>

                  <button
                    onClick={() => handleComplete(item.lead.id, item.id)}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-750 text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer shadow-sm"
                  >
                    <CheckCircle2 size={13} /> Log Complete & Update Status
                  </button>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs uppercase tracking-wider bg-slate-50 rounded-2xl border border-slate-200 flex flex-col items-center justify-center gap-2">
            <CalendarClock size={24} className="text-slate-400/40" />
            No follow-up calls found.
          </div>
        )}
      </div>
    </div>
  );
}
