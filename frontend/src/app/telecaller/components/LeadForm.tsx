import React, { useState, useEffect } from 'react';
import { 
  User, 
  Coins, 
  Building2, 
  FileText, 
  Upload, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Plus
} from 'lucide-react';
import { Lead, Document } from '../types';

interface LeadFormProps {
  onSave: (lead: Omit<Lead, 'id' | 'leadNumber' | 'createdAt' | 'updatedAt'> & { id?: string }) => void;
  editingLead?: Lead | null;
  onCancel: () => void;
}

export default function LeadForm({ onSave, editingLead, onCancel }: LeadFormProps) {
  const [activeStep, setActiveStep] = useState<number>(1);
  const [formData, setFormData] = useState({
    customerName: '',
    mobile: '',
    alternateMobile: '',
    address: '',
    district: 'Vijayawada',
    goldWeight: '',
    goldType: 'Jewelry (22K)',
    estimatedValue: '',
    bankName: '',
    branchName: '',
    loanAmount: '',
    loanAccountNumber: '',
    status: 'NEW LEAD' as Lead['status']
  });

  const [uploadedFiles, setUploadedFiles] = useState<{
    LOAN_SLIP?: { name: string; progress: number; done: boolean };
    KYC?: { name: string; progress: number; done: boolean };
    ADDITIONAL?: { name: string; progress: number; done: boolean };
  }>({});

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (editingLead) {
      setFormData({
        customerName: editingLead.customerName,
        mobile: editingLead.mobile,
        alternateMobile: editingLead.alternateMobile || '',
        address: editingLead.address,
        district: editingLead.district,
        goldWeight: editingLead.goldWeight.toString(),
        goldType: editingLead.goldType,
        estimatedValue: editingLead.estimatedValue.toString(),
        bankName: editingLead.bankName,
        branchName: editingLead.branchName,
        loanAmount: editingLead.loanAmount.toString(),
        loanAccountNumber: editingLead.loanAccountNumber,
        status: editingLead.status
      });

      // Map editing documents
      const docs: typeof uploadedFiles = {};
      editingLead.documents?.forEach(d => {
        docs[d.documentType] = {
          name: d.fileName,
          progress: 100,
          done: true
        };
      });
      setUploadedFiles(docs);
    }
  }, [editingLead]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
  };

  const handleFileUploadSimulate = (type: 'LOAN_SLIP' | 'KYC' | 'ADDITIONAL', fileName: string) => {
    setUploadedFiles(prev => ({
      ...prev,
      [type]: { name: fileName, progress: 10, done: false }
    }));

    let progress = 10;
    const interval = setInterval(() => {
      progress += 30;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setUploadedFiles(prev => ({
          ...prev,
          [type]: { name: fileName, progress: 100, done: true }
        }));
      } else {
        setUploadedFiles(prev => ({
          ...prev,
          [type]: { name: fileName, progress, done: false }
        }));
      }
    }, 400);
  };

  const validateStep = (step: number): boolean => {
    const stepErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.customerName.trim()) stepErrors.customerName = 'Name is required';
      if (!formData.mobile.trim()) {
        stepErrors.mobile = 'Mobile number is required';
      } else if (!/^\d{10}$/.test(formData.mobile.trim())) {
        stepErrors.mobile = 'Mobile number must be exactly 10 digits';
      }
      if (formData.alternateMobile.trim() && !/^\d{10}$/.test(formData.alternateMobile.trim())) {
        stepErrors.alternateMobile = 'Alternate mobile must be 10 digits';
      }
      if (!formData.address.trim()) stepErrors.address = 'Address is required';
    }

    if (step === 2) {
      const weight = parseFloat(formData.goldWeight);
      if (isNaN(weight) || weight <= 0) {
        stepErrors.goldWeight = 'Weight must be a positive number';
      }
      const val = parseFloat(formData.estimatedValue);
      if (isNaN(val) || val <= 0) {
        stepErrors.estimatedValue = 'Estimated value must be a positive number';
      }
    }

    if (step === 3) {
      if (!formData.bankName.trim()) stepErrors.bankName = 'Bank name is required';
      if (!formData.branchName.trim()) stepErrors.branchName = 'Branch name is required';
      const loan = parseFloat(formData.loanAmount);
      if (isNaN(loan) || loan <= 0) {
        stepErrors.loanAmount = 'Loan amount must be a positive number';
      }
      if (!formData.loanAccountNumber.trim()) {
        stepErrors.loanAccountNumber = 'Loan account number is required';
      }
    }

    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(activeStep)) return;

    // Build documents array
    const documents: Document[] = [];
    Object.entries(uploadedFiles).forEach(([type, file]) => {
      if (file && file.done) {
        documents.push({
          id: `D-${Math.random().toString(36).substr(2, 9)}`,
          leadId: editingLead?.id || '',
          documentType: type as Document['documentType'],
          fileName: file.name,
          fileUrl: '#',
          uploadedBy: 'TC-01',
          createdAt: new Date().toISOString()
        });
      }
    });

    onSave({
      id: editingLead?.id,
      customerName: formData.customerName.trim(),
      mobile: formData.mobile.trim(),
      alternateMobile: formData.alternateMobile.trim() || undefined,
      address: formData.address.trim(),
      district: formData.district,
      goldWeight: parseFloat(formData.goldWeight),
      goldType: formData.goldType,
      estimatedValue: parseFloat(formData.estimatedValue),
      bankName: formData.bankName.trim(),
      branchName: formData.branchName.trim(),
      loanAmount: parseFloat(formData.loanAmount),
      loanAccountNumber: formData.loanAccountNumber.trim(),
      status: formData.status,
      telecallerId: editingLead?.telecallerId || 'TC-01',
      rmId: editingLead?.rmId,
      executiveId: editingLead?.executiveId,
      documents
    });
  };

  const steps = [
    { num: 1, label: 'Customer', icon: User },
    { num: 2, label: 'Gold Details', icon: Coins },
    { num: 3, label: 'Bank Info', icon: Building2 },
    { num: 4, label: 'Documents', icon: FileText }
  ];

  return (
    <div className="bg-brand-mahogany/40 border border-brand-copper/30 rounded-2xl p-6 shadow-xl backdrop-blur-md max-w-3xl mx-auto w-full">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-brand-copper/20">
        <h2 className="text-xl font-bold text-brand-silver flex items-center gap-2">
          <span className="p-2 rounded-lg bg-brand-copper/20 text-brand-silver border border-brand-copper/35 animate-scaleUp">
            <Plus size={20} />
          </span>
          {editingLead ? 'Edit Lead' : 'Create New Lead'}
        </h2>
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-brand-slate hover:text-brand-silver transition-colors cursor-pointer"
        >
          Cancel
        </button>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center justify-between mb-8 max-w-md mx-auto">
        {steps.map((s, idx) => {
          const StepIcon = s.icon;
          const isCompleted = activeStep > s.num;
          const isActive = activeStep === s.num;

          return (
            <React.Fragment key={s.num}>
              <div className="flex flex-col items-center gap-1.5 relative">
                <button
                  type="button"
                  onClick={() => {
                    let valid = true;
                    for (let stepIndex = 1; stepIndex < s.num; stepIndex++) {
                      if (!validateStep(stepIndex)) {
                        valid = false;
                        setActiveStep(stepIndex);
                        break;
                      }
                    }
                    if (valid && s.num <= 4) {
                      setActiveStep(s.num);
                    }
                  }}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-300 cursor-pointer ${
                    isCompleted
                      ? 'bg-brand-copper border-brand-copper text-brand-silver font-bold shadow-md'
                      : isActive
                      ? 'bg-brand-cherry/60 border-brand-copper text-brand-silver shadow-[0_0_12px_rgba(101,72,59,0.3)]'
                      : 'bg-brand-cherry/20 border-brand-copper/20 text-brand-slate hover:border-brand-copper/65'
                  }`}
                >
                  {isCompleted ? <CheckCircle2 size={18} /> : <StepIcon size={18} />}
                </button>
                <span className={`text-[11px] font-medium ${isActive ? 'text-brand-silver' : 'text-brand-slate'}`}>
                  {s.label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div
                  className={`flex-1 h-[2px] mx-2 -mt-5 transition-colors duration-300 ${
                    activeStep > s.num ? 'bg-brand-copper' : 'bg-brand-copper/20'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Customer details */}
        {activeStep === 1 && (
          <div className="space-y-4 animate-fadeIn">
            <h3 className="text-sm font-semibold text-brand-slate uppercase tracking-wider mb-2">
              Customer Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-brand-slate mb-1.5 uppercase">
                  Customer Name *
                </label>
                <input
                  type="text"
                  name="customerName"
                  value={formData.customerName}
                  onChange={handleInputChange}
                  placeholder="e.g. Anil Kumar"
                  className={`w-full bg-brand-cherry/40 border rounded-xl py-2.5 px-3.5 text-sm text-brand-silver outline-none transition-all focus:border-brand-copper focus:ring-1 focus:ring-brand-copper/20 placeholder-brand-slate/40 ${
                    errors.customerName ? 'border-rose-500/50' : 'border-brand-copper/20'
                  }`}
                />
                {errors.customerName && (
                  <span className="flex items-center gap-1 mt-1 text-xs text-rose-400">
                    <AlertCircle size={12} /> {errors.customerName}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-brand-slate mb-1.5 uppercase">
                  District *
                </label>
                <select
                  name="district"
                  value={formData.district}
                  onChange={handleInputChange}
                  className="w-full bg-brand-cherry/40 border border-brand-copper/20 rounded-xl py-2.5 px-3.5 text-sm text-brand-silver outline-none focus:border-brand-copper focus:ring-1 focus:ring-brand-copper/20"
                >
                  <option value="Vijayawada">Vijayawada</option>
                  <option value="Hyderabad">Hyderabad</option>
                  <option value="Vizag">Vizag</option>
                  <option value="Guntur">Guntur</option>
                  <option value="Nellore">Nellore</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-brand-slate mb-1.5 uppercase">
                  Mobile Number (Primary) *
                </label>
                <input
                  type="text"
                  name="mobile"
                  maxLength={10}
                  value={formData.mobile}
                  onChange={handleInputChange}
                  placeholder="e.g. 9876543210"
                  className={`w-full bg-brand-cherry/40 border rounded-xl py-2.5 px-3.5 text-sm text-brand-silver outline-none transition-all focus:border-brand-copper focus:ring-1 focus:ring-brand-copper/20 placeholder-brand-slate/40 ${
                    errors.mobile ? 'border-rose-500/50' : 'border-brand-copper/20'
                  }`}
                />
                {errors.mobile && (
                  <span className="flex items-center gap-1 mt-1 text-xs text-rose-400">
                    <AlertCircle size={12} /> {errors.mobile}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-brand-slate mb-1.5 uppercase">
                  Alternate Mobile Number
                </label>
                <input
                  type="text"
                  name="alternateMobile"
                  maxLength={10}
                  value={formData.alternateMobile}
                  onChange={handleInputChange}
                  placeholder="e.g. 8765432109"
                  className={`w-full bg-brand-cherry/40 border rounded-xl py-2.5 px-3.5 text-sm text-brand-silver outline-none transition-all focus:border-brand-copper focus:ring-1 focus:ring-brand-copper/20 placeholder-brand-slate/40 ${
                    errors.alternateMobile ? 'border-rose-500/50' : 'border-brand-copper/20'
                  }`}
                />
                {errors.alternateMobile && (
                  <span className="flex items-center gap-1 mt-1 text-xs text-rose-400">
                    <AlertCircle size={12} /> {errors.alternateMobile}
                  </span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-brand-slate mb-1.5 uppercase">
                Full Address *
              </label>
              <textarea
                name="address"
                rows={3}
                value={formData.address}
                onChange={handleInputChange}
                placeholder="Street address, Flat number, Landmark details..."
                className={`w-full bg-brand-cherry/40 border rounded-xl py-2.5 px-3.5 text-sm text-brand-silver outline-none transition-all focus:border-brand-copper focus:ring-1 focus:ring-brand-copper/20 placeholder-brand-slate/40 resize-none ${
                  errors.address ? 'border-rose-500/50' : 'border-brand-copper/20'
                }`}
              />
              {errors.address && (
                <span className="flex items-center gap-1 mt-1 text-xs text-rose-400">
                  <AlertCircle size={12} /> {errors.address}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Gold details */}
        {activeStep === 2 && (
          <div className="space-y-4 animate-fadeIn">
            <h3 className="text-sm font-semibold text-brand-slate uppercase tracking-wider mb-2">
              Gold & Asset Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-brand-slate mb-1.5 uppercase">
                  Gold Weight (Grams) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="goldWeight"
                  value={formData.goldWeight}
                  onChange={handleInputChange}
                  placeholder="e.g. 45.80"
                  className={`w-full bg-brand-cherry/40 border rounded-xl py-2.5 px-3.5 text-sm text-brand-silver outline-none transition-all focus:border-brand-copper focus:ring-1 focus:ring-brand-copper/20 placeholder-brand-slate/40 ${
                    errors.goldWeight ? 'border-rose-500/50' : 'border-brand-copper/20'
                  }`}
                />
                {errors.goldWeight && (
                  <span className="flex items-center gap-1 mt-1 text-xs text-rose-400">
                    <AlertCircle size={12} /> {errors.goldWeight}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-brand-slate mb-1.5 uppercase">
                  Gold Type / Purity *
                </label>
                <select
                  name="goldType"
                  value={formData.goldType}
                  onChange={handleInputChange}
                  className="w-full bg-brand-cherry/40 border border-brand-copper/20 rounded-xl py-2.5 px-3.5 text-sm text-brand-silver outline-none focus:border-brand-copper focus:ring-1 focus:ring-brand-copper/20"
                >
                  <option value="Jewelry (22K)">Jewelry (22K)</option>
                  <option value="Gold Coins (24K)">Gold Coins (24K)</option>
                  <option value="Ornaments (20K-22K)">Ornaments (20K-22K)</option>
                  <option value="Mixed Scrap (18K)">Mixed Scrap (18K)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-brand-slate mb-1.5 uppercase">
                  Estimated Value (₹) *
                </label>
                <input
                  type="number"
                  name="estimatedValue"
                  value={formData.estimatedValue}
                  onChange={handleInputChange}
                  placeholder="e.g. 250000"
                  className={`w-full bg-brand-cherry/40 border rounded-xl py-2.5 px-3.5 text-sm text-brand-silver outline-none transition-all focus:border-brand-copper focus:ring-1 focus:ring-brand-copper/20 placeholder-brand-slate/40 ${
                    errors.estimatedValue ? 'border-rose-500/50' : 'border-brand-copper/20'
                  }`}
                />
                {errors.estimatedValue && (
                  <span className="flex items-center gap-1 mt-1 text-xs text-rose-400">
                    <AlertCircle size={12} /> {errors.estimatedValue}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Bank & Loan details */}
        {activeStep === 3 && (
          <div className="space-y-4 animate-fadeIn">
            <h3 className="text-sm font-semibold text-brand-slate uppercase tracking-wider mb-2">
              Bank & Pledge Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-brand-slate mb-1.5 uppercase">
                  Pledged Bank Name *
                </label>
                <input
                  type="text"
                  name="bankName"
                  value={formData.bankName}
                  onChange={handleInputChange}
                  placeholder="e.g. Muthoot Finance, SBI"
                  className={`w-full bg-brand-cherry/40 border rounded-xl py-2.5 px-3.5 text-sm text-brand-silver outline-none transition-all focus:border-brand-copper focus:ring-1 focus:ring-brand-copper/20 placeholder-brand-slate/40 ${
                    errors.bankName ? 'border-rose-500/50' : 'border-brand-copper/20'
                  }`}
                />
                {errors.bankName && (
                  <span className="flex items-center gap-1 mt-1 text-xs text-rose-400">
                    <AlertCircle size={12} /> {errors.bankName}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-brand-slate mb-1.5 uppercase">
                  Branch Name *
                </label>
                <input
                  type="text"
                  name="branchName"
                  value={formData.branchName}
                  onChange={handleInputChange}
                  placeholder="e.g. Benz Circle Branch"
                  className={`w-full bg-brand-cherry/40 border rounded-xl py-2.5 px-3.5 text-sm text-brand-silver outline-none transition-all focus:border-brand-copper focus:ring-1 focus:ring-brand-copper/20 placeholder-brand-slate/40 ${
                    errors.branchName ? 'border-rose-500/50' : 'border-brand-copper/20'
                  }`}
                />
                {errors.branchName && (
                  <span className="flex items-center gap-1 mt-1 text-xs text-rose-400">
                    <AlertCircle size={12} /> {errors.branchName}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-brand-slate mb-1.5 uppercase">
                  Loan Amount Pledged (₹) *
                </label>
                <input
                  type="number"
                  name="loanAmount"
                  value={formData.loanAmount}
                  onChange={handleInputChange}
                  placeholder="e.g. 150000"
                  className={`w-full bg-brand-cherry/40 border rounded-xl py-2.5 px-3.5 text-sm text-brand-silver outline-none transition-all focus:border-brand-copper focus:ring-1 focus:ring-brand-copper/20 placeholder-brand-slate/40 ${
                    errors.loanAmount ? 'border-rose-500/50' : 'border-brand-copper/20'
                  }`}
                />
                {errors.loanAmount && (
                  <span className="flex items-center gap-1 mt-1 text-xs text-rose-400">
                    <AlertCircle size={12} /> {errors.loanAmount}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-brand-slate mb-1.5 uppercase">
                  Loan Account Number *
                </label>
                <input
                  type="text"
                  name="loanAccountNumber"
                  value={formData.loanAccountNumber}
                  onChange={handleInputChange}
                  placeholder="e.g. LN1029384756"
                  className={`w-full bg-brand-cherry/40 border rounded-xl py-2.5 px-3.5 text-sm text-brand-silver outline-none transition-all focus:border-brand-copper focus:ring-1 focus:ring-brand-copper/20 placeholder-brand-slate/40 ${
                    errors.loanAccountNumber ? 'border-rose-500/50' : 'border-brand-copper/20'
                  }`}
                />
                {errors.loanAccountNumber && (
                  <span className="flex items-center gap-1 mt-1 text-xs text-rose-400">
                    <AlertCircle size={12} /> {errors.loanAccountNumber}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Documents upload */}
        {activeStep === 4 && (
          <div className="space-y-6 animate-fadeIn">
            <h3 className="text-sm font-semibold text-brand-slate uppercase tracking-wider">
              Document Uploads (Mock Simulation)
            </h3>
            
            <div className="space-y-4">
              {[
                { type: 'LOAN_SLIP' as const, label: 'Loan Slip / Bank Pledge Slip', placeholder: 'loan_slip.pdf' },
                { type: 'KYC' as const, label: 'KYC Document (Aadhaar/PAN)', placeholder: 'aadhaar_card.pdf' },
                { type: 'ADDITIONAL' as const, label: 'Additional Documents (Purity test report, etc.)', placeholder: 'receipt.png' }
              ].map((docType) => {
                const file = uploadedFiles[docType.type];
                return (
                  <div key={docType.type} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-brand-cherry/40 border border-brand-copper/20 gap-3">
                    <div>
                      <h4 className="text-sm font-semibold text-brand-silver">{docType.label}</h4>
                      <p className="text-xs text-brand-slate/60 mt-0.5">
                        {file ? `${file.name} (${file.progress}%)` : 'No file selected'}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      {file ? (
                        <div className="flex items-center gap-2">
                          {!file.done ? (
                            <Loader2 className="animate-spin text-brand-copper" size={18} />
                          ) : (
                            <span className="text-xs text-emerald-400 bg-emerald-500/10 py-1 px-2.5 rounded-full border border-emerald-500/10 font-medium flex items-center gap-1">
                              <CheckCircle2 size={12} /> Uploaded
                            </span>
                          )}
                          {file.done && (
                            <button
                              type="button"
                              onClick={() => setUploadedFiles(prev => {
                                const copy = { ...prev };
                                delete copy[docType.type];
                                return copy;
                              })}
                              className="text-xs text-brand-slate hover:text-rose-450 transition-colors cursor-pointer"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleFileUploadSimulate(docType.type, docType.placeholder)}
                          className="flex items-center gap-1.5 text-xs text-brand-silver bg-brand-mahogany border border-brand-copper/30 hover:bg-brand-copper/20 hover:border-brand-copper transition-all font-medium py-1.5 px-3 rounded-lg cursor-pointer"
                        >
                          <Upload size={13} /> Select Mock File
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-brand-copper/20">
          <div>
            {activeStep > 1 && (
              <button
                type="button"
                onClick={handleBack}
                className="px-5 py-2.5 rounded-xl text-sm font-medium border border-brand-copper/30 bg-brand-mahogany/80 text-brand-silver hover:bg-brand-mahogany hover:text-white transition-colors cursor-pointer"
              >
                Back
              </button>
            )}
          </div>

          <div className="flex gap-2">
            {activeStep < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-brand-copper text-brand-silver hover:bg-brand-copper/80 transition-colors shadow-lg cursor-pointer"
              >
                Next Step
              </button>
            ) : (
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-brand-copper text-brand-silver hover:bg-brand-copper/80 transition-colors shadow-lg cursor-pointer"
              >
                {editingLead ? 'Save Changes' : 'Create & Save Lead'}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
