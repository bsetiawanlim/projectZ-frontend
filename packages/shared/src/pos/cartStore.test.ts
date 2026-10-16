import { describe, it, expect, beforeEach } from "vitest";
import { cartStore } from "./cartStore";

describe("cartStore", () => {
    beforeEach(() => {
        cartStore.getState().clearCart();
    });

    it("starts with empty cart", () => {
        const state = cartStore.getState();
        expect(state.items).toHaveLength(0);
        expect(state.totals.grandTotal).toBe(0);
    });

    it("adds item and updates totals", () => {
        cartStore.getState().addItem({ id: 1, productName: "Cement 50kg", unitPrice: 75000 }, 2);
        const state = cartStore.getState();
        expect(state.items).toHaveLength(1);
        expect(state.items[0]?.quantity).toBe(2);
        expect(state.items[0]?.totalPrice).toBe(150000);
        expect(state.totals.grandTotal).toBe(150000);
    });

    it("merges quantity when adding same item", () => {
        cartStore.getState().addItem({ id: 1, productName: "Cement 50kg", unitPrice: 75000 }, 2);
        cartStore.getState().addItem({ id: 1, productName: "Cement 50kg", unitPrice: 75000 }, 3);
        const state = cartStore.getState();
        expect(state.items).toHaveLength(1);
        expect(state.items[0]?.quantity).toBe(5);
        expect(state.totals.grandTotal).toBe(375000);
    });

    it("calculates item discount and order tax", () => {
        cartStore.getState().addItem({ id: 1, productName: "Sand m3", unitPrice: 100000 }, 1);
        cartStore.getState().updateItemDiscount(1, 10); // 10% off -> 90,000
        cartStore.getState().setOrderTax(true, 11); // 11% tax on 90,000 -> 9,900 => grandTotal 99,900
        const state = cartStore.getState();
        expect(state.totals.subtotal).toBe(90000);
        expect(state.totals.taxAmount).toBe(9900);
        expect(state.totals.grandTotal).toBe(99900);
    });

    it("sets facility and includes in create order payload", () => {
        cartStore.getState().setFacility(3);
        const payload = cartStore.getState().toCreateOrderPayload();
        expect(payload.facilityId).toBe(3);
    });

    it("generates valid create order payload", () => {
        cartStore.getState().setCustomer(5);
        cartStore.getState().addItem({ id: 2, productName: "Brick", unitPrice: 1000 }, 500);
        const payload = cartStore.getState().toCreateOrderPayload();
        expect(payload.customerId).toBe(5);
        expect(payload.items).toHaveLength(1);
        expect(payload.items[0]?.productId).toBe(2);
        expect(payload.items[0]?.quantity).toBe(500);
    });
});
