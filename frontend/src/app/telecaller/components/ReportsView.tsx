import React from 'react';
import { BarChart3, TrendingUp, Map, Award, ShieldAlert } from 'lucide-react';
import { Lead } from '../types';

interface ReportsViewProps {
  leads: Lead[];
}

export default function ReportsView({ leads }: ReportsViewProps) {
  // 1. Group leads by last 7 days
  const getDailyStats = () => {
    const stats: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      stats[dateStr] = 0;
    }

    leads.forEach(lead => {
      const dateStr = new Date(lead.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      if (stats[dateStr] !== undefined) {
        stats[dateStr]++;
      }
    });

    return Object.entries(stats).map(([date, count]) => ({ label: date, value: count }));
  };

  // 2. Group leads by month
  const getMonthlyStats = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const stats: Record<string, number> = {};
    
    const d = new Date();
    const currMonth = months[d.getMonth()];
    const prevMonth = months[(d.getMonth() - 1 + 12) % 12];
    stats[prevMonth] = 0;
    stats[currMonth] = 0;

    leads.forEach(lead => {
      const m = months[new Date(lead.createdAt).getMonth()];
      if (stats[m] !== undefined) {
        stats[m]++;
      }
    });

    return Object.entries(stats).map(([month, count]) => ({ label: month, value: count }));
  };

  // 3. District distribution
  const getDistrictStats = () => {
    const stats: Record<string, number> = {};
    leads.forEach(lead => {
      stats[lead.district] = (stats[lead.district] || 0) + 1;
    });
    return Object.entries(stats).sort((a, b) => b[1] - a[1]);
  };

  // 4. Status distribution
  const getStatusStats = () => {
    const stats: Record<string, number> = {};
    leads.forEach(lead => {
      stats[lead.status] = (stats[lead.status] || 0) + 1;
    });
    return Object.entries(stats).sort((a, b) => b[1] - a[1]);
  };

  const dailyData = getDailyStats();
  const monthlyData = getMonthlyStats();
  const districtData = getDistrictStats();
  const statusData = getStatusStats();

  const maxDailyValue = Math.max(...dailyData.map(d => d.value), 1);
  const maxMonthlyValue = Math.max(...monthlyData.map(d => d.value), 1);

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-brand-mahogany/40 border border-brand-copper/30 rounded-2xl p-5 backdrop-blur-md flex items-center gap-4">
          <div className="p-3 bg-brand-copper/20 text-brand-silver rounded-xl border border-brand-copper/35">
            <TrendingUp size={22} />
          </div>
          <div>
            <div className="text-xs text-brand-slate font-semibold uppercase tracking-wider">Total Output</div>
            <div className="text-2xl font-bold text-brand-silver mt-0.5">{leads.length} Leads</div>
            <div className="text-[10px] text-emerald-400 mt-1 font-medium">All database files synchronized</div>
          </div>
        </div>

        <div className="bg-brand-mahogany/40 border border-brand-copper/30 rounded-2xl p-5 backdrop-blur-md flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <Award size={22} />
          </div>
          <div>
            <div className="text-xs text-brand-slate font-semibold uppercase tracking-wider">Conversion Ratio</div>
            <div className="text-2xl font-bold text-brand-silver mt-0.5">
              {leads.length > 0 
                ? Math.round((leads.filter(l => ['QUALIFIED', 'RM VERIFICATION', 'APPROVED', 'COMPLETED'].includes(l.status)).length / leads.length) * 100) 
                : 0}%
            </div>
            <div className="text-[10px] text-brand-slate mt-1 font-medium">Qualified Leads / Total Leads</div>
          </div>
        </div>

        <div className="bg-brand-mahogany/40 border border-brand-copper/30 rounded-2xl p-5 backdrop-blur-md flex items-center gap-4">
          <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20">
            <ShieldAlert size={22} />
          </div>
          <div>
            <div className="text-xs text-brand-slate font-semibold uppercase tracking-wider">Rejection Ratio</div>
            <div className="text-2xl font-bold text-brand-silver mt-0.5">
              {leads.length > 0 
                ? Math.round((leads.filter(l => l.status === 'REJECTED').length / leads.length) * 100) 
                : 0}%
            </div>
            <div className="text-[10px] text-brand-slate mt-1 font-medium">Rejected Leads / Total Leads</div>
          </div>
        </div>
      </div>

      {/* Daily & Monthly Chart Visualizer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Leads Bar Chart */}
        <div className="bg-brand-mahogany/40 border border-brand-copper/30 rounded-2xl p-5 backdrop-blur-md">
          <h3 className="text-sm font-bold text-brand-silver uppercase tracking-wider mb-6 flex items-center gap-2">
            <BarChart3 size={16} className="text-brand-copper" /> Daily Lead Count (Last 7 Days)
          </h3>

          <div className="h-64 flex items-end justify-between gap-3 pt-4 border-b border-brand-copper/15 px-2">
            {dailyData.map((d, i) => {
              const heightPercent = (d.value / maxDailyValue) * 80;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer">
                  {/* Tooltip */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-brand-cherry border border-brand-copper/30 py-1 px-2.5 rounded-lg text-[10px] font-bold text-brand-silver -mt-8 absolute shadow-lg pointer-events-none">
                    {d.value} Leads
                  </div>
                  {/* Bar */}
                  <div 
                    style={{ height: `${Math.max(heightPercent, 5)}%` }}
                    className="w-full bg-gradient-to-t from-brand-copper to-brand-copper/30 border-t border-x border-brand-copper/20 rounded-t-lg group-hover:from-brand-copper group-hover:to-brand-copper/90 transition-all duration-300 shadow-[0_0_12px_rgba(101,72,59,0.1)]"
                  />
                  {/* Label */}
                  <span className="text-[10px] text-brand-slate font-semibold mt-1.5 transform group-hover:text-brand-silver transition-colors">
                    {d.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Monthly Leads Bar Chart */}
        <div className="bg-brand-mahogany/40 border border-brand-copper/30 rounded-2xl p-5 backdrop-blur-md">
          <h3 className="text-sm font-bold text-brand-silver uppercase tracking-wider mb-6 flex items-center gap-2">
            <BarChart3 size={16} className="text-brand-copper" /> Monthly Lead Count
          </h3>

          <div className="h-64 flex items-end justify-around gap-6 pt-4 border-b border-brand-copper/15 px-4">
            {monthlyData.map((d, i) => {
              const heightPercent = (d.value / maxMonthlyValue) * 80;
              return (
                <div key={i} className="w-16 flex flex-col items-center gap-2 group cursor-pointer">
                  {/* Tooltip */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-brand-cherry border border-brand-copper/30 py-1 px-2.5 rounded-lg text-[10px] font-bold text-brand-silver -mt-8 absolute shadow-lg pointer-events-none">
                    {d.value} Leads
                  </div>
                  {/* Bar */}
                  <div 
                    style={{ height: `${Math.max(heightPercent, 5)}%` }}
                    className="w-full bg-gradient-to-t from-brand-copper/80 to-brand-copper/20 border-t border-x border-brand-copper/20 rounded-t-lg group-hover:from-brand-copper group-hover:to-brand-copper/90 transition-all duration-300 shadow-[0_0_12px_rgba(101,72,59,0.1)]"
                  />
                  {/* Label */}
                  <span className="text-[10px] text-brand-slate font-semibold mt-1.5 transform group-hover:text-brand-silver transition-colors">
                    {d.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* District & Status Tables/Progress Bars */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* District Distribution */}
        <div className="bg-brand-mahogany/40 border border-brand-copper/30 rounded-2xl p-5 backdrop-blur-md">
          <h3 className="text-sm font-bold text-brand-silver uppercase tracking-wider mb-4 flex items-center gap-2">
            <Map size={16} className="text-brand-copper" /> District Wise Performance
          </h3>
          <div className="space-y-4">
            {districtData.map(([district, count], index) => {
              const maxVal = Math.max(...districtData.map(d => d[1]), 1);
              const percentage = (count / maxVal) * 100;
              return (
                <div key={index} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-brand-silver">
                    <span>{district}</span>
                    <span className="text-brand-silver">{count} Leads</span>
                  </div>
                  <div className="w-full h-2 bg-brand-cherry/40 rounded-full overflow-hidden border border-brand-copper/15">
                    <div 
                      style={{ width: `${percentage}%` }}
                      className="h-full bg-brand-copper rounded-full"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Lead Stage / Status Funnel */}
        <div className="bg-brand-mahogany/40 border border-brand-copper/30 rounded-2xl p-5 backdrop-blur-md">
          <h3 className="text-sm font-bold text-brand-silver uppercase tracking-wider mb-4 flex items-center gap-2">
            <Award size={16} className="text-brand-copper" /> Lead Stage Funnel
          </h3>
          <div className="space-y-4">
            {statusData.map(([status, count], index) => {
              const maxVal = Math.max(...statusData.map(d => d[1]), 1);
              const percentage = (count / maxVal) * 100;
              return (
                <div key={index} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-brand-silver">
                    <span className="uppercase text-[10px] tracking-wide font-mono text-brand-slate">{status}</span>
                    <span className="text-brand-silver">{count} Leads</span>
                  </div>
                  <div className="w-full h-2 bg-brand-cherry/40 rounded-full overflow-hidden border border-brand-copper/15">
                    <div 
                      style={{ width: `${percentage}%` }}
                      className="h-full bg-brand-copper/70 rounded-full"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
