'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiRequest } from '../../lib/api';

interface DashboardData {
  assignedLeads: number;
  todayVisits: number;
  inProgressCases: number;
  completedCases: number;
  goldCollected: number;
  amountHandled: number;
}

export default function ExecutiveDashboard() {
  const [stats, setStats] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadDashboard() {
      try {
        const data = await apiRequest('/executive/dashboard');
        setStats(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load dashboard metrics');
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-10 h-10 rounded-full border-4 border-amber-500/25 border-t-amber-500 animate-spin"></div>
        <p className="text-amber-550/70 text-xs font-mono tracking-wider uppercase">Loading Statistics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-red-500/5 border border-red-500/15 max-w-xl mx-auto mt-10">
        <h2 className="text-red-600 font-bold text-lg mb-2">Error Loading Dashboard</h2>
        <p className="text-slate-650 text-sm leading-relaxed mb-4">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-[#c3902c] rounded-lg text-xs font-bold border border-amber-500/25 transition-all"
        >
          RETRY
        </button>
      </div>
    );
  }

  const statCards = [
    { label: 'Assigned Leads', value: stats?.assignedLeads || 0, icon: '📋', color: 'border-blue-200 text-blue-600 bg-blue-50/60' },
    { label: "Today's Visits", value: stats?.todayVisits || 0, icon: '🚗', color: 'border-amber-250 text-amber-600 bg-amber-50/60' },
    { label: 'In Progress Cases', value: stats?.inProgressCases || 0, icon: '⏳', color: 'border-orange-200 text-orange-600 bg-orange-50/60' },
    { label: 'Completed Cases', value: stats?.completedCases || 0, icon: '✅', color: 'border-emerald-250 text-emerald-605 bg-emerald-50/60' },
    { label: 'Gold Collected (g)', value: stats?.goldCollected ? Number(stats.goldCollected).toFixed(2) : '0.00', icon: '🏆', color: 'border-yellow-200 text-yellow-600 bg-yellow-50/60' },
    { label: 'Amount Handled', value: stats?.amountHandled ? `₹${Number(stats.amountHandled).toLocaleString('en-IN')}` : '₹0', icon: '💰', color: 'border-teal-200 text-teal-600 bg-teal-50/60' },
  ];

  return (
    <div className="space-y-8 animate-fadeIn text-slate-800">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Executive Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Real-time status tracking, gold values, and branch operations metrics.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((card, idx) => (
          <div 
            key={idx} 
            className={`border rounded-2xl p-6 flex items-center justify-between shadow-sm relative overflow-hidden bg-white transition-all duration-300 hover:scale-[1.02] hover:shadow-md ${card.color.split(' ')[0]}`}
          >
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">{card.label}</span>
              <p className={`text-3xl font-black ${card.color.split(' ')[1]}`}>{card.value}</p>
            </div>
            <div className="text-4xl filter drop-shadow-sm opacity-90">{card.icon}</div>
          </div>
        ))}
      </div>

      {/* Main Sections Link cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        
        {/* Left Card: Tasks */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-4 shadow-sm">
          <h3 className="font-bold text-lg text-[#c3902c] flex items-center gap-2">
            <span>🚀</span> Operations Center
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Manage your daily pipeline of gold pledge releases. View detailed customer info, navigate to vendor locations, document meetings, verify weights, record payments, and track completion steps.
          </p>
          <div className="pt-2">
            <Link 
              href="/executive/assigned"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:brightness-110 active:scale-[0.98] text-white px-5 py-2.5 rounded-xl font-bold text-xs tracking-wider transition-all shadow-md"
            >
              VIEW ASSIGNED LEADS
            </Link>
          </div>
        </div>

        {/* Right Card: Performance */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-4 shadow-sm">
          <h3 className="font-bold text-lg text-[#c3902c] flex items-center gap-2">
            <span>📈</span> Target Report
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Review case completion rates, calculate total gold collections (grams), analyze total cash handled, and filter operational metrics across daily, weekly, or monthly periods.
          </p>
          <div className="pt-2">
            <Link 
              href="/executive/reports"
              className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/25 hover:bg-amber-500/20 text-[#c3902c] px-5 py-2.5 rounded-xl font-bold text-xs tracking-wider transition-all"
            >
              GENERATE REPORTS
            </Link>
          </div>
        </div>

      </div>

      {/* Bottom section: Quick Actions */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
        <h4 className="text-xs font-bold text-slate-400 tracking-wider uppercase mb-4">Quick Navigation Actions</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[
            { emoji: '📞', label: 'Call Customer' },
            { emoji: '🚗', label: 'Start Journey' },
            { emoji: '📍', label: 'Reached Customer' },
            { emoji: '🏦', label: 'Bank Visit' },
            { emoji: '💵', label: 'Payment Done' },
            { emoji: '🏆', label: 'Gold Received' },
            { emoji: '📷', label: 'Upload Images' },
            { emoji: '🏁', label: 'Complete Case' },
          ].map((act, idx) => (
            <Link 
              key={idx}
              href="/executive/assigned" 
              className="p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-amber-500/40 hover:bg-amber-500/5 transition-all text-center flex flex-col items-center justify-center gap-1 shadow-sm group"
            >
              <span className="block text-2xl mb-1 group-hover:scale-110 transition-transform">{act.emoji}</span>
              <span className="text-xs text-slate-650 font-semibold">{act.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
