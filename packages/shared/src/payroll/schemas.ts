import { z } from "zod";
export const payrollFrequencyEnum = z.enum(["hourly", "daily", "weekly", "biWeekly", "monthly"]);
export type PayrollFrequency = z.infer<typeof payrollFrequencyEnum>;
import type { SalaryRecordItem } from "../employee/schemas";

// Payroll Types & Enums
export const payrollStructureTypeEnum = z.enum(["basic", "allowance", "deduction"]);
export type PayrollStructureType = z.infer<typeof payrollStructureTypeEnum>;

export const payrollCalculationTypeEnum = z.enum(["percentage", "fixedAmount", "perDay", "perHour"]);
export type PayrollCalculationType = z.infer<typeof payrollCalculationTypeEnum>;

export const payrollPeriodStatusEnum = z.enum([
  "DRAFT",
  "PROCESSING",
  "APPROVED",
  "PAID",
  "CANCELLED",
]);
export type PayrollPeriodStatus = z.infer<typeof payrollPeriodStatusEnum>;

export const salaryRecordStatusEnum = z.enum([
  "PENDING",
  "APPROVED",
  "PAID",
  "CANCELLED",
]);
export type SalaryRecordStatus = z.infer<typeof salaryRecordStatusEnum>;

// Component Models & Inputs
export const createPayrollComponentSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  type: payrollStructureTypeEnum,
  calculationType: payrollCalculationTypeEnum,
  defaultAmount: z.number().min(0, "Default amount must be non-negative").default(0),
  isTaxable: z.boolean().default(true).optional(),
  description: z.string().max(255).optional().nullable(),
});

export const updatePayrollComponentSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(100).optional(),
  type: payrollStructureTypeEnum.optional(),
  calculationType: payrollCalculationTypeEnum.optional(),
  defaultAmount: z.number().min(0).optional(),
  isTaxable: z.boolean().optional(),
  description: z.string().max(255).optional().nullable(),
});

export type CreatePayrollComponentInput = z.infer<typeof createPayrollComponentSchema>;
export type UpdatePayrollComponentInput = z.infer<typeof updatePayrollComponentSchema>;

export interface PayrollComponentRecord {
  id: number;
  name: string;
  type: PayrollStructureType;
  calculationType: PayrollCalculationType;
  defaultAmount: number | string;
  isTaxable: boolean;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string | null;
}

// Period Models & Inputs
export const createPayrollPeriodSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  frequency: payrollFrequencyEnum.default("monthly").optional(),
  startDate: z.string(),
  endDate: z.string(),
  paymentDate: z.string().optional().nullable(),
  status: payrollPeriodStatusEnum.default("DRAFT").optional(),
  notes: z.string().optional().nullable(),
});

export const updatePayrollPeriodSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(100).optional(),
  frequency: payrollFrequencyEnum.optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  paymentDate: z.string().optional().nullable(),
  status: payrollPeriodStatusEnum.optional(),
  notes: z.string().optional().nullable(),
});

export type CreatePayrollPeriodInput = z.infer<typeof createPayrollPeriodSchema>;
export type UpdatePayrollPeriodInput = z.infer<typeof updatePayrollPeriodSchema>;

export interface PayrollPeriodRecord {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  paymentDate?: string | null;
  status: PayrollPeriodStatus;
  frequency?: PayrollFrequency;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string | null;
  salaryRecords?: SalaryRecordItem[];
}

// Salary Record Generation & Management Inputs
export const salaryComponentEntrySchema = z.object({
  componentId: z.number().int().positive(),
  amount: z.number().min(0),
});

export const generateSalaryRecordSchema = z.object({
  periodId: z.number().int().positive(),
  employeeId: z.number().int().positive(),
  salaryBasis: payrollFrequencyEnum.optional(),
  payFrequency: payrollFrequencyEnum.optional(),
  attendedDays: z.number().min(0).optional(),
  loggedHours: z.number().min(0).optional(),
  autoCalculateBase: z.boolean().optional(),
  components: z.array(salaryComponentEntrySchema).default([]),
  notes: z.string().optional().nullable(),
});

export const updateSalaryRecordSchema = z.object({
  id: z.number().int().positive(),
  status: salaryRecordStatusEnum.optional(),
  notes: z.string().optional().nullable(),
});

export type GenerateSalaryRecordInput = z.infer<typeof generateSalaryRecordSchema>;
export type UpdateSalaryRecordInput = z.infer<typeof updateSalaryRecordSchema>;
