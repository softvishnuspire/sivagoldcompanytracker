import React from 'react';
import { 
  Sparkles, 
  CalendarClock, 
  CheckCircle2, 
  XCircle, 
  FileSymlink 
} from 'lucide-react';
import { DashboardStats } from '../types';

interface StatsOverviewProps {
  stats: DashboardStats;
  onSelectTab: (tab: 'dashboard' | 'add-lead' | 'leads-list' | 'follow-ups' | 'reports') => void;
}

export default function StatsOverview({ stats, onSelectTab }: StatsOverviewProps) {
  const statItems = [
    {
      title: 'New Leads',
      value: stats.newLeads,
      icon: Sparkles,
      color: 'border-amber-200 text-amber-600 bg-amber-50/60',
      actionTab: 'leads-list' as const,
      description: 'Awaiting first contact'
    },
    {
      title: 'Pending Follow-ups',
      value: stats.pendingFollowups,
      icon: CalendarClock,
      color: 'border-sky-200 text-sky-600 bg-sky-50/60',
      actionTab: 'follow-ups' as const,
      description: 'Scheduled callbacks'
    },
    {
      title: 'Qualified Leads',
      value: stats.qualifiedLeads,
      icon: CheckCircle2,
      color: 'border-emerald-200 text-emerald-600 bg-emerald-50/60',
      actionTab: 'leads-list' as const,
      description: 'Interested & verified'
    },
    {
      title: 'Rejected Leads',
      value: stats.rejectedLeads,
      icon: XCircle,
      color: 'border-rose-200 text-rose-600 bg-rose-50/60',
      actionTab: 'leads-list' as const,
      description: 'Not interested / closed'
    },
    {
      title: 'Sent to RM',
      value: stats.sentToRM,
      icon: FileSymlink,
      color: 'border-purple-200 text-purple-600 bg-purple-50/60',
      actionTab: 'leads-list' as const,
      description: 'In verification pipeline'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {statItems.map((item, idx) => {
        const Icon = item.icon;
        return (
          <button
            key={idx}
            onClick={() => onSelectTab(item.actionTab)}
            className={`flex flex-col items-start p-5 rounded-2xl border bg-white shadow-sm transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-md text-left cursor-pointer ${item.color}`}
          >
            <div className="flex items-center justify-between w-full mb-4">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{item.title}</span>
              <div className="p-2 rounded-xl bg-white/80 border border-slate-200/40">
                <Icon size={18} />
              </div>
            </div>
            <div className="text-3xl font-extrabold tracking-tight text-slate-800 mb-1">
              {String(item.value).padStart(2, '0')}
            </div>
            <p className="text-[10px] text-slate-400 font-bold group-hover:text-amber-500 transition-colors">{item.description}</p>
          </button>
        );
      })}
    </div>
  );
}
