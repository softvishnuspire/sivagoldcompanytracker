# Project Graph Report

## Overview
This repository is configured with two main independent workspaces:
1. `frontend/` - Next.js project with TypeScript, Tailwind CSS, and App Router.
2. `backend/` - Node.js project running an Express server using standard JavaScript.

## Custom Theme Palette
We have configured a brand-specific luxury color palette from Coolors:
- **Primary Background**: `#300F0F` (Deep Cherry Black)
- **Container/Card Background**: `#3D1510` (Dark Mahogany Red)
- **Borders & Hover Accent Highlights**: `#65483B` (Warm Copper Bronze)
- **Secondary Text Descriptions**: `#88868A` (Muted Slate Gray)
- **Primary Typography & Indicators**: `#D9D9DA` (Bright Silver Off-White)

Registered custom utility properties in globals.css:
- `--color-brand-mahogany`
- `--color-brand-cherry`
- `--color-brand-copper`
- `--color-brand-slate`
- `--color-brand-silver`

## Environment Configuration
We have added the environment variables file for Port and Supabase connection parameters:
- `backend/.env` — Backend node process environment variables.
- `frontend/.env.local` — Next.js client and server environment configurations.

## Version Control
- A root-level `.gitignore` has been added to exclude system, build, dependency, and configuration files.
- The project has been pushed to the remote repository: `https://github.com/softvishnuspire/sivagoldcompanytracker.git`.

## Dependency Graph
```mermaid
graph TD
    siva-tracker --> frontend
    siva-tracker --> backend
    frontend --> Next.js
    frontend --> TypeScript
    frontend --> Tailwind_CSS
    
    %% Portal Routing
    frontend --> RootPage["src/app/page.tsx (Landing Portal Router)"]
    RootPage --> TelecallerPage
    
    %% Telecaller Panel Breakdown
    TelecallerPage["src/app/telecaller/page.tsx"] --> StatsOverview["components/StatsOverview.tsx"]
    TelecallerPage --> LeadForm["components/LeadForm.tsx"]
    TelecallerPage --> LeadList["components/LeadList.tsx"]
    TelecallerPage --> FollowupList["components/FollowupList.tsx"]
    TelecallerPage --> PendingFollowupsList["components/PendingFollowupsList.tsx"]
    TelecallerPage --> DocumentsView["components/DocumentsView.tsx"]
    TelecallerPage --> ReportsView["components/ReportsView.tsx"]
    TelecallerPage --> MockData["mockData.ts"]
    TelecallerPage --> Types["types.ts"]
    
    %% Backend Flow
    TelecallerPage --> ExpressAPI["Express Backend (API)"]
    ExpressAPI --> SupabaseDB[("Supabase DB")]
    
    backend --> Node.js
    backend --> Express
    Express --> ExpressAPI
```

## Directory Structure Details
- **Frontend Paths (Role-Based Route Directories)**:
  - `src/app/page.tsx` - Custom brand landing portal directing to the active Telecaller dashboard.
  - `src/app/md/page.tsx` - Managing Director dashboard route.
  - `src/app/rm/page.tsx` - Relationship Manager dashboard route.
  - `src/app/telecaller/` - Telecaller Dashboard workspace:
    - `page.tsx` - Main controller layout (handles tabs, localStorage persistence, states).
    - `types.ts` - Models for Leads, Followups, and Documents.
    - `mockData.ts` - Initial storage seeds.
    - `components/` - Subcomponents for Stats cards, CRUD Forms, searchable Lists, Call Scheduler, Pending Followups List, Documents View, and SVG Daily/Monthly Reports.
  - `src/app/executive/page.tsx` - Executive dashboard route.
  - `.env.local` - Local environment variables file.
- **Backend**: Express API server initialized at `backend/index.js` (runs on default port 5000). Exposes endpoints for Lead CRUD (including cascading delete operations), Status updates, and Follow-ups, communicating directly with Supabase.
  - `.env` - Server environment variables file.

## Recent Fixes
- **LeadForm Event Refinement**: Resolved document selection closing form page by preventing form submission/page reload behavior on button actions.
- **Real File Uploads**: Replaced mock file simulation with real browser file uploading inside `LeadForm.tsx`. Connects with Supabase Storage (`loan-documents` bucket) and includes FileReader Base64 fallback (offline/local mode) to save actual customer documents into the database.
- **Client Configuration Guard**: Added validation checks in `LeadForm.tsx` to detect if the Supabase environment variables are loaded in the browser. If not loaded (e.g. dev server needs a restart), it immediately redirects to the Base64 FileReader fallback, preventing SDK relative path resolution that throws SyntaxErrors.
- **Express Payload Size & Crash Prevention**: Increased the backend Express incoming request body size limit to `200mb` (both JSON and urlencoded) in `backend/index.js` and added a global error handler middleware to prevent `413 Payload Too Large` HTML responses and server crashes when uploading and saving large Base64 document payloads.
- **Advance Status Option (Send to RM)**: Added a "Send to RM" action button in `LeadList.tsx` for leads with status `CUSTOMER_DETAILS_CREATED`. Click updates status to `SENT_TO_RM` matching the Supabase `lead_status` enum.
- **Status Enum Alignment**: Aligned all lead status strings across the entire frontend (`types.ts`, `page.tsx`, `LeadList.tsx`, `LeadForm.tsx`, `mockData.ts`, `PendingFollowupsList.tsx`, `ReportsView.tsx`) and backend (`index.js`) with the actual Supabase PostgreSQL `lead_status` enum values. All statuses now use `UPPER_SNAKE_CASE` format matching the database (e.g. `FOLLOWUP_IN_PROGRESS`, `SENT_TO_RM`, `RM_REJECTED`, `CASE_COMPLETED`, etc.).
- **Lead Source Tracking**: Added an optional "Where Did They Hear About Us?" dropdown to the Lead creation form (Step 1 - Customer Information) in `LeadForm.tsx`. Options: Website, Facebook Ads, Google Ads, Referrals, Direct Calls, Walk Ins. Wired through `page.tsx` API payloads and `backend/index.js` POST/PUT endpoints, stored in the existing `source` column on the `leads` table.


