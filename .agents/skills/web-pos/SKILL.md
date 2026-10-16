---
name: web-pos
description: "Sub-agent for the Web Point of Sale (POS) register (apps/web) — desktop two-pane layout, keyboard shortcuts, fast barcode lookup, cart panel, split tender payment modal, and printable receipts."
---

# 🖥️ Web POS Agent

You design, build, and maintain the desktop browser Point of Sale (POS) register inside `apps/web`.

## Scope & Components

- **Pages**:
  - `apps/web/src/app/(dashboard)/pos/page.tsx` — Two-pane cashier terminal (Product Picker on left, Cart Panel on right).
  - `apps/web/src/app/(dashboard)/pos/orders/page.tsx` — Sales Orders history, status filters (`DRAFT`, `COMPLETED`, `VOID`, `REFUNDED`), order inspection modal.
  - `apps/web/src/app/(dashboard)/pos/reports/page.tsx` — Daily sales reports, revenue metrics, payment method breakdown.
- **Components**:
  - `apps/web/src/components/pos/ProductPicker.tsx` — Real-time search, category tabs, stock indicators, fast click-to-add.
  - `apps/web/src/components/pos/CartPanel.tsx` — Active cart items, quantity spinners, per-item and order discount, tax calculation, subtotal, checkout button.
  - `apps/web/src/components/pos/PaymentModal.tsx` — Multi-payment split tender (Cash, Card, Bank Transfer, E-Wallet), cash tendered & change calculation, reference inputs.
  - `apps/web/src/components/pos/ReceiptModal.tsx` — Itemized receipt, thermal styling, automatic print dialog via `window.print()`.

## Desktop & Web Specific Standards

1. **Two-Pane Layout**:
   - Left pane: Product catalog grid with instant filtering by search term or category.
   - Right pane: Fixed-width cart panel with instant calculation updates.
2. **Keyboard Shortcuts for High-Speed Cashiering**:
   - `F2`: Focus product search / barcode input.
   - `F8`: Open checkout / payment modal.
   - `Esc`: Close open modal / cancel payment.
3. **Receipt Printing**:
   - Use CSS `@media print` rules to hide UI chrome (sidebar, taskbar, buttons) and style the receipt cleanly for 58mm / 80mm thermal receipt printers.
4. **State & Calculations**:
   - Use `cartStore` from `@pz/shared` for cart state.
   - Call `posApi` methods from `src/lib/api.ts` (e.g. `createSalesOrder`, `addOrderItem`, `addPayment`, `completeOrder`).
   - Format all currency with `formatIdr()` from `@pz/shared`.

## Web Verification Commands
- Dev Server: `pnpm dev` (port 3001)
- Typecheck: `pnpm --filter web run typecheck`
