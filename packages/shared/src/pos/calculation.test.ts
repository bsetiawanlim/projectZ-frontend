import { describe, expect, it } from "vitest";
import { calculateChange, calculateItemTotals, calculateOrderTotals } from "./calculation";

describe("POS calculation (mirrors backend)", () => {
    it("item discount", () => {
        const t = calculateItemTotals({ quantity: 3, unitPrice: 10000, discountPercentage: 10 });
        expect(t.discountAmount).toBe(3000);
        expect(t.totalPrice).toBe(27000);
    });

    it("order with discount and tax", () => {
        const t = calculateOrderTotals({
            subtotal: 100000,
            includeDiscount: true,
            discountPercentage: 10,
            includeTax: true,
            taxPercentage: 11,
        });
        expect(t.discountAmount).toBe(10000);
        expect(t.taxAmount).toBe(9900);
        expect(t.grandTotal).toBe(99900);
    });

    it("ignores percentages when flags are off", () => {
        const t = calculateOrderTotals({ subtotal: 5000, discountPercentage: 50, taxPercentage: 50 });
        expect(t.grandTotal).toBe(5000);
    });

    it("change", () => {
        expect(calculateChange(120000, 99900)).toBe(20100);
        expect(calculateChange(50000, 99900)).toBe(0);
    });
});
