'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '../../../../lib/api';
import { toast } from 'sonner';
import { TableSkeleton } from '../../../../components/ui/SkeletonLoaders';


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
  created_at: string;
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

const STATUS_STEPS = [
  { status: 'CUSTOMER_CALLED', label: 'Customer Called', icon: '📞' },
  { status: 'VISIT_CONFIRMED', label: 'Visit Confirmed', icon: '📅' },
  { status: 'MD_FUNDS_APPROVED', label: 'MD Funds Approved', icon: '💰' },
  { status: 'JOURNEY_STARTED', label: 'Journey Started', icon: '🚗' },
  { status: 'REACHED_CUSTOMER', label: 'Reached Customer', icon: '📍' },
  { status: 'CUSTOMER_INTERACTION', label: 'Customer Interaction', icon: '🤝' },
  { status: 'BANK_VISIT', label: 'Bank Visit', icon: '🏦' },
  { status: 'AGREEMENT_PENDING', label: 'Agreement Pending', icon: '📄' },
  { status: 'PAYMENT_COMPLETED', label: 'Payment Done', icon: '💳' },
  { status: 'GOLD_RECEIVED', label: 'Receiving Gold', icon: '🏆' },
  { status: 'BALANCE_SETTLED', label: 'Settling Balance', icon: '⚖️' },
  { status: 'IMAGES_UPLOADED', label: 'Images Upload', icon: '📷' },
  { status: 'CASE_COMPLETED', label: 'Case Closed', icon: '🏁' },
];

const getActiveStepIndex = (status: string): number => {
  const normStatus = status.toUpperCase().replace(/[\s_]+/g, '_');
  switch (normStatus) {
    case 'EXECUTIVE_ASSIGNED': return 0;
    case 'CUSTOMER_CALLED': return 1;
    case 'VISIT_CONFIRMED': return 2;
    case 'MD_FUNDS_APPROVED': return 3;
    case 'JOURNEY_STARTED': return 4;
    case 'REACHED_CUSTOMER': return 5;
    case 'CUSTOMER_INTERACTION': return 6;
    case 'BANK_VISIT': return 7;
    case 'AGREEMENT_PENDING': return 8;
    case 'PAYMENT_COMPLETED': return 9;
    case 'GOLD_RECEIVED': return 10;
    case 'BALANCE_SETTLED': return 11;
    case 'IMAGES_UPLOADED': return 12;
    case 'CASE_COMPLETED': return 13;
    default: return 0;
  }
};

