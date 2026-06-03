'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '../../../../lib/api';

interface TimelineEvent {
  id: string;
  status: string;
  remarks: string;
  created_at: string;
}

interface LeadDocument {
  id: string;
  document_type: string;
  file_url: string;
  created_at: string;
}

interface Payment {
  id: string;
  loan_amount: number;
  balance_amount: number;
  total_paid: number;
  transaction_number: string;
  payment_date: string;
  payment_proof: string;
}

interface GoldCollection {
  id: string;
  gross_weight: number;
  net_weight: number;
  purity: number;
  received_date: string;
}

interface FundRequest {
  id: string;
  requested_amount: number;
  approved_amount: number;
  status: string;
  approved_at: string;
}

interface Lead {
  id: string;
  lead_number: string;
  customer_name: string;
  mobile: string;
  alternate_mobile?: string;
  address?: string;
  district?: string;
  gold_weight?: number;
  gold_type?: string;
  estimated_value?: number;
  bank_name?: string;
  branch_name?: string;
  loan_amount?: number;
  loan_account_number?: string;
  remarks?: string;
  current_status: string;
  lead_documents?: LeadDocument[];
  lead_timeline?: TimelineEvent[];
  payments?: Payment[];
  gold_collection?: GoldCollection[];
  gold_images?: { id: string; image_url: string }[];
  fund_requests?: FundRequest[];
}

