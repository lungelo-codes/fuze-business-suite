# Fuze Business Suite — Deployment Guide

## Overview

Fuze Business Suite is a **Next.js 14** SaaS business portal that connects to an ERPNext / Frappe backend. It provides a clean 10-item sidebar navigation across CRM, Sales, Finance, Procurement, Projects, HR, Support, Reports and Settings.

---

## Project Structure

```
fuze-business-suite/
├── app/
│   ├── api/              # Next.js route handlers (auth, modules, CRUD, etc.)
│   ├── portal/           # Protected portal pages (Dashboard, CRM, Finance…)
│   ├── login/            # Public login page
│   ├── signup/           # Public signup page
│   ├── globals.css       # All CSS design tokens + utility classes
│   └── layout.tsx        # Root HTML shell
├── components/
│   ├── ConciseSidebar.tsx  ★ NEW — 10-item collapsible sidebar
│   ├── PortalShell.tsx     ★ UPDATED — uses ConciseSidebar
│   ├── Sidebar.tsx         (original 36-item sidebar, kept for reference)
│   ├── Topbar.tsx
│   ├── KPI.tsx
│   └── …
├── lib/
│   ├── modules.ts         Module & plan definitions
│   ├── server/
│   │   ├── auth.ts        Session helpers (cookies)
│   │   ├── data.ts        Dashboard data fetching
│   │   └── erpnext.ts     ERPNext HTTP client
│   └── …
├── api/                  # Python Frappe API files (deploy to ERPNext)
│   ├── crm.py
│   ├── sales.py
│   ├── accounting.py
│   ├── compliance.py
│   ├── procurement.py
│   ├── projects.py
│   ├── hr.py
│   ├── helpdesk.py
│   └── insights.py
├── package.json
├── next.config.js
├── tailwind.config.js
└── vercel.json
```

---

## Environment Variables

Create a `.env.local` file (never commit this to git):

```env
# ERPNext / Frappe backend URL (no trailing slash)
ERPNEXT_URL=https://your-tenant.erpnext.com

# API key + secret pair (generate in ERPNext → Settings → API Access)
ERPNEXT_API_KEY=your_api_key
ERPNEXT_API_SECRET=your_api_secret

# Comma-separated list of admin email addresses (get full access)
ADMIN_EMAILS=admin@yourcompany.co.za,owner@yourcompany.co.za

# JWT secret for signed tokens (generate a 32+ char random string)
JWT_SECRET=replace_with_long_random_string

# Optional: PayFast credentials (South African payments)
PAYFAST_MERCHANT_ID=
PAYFAST_MERCHANT_KEY=
PAYFAST_PASSPHRASE=

# Optional: Dropbox integration
DROPBOX_APP_KEY=
DROPBOX_APP_SECRET=
DROPBOX_REDIRECT_URI=

# Optional: Google Drive integration
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
```

> **Vercel**: Add these under **Project → Settings → Environment Variables**. Never add them to `vercel.json`.

---

## Local Development

### Prerequisites

- Node.js 18+ (LTS)
- pnpm (`npm install -g pnpm`) or npm

### Steps

```bash
# 1. Install dependencies
pnpm install

# 2. Add environment variables
cp .env.example .env.local
# Edit .env.local with your values

# 3. Start dev server
pnpm dev
# → http://localhost:3000
```

---

## Deployment to Vercel

### Option A — Vercel Dashboard (recommended)

