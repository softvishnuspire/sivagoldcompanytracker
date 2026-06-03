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
      color: 'from-amber-500/10 to-yellow-500/5 text-amber-400 border-amber-500/20 hover:border-amber-500/40',
      actionTab: 'leads-list' as const,
      description: 'Awaiting first contact'
    },
    {
      title: 'Pending Follow-ups',
      value: stats.pendingFollowups,
      icon: CalendarClock,
      color: 'from-sky-500/10 to-blue-500/5 text-sky-400 border-sky-500/20 hover:border-sky-500/40',
      actionTab: 'follow-ups' as const,
      description: 'Scheduled callbacks'
    },
    {
      title: 'Qualified Leads',
      value: stats.qualifiedLeads,
      icon: CheckCircle2,
      color: 'from-emerald-500/10 to-teal-500/5 text-emerald-400 border-emerald-500/20 hover:border-emerald-500/40',
      actionTab: 'leads-list' as const,
      description: 'Interested & verified'
    },
    {
      title: 'Rejected Leads',
      value: stats.rejectedLeads,
      icon: XCircle,
      color: 'from-rose-500/10 to-red-500/5 text-rose-400 border-rose-500/20 hover:border-rose-500/40',
      actionTab: 'leads-list' as const,
      description: 'Not interested / closed'
    },
    {
      title: 'Sent to RM',
      value: stats.sentToRM,
      icon: FileSymlink,
      color: 'from-purple-500/10 to-indigo-500/5 text-purple-400 border-purple-500/20 hover:border-purple-500/40',
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
            className={`flex flex-col items-start p-5 rounded-2xl border bg-brand-mahogany/40 backdrop-blur-md shadow-lg transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl text-left cursor-pointer ${item.color}`}
          >
            <div className="flex items-center justify-between w-full mb-4">
              <span className="text-sm font-medium text-brand-slate">{item.title}</span>
              <div className="p-2 rounded-xl bg-brand-cherry/60 border border-brand-copper/30">
                <Icon size={20} />
              </div>
            </div>
            <div className="text-3xl font-extrabold tracking-tight text-brand-silver mb-1">
              {item.value}
            </div>
            <p className="text-xs text-brand-slate/60 leading-normal">{item.description}</p>
          </button>
        );
      })}
    </div>
  );
}
