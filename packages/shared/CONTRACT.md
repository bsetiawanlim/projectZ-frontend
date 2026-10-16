# PZ API Contract (derived from backend source)

Base URL: `http://localhost:3000` (backend `PORT`, default 3000). **Web dev server must run on 3001** (Next default 3000 would collide; 3001 is in the backend CORS allow-list).

## Envelope
Success (`src/utils/response.ts`):
```json
{ "success": true, "statusCode": 200, "message": "...", "data": <T>, "pagination": {...} }
```
`paginated()` sends `data: items` plus `pagination: { page, limit, total, totalPages, hasNextPage, hasPrevPage }`.

Error (`src/plugins/errorHandler.ts`):
```json
{ "success": false, "statusCode": 400, "code": "VALIDATION_ERROR", "error": "...", "message": "...", "details": [{ "path", "message", "code" }] }
```
Codes: `BAD_REQUEST, UNAUTHORIZED, FORBIDDEN, NOT_FOUND, CONFLICT, UNPROCESSABLE_ENTITY, VALIDATION_ERROR, SCHEMA_VALIDATION_ERROR, INTERNAL_SERVER_ERROR`.
Permission failures (`plugins/permission.ts`) return `{ error: "Permission denied." }` (403) / `{ error: "Unauthorized!" }` (401) **without** `success`/`code` — client must tolerate this shape.
Rate-limit 429: `{ statusCode, error, message, retryAfter }`.

## Conventions
- Query lists: `GET /api/<domain>/<entity>/all?page&limit(≤100)&sortBy&sortOrder&search`.
- Mutations are **POST** with JSON body: `/create`, `/update` (body has `id`), `/delete` (`{id}`), `/get` (`{id}`).
- Permission = `(tableName, actionName)` from the first two URL segments after `/api` (e.g. `pos`, `sales-order`) — enforced server-side; non-super-admin users need a role.

## Auth (Better Auth, mounted at `/api/auth/*`)
- Email/password sign-in: `POST /api/auth/sign-in/email` `{ email, password }`.
- Session: `GET /api/auth/get-session`; sign-out: `POST /api/auth/sign-out`.
- Custom: `POST /api/auth/sign-up/email` (admin only), `/deactivate`, `/reactivate`.
- Session is a **cookie** (`PZ` prefix, `httpOnly`, `secure`, `sameSite=lax`). Web: `fetch(..., { credentials: "include" })`.
- User additional fields: `profileId, roleId, isSuperAdmin`.
- Single session per user (`multiSession.maximumSessions = 1`).

> [!WARNING]
> **Mobile gap:** React Native cannot rely on `Secure`/`httpOnly` browser cookies. Backend needs Better Auth's `bearer()` plugin (returns `set-auth-token` header; send `Authorization: Bearer <token>`). Not yet added.
> `trustedOrigins` in `plugins/auth.ts` and the auth route's forced `Origin` header only cover localhost:3000 — web on 3001 may need to be added to `trustedOrigins`.

## POS (`/api/pos/`)
Sales order: `create | update | delete | get | complete | void | refund` (POST), `all` (GET, filters `status, customerId, startDate, endDate`), `summary/daily?date=YYYY-MM-DD`, `report/product-sales?startDate&endDate&limit`.
Create body: `{ customerId?, orderDate?, currency="IDR", includeDiscount, discountPercentage, includeTax, taxPercentage, notes?, items:[{ productId, unitId?, quantity, unitPrice?, discountPercentage, notes? }] }`.
Status: `DRAFT | COMPLETED | VOID | REFUNDED`.
Calculation (server, 4-decimal rounding): item `gross=qty*price; discount=gross*pct/100; total=gross-discount`; order `subtotal=Σ items; discount if includeDiscount; tax on (subtotal-discount) if includeTax; grandTotal`.
Order number: `SO-YYYYMMDD-NNN`.
Item & payment routes: `/api/pos/sales-order-item/*`, `/api/pos/sales-payment/*` (read their route/schema files before wrapping).
