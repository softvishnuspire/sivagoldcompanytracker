# SOFTWARE REQUIREMENTS SPECIFICATION (SRS)

# SHIVA GOLD COMPANY MANAGEMENT SYSTEM

Version: 1.0

Prepared For: Shiva Gold Company

Technology Stack:

* Frontend: React.js
* Backend: Node.js + Express.js
* Database: PostgreSQL
* Authentication: JWT
* File Storage: AWS S3 / Cloudinary
* Real-Time Communication: Socket.IO

---

# 1. INTRODUCTION

## 1.1 Purpose

The Shiva Gold Company Management System is designed to automate and manage the complete gold-buying workflow of Shiva Gold Company.

The system manages leads from customer inquiry to final gold purchase, payment processing, and business reporting.

The application provides role-based dashboards for:

1. Telecaller
2. Regional Manager (RM)
3. Executive
4. Managing Director (MD)

---

# 2. BUSINESS PROCESS

Shiva Gold Company purchases gold pledged in banks and finance companies.

Workflow:

Customer Lead
→ Telecaller Verification
→ RM Verification
→ Executive Visit
→ Gold Purchase
→ Payment Completion
→ Case Closure

---

# 3. USER ROLES

## 3.1 Telecaller

Responsibilities:

* Create leads
* Call customers
* Verify customer interest
* Collect gold information
* Collect loan details
* Upload documents
* Schedule follow-ups
* Send qualified leads to RM

Permissions:

* Create Lead
* Edit Own Lead
* View Own Leads
* Upload Documents
* Schedule Follow-ups

Cannot:

* Approve Leads
* Assign Executives

---

## 3.2 Regional Manager (RM)

Responsibilities:

* Verify customer details
* Verify documents
* Approve or reject leads
* Assign executives
* Request re-verification

Permissions:

* View Assigned Leads
* Approve Lead
* Reject Lead
* Assign Executive
* Request Re-Verification

---

## 3.3 Executive

Responsibilities:

* Visit customer location
* Verify gold
* Visit bank
* Collect gold
* Upload images
* Process payments
* Complete lead

Permissions:

* Update Lead Status
* Upload Gold Images
* Upload Documents
* Record Payment
* Complete Lead

---

## 3.4 Managing Director (MD)

Responsibilities:

* Monitor entire business
* Revenue analysis
* Lead analysis
* Employee performance analysis
* Gold collection tracking

Permissions:

* Full Access
* Reports
* Analytics
* User Management
* Audit Logs

---

# 4. COMPLETE LEAD FLOW

## Stage 1 - Lead Creation

Telecaller enters:

Customer Information

* Customer Name
* Mobile Number
* Alternate Number
* Address
* District

Gold Information

* Gold Weight
* Gold Type
* Estimated Value

Bank Information

* Bank Name
* Branch Name
* Loan Amount
* Loan Account Number

Documents

* Loan Slip
* KYC
* Additional Documents

Status:

NEW LEAD

---

## Stage 2 - Telecaller Verification

Possible Results:

Interested
→ QUALIFIED

Not Interested
→ REJECTED

Need Follow-up
→ FOLLOW-UP

---

## Stage 3 - RM Verification

RM verifies:

* Customer Details
* Documents
* Loan Information
* Gold Information

Possible Actions:

APPROVED

RE-VERIFICATION

REJECTED

---

## Stage 4 - Executive Assignment

RM assigns Executive.

Status:

EXECUTIVE ASSIGNED

---

## Stage 5 - Executive Visit

Executive updates:

1. Customer Called
2. Visit Confirmed
3. Travel Started
4. Reached Customer
5. Customer Verification
6. Bank Visit

---

## Stage 6 - Gold Purchase Process

Executive updates:

1. Payment Done
2. Gold Received
3. Balance Paid
4. Gold Images Uploaded

---

## Stage 7 - Completion

Final Status:

COMPLETED

---

# 5. LEAD STATUS FLOW

NEW LEAD

↓

FOLLOW-UP

↓

QUALIFIED

↓

RM VERIFICATION

↓

APPROVED

↓

EXECUTIVE ASSIGNED

↓

CUSTOMER CALLED

↓

VISIT CONFIRMED

↓

TRAVEL STARTED

↓

REACHED CUSTOMER

↓

BANK VISIT

↓

PAYMENT DONE

↓

GOLD RECEIVED

↓

BALANCE PAID

↓

IMAGES UPLOADED

↓

COMPLETED

---

# 6. TELECALLER DASHBOARD

Features:

Dashboard Statistics

* New Leads
* Pending Follow-ups
* Qualified Leads
* Rejected Leads
* Sent To RM

Modules:

Lead Management

