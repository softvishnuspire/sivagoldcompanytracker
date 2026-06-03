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
    <div className="space-y-6 animate-fadeIn">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Assigned Leads</h1>
          <p className="text-slate-400 text-sm mt-1">Review, manage, and process gold buyouts assigned to your profile.</p>
        </div>
        <div className="px-3 py-1 rounded bg-[#3d1510]/50 border border-amber-500/10 text-xs font-mono text-amber-400 self-start sm:self-center">
          Total Leads: {leads.length}
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-[#3d1510]/20 border border-amber-500/10 rounded-2xl overflow-hidden shadow-xl">
        {leads.length === 0 ? (
          <div className="p-12 text-center text-slate-500 font-mono text-sm">
            No leads currently assigned to you. Contact your RM to get assignments.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-amber-500/10 bg-[#3d1510]/40 text-amber-500 font-mono text-xs uppercase tracking-wider">
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
              <tbody className="divide-y divide-amber-500/5 text-sm">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-[#471a15]/20 transition-colors">
                    <td className="px-6 py-4 font-mono text-slate-300 text-xs truncate max-w-[120px]">{lead.lead_number || lead.id.slice(0, 8)}</td>
                    <td className="px-6 py-4 font-medium text-slate-100">{lead.customer_name}</td>
                    <td className="px-6 py-4 font-mono text-slate-300 text-xs">{lead.mobile}</td>
                    <td className="px-6 py-4 text-slate-400">{lead.district || lead.address || 'N/A'}</td>
                    <td className="px-6 py-4 text-slate-300">{lead.bank_name || 'N/A'}</td>
                    <td className="px-6 py-4 text-slate-300 font-mono">{lead.gold_weight ? `${lead.gold_weight}g` : 'N/A'}</td>
                    <td className="px-6 py-4 text-slate-300 font-mono">₹{Number(lead.loan_amount || 0).toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-mono border uppercase ${
                        lead.current_status === 'CASE_COMPLETED' 
                          ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                          : lead.current_status === 'EXECUTIVE_ASSIGNED' 
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
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
