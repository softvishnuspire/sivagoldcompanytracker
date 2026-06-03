'use client';

import React, { useEffect, useState } from 'react';
import { apiRequest } from '../../../lib/api';

interface ReportData {
  assignedLeads: number;
  completedCases: number;
  goldCollected: number;
  amountHandled: number;
  completionRate: number;
}

export default function ReportsPage() {
  const [filter, setFilter] = useState<'today' | 'week' | 'month'>('month');
  const [reports, setReports] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchReports = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest(`/executive/reports?filter=${filter}`);
      setReports(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load report analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [filter]);

  if (loading && !reports) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-10 h-10 rounded-full border-4 border-amber-500/25 border-t-amber-500 animate-spin"></div>
        <p className="text-amber-500/50 text-xs font-mono tracking-wider uppercase">Loading Analytics...</p>
      </div>
    );
  }

  const statCards = [
    { label: 'Total Assigned Cases', value: reports?.assignedLeads || 0, icon: '📋', color: 'text-blue-400' },
    { label: 'Completed Releases', value: reports?.completedCases || 0, icon: '✅', color: 'text-green-400' },
    { label: 'Gold Collected (grams)', value: reports?.goldCollected ? Number(reports.goldCollected).toFixed(2) + ' g' : '0.00 g', icon: '🏆', color: 'text-yellow-400' },
    { label: 'Total Amount Handled', value: reports?.amountHandled ? `₹${Number(reports.amountHandled).toLocaleString('en-IN')}` : '₹0', icon: '💰', color: 'text-emerald-400' },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-amber-500/10 pb-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Performance Analytics</h1>
          <p className="text-slate-400 text-sm mt-1">Generate reports on buyout completions, gold volumes, and total funds handled.</p>
        </div>
        
        {/* Filters */}
        <div className="flex items-center gap-1.5 p-1 bg-[#3d1510]/50 border border-amber-500/15 rounded-xl self-start sm:self-center font-mono">
          {(['today', 'week', 'month'] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => setFilter(opt)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                filter === opt 
                  ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-slate-950 shadow-md shadow-amber-500/10' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-mono">
          ⚠️ ERROR: {error}
        </div>
      )}

      {/* Main statistics cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, idx) => (
          <div 
            key={idx}
            className="bg-[#3d1510]/35 border border-amber-500/10 rounded-2xl p-6 flex justify-between items-center shadow-lg relative overflow-hidden group hover:border-amber-500/25 transition-all"
          >
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block">{card.label}</span>
              <p className="text-2xl font-bold text-slate-100">{card.value}</p>
            </div>
            <div className={`text-3xl ${card.color} opacity-70 group-hover:scale-110 transition-transform`}>{card.icon}</div>
          </div>
        ))}
      </div>

      {/* Completion Rate Chart & summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        
        {/* Completion Gauge card */}
        <div className="bg-[#3d1510]/30 border border-amber-500/10 rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-4">
          <h4 className="text-xs font-mono text-amber-500/80 uppercase tracking-wider self-start">Release Completion Rate</h4>
          
          <div className="relative w-36 h-36 flex items-center justify-center">
            {/* Simple circle SVG chart */}
            <svg className="w-full h-full transform -rotate-90">
              <circle 
                cx="72" cy="72" r="60" 
                className="stroke-amber-500/10 fill-none" 
                strokeWidth="10"
              />
              <circle 
                cx="72" cy="72" r="60" 
                className="stroke-amber-500 fill-none transition-all duration-1000 ease-out" 
                strokeWidth="10"
                strokeDasharray={`${2 * Math.PI * 60}`}
                strokeDashoffset={`${2 * Math.PI * 60 * (1 - (reports?.completionRate || 0) / 100)}`}
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center space-y-0.5">
              <span className="text-3xl font-extrabold text-white">{reports?.completionRate || 0}%</span>
              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">Rate</span>
            </div>
          </div>

          <p className="text-xs text-slate-400 max-w-[200px] leading-relaxed">
            Successful case conversions based on total assigned buyouts.
          </p>
        </div>

        {/* Breakdown of goals */}
        <div className="lg:col-span-2 bg-[#3d1510]/30 border border-amber-500/10 rounded-2xl p-6 space-y-4">
          <h4 className="text-xs font-mono text-amber-500/80 uppercase tracking-wider border-b border-amber-500/10 pb-2">Target Achievements Summary</h4>
          
          <div className="space-y-4 pt-2 text-xs font-mono">
            <div className="space-y-1.5">
              <div className="flex justify-between text-slate-400">
                <span>Gold Buyouts Target</span>
                <span className="text-slate-200">{(reports?.completedCases || 0)} / 5 cases</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-amber-500/10 overflow-hidden">
                <div 
                  className="h-full bg-amber-500 transition-all duration-1000"
                  style={{ width: `${Math.min(((reports?.completedCases || 0) / 5) * 100, 100)}%` }}
                ></div>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-slate-400">
                <span>Gold Volume Pledged</span>
                <span className="text-slate-200">{reports?.goldCollected ? Number(reports.goldCollected).toFixed(1) : 0}g / 150g</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-amber-500/10 overflow-hidden">
                <div 
                  className="h-full bg-amber-500 transition-all duration-1000"
                  style={{ width: `${Math.min(((reports?.goldCollected || 0) / 150) * 100, 100)}%` }}
                ></div>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-slate-400">
                <span>Total Capital Released</span>
                <span className="text-slate-200">₹{(reports?.amountHandled || 0).toLocaleString('en-IN')} / ₹5,00,000</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-amber-500/10 overflow-hidden">
                <div 
                  className="h-full bg-amber-500 transition-all duration-1000"
                  style={{ width: `${Math.min(((reports?.amountHandled || 0) / 500000) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