export default function LeadDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: leadId } = use(params);

  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Form states for each step
  const [callNotes, setCallNotes] = useState('');
  const [visitDate, setVisitDate] = useState('');
  const [visitTime, setVisitTime] = useState('');
  const [visitRemarks, setVisitRemarks] = useState('');
  
  const [discussionNotes, setDiscussionNotes] = useState('');
  const [customerConfirmation, setCustomerConfirmation] = useState(false);

  const [vendorName, setVendorName] = useState('');
  const [bankName, setBankName] = useState('');
  const [verificationNotes, setVerificationNotes] = useState('');

  // Agreement file uploads
  const [agreementCopy, setAgreementCopy] = useState<File | null>(null);
  const [kycCopy, setKycCopy] = useState<File | null>(null);

  // Payment completed
  const [loanAmountPaid, setLoanAmountPaid] = useState('');
  const [paymentTx, setPaymentTx] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentProof, setPaymentProof] = useState<File | null>(null);

  // Gold received
  const [grossWeight, setGrossWeight] = useState('');
  const [netWeight, setNetWeight] = useState('');
  const [purity, setPurity] = useState('91.6');
  const [goldRemarks, setGoldRemarks] = useState('');

  // Balance settled
  const [balanceAmount, setBalanceAmount] = useState('');
  const [balanceTx, setBalanceTx] = useState('');
  const [balanceDate, setBalanceDate] = useState('');

  // Gold images upload
  const [goldImg1, setGoldImg1] = useState<File | null>(null);
  const [goldImg2, setGoldImg2] = useState<File | null>(null);
  const [goldImg3, setGoldImg3] = useState<File | null>(null);
  const [goldImg4, setGoldImg4] = useState<File | null>(null);

  // Case completion
  const [finalRemarks, setFinalRemarks] = useState('');

  // Fund request amount
  const [requestedAmount, setRequestedAmount] = useState('');

  // Document Preview Modal states
  const [previewDocUrl, setPreviewDocUrl] = useState<string | null>(null);
  const [previewDocType, setPreviewDocType] = useState<string | null>(null);
  const [previewDocName, setPreviewDocName] = useState<string | null>(null);

  const downloadDocument = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.replace(/\s+/g, '_');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const loadLeadDetails = async () => {
    try {
      const data = await apiRequest(`/executive/lead/${leadId}`);
      setLead(data);
      
      // Pre-fill fields if editing/viewing
      if (data.bank_name) setBankName(data.bank_name);
      if (data.branch_name) setVendorName(data.branch_name);
      if (data.loan_amount) setLoanAmountPaid(data.loan_amount.toString());
      if (data.gold_weight) {
        setGrossWeight(data.gold_weight.toString());
        setNetWeight(data.gold_weight.toString());
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load lead details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeadDetails();
  }, [leadId]);

  const handleStatusChange = async (targetStatus: string, payload: any) => {
    setError('');
    setSubmitting(true);
    try {
      // Choose correct endpoint or general update-status
      let endpoint = '/executive/update-status';
      let options: RequestInit = {
        method: 'POST',
      };

      if (payload instanceof FormData) {
        payload.append('leadId', leadId);
        options.body = payload;
      } else {
        payload.leadId = leadId;
        options.body = JSON.stringify(payload);
      }

      if (targetStatus === 'JOURNEY_STARTED') {
        endpoint = '/executive/start-journey';
      } else if (targetStatus === 'REACHED_CUSTOMER') {
        endpoint = '/executive/reached-customer';
      } else if (targetStatus === 'CUSTOMER_INTERACTION') {
        endpoint = '/executive/customer-interaction';
      } else if (targetStatus === 'BANK_VISIT') {
        endpoint = '/executive/bank-visit';
      } else if (targetStatus === 'AGREEMENT_PENDING') {
        endpoint = '/executive/upload-agreements';
      } else if (targetStatus === 'PAYMENT_COMPLETED') {
        endpoint = '/executive/payment';
      } else if (targetStatus === 'GOLD_RECEIVED') {
        endpoint = '/executive/gold-received';
      } else if (targetStatus === 'BALANCE_SETTLED') {
        endpoint = '/executive/balance-settled';
      } else if (targetStatus === 'IMAGES_UPLOADED') {
        endpoint = '/executive/upload-images';
      } else if (targetStatus === 'CASE_COMPLETED') {
        endpoint = '/executive/complete-case';
      }

      // Special handling for general status updates (e.g. CUSTOMER_CALLED, VISIT_CONFIRMED)
      if (endpoint === '/executive/update-status') {
        options.body = JSON.stringify({
          leadId,
          targetStatus,
          remarks: payload.remarks
        });
      }

      await apiRequest(endpoint, options);
      
      // Reload
      await loadLeadDetails();
      
      // Clear forms
      setCallNotes('');
      setVisitRemarks('');
      setDiscussionNotes('');
      setVerificationNotes('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestFunds = async () => {
    if (!requestedAmount) {
      setError('Please enter a fund amount.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await apiRequest('/executive/request-funds', {
        method: 'POST',
        body: JSON.stringify({
          leadId,
          requestedAmount: Number(requestedAmount)
        })
      });
      setRequestedAmount('');
      await loadLeadDetails();
    } catch (err: any) {
      setError(err.message || 'Failed to submit fund request.');
    } finally {
      setSubmitting(false);
    }
  };

  // Simulation tool for MD Funds Approval (since executive cannot modify, we simulate it for UI walkthrough)
  const handleSimulateFundsApproval = async () => {
    setError('');
    setSubmitting(true);
    try {
      // First make a fund request
      const { data: requestRes } = await apiRequest('/executive/update-status', {
        method: 'POST',
        body: JSON.stringify({
          leadId,
          targetStatus: 'MD_FUNDS_APPROVED',
          remarks: 'MD approved funds of ₹' + (lead?.loan_amount || 50000)
        })
      });

      // Insert record in fund_requests and payments
      await loadLeadDetails();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-10 h-10 rounded-full border-4 border-amber-500/25 border-t-amber-500 animate-spin"></div>
        <p className="text-amber-500/50 text-xs font-mono tracking-wider uppercase">Loading Case Details...</p>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="p-6 rounded-2xl bg-red-500/5 border border-red-500/15 max-w-xl mx-auto mt-10 text-center">
        <p className="text-slate-300 font-mono text-sm">Lead details not found or access denied.</p>
        <button onClick={() => router.push('/executive/assigned')} className="mt-4 px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded-lg text-xs tracking-wider">
          BACK TO LIST
        </button>
      </div>
    );
  }

  const currentStatus = lead.current_status.toUpperCase().replace(/[\s_]+/g, '_');

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      
      {/* Top Navigation */}
      <div className="flex items-center justify-between border-b border-amber-500/10 pb-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push('/executive/assigned')}
            className="text-amber-500/60 hover:text-amber-500 text-sm font-mono hover:scale-105 transition-transform"
          >
            ← Back to Assigned
          </button>
          <span className="text-slate-500">|</span>
          <span className="text-xs font-mono text-slate-400">Lead ID: {lead.lead_number || lead.id.slice(0, 8)}</span>
        </div>
        <div>
          <span className="inline-block px-3 py-1 rounded bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs font-mono uppercase">
            Status: {lead.current_status.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-mono leading-tight">
          ⚠️ ERROR: {error}
        </div>
      )}

      {/* Main Grid: Left = Info + Current Action Form, Right = Journey Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Columns */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Section 1: Customer Details */}
          <div className="bg-[#3d1510]/30 border border-amber-500/10 rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-sm font-mono tracking-wider text-amber-500 uppercase">Customer Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              <div>
                <span className="text-slate-500 block mb-1">Customer Name</span>
                <span className="text-slate-200 text-sm font-sans font-semibold">{lead.customer_name}</span>
              </div>
              <div>
                <span className="text-slate-500 block mb-1">Mobile Number</span>
                <span className="text-slate-200 text-sm font-sans">{lead.mobile}</span>
              </div>
              {lead.alternate_mobile && (
                <div>
                  <span className="text-slate-500 block mb-1">Alternate Number</span>
                  <span className="text-slate-200 text-sm font-sans">{lead.alternate_mobile}</span>
                </div>
              )}
              <div className="md:col-span-2">
                <span className="text-slate-500 block mb-1">Address</span>
                <span className="text-slate-200 text-sm font-sans">{lead.address || 'N/A'}, {lead.district || ''}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Gold & Bank Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Gold details */}
            <div className="bg-[#3d1510]/30 border border-amber-500/10 rounded-2xl p-6 space-y-4">
              <h3 className="font-bold text-sm font-mono tracking-wider text-amber-500 uppercase">Gold Details</h3>
              <div className="space-y-3 text-xs font-mono">
                <div className="flex justify-between border-b border-amber-500/5 pb-2">
                  <span className="text-slate-500">Weight</span>
                  <span className="text-slate-200">{lead.gold_weight ? `${lead.gold_weight}g` : 'N/A'}</span>
                </div>
                <div className="flex justify-between border-b border-amber-500/5 pb-2">
                  <span className="text-slate-500">Type</span>
                  <span className="text-slate-200">{lead.gold_type || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Estimated Value</span>
                  <span className="text-slate-200">₹{Number(lead.estimated_value || 0).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Bank details */}
            <div className="bg-[#3d1510]/30 border border-amber-500/10 rounded-2xl p-6 space-y-4">
              <h3 className="font-bold text-sm font-mono tracking-wider text-amber-500 uppercase">Bank Details</h3>
              <div className="space-y-3 text-xs font-mono">
                <div className="flex justify-between border-b border-amber-500/5 pb-2">
                  <span className="text-slate-500">Bank Name</span>
                  <span className="text-slate-200">{lead.bank_name || 'N/A'}</span>
                </div>
                <div className="flex justify-between border-b border-amber-500/5 pb-2">
                  <span className="text-slate-500">Branch Name</span>
                  <span className="text-slate-200">{lead.branch_name || 'N/A'}</span>
                </div>
                <div className="flex justify-between border-b border-amber-500/5 pb-2">
                  <span className="text-slate-500">Loan Amount</span>
                  <span className="text-slate-200">₹{Number(lead.loan_amount || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Loan Account No.</span>
                  <span className="text-slate-200 truncate max-w-[140px]">{lead.loan_account_number || 'N/A'}</span>
                </div>
              </div>
            </div>

          </div>

          {/* Section 3: RM remarks & Documents */}
          <div className="bg-[#3d1510]/30 border border-amber-500/10 rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-sm font-mono tracking-wider text-amber-500 uppercase">RM Remarks & Documents</h3>
            
            {lead.remarks && (
              <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 mb-4">
                <p className="text-xs text-amber-500/70 font-mono mb-1">RM Notes:</p>
                <p className="text-sm text-slate-300 font-sans">{lead.remarks}</p>
              </div>
            )}

            <div className="space-y-2">
              <span className="text-xs text-slate-500 font-mono block">Uploaded Documents:</span>
              {((lead.lead_documents && lead.lead_documents.length > 0) || 
                ((lead as any).leadDocuments && (lead as any).leadDocuments.length > 0) || 
                ((lead as any).documents && (lead as any).documents.length > 0)) ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {(lead.lead_documents || (lead as any).leadDocuments || (lead as any).documents).map((doc: any) => (
                    <button 
                      key={doc.id}
                      onClick={() => {
                        setPreviewDocUrl(doc.file_url || doc.fileUrl);
                        setPreviewDocType(doc.document_type || doc.documentType || 'Document');
                        setPreviewDocName(`${lead.customer_name}_${doc.document_type || doc.documentType || 'Document'}`);
                      }}
                      className="p-3 rounded-xl bg-[#3d1510]/50 border border-amber-500/15 hover:border-amber-500/40 text-xs font-mono text-amber-400 flex items-center justify-between transition-colors text-left w-full cursor-pointer"
                    >
                      <span className="truncate">{(doc.document_type || doc.documentType || 'Document').replace(/_/g, ' ')}</span>
                      <span>🔗</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 font-mono italic">No documents uploaded yet.</p>
              )}
            </div>

            {/* Gold Verification Images */}
            <div className="space-y-2 pt-4 border-t border-amber-500/5">
              <span className="text-xs text-slate-500 font-mono block">Gold Verification Images:</span>
              {((lead.gold_images && lead.gold_images.length > 0) || 
                ((lead as any).goldImages && (lead as any).goldImages.length > 0)) ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  {(lead.gold_images || (lead as any).goldImages).map((img: any) => (
                    <a 
                      key={img.id}
                      href={img.image_url || img.imageUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="group relative aspect-square rounded-xl overflow-hidden border border-amber-500/15 bg-slate-950/80 hover:border-amber-500/40 transition-all flex items-center justify-center"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={img.image_url || img.imageUrl} 
                        alt="Gold ornament verification" 
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center text-amber-400 text-lg">
                        🔎
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 font-mono italic">No gold images uploaded yet.</p>
              )}
            </div>
          </div>

          {/* Section 4: ACTIVE WORKFLOW ACTION FORM */}
          {currentStatus !== 'CASE_COMPLETED' && (
            <div className="bg-gradient-to-br from-[#3d1510]/60 to-[#471a15]/30 border border-amber-500/20 rounded-2xl p-6 space-y-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl"></div>
              
              <h3 className="font-bold text-lg text-amber-500 font-mono border-b border-amber-500/15 pb-2 flex items-center gap-2">
                <span>⚡</span> Active Action Form
              </h3>

              {/* 1. EXECUTIVE_ASSIGNED */}
              {currentStatus === 'EXECUTIVE_ASSIGNED' && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-300 font-sans leading-relaxed">
                    First step: Contact the customer to introduce yourself, discuss verification details, and coordinate the visit schedules.
                  </p>
                  <div>
                    <label className="block text-xs font-mono text-amber-500/70 mb-2 uppercase">Call Notes</label>
                    <textarea 
                      placeholder="Enter details of conversation..."
                      value={callNotes}
                      onChange={(e) => setCallNotes(e.target.value)}
                      className="w-full p-3 rounded-xl bg-[#300f0f]/50 border border-amber-500/15 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500/50 text-xs"
                      rows={3}
                    />
                  </div>
                  <button 
                    onClick={() => handleStatusChange('CUSTOMER_CALLED', { remarks: `Call notes: ${callNotes}. Call time: ${new Date().toLocaleTimeString()}` })}
                    disabled={submitting || !callNotes}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:brightness-110 active:scale-[0.98] text-slate-950 font-bold text-xs tracking-wider transition-all cursor-pointer disabled:opacity-50"
                  >
                    📞 RECORD CALL COMPLETED
                  </button>
                </div>
              )}

              {/* 2. CUSTOMER_CALLED */}
              {currentStatus === 'CUSTOMER_CALLED' && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-300 font-sans leading-relaxed">
                    Confirm a target visit date and time with the customer.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-mono text-amber-500/70 mb-2 uppercase">Visit Date</label>
                      <input 
                        type="date"
                        value={visitDate}
                        onChange={(e) => setVisitDate(e.target.value)}
                        className="w-full p-3 rounded-xl bg-[#300f0f]/50 border border-amber-500/15 text-slate-100 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono text-amber-500/70 mb-2 uppercase">Visit Time</label>
                      <input 
                        type="time"
                        value={visitTime}
                        onChange={(e) => setVisitTime(e.target.value)}
                        className="w-full p-3 rounded-xl bg-[#300f0f]/50 border border-amber-500/15 text-slate-100 text-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-amber-500/70 mb-2 uppercase">Remarks</label>
                    <textarea 
                      placeholder="e.g. Confirmed visit to Vijayawada branch location..."
                      value={visitRemarks}
                      onChange={(e) => setVisitRemarks(e.target.value)}
                      className="w-full p-3 rounded-xl bg-[#300f0f]/50 border border-amber-500/15 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500/50 text-xs"
                      rows={2}
                    />
                  </div>
                  <button 
                    onClick={() => handleStatusChange('VISIT_CONFIRMED', { remarks: `Visit scheduled on ${visitDate} at ${visitTime}. Notes: ${visitRemarks}` })}
                    disabled={submitting || !visitDate || !visitTime}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:brightness-110 active:scale-[0.98] text-slate-950 font-bold text-xs tracking-wider transition-all cursor-pointer disabled:opacity-50"
                  >
                    🚗 CONFIRM VISIT DETAILS
                  </button>
                </div>
              )}

              {/* 3. VISIT_CONFIRMED */}
              {currentStatus === 'VISIT_CONFIRMED' && (() => {
                const pendingFundRequest = lead.fund_requests?.find((r: any) => r.status === 'PENDING');

                return (
                  <div className="space-y-4">
                    {pendingFundRequest ? (
                      <>
                        <p className="text-xs text-slate-300 font-sans leading-relaxed">
                          A fund request has been submitted to the Managing Director and is awaiting review. Once approved, the status advances to <span className="text-amber-400 font-mono text-xs">MD_FUNDS_APPROVED</span>.
                        </p>
                        
                        <div className="p-4 rounded-xl bg-[#3d1510]/50 border border-amber-500/10 space-y-2">
                          <div className="flex justify-between items-center text-xs font-mono">
                            <span className="text-slate-400">Request Status:</span>
                            <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px] font-bold border border-amber-500/20">
                              WAITING FOR APPROVAL
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-xs font-mono">
                            <span className="text-slate-400">Requested Amount:</span>
                            <span className="text-slate-100 font-bold">₹{Number(pendingFundRequest.requested_amount).toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs font-mono">
                            <span className="text-slate-400">Request Date:</span>
                            <span className="text-slate-200">{new Date(pendingFundRequest.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-xs text-slate-300 font-sans leading-relaxed">
                          Enter the required buyout amount to request approval from the Managing Director.
                        </p>
                        
                        <div className="space-y-3">
                          <div>
                            <label className="block text-[10px] font-mono text-amber-500/70 mb-1.5 uppercase">Requested Amount (₹)</label>
                            <input 
                              type="number"
                              placeholder="Enter amount (e.g. 75000)"
                              value={requestedAmount}
                              onChange={(e) => setRequestedAmount(e.target.value)}
                              className="w-full p-3 rounded-xl bg-[#300f0f]/50 border border-amber-500/15 text-slate-100 text-xs font-mono focus:outline-none focus:border-amber-500/50"
                            />
                          </div>
                          <button 
                            onClick={handleRequestFunds}
                            disabled={submitting || !requestedAmount}
                            className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:brightness-110 active:scale-[0.98] text-slate-950 font-bold text-xs tracking-wider transition-all cursor-pointer disabled:opacity-50"
                          >
                            🚀 SEND TO MD FOR APPROVAL
                          </button>
                        </div>
                      </>
                    )}

                    <div className="pt-2 border-t border-amber-500/10">
                      <p className="text-[10px] text-slate-400 mb-2">Demo Simulation: Bypass wait state and approve funds</p>
                      <button 
                        onClick={handleSimulateFundsApproval}
                        disabled={submitting}
                        className="px-4 py-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/25 text-xs font-mono transition-all cursor-pointer"
                      >
                        🛡️ SIMULATE MD FUNDS APPROVAL
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* 4. MD_FUNDS_APPROVED */}
              {currentStatus === 'MD_FUNDS_APPROVED' && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-300 font-sans leading-relaxed text-green-400">
                    ✔ Funds approved! Ready to travel to the customer's branch/location.
                  </p>

                  <div className="p-4 rounded-xl bg-[#300f0f]/50 border border-amber-500/15 space-y-2 text-xs font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Approved Amount</span>
                      <span className="text-slate-100 font-bold">₹{Number(lead.loan_amount || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Approving User</span>
                      <span className="text-slate-100">Managing Director (MD)</span>
                    </div>
                  </div>

                  <button 
                    onClick={() => handleStatusChange('JOURNEY_STARTED', { remarks: 'Executive started journey to location' })}
                    disabled={submitting}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:brightness-110 active:scale-[0.98] text-slate-950 font-bold text-xs tracking-wider transition-all cursor-pointer disabled:opacity-50"
                  >
                    🚗 START JOURNEY NOW
                  </button>
                </div>
              )}

              {/* 5. JOURNEY_STARTED */}
              {currentStatus === 'JOURNEY_STARTED' && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-300 font-sans leading-relaxed">
                    You are currently traveling. Record your arrival once you reach the customer.
                  </p>
                  <button 
                    onClick={() => handleStatusChange('REACHED_CUSTOMER', { remarks: 'Executive reached customer location' })}
                    disabled={submitting}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:brightness-110 active:scale-[0.98] text-slate-950 font-bold text-xs tracking-wider transition-all cursor-pointer disabled:opacity-50"
                  >
                    📍 REACHED CUSTOMER LOCATION
                  </button>
                </div>
              )}

              {/* 6. REACHED_CUSTOMER */}
              {currentStatus === 'REACHED_CUSTOMER' && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-300 font-sans leading-relaxed">
                    Conducted the verification meeting. Enter notes summarizing the discussion.
                  </p>
                  <div>
                    <label className="block text-xs font-mono text-amber-500/70 mb-2 uppercase">Discussion Notes</label>
                    <textarea 
                      placeholder="e.g. Customer verified interest in releasing pledged gold from bank..."
                      value={discussionNotes}
                      onChange={(e) => setDiscussionNotes(e.target.value)}
                      className="w-full p-3 rounded-xl bg-[#300f0f]/50 border border-amber-500/15 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500/50 text-xs"
                      rows={3}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox"
                      id="confirmation"
                      checked={customerConfirmation}
                      onChange={(e) => setCustomerConfirmation(e.target.checked)}
                      className="w-4 h-4 accent-amber-500"
                    />
                    <label htmlFor="confirmation" className="text-xs text-slate-300 select-none">
                      Customer confirms details and signature terms
                    </label>
                  </div>
                  <button 
                    onClick={() => handleStatusChange('CUSTOMER_INTERACTION', { discussionNotes, customerConfirmation })}
                    disabled={submitting || !discussionNotes || !customerConfirmation}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:brightness-110 active:scale-[0.98] text-slate-950 font-bold text-xs tracking-wider transition-all cursor-pointer disabled:opacity-50"
                  >
                    🏁 SUBMIT DISCUSSION NOTES
                  </button>
                </div>
              )}

              {/* 7. CUSTOMER_INTERACTION */}
              {currentStatus === 'CUSTOMER_INTERACTION' && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-300 font-sans leading-relaxed">
                    Verify the pledge and loan details at the bank or branch location.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-mono text-amber-500/70 mb-2 uppercase">Bank/Vendor Name</label>
                      <input 
                        type="text"
                        placeholder="e.g. SBI Bank"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        className="w-full p-3 rounded-xl bg-[#300f0f]/50 border border-amber-500/15 text-slate-100 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono text-amber-500/70 mb-2 uppercase">Vendor/Branch Name</label>
                      <input 
                        type="text"
                        placeholder="e.g. Main Branch"
                        value={vendorName}
                        onChange={(e) => setVendorName(e.target.value)}
                        className="w-full p-3 rounded-xl bg-[#300f0f]/50 border border-amber-500/15 text-slate-100 text-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-amber-500/70 mb-2 uppercase">Verification Notes</label>
                    <textarea 
                      placeholder="Enter verification notes or discrepancies..."
                      value={verificationNotes}
                      onChange={(e) => setVerificationNotes(e.target.value)}
                      className="w-full p-3 rounded-xl bg-[#300f0f]/50 border border-amber-500/15 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500/50 text-xs"
                      rows={2}
                    />
                  </div>
                  <button 
                    onClick={() => handleStatusChange('BANK_VISIT', { bankName, vendorName, verificationNotes })}
                    disabled={submitting || !bankName}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:brightness-110 active:scale-[0.98] text-slate-950 font-bold text-xs tracking-wider transition-all cursor-pointer disabled:opacity-50"
                  >
                    🏦 RECORD BANK VISIT COMPLETE
                  </button>
                </div>
              )}

              {/* 8. BANK_VISIT */}
              {currentStatus === 'BANK_VISIT' && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-300 font-sans leading-relaxed">
                    Upload copies of the finalized buyout agreement and customer KYC documents.
                  </p>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-mono text-amber-500/70 mb-1 uppercase">Agreement Copy (PDF/Image)</label>
                      <input 
                        type="file" 
                        onChange={(e) => setAgreementCopy(e.target.files ? e.target.files[0] : null)}
                        className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-500/10 file:text-amber-400 hover:file:bg-amber-500/20 file:cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono text-amber-500/70 mb-1 uppercase">KYC Copy (PDF/Image)</label>
                      <input 
                        type="file" 
                        onChange={(e) => setKycCopy(e.target.files ? e.target.files[0] : null)}
                        className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-500/10 file:text-amber-400 hover:file:bg-amber-500/20 file:cursor-pointer"
                      />
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      const formData = new FormData();
                      if (agreementCopy) formData.append('agreementCopy', agreementCopy);
                      if (kycCopy) formData.append('kycCopy', kycCopy);
                      formData.append('remarks', `Uploaded documents: ${agreementCopy?.name || 'N/A'}, KYC: ${kycCopy?.name || 'N/A'}`);
                      handleStatusChange('AGREEMENT_PENDING', formData);
                    }}
                    disabled={submitting || !agreementCopy || !kycCopy}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:brightness-110 active:scale-[0.98] text-slate-950 font-bold text-xs tracking-wider transition-all cursor-pointer disabled:opacity-50"
                  >
                    📁 UPLOAD AGREEMENTS
                  </button>
                </div>
              )}

              {/* 9. AGREEMENT_PENDING */}
              {currentStatus === 'AGREEMENT_PENDING' && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-300 font-sans leading-relaxed">
                    Make the buyout payment to release the gold. Upload transaction details and payment proof receipt.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-mono text-amber-500/70 mb-2 uppercase">Loan Amount Paid (₹)</label>
                      <input 
                        type="number"
                        placeholder="e.g. 50000"
                        value={loanAmountPaid}
                        onChange={(e) => setLoanAmountPaid(e.target.value)}
                        className="w-full p-3 rounded-xl bg-[#300f0f]/50 border border-amber-500/15 text-slate-100 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono text-amber-500/70 mb-2 uppercase">Transaction No.</label>
                      <input 
                        type="text"
                        placeholder="UTR / Tx ID"
                        value={paymentTx}
                        onChange={(e) => setPaymentTx(e.target.value)}
                        className="w-full p-3 rounded-xl bg-[#300f0f]/50 border border-amber-500/15 text-slate-100 text-xs font-mono"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-mono text-amber-500/70 mb-2 uppercase">Payment Date</label>
                      <input 
                        type="date"
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                        className="w-full p-3 rounded-xl bg-[#300f0f]/50 border border-amber-500/15 text-slate-100 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono text-amber-500/70 mb-1 uppercase">Payment Proof</label>
                      <input 
                        type="file" 
                        onChange={(e) => setPaymentProof(e.target.files ? e.target.files[0] : null)}
                        className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-500/10 file:text-amber-400 hover:file:bg-amber-500/20 file:cursor-pointer"
                      />
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      const formData = new FormData();
                      formData.append('loanAmountPaid', loanAmountPaid);
                      formData.append('transactionNumber', paymentTx);
                      if (paymentDate) formData.append('paymentDate', paymentDate);
                      if (paymentProof) formData.append('paymentProof', paymentProof);
                      handleStatusChange('PAYMENT_COMPLETED', formData);
                    }}
                    disabled={submitting || !loanAmountPaid || !paymentTx}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:brightness-110 active:scale-[0.98] text-slate-950 font-bold text-xs tracking-wider transition-all cursor-pointer disabled:opacity-50"
                  >
                    💳 COMPLETE LOAN PAYMENT
                  </button>
                </div>
              )}

              {/* 10. PAYMENT_COMPLETED */}
              {currentStatus === 'PAYMENT_COMPLETED' && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-300 font-sans leading-relaxed">
                    Verify and record the weight specifications of the gold collection.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
                    <div>
                      <label className="block text-amber-500/70 mb-2 uppercase text-[10px]">Gross Weight (g)</label>
                      <input 
                        type="number"
                        placeholder="e.g. 24.5"
                        value={grossWeight}
                        onChange={(e) => setGrossWeight(e.target.value)}
                        className="w-full p-3 rounded-xl bg-[#300f0f]/50 border border-amber-500/15 text-slate-100 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-amber-500/70 mb-2 uppercase text-[10px]">Net Weight (g)</label>
                      <input 
                        type="number"
                        placeholder="e.g. 23.1"
                        value={netWeight}
                        onChange={(e) => setNetWeight(e.target.value)}
                        className="w-full p-3 rounded-xl bg-[#300f0f]/50 border border-amber-500/15 text-slate-100 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-amber-500/70 mb-2 uppercase text-[10px]">Purity (%)</label>
                      <select 
                        value={purity}
                        onChange={(e) => setPurity(e.target.value)}
                        className="w-full p-3 rounded-xl bg-[#300f0f]/50 border border-amber-500/15 text-slate-100 text-xs"
                      >
                        <option value="91.6">22 Karat (91.6%)</option>
                        <option value="75.0">18 Karat (75.0%)</option>
                        <option value="99.9">24 Karat (99.9%)</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-amber-500/70 mb-2 uppercase">Collection Remarks</label>
                    <textarea 
                      placeholder="Add any details about gold quality or ornaments..."
                      value={goldRemarks}
                      onChange={(e) => setGoldRemarks(e.target.value)}
                      className="w-full p-3 rounded-xl bg-[#300f0f]/50 border border-amber-500/15 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500/50 text-xs"
                      rows={2}
                    />
                  </div>
                  <button 
                    onClick={() => handleStatusChange('GOLD_RECEIVED', { grossWeight, netWeight, purity, remarks: goldRemarks })}
                    disabled={submitting || !grossWeight || !netWeight}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:brightness-110 active:scale-[0.98] text-slate-950 font-bold text-xs tracking-wider transition-all cursor-pointer disabled:opacity-50"
                  >
                    🏆 SAVE COLLECTION DETAILS
                  </button>
                </div>
              )}

              {/* 11. GOLD_RECEIVED */}
              {currentStatus === 'GOLD_RECEIVED' && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-300 font-sans leading-relaxed">
                    Settle the balance amount payout for the buyout.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-mono text-amber-500/70 mb-2 uppercase">Balance (₹)</label>
                      <input 
                        type="number"
                        placeholder="Balance paid"
                        value={balanceAmount}
                        onChange={(e) => setBalanceAmount(e.target.value)}
                        className="w-full p-3 rounded-xl bg-[#300f0f]/50 border border-amber-500/15 text-slate-100 text-xs font-mono"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-mono text-amber-500/70 mb-2 uppercase">Transaction Number</label>
                      <input 
                        type="text"
                        placeholder="UTR / Tx ID"
                        value={balanceTx}
                        onChange={(e) => setBalanceTx(e.target.value)}
                        className="w-full p-3 rounded-xl bg-[#300f0f]/50 border border-amber-500/15 text-slate-100 text-xs font-mono"
                      />
                    </div>
                  </div>
                  <button 
                    onClick={() => handleStatusChange('BALANCE_SETTLED', { balanceAmount, transactionNumber: balanceTx, paymentDate: balanceDate })}
                    disabled={submitting || !balanceAmount || !balanceTx}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:brightness-110 active:scale-[0.98] text-slate-950 font-bold text-xs tracking-wider transition-all cursor-pointer disabled:opacity-50"
                  >
                    💵 RECORD BALANCE SETTLEMENT
                  </button>
                </div>
              )}

              {/* 12. BALANCE_SETTLED */}
              {currentStatus === 'BALANCE_SETTLED' && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-300 font-sans leading-relaxed">
                    Upload verification images of the collected gold articles. At least one image is required.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-mono text-amber-500/70 mb-1">Gold Image 1</label>
                      <input type="file" onChange={(e) => setGoldImg1(e.target.files ? e.target.files[0] : null)} className="w-full text-[10px] text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded file:bg-amber-500/10 file:text-amber-450" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono text-amber-500/70 mb-1">Gold Image 2</label>
                      <input type="file" onChange={(e) => setGoldImg2(e.target.files ? e.target.files[0] : null)} className="w-full text-[10px] text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded file:bg-amber-500/10 file:text-amber-450" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono text-amber-500/70 mb-1">Gold Image 3</label>
                      <input type="file" onChange={(e) => setGoldImg3(e.target.files ? e.target.files[0] : null)} className="w-full text-[10px] text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded file:bg-amber-500/10 file:text-amber-450" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono text-amber-500/70 mb-1">Gold Image 4</label>
                      <input type="file" onChange={(e) => setGoldImg4(e.target.files ? e.target.files[0] : null)} className="w-full text-[10px] text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded file:bg-amber-500/10 file:text-amber-450" />
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      const formData = new FormData();
                      if (goldImg1) formData.append('image1', goldImg1);
                      if (goldImg2) formData.append('image2', goldImg2);
                      if (goldImg3) formData.append('image3', goldImg3);
                      if (goldImg4) formData.append('image4', goldImg4);
                      handleStatusChange('IMAGES_UPLOADED', formData);
                    }}
                    disabled={submitting || (!goldImg1 && !goldImg2 && !goldImg3 && !goldImg4)}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:brightness-110 active:scale-[0.98] text-slate-950 font-bold text-xs tracking-wider transition-all cursor-pointer disabled:opacity-50"
                  >
                    📷 UPLOAD VERIFIED GOLD IMAGES
                  </button>
                </div>
              )}

              {/* 13. IMAGES_UPLOADED */}
              {currentStatus === 'IMAGES_UPLOADED' && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-300 font-sans leading-relaxed text-green-400">
                    ✔ All images uploaded successfully. Ready for case closure.
                  </p>
                  <div>
                    <label className="block text-xs font-mono text-amber-500/70 mb-2 uppercase">Final Closure Remarks</label>
                    <textarea 
                      placeholder="Remarks detailing complete release and verification..."
                      value={finalRemarks}
                      onChange={(e) => setFinalRemarks(e.target.value)}
                      className="w-full p-3 rounded-xl bg-[#300f0f]/50 border border-amber-500/15 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500/50 text-xs"
                      rows={3}
                    />
                  </div>
                  <button 
                    onClick={() => handleStatusChange('CASE_COMPLETED', { remarks: finalRemarks })}
                    disabled={submitting}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:brightness-110 active:scale-[0.98] text-slate-950 font-bold text-xs tracking-wider transition-all cursor-pointer disabled:opacity-50"
                  >
                    🏁 COMPLETE CASE CLOSURE
                  </button>
                </div>
              )}

            </div>
          )}

        </div>

        {/* Right Column: Timeline Panel */}
        <div className="space-y-6">
          
          <div className="bg-[#3d1510]/30 border border-amber-500/10 rounded-2xl p-6 h-[500px] flex flex-col">
            <h3 className="font-bold text-sm font-mono tracking-wider text-amber-500 uppercase border-b border-amber-500/15 pb-2 mb-4">
              📌 Lead Journey Timeline
            </h3>

            {/* Timeline Scroll Box */}
            <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar text-xs font-mono relative">
              
              <div className="absolute left-3.5 top-2 bottom-2 w-0.5 bg-amber-500/10 z-0"></div>

              {lead.lead_timeline && lead.lead_timeline.length > 0 ? (
                lead.lead_timeline.map((event, idx) => {
                  const dateStr = new Date(event.created_at).toLocaleDateString();
                  const timeStr = new Date(event.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  return (
                    <div key={event.id} className="flex gap-4 relative z-10">
                      
                      {/* Node indicator */}
                      <div className="w-8 h-8 rounded-full bg-[#3d1510] border border-amber-500/40 text-amber-400 flex items-center justify-center font-bold text-[10px] shrink-0 shadow-md">
                        {idx + 1}
                      </div>

                      {/* Content */}
                      <div className="space-y-1 py-1">
                        <div className="flex items-center gap-2">
                          <span className="text-amber-500/90 uppercase text-[10px] font-bold tracking-wider">{event.status.replace(/_/g, ' ')}</span>
                          <span className="text-slate-500 text-[9px]">{timeStr} ({dateStr})</span>
                        </div>
                        <p className="text-slate-300 font-sans text-xs">{event.remarks || 'No notes'}</p>
                      </div>

                    </div>
                  );
                })
              ) : (
                <div className="text-center text-slate-500 italic py-8">
                  Timeline empty. Complete step actions to generate milestones.
                </div>
              )}

            </div>
          </div>

          {/* Quick Actions bottom/right cards */}
          <div className="bg-[#3d1510]/30 border border-amber-500/10 rounded-2xl p-6 space-y-4">
            <h4 className="text-xs font-mono text-amber-500/70 tracking-widest uppercase border-b border-amber-500/10 pb-2">Quick Actions (Current Status)</h4>
            <div className="space-y-2">
              <button 
                disabled={currentStatus !== 'EXECUTIVE_ASSIGNED'}
                className="w-full py-2.5 rounded-xl border border-amber-500/20 text-xs font-mono hover:bg-amber-500/5 transition-all text-left px-4 flex justify-between items-center disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <span>📞 Call Customer</span>
                {currentStatus === 'EXECUTIVE_ASSIGNED' && <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping"></span>}
              </button>
              <button 
                disabled={currentStatus !== 'MD_FUNDS_APPROVED'}
                className="w-full py-2.5 rounded-xl border border-amber-500/20 text-xs font-mono hover:bg-amber-500/5 transition-all text-left px-4 flex justify-between items-center disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <span>🚗 Start Journey</span>
                {currentStatus === 'MD_FUNDS_APPROVED' && <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping"></span>}
              </button>
              <button 
                disabled={currentStatus !== 'JOURNEY_STARTED'}
                className="w-full py-2.5 rounded-xl border border-amber-500/20 text-xs font-mono hover:bg-amber-500/5 transition-all text-left px-4 flex justify-between items-center disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <span>📍 Reached Location</span>
                {currentStatus === 'JOURNEY_STARTED' && <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping"></span>}
              </button>
              <button 
                disabled={currentStatus !== 'CUSTOMER_INTERACTION'}
                className="w-full py-2.5 rounded-xl border border-amber-500/20 text-xs font-mono hover:bg-amber-500/5 transition-all text-left px-4 flex justify-between items-center disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <span>🏦 Bank Visit</span>
                {currentStatus === 'CUSTOMER_INTERACTION' && <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping"></span>}
              </button>
              <button 
                disabled={currentStatus !== 'AGREEMENT_PENDING'}
                className="w-full py-2.5 rounded-xl border border-amber-500/20 text-xs font-mono hover:bg-amber-500/5 transition-all text-left px-4 flex justify-between items-center disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <span>💳 Payment Done</span>
                {currentStatus === 'AGREEMENT_PENDING' && <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping"></span>}
              </button>
              <button 
                disabled={currentStatus !== 'PAYMENT_COMPLETED'}
                className="w-full py-2.5 rounded-xl border border-amber-500/20 text-xs font-mono hover:bg-amber-500/5 transition-all text-left px-4 flex justify-between items-center disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <span>🏆 Gold Received</span>
                {currentStatus === 'PAYMENT_COMPLETED' && <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping"></span>}
              </button>
              <button 
                disabled={currentStatus !== 'BALANCE_SETTLED'}
                className="w-full py-2.5 rounded-xl border border-amber-500/20 text-xs font-mono hover:bg-amber-500/5 transition-all text-left px-4 flex justify-between items-center disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <span>📷 Upload Images</span>
                {currentStatus === 'BALANCE_SETTLED' && <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping"></span>}
              </button>
              <button 
                disabled={currentStatus !== 'IMAGES_UPLOADED'}
                className="w-full py-2.5 rounded-xl border border-amber-500/20 text-xs font-mono hover:bg-amber-500/5 transition-all text-left px-4 flex justify-between items-center disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <span>🏁 Complete Case</span>
                {currentStatus === 'IMAGES_UPLOADED' && <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping"></span>}
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* Document Preview Modal */}
      {previewDocUrl && (
        <div 
          className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn"
          onClick={() => {
            setPreviewDocUrl(null);
            setPreviewDocType(null);
            setPreviewDocName(null);
          }}
        >
          <div 
            className="relative max-w-4xl w-full bg-[#3d1510]/95 border border-amber-500/15 p-4 rounded-2xl flex flex-col gap-4 text-left shadow-2xl animate-scaleUp max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => {
                setPreviewDocUrl(null);
                setPreviewDocType(null);
                setPreviewDocName(null);
              }}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center hover:brightness-110 shadow-lg cursor-pointer"
            >
              ✕
            </button>
            
            <div className="flex justify-between items-center border-b border-amber-500/15 pb-2">
              <h4 className="text-sm font-mono font-bold text-amber-500 uppercase">
                Preview: {previewDocType?.replace(/_/g, ' ')}
              </h4>
              <button
                onClick={() => downloadDocument(previewDocUrl, `${previewDocName || 'document'}`)}
                className="px-3 py-1 bg-amber-500 text-slate-950 text-xs font-bold font-mono rounded hover:brightness-110 transition-all cursor-pointer"
              >
                📥 DOWNLOAD FILE
              </button>
            </div>

            <div className="flex-1 overflow-auto rounded-xl border border-amber-500/5 min-h-[50vh] flex items-center justify-center bg-black/40">
              {previewDocUrl.startsWith('data:application/pdf') || previewDocUrl.endsWith('.pdf') ? (
                <iframe 
                  src={previewDocUrl} 
                  className="w-full h-[60vh] rounded-lg bg-white" 
                  title="PDF Preview"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={previewDocUrl} 
                  alt="Document Preview" 
                  className="max-w-full max-h-[60vh] object-contain"
                />
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
