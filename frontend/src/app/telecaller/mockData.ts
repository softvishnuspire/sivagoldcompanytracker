import { Lead, Followup } from './types';

// Helper to get relative dates
const getDateAgo = (daysAgo: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
};

const getDateAhead = (daysAhead: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().split('T')[0]; // YYYY-MM-DD
};

export const INITIAL_LEADS: Lead[] = [
  {
    id: 'L-101',
    leadNumber: 'SGL-2026-0001',
    customerName: 'Anil Kumar',
    mobile: '9876543210',
    alternateMobile: '9876543211',
    address: 'Flat 402, Sai Balaji Residency, Benz Circle',
    district: 'Vijayawada',
    goldWeight: 45.5,
    goldType: 'Jewelry (22K)',
    estimatedValue: 275000,
    bankName: 'State Bank of India',
    branchName: 'Benz Circle Branch',
    loanAmount: 180000,
    loanAccountNumber: 'SBI1098237465',
    status: 'NEW LEAD',
    telecallerId: 'TC-01',
    createdAt: getDateAgo(2),
    updatedAt: getDateAgo(2),
    documents: [
      {
        id: 'D-01',
        leadId: 'L-101',
        documentType: 'LOAN_SLIP',
        fileName: 'anil_sbi_slip.pdf',
        fileUrl: '#',
        uploadedBy: 'TC-01',
        createdAt: getDateAgo(2)
      }
    ],
    followups: []
  },
  {
    id: 'L-102',
    leadNumber: 'SGL-2026-0002',
    customerName: 'Srikanth Reddy',
    mobile: '8765432109',
    alternateMobile: '8765432108',
    address: 'H.No 12-3-45/A, Gachibowli',
    district: 'Hyderabad',
    goldWeight: 120.0,
    goldType: 'Gold Coins (24K)',
    estimatedValue: 750000,
    bankName: 'HDFC Bank',
    branchName: 'Gachibowli Branch',
    loanAmount: 500000,
    loanAccountNumber: 'HDFC908234857',
    status: 'FOLLOW-UP',
    telecallerId: 'TC-01',
    createdAt: getDateAgo(5),
    updatedAt: getDateAgo(1),
    documents: [
      {
        id: 'D-02',
        leadId: 'L-102',
        documentType: 'LOAN_SLIP',
        fileName: 'srikanth_hdfc_slip.jpg',
        fileUrl: '#',
        uploadedBy: 'TC-01',
        createdAt: getDateAgo(5)
      },
      {
        id: 'D-03',
        leadId: 'L-102',
        documentType: 'KYC',
        fileName: 'srikanth_aadhaar.pdf',
        fileUrl: '#',
        uploadedBy: 'TC-01',
        createdAt: getDateAgo(5)
      }
    ],
    followups: [
      {
        id: 'F-01',
        leadId: 'L-102',
        followupDate: getDateAhead(0), // Today
        remarks: 'Customer requested to call back at 4 PM to confirm bank visit.',
        status: 'PENDING',
        createdBy: 'TC-01',
        createdAt: getDateAgo(1)
      }
    ]
  },
  {
    id: 'L-103',
    leadNumber: 'SGL-2026-0003',
    customerName: 'Rama Rao V.',
    mobile: '7654321098',
    address: 'Door 4-88, Dwaraka Nagar',
    district: 'Vizag',
    goldWeight: 65.0,
    goldType: 'Jewelry (22K)',
    estimatedValue: 390000,
    bankName: 'Muthoot Finance',
    branchName: 'Dwaraka Nagar Branch',
    loanAmount: 290000,
    loanAccountNumber: 'MUT9800726',
    status: 'QUALIFIED',
    telecallerId: 'TC-01',
    createdAt: getDateAgo(4),
    updatedAt: getDateAgo(3),
    documents: [
      {
        id: 'D-04',
        leadId: 'L-103',
        documentType: 'LOAN_SLIP',
        fileName: 'ramarao_muthoot_slip.png',
        fileUrl: '#',
        uploadedBy: 'TC-01',
        createdAt: getDateAgo(4)
      }
    ],
    followups: [
      {
        id: 'F-02',
        leadId: 'L-103',
        followupDate: getDateAgo(3),
        remarks: 'Verified interest. Ready for executive assignment.',
        status: 'COMPLETED',
        createdBy: 'TC-01',
        createdAt: getDateAgo(4)
      }
    ]
  },
  {
    id: 'L-104',
    leadNumber: 'SGL-2026-0004',
    customerName: 'Lalitha Devi',
    mobile: '9123456789',
    alternateMobile: '9123456780',
    address: 'NTR Colony, Road No 3',
    district: 'Vijayawada',
    goldWeight: 32.8,
    goldType: 'Bangles & Chains (22K)',
    estimatedValue: 195000,
    bankName: 'Manappuram Finance',
    branchName: 'NTR Circle Branch',
    loanAmount: 140000,
    loanAccountNumber: 'MANA8972365',
    status: 'REJECTED',
    telecallerId: 'TC-01',
    createdAt: getDateAgo(6),
    updatedAt: getDateAgo(4),
    documents: [],
    followups: [
      {
        id: 'F-03',
        leadId: 'L-104',
        followupDate: getDateAgo(4),
        remarks: 'Not interested. Refused to sell gold to release pledge.',
        status: 'COMPLETED',
        createdBy: 'TC-01',
        createdAt: getDateAgo(6)
      }
    ]
  },
  {
    id: 'L-105',
    leadNumber: 'SGL-2026-0005',
    customerName: 'Mohammad Ali',
    mobile: '8123456789',
    address: 'Sector 5, MVP Colony',
    district: 'Vizag',
    goldWeight: 90.0,
    goldType: 'Ornaments (20K-22K)',
    estimatedValue: 510000,
    bankName: 'Canara Bank',
    branchName: 'MVP Branch',
    loanAmount: 380000,
    loanAccountNumber: 'CAN8823719',
    status: 'RM VERIFICATION',
    telecallerId: 'TC-01',
    createdAt: getDateAgo(3),
    updatedAt: getDateAgo(2),
    documents: [
      {
        id: 'D-05',
        leadId: 'L-105',
        documentType: 'LOAN_SLIP',
        fileName: 'ali_canara_slip.pdf',
        fileUrl: '#',
        uploadedBy: 'TC-01',
        createdAt: getDateAgo(3)
      },
      {
        id: 'D-06',
        leadId: 'L-105',
        documentType: 'KYC',
        fileName: 'ali_pan.pdf',
        fileUrl: '#',
        uploadedBy: 'TC-01',
        createdAt: getDateAgo(3)
      }
    ],
    followups: []
  }
];