1. Push the project to a **GitHub** repository.
2. Go to [vercel.com](https://vercel.com) → **New Project**.
3. Import your GitHub repository.
4. Under **Environment Variables**, add all keys from the section above.
5. Leave the **Build Command** as `next build` and **Output Directory** as `.next`.
6. Click **Deploy**.

Vercel will build and deploy automatically on every push to `main`.

### Option B — Vercel CLI

```bash
# Install Vercel CLI globally
npm install -g vercel

# Login
vercel login

# Deploy (first time — follow prompts)
vercel

# Subsequent deployments
vercel --prod
```

### vercel.json (already in repo)

```json
{
  "buildCommand": "next build",
  "devCommand": "next dev",
  "installCommand": "pnpm install",
  "framework": "nextjs"
}
```

---

## ERPNext / Frappe Setup

### 1. Install Python API files

Copy the contents of the `api/` folder into your Frappe app:

```
your_frappe_app/
└── your_frappe_app/
    └── api/
        ├── crm.py
        ├── sales.py
        ├── accounting.py
        ├── compliance.py
        ├── procurement.py
        ├── projects.py
        ├── hr.py
        ├── helpdesk.py
        └── insights.py
```

Run `bench migrate` after adding the files.

### 2. API Endpoint Reference

Each module maps to a custom Frappe API endpoint:

| Module | Endpoint prefix |
|--------|----------------|
| CRM | `GET /api/method/fuze_suite.api.crm.*` |
| Sales | `GET /api/method/fuze_suite.api.sales.*` |
| Finance | `GET /api/method/fuze_suite.api.accounting.*` |
| Compliance | `GET /api/method/fuze_suite.api.compliance.*` |
| Procurement | `GET /api/method/fuze_suite.api.procurement.*` |
| Projects | `GET /api/method/fuze_suite.api.projects.*` |
| HR | `GET /api/method/fuze_suite.api.hr.*` |
| Support | `GET /api/method/fuze_suite.api.helpdesk.*` |
| Reports | `GET /api/method/fuze_suite.api.insights.*` |

### 3. Create API credentials in ERPNext

1. Open **ERPNext → Settings → Integrations → API Access**.
2. Click **Generate Keys** for the Administrator user (or a dedicated API user).
3. Copy the **API Key** and **API Secret** to your environment variables.

### 4. SaaS Tenant Doctype (optional)

For multi-tenant support, create a **Fuze SaaS Tenant** doctype in ERPNext with fields:

| Field | Type |
|-------|------|
| `company_name` | Data |
| `site_name` | Data |
| `email` | Data |
| `plan` | Select (Starter / Growth / Business Pro / Enterprise) |
| `selected_modules` | Small Text (JSON array) |

The login route automatically looks up the tenant by `site_name` or `email` and loads their plan + modules into session cookies.

---

## Authentication Flow

```
User → /login
  → POST /api/auth/login { email, password, site? }
    → Proxies to ERPNext /api/method/login
    → On success: sets sid, fuze_plan, fuze_modules, fuze_company cookies
  → Redirect to /portal (customers) or /admin (System Manager)

All portal pages are protected by middleware.ts (checks sid cookie)
Logout → GET /api/auth/logout → clears all fuze_* cookies → redirect /login
```

---

## The New 10-Item Sidebar (`ConciseSidebar.tsx`)

Replaces the original 36-item sidebar with exactly **10 top-level items**, each with a collapsible dropdown:

| # | Item | Sub-pages |
|---|------|-----------|
| 1 | Dashboard | — |
| 2 | CRM | Pipeline, Leads, Customers, Contacts |
| 3 | Sales | Quotations, Sales Orders, Products |
| 4 | Finance | Invoices, Bills, Payments, VAT, PAYE, CIPC |
| 5 | Procurement | Purchase Orders, Suppliers |
| 6 | Projects | Projects, Tasks |
| 7 | HR | Employees, Leave, Attendance, Payroll |
| 8 | Support | Help Tickets |
| 9 | Reports | — |
| 10 | Settings | Company Profile, Modules, Billing |

Sub-items are **module-aware**: if a module is not in the tenant's active module list, its sub-item is hidden automatically.

### Design tokens preserved

All original CSS variables (`--navy`, `--teal`, `--bg`, `--card`, `--line`, etc.) from `globals.css` are used without modification. The sidebar matches the original `.sidebar`, `.nav-item`, `.brand`, `.subscription-card` layout exactly.

---

## Module & Plan System

Plans are defined in `lib/modules.ts`:

| Plan | Price | Modules |
|------|-------|---------|
| Starter | Free (14-day trial) | Customers, Invoices, Quotes, Payments, Compliance |
| Growth | R499/mo | Starter + CRM, Leads, Suppliers, PO, Inventory, Projects, Tasks, Support |
| Business Pro | R999/mo | All 24 modules |
| Enterprise | Custom | All modules + white-label |

---

## Available Scripts

```bash
pnpm dev          # Start development server (http://localhost:3000)
pnpm build        # Production build
pnpm start        # Start production server
pnpm lint         # ESLint check
```

---

## Troubleshooting

### Login fails with "Missing backend URL"
→ Set `ERPNEXT_URL` in your environment variables.

### Modules not loading / empty sidebar
→ Check that `fuze_modules` cookie is being set after login. The tenant must exist in the **Fuze SaaS Tenant** doctype, or the plan defaults to Starter (5 modules).

### CORS errors from ERPNext
→ In ERPNext, add your Vercel domain to **System Settings → Allow CORS**.

### Build fails on Vercel
→ Ensure all required environment variables are set in the Vercel dashboard before deploying.

---

## Changelog

### v1.1.0
- **Added** `ConciseSidebar.tsx` — 10-item collapsible sidebar replacing the 36-item original
- **Updated** `PortalShell.tsx` to render `ConciseSidebar` instead of `Sidebar`
- Original `Sidebar.tsx` preserved for reference

### v1.0.0
- Initial production release with full ERPNext integration
