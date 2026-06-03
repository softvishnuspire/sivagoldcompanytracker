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
        <p className="text-amber-500/50 text-xs font-mono tracking-wider uppercase">Loading Statistics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-red-500/5 border border-red-500/15 max-w-xl mx-auto mt-10">
        <h2 className="text-red-400 font-bold font-mono text-lg mb-2">Error Loading Dashboard</h2>
        <p className="text-slate-300 text-sm leading-relaxed mb-4">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 rounded-lg text-xs font-mono border border-amber-500/25 transition-all"
        >
          RETRY
        </button>
      </div>
    );
  }

  const statCards = [
    { label: 'Assigned Leads', value: stats?.assignedLeads || 0, icon: '📋', color: 'from-blue-500/10 to-blue-500/5 border-blue-500/20 text-blue-400' },
    { label: "Today's Visits", value: stats?.todayVisits || 0, icon: '🚗', color: 'from-amber-500/10 to-amber-500/5 border-amber-500/20 text-amber-400' },
    { label: 'In Progress Cases', value: stats?.inProgressCases || 0, icon: '⏳', color: 'from-orange-500/10 to-orange-500/5 border-orange-500/20 text-orange-400' },
    { label: 'Completed Cases', value: stats?.completedCases || 0, icon: '✅', color: 'from-green-500/10 to-green-500/5 border-green-500/20 text-green-400' },
    { label: 'Gold Collected (grams)', value: stats?.goldCollected ? Number(stats.goldCollected).toFixed(2) : '0.00', icon: '🏆', color: 'from-yellow-500/10 to-yellow-500/5 border-yellow-500/20 text-yellow-400' },
    { label: 'Amount Handled', value: stats?.amountHandled ? `₹${Number(stats.amountHandled).toLocaleString('en-IN')}` : '₹0', icon: '💰', color: 'from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 text-emerald-400' },
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Executive Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">Real-time status tracking, gold values, and branch operations metrics.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((card, idx) => (
          <div 
            key={idx} 
            className={`bg-gradient-to-br ${card.color} border rounded-2xl p-6 flex items-center justify-between shadow-lg relative overflow-hidden transition-all duration-300 hover:scale-[1.02]`}
          >
            <div className="space-y-1">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400">{card.label}</span>
              <p className="text-3xl font-bold text-slate-100">{card.value}</p>
            </div>
            <div className="text-4xl filter drop-shadow-md opacity-80">{card.icon}</div>
          </div>
        ))}
      </div>

      {/* Main Sections Link cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        
        {/* Left Card: Tasks */}
        <div className="bg-[#3d1510]/30 border border-amber-500/10 rounded-2xl p-6 space-y-4">
          <h3 className="font-bold text-lg text-amber-500 font-mono flex items-center gap-2">
            <span>🚀</span> Operations Center
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Manage your daily pipeline of gold pledge releases. View detailed customer info, navigate to vendor locations, document meetings, verify weights, record payments, and track completion steps.
          </p>
          <div className="pt-2">
            <Link 
              href="/executive/assigned"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:brightness-110 active:scale-[0.98] text-slate-950 px-5 py-2.5 rounded-xl font-bold text-xs tracking-wider transition-all"
            >
              VIEW ASSIGNED LEADS
            </Link>
          </div>
        </div>

        {/* Right Card: Performance */}
        <div className="bg-[#3d1510]/30 border border-amber-500/10 rounded-2xl p-6 space-y-4">
          <h3 className="font-bold text-lg text-amber-500 font-mono flex items-center gap-2">
            <span>📈</span> Target Report
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Review case completion rates, calculate total gold collections (grams), analyze total cash handled, and filter operational metrics across daily, weekly, or monthly periods.
          </p>
          <div className="pt-2">
            <Link 
              href="/executive/reports"
              className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/25 hover:bg-amber-500/20 text-amber-400 px-5 py-2.5 rounded-xl font-bold text-xs tracking-wider transition-all"
            >
              GENERATE REPORTS
            </Link>
          </div>
        </div>

      </div>

      {/* Bottom section: Quick Actions */}
      <div className="bg-[#3d1510]/20 border border-amber-500/5 rounded-2xl p-6">
        <h4 className="text-xs font-mono text-amber-500/70 tracking-widest uppercase mb-4">Quick Navigation Actions</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <Link href="/executive/assigned" className="p-4 rounded-xl bg-[#3d1510]/40 border border-amber-500/10 hover:border-amber-500/35 transition-all text-center">
            <span className="block text-2xl mb-1">📞</span>
            <span className="text-xs text-slate-300 font-mono">Call Customer</span>
          </Link>
          <Link href="/executive/assigned" className="p-4 rounded-xl bg-[#3d1510]/40 border border-amber-500/10 hover:border-amber-500/35 transition-all text-center">
            <span className="block text-2xl mb-1">🚗</span>
            <span className="text-xs text-slate-300 font-mono">Start Journey</span>
          </Link>
          <Link href="/executive/assigned" className="p-4 rounded-xl bg-[#3d1510]/40 border border-amber-500/10 hover:border-amber-500/35 transition-all text-center">
            <span className="block text-2xl mb-1">📍</span>
            <span className="text-xs text-slate-300 font-mono">Reached Customer</span>
          </Link>
          <Link href="/executive/assigned" className="p-4 rounded-xl bg-[#3d1510]/40 border border-amber-500/10 hover:border-amber-500/35 transition-all text-center">
            <span className="block text-2xl mb-1">🏦</span>
            <span className="text-xs text-slate-300 font-mono">Bank Visit</span>
          </Link>
          <Link href="/executive/assigned" className="p-4 rounded-xl bg-[#3d1510]/40 border border-amber-500/10 hover:border-amber-500/35 transition-all text-center">
            <span className="block text-2xl mb-1">💵</span>
            <span className="text-xs text-slate-300 font-mono">Payment Done</span>
          </Link>
          <Link href="/executive/assigned" className="p-4 rounded-xl bg-[#3d1510]/40 border border-amber-500/10 hover:border-amber-500/35 transition-all text-center">
            <span className="block text-2xl mb-1">🏆</span>
            <span className="text-xs text-slate-300 font-mono">Gold Received</span>
          </Link>
          <Link href="/executive/assigned" className="p-4 rounded-xl bg-[#3d1510]/40 border border-amber-500/10 hover:border-amber-500/35 transition-all text-center">
            <span className="block text-2xl mb-1">📷</span>
            <span className="text-xs text-slate-300 font-mono">Upload Images</span>
          </Link>
          <Link href="/executive/assigned" className="p-4 rounded-xl bg-[#3d1510]/40 border border-amber-500/10 hover:border-amber-500/35 transition-all text-center">
            <span className="block text-2xl mb-1">🏁</span>
            <span className="text-xs text-slate-300 font-mono">Complete Case</span>
          </Link>
        </div>
      </div>

    </div>
  );
}
