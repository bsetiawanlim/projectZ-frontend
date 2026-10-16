import { z } from "zod";

export const createEquipmentEntitySchema = z.object({
    equipmentTypeId:    z.number().int().positive().optional(),
    brandId:            z.number().int().positive().optional(),
    modelId:            z.number().int().positive().optional(),
    code:               z.string().optional(),
    name:               z.string().min(1, "Name is required"),
    description:        z.string().optional(),
    unitId:             z.number().int().positive().optional(),
    unitPrice:          z.number().positive("Unit price must be greater than 0"),
    salvageValue:       z.number().min(0, "Salvage value must be non-negative").optional().nullable(),
    usefulLifeYears:    z.number().int().positive("Useful life must be at least 1 year").optional().nullable(),
    depreciationMethod: z.enum(["STRAIGHT_LINE", "DOUBLE_DECLINING"]).optional().nullable(),
    acquisitionDate:    z.string().or(z.date()).optional().nullable(),
});

export const updateEquipmentEntitySchema = z.object({
    id:                 z.number().int().positive("ID must be greater than 0"),
    equipmentTypeId:    z.number().int().positive().optional(),
    brandId:            z.number().int().positive().optional(),
    modelId:            z.number().int().positive().optional(),
    code:               z.string().optional(),
    name:               z.string().min(1).optional(),
    description:        z.string().optional(),
    unitId:             z.number().int().positive().optional(),
    unitPrice:          z.number().positive().optional(),
    salvageValue:       z.number().min(0).optional().nullable(),
    usefulLifeYears:    z.number().int().positive().optional().nullable(),
    depreciationMethod: z.enum(["STRAIGHT_LINE", "DOUBLE_DECLINING"]).optional().nullable(),
    acquisitionDate:    z.string().or(z.date()).optional().nullable(),
});

export type CreateEquipmentEntityInput = z.infer<typeof createEquipmentEntitySchema>;
export type UpdateEquipmentEntityInput = z.infer<typeof updateEquipmentEntitySchema>;

export interface EquipmentBrandRecord {
    id: number;
    name: string;
    description?: string | null;
}

export interface EquipmentModelRecord {
    id: number;
    name: string;
    brandId?: number | null;
    equipmentTypeId?: number | null;
    type?: { id: number; name: string } | null;
}

export interface EquipmentTypeRecord {
    id: number;
    name: string;
    description?: string | null;
}

export interface DepreciationScheduleItem {
    year: number;
    beginningBookValue: number;
    depreciationExpense: number;
    accumulatedDepreciation: number;
    endingBookValue: number;
    percentDepreciated: number;
}

export interface DepreciationCalculationResult {
    cost: number;
    salvageValue: number;
    usefulLifeYears: number;
    depreciationMethod: string;
    acquisitionDate: string;
    asOfDate: string;
    ageMonths: number;
    depreciableBase: number;
    annualDepreciation: number;
    monthlyDepreciation: number;
    accumulatedDepreciation: number;
    currentBookValue: number;
    percentDepreciated: number;
    isFullyDepreciated: boolean;
    remainingLifeMonths: number;
    schedule: DepreciationScheduleItem[];
}