* Add Lead
* Edit Lead
* Search Lead

Follow-up Management

* Today's Calls
* Pending Calls
* Completed Calls

Documents

* Upload Loan Slip
* Upload KYC
* Upload Additional Documents

Reports

* Daily Leads
* Monthly Leads

---

# 7. REGIONAL MANAGER DASHBOARD

Dashboard Statistics

* Pending Verification
* Approved Leads
* Re-Verification Leads
* Rejected Leads
* Assigned Leads

Modules:

Verification

* Customer Verification
* Document Verification
* Loan Verification

Actions

* Approve
* Reject
* Re-Verify
* Assign Executive

Reports

* Verification Reports
* Executive Assignment Reports

---

# 8. EXECUTIVE DASHBOARD

Dashboard Statistics

* Assigned Leads
* Today's Visits
* In Progress Cases
* Completed Cases
* Gold Collected
* Amount Handled

Modules:

Visit Tracking

* Start Journey
* Reached Location
* Customer Meeting
* Bank Visit

Payment Management

* Payment Done
* Balance Paid

Upload Management

* Gold Images
* Documents
* Agreements

GPS Tracking

* Live Location
* Journey History

Reports

* Daily Visits
* Gold Collection Reports

---

# 9. MD DASHBOARD

Dashboard Statistics

* Total Leads
* Active Leads
* Completed Leads
* Gold Collected
* Revenue Generated
* Conversion Rate

Business Analytics

Lead Funnel

* Lead Received
* RM Approved
* Executive Assigned
* Completed

Revenue Analytics

* Daily Revenue
* Weekly Revenue
* Monthly Revenue
* Yearly Revenue

Executive Performance

* Assigned Leads
* Completed Leads
* Gold Collected
* Revenue Generated
* Conversion Rate

Branch Performance

* Vijayawada
* Hyderabad
* Vizag
* Other Branches

---

# 10. DATABASE DESIGN

## Users

id
name
mobile
email
password
role
branch
status
created_at

---

## Leads

id
lead_number
customer_name
mobile
alternate_mobile
address
district
gold_weight
gold_type
estimated_value
bank_name
branch_name
loan_amount
loan_account_number
status
telecaller_id
rm_id
executive_id
created_at
updated_at

---

## Documents

id
lead_id
document_type
file_url
uploaded_by
created_at

---

## Followups

id
lead_id
followup_date
remarks
status
created_by

---

## Lead Timeline

id
lead_id
status
remarks
updated_by
created_at

---

## Payments

id
lead_id
loan_amount
balance_amount
total_amount
payment_mode
transaction_reference
created_at

---

## Gold Collection

id
lead_id
weight
purity
market_price
purchase_amount
created_at

---

# 11. API REQUIREMENTS

Authentication

POST /api/auth/login

POST /api/auth/logout

POST /api/auth/refresh

---

Lead Management

GET /api/leads

POST /api/leads

PUT /api/leads/:id

DELETE /api/leads/:id

---

Follow-up Management

POST /api/followups

GET /api/followups

PUT /api/followups/:id

---

RM Module

POST /api/rm/approve

POST /api/rm/reject

POST /api/rm/reverify

POST /api/rm/assign-executive

---

Executive Module

POST /api/executive/start-journey

POST /api/executive/reached-location

POST /api/executive/bank-visit

POST /api/executive/payment

POST /api/executive/gold-received

POST /api/executive/upload-images

POST /api/executive/complete

---

Reports

GET /api/reports/revenue

GET /api/reports/gold

GET /api/reports/performance

GET /api/reports/leads

---

# 12. NON-FUNCTIONAL REQUIREMENTS

Performance

* Support 500+ concurrent users
* Dashboard load under 3 seconds

Security

* JWT Authentication
* Password Encryption using bcrypt
* Role-Based Access Control
* Audit Logs
* HTTPS

Availability

* 99.9% uptime

Scalability

* Multi-branch support
* Unlimited leads

---

# 13. FUTURE ENHANCEMENTS

Phase 2 Features

* WhatsApp Integration
* SMS Notifications
* Live Gold Rate API
* GPS Tracking
* Mobile App (React Native)
* AI Lead Prediction
* Revenue Forecasting
* Employee Incentive Management

---

# 14. PROJECT STRUCTURE

Frontend

* React.js
* Redux Toolkit
* Material UI
* React Router
* Axios
* Socket.IO Client

Backend

* Node.js
* Express.js
* Prisma ORM
* PostgreSQL
* JWT
* Multer
* Socket.IO

Deployment

Frontend: Vercel

Backend: AWS EC2 / VPS

Database: PostgreSQL

Storage: AWS S3 / Cloudinary

---

END OF DOCUMENT
