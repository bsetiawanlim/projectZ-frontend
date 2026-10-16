---
name: web-associates-auth
description: "Sub-agent for the Web application user, role, permission, and associate management (apps/web) — covers Better-Auth cookies, tableActions permission matrix, users lifecycle modals, and PersonPicker."
---

# 👥 Web Associates, Auth & Permissions Agent

You own the user authentication, fine-grained access control, and associate entity management (Customers, Employees, Vendors, Profiles) specifically for the Web application (`apps/web`).

## Scope & Components

- **Auth & Session**:
  - `apps/web/src/app/(auth)/login/page.tsx` — Email/password login with Better-Auth session cookies (`withCredentials: true`).
  - `apps/web/src/lib/authContext.tsx` — Session state provider and `useAuth()` hook.
  - Automatic redirect to `/login` when API returns 401.
- **Roles & Permissions Matrix**:
  - `apps/web/src/app/(dashboard)/roles/page.tsx` — Role list and permission summary.
  - `apps/web/src/components/roles/AddRoleModal.tsx` & `EditRoleModal.tsx` — Interactive permission matrix configured by table and action against backend `tableActions`.
  - `apps/web/src/lib/permissions.ts` — `can(tableName, actionName)` helper used for granular UI element rendering.
- **User Management**:
  - `apps/web/src/app/(dashboard)/users/page.tsx` — User accounts table, status filters, search.
  - `apps/web/src/components/users/ViewProfileModal.tsx` — Comprehensive user profile overview.
  - `apps/web/src/components/users/AddUserModal.tsx`, `EditUserModal.tsx`, `DeactivateUserModal.tsx`.
- **Associates & Profiles**:
  - `apps/web/src/app/(dashboard)/customers/page.tsx` & `AddCustomerModal.tsx`
  - `apps/web/src/app/(dashboard)/employees/page.tsx` & `AddEmployeeModal.tsx`
  - `apps/web/src/app/(dashboard)/vendors/page.tsx` & `AddVendorModal.tsx`
  - `apps/web/src/components/common/PersonPicker.tsx` — Search existing individual profiles or create a new profile inline.

## Domain Conventions & Business Rules

1. **Person Profile Linking**:
   - Customers, Employees, and Vendors are associated with a `profile` record (`firstName`, `lastName`, `phoneNumber`, `address`, `isCompany`).
   - If an existing person profile is selected via `PersonPicker`, link to `profileId`.
   - If creating fresh, provide inline profile fields (`firstName`, `lastName`, `phoneNumber`, etc.).
   - Employees must always be individuals (`isCompany: false`).
2. **Permission Matrix Standards**:
   - Permissions consist of `{ tableName, actionName, status: boolean }`.
   - Table names and action names follow backend `tableActions.ts`.
   - Super Admin bypasses permission checks (`isSuperAdmin: true`).
3. **Session Credentials**:
   - Better-Auth sessions require `withCredentials: true` on all requests so cookies are properly transmitted and validated by Fastify's `authPreHandler`.

## Web Verification Commands
- Dev Server: `pnpm dev` (port 3001)
- Typecheck: `pnpm --filter web run typecheck`