export function calculateEquipmentDepreciation(
    costNum: number,
    salvageNum: number = 0,
    usefulLife: number = 5,
    method: string = "STRAIGHT_LINE",
    acqDateInput?: Date | string | null,
    targetDateInput?: Date | string | null
): DepreciationCalculationResult {
    const cost = Math.max(0, Number(costNum) || 0);
    const salvageValue = Math.min(cost, Math.max(0, Number(salvageNum) || 0));
    const usefulLifeYears = Math.max(1, Number(usefulLife) || 5);
    const depreciationMethod = method === "DOUBLE_DECLINING" ? "DOUBLE_DECLINING" : "STRAIGHT_LINE";
    const depreciableBase = Math.max(0, cost - salvageValue);

    const acqDate = acqDateInput ? new Date(acqDateInput) : new Date();
    const targetDate = targetDateInput ? new Date(targetDateInput) : new Date();

    const acqYear = acqDate.getFullYear();
    const acqMonth = acqDate.getMonth();
    const targetYear = targetDate.getFullYear();
    const targetMonth = targetDate.getMonth();
    const rawMonths = (targetYear - acqYear) * 12 + (targetMonth - acqMonth);
    const ageMonths = Math.max(0, rawMonths);

    const schedule: DepreciationScheduleItem[] = [];
    let currentBookVal = cost;
    let totalAccDep = 0;

    if (depreciationMethod === "STRAIGHT_LINE") {
        const annualDep = depreciableBase / usefulLifeYears;
        const monthlyDep = annualDep / 12;

        for (let yr = 1; yr <= usefulLifeYears; yr++) {
            const startVal = currentBookVal;
            const expense = Math.min(startVal - salvageValue, annualDep);
            const endVal = Math.max(salvageValue, startVal - expense);
            const acc = totalAccDep + expense;
            totalAccDep = acc;
            currentBookVal = endVal;

            schedule.push({
                year: yr,
                beginningBookValue: Number(startVal.toFixed(2)),
                depreciationExpense: Number(expense.toFixed(2)),
                accumulatedDepreciation: Number(acc.toFixed(2)),
                endingBookValue: Number(endVal.toFixed(2)),
                percentDepreciated: depreciableBase > 0 ? Number(((acc / depreciableBase) * 100).toFixed(1)) : 100,
            });
        }

        const elapsedDep = Math.min(depreciableBase, monthlyDep * ageMonths);
        const currentNBV = Math.max(salvageValue, cost - elapsedDep);
        const remMonths = Math.max(0, (usefulLifeYears * 12) - ageMonths);

        return {
            cost: Number(cost.toFixed(2)),
            salvageValue: Number(salvageValue.toFixed(2)),
            usefulLifeYears,
            depreciationMethod,
            acquisitionDate: acqDate.toISOString(),
            asOfDate: targetDate.toISOString(),
            ageMonths,
            depreciableBase: Number(depreciableBase.toFixed(2)),
            annualDepreciation: Number(annualDep.toFixed(2)),
            monthlyDepreciation: Number(monthlyDep.toFixed(2)),
            accumulatedDepreciation: Number(elapsedDep.toFixed(2)),
            currentBookValue: Number(currentNBV.toFixed(2)),
            percentDepreciated: depreciableBase > 0 ? Number(((elapsedDep / depreciableBase) * 100).toFixed(1)) : 100,
            isFullyDepreciated: elapsedDep >= depreciableBase,
            remainingLifeMonths: remMonths,
            schedule,
        };
    } else {
        // DOUBLE DECLINING BALANCE
        const straightLineRate = 1 / usefulLifeYears;
        const ddbRate = Math.min(1, straightLineRate * 2);

        for (let yr = 1; yr <= usefulLifeYears; yr++) {
            const startVal = currentBookVal;
            let expense = startVal * ddbRate;
            if (startVal - expense < salvageValue) {
                expense = Math.max(0, startVal - salvageValue);
            }
            if (yr === usefulLifeYears) {
                expense = Math.max(0, startVal - salvageValue);
            }

            const endVal = Math.max(salvageValue, startVal - expense);
            const acc = totalAccDep + expense;
            totalAccDep = acc;
            currentBookVal = endVal;

            schedule.push({
                year: yr,
                beginningBookValue: Number(startVal.toFixed(2)),
                depreciationExpense: Number(expense.toFixed(2)),
                accumulatedDepreciation: Number(acc.toFixed(2)),
                endingBookValue: Number(endVal.toFixed(2)),
                percentDepreciated: depreciableBase > 0 ? Number(((acc / depreciableBase) * 100).toFixed(1)) : 100,
            });
        }

        let elapsedDep = 0;
        let remainingMonthsToSimulate = ageMonths;

        for (const item of schedule) {
            if (remainingMonthsToSimulate <= 0) break;
            const monthsInThisYear = Math.min(12, remainingMonthsToSimulate);
            const portionOfYear = monthsInThisYear / 12;
            const depThisPeriod = item.depreciationExpense * portionOfYear;
            elapsedDep += depThisPeriod;
            remainingMonthsToSimulate -= monthsInThisYear;
        }

        elapsedDep = Math.min(depreciableBase, Math.max(0, elapsedDep));
        const currentNBV = Math.max(salvageValue, cost - elapsedDep);
        const remMonths = Math.max(0, (usefulLifeYears * 12) - ageMonths);
        const annualDep = schedule.length > 0 ? (schedule[0]?.depreciationExpense ?? 0) : 0;
        const monthlyDep = annualDep / 12;

        return {
            cost: Number(cost.toFixed(2)),
            salvageValue: Number(salvageValue.toFixed(2)),
            usefulLifeYears,
            depreciationMethod,
            acquisitionDate: acqDate.toISOString(),
            asOfDate: targetDate.toISOString(),
            ageMonths,
            depreciableBase: Number(depreciableBase.toFixed(2)),
            annualDepreciation: Number(annualDep.toFixed(2)),
            monthlyDepreciation: Number(monthlyDep.toFixed(2)),
            accumulatedDepreciation: Number(elapsedDep.toFixed(2)),
            currentBookValue: Number(currentNBV.toFixed(2)),
            percentDepreciated: depreciableBase > 0 ? Number(((elapsedDep / depreciableBase) * 100).toFixed(1)) : 100,
            isFullyDepreciated: elapsedDep >= depreciableBase,
            remainingLifeMonths: remMonths,
            schedule,
        };
    }
}

