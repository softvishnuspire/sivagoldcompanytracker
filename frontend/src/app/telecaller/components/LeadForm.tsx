"use client";

import React, { useState, useEffect } from 'react';
import { 
  User, 
  Coins, 
  Building2, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  Plus
} from 'lucide-react';
import { Lead, Document } from '../types';
import FileUploader from '../../../components/ui/FileUploader';
import Button from '../../../components/ui/Button';

const sanitizeMathExpression = (val: string): string => {
  return val.replace(/[^0-9.+-/*()xX\u00d7%]/g, '');
};

interface LeadFormProps {
  onSave: (lead: Omit<Lead, 'id' | 'leadNumber' | 'createdAt' | 'updatedAt'> & { id?: string }) => void | Promise<void>;
  editingLead?: Lead | null;
  onCancel: () => void;
  leadSources?: string[];
}

export default function LeadForm({ onSave, editingLead, onCancel, leadSources = [] }: LeadFormProps) {
  const [activeStep, setActiveStep] = useState<number>(1);
  const [formData, setFormData] = useState({
    customerName: '',
    mobile: '',
    alternateMobile: '',
    address: '',
    district: '',
    goldWeight: '',
    goldType: '22K',
    estimatedValue: '',
    bankName: '',
    branchName: '',
    loanAmount: '',
    loanAccountNumber: '',
    source: '',
    status: 'CUSTOMER_DETAILS_CREATED' as Lead['status']
  });

  const [selectedPurities, setSelectedPurities] = useState<string[]>(['22K']);
  const [purityWeights, setPurityWeights] = useState<Record<string, string>>({
    '24K': '',
    '22K': '',
    '20K': '',
    '18K': ''
  });
  const [purityEstimatedValues, setPurityEstimatedValues] = useState<Record<string, string>>({
    '24K': '',
    '22K': '',
    '20K': '',
    '18K': ''
  });

  const [uploadedFiles, setUploadedFiles] = useState<{
    LOAN_SLIP: Array<{ id: string; name: string; progress: number; done: boolean; url?: string }>;
    KYC: Array<{ id: string; name: string; progress: number; done: boolean; url?: string }>;
    ADDITIONAL: Array<{ id: string; name: string; progress: number; done: boolean; url?: string }>;
  }>({
    LOAN_SLIP: [{ id: 'init-loan-0', name: '', progress: 0, done: false, url: '' }],
    KYC: [{ id: 'init-kyc-0', name: '', progress: 0, done: false, url: '' }],
    ADDITIONAL: [{ id: 'init-additional-0', name: '', progress: 0, done: false, url: '' }]
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formStatus, setFormStatus] = useState<"Not Started" | "In Progress" | "Saved" | "Submitted">("Not Started");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const parsePurityWeightsAndEstimates = (goldTypeStr: string, totalWeightStr: string, totalEstStr: string) => {
    const weights: Record<string, string> = {
      '24K': '',
      '22K': '',
      '20K': '',
      '18K': ''
    };
    const estimates: Record<string, string> = {
      '24K': '',
      '22K': '',
      '20K': '',
      '18K': ''
    };

    if (!goldTypeStr) return { weights, estimates };

    // Matches e.g. "24K (10g, ₹50000)" or "22K (20.5g)" or "20K (15.5 g, ₹60000)"
    const regex = /(\d+K)\s*\(?\s*([0-9.]+)\s*g?\s*(?:,\s*₹?\s*([0-9.]+))?\s*\)?/gi;
    let match;
    let foundAny = false;

    while ((match = regex.exec(goldTypeStr)) !== null) {
      const purity = match[1].toUpperCase();
      const weight = match[2];
      const estimate = match[3] || '';
      if (purity in weights) {
        weights[purity] = weight;
        estimates[purity] = estimate;
        foundAny = true;
      }
    }

    if (!foundAny) {
      const purities = goldTypeStr.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
      if (purities.length === 1 && purities[0] in weights) {
        weights[purities[0]] = totalWeightStr;
        estimates[purities[0]] = totalEstStr;
      }
    }

    return { weights, estimates };
  };

  const updateGoldFormData = (
    purities: string[], 
    weights: Record<string, string>, 
    estimates: Record<string, string>
  ) => {
    const goldTypeParts = purities.map(p => {
      const w = weights[p] || '';
      const ev = estimates[p] || '';
      if (w && ev) {
        return `${p} (${w}g, ₹${ev})`;
      } else if (w) {
        return `${p} (${w}g)`;
      } else {
        return p;
      }
    });
    const goldTypeStr = goldTypeParts.join(', ');

    let totalWeight = 0;
    let hasAnyWeight = false;
    purities.forEach(p => {
      const w = parseFloat(weights[p]);
      if (!isNaN(w) && w > 0) {
        totalWeight += w;
        hasAnyWeight = true;
      }
    });

    let totalEstimatedValue = 0;
    let hasAnyEstValue = false;
    purities.forEach(p => {
      const ev = parseFloat(estimates[p]);
      if (!isNaN(ev) && ev > 0) {
        totalEstimatedValue += ev;
        hasAnyEstValue = true;
      }
    });

    setFormData(prev => ({
      ...prev,
      goldType: goldTypeStr,
      goldWeight: hasAnyWeight ? totalWeight.toFixed(2) : prev.goldWeight,
      estimatedValue: hasAnyEstValue ? totalEstimatedValue.toFixed(2) : prev.estimatedValue
    }));
  };

  const handleGoldTypeToggle = (purity: string) => {
    let nextPurities = [...selectedPurities];
    const nextWeights = { ...purityWeights };
    const nextEstimates = { ...purityEstimatedValues };

    if (nextPurities.includes(purity)) {
      nextPurities = nextPurities.filter(p => p !== purity);
      nextWeights[purity] = ''; // Clear weight when unchecked
      nextEstimates[purity] = ''; // Clear estimate when unchecked
    } else {
      nextPurities.push(purity);
    }

    const order = ['24K', '22K', '20K', '18K'];
    nextPurities.sort((a, b) => order.indexOf(a) - order.indexOf(b));

    setSelectedPurities(nextPurities);
    setPurityWeights(nextWeights);
    setPurityEstimatedValues(nextEstimates);
    updateGoldFormData(nextPurities, nextWeights, nextEstimates);

    if (formStatus === "Not Started") {
      setFormStatus("In Progress");
    }

    if (errors.goldType) {
      setErrors(prev => {
        const copy = { ...prev };
        delete copy.goldType;
        return copy;
      });
    }
  };

  const handleWeightChange = (purity: string, value: string) => {
    const cleanValue = sanitizeMathExpression(value);
    const nextWeights = { ...purityWeights, [purity]: cleanValue };
    setPurityWeights(nextWeights);
    updateGoldFormData(selectedPurities, nextWeights, purityEstimatedValues);

    if (formStatus === "Not Started") {
      setFormStatus("In Progress");
    }

    if (errors[`weight_${purity}`]) {
      setErrors(prev => {
        const copy = { ...prev };
        delete copy[`weight_${purity}`];
        return copy;
      });
    }
  };

  const handleEstimateChange = (purity: string, value: string) => {
    const cleanValue = sanitizeMathExpression(value);
    const nextEstimates = { ...purityEstimatedValues, [purity]: cleanValue };
    setPurityEstimatedValues(nextEstimates);
    updateGoldFormData(selectedPurities, purityWeights, nextEstimates);

    if (formStatus === "Not Started") {
      setFormStatus("In Progress");
    }

    if (errors[`estimate_${purity}`]) {
      setErrors(prev => {
        const copy = { ...prev };
        delete copy[`estimate_${purity}`];
        return copy;
      });
    }
  };

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
        source: editingLead.source || '',
        status: editingLead.status
      });

      // Parse and populate purity weights and estimated values
      const { weights: parsedWeights, estimates: parsedEstimates } = parsePurityWeightsAndEstimates(
        editingLead.goldType,
        editingLead.goldWeight.toString(),
        editingLead.estimatedValue.toString()
      );
      setPurityWeights(parsedWeights);
      setPurityEstimatedValues(parsedEstimates);

      let activePurities = Object.keys(parsedWeights).filter(p => parsedWeights[p] !== '');
      if (activePurities.length === 0 && editingLead.goldType) {
        // Fallback: if weights weren't parsed but purities are listed (old format)
        activePurities = editingLead.goldType.split(', ').map(s => s.trim().toUpperCase()).filter(Boolean);
      }
      setSelectedPurities(activePurities);

      // Map editing documents
      const docs = {
        LOAN_SLIP: [] as Array<{ id: string; name: string; progress: number; done: boolean; url?: string }>,
        KYC: [] as Array<{ id: string; name: string; progress: number; done: boolean; url?: string }>,
        ADDITIONAL: [] as Array<{ id: string; name: string; progress: number; done: boolean; url?: string }>
      };
      
      editingLead.documents?.forEach(d => {
        let cat: 'LOAN_SLIP' | 'KYC' | 'ADDITIONAL' = 'ADDITIONAL';
        const typeStr = d.documentType as string;
        if (typeStr === 'LOAN_SLIP') {
          cat = 'LOAN_SLIP';
        } else if (typeStr === 'AADHAR' || typeStr === 'PAN' || typeStr === 'KYC') {
          cat = 'KYC';
        } else {
          cat = 'ADDITIONAL';
        }
        
        docs[cat].push({
          id: d.id || `D-${Math.random().toString(36).substr(2, 9)}`,
          name: d.fileName,
          progress: 100,
          done: true,
          url: d.fileUrl
        });
      });

      if (docs.LOAN_SLIP.length === 0) {
        docs.LOAN_SLIP.push({ id: `init-loan-${Math.random().toString(36).substr(2, 9)}`, name: '', progress: 0, done: false, url: '' });
      }
      if (docs.KYC.length === 0) {
        docs.KYC.push({ id: `init-kyc-${Math.random().toString(36).substr(2, 9)}`, name: '', progress: 0, done: false, url: '' });
      }
      if (docs.ADDITIONAL.length === 0) {
        docs.ADDITIONAL.push({ id: `init-additional-${Math.random().toString(36).substr(2, 9)}`, name: '', progress: 0, done: false, url: '' });
      }
      
      setUploadedFiles(docs);
      setFormStatus("Saved");
    } else {
      setFormStatus("Not Started");
      setSelectedPurities(['22K']);
      setPurityWeights({
        '24K': '',
        '22K': '',
        '20K': '',
        '18K': ''
      });
      setPurityEstimatedValues({
        '24K': '',
        '22K': '',
        '20K': '',
        '18K': ''
      });
    }
  }, [editingLead]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name } = e.target;
    let value = e.target.value;

    if (name === 'mobile' || name === 'alternateMobile') {
      value = value.replace(/[^0-9]/g, '').slice(0, 10);
    } else if (name === 'loanAmount') {
      value = sanitizeMathExpression(value);
    }

    setFormData(prev => ({ ...prev, [name]: value }));
    if (formStatus === "Not Started") {
      setFormStatus("In Progress");
    }
    if (errors[name]) {
      setErrors(prev => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
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
      if (!formData.district.trim()) stepErrors.district = 'District is required';
    }

    if (step === 2) {
      if (selectedPurities.length === 0) {
        stepErrors.goldType = 'At least one gold purity must be selected';
      } else {
        selectedPurities.forEach(purity => {
          const w = parseFloat(purityWeights[purity]);
          if (isNaN(w) || w <= 0) {
            stepErrors[`weight_${purity}`] = `${purity} weight must be a positive number`;
          }
          const ev = parseFloat(purityEstimatedValues[purity]);
          if (isNaN(ev) || ev <= 0) {
            stepErrors[`estimate_${purity}`] = `${purity} estimated value must be a positive number`;
          }
        });
      }
      const weight = parseFloat(formData.goldWeight);
      if (isNaN(weight) || weight <= 0) {
        stepErrors.goldWeight = 'Total weight must be a positive number';
      }
      const val = parseFloat(formData.estimatedValue);
      if (isNaN(val) || val <= 0) {
        stepErrors.estimatedValue = 'Total estimated value must be a positive number';
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

    if (step === 4) {
      const hasLoanSlip = uploadedFiles.LOAN_SLIP.some(f => f.done && f.url);
      const hasKyc = uploadedFiles.KYC.some(f => f.done && f.url);
      const hasAdditional = uploadedFiles.ADDITIONAL.some(f => f.done && f.url);

      if (!hasLoanSlip) {
        stepErrors.LOAN_SLIP = 'At least one Loan Slip / Pledge Slip document is required';
      }
      if (!hasKyc) {
        stepErrors.KYC = 'At least one KYC document (Aadhaar/PAN) is required';
      }
      if (!hasAdditional) {
        stepErrors.ADDITIONAL = 'At least one Additional document is required';
      }
    }

    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep(prev => prev + 1);
      if (formStatus === "Not Started") {
        setFormStatus("In Progress");
      }
    }
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(activeStep)) return;
    if (isSubmitting) return;

    setIsSubmitting(true);
    setFormStatus("Submitted");

    // Build documents array
    const documents: Document[] = [];
    Object.entries(uploadedFiles).forEach(([type, slots]) => {
      if (Array.isArray(slots)) {
        slots.forEach((file) => {
          if (file && file.done && file.url) {
            documents.push({
              id: file.id.startsWith('slot-') || file.id.startsWith('init-')
                ? `D-${Math.random().toString(36).substr(2, 9)}`
                : file.id,
              leadId: editingLead?.id || '',
              documentType: type as Document['documentType'],
              fileName: file.name,
              fileUrl: file.url,
              uploadedBy: 'TC-01',
              createdAt: new Date().toISOString()
            });
          }
        });
      }
    });

    try {
      await onSave({
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
        source: formData.source || undefined,
        status: formData.status,
        telecallerId: editingLead?.telecallerId || 'TC-01',
        rmId: editingLead?.rmId,
        executiveId: editingLead?.executiveId,
        documents
      });
      setFormStatus("Saved");
    } catch (err) {
      setFormStatus("In Progress");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveAsPendingFollowup = async () => {
    if (!validateStep(1)) return;
    if (isSubmitting) return;

    setIsSubmitting(true);
    setFormStatus("Submitted");

    try {
      await onSave({
        id: editingLead?.id,
        customerName: formData.customerName.trim(),
        mobile: formData.mobile.trim(),
        alternateMobile: formData.alternateMobile.trim() || undefined,
        address: formData.address.trim(),
        district: formData.district,
        goldWeight: parseFloat(formData.goldWeight) || 0,
        goldType: formData.goldType || '22K',
        estimatedValue: parseFloat(formData.estimatedValue) || 0,
        bankName: formData.bankName.trim() || '',
        branchName: formData.branchName.trim() || '',
        loanAmount: parseFloat(formData.loanAmount) || 0,
        loanAccountNumber: formData.loanAccountNumber.trim() || '',
        source: formData.source || undefined,
        status: 'FOLLOWUP_IN_PROGRESS',
        telecallerId: editingLead?.telecallerId || 'TC-01',
        rmId: editingLead?.rmId,
        executiveId: editingLead?.executiveId,
        documents: []
      });
      setFormStatus("Saved");
    } catch (err) {
      setFormStatus("In Progress");
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { num: 1, label: 'Customer', icon: User },
    { num: 2, label: 'Gold Details', icon: Coins },
    { num: 3, label: 'Bank Info', icon: Building2 },
    { num: 4, label: 'Documents', icon: FileText }
  ];

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm max-w-3xl mx-auto w-full text-slate-800 relative">
      {/* Form Status Badge */}
      <div className="absolute top-6 right-6">
        <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border tracking-wider transition-colors duration-200 ${
          formStatus === "Not Started" ? "bg-slate-100 text-slate-600 border-slate-200" :
          formStatus === "In Progress" ? "bg-amber-50 text-amber-700 border-amber-300" :
          formStatus === "Saved" ? "bg-blue-50 text-blue-700 border-blue-300" :
          "bg-emerald-50 text-emerald-700 border-emerald-300"
        }`}>
          {formStatus}
        </span>
      </div>

      <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200 mr-24">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <span className="p-2 rounded-lg bg-amber-500/10 text-amber-700 border border-amber-500/30 animate-scaleUp">
            <Plus size={20} />
          </span>
          {editingLead ? 'Edit Lead' : 'Create New Lead'}
        </h2>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={(e) => {
            e.preventDefault();
            onCancel();
          }}
          className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
      </div>

      {editingLead && editingLead.status === 'RM_REVERIFICATION' && (
        <div className="mb-6 p-4 rounded-xl bg-orange-50 border border-orange-200 text-orange-850 flex items-start gap-3 animate-fadeIn">
          <AlertCircle size={20} className="text-orange-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-extrabold text-orange-950 uppercase tracking-wide">Re-Verification Requested by RM</h4>
            <p className="text-xs text-orange-700 leading-relaxed font-semibold">
              {editingLead.reverificationRemarks || 'Please review the documents and lead details, correct any errors, and save changes to resubmit to RM.'}
            </p>
          </div>
        </div>
      )}

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
                  disabled={isSubmitting}
                  onClick={(e) => {
                    e.preventDefault();
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
                  className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-300 cursor-pointer disabled:opacity-50 ${
                    isCompleted
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 font-bold shadow-sm'
                      : isActive
                      ? 'bg-amber-500/15 border-amber-500 text-amber-600 shadow-sm'
                      : 'bg-slate-55/60 border-slate-200 text-slate-400 hover:border-slate-350'
                  }`}
                >
                  {isCompleted ? <CheckCircle2 size={18} /> : <StepIcon size={18} />}
                </button>
                <span className={`text-[11px] font-bold ${isActive ? 'text-slate-805' : 'text-slate-400'}`}>
                  {s.label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div
                  className={`flex-1 h-[2px] mx-2 -mt-5 transition-colors duration-300 ${
                    activeStep > s.num ? 'bg-amber-500' : 'bg-slate-200'
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
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Customer Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">
                  Customer Name *
                </label>
                <input
                  type="text"
                  name="customerName"
                  disabled={isSubmitting}
                  value={formData.customerName}
                  onChange={handleInputChange}
                  placeholder="e.g. Anil Kumar"
                  className={`w-full bg-white border rounded-xl py-2.5 px-3.5 text-sm text-slate-800 outline-none transition-all focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 placeholder-slate-400/70 disabled:opacity-60 ${
                    errors.customerName ? 'border-rose-500/50' : 'border-slate-200'
                  }`}
                />
                {errors.customerName && (
                  <span className="flex items-center gap-1 mt-1 text-xs text-rose-500">
                    <AlertCircle size={12} /> {errors.customerName}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">
                  District *
                </label>
                <input
                  type="text"
                  name="district"
                  disabled={isSubmitting}
                  value={formData.district}
                  onChange={handleInputChange}
                  placeholder="e.g. Vijayawada"
                  className={`w-full bg-white border rounded-xl py-2.5 px-3.5 text-sm text-slate-800 outline-none transition-all focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 placeholder-slate-400/70 disabled:opacity-60 ${
                    errors.district ? 'border-rose-500/50' : 'border-slate-200'
                  }`}
                />
                {errors.district && (
                  <span className="flex items-center gap-1 mt-1 text-xs text-rose-500">
                    <AlertCircle size={12} /> {errors.district}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">
                  Mobile Number (Primary) *
                </label>
                <input
                  type="text"
                  name="mobile"
                  inputMode="numeric"
                  maxLength={10}
                  disabled={isSubmitting}
                  value={formData.mobile}
                  onChange={handleInputChange}
                  placeholder="e.g. 9876543210"
                  className={`w-full bg-white border rounded-xl py-2.5 px-3.5 text-sm text-slate-800 outline-none transition-all focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 placeholder-slate-400/70 disabled:opacity-60 ${
                    errors.mobile ? 'border-rose-500/50' : 'border-slate-200'
                  }`}
                />
                {errors.mobile && (
                  <span className="flex items-center gap-1 mt-1 text-xs text-rose-500">
                    <AlertCircle size={12} /> {errors.mobile}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">
                  Alternate Mobile Number
                </label>
                <input
                  type="text"
                  name="alternateMobile"
                  inputMode="numeric"
                  maxLength={10}
                  disabled={isSubmitting}
                  value={formData.alternateMobile}
                  onChange={handleInputChange}
                  placeholder="e.g. 8765432109"
                  className={`w-full bg-white border rounded-xl py-2.5 px-3.5 text-sm text-slate-800 outline-none transition-all focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 placeholder-slate-400/70 disabled:opacity-60 ${
                    errors.alternateMobile ? 'border-rose-500/50' : 'border-slate-200'
                  }`}
                />
                {errors.alternateMobile && (
                  <span className="flex items-center gap-1 mt-1 text-xs text-rose-500">
                    <AlertCircle size={12} /> {errors.alternateMobile}
                  </span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">
                Full Address *
              </label>
              <textarea
                name="address"
                rows={3}
                disabled={isSubmitting}
                value={formData.address}
                onChange={handleInputChange}
                placeholder="Street address, Flat number, Landmark details..."
                className={`w-full bg-white border rounded-xl py-2.5 px-3.5 text-sm text-slate-800 outline-none transition-all focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 placeholder-slate-400/70 resize-none disabled:opacity-60 ${
                  errors.address ? 'border-rose-500/50' : 'border-slate-200'
                }`}
              />
              {errors.address && (
                <span className="flex items-center gap-1 mt-1 text-xs text-rose-500">
                  <AlertCircle size={12} /> {errors.address}
                </span>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">
                Where Did They Hear About Us?
              </label>
              <select
                name="source"
                disabled={isSubmitting}
                value={formData.source}
                onChange={handleInputChange}
                className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3.5 text-sm text-slate-800 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 disabled:opacity-60"
              >
                <option value="">Select source (optional)</option>
                {leadSources && leadSources.length > 0 ? (
                  leadSources.map((src) => (
                    <option key={src} value={src}>{src}</option>
                  ))
                ) : (
                  <>
                    <option value="Website">Website</option>
                    <option value="Facebook Ads">Facebook Ads</option>
                    <option value="Google Ads">Google Ads</option>
                    <option value="Referrals">Referrals</option>
                    <option value="Direct Calls">Direct Calls</option>
                    <option value="Walk Ins">Walk Ins</option>
                  </>
                )}
              </select>
            </div>
          </div>
        )}

        {/* Step 2: Gold details */}
        {activeStep === 2 && (
          <div className="space-y-4 animate-fadeIn">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Gold & Asset Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">
                  Gold Weight (Grams) *
                </label>
                <input
                  type="text"
                  name="goldWeight"
                  readOnly
                  disabled={isSubmitting}
                  value={formData.goldWeight}
                  placeholder="Calculated automatically"
                  className={`w-full bg-slate-50 border rounded-xl py-2.5 px-3.5 text-sm text-slate-800 outline-none placeholder-slate-400/70 disabled:opacity-60 cursor-not-allowed ${
                    errors.goldWeight ? 'border-rose-500/50' : 'border-slate-200'
                  }`}
                />
                <p className="text-[10px] text-slate-400 mt-1">Calculated automatically as the sum of purity weights.</p>
                {errors.goldWeight && (
                  <span className="flex items-center gap-1 mt-1 text-xs text-rose-500">
                    <AlertCircle size={12} /> {errors.goldWeight}
                  </span>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">
                  Gold Purity *
                </label>
                <div className={`grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border transition-colors ${
                  errors.goldType ? 'border-rose-500/50' : 'border-slate-200'
                }`}>
                  {['24K', '22K', '20K', '18K'].map((purity) => {
                    const isChecked = selectedPurities.includes(purity);
                    return (
                      <label key={purity} className="flex items-center gap-2.5 text-sm text-slate-705 cursor-pointer select-none font-semibold">
                        <input
                          type="checkbox"
                          disabled={isSubmitting}
                          checked={isChecked}
                          onChange={() => handleGoldTypeToggle(purity)}
                          className="w-4.5 h-4.5 text-amber-600 border-slate-350 rounded focus:ring-amber-500/20 accent-amber-600 cursor-pointer"
                        />
                        {purity}
                      </label>
                    );
                  })}
                </div>
                {errors.goldType && (
                  <span className="flex items-center gap-1 mt-1 text-xs text-rose-500">
                    <AlertCircle size={12} /> {errors.goldType}
                  </span>
                )}
              </div>

              {selectedPurities.length > 0 && (
                <div className="md:col-span-2 space-y-4 bg-amber-500/5 p-4 sm:p-6 rounded-xl border border-amber-500/20 animate-fadeIn">
                  <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider border-b border-amber-500/10 pb-2 mb-2">
                    Purity Details (Weight & Estimated Value)
                  </h4>
                  <div className="space-y-4">
                    {selectedPurities.map((purity) => (
                      <div key={purity} className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-slate-200/40 pb-4 last:border-0 last:pb-0 animate-fadeIn">
                        <div>
                          <label className="block text-xs font-bold text-slate-605 mb-1 uppercase">
                            {purity} Gold Weight (Grams) *
                          </label>
                          <input
                            type="text"
                            inputMode="decimal"
                            disabled={isSubmitting}
                            value={purityWeights[purity] || ''}
                            onChange={(e) => handleWeightChange(purity, e.target.value)}
                            placeholder={`Enter weight for ${purity}`}
                            className={`w-full bg-white border rounded-xl py-2 px-3 text-sm text-slate-800 outline-none transition-all focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 placeholder-slate-400/70 disabled:opacity-60 ${
                              errors[`weight_${purity}`] ? 'border-rose-500/50' : 'border-slate-200'
                            }`}
                          />
                          {errors[`weight_${purity}`] && (
                            <span className="flex items-center gap-1 mt-1 text-xs text-rose-500">
                              <AlertCircle size={12} /> {errors[`weight_${purity}`]}
                            </span>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-655 mb-1 uppercase">
                            {purity} Estimated Value (₹) *
                          </label>
                          <input
                            type="text"
                            inputMode="decimal"
                            disabled={isSubmitting}
                            value={purityEstimatedValues[purity] || ''}
                            onChange={(e) => handleEstimateChange(purity, e.target.value)}
                            placeholder={`Enter estimated value for ${purity}`}
                            className={`w-full bg-white border rounded-xl py-2 px-3 text-sm text-slate-800 outline-none transition-all focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 placeholder-slate-400/70 disabled:opacity-60 ${
                              errors[`estimate_${purity}`] ? 'border-rose-500/50' : 'border-slate-200'
                            }`}
                          />
                          {errors[`estimate_${purity}`] && (
                            <span className="flex items-center gap-1 mt-1 text-xs text-rose-500">
                              <AlertCircle size={12} /> {errors[`estimate_${purity}`]}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Bank & Loan details */}
        {activeStep === 3 && (
          <div className="space-y-4 animate-fadeIn">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Bank & Pledge Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">
                  Pledged Bank Name *
                </label>
                <input
                  type="text"
                  name="bankName"
                  disabled={isSubmitting}
                  value={formData.bankName}
                  onChange={handleInputChange}
                  placeholder="e.g. Muthoot Finance, SBI"
                  className={`w-full bg-white border rounded-xl py-2.5 px-3.5 text-sm text-slate-800 outline-none transition-all focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 placeholder-slate-400/70 disabled:opacity-60 ${
                    errors.bankName ? 'border-rose-500/50' : 'border-slate-200'
                  }`}
                />
                {errors.bankName && (
                  <span className="flex items-center gap-1 mt-1 text-xs text-rose-500">
                    <AlertCircle size={12} /> {errors.bankName}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">
                  Branch Name *
                </label>
                <input
                  type="text"
                  name="branchName"
                  disabled={isSubmitting}
                  value={formData.branchName}
                  onChange={handleInputChange}
                  placeholder="e.g. Benz Circle Branch"
                  className={`w-full bg-white border rounded-xl py-2.5 px-3.5 text-sm text-slate-800 outline-none transition-all focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 placeholder-slate-400/70 disabled:opacity-60 ${
                    errors.branchName ? 'border-rose-500/50' : 'border-slate-200'
                  }`}
                />
                {errors.branchName && (
                  <span className="flex items-center gap-1 mt-1 text-xs text-rose-500">
                    <AlertCircle size={12} /> {errors.branchName}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">
                  Loan Amount Pledged (₹) *
                </label>
                <input
                  type="text"
                  name="loanAmount"
                  inputMode="decimal"
                  disabled={isSubmitting}
                  value={formData.loanAmount}
                  onChange={handleInputChange}
                  placeholder="e.g. 150000"
                  className={`w-full bg-white border rounded-xl py-2.5 px-3.5 text-sm text-slate-800 outline-none transition-all focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 placeholder-slate-400/70 disabled:opacity-60 ${
                    errors.loanAmount ? 'border-rose-500/50' : 'border-slate-200'
                  }`}
                />
                {errors.loanAmount && (
                  <span className="flex items-center gap-1 mt-1 text-xs text-rose-500">
                    <AlertCircle size={12} /> {errors.loanAmount}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">
                  Loan Account Number *
                </label>
                <input
                  type="text"
                  name="loanAccountNumber"
                  disabled={isSubmitting}
                  value={formData.loanAccountNumber}
                  onChange={handleInputChange}
                  placeholder="e.g. LN1029384756"
                  className={`w-full bg-white border rounded-xl py-2.5 px-3.5 text-sm text-slate-800 outline-none transition-all focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 placeholder-slate-400/70 disabled:opacity-60 ${
                    errors.loanAccountNumber ? 'border-rose-500/50' : 'border-slate-200'
                  }`}
                />
                {errors.loanAccountNumber && (
                  <span className="flex items-center gap-1 mt-1 text-xs text-rose-500">
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
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Document Uploads
            </h3>
            
            <div className="space-y-6">
              {[
                { type: 'LOAN_SLIP' as const, label: 'Loan Slip / Bank Pledge Slip' },
                { type: 'KYC' as const, label: 'KYC Document (Aadhaar/PAN)' },
                { type: 'ADDITIONAL' as const, label: 'Additional Documents (Purity test report, etc.)' }
              ].map((docCategory) => {
                const slots = uploadedFiles[docCategory.type] || [];
                return (
                  <div key={docCategory.type} className="space-y-3 p-4 border border-slate-200/60 rounded-2xl bg-slate-50/20">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-700">
                        {docCategory.label}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setUploadedFiles(prev => ({
                            ...prev,
                            [docCategory.type]: [
                              ...prev[docCategory.type],
                              { id: `slot-${Math.random().toString(36).substr(2, 9)}`, name: '', progress: 0, done: false, url: '' }
                            ]
                          }));
                        }}
                        className="flex items-center gap-1 text-xs font-bold text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 py-1.5 px-3 rounded-lg border border-amber-200 transition-all cursor-pointer"
                      >
                        <Plus size={14} /> Add More
                      </button>
                    </div>
                    
                    {slots.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-2">No documents added. Click "Add More" to upload.</p>
                    ) : (
                      <div className="space-y-2.5">
                        {slots.map((slot, index) => (
                          <FileUploader
                            key={slot.id}
                            label={`${docCategory.label} #${index + 1}`}
                            documentType={docCategory.type}
                            initialUrl={slot.url || ""}
                            initialName={slot.name || ""}
                            onUploadSuccess={(url, name) => {
                              if (formStatus === "Not Started") {
                                setFormStatus("In Progress");
                              }
                              setUploadedFiles(prev => ({
                                ...prev,
                                [docCategory.type]: prev[docCategory.type].map(s => 
                                  s.id === slot.id ? { ...s, name, progress: 100, done: true, url } : s
                                )
                              }));
                            }}
                            onRemove={() => {
                              if (slot.url || slot.name) {
                                if (!window.confirm("Are you sure you want to remove this uploaded document?")) {
                                  return;
                                }
                              }
                              if (formStatus === "Not Started") {
                                setFormStatus("In Progress");
                              }
                              setUploadedFiles(prev => ({
                                ...prev,
                                [docCategory.type]: prev[docCategory.type].filter(s => s.id !== slot.id)
                              }));
                            }}
                          />
                        ))}
                      </div>
                    )}

                    {errors[docCategory.type] && (
                      <span className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-rose-500 bg-rose-50/80 border border-rose-200/50 rounded-xl p-2.5">
                        <AlertCircle size={13} className="shrink-0" /> {errors[docCategory.type]}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <div>
            {activeStep > 1 && (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={(e) => {
                  e.preventDefault();
                  handleBack();
                }}
                className="px-5 py-2.5 rounded-xl text-sm font-medium border border-slate-200 bg-white text-slate-650 hover:bg-slate-50 hover:text-slate-800 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Back
              </button>
            )}
          </div>

          <div className="flex gap-2">
            {activeStep === 1 && (
              <Button
                type="button"
                state={isSubmitting ? "loading" : "idle"}
                loadingText="Adding..."
                onClick={(e) => {
                  e.preventDefault();
                  handleSaveAsPendingFollowup();
                }}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors shadow-sm cursor-pointer"
              >
                Add to pending follow ups
              </Button>
            )}
            {activeStep < 4 ? (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={(e) => {
                  e.preventDefault();
                  handleNext();
                }}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#c3902c] hover:bg-amber-600 text-white transition-colors shadow-md cursor-pointer disabled:opacity-50"
              >
                Next Step
              </button>
            ) : (
              <Button
                type="submit"
                state={isSubmitting ? "loading" : "idle"}
                loadingText={editingLead ? "Saving..." : "Creating..."}
                successText={editingLead ? "Saved ✓" : "Created ✓"}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#c3902c] hover:bg-amber-600 text-white transition-colors shadow-md cursor-pointer"
              >
                {editingLead ? 'Save Changes' : 'Create & Save Lead'}
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
