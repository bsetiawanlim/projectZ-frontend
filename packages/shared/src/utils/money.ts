export function formatIDR(amount: number | string, opts: { withSymbol?: boolean } = {}) {
    const n = Number(amount) || 0;
    return new Intl.NumberFormat("id-ID", {
        style: opts.withSymbol === false ? "decimal" : "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
    }).format(n);
}
