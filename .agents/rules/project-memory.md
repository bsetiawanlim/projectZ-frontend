# Project Z — Condensed Project Memory

## 1. System Topology & Ports
- **Backend**: Fastify v5 + Prisma + PostgreSQL (`localhost:5432`). Port: `3000`. API Docs: `http://localhost:3000/documentation`.
- **Frontend**: Turborepo monorepo.
  - Web App: Next.js 15 App Router (`apps/web`), Port: `3001`.
  - Mobile: React Native / Expo (`apps/mobile`).
  - Shared: `@pz/shared` (`packages/shared`).

## 2. Essential Commands & Server Execution Rule
- **CRITICAL SERVER EXECUTION RULE**:
  - When the user asks to "run the server", "start server", "run frontend and backend server", or "run both servers", **DO NOT ASK ANYTHING OR REQUEST ANY PERMISSION/OPTIONS**.
  - Immediately launch both backend (`pnpm --dir ../backend start` on `:3000`) and frontend (`pnpm dev` on `:3001`) as background daemon processes.
  - Verify ports and report running URLs directly to the user.
- **Backend Start**: `pnpm start` (in `backend/` or `pnpm --dir ../backend start`)
- **Backend Migrate**: `pnpm prisma migrate dev` (migrations: `src/plugins/prisma/migrations/`)
- **Frontend Dev**: `pnpm dev` (in `frontend/`, runs Next.js on `:3001`)
- **Shared Lib Build**: `pnpm --filter @pz/shared build` (MUST run after modifying `packages/shared/src/`)
- **Typecheck**: `pnpm run typecheck` (frontend) / `pnpm exec tsc --noEmit` (backend)

## 3. Data & Entity Conventions
- **Associates (Customer, Employee, Vendor)**:
  - Linked to a `profile` record (`id`, `firstName`, `lastName`, `phoneNumber`, `address`, `isCompany`).
  - Controllers auto-create `profile` inline if `profileId` is omitted.
  - Employees must be individuals (`isCompany: false`).
- **Product & Pricing**:
  - `product` stores metadata; pricing lives in `productPrice` (`priceType: "retail"`, currency `IDR`).
  - Controllers flatten/map `retailPrice` (number) onto returned product objects for UI/POS.
  - POS `salesOrderItem` requires valid `productId` foreign keys.
- **POS Calculations & State**:
  - Core math in `@pz/shared` (`calculateItemTotals`, `calculateOrderTotals`).
  - Vanilla Zustand store `cartStore` in `@pz/shared`.
- **Role & Permissions**:
  - Validated against `tableActions` dictionary in `backend/src/modules/personal/role/tableActions.ts`.
  - Permission items contain `tableName`, `actionName`, and `status: boolean` (defaults `true`).

## 4. Frontend Standards
- **Styling**: Vanilla CSS + CSS variables in `tokens.css` (Glassmorphism, dark palette). No Tailwind unless requested.
- **Auth**: Better-Auth session cookies (`withCredentials: true`), prehandler `authPreHandler`.
- **Navigation**: Sidebar hosts primary operational links (`/pos`, `/pos/orders`, `/pos/reports`, `/products`, `/customers`, `/employees`, `/vendors`, and `/roles` for Super Admin).

## 5. Frontend Task Agent Topology (.agents/skills/)
### Web Platform Agents (`apps/web`)
- `frontend-web`: Web Client Application (Next.js 15 App Router, layout, tokens, UI components).
- `web-pos`: Web POS Cashier Register (desktop two-pane layout, split tender, printable receipts, reports).
- `web-associates-auth`: Web User & Associates Management (Users, Roles permission matrix, Customers, Employees, Vendors, Profiles).

### Android Platform Agents (`apps/mobile`)
- `frontend-android`: Android Mobile Application (React Native / Expo, Android navigation, touch targets, secure token storage).
- `android-pos`: Android Mobile POS (field counter, camera barcode scanner, bottom-sheet cart).

### Shared Foundation Agent (`packages/shared`)
- `frontend-shared`: Monorepo foundation (`packages/shared`), API client, Zod schemas, types, Zustand stores, math calculations.
