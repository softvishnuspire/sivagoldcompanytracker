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
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 text-amber-700 rounded-xl border border-amber-500/25">
            <TrendingUp size={22} />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Output</div>
            <div className="text-2xl font-extrabold text-slate-850 mt-0.5">{leads.length} Leads</div>
            <div className="text-[10px] text-emerald-600 mt-1 font-bold">All database files synchronized</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-700 rounded-xl border border-emerald-500/25">
            <Award size={22} />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Conversion Ratio</div>
            <div className="text-2xl font-extrabold text-slate-850 mt-0.5">
              {leads.length > 0 
                ? Math.round((leads.filter(l => ['DETAILS_COLLECTED', 'SENT_TO_RM', 'RM_APPROVED', 'CASE_COMPLETED'].includes(l.status)).length / leads.length) * 100) 
                : 0}%
            </div>
            <div className="text-[10px] text-slate-400 mt-1 font-bold">Qualified Leads / Total Leads</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-rose-500/10 text-rose-750 rounded-xl border border-rose-500/25">
            <ShieldAlert size={22} />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Rejection Ratio</div>
            <div className="text-2xl font-extrabold text-slate-850 mt-0.5">
              {leads.length > 0 
                ? Math.round((leads.filter(l => l.status === 'RM_REJECTED').length / leads.length) * 100) 
                : 0}%
            </div>
            <div className="text-[10px] text-slate-400 mt-1 font-bold">Rejected Leads / Total Leads</div>
          </div>
        </div>
      </div>

      {/* Daily & Monthly Chart Visualizer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Leads Bar Chart */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm text-slate-800">
          <h3 className="text-sm font-bold text-slate-850 uppercase tracking-wider mb-6 flex items-center gap-2">
            <BarChart3 size={16} className="text-amber-500" /> Daily Lead Count (Last 7 Days)
          </h3>

          <div className="h-64 flex items-end justify-between gap-3 pt-4 border-b border-slate-100 px-2 relative">
            {dailyData.map((d, i) => {
              const heightPercent = (d.value / maxDailyValue) * 80;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer relative">
                  {/* Tooltip */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-slate-800 border border-slate-700 py-1 px-2.5 rounded-lg text-[10px] font-bold text-white -mt-8 absolute shadow-lg pointer-events-none z-10">
                    {d.value} Leads
                  </div>
                  {/* Bar */}
                  <div 
                    style={{ height: `${Math.max(heightPercent, 5)}%` }}
                    className="w-full bg-gradient-to-t from-[#c3902c] to-amber-400 border-t border-x border-amber-500/25 rounded-t-lg group-hover:from-amber-600 group-hover:to-amber-550 transition-all duration-300 shadow-sm"
                  />
                  {/* Label */}
                  <span className="text-[10px] text-slate-400 font-bold mt-1.5 transform group-hover:text-slate-800 transition-colors">
                    {d.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Monthly Leads Bar Chart */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm text-slate-800">
          <h3 className="text-sm font-bold text-slate-850 uppercase tracking-wider mb-6 flex items-center gap-2">
            <BarChart3 size={16} className="text-amber-500" /> Monthly Lead Count
          </h3>

          <div className="h-64 flex items-end justify-around gap-6 pt-4 border-b border-slate-100 px-4 relative">
            {monthlyData.map((d, i) => {
              const heightPercent = (d.value / maxMonthlyValue) * 80;
              return (
                <div key={i} className="w-16 flex flex-col items-center gap-2 group cursor-pointer relative">
                  {/* Tooltip */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-slate-800 border border-slate-700 py-1 px-2.5 rounded-lg text-[10px] font-bold text-white -mt-8 absolute shadow-lg pointer-events-none z-10">
                    {d.value} Leads
                  </div>
                  {/* Bar */}
                  <div 
                    style={{ height: `${Math.max(heightPercent, 5)}%` }}
                    className="w-full bg-gradient-to-t from-[#c3902c] to-amber-400 border-t border-x border-amber-500/25 rounded-t-lg group-hover:from-amber-600 group-hover:to-amber-550 transition-all duration-300 shadow-sm"
                  />
                  {/* Label */}
                  <span className="text-[10px] text-slate-400 font-bold mt-1.5 transform group-hover:text-slate-800 transition-colors">
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
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm text-slate-800">
          <h3 className="text-sm font-bold text-slate-855 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Map size={16} className="text-amber-500" /> District Wise Performance
          </h3>
          <div className="space-y-4">
            {districtData.map(([district, count], index) => {
              const maxVal = Math.max(...districtData.map(d => d[1]), 1);
              const percentage = (count / maxVal) * 100;
              return (
                <div key={index} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold text-slate-700">
                    <span>{district}</span>
                    <span className="text-[#c3902c]">{count} Leads</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                    <div 
                      style={{ width: `${percentage}%` }}
                      className="h-full bg-[#c3902c] rounded-full"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Lead Stage / Status Funnel */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm text-slate-800">
          <h3 className="text-sm font-bold text-slate-855 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Award size={16} className="text-amber-500" /> Lead Stage Funnel
          </h3>
          <div className="space-y-4">
            {statusData.map(([status, count], index) => {
              const maxVal = Math.max(...statusData.map(d => d[1]), 1);
              const percentage = (count / maxVal) * 100;
              return (
                <div key={index} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold text-slate-750">
                    <span className="uppercase text-[10px] tracking-wide font-mono text-slate-450">{status}</span>
                    <span className="text-[#c3902c]">{count} Leads</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                    <div 
                      style={{ width: `${percentage}%` }}
                      className="h-full bg-[#c3902c]/75 rounded-full"
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
