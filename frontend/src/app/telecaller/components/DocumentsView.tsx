import React, { useState } from 'react';
import { 
  FolderOpen, 
  Search, 
  User, 
  Phone, 
  MapPin, 
  Building2, 
  FileText, 
  Download, 
  Eye, 
  X,
  FileCheck2,
  AlertCircle
} from 'lucide-react';
import { Lead, Document } from '../types';

interface DocumentsViewProps {
  leads: Lead[];
}

export default function DocumentsView({ leads }: DocumentsViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);

  // Search filtered leads for the selector
  const filteredSelectorLeads = leads.filter(lead => 
    lead.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.mobile.includes(searchTerm) ||
    lead.leadNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedLead = leads.find(l => l.id === selectedLeadId);

  // Helper to format document type label
  const getDocTypeLabel = (type: Document['documentType']) => {
    switch (type) {
      case 'LOAN_SLIP': return 'Loan Slip / pledge receipt';
      case 'KYC': return 'KYC (Aadhaar/PAN)';
      case 'ADDITIONAL': return 'Additional Attachment';
      default: return type;
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and selector panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Selector Panel */}
        <div className="bg-brand-mahogany/40 border border-brand-copper/30 rounded-2xl p-5 backdrop-blur-md flex flex-col gap-4">
          <div>
            <h3 className="text-sm font-bold text-brand-silver uppercase tracking-wider">Select Customer Lead</h3>
            <p className="text-xs text-brand-slate mt-1">Select a client profile below to display their pledged documents.</p>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-slate" size={15} />
            <input
              type="text"
              placeholder="Search leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-brand-cherry/40 border border-brand-copper/20 rounded-xl py-1.5 px-9 text-xs text-brand-silver outline-none focus:border-brand-copper placeholder-brand-slate/40"
            />
          </div>

          <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1.5 scrollbar-thin">
            {filteredSelectorLeads.length > 0 ? (
              filteredSelectorLeads.map((lead) => (
                <button
                  key={lead.id}
                  onClick={() => setSelectedLeadId(lead.id)}
                  className={`w-full text-left p-3 rounded-xl border text-xs transition-all duration-300 flex items-center justify-between cursor-pointer ${
                    selectedLeadId === lead.id
                      ? 'bg-brand-copper border-brand-copper text-brand-silver font-bold shadow-md'
                      : 'bg-brand-cherry/20 border-brand-copper/15 text-brand-slate hover:bg-brand-cherry/40 hover:text-brand-silver'
                  }`}
                >
                  <div>
                    <div className="font-bold tracking-tight">{lead.customerName}</div>
                    <div className="text-[10px] opacity-75 mt-0.5">{lead.leadNumber} | {lead.mobile}</div>
                  </div>
                  <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold ${
                    selectedLeadId === lead.id ? 'bg-brand-cherry text-brand-silver' : 'bg-brand-mahogany border border-brand-copper/25 text-brand-slate'
                  }`}>
                    {(lead.documents || []).length} docs
                  </span>
                </button>
              ))
            ) : (
              <div className="text-center py-8 text-xs text-brand-slate/50">No leads found.</div>
            )}
          </div>
        </div>

        {/* Selected Lead Details & Documents Viewer */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {selectedLead ? (
            <>
              {/* Lead Details Card */}
              <div className="bg-brand-mahogany/40 border border-brand-copper/30 rounded-2xl p-5 backdrop-blur-md animate-fadeIn">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-brand-copper/25 pb-4 gap-3">
                  <div>
                    <span className="font-mono text-xs font-bold text-brand-silver bg-brand-copper/20 border border-brand-copper/30 py-0.5 px-2 rounded-lg">
                      {selectedLead.leadNumber}
                    </span>
                    <h3 className="text-lg font-bold text-brand-silver mt-2">{selectedLead.customerName}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-brand-mahogany border border-brand-copper/20 py-1 px-3 rounded-full text-brand-slate font-bold uppercase tracking-wider">
                      Status: {selectedLead.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-brand-cherry/50 border border-brand-copper/15 text-brand-slate">
                      <Phone size={14} />
                    </div>
                    <div>
                      <div className="text-brand-slate font-semibold uppercase tracking-wide text-[9px]">Mobile</div>
                      <div className="text-brand-silver font-medium mt-0.5">{selectedLead.mobile}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-brand-cherry/50 border border-brand-copper/15 text-brand-slate">
                      <MapPin size={14} />
                    </div>
                    <div>
                      <div className="text-brand-slate font-semibold uppercase tracking-wide text-[9px]">District</div>
                      <div className="text-brand-silver font-medium mt-0.5">{selectedLead.district}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-brand-cherry/50 border border-brand-copper/15 text-brand-slate">
                      <Building2 size={14} />
                    </div>
                    <div>
                      <div className="text-brand-slate font-semibold uppercase tracking-wide text-[9px]">Pledged Bank</div>
                      <div className="text-brand-silver font-medium mt-0.5">
                        {selectedLead.bankName || 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Documents List Grid */}
              <div className="bg-brand-mahogany/40 border border-brand-copper/30 rounded-2xl p-5 backdrop-blur-md flex-1 animate-fadeIn">
                <h3 className="text-sm font-bold text-brand-silver uppercase tracking-wider mb-4">Attached Documents</h3>

                {selectedLead.documents && selectedLead.documents.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {selectedLead.documents.map((doc) => (
                      <div 
                        key={doc.id}
                        className="bg-brand-cherry/30 border border-brand-copper/20 rounded-xl p-4 flex items-center justify-between gap-3 hover:border-brand-copper transition-all duration-300 shadow-md"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-3 rounded-xl bg-brand-copper/20 border border-brand-copper/35 text-brand-silver">
                            <FileText size={20} />
                          </div>
                          <div>
                            <div className="text-[10px] text-brand-copper font-bold uppercase tracking-wider">
                              {getDocTypeLabel(doc.documentType)}
                            </div>
                            <h4 className="text-xs font-bold text-brand-silver truncate max-w-[150px] mt-0.5" title={doc.fileName}>
                              {doc.fileName}
                            </h4>
                            <p className="text-[9px] text-brand-slate mt-0.5">Uploaded by Agent</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setPreviewDoc(doc)}
                            className="p-2 rounded-lg bg-brand-mahogany text-brand-slate hover:text-brand-silver border border-brand-copper/20 hover:border-brand-copper/50 transition-all cursor-pointer"
                            title="Preview File"
                          >
                            <Eye size={14} />
                          </button>
                          <a
                            href={doc.fileUrl}
                            download
                            onClick={(e) => {
                              if (doc.fileUrl === '#') {
                                e.preventDefault();
                                alert('Mock Download: In a production environment, this link triggers a secure download of the file.');
                              }
                            }}
                            className="p-2 rounded-lg bg-brand-mahogany text-brand-slate hover:text-brand-silver border border-brand-copper/20 hover:border-brand-copper/50 transition-all cursor-pointer"
                            title="Download File"
                          >
                            <Download size={14} />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-16 text-center text-brand-slate text-xs uppercase tracking-wider border border-dashed border-brand-copper/20 rounded-xl flex flex-col items-center justify-center gap-2">
                    <AlertCircle size={20} className="text-brand-slate/40" />
                    No documents uploaded for this lead profile.
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="bg-brand-mahogany/20 border border-brand-copper/15 rounded-2xl py-24 text-center text-brand-slate text-xs uppercase tracking-widest flex flex-col items-center justify-center gap-3 animate-fadeIn flex-1">
              <FolderOpen size={36} className="text-brand-slate/30" />
              Select a customer lead from the sidebar list to view files
            </div>
          )}
        </div>
      </div>

      {/* Simulated Document Preview Modal */}
      {previewDoc && selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-cherry/90 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg bg-brand-mahogany border border-brand-copper/45 rounded-3xl overflow-hidden shadow-2xl animate-scaleUp">
            {/* Modal Header */}
            <div className="p-4 bg-brand-cherry border-b border-brand-copper/25 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-brand-copper font-bold uppercase tracking-wider">
                  {getDocTypeLabel(previewDoc.documentType)}
                </span>
                <h3 className="text-sm font-bold text-brand-silver mt-0.5 truncate max-w-[300px]">
                  {previewDoc.fileName}
                </h3>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="p-1 rounded-lg hover:bg-brand-mahogany text-brand-slate hover:text-brand-silver transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body - Mock Document Preview */}
            <div className="p-6 bg-brand-mahogany flex flex-col items-center justify-center min-h-[300px] border-b border-brand-copper/15">
              <div className="w-full bg-brand-cherry/30 border border-brand-copper/20 rounded-2xl p-6 relative max-w-sm flex flex-col gap-4 text-xs text-brand-silver/90 shadow-inner">
                {/* Gold watermark icon */}
                <div className="absolute right-4 top-4 opacity-5 text-brand-copper">
                  <FileText size={80} />
                </div>

                <div className="flex items-center justify-between border-b border-brand-copper/20 pb-3">
                  <span className="font-extrabold text-sm text-brand-silver flex items-center gap-1.5">
                    SHIVA GOLD <span className="text-[9px] bg-brand-copper/20 py-0.5 px-2 rounded-full border border-brand-copper/30 font-medium">DOCUMENT</span>
                  </span>
                  <span className="font-mono text-[9px] text-brand-slate">{selectedLead.leadNumber}</span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-brand-slate">Customer Name:</span>
                    <span className="font-bold">{selectedLead.customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-brand-slate">Mobile Number:</span>
                    <span className="font-medium">{selectedLead.mobile}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-brand-slate">District Location:</span>
                    <span className="font-medium">{selectedLead.district}</span>
                  </div>
                  {selectedLead.bankName && (
                    <div className="flex justify-between">
                      <span className="text-brand-slate">Pledged Bank:</span>
                      <span className="font-medium">{selectedLead.bankName} ({selectedLead.branchName})</span>
                    </div>
                  )}
                  {selectedLead.loanAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-brand-slate">Loan Amount:</span>
                      <span className="font-medium text-rose-400">₹{selectedLead.loanAmount.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-brand-copper/15 pt-3 mt-1 flex flex-col items-center justify-center gap-2">
                  <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold bg-emerald-500/10 py-1 px-3 border border-emerald-500/15 rounded-full uppercase tracking-wider">
                    <FileCheck2 size={12} /> Verification Verified
                  </div>
                  <p className="text-[9px] text-brand-slate text-center">Simulated system preview. Documents are encrypted and hosted securely.</p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-brand-cherry/50 flex justify-end gap-3">
              <button
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-2 border border-brand-copper/20 hover:bg-brand-mahogany text-brand-slate hover:text-brand-silver font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Close Preview
              </button>
              <a
                href={previewDoc.fileUrl}
                download
                onClick={(e) => {
                  if (previewDoc.fileUrl === '#') {
                    e.preventDefault();
                    alert('Mock Download: In production, this link fetches the secure S3/Cloudinary asset.');
                  }
                }}
                className="px-4 py-2 bg-brand-copper hover:bg-brand-copper/85 text-brand-silver hover:text-white font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1"
              >
                <Download size={12} /> Download
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