export interface EquipmentEntityRecord {
    id: number;
    equipmentTypeId?: number | null;
    brandId?: number | null;
    modelId?: number | null;
    code?: string | null;
    name: string;
    description?: string | null;
    unitId?: number | null;
    unitPrice: number;
    salvageValue?: number | string | null;
    usefulLifeYears?: number | null;
    depreciationMethod?: "STRAIGHT_LINE" | "DOUBLE_DECLINING" | string | null;
    acquisitionDate?: string | null;
    depreciation?: DepreciationCalculationResult;
    brand?: EquipmentBrandRecord | null;
    model?: EquipmentModelRecord | null;
    prices?: EquipmentPriceRecord[];
    equipmentFeature?: any[];
    equipmentMaintenance?: any[];
    createdAt?: string;
    updatedAt?: string;
}

export type EquipmentPriceType = "SALE" | "LEASE_DAILY" | "LEASE_MONTHLY" | "LEASE_YEARLY";

export const createEquipmentPriceSchema = z.object({
    equipmentEntityId: z.number().int().positive("Equipment ID must be positive"),
    customerGroup: z.number().int().positive().optional().nullable(),
    priceType: z.enum(["SALE", "LEASE_DAILY", "LEASE_MONTHLY", "LEASE_YEARLY"]),
    amount: z.number().positive("Amount must be greater than 0"),
    currency: z.string().default("USD").optional(),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
});

export const updateEquipmentPriceSchema = z.object({
    id: z.number().int().positive("ID is required"),
    equipmentEntityId: z.number().int().positive().optional(),
    customerGroup: z.number().int().positive().optional().nullable(),
    priceType: z.enum(["SALE", "LEASE_DAILY", "LEASE_MONTHLY", "LEASE_YEARLY"]).optional(),
    amount: z.number().positive("Amount must be greater than 0").optional(),
    currency: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
});

export interface CreateEquipmentPriceInput {
    equipmentEntityId: number;
    customerGroup?: number | null;
    priceType: EquipmentPriceType;
    amount: number;
    currency?: string;
    startDate: string;
    endDate?: string | null;
    notes?: string | null;
}

export interface UpdateEquipmentPriceInput {
    id: number;
    equipmentEntityId?: number;
    customerGroup?: number | null;
    priceType?: EquipmentPriceType;
    amount?: number;
    currency?: string;
    startDate?: string;
    endDate?: string | null;
    notes?: string | null;
}

export interface EquipmentPriceRecord {
    id: number;
    equipmentEntityId: number;
    customerGroup?: number | null;
    priceType: EquipmentPriceType;
    amount: number;
    currency: string;
    startDate: string;
    endDate?: string | null;
    notes?: string | null;
    createdAt?: string;
    updatedAt?: string;
    createdBy?: { id: number; name: string } | null;
    equipment?: { id: number; name: string; code?: string | null } | null;
}


