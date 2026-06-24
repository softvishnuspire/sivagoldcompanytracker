'use client';

import React, { useEffect, useState } from 'react';

interface Uploader {
  name: string;
  role: string;
}

interface LeadDocument {
  id: string;
  document_type: string;
  file_url: string;
  created_at: string;
  uploader?: Uploader | null;
}

interface GoldImage {
  id: string;
  image_url: string;
  created_at: string;
  uploader?: Uploader | null;
}

interface Payment {
  id: string;
  payment_proof: string;
  created_at: string;
  uploader?: Uploader | null;
}

interface Lead {
  id: string;
  lead_number: string;
  customer_name: string;
  current_status: string;
  created_at: string;
  lead_documents: LeadDocument[];
  gold_images: GoldImage[];
  payments: Payment[];
}

interface DocumentItem {
  id: string;
  name: string;
  type: string; // e.g. 'AADHAR', 'PAN', 'AGREEMENT', 'PAYMENT_PROOF', 'GOLD_IMAGE', 'OTHER'
  url: string;
  created_at: string;
  uploaderName: string;
  uploaderRole: string;
}

export default function DocumentManager() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Active document sub-tab: 'all' | 'kyc' | 'gold' | 'payments'
  const [docTab, setDocTab] = useState<'all' | 'kyc' | 'gold' | 'payments'>('all');
  
  // Preview Lightbox State
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState<string | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    async function fetchLeadsAndDocuments() {
      try {
        const token = localStorage.getItem('token') || localStorage.getItem('siva_token');
        if (!token) {
          setError('Authentication session missing. Please log in.');
          setLoading(false);
          return;
        }

        const res = await fetch(`${API_BASE}/documents/leads`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            localStorage.clear();
            window.location.href = '/';
            return;
          }
          throw new Error('Failed to load Document Manager ledger');
        }

        const data = await res.json();
        setLeads(data || []);
        setFilteredLeads(data || []);
        
        // Select the first lead by default on desktop if available
        if (data && data.length > 0) {
          setSelectedLead(data[0]);
        }
      } catch (err: any) {
        console.error('Error fetching leads:', err);
        setError(err.message || 'Error connecting to database.');
      } finally {
        setLoading(false);
      }
    }
    
    fetchLeadsAndDocuments();
  }, [API_BASE]);

  // Apply search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredLeads(leads);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = leads.filter(lead => 
      lead.customer_name.toLowerCase().includes(query) || 
      lead.lead_number.toLowerCase().includes(query)
    );
    setFilteredLeads(filtered);
  }, [searchQuery, leads]);

  // Flatten and normalize all documents for the selected lead based on the active tab
  const getSelectedLeadDocuments = (): DocumentItem[] => {
    if (!selectedLead) return [];
    
    const items: DocumentItem[] = [];

    // 1. Process regular lead documents
    const leadDocs = selectedLead.lead_documents || [];
    leadDocs.forEach(doc => {
      const docType = doc.document_type || 'OTHER';
      items.push({
        id: doc.id,
        name: docType === 'OTHER' ? 'House Visit Proof' : `${docType.replace(/_/g, ' ')} Document`,
        type: docType,
        url: doc.file_url,
        created_at: doc.created_at,
        uploaderName: doc.uploader?.name || 'System Staff',
        uploaderRole: doc.uploader?.role || 'User'
      });
    });

    // 2. Process gold images
    const goldImgs = selectedLead.gold_images || [];
    goldImgs.forEach(img => {
      items.push({
        id: img.id,
        name: 'Gold Ornament Photo',
        type: 'GOLD_IMAGE',
        url: img.image_url,
        created_at: img.created_at,
        uploaderName: img.uploader?.name || 'Field Executive',
        uploaderRole: img.uploader?.role || 'Executive'
      });
    });

    // 3. Process payments proof
    const payments = selectedLead.payments || [];
    payments.forEach(pay => {
      if (pay.payment_proof) {
        items.push({
          id: pay.id,
          name: 'Payment Receipt Proof',
          type: 'PAYMENT_PROOF',
          url: pay.payment_proof,
          created_at: pay.created_at,
          uploaderName: pay.uploader?.name || 'Field Executive',
          uploaderRole: pay.uploader?.role || 'Executive'
        });
      }
    });

    // Filter items based on active sub-tab
    if (docTab === 'kyc') {
      return items.filter(item => ['AADHAR', 'PAN', 'AGREEMENT', 'OTHER'].includes(item.type));
    }
    if (docTab === 'gold') {
      return items.filter(item => item.type === 'GOLD_IMAGE');
    }
    if (docTab === 'payments') {
      return items.filter(item => item.type === 'PAYMENT_PROOF');
    }

    return items;
  };

  const handleDownload = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.replace(/\s+/g, '_');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').toLowerCase();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <div className="w-10 h-10 rounded-full border-4 border-amber-500/25 border-t-[#c3902c] animate-spin"></div>
        <p className="text-amber-600/60 text-xs font-mono tracking-wider uppercase">Loading Document Manager Vault...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-red-500/5 border border-red-500/15 max-w-xl mx-auto mt-10 text-center">
        <p className="text-slate-600 font-mono text-sm">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 px-5 py-2 bg-gradient-to-r from-amber-600 to-amber-500 text-white font-bold rounded-xl text-xs tracking-wider cursor-pointer hover:brightness-110 transition-all"
        >
          RETRY LOAD
        </button>
      </div>
    );
  }

  const documentItems = getSelectedLeadDocuments();

  return (
    <div className="space-y-6 animate-fadeIn text-slate-800">
      
      {/* Title Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">Document Manager</h1>
        <p className="text-slate-500 text-xs sm:text-sm mt-1">Review unified documents, KYC proofs, gold photos, and payment transactions across all lifecycle stages.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left pane: Leads Directory */}
        <div className="lg:col-span-1 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex flex-col gap-4 max-h-[75vh]">
          <div className="relative">
            <input 
              type="text"
              placeholder="Search Lead ID or Name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-xs focus:outline-none focus:border-amber-500/50 transition-colors"
            />
            <span className="absolute left-3.5 top-3 text-slate-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar min-h-[30vh]">
            {filteredLeads.length === 0 ? (
              <div className="text-center py-10 text-slate-450 text-xs font-medium">
                No matching customer leads found.
              </div>
            ) : (
              filteredLeads.map((lead) => {
                const isSelected = selectedLead?.id === lead.id;
                const docCount = (lead.lead_documents?.length || 0) + 
                                (lead.gold_images?.length || 0) + 
                                (lead.payments?.filter(p => p.payment_proof).length || 0);

                return (
                  <div 
                    key={lead.id}
                    onClick={() => {
                      setSelectedLead(lead);
                      setDocTab('all'); // reset sub-tab
                    }}
                    className={`p-4 rounded-xl border transition-all cursor-pointer text-left ${
                      isSelected 
                        ? 'bg-amber-550/10 border-amber-500 text-slate-900 shadow-sm' 
                        : 'bg-slate-50/50 border-slate-200/80 hover:bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="font-bold text-xs truncate max-w-[70%]">{lead.customer_name}</h4>
                      <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200/80 text-slate-500 text-[9px] font-bold">
                        {docCount} files
                      </span>
                    </div>
                    
                    <p className="text-[10px] text-slate-500 font-mono mt-1">Lead: {lead.lead_number}</p>
                    
                    <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-200/50">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-extrabold uppercase tracking-wider ${
                        lead.current_status === 'CASE_COMPLETED' 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : lead.current_status.includes('REJECT') 
                          ? 'bg-red-100 text-red-700' 
                          : 'bg-amber-105 bg-amber-100 text-amber-800'
                      }`}>
                        {formatStatus(lead.current_status)}
                      </span>
                      
                      <span className="text-[8px] text-slate-400 font-mono">
                        {new Date(lead.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right pane: Document Details Vault */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl shadow-sm min-h-[50vh] flex flex-col overflow-hidden">
          {selectedLead ? (
            <>
              {/* Lead Details Header */}
              <div className="p-6 border-b border-slate-200/85 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="text-left">
                  <span className="text-[9px] px-2 py-0.5 bg-amber-500/10 text-amber-800 font-extrabold rounded-md uppercase tracking-wider border border-amber-500/20">
                    Lead Ledger
                  </span>
                  <h2 className="text-base font-black text-slate-900 mt-2">{selectedLead.customer_name}</h2>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">ID: {selectedLead.lead_number}</p>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-medium">Stage Status:</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-200/80 text-slate-700 font-bold uppercase tracking-wide">
                    {formatStatus(selectedLead.current_status)}
                  </span>
                </div>
              </div>

              {/* Sub-tabs selector */}
              <div className="border-b border-slate-200 px-6 py-2 bg-white flex flex-wrap gap-2">
                {[
                  { id: 'all', label: 'All Files' },
                  { id: 'kyc', label: 'KYC & Agreements' },
                  { id: 'gold', label: 'Gold Gallery' },
                  { id: 'payments', label: 'Payments' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setDocTab(tab.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      docTab === tab.id
                        ? 'bg-[#4d0711] text-amber-300'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Documents grid */}
              <div className="p-6 flex-1 overflow-y-auto max-h-[60vh] custom-scrollbar bg-white">
                {documentItems.length === 0 ? (
                  <div className="py-20 text-center text-slate-400 text-sm font-medium">
                    No documents found in this category for the selected lead.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {documentItems.map((doc, index) => {
                      const isImage = doc.url.startsWith('data:image') || 
                                      doc.url.toLowerCase().endsWith('.png') || 
                                      doc.url.toLowerCase().endsWith('.jpg') || 
                                      doc.url.toLowerCase().endsWith('.jpeg') || 
                                      doc.type === 'GOLD_IMAGE';

                      return (
                        <div 
                          key={index}
                          className="bg-slate-50 border border-slate-200/80 hover:border-amber-500/30 rounded-xl p-4 flex flex-col justify-between shadow-xs transition-all hover:bg-white hover:shadow group"
                        >
                          <div className="space-y-3">
                            <div className="flex items-start justify-between">
                              <span className="inline-block px-2 py-0.5 rounded-md bg-amber-100 border border-amber-200 text-amber-800 text-[8px] font-black uppercase tracking-wider">
                                {doc.type.replace(/_/g, ' ')}
                              </span>
                              
                              <div className="text-slate-400 group-hover:text-amber-500 transition-colors">
                                {isImage ? (
                                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                ) : (
                                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                  </svg>
                                )}
                              </div>
                            </div>

                            <div className="text-left">
                              <h4 className="font-bold text-slate-800 text-xs truncate">{doc.name}</h4>
                              <p className="text-[10px] text-slate-450 mt-1">
                                Uploaded: {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : 'N/A'}
                              </p>
                              <div className="flex items-center gap-1.5 mt-2 bg-slate-200/50 p-1.5 rounded-lg border border-slate-200/35">
                                <div className="w-4 h-4 rounded bg-amber-500/10 border border-amber-500/30 flex items-center justify-center font-bold text-[8px] text-amber-700 uppercase">
                                  {doc.uploaderRole.charAt(0)}
                                </div>
                                <span className="text-[9px] text-slate-600 font-semibold truncate">
                                  {doc.uploaderName} ({doc.uploaderRole.toLowerCase()})
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="pt-3 mt-4 border-t border-slate-200/60 flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setPreviewUrl(doc.url);
                                setPreviewType(doc.type);
                                setPreviewName(doc.name);
                              }}
                              className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-[#c3902c] rounded-lg text-[10px] font-mono tracking-wider cursor-pointer transition-colors"
                            >
                              PREVIEW
                            </button>
                            <button
                              onClick={() => handleDownload(doc.url, `${selectedLead.customer_name}_${doc.type}`)}
                              className="px-2.5 py-1 bg-gradient-to-r from-amber-600 to-amber-500 text-white rounded-lg text-[10px] font-bold cursor-pointer hover:brightness-110 transition-all"
                            >
                              DOWNLOAD
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center p-20 text-slate-400">
              <svg className="w-12 h-12 text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm font-medium">Select a lead from the directory to review documents.</p>
            </div>
          )}
        </div>

      </div>

      {/* Reusable Lightbox Preview Modal */}
      {previewUrl && (
        <div 
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] animate-fadeIn"
          onClick={() => {
            setPreviewUrl(null);
            setPreviewType(null);
            setPreviewName(null);
          }}
        >
          <div 
            className="relative max-w-4xl w-full bg-white border border-slate-200 p-4 sm:p-6 rounded-2xl flex flex-col gap-4 text-left shadow-2xl animate-scaleUp max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => {
                setPreviewUrl(null);
                setPreviewType(null);
                setPreviewName(null);
              }}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-[#4d0711] text-white font-bold flex items-center justify-center hover:brightness-110 shadow-lg cursor-pointer border border-[#691823]/25"
            >
              ✕
            </button>
            
            <div className="flex justify-between items-center border-b border-slate-200 pb-2">
              <h4 className="text-sm font-bold text-slate-800 uppercase">
                Preview: {previewName} ({previewType?.replace(/_/g, ' ')})
              </h4>
              <button
                onClick={() => handleDownload(previewUrl, previewName || 'document')}
                className="px-3 py-1.5 bg-[#4d0711] hover:brightness-110 text-amber-300 text-xs font-bold rounded-lg transition-all cursor-pointer shadow-sm border border-[#691823]/30"
              >
                DOWNLOAD FILE
              </button>
            </div>

            <div className="flex-1 overflow-auto rounded-xl border border-slate-200 min-h-[50vh] flex items-center justify-center bg-black/5">
              {previewUrl.startsWith('data:application/pdf') || previewUrl.endsWith('.pdf') ? (
                <iframe 
                  src={previewUrl} 
                  className="w-full h-[60vh] rounded-lg bg-white" 
                  title="PDF Preview"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={previewUrl} 
                  alt="Document Preview" 
                  className="max-w-full max-h-[60vh] object-contain shadow"
                />
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
