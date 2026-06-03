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

export default function CompletedCasesPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeads() {
      try {
        const data = await apiRequest('/executive/assigned-leads');
        const filtered = data.filter((lead: Lead) => lead.current_status.toUpperCase().replace(/[\s_]+/g, '_') === 'CASE_COMPLETED');
        setLeads(filtered);
      } catch (err) {
        console.error(err);
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
        <p className="text-amber-500/50 text-xs font-mono uppercase tracking-wider">Loading Completed Cases...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn text-slate-800">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Completed Cases</h1>
        <p className="text-slate-500 text-sm mt-1">Review finalized gold buyouts and closed cases ledger details.</p>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
        {leads.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-medium text-sm">
            No completed cases on your assignment ledger.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="px-6 py-4 font-semibold">Lead ID</th>
                  <th className="px-6 py-4 font-semibold">Customer Name</th>
                  <th className="px-6 py-4 font-semibold">Mobile</th>
                  <th className="px-6 py-4 font-semibold">Location</th>
                  <th className="px-6 py-4 font-semibold">Gold Weight</th>
                  <th className="px-6 py-4 font-semibold">Loan Amount</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50/60 transition-colors border-b border-slate-100">
                    <td className="px-6 py-4 font-mono text-slate-600 text-xs">{lead.lead_number || lead.id.slice(0, 8)}</td>
                    <td className="px-6 py-4 font-bold text-slate-800">{lead.customer_name}</td>
                    <td className="px-6 py-4 font-mono text-slate-500 text-xs">{lead.mobile}</td>
                    <td className="px-6 py-4 text-slate-500">{lead.district || lead.address || 'N/A'}</td>
                    <td className="px-6 py-4 font-mono text-slate-700 font-bold">{lead.gold_weight ? `${lead.gold_weight}g` : 'N/A'}</td>
                    <td className="px-6 py-4 font-mono text-slate-750 font-bold">₹{Number(lead.loan_amount || 0).toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4 text-right">
                      <Link 
                        href={`/executive/lead/${lead.id}`}
                        className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/25 hover:bg-amber-500/20 text-[#c3902c] font-bold text-xs tracking-wider transition-all"
                      >
                        VIEW LEDGER
                      </Link>
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
