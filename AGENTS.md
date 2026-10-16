# PZ Frontend Workspace Agents & Guidelines

## 🚨 CRITICAL RULE: Server Execution
When the user asks to **"run the server"**, **"run server"**, **"start server"**, **"start the server"**, **"run frontend and backend server"**, **"start servers"**, **"run both servers"**, or any phrase asking to start/run the server(s):
- **DO NOT ASK ANY QUESTIONS, CONFIRMATIONS, PERMISSIONS, OR OPTIONS.**
- **IMMEDIATELY RUN BOTH SERVERS WITHOUT PROMPTING:**
  1. Backend: `pnpm --dir ../backend start` (Fastify listening on `http://localhost:3000`) as a background daemon process (`IsDaemon: true`).
  2. Frontend: `pnpm dev` (Next.js listening on `http://localhost:3001`) as a background daemon process (`IsDaemon: true`).
- Verify ports 3000 and 3001 are listening and `http://localhost:3000/api/health` returns `status: "ok"`.
- Output the running URLs and status directly.

---

## 🤖 Frontend Agents Topology (.agents/skills/)

The frontend workspace separates agents strictly by platform (**Web** vs. **Android**) alongside the monorepo shared library:

### 🌐 Web Platform Agents (`apps/web/`)

#### 1. `frontend-web` ([.agents/skills/frontend-web/SKILL.md](file:///d:/Work/Programming/PZ/frontend/.agents/skills/frontend-web/SKILL.md))
- **Scope**: `apps/web/`
- **Domain**: Next.js 15 App Router web client. Layouts, responsive sidebar navigation, clean header bar, Vanilla CSS design tokens (`styles/tokens.css`), UI primitives (`components/ui/`), Better-Auth session handling, and TanStack Table/Query features.
- **Rule**: No Tailwind CSS unless explicitly requested. Use `tokens.css` design system.

#### 2. `web-pos` ([.agents/skills/web-pos/SKILL.md](file:///d:/Work/Programming/PZ/frontend/.agents/skills/web-pos/SKILL.md))
- **Scope**: `apps/web/src/app/(dashboard)/pos/` and `apps/web/src/components/pos/`
- **Domain**: Web Point of Sale experience. Desktop two-pane cashier terminal, real-time product search & barcode lookup, cart management (`cartStore`), keyboard shortcuts (`F2`, `F8`), checkout with multi-payment split tender (Cash, Card, Bank Transfer, E-Wallet), printable receipts (`window.print()`), order history (`/pos/orders`), and daily reports (`/pos/reports`).

#### 3. `web-associates-auth` ([.agents/skills/web-associates-auth/SKILL.md](file:///d:/Work/Programming/PZ/frontend/.agents/skills/web-associates-auth/SKILL.md))
- **Scope**: `apps/web/src/app/(dashboard)/(users|roles|customers|employees|vendors)/`, `apps/web/src/components/(users|roles|customers|employees|vendors|common)/`
- **Domain**: Web Users, Roles, Permissions, and Associates management.
  - Better-Auth sessions and cookie credentials (`withCredentials: true`).
  - Permission matrix validation against backend `tableActions` dictionary.
  - User lifecycle modals: Profile view, Edit, Add, Deactivate.
  - Role management with fine-grained action checkboxes.
  - Associates (Customers, Employees, Vendors) auto-linked with `profile` records via `PersonPicker`.

---

### 🤖 Android Platform Agents (`apps/mobile/`)

#### 4. `frontend-android` ([.agents/skills/frontend-android/SKILL.md](file:///d:/Work/Programming/PZ/frontend/.agents/skills/frontend-android/SKILL.md))
- **Scope**: `apps/mobile/`
- **Domain**: React Native / Expo Android client. Android-first navigation (Expo Router), touch-optimized controls (48dp+), Android emulator networking (`10.0.2.2:3000`), token storage adapter (`TokenStorage`), safe areas, keyboard avoidance, and Android builds.

#### 5. `android-pos` ([.agents/skills/android-pos/SKILL.md](file:///d:/Work/Programming/PZ/frontend/.agents/skills/android-pos/SKILL.md))
- **Scope**: `apps/mobile/app/(tabs)/pos.tsx`
- **Domain**: Android Mobile POS flow. Touch-optimized catalog list, persistent bottom-sheet cart bar, camera barcode scanning (`expo-camera`), single-hand ergonomics, and mobile checkout.

---

### 📦 Shared Foundation Agent (`packages/shared/`)

#### 6. `frontend-shared` ([.agents/skills/frontend-shared/SKILL.md](file:///d:/Work/Programming/PZ/frontend/.agents/skills/frontend-shared/SKILL.md))
- **Scope**: `packages/shared/`
- **Domain**: Monorepo shared package `@pz/shared`. Platform-agnostic API client factory, Zod schemas mirroring backend Fastify routes, TypeScript definitions, Zustand stores (`cartStore`), calculation math, and utility functions.
- **Rule**: ALWAYS run `pnpm --filter @pz/shared build` after editing `packages/shared/src/`.

---

## 🛠️ Global Project Commands
- **Frontend Web Dev**: `pnpm dev` (starts web app on `:3001`)
- **Android Dev**: `pnpm --filter mobile android` (or `pnpm --filter mobile start`)
- **Backend Start**: `pnpm --dir ../backend start` (starts Fastify on `:3000`)
- **Shared Lib Build**: `pnpm --filter @pz/shared build`
- **Typecheck**: `pnpm run typecheck`
