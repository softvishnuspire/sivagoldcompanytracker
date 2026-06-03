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

export default function VisitsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchLeads() {
      try {
        const data = await apiRequest('/executive/assigned-leads');
        // Filter leads that are in visit or travel states
        const visitStates = ['CUSTOMER_CALLED', 'VISIT_CONFIRMED', 'MD_FUNDS_APPROVED', 'JOURNEY_STARTED', 'REACHED_CUSTOMER'];
        const filtered = data.filter((lead: Lead) => visitStates.includes(lead.current_status));
        setLeads(filtered);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch active visits.');
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
        <p className="text-amber-500/50 text-xs font-mono uppercase tracking-wider">Loading Visits...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn text-slate-800">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">My Visits</h1>
        <p className="text-slate-500 text-sm mt-1">Monitor scheduled customer appointments and ongoing travel journeys.</p>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
        {leads.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-medium text-sm">
            No active visits scheduled or in travel status.
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
                  <th className="px-6 py-4 font-semibold">Bank/Vendor</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
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
                    <td className="px-6 py-4 text-slate-650">{lead.bank_name || 'N/A'}</td>
                    <td className="px-6 py-4">
                      <span className="inline-block px-2.5 py-0.5 rounded-lg text-[9px] font-bold border uppercase bg-amber-100 text-amber-700 border-amber-200">
                        {lead.current_status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link 
                        href={`/executive/lead/${lead.id}`}
                        className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 hover:brightness-110 text-slate-950 font-bold text-xs tracking-wider transition-all"
                      >
                        OPEN TASK
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