export default function LeadDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: leadId } = use(params);

  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [optimisticTimelineEntry, setOptimisticTimelineEntry] = useState<TimelineEvent | null>(null);

  // Form states for each step
  const [callNotes, setCallNotes] = useState('');
  const [visitDate, setVisitDate] = useState('');
  const [visitTime, setVisitTime] = useState('');
  const [visitRemarks, setVisitRemarks] = useState('');
  const [houseImage, setHouseImage] = useState<File | null>(null);
  
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

  // Bank visit proof
  const [bankImage, setBankImage] = useState<File | null>(null);

  // Persistent bank visit proof upload (at the bottom of page details)
  const [persistentBankImage, setPersistentBankImage] = useState<File | null>(null);

  // Gold images upload
  const [goldImg1, setGoldImg1] = useState<File | null>(null);
  const [goldImg2, setGoldImg2] = useState<File | null>(null);
  const [goldImg3, setGoldImg3] = useState<File | null>(null);
  const [goldImg4, setGoldImg4] = useState<File | null>(null);

  // Case completion
  const [finalRemarks, setFinalRemarks] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');

  // Fund request amount
  const [requestedAmount, setRequestedAmount] = useState('');

  // Document Preview Modal states
  const [previewDocUrl, setPreviewDocUrl] = useState<string | null>(null);
  const [previewDocType, setPreviewDocType] = useState<string | null>(null);
  const [previewDocName, setPreviewDocName] = useState<string | null>(null);
  const [timelineCollapsed, setTimelineCollapsed] = useState(true);
  const validateSelectedFile = (file: File | null): boolean => {
    if (!file) return true;
    const allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png'];
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    if (!fileExt || !allowedExtensions.includes(fileExt)) {
      alert('Invalid file type. Only PDF, JPG, JPEG, and PNG files are allowed.');
      return false;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('File size exceeds the 10MB limit.');
      return false;
    }
    return true;
  };

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

    // Timeline optimistic entry:
    setOptimisticTimelineEntry({
      id: 'optimistic',
      status: targetStatus,
      remarks: 'Updating status... (Updating...)',
      created_at: new Date().toISOString()
    });

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
      
      // Update optimistic entry to Success:
      setOptimisticTimelineEntry({
        id: 'optimistic-success',
        status: targetStatus,
        remarks: 'Completed ✓',
        created_at: new Date().toISOString()
      });
      setTimeout(() => setOptimisticTimelineEntry(null), 2000);
      
      toast.success(`Status updated to ${targetStatus.replace(/_/g, ' ')} successfully!`);

      // Reload
      await loadLeadDetails();
      
      // Clear forms
      setCallNotes('');
      setVisitRemarks('');
      setDiscussionNotes('');
      setVerificationNotes('');
      setHouseImage(null);
    } catch (err: any) {
      setError(err.message);
      
      // Update optimistic entry to Failed:
      setOptimisticTimelineEntry({
        id: 'optimistic-failed',
        status: targetStatus,
        remarks: `Failed ✗ (${err.message})`,
        created_at: new Date().toISOString()
      });
      setTimeout(() => setOptimisticTimelineEntry(null), 3000);
      
      toast.error(`Failed to update status: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePersistentBankImageUpload = async () => {
    if (!persistentBankImage) {
      setError('Please select a file to upload.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('leadId', leadId);
      formData.append('bankImage', persistentBankImage);

      await apiRequest('/executive/upload-bank-image', {
        method: 'POST',
        body: formData,
      });

      // Clear selection
      setPersistentBankImage(null);
      
      // Reload lead details
      await loadLeadDetails();
      
      toast.success('Bank image proof uploaded successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to upload bank image');
      toast.error(err.message || 'Failed to upload bank image');
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

    setOptimisticTimelineEntry({
      id: 'optimistic',
      status: 'FUND_REQUEST_SUBMITTED',
      remarks: `Requesting buyout funds of ₹${requestedAmount}... (Updating...)`,
      created_at: new Date().toISOString()
    });

    try {
      await apiRequest('/executive/request-funds', {
        method: 'POST',
        body: JSON.stringify({
          leadId,
          requestedAmount: Number(requestedAmount)
        })
      });

      setOptimisticTimelineEntry({
        id: 'optimistic-success',
        status: 'FUND_REQUEST_SUBMITTED',
        remarks: 'Completed ✓',
        created_at: new Date().toISOString()
      });
      setTimeout(() => setOptimisticTimelineEntry(null), 2000);

      toast.success("Fund request submitted successfully!");
      setRequestedAmount('');
      await loadLeadDetails();
    } catch (err: any) {
      setError(err.message || 'Failed to submit fund request.');

      setOptimisticTimelineEntry({
        id: 'optimistic-failed',
        status: 'FUND_REQUEST_SUBMITTED',
        remarks: `Failed ✗ (${err.message})`,
        created_at: new Date().toISOString()
      });
      setTimeout(() => setOptimisticTimelineEntry(null), 3000);

      toast.error(err.message || 'Failed to submit fund request.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6 animate-pulse">
        <div className="h-10 w-1/3 bg-slate-200 rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <TableSkeleton rows={4} cols={4} />
            <div className="h-40 bg-slate-250 bg-slate-200 rounded-2xl" />
          </div>
          <div>
            <TableSkeleton rows={6} cols={2} />
          </div>
        </div>
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
    <div className="space-y-6 animate-fadeIn pb-12 text-slate-800">
      
      {/* Top Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push('/executive/assigned')}
            className="text-[#c3902c] hover:text-amber-600 text-xs font-bold hover:scale-105 transition-transform cursor-pointer"
          >
            ← Back to Assigned
          </button>
          <span className="text-slate-300">|</span>
          <span className="text-xs font-semibold text-slate-500">Lead ID: {lead.lead_number || lead.id.slice(0, 8)}</span>
        </div>
        <div className="self-start sm:self-auto">
          <span className="inline-block px-3 py-1 rounded bg-amber-100 border border-amber-200 text-amber-700 text-xs font-bold uppercase">
            Status: {lead.current_status.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold leading-tight flex items-center gap-2">
          <svg className="w-4 h-4 text-red-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>ERROR: {error}</span>
        </div>
      )}

      {/* Main Grid: Left = Info + Current Action Form, Right = Journey Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Columns */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Section 1: Customer Details */}
          <div className="bg-white border border-slate-200/80 shadow-sm rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">Customer Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              <div>
                <span className="text-slate-400 block mb-1">Customer Name</span>
                <span className="text-slate-800 text-sm font-sans font-bold">{lead.customer_name}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">Mobile Number</span>
                <span className="text-slate-800 text-sm font-sans font-semibold">{lead.mobile}</span>
              </div>
              {lead.alternate_mobile && (
                <div>
                  <span className="text-slate-400 block mb-1">Alternate Number</span>
                  <span className="text-slate-800 text-sm font-sans">{lead.alternate_mobile}</span>
                </div>
              )}
              <div className="md:col-span-2">
                <span className="text-slate-400 block mb-1">Address</span>
                <span className="text-slate-800 text-sm font-sans">{lead.address || 'N/A'}, {lead.district || ''}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Gold & Bank Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Gold details */}
            <div className="bg-white border border-slate-200/80 shadow-sm rounded-2xl p-6 space-y-4">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">Gold Details</h3>
              <div className="space-y-3 text-xs font-mono">
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-450">Weight</span>
                  <span className="text-slate-800 font-bold">{lead.gold_weight ? `${lead.gold_weight}g` : 'N/A'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-450">Type</span>
                  <span className="text-slate-800 font-bold">{lead.gold_type || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-450">Estimated Value</span>
                  <span className="text-amber-700 font-extrabold">₹{Number(lead.estimated_value || 0).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Bank details */}
            <div className="bg-white border border-slate-200/80 shadow-sm rounded-2xl p-6 space-y-4">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">Bank Details</h3>
              <div className="space-y-3 text-xs font-mono">
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-450">Bank Name</span>
                  <span className="text-slate-800 font-bold">{lead.bank_name || 'N/A'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-450">Branch Name</span>
                  <span className="text-slate-800 font-bold">{lead.branch_name || 'N/A'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-450">Loan Amount</span>
                  <span className="text-slate-800 font-bold">₹{Number(lead.loan_amount || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-450">Loan Account No.</span>
                  <span className="text-slate-800 break-all font-bold">{lead.loan_account_number || 'N/A'}</span>
                </div>
              </div>
            </div>

          </div>

          {/* Section 3: RM remarks & Documents */}
          <div className="bg-white border border-slate-200/80 shadow-sm rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">RM Remarks & Documents</h3>
            
            {lead.remarks && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-205 mb-4">
                <p className="text-xs text-[#c3902c] font-bold mb-1">RM Notes:</p>
                <p className="text-sm text-slate-800 font-sans">{lead.remarks}</p>
              </div>
            )}

            <div className="space-y-2">
              <span className="text-xs text-slate-500 font-bold block">Uploaded Documents:</span>
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
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-amber-500/35 text-xs font-semibold text-[#c3902c] flex items-center justify-between transition-colors text-left w-full cursor-pointer hover:bg-white"
                    >
                      <span className="truncate">
                        {(doc.document_type || doc.documentType || 'Document') === 'OTHER' ? 'House Visit Proof' : (doc.document_type || doc.documentType || 'Document').replace(/_/g, ' ')}
                      </span>
                      <svg className="w-3.5 h-3.5 text-[#c3902c] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-450 italic">No documents uploaded yet.</p>
              )}
            </div>

            {/* Gold Verification Images */}
            <div className="space-y-2 pt-4 border-t border-slate-100">
              <span className="text-xs text-slate-500 font-bold block">Gold Verification Images:</span>
              {((lead.gold_images && lead.gold_images.length > 0) || 
                ((lead as any).goldImages && (lead as any).goldImages.length > 0)) ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  {(lead.gold_images || (lead as any).goldImages).map((img: any) => (
                    <a 
                      key={img.id}
                      href={img.image_url || img.imageUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="group relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-50 hover:border-amber-500/40 transition-all flex items-center justify-center"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={img.image_url || img.imageUrl} 
                        alt="Gold ornament verification" 
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center text-amber-400">
                        <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-450 italic">No gold images uploaded yet.</p>
              )}
            </div>
          </div>

          {/* Section 4: ACTIVE WORKFLOW ACTION FORM */}
          {currentStatus !== 'CASE_COMPLETED' && (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-6 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl"></div>
              
              <h3 className="font-bold text-lg text-amber-600 border-b border-slate-100 pb-2 flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Active Action Form
              </h3>

              {/* 1. EXECUTIVE_ASSIGNED */}
              {currentStatus === 'EXECUTIVE_ASSIGNED' && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-600 font-sans leading-relaxed">
                    First step: Contact the customer to introduce yourself, discuss verification details, and coordinate the visit schedules.
                  </p>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Call Notes</label>
                    <textarea 
                      placeholder="Enter details of conversation..."
                      value={callNotes}
                      onChange={(e) => setCallNotes(e.target.value)}
                      className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-850 placeholder-slate-400 focus:outline-none focus:border-amber-500/50 focus:bg-white text-xs"
                      rows={3}
                    />
                  </div>
                  <button 
                    onClick={() => handleStatusChange('CUSTOMER_CALLED', { remarks: `Call notes: ${callNotes}. Call time: ${new Date().toLocaleTimeString()}` })}
                    disabled={submitting || !callNotes}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:brightness-110 active:scale-[0.98] text-slate-950 font-bold text-xs tracking-wider transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-md"
                  >
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    RECORD CALL COMPLETED
                  </button>
                </div>
              )}

              {/* 2. CUSTOMER_CALLED */}
              {currentStatus === 'CUSTOMER_CALLED' && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-600 font-sans leading-relaxed">
                    Confirm a target visit date and time with the customer.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Visit Date</label>
                      <input 
                        type="date"
                        value={visitDate}
                        onChange={(e) => setVisitDate(e.target.value)}
                        className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-850 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Visit Time</label>
                      <input 
                        type="time"
                        value={visitTime}
                        onChange={(e) => setVisitTime(e.target.value)}
                        className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-850 text-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Remarks</label>
                    <textarea 
                      placeholder="e.g. Confirmed visit to Vijayawada branch location..."
                      value={visitRemarks}
                      onChange={(e) => setVisitRemarks(e.target.value)}
                      className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-850 placeholder-slate-400 focus:outline-none focus:border-amber-500/50 focus:bg-white text-xs"
                      rows={2}
                    />
                  </div>
                  <button 
                    onClick={() => handleStatusChange('VISIT_CONFIRMED', { remarks: `Visit scheduled on ${visitDate} at ${visitTime}. Notes: ${visitRemarks}` })}
                    disabled={submitting || !visitDate || !visitTime}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:brightness-110 active:scale-[0.98] text-slate-950 font-bold text-xs tracking-wider transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-md"
                  >
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    CONFIRM VISIT DETAILS
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
                        <p className="text-xs text-slate-600 font-sans leading-relaxed">
                          A fund request has been submitted to the Managing Director and is awaiting review. Once approved, the status advances to <span className="text-amber-700 font-bold text-xs">MD_FUNDS_APPROVED</span>.
                        </p>
                        
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                          <div className="flex justify-between items-center text-xs font-mono">
                            <span className="text-slate-500">Request Status:</span>
                            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px] font-bold border border-amber-200">
                              WAITING FOR APPROVAL
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-xs font-mono">
                            <span className="text-slate-500">Requested Amount:</span>
                            <span className="text-slate-800 font-bold">₹{Number(pendingFundRequest.requested_amount).toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs font-mono">
                            <span className="text-slate-500">Request Date:</span>
                            <span className="text-slate-650">
                              {pendingFundRequest.created_at 
                                ? new Date(pendingFundRequest.created_at).toLocaleDateString() 
                                : 'N/A'}
                            </span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-xs text-slate-600 font-sans leading-relaxed">
                          Enter the required buyout amount to request approval from the Managing Director.
                        </p>
                        
                        <div className="space-y-3">
                          <div>
                            <label className="block text-[10px] font-bold tracking-wider text-slate-450 mb-1.5 uppercase">Requested Amount (₹)</label>
                            <input 
                              type="number"
                              placeholder="Enter amount (e.g. 75000)"
                              value={requestedAmount}
                              onChange={(e) => setRequestedAmount(e.target.value)}
                              className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-mono focus:outline-none focus:border-amber-500/50"
                            />
                          </div>
                          <button 
                            onClick={handleRequestFunds}
                            disabled={submitting || !requestedAmount}
                            className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:brightness-110 active:scale-[0.98] text-slate-950 font-bold text-xs tracking-wider transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-md"
                          >
                            <svg className="w-4 h-4 shrink-0 text-slate-950" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                            SEND TO MD FOR APPROVAL
                          </button>
                        </div>
                      </>
                    )}

                  </div>
                );
              })()}

              {/* 4. MD_FUNDS_APPROVED */}
              {currentStatus === 'MD_FUNDS_APPROVED' && (
                <div className="space-y-4">
                  <p className="text-xs text-emerald-600 font-bold leading-relaxed">
                    ✔ Funds approved! Ready to travel to the customer's branch/location.
                  </p>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Approved Amount</span>
                      <span className="text-slate-800 font-extrabold">₹{Number(lead.loan_amount || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Approving User</span>
                      <span className="text-slate-800 font-bold">Managing Director (MD)</span>
                    </div>
                  </div>

                  <button 
                    onClick={() => handleStatusChange('JOURNEY_STARTED', { remarks: 'Executive started journey to location' })}
                    disabled={submitting}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:brightness-110 active:scale-[0.98] text-slate-950 font-bold text-xs tracking-wider transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-md"
                  >
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                    START JOURNEY NOW
                  </button>
                </div>
              )}

              {/* 5. JOURNEY_STARTED */}
              {currentStatus === 'JOURNEY_STARTED' && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-600 font-sans leading-relaxed">
                    You are currently traveling. Upload a photo of the customer's house/location as proof of visit to record your arrival.
                  </p>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">House/Location Photo (Proof of Visit)</label>
                    <input 
                      type="file" 
                      accept=".jpg,.jpeg,.png"
                      onChange={(e) => {
                        const file = e.target.files ? e.target.files[0] : null;
                        if (validateSelectedFile(file)) {
                          setHouseImage(file);
                        } else {
                          e.target.value = '';
                          setHouseImage(null);
                        }
                      }}
                      className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-100 file:text-[#c3902c] hover:file:bg-amber-200 file:cursor-pointer"
                    />
                  </div>
                  <button 
                    onClick={() => {
                      const formData = new FormData();
                      if (houseImage) formData.append('houseImage', houseImage);
                      formData.append('remarks', `Executive reached customer location. Uploaded visit proof photo: ${houseImage?.name || 'N/A'}`);
                      handleStatusChange('REACHED_CUSTOMER', formData);
                    }}
                    disabled={submitting || !houseImage}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:brightness-110 active:scale-[0.98] text-slate-950 font-bold text-xs tracking-wider transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-md"
                  >
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    REACHED CUSTOMER LOCATION
                  </button>
                </div>
              )}

              {/* 6. REACHED_CUSTOMER */}
              {currentStatus === 'REACHED_CUSTOMER' && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-600 font-sans leading-relaxed">
                    Conducted the verification meeting. Enter notes summarizing the discussion.
                  </p>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Discussion Notes</label>
                    <textarea 
                      placeholder="e.g. Customer verified interest in releasing pledged gold from bank..."
                      value={discussionNotes}
                      onChange={(e) => setDiscussionNotes(e.target.value)}
                      className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-850 placeholder-slate-400 focus:outline-none focus:border-amber-500/50 focus:bg-white text-xs"
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
                    <label htmlFor="confirmation" className="text-xs text-slate-600 select-none">
                      Customer confirms details and signature terms
                    </label>
                  </div>
                  <button 
                    onClick={() => handleStatusChange('CUSTOMER_INTERACTION', { discussionNotes, customerConfirmation })}
                    disabled={submitting || !discussionNotes || !customerConfirmation}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:brightness-110 active:scale-[0.98] text-slate-950 font-bold text-xs tracking-wider transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-md"
                  >
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    SUBMIT DISCUSSION NOTES
                  </button>
                </div>
              )}

              {/* 7. CUSTOMER_INTERACTION */}
              {currentStatus === 'CUSTOMER_INTERACTION' && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-600 font-sans leading-relaxed">
                    Verify the pledge and loan details at the bank or branch location.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Bank/Vendor Name</label>
                      <input 
                        type="text"
                        placeholder="e.g. SBI Bank"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-850 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Vendor/Branch Name</label>
                      <input 
                        type="text"
                        placeholder="e.g. Main Branch"
                        value={vendorName}
                        onChange={(e) => setVendorName(e.target.value)}
                        className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-850 text-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Verification Notes</label>
                    <textarea 
                      placeholder="Enter verification notes or discrepancies..."
                      value={verificationNotes}
                      onChange={(e) => setVerificationNotes(e.target.value)}
                      className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-850 placeholder-slate-400 focus:outline-none focus:border-amber-500/50 focus:bg-white text-xs"
                      rows={2}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Verification Notes</label>
                    <textarea 
                      placeholder="Enter verification notes or discrepancies..."
                      value={verificationNotes}
                      onChange={(e) => setVerificationNotes(e.target.value)}
                      className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-850 placeholder-slate-400 focus:outline-none focus:border-amber-500/50 focus:bg-white text-xs"
                      rows={2}
                    />
                  </div>
                  <button 
                    onClick={() => handleStatusChange('BANK_VISIT', { bankName, vendorName, verificationNotes })}
                    disabled={submitting || !bankName}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:brightness-110 active:scale-[0.98] text-slate-950 font-bold text-xs tracking-wider transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-md"
                  >
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    RECORD BANK VISIT COMPLETE
                  </button>
                </div>
              )}

              {/* 8. BANK_VISIT */}
              {currentStatus === 'BANK_VISIT' && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-600 font-sans leading-relaxed">
                    Upload copies of the finalized buyout agreement, customer KYC, and bank visit proof documents.
                  </p>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Agreement Copy (PDF/Image)</label>
                      <input 
                        type="file" 
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const file = e.target.files ? e.target.files[0] : null;
                          if (validateSelectedFile(file)) {
                            setAgreementCopy(file);
                          } else {
                            e.target.value = '';
                            setAgreementCopy(null);
                          }
                        }}
                        className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-100 file:text-[#c3902c] hover:file:bg-amber-200 file:cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">KYC Copy (PDF/Image)</label>
                      <input 
                        type="file" 
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const file = e.target.files ? e.target.files[0] : null;
                          if (validateSelectedFile(file)) {
                            setKycCopy(file);
                          } else {
                            e.target.value = '';
                            setKycCopy(null);
                          }
                        }}
                        className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-100 file:text-[#c3902c] hover:file:bg-amber-200 file:cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Bank/Shop Image (Proof of Visit)</label>
                      <input 
                        type="file" 
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const file = e.target.files ? e.target.files[0] : null;
                          if (validateSelectedFile(file)) {
                            setBankImage(file);
                          } else {
                            e.target.value = '';
                            setBankImage(null);
                          }
                        }}
                        className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-100 file:text-[#c3902c] hover:file:bg-amber-200 file:cursor-pointer"
                      />
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      const formData = new FormData();
                      if (agreementCopy) formData.append('agreementCopy', agreementCopy);
                      if (kycCopy) formData.append('kycCopy', kycCopy);
                      if (bankImage) formData.append('bankImage', bankImage);
                      formData.append('remarks', `Uploaded documents: Agreement (${agreementCopy?.name || 'N/A'}), KYC (${kycCopy?.name || 'N/A'}), Bank Visit Proof (${bankImage?.name || 'N/A'})`);
                      handleStatusChange('AGREEMENT_PENDING', formData);
                    }}
                    disabled={submitting || !agreementCopy || !kycCopy || !bankImage}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:brightness-110 active:scale-[0.98] text-slate-950 font-bold text-xs tracking-wider transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-md"
                  >
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V8a2 2 0 00-2-2h-8L8 4z" />
                    </svg>
                    UPLOAD AGREEMENTS & BANK PROOF
                  </button>
                </div>
              )}

              {/* 9. AGREEMENT_PENDING */}
              {currentStatus === 'AGREEMENT_PENDING' && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-600 font-sans leading-relaxed">
                    Make the buyout payment to release the gold. Upload transaction details and payment proof receipt.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Loan Amount Paid (₹)</label>
                      <input 
                        type="number"
                        placeholder="e.g. 50000"
                        value={loanAmountPaid}
                        onChange={(e) => setLoanAmountPaid(e.target.value)}
                        className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-850 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Transaction No.</label>
                      <input 
                        type="text"
                        placeholder="UTR / Tx ID"
                        value={paymentTx}
                        onChange={(e) => setPaymentTx(e.target.value)}
                        className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-850 text-xs font-mono"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Payment Date</label>
                      <input 
                        type="date"
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                        className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-850 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Payment Proof</label>
                      <input 
                        type="file" 
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const file = e.target.files ? e.target.files[0] : null;
                          if (validateSelectedFile(file)) {
                            setPaymentProof(file);
                          } else {
                            e.target.value = '';
                            setPaymentProof(null);
                          }
                        }}
                        className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-100 file:text-[#c3902c] hover:file:bg-amber-200 file:cursor-pointer"
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
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:brightness-110 active:scale-[0.98] text-slate-950 font-bold text-xs tracking-wider transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-md"
                  >
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    COMPLETE LOAN PAYMENT
                  </button>
                </div>
              )}

              {/* 10. PAYMENT_COMPLETED */}
              {currentStatus === 'PAYMENT_COMPLETED' && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-600 font-sans leading-relaxed">
                    Verify and record the weight specifications of the gold collection.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
                    <div>
                      <label className="block text-slate-550 mb-2 uppercase text-[10px] font-bold">Gross Weight (g)</label>
                      <input 
                        type="number"
                        placeholder="e.g. 24.5"
                        value={grossWeight}
                        onChange={(e) => setGrossWeight(e.target.value)}
                        className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-850 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-550 mb-2 uppercase text-[10px] font-bold">Net Weight (g)</label>
                      <input 
                        type="number"
                        placeholder="e.g. 23.1"
                        value={netWeight}
                        onChange={(e) => setNetWeight(e.target.value)}
                        className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-850 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-550 mb-2 uppercase text-[10px] font-bold">Purity (%)</label>
                      <select 
                        value={purity}
                        onChange={(e) => setPurity(e.target.value)}
                        className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-850 text-xs font-semibold"
                      >
                        <option value="91.6">22 Karat (91.6%)</option>
                        <option value="75.0">18 Karat (75.0%)</option>
                        <option value="99.9">24 Karat (99.9%)</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Collection Remarks</label>
                    <textarea 
                      placeholder="Add any details about gold quality or ornaments..."
                      value={goldRemarks}
                      onChange={(e) => setGoldRemarks(e.target.value)}
                      className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-850 placeholder-slate-400 focus:outline-none focus:border-amber-500/50 focus:bg-white text-xs"
                      rows={2}
                    />
                  </div>
                  <button 
                    onClick={() => handleStatusChange('GOLD_RECEIVED', { grossWeight, netWeight, purity, remarks: goldRemarks })}
                    disabled={submitting || !grossWeight || !netWeight}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:brightness-110 active:scale-[0.98] text-slate-950 font-bold text-xs tracking-wider transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-md"
                  >
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14c2.76 0 5-2.24 5-5V4a1 1 0 00-1-1H8a1 1 0 00-1 1v5c0 2.76 2.24 5 5 5zm0 0v4m-4 0h8m-8-8H5a2 2 0 00-2 2v2a2 2 0 002 2h3m8-6h3a2 2 0 012 2v2a2 2 0 01-2 2h-3" />
                    </svg>
                    SAVE COLLECTION DETAILS
                  </button>
                </div>
              )}

              {/* 11. GOLD_RECEIVED */}
              {currentStatus === 'GOLD_RECEIVED' && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-600 font-sans leading-relaxed">
                    Settle the balance amount payout for the buyout.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Balance (₹)</label>
                      <input 
                        type="number"
                        placeholder="Balance paid"
                        value={balanceAmount}
                        onChange={(e) => setBalanceAmount(e.target.value)}
                        className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-850 text-xs font-mono"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Transaction Number</label>
                      <input 
                        type="text"
                        placeholder="UTR / Tx ID"
                        value={balanceTx}
                        onChange={(e) => setBalanceTx(e.target.value)}
                        className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-850 text-xs font-mono"
                      />
                    </div>
                  </div>
                  <button 
                    onClick={() => handleStatusChange('BALANCE_SETTLED', { balanceAmount, transactionNumber: balanceTx, paymentDate: balanceDate })}
                    disabled={submitting || !balanceAmount || !balanceTx}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:brightness-110 active:scale-[0.98] text-slate-950 font-bold text-xs tracking-wider transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-md"
                  >
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    RECORD BALANCE SETTLEMENT
                  </button>
                </div>
              )}

              {/* 12. BALANCE_SETTLED */}
              {currentStatus === 'BALANCE_SETTLED' && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-600 font-sans leading-relaxed">
                    Upload verification images of the collected gold articles. At least one image is required.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Gold Image 1</label>
                      <input 
                        type="file" 
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const file = e.target.files ? e.target.files[0] : null;
                          if (validateSelectedFile(file)) {
                            setGoldImg1(file);
                          } else {
                            e.target.value = '';
                            setGoldImg1(null);
                          }
                        }}
                        className="w-full text-[10px] text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded file:bg-amber-100 file:text-[#c3902c]" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Gold Image 2</label>
                      <input 
                        type="file" 
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const file = e.target.files ? e.target.files[0] : null;
                          if (validateSelectedFile(file)) {
                            setGoldImg2(file);
                          } else {
                            e.target.value = '';
                            setGoldImg2(null);
                          }
                        }}
                        className="w-full text-[10px] text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded file:bg-amber-100 file:text-[#c3902c]" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Gold Image 3</label>
                      <input 
                        type="file" 
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const file = e.target.files ? e.target.files[0] : null;
                          if (validateSelectedFile(file)) {
                            setGoldImg3(file);
                          } else {
                            e.target.value = '';
                            setGoldImg3(null);
                          }
                        }}
                        className="w-full text-[10px] text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded file:bg-amber-100 file:text-[#c3902c]" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Gold Image 4</label>
                      <input 
                        type="file" 
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const file = e.target.files ? e.target.files[0] : null;
                          if (validateSelectedFile(file)) {
                            setGoldImg4(file);
                          } else {
                            e.target.value = '';
                            setGoldImg4(null);
                          }
                        }}
                        className="w-full text-[10px] text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded file:bg-amber-100 file:text-[#c3902c]" 
                      />
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
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:brightness-110 active:scale-[0.98] text-slate-950 font-bold text-xs tracking-wider transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-md"
                  >
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9zM15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    UPLOAD VERIFIED GOLD IMAGES
                  </button>
                </div>
              )}

              {/* 13. IMAGES_UPLOADED */}
              {currentStatus === 'IMAGES_UPLOADED' && (
                <div className="space-y-4">
                  <p className="text-xs text-emerald-600 font-bold leading-relaxed">
                    ✔ All images uploaded successfully. Ready for case closure.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Final Closure Remarks</label>
                      <textarea 
                        placeholder="Remarks detailing complete release and verification..."
                        value={finalRemarks}
                        onChange={(e) => setFinalRemarks(e.target.value)}
                        className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-850 placeholder-slate-400 focus:outline-none focus:border-amber-500/50 focus:bg-white text-xs resize-none"
                        rows={3}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Total Visit / Travel Expenses (₹)</label>
                      <input 
                        type="number"
                        placeholder="e.g. 450"
                        value={expenseAmount}
                        onChange={(e) => setExpenseAmount(e.target.value)}
                        className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-850 text-xs font-mono"
                      />
                      <span className="text-[10px] text-slate-400 block mt-1">Provide total travel/fuel/other conveyance expenses for this case closure.</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleStatusChange('CASE_COMPLETED', { remarks: finalRemarks, expenseAmount })}
                    disabled={submitting || expenseAmount === '' || isNaN(Number(expenseAmount)) || Number(expenseAmount) < 0}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:brightness-110 active:scale-[0.98] text-slate-950 font-bold text-xs tracking-wider transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-md"
                  >
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    COMPLETE CASE CLOSURE
                  </button>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Right Column: Timeline Panel */}
        <div className="space-y-6">
          
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-6 md:h-[500px] flex flex-col shadow-sm">
            <button 
              onClick={() => setTimelineCollapsed(!timelineCollapsed)}
              className="w-full flex items-center justify-between border-b border-slate-100 pb-2 mb-4 md:pointer-events-none md:border-b-0 md:pb-0 md:mb-4 focus:outline-none"
            >
              <h3 className="font-bold text-sm tracking-wider text-slate-800 uppercase flex items-center gap-2">
                <svg className="w-4 h-4 text-[#c3902c] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Lead Journey Timeline
              </h3>
              <div className="md:hidden text-amber-600">
                {timelineCollapsed ? (
                  <svg className="w-5 h-5 transform transition-transform duration-250" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 transform rotate-180 transition-transform duration-250" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
                  </svg>
                )}
              </div>
            </button>

            {/* Timeline Scroll Box */}
            <div className={`
              ${timelineCollapsed ? 'hidden md:block' : 'block'} 
              flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar text-xs font-mono relative mt-2 md:mt-0 min-h-[250px] md:min-h-0
            `}>
              
              <div className="absolute left-3.5 top-2 bottom-2 w-0.5 bg-slate-200 z-0"></div>

              {optimisticTimelineEntry && (
                <div className="flex gap-4 relative z-10 animate-pulse pb-4">
                  <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500 text-[#c3902c] flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                    🕒
                  </div>
                  <div className="space-y-1 py-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[#c3902c] uppercase text-[10px] font-bold tracking-wider">
                        {optimisticTimelineEntry.status.replace(/_/g, ' ')}
                      </span>
                      <span className="text-slate-455 text-[9px]">Just now</span>
                    </div>
                    <p className="text-slate-600 font-sans text-xs font-semibold">{optimisticTimelineEntry.remarks}</p>
                  </div>
                </div>
              )}

              {lead.lead_timeline && lead.lead_timeline.length > 0 ? (
                lead.lead_timeline.map((event, idx) => {
                  const dateStr = new Date(event.created_at).toLocaleDateString();
                  const timeStr = new Date(event.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  return (
                    <div key={event.id} className="flex gap-4 relative z-10">
                      
                      {/* Node indicator */}
                      <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 text-slate-655 flex items-center justify-center font-bold text-[10px] shrink-0 shadow-sm animate-fadeIn">
                        {idx + 1}
                      </div>

                      {/* Content */}
                      <div className="space-y-1 py-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[#c3902c] uppercase text-[10px] font-bold tracking-wider">{event.status.replace(/_/g, ' ')}</span>
                          <span className="text-slate-455 text-[9px]">{timeStr} ({dateStr})</span>
                        </div>
                        <p className="text-slate-600 font-sans text-xs">{event.remarks || 'No notes'}</p>
                      </div>

                    </div>
                  );
                })
              ) : (
                <div className="text-center text-slate-455 italic py-8">
                  Timeline empty. Complete step actions to generate milestones.
                </div>
              )}

            </div>
          </div>

          {/* Quick Actions bottom/right cards */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-4 shadow-sm">
            <h4 className="text-xs font-bold text-slate-450 tracking-wider uppercase border-b border-slate-100 pb-2">Quick Actions (Current Status)</h4>
            <div className="space-y-3">
              {(() => {
                const currentStepIdx = getActiveStepIndex(currentStatus);
                return STATUS_STEPS.map((step, idx) => {
                  const isCompleted = idx < currentStepIdx;
                  const isActive = idx === currentStepIdx;
                  const isPending = idx > currentStepIdx;

                  return (
                    <div
                      key={step.status}
                      className={`relative flex items-center justify-between p-3 rounded-xl border transition-all duration-300 ${
                        isActive 
                          ? 'bg-amber-50/50 border-amber-500/40 text-amber-900 shadow-md font-bold scale-[1.01]' 
                          : isCompleted 
                            ? 'bg-emerald-50/20 border-emerald-200/20 text-slate-600' 
                            : 'bg-slate-50/20 border-slate-100 text-slate-400 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Step Indicator */}
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 ${
                          isActive 
                            ? 'bg-amber-500 text-white font-extrabold shadow-sm animate-pulse' 
                            : isCompleted 
                              ? 'bg-emerald-500 text-white' 
                              : 'bg-slate-100 text-slate-400'
                        }`}>
                          {isCompleted ? '✓' : step.icon}
                        </div>

                        {/* Step Label */}
                        <span className={`text-xs ${isActive ? 'font-bold text-amber-800' : 'font-medium'}`}>
                          {step.label}
                        </span>
                      </div>

                      {/* Right status badge */}
                      {isActive && (
                        <span className="flex items-center gap-1.5 text-[9px] font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full uppercase tracking-wider animate-fadeIn">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                          Active
                        </span>
                      )}
                      {isCompleted && (
                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full uppercase tracking-wider">
                          Done
                        </span>
                      )}
                      {isPending && (
                        <span className="text-[9px] font-semibold text-slate-400 bg-slate-100/80 px-2 py-0.5 rounded-full uppercase tracking-wider">
                          Pending
                        </span>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          </div>

        </div>

      </div>

      {/* Document Preview Modal */}
      {previewDocUrl && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn"
          onClick={() => {
            setPreviewDocUrl(null);
            setPreviewDocType(null);
            setPreviewDocName(null);
          }}
        >
          <div 
            className="relative max-w-4xl w-full bg-white border border-slate-200 p-6 rounded-2xl flex flex-col gap-4 text-left shadow-2xl animate-scaleUp max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => {
                setPreviewDocUrl(null);
                setPreviewDocType(null);
                setPreviewDocName(null);
              }}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-[#4d0711] text-white font-bold flex items-center justify-center hover:brightness-110 shadow-lg cursor-pointer border border-[#691823]/25"
            >
              ✕
            </button>
            
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h4 className="text-sm font-bold text-slate-800 uppercase">
                Preview: {previewDocType?.replace(/_/g, ' ')}
              </h4>
              <button
                onClick={() => downloadDocument(previewDocUrl, `${previewDocName || 'document'}`)}
                className="px-3 py-1.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:brightness-110 text-white text-xs font-bold rounded-lg transition-all cursor-pointer shadow-sm"
              >
                📥 DOWNLOAD FILE
              </button>
            </div>

            <div className="flex-1 overflow-auto rounded-xl border border-slate-100 min-h-[50vh] flex items-center justify-center bg-slate-50">
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
