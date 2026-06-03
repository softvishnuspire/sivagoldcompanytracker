'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiRequest } from '../../../lib/api';

interface CallRecord {
  leadId: string;
  leadNumber: string;
  customerName: string;
  mobile: string;
  notes: string;
  timestamp: string;
}

export default function CallLogsPage() {
  const [logs, setLogs] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCallLogs() {
      try {
        const data = await apiRequest('/executive/assigned-leads');
        
        const detailedLeads = await Promise.all(
          data.map((lead: any) => 
            apiRequest(`/executive/lead/${lead.id}`).catch(() => null)
          )
        );

        const allLogs: CallRecord[] = [];
        detailedLeads.forEach((lead: any) => {
          if (lead && lead.lead_timeline) {
            lead.lead_timeline.forEach((event: any) => {
              if (event.status === 'CUSTOMER_CALLED') {
                allLogs.push({
                  leadId: lead.id,
                  leadNumber: lead.lead_number,
                  customerName: lead.customer_name,
                  mobile: lead.mobile,
                  notes: event.remarks || 'Recorded Customer Contact Call',
                  timestamp: event.created_at
                });
              }
            });
          }
        });

        // Sort by newest calls
        allLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setLogs(allLogs);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadCallLogs();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-10 h-10 rounded-full border-4 border-amber-500/25 border-t-amber-500 animate-spin"></div>
        <p className="text-amber-500/50 text-xs font-mono uppercase tracking-wider">Loading Call Logs...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn text-slate-800">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Call Logs</h1>
        <p className="text-slate-500 text-sm mt-1">Review histories of telephonic interactions and client notes.</p>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
        {logs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-medium text-sm">
            No contact calls recorded in your active leads yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="px-6 py-4 font-semibold">Time & Date</th>
                  <th className="px-6 py-4 font-semibold">Lead ID</th>
                  <th className="px-6 py-4 font-semibold">Customer Name</th>
                  <th className="px-6 py-4 font-semibold">Mobile</th>
                  <th className="px-6 py-4 font-semibold">Call Notes</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {logs.map((log, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60 transition-colors border-b border-slate-100">
                    <td className="px-6 py-4 text-slate-500 text-xs font-mono">
                      {new Date(log.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-600 text-xs">{log.leadNumber || log.leadId.slice(0, 8)}</td>
                    <td className="px-6 py-4 font-bold text-slate-800">{log.customerName}</td>
                    <td className="px-6 py-4 font-mono text-slate-500 text-xs">{log.mobile}</td>
                    <td className="px-6 py-4 text-slate-650 font-sans max-w-xs truncate">{log.notes}</td>
                    <td className="px-6 py-4 text-right">
                      <Link 
                        href={`/executive/lead/${log.leadId}`}
                        className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/25 hover:bg-amber-500/20 text-[#c3902c] font-bold text-xs tracking-wider transition-all"
                      >
                        VIEW LEAD
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
