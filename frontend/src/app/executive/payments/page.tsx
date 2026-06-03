'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiRequest } from '../../../lib/api';

interface PaymentDetails {
  id: string;
  lead_number: string;
  customer_name: string;
  loan_amount: number;
  balance_amount?: number;
  total_paid?: number;
  transaction_number?: string;
  payment_date?: string;
  current_status: string;
  payments?: {
    id: string;
    loan_amount?: number;
    balance_amount?: number;
    total_paid?: number;
    transaction_number?: string;
    payment_date?: string;
  }[];
}

export default function PaymentsPage() {
  const [leads, setLeads] = useState<PaymentDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadPayments() {
      try {
        // Load assigned leads and their detailed states
        const data = await apiRequest('/executive/assigned-leads');
        
        // We will fetch full details for leads that have payment status
        const detailedLeads = await Promise.all(
          data.map((lead: any) => 
            apiRequest(`/executive/lead/${lead.id}`).catch(() => null)
          )
        );

        setLeads(detailedLeads.filter(Boolean));
      } catch (err: any) {
        setError(err.message || 'Failed to load payment transaction history.');
      } finally {
        setLoading(false);
      }
    }
    loadPayments();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-10 h-10 rounded-full border-4 border-amber-500/25 border-t-amber-500 animate-spin"></div>
        <p className="text-amber-500/50 text-xs font-mono tracking-wider uppercase">Loading Payments Ledger...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-red-500/5 border border-red-500/15 max-w-xl mx-auto mt-10 text-center">
        <p className="text-slate-300 font-mono text-sm">{error}</p>
        <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded-lg text-xs tracking-wider">
          RETRY
        </button>
      </div>
    );
  }

  // Extract all payment events
  const paymentList: {
    leadId: string;
    leadNumber: string;
    customerName: string;
    loanAmount: number;
    balanceAmount: number;
    totalPaid: number;
    transactionNumber: string;
    paymentDate: string;
    status: string;
  }[] = [];

  leads.forEach(lead => {
    if (lead.payments && lead.payments.length > 0) {
      lead.payments.forEach(pay => {
        paymentList.push({
          leadId: lead.id,
          leadNumber: lead.lead_number,
          customerName: lead.customer_name,
          loanAmount: Number(pay.loan_amount || lead.loan_amount || 0),
          balanceAmount: Number(pay.balance_amount || 0),
          totalPaid: Number(pay.total_paid || 0),
          transactionNumber: pay.transaction_number || 'N/A',
          paymentDate: pay.payment_date ? new Date(pay.payment_date).toLocaleDateString() : 'N/A',
          status: lead.current_status
        });
      });
    }
  });

  return (
    <div className="space-y-6 animate-fadeIn text-slate-800">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Payments Registry</h1>
        <p className="text-slate-500 text-sm mt-1">Review disbursed funds, balance settlements, and financial tracking details.</p>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
        {paymentList.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-medium text-sm">
            No payment records found. Run the payout steps in lead processing to record transactions.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="px-6 py-4 font-semibold">Lead ID</th>
                  <th className="px-6 py-4 font-semibold">Customer Name</th>
                  <th className="px-6 py-4 font-semibold">Loan Amount</th>
                  <th className="px-6 py-4 font-semibold">Balance Amount</th>
                  <th className="px-6 py-4 font-semibold">Total Paid</th>
                  <th className="px-6 py-4 font-semibold">Transaction Number</th>
                  <th className="px-6 py-4 font-semibold">Payment Date</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {paymentList.map((pay, index) => (
                  <tr key={index} className="hover:bg-slate-50/60 transition-colors border-b border-slate-100">
                    <td className="px-6 py-4 font-mono text-slate-600 text-xs truncate max-w-[120px]">{pay.leadNumber || pay.leadId.slice(0, 8)}</td>
                    <td className="px-6 py-4 font-bold text-slate-800">{pay.customerName}</td>
                    <td className="px-6 py-4 font-mono text-slate-600 text-xs">₹{pay.loanAmount.toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4 font-mono text-slate-600 text-xs">₹{pay.balanceAmount.toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4 font-mono text-slate-750 font-bold">₹{pay.totalPaid.toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4 font-mono text-slate-500 text-xs">{pay.transactionNumber}</td>
                    <td className="px-6 py-4 text-slate-500 text-xs">{pay.paymentDate}</td>
                    <td className="px-6 py-4">
                      <span className="inline-block px-2.5 py-0.5 rounded-lg text-[9px] font-bold border uppercase bg-amber-100 text-amber-700 border-amber-200">
                        {pay.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link 
                        href={`/executive/lead/${pay.leadId}`}
                        className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/25 hover:bg-amber-500/20 text-[#c3902c] font-bold text-xs tracking-wider transition-all"
                      >
                        VIEW ➔
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
