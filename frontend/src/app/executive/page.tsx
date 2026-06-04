'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiRequest } from '../../lib/api';
import { CardSkeleton } from '../../components/ui/SkeletonLoaders';


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
  
  // Storing logged-in user profile details for personalization
  const [userName, setUserName] = useState('Executive');
  const [userCode, setUserCode] = useState('');

  useEffect(() => {
    // Fresh profile loading
    const storedUserStr = localStorage.getItem('user');
    if (storedUserStr) {
      try {
        const parsed = JSON.parse(storedUserStr);
        if (parsed?.name) setUserName(parsed.name);
        if (parsed?.employee_code) setUserCode(parsed.employee_code);
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

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
      <div className="space-y-6 animate-pulse p-6">
        <div className="h-24 w-full bg-slate-200 rounded-3xl" />
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          <CardSkeleton count={6} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-red-500/5 border border-red-500/15 max-w-xl mx-auto mt-10">
        <h2 className="text-red-650 font-bold text-lg mb-2">Error Loading Dashboard</h2>
        <p className="text-slate-600 text-sm leading-relaxed mb-4">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-5 py-2.5 bg-amber-550/10 hover:bg-amber-550/20 text-[#c3902c] rounded-xl text-xs font-bold border border-amber-500/25 transition-all cursor-pointer"
        >
          RETRY
        </button>
      </div>
    );
  }

  const statCards = [
    { 
      label: 'Assigned Leads', 
      value: stats?.assignedLeads || 0, 
      icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01', 
      badge: 'New cases', 
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-100' 
    },
    { 
      label: "Today's Visits", 
      value: stats?.todayVisits || 0, 
      icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7', 
      badge: 'Visits list', 
      badgeColor: 'bg-amber-50 text-amber-800 border-amber-100' 
    },
    { 
      label: 'In Progress Cases', 
      value: stats?.inProgressCases || 0, 
      icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', 
      badge: 'Active releases', 
      badgeColor: 'bg-orange-50 text-orange-700 border-orange-100' 
    },
    { 
      label: 'Completed Cases', 
      value: stats?.completedCases || 0, 
      icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', 
      badge: 'Closed success', 
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-100' 
    },
    { 
      label: 'Gold Collected', 
      value: stats?.goldCollected ? `${Number(stats.goldCollected).toFixed(2)} g` : '0.00 g', 
      icon: 'M12 14c2.76 0 5-2.24 5-5V4a1 1 0 00-1-1H8a1 1 0 00-1 1v5c0 2.76 2.24 5 5 5zm0 0v4m-4 0h8m-8-8H5a2 2 0 00-2 2v2a2 2 0 002 2h3m8-6h3a2 2 0 012 2v2a2 2 0 01-2 2h-3', 
      badge: 'Ornament weight', 
      badgeColor: 'bg-yellow-50 text-yellow-805 border-yellow-100' 
    },
    { 
      label: 'Amount Handled', 
      value: stats?.amountHandled ? `₹${Number(stats.amountHandled).toLocaleString('en-IN')}` : '₹0', 
      icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', 
      badge: 'Cash volume', 
      badgeColor: 'bg-teal-50 text-teal-700 border-teal-100' 
    },
  ];

  return (
    <div className="space-y-8 animate-fadeIn text-slate-800">
      
      {/* Luxury Welcome Banner Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#4d0711] to-[#2e040a] p-6 sm:p-8 text-white shadow-lg border border-[#691823]/25">
        {/* Golden Ambient Blur Glow */}
        <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-[#c3902c]/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-60 h-60 rounded-full bg-[#c3902c]/10 blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-amber-300 uppercase tracking-widest leading-none">Operational Workspace</span>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-1">
              Welcome Back, {userName.split(' ')[0]}
            </h1>
            <p className="text-xs text-amber-100/70 leading-relaxed max-w-xl">
              Monitor active gold release pipelines, verify ornament appraisals, and record customer payouts.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
            <div className="px-4 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 flex flex-col">
              <span className="text-[9px] text-amber-300 font-bold uppercase tracking-wider">Employee Code</span>
              <span className="text-xs font-extrabold text-white mt-0.5">{userCode || 'EMP-EX-003'}</span>
            </div>
            <div className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col items-center">
              <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider">System Status</span>
              <span className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-400 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Active
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
        {statCards.map((card, idx) => (
          <div 
            key={idx} 
            className="border border-slate-200/60 rounded-2xl p-4 sm:p-6 flex items-center justify-between shadow-sm relative overflow-hidden bg-white transition-all duration-300 hover:scale-[1.015] hover:shadow-md hover:border-amber-500/20 group"
          >
            {/* Top gold accent line */}
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-amber-500/20 via-[#c3902c] to-amber-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            <div className="space-y-2 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5">
                <span className="text-[8px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">{card.label}</span>
                <span className={`px-1.5 py-0.5 rounded text-[7px] sm:text-[8px] font-bold uppercase border ${card.badgeColor} self-start sm:self-auto truncate`}>{card.badge}</span>
              </div>
              <p className="text-xl sm:text-3xl font-black text-slate-800 tracking-tight truncate">{card.value}</p>
            </div>
            
            <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl bg-amber-500/10 text-[#c3902c] flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110 shadow-sm">
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={card.icon} />
              </svg>
            </div>
          </div>
        ))}
      </div>

      {/* Main Sections Link cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        
        {/* Left Card: Tasks */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-4 shadow-sm hover:shadow-md hover:border-amber-500/15 transition-all duration-300 relative overflow-hidden group">
          {/* Ambient Glow */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl group-hover:bg-amber-500/10 transition-colors" />
          
          <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2 relative z-10">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-[#c3902c] flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            Operations Center
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed relative z-10">
            Manage your daily pipeline of gold pledge releases. View detailed customer info, navigate to vendor locations, document meetings, verify weights, record payments, and track completion steps.
          </p>
          <div className="pt-2 relative z-10">
            <Link 
              href="/executive/assigned"
              className="inline-flex items-center gap-2 bg-[#c3902c] hover:bg-amber-600 active:scale-[0.98] text-white px-5 py-2.5 rounded-xl font-bold text-xs tracking-wider transition-all shadow-md hover:shadow-lg hover:shadow-amber-500/15 cursor-pointer"
            >
              VIEW ASSIGNED LEADS
            </Link>
          </div>
        </div>

        {/* Right Card: Performance */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-4 shadow-sm hover:shadow-md hover:border-amber-500/15 transition-all duration-300 relative overflow-hidden group">
          {/* Ambient Glow */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl group-hover:bg-amber-500/10 transition-colors" />
          
          <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2 relative z-10">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-[#c3902c] flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10a2 2 0 01-2 2h-2a2 2 0 01-2-2zm9-1h2a2 2 0 002-2v-3a2 2 0 00-2-2h-2a2 2 0 00-2 2v3a2 2 0 002 2zm-8-3H8v3h2v-3z" />
              </svg>
            </div>
            Target Report
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed relative z-10">
            Review case completion rates, calculate total gold collections (grams), analyze total cash handled, and filter operational metrics across daily, weekly, or monthly periods.
          </p>
          <div className="pt-2 relative z-10">
            <Link 
              href="/executive/reports"
              className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/25 hover:bg-amber-500/20 text-[#c3902c] px-5 py-2.5 rounded-xl font-bold text-xs tracking-wider transition-all cursor-pointer"
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
            { label: 'Call Customer', icon: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z' },
            { label: 'Start Journey', icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7' },
            { label: 'Reached Customer', icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z' },
            { label: 'Bank Visit', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
            { label: 'Payment Done', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
            { label: 'Gold Received', icon: 'M12 15v5m-3 0h6M4 11a5 5 0 015-5h6a5 5 0 015 5 7 7 0 01-14 0z M12 14c2.76 0 5-2.24 5-5V4a1 1 0 00-1-1H8a1 1 0 00-1 1v5c0 2.76 2.24 5 5 5zm0 0v4m-4 0h8m-8-8H5a2 2 0 00-2 2v2a2 2 0 002 2h3m8-6h3a2 2 0 012 2v2a2 2 0 01-2 2h-3' },
            { label: 'Upload Images', icon: 'M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9zM15 13a3 3 0 11-6 0 3 3 0 016 0z' },
            { label: 'Complete Case', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' }
          ].map((act, idx) => (
            <Link 
              key={idx}
              href="/executive/assigned" 
              className="p-4 rounded-xl bg-white border border-slate-200/60 hover:border-amber-500/30 hover:bg-amber-500/5 transition-all text-center flex flex-col items-center justify-center gap-2.5 shadow-sm group active:scale-95 duration-200 cursor-pointer"
            >
              <svg className="w-6 h-6 text-slate-400 group-hover:text-[#c3902c] transition-all duration-300 group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={act.icon} />
              </svg>
              <span className="text-xs text-slate-600 font-semibold group-hover:text-amber-800 transition-colors">{act.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
