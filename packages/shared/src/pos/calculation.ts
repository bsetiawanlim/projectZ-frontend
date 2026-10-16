export interface ItemCalcInput {
    quantity: number;
    unitPrice: number;
    discountPercentage?: number;
}

const r4 = (n: number) => Number(n.toFixed(4));
const clampPct = (n: unknown) => Math.max(0, Math.min(100, Number(n) || 0));

/** Mirrors backend `calculateItemTotals` (salesOrderCalculation.ts). */
export function calculateItemTotals(input: ItemCalcInput) {
    const quantity = Number(input.quantity) || 0;
    const unitPrice = Number(input.unitPrice) || 0;
    const discountPercentage = clampPct(input.discountPercentage);
    const gross = quantity * unitPrice;
    const discountAmount = r4((gross * discountPercentage) / 100);
    return { quantity, unitPrice, discountPercentage, discountAmount, totalPrice: r4(gross - discountAmount) };
}

export interface OrderCalcInput {
    subtotal: number;
    includeDiscount?: boolean;
    discountPercentage?: number;
    includeTax?: boolean;
    taxPercentage?: number;
}

/** Mirrors backend `calculateOrderTotals`. Server remains authoritative. */
export function calculateOrderTotals(input: OrderCalcInput) {
    const subtotal = Number(input.subtotal) || 0;
    const includeDiscount = Boolean(input.includeDiscount);
    const discountPercentage = includeDiscount ? clampPct(input.discountPercentage) : 0;
    const discountAmount = includeDiscount ? r4((subtotal * discountPercentage) / 100) : 0;
    const taxableAmount = Math.max(0, subtotal - discountAmount);
    const includeTax = Boolean(input.includeTax);
    const taxPercentage = includeTax ? clampPct(input.taxPercentage) : 0;
    const taxAmount = includeTax ? r4((taxableAmount * taxPercentage) / 100) : 0;
    return {
        subtotal,
        includeDiscount,
        discountPercentage,
        discountAmount,
        includeTax,
        taxPercentage,
        taxAmount,
        grandTotal: r4(taxableAmount + taxAmount),
    };
}

/** Change due for cash overpayment. */
export function calculateChange(totalPaid: number, grandTotal: number) {
    return Math.max(0, r4(totalPaid - grandTotal));
}
