'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiRequest } from '../../../lib/api';

interface DocumentDetails {
  leadId: string;
  leadNumber: string;
  customerName: string;
  id: string;
  documentType: string;
  fileUrl: string;
  createdAt: string;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  useEffect(() => {
    async function loadDocuments() {
      try {
        const data = await apiRequest('/executive/assigned-leads');
        
        const detailedLeads = await Promise.all(
          data.map((lead: any) => 
            apiRequest(`/executive/lead/${lead.id}`).catch(() => null)
          )
        );

        const allDocs: DocumentDetails[] = [];
        detailedLeads.forEach((lead: any) => {
          if (lead) {
            const docs = lead.lead_documents || lead.leadDocuments || lead.documents || [];
            docs.forEach((doc: any) => {
              allDocs.push({
                leadId: lead.id,
                leadNumber: lead.lead_number || lead.leadNumber,
                customerName: lead.customer_name || lead.customerName,
                id: doc.id,
                documentType: doc.document_type || doc.documentType || 'Document',
                fileUrl: doc.file_url || doc.fileUrl,
                createdAt: doc.created_at || doc.createdAt
              });
            });
          }
          // Include payment proof if it has one
          if (lead && lead.payments) {
            lead.payments.forEach((pay: any) => {
              const proofUrl = pay.payment_proof || pay.paymentProof;
              if (proofUrl) {
                allDocs.push({
                  leadId: lead.id,
                  leadNumber: lead.lead_number || lead.leadNumber,
                  customerName: lead.customer_name || lead.customerName,
                  id: pay.id,
                  documentType: 'PAYMENT_PROOF',
                  fileUrl: proofUrl,
                  createdAt: pay.created_at || pay.createdAt || pay.payment_date || pay.paymentDate
                });
              }
            });
          }
        });

        setDocuments(allDocs);
      } catch (err: any) {
        setError(err.message || 'Failed to load documents.');
      } finally {
        setLoading(false);
      }
    }
    loadDocuments();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-10 h-10 rounded-full border-4 border-amber-500/25 border-t-amber-500 animate-spin"></div>
        <p className="text-amber-500/50 text-xs font-mono tracking-wider uppercase">Loading Documents Vault...</p>
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

  return (
    <div className="space-y-6 animate-fadeIn text-slate-800">
      
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Documents Center</h1>
        <p className="text-slate-500 text-sm mt-1">Preview and download KYC files, release agreements, statements, and payment receipts.</p>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
        {documents.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-medium text-sm">
            No uploaded files found in your assignments list.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {documents.map((doc, idx) => (
              <div 
                key={idx}
                className="bg-slate-50/50 border border-slate-200/80 hover:border-amber-500/30 rounded-2xl p-5 space-y-4 flex flex-col justify-between shadow-sm relative overflow-hidden transition-all duration-300 group hover:scale-[1.01] hover:bg-white hover:shadow"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <span className="inline-block px-2.5 py-0.5 rounded-lg bg-amber-100 border border-amber-200 text-amber-700 text-[9px] font-bold uppercase tracking-wider">
                      {doc.documentType.replace(/_/g, ' ')}
                    </span>
                    <div className="text-slate-400 group-hover:text-amber-500 transition-colors group-hover:scale-110 transition-transform">
                      {doc.documentType === 'PAYMENT_PROOF' ? (
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      ) : (
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      )}
                    </div>
                  </div>
                  
                  <h4 className="font-bold text-slate-800 text-sm leading-snug pt-1 truncate">{doc.customerName}</h4>
                  <p className="text-[10px] text-slate-500 font-mono">Lead ID: {doc.leadNumber || doc.leadId.slice(0, 8)}</p>
                </div>

                <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-200/60">
                  <span className="text-[9px] text-slate-400 font-mono">
                    {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : ''}
                  </span>
                  
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        setPreviewDocUrl(doc.fileUrl);
                        setPreviewDocType(doc.documentType);
                        setPreviewDocName(`${doc.customerName}_${doc.documentType}`);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-[#c3902c] text-xs font-mono tracking-wider transition-colors cursor-pointer"
                    >
                      PREVIEW
                    </button>
                    <button 
                      onClick={() => downloadDocument(doc.fileUrl, `${doc.customerName}_${doc.documentType}`)}
                      className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 text-slate-950 text-xs font-bold transition-all hover:brightness-110 cursor-pointer"
                    >
                      DOWNLOAD
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Document Preview Modal */}
      {previewDocUrl && (
        <div 
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn"
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
            
            <div className="flex justify-between items-center border-b border-slate-200 pb-2">
              <h4 className="text-sm font-bold text-slate-805 uppercase">
                Preview: {previewDocType?.replace(/_/g, ' ')}
              </h4>
              <button
                onClick={() => downloadDocument(previewDocUrl, `${previewDocName || 'document'}`)}
                className="px-3 py-1.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:brightness-110 text-white text-xs font-bold rounded-lg transition-all cursor-pointer shadow-sm"
              >
                DOWNLOAD FILE
              </button>
            </div>

            <div className="flex-1 overflow-auto rounded-xl border border-slate-200 min-h-[50vh] flex items-center justify-center bg-black/5">
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
