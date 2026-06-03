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
      <div className="flex bg-brand-mahogany/40 border border-brand-copper/30 p-1.5 rounded-2xl max-w-lg backdrop-blur-md">
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
                  ? 'bg-brand-copper text-brand-silver shadow-md'
                  : 'text-brand-slate hover:text-brand-silver'
              }`}
            >
              {tab.label}
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                isActive ? 'bg-brand-cherry/80 text-brand-silver' : 'bg-brand-cherry/40 text-brand-slate'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Follow-up list view */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredFollowups.length > 0 ? (
          filteredFollowups.map(item => (
            <div 
              key={item.id}
              className="bg-brand-mahogany/40 border border-brand-copper/30 rounded-2xl p-5 backdrop-blur-md flex flex-col justify-between gap-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold text-brand-slate">
                      {item.lead.leadNumber}
                    </span>
                    <span className="text-[10px] bg-brand-mahogany border border-brand-copper/20 py-0.5 px-2 rounded text-brand-slate font-medium flex items-center gap-1">
                      <CalendarClock size={10} /> {item.followupDate}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-brand-silver mt-2 flex items-center gap-1.5">
                    <User size={15} className="text-brand-slate" /> {item.lead.customerName}
                  </h3>
                  <p className="text-xs text-brand-slate flex items-center gap-1 mt-1">
                    <Phone size={12} className="text-brand-slate" /> {item.lead.mobile}
                  </p>
                </div>

                {item.status === 'PENDING' ? (
                  <button
                    onClick={() => onSimulateCall(item.lead)}
                    className="p-2 rounded-xl bg-brand-copper/20 text-brand-silver border border-brand-copper/35 hover:bg-brand-copper/40 transition-all cursor-pointer"
                    title="Start simulated call"
                  >
                    <PhoneCall size={16} />
                  </button>
                ) : (
                  <span className="text-[10px] bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 size={11} /> Call Completed
                  </span>
                )}
              </div>

              {/* Remarks/History section */}
              <div className="p-3 bg-brand-cherry/40 border border-brand-copper/20 rounded-xl space-y-2 text-xs">
                <div className="text-brand-slate font-semibold uppercase tracking-wide flex items-center gap-1">
                  <ClipboardList size={11} /> Scheduled Remarks
                </div>
                <p className="text-brand-silver italic">"{item.remarks}"</p>
              </div>

              {/* Log call completion controls */}
              {item.status === 'PENDING' && (
                <div className="pt-3 border-t border-brand-copper/20 mt-1 space-y-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-brand-slate mb-1 uppercase tracking-wide">
                      Resolution Log / Remarks
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Spoke to client. Document verified."
                      value={remarksInput[item.id] || ''}
                      onChange={(e) => setRemarksInput(prev => ({ ...prev, [item.id]: e.target.value }))}
                      className="w-full bg-brand-cherry/40 border border-brand-copper/20 rounded-lg py-1.5 px-3 text-xs text-brand-silver outline-none focus:border-brand-copper placeholder-brand-slate/40"
                    />
                  </div>

                  <button
                    onClick={() => handleComplete(item.lead.id, item.id)}
                    className="w-full py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <CheckCircle2 size={13} /> Log Complete & Update Status
                  </button>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="col-span-full py-12 text-center text-brand-slate text-xs uppercase tracking-wider bg-brand-mahogany/20 rounded-2xl border border-brand-copper/15 flex flex-col items-center justify-center gap-2">
            <CalendarClock size={24} className="text-brand-slate/40" />
            No follow-up calls found.
          </div>
        )}
      </div>
    </div>
  );
}
