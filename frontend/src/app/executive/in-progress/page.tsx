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

export default function InProgressPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeads() {
      try {
        const data = await apiRequest('/executive/assigned-leads');
        // Filter leads in progress (all except completed/rejected/executive_assigned initial)
        const progressStates = [
          'CUSTOMER_CALLED', 'VISIT_CONFIRMED', 'MD_FUNDS_APPROVED', 
          'JOURNEY_STARTED', 'REACHED_CUSTOMER', 'CUSTOMER_INTERACTION', 
          'BANK_VISIT', 'AGREEMENT_PENDING', 'PAYMENT_COMPLETED', 
          'GOLD_RECEIVED', 'BALANCE_SETTLED', 'IMAGES_UPLOADED'
        ];
        const filtered = data.filter((lead: Lead) => progressStates.includes(lead.current_status));
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
        <p className="text-amber-500/50 text-xs font-mono uppercase tracking-wider">Loading In-Progress Cases...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">In Progress Cases</h1>
        <p className="text-slate-400 text-sm mt-1">Review cases that are currently navigating the buyout workflow pipeline.</p>
      </div>

      <div className="bg-[#3d1510]/20 border border-amber-500/10 rounded-2xl overflow-hidden shadow-xl">
        {leads.length === 0 ? (
          <div className="p-12 text-center text-slate-500 font-mono text-sm">
            No cases currently in progress.
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
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-500/5 text-sm">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-[#471a15]/20 transition-colors">
                    <td className="px-6 py-4 font-mono text-slate-300 text-xs">{lead.lead_number || lead.id.slice(0, 8)}</td>
                    <td className="px-6 py-4 font-medium text-slate-100">{lead.customer_name}</td>
                    <td className="px-6 py-4 font-mono text-slate-300 text-xs">{lead.mobile}</td>
                    <td className="px-6 py-4 text-slate-400">{lead.district || lead.address || 'N/A'}</td>
                    <td className="px-6 py-4">
                      <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-mono border uppercase bg-amber-500/10 text-amber-400 border-amber-500/20">
                        {lead.current_status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link 
                        href={`/executive/lead/${lead.id}`}
                        className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 hover:brightness-110 text-slate-950 font-bold text-xs tracking-wider transition-all"
                      >
                        CONTINUE
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
