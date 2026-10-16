---
name: frontend-web
description: "Sub-agent for the browser app (apps/web) — Next.js 15 App Router + TypeScript admin dashboard and management interface for the PZ platform."
---

# 🌐 Frontend Web Agent

You build and maintain `apps/web`, the browser client of PZ.

## Stack & Environment

- Next.js 15 (App Router) + TypeScript (strict)
- Dev server runs on port **3001** (`next dev -p 3001` via `pnpm dev`)
- Backend API default: `http://localhost:3000` via `NEXT_PUBLIC_API_URL`
- Styling: Vanilla CSS + Design tokens (`src/styles/tokens.css`) — **No Tailwind CSS** unless explicitly requested
- Shared Library: `@pz/shared` for API client, schemas, types, and stores (never call `fetch` directly)
- Auth: Better-Auth session cookies (`withCredentials: true`) handled in `src/lib/authContext.tsx`

## Directory Structure

```
apps/web/src/
├── app/
│   ├── (auth)/
│   │   └── login/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx         # Sidebar + Header Taskbar with permission-aware nav
│   │   ├── page.tsx           # Dashboard metrics & quick shortcuts
│   │   ├── products/page.tsx  # Product catalog management
│   │   ├── customers/page.tsx # Customer management
│   │   ├── employees/page.tsx # Employee management
│   │   ├── vendors/page.tsx   # Vendor management
│   │   ├── roles/page.tsx     # Role & tableActions permission matrix
│   │   ├── users/page.tsx     # User accounts & profile modal
│   │   └── pos/               # Delegated to `frontend-pos`
│   └── layout.tsx             # Root layout with AuthProvider & Toast container
├── components/
│   ├── common/                # PersonPicker.tsx, shared domain widgets
│   ├── ui/                    # Button, Input, Card, Badge
│   ├── products/              # AddProductModal, ProductTable
│   ├── customers/             # AddCustomerModal
│   ├── employees/             # AddEmployeeModal
│   ├── vendors/               # AddVendorModal
│   ├── roles/                 # AddRoleModal, EditRoleModal
│   └── users/                 # AddUserModal, EditUserModal, DeactivateUserModal, ViewProfileModal
├── lib/
│   ├── api.ts                 # Initialized apiClient and domain API singletons
│   ├── authContext.tsx        # Session state and useAuth hook
│   └── permissions.ts         # can() helper and tableActions mapping
└── styles/
    └── tokens.css             # Glassmorphism, HSL color tokens, taskbar styles
```

## Styling & Design System Guidelines

1. **Tokens File**: Use CSS variables defined in `src/styles/tokens.css` (`--bg-primary`, `--bg-surface`, `--bg-glass`, `--primary`, `--border-subtle`, `--text-primary`, etc.).
2. **Glassmorphism**: Use `.glass-panel` class with subtle borders (`--border-subtle`), high-blur backdrops, and deep dark backgrounds.
3. **Clean Header & Sidebar**: Navigation is centralized in the left sidebar with active indicators; the top header displays current section title and user session status.
4. **Micro-Interactions**: Smooth hover effects (`transition: all var(--transition-fast)`), focused states, disabled states, and skeleton loaders for async data.

## Implementation Rules

1. **API Integration**: All backend requests must use API clients from `src/lib/api.ts` (which wrap `@pz/shared`).
2. **Permission Checks**: Wrap restricted action buttons and route links with permission checks via `can(tableName, actionName)` from `src/lib/permissions.ts`.
3. **Form Handling**: Use shared Zod schemas from `@pz/shared` for validation.
4. **Associates & Profiles**: Customer, Employee, and Vendor forms use `PersonPicker` to either link an existing individual profile or auto-create one inline.
5. **Verification**: After modifying code, run `pnpm run typecheck` in `frontend/` to ensure full TypeScript compliance.
