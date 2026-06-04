'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiRequest } from '../../../lib/api';

interface Lead {
  id: string;
  lead_number: string;
  customer_name: string;
  mobile: string;
  address: string;
  district: string;
  bank_name: string;
  branch_name: string;
  gold_weight: number;
  loan_amount: number;
  current_status: string;
}

export default function AssignedLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchLeads() {
      try {
        const data = await apiRequest('/executive/assigned-leads');
        setLeads(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch assigned leads.');
      } finally {
        setLoading(false);
      }
    }
    fetchLeads();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-10 h-10 rounded-full border-4 border-amber-500/25 border-t-amber-500 animate-spin"></div>
        <p className="text-amber-500/50 text-xs font-mono tracking-wider uppercase">Loading Assigned Leads...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-red-500/5 border border-red-500/15 max-w-xl mx-auto mt-10">
        <h2 className="text-red-400 font-bold font-mono text-lg mb-2">Error Loading Leads</h2>
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

  return (
    <div className="space-y-6 animate-fadeIn text-slate-800">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Assigned Leads</h1>
          <p className="text-slate-500 text-sm mt-1">Review, manage, and process gold buyouts assigned to your profile.</p>
        </div>
        <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs font-bold text-amber-700 self-start sm:self-center">
          Total Leads: {leads.length}
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
        {leads.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-medium text-sm">
            No leads currently assigned to you. Contact your RM to get assignments.
          </div>
        ) : (
          <div className="overflow-x-auto w-full -mx-4 px-4 sm:mx-0 sm:px-0">
            <table className="w-full min-w-[800px] text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="px-6 py-4 font-semibold">Lead ID</th>
                  <th className="px-6 py-4 font-semibold">Customer Name</th>
                  <th className="px-6 py-4 font-semibold">Mobile</th>
                  <th className="px-6 py-4 font-semibold">Location</th>
                  <th className="px-6 py-4 font-semibold">Bank/Vendor</th>
                  <th className="px-6 py-4 font-semibold">Gold Weight</th>
                  <th className="px-6 py-4 font-semibold">Loan Amount</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50/60 transition-colors border-b border-slate-100">
                    <td className="px-6 py-4 font-mono text-slate-600 text-xs truncate max-w-[120px]">{lead.lead_number || lead.id.slice(0, 8)}</td>
                    <td className="px-6 py-4 font-bold text-slate-800">{lead.customer_name}</td>
                    <td className="px-6 py-4 font-mono text-slate-500 text-xs">{lead.mobile}</td>
                    <td className="px-6 py-4 text-slate-500">{lead.district || lead.address || 'N/A'}</td>
                    <td className="px-6 py-4 text-slate-650">{lead.bank_name || 'N/A'}</td>
                    <td className="px-6 py-4 text-slate-700 font-mono font-bold">{lead.gold_weight ? `${lead.gold_weight}g` : 'N/A'}</td>
                    <td className="px-6 py-4 text-slate-750 font-mono font-bold">₹{Number(lead.loan_amount || 0).toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded-lg text-[9px] font-bold uppercase border ${
                        lead.current_status === 'CASE_COMPLETED' 
                          ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
                          : lead.current_status === 'EXECUTIVE_ASSIGNED' 
                          ? 'bg-indigo-100 text-indigo-700 border-indigo-200'
                          : 'bg-amber-100 text-amber-700 border border-amber-200'
                      }`}>
                        {lead.current_status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link 
                          href={`/executive/lead/${lead.id}`}
                          className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/25 hover:bg-amber-500/20 text-amber-400 font-bold text-xs tracking-wider transition-all"
                        >
                          VIEW DETAILS
                        </Link>
                        {lead.current_status !== 'CASE_COMPLETED' && (
                          <Link 
                            href={`/executive/lead/${lead.id}`}
                            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 hover:brightness-110 text-slate-950 font-bold text-xs tracking-wider transition-all"
                          >
                            START PROCESS
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
