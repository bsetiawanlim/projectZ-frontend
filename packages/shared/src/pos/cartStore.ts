import { createStore } from "zustand/vanilla";
import { calculateItemTotals, calculateOrderTotals } from "./calculation";

export interface CartItem {
    productId: number;
    productName: string;
    unitId?: number | null;
    quantity: number;
    unitPrice: number;
    discountPercentage: number;
    discountAmount: number;
    totalPrice: number;
    notes?: string | null;
}

export interface CartTotals {
    subtotal: number;
    discountAmount: number;
    taxAmount: number;
    grandTotal: number;
}

export interface CartState {
    customerId: number | null;
    facilityId: number | null;
    currency: string;
    includeDiscount: boolean;
    discountPercentage: number;
    includeTax: boolean;
    taxPercentage: number;
    notes: string | null;
    items: CartItem[];
    totals: CartTotals;

    // Actions
    addItem: (
        product: { id: number; productName: string; unitPrice: number; unitId?: number | null },
        quantity?: number
    ) => void;
    updateItemQuantity: (productId: number, quantity: number) => void;
    updateItemDiscount: (productId: number, discountPercentage: number) => void;
    removeItem: (productId: number) => void;
    setCustomer: (customerId: number | null) => void;
    setFacility: (facilityId: number | null) => void;
    setOrderDiscount: (include: boolean, percentage?: number) => void;
    setOrderTax: (include: boolean, percentage?: number) => void;
    setNotes: (notes: string | null) => void;
    clearCart: () => void;
    toCreateOrderPayload: () => {
        customerId?: number | null;
        facilityId?: number | null;
        currency: string;
        includeDiscount: boolean;
        discountPercentage: number;
        includeTax: boolean;
        taxPercentage: number;
        notes?: string | null;
        items: Array<{
            productId: number;
            unitId?: number | null;
            quantity: number;
            unitPrice: number;
            discountPercentage: number;
            notes?: string | null;
        }>;
    };
}

function computeTotals(
    items: CartItem[],
    includeDiscount: boolean,
    discountPercentage: number,
    includeTax: boolean,
    taxPercentage: number
): CartTotals {
    const subtotal = items.reduce((acc, item) => acc + item.totalPrice, 0);
    const orderCalc = calculateOrderTotals({
        subtotal,
        includeDiscount,
        discountPercentage,
        includeTax,
        taxPercentage,
    });
    return {
        subtotal: orderCalc.subtotal,
        discountAmount: orderCalc.discountAmount,
        taxAmount: orderCalc.taxAmount,
        grandTotal: orderCalc.grandTotal,
    };
}

export const createCartStore = () =>
    createStore<CartState>((set, get) => ({
        customerId: null,
    facilityId: null,
        currency: "IDR",
        includeDiscount: false,
        discountPercentage: 0,
        includeTax: false,
        taxPercentage: 0,
        notes: null,
        items: [],
        totals: { subtotal: 0, discountAmount: 0, taxAmount: 0, grandTotal: 0 },

        addItem: (product, quantity = 1) => {
            set((state) => {
                const existingIndex = state.items.findIndex((i) => i.productId === product.id);
                let nextItems: CartItem[];

                if (existingIndex >= 0) {
                    const existing = state.items[existingIndex]!;
                    const newQty = existing.quantity + quantity;
                    const calc = calculateItemTotals({
                        quantity: newQty,
                        unitPrice: existing.unitPrice,
                        discountPercentage: existing.discountPercentage,
                    });
                    nextItems = [...state.items];
                    nextItems[existingIndex] = { ...existing, ...calc };
                } else {
                    const calc = calculateItemTotals({
                        quantity,
                        unitPrice: product.unitPrice,
                        discountPercentage: 0,
                    });
                    const newItem: CartItem = {
                        productId: product.id,
                        productName: product.productName,
                        unitId: product.unitId ?? null,
                        ...calc,
                    };
                    nextItems = [...state.items, newItem];
                }

                const totals = computeTotals(
                    nextItems,
                    state.includeDiscount,
                    state.discountPercentage,
                    state.includeTax,
                    state.taxPercentage
                );
                return { items: nextItems, totals };
            });
        },

        updateItemQuantity: (productId, quantity) => {
            set((state) => {
                if (quantity <= 0) {
                    const nextItems = state.items.filter((i) => i.productId !== productId);
                    const totals = computeTotals(
                        nextItems,
                        state.includeDiscount,
                        state.discountPercentage,
                        state.includeTax,
                        state.taxPercentage
                    );
                    return { items: nextItems, totals };
                }

                const nextItems = state.items.map((item) => {
                    if (item.productId !== productId) return item;
                    const calc = calculateItemTotals({
                        quantity,
                        unitPrice: item.unitPrice,
                        discountPercentage: item.discountPercentage,
                    });
                    return { ...item, ...calc };
                });

                const totals = computeTotals(
                    nextItems,
                    state.includeDiscount,
                    state.discountPercentage,
                    state.includeTax,
                    state.taxPercentage
                );
                return { items: nextItems, totals };
            });
        },

        updateItemDiscount: (productId, discountPercentage) => {
            set((state) => {
                const nextItems = state.items.map((item) => {
                    if (item.productId !== productId) return item;
                    const calc = calculateItemTotals({
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        discountPercentage,
                    });
                    return { ...item, ...calc };
                });

                const totals = computeTotals(
                    nextItems,
                    state.includeDiscount,
                    state.discountPercentage,
                    state.includeTax,
                    state.taxPercentage
                );
                return { items: nextItems, totals };
            });
        },

        removeItem: (productId) => {
            set((state) => {
                const nextItems = state.items.filter((i) => i.productId !== productId);
                const totals = computeTotals(
                    nextItems,
                    state.includeDiscount,
                    state.discountPercentage,
                    state.includeTax,
                    state.taxPercentage
                );
                return { items: nextItems, totals };
            });
        },

        setCustomer: (customerId) => set({ customerId }),
        setFacility: (facilityId) => set({ facilityId }),

        setOrderDiscount: (include, percentage = 0) => {
            set((state) => {
                const totals = computeTotals(
                    state.items,
                    include,
                    percentage,
                    state.includeTax,
                    state.taxPercentage
                );
                return { includeDiscount: include, discountPercentage: percentage, totals };
            });
        },

        setOrderTax: (include, percentage = 0) => {
            set((state) => {
                const totals = computeTotals(
                    state.items,
                    state.includeDiscount,
                    state.discountPercentage,
                    include,
                    percentage
                );
                return { includeTax: include, taxPercentage: percentage, totals };
            });
        },

        setNotes: (notes) => set({ notes }),

        clearCart: () =>
            set({
                customerId: null,
                includeDiscount: false,
                discountPercentage: 0,
                includeTax: false,
                taxPercentage: 0,
                notes: null,
                items: [],
                totals: { subtotal: 0, discountAmount: 0, taxAmount: 0, grandTotal: 0 },
            }),

        toCreateOrderPayload: () => {
            const state = get();
            return {
                customerId: state.customerId,
                facilityId: state.facilityId,
                currency: state.currency,
                includeDiscount: state.includeDiscount,
                discountPercentage: state.discountPercentage,
                includeTax: state.includeTax,
                taxPercentage: state.taxPercentage,
                notes: state.notes,
                items: state.items.map((i) => ({
                    productId: i.productId,
                    unitId: i.unitId,
                    quantity: i.quantity,
                    unitPrice: i.unitPrice,
                    discountPercentage: i.discountPercentage,
                    notes: i.notes,
                })),
            };
        },
    }));

export const cartStore = createCartStore();
export type CartStore = ReturnType<typeof createCartStore>;
