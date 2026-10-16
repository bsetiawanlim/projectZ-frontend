import { z } from "zod";

import { payrollFrequencyEnum, type PayrollFrequency } from "../payroll/schemas";

export const employmentTypeEnum = z.enum(["MONTHLY", "BI_WEEKLY", "WEEKLY", "DAILY", "HOURLY", "CONTRACT"]);
export type EmploymentType = z.infer<typeof employmentTypeEnum>;

export const employeeSchema = z.object({
    id: z.number().nullish(),
    profileId: z.number().nullish(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    phoneNumber: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    province: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
    positionId: z.number().nullish(),
    facilityId: z.number().nullish(),
    employmentType: employmentTypeEnum.default("MONTHLY").optional(),
    salaryBasis: payrollFrequencyEnum.default("monthly").nullish(),
    payFrequency: payrollFrequencyEnum.default("monthly").nullish(),
    hourlyRate: z.number().min(0).nullish(),
    dailyRate: z.number().min(0).nullish(),
    weeklyRate: z.number().min(0).nullish(),
    biWeeklyRate: z.number().min(0).nullish(),
    monthlySalary: z.number().min(0).nullish(),
    contractRate: z.number().min(0).nullish(),
    startDate: z.preprocess((val) => (val === "" ? null : val), z.coerce.date().nullish()),
    endDate: z.preprocess((val) => (val === "" ? null : val), z.coerce.date().nullish()),
    departReason: z.string().nullish(),
});

export const deleteEmployeeSchema = z.object({
    id: z.number(),
    departReason: z.string().nullish(),
});

export type EmployeeInput = z.infer<typeof employeeSchema>;
export type DeleteEmployeeInput = z.infer<typeof deleteEmployeeSchema>;

export interface EmployeeProfileSummary {
    id?: number;
    firstName: string;
    lastName?: string | null;
    address?: string | null;
    city?: string | null;
    province?: string | null;
    postalCode?: string | null;
    country?: string | null;
    phoneNumber?: string | null;
}

export interface PositionRecord {
    id: number;
    name?: string;
    positionName?: string;
    description?: string | null;
}

export interface EmployeeRecord {
    id: number;
    profileId: number;
    positionId?: number | null;
    employmentType?: EmploymentType;
    salaryBasis?: PayrollFrequency | null;
    payFrequency?: PayrollFrequency | null;
    hourlyRate?: number | string | null;
    dailyRate?: number | string | null;
    weeklyRate?: number | string | null;
    biWeeklyRate?: number | string | null;
    monthlySalary?: number | string | null;
    contractRate?: number | string | null;
    startDate?: string | null;
    endDate?: string | null;
    departReason?: string | null;
    deletedAt?: string | null;
    createdAt?: string;
    updatedAt?: string;
    profile?: EmployeeProfileSummary | null;
    position?: PositionRecord | null;
    facilityId?: number | null;
    facility?: { id: number; facilityCode: string; facilityName: string; type?: string } | null;
    attendanceRecords?: AttendanceRecord[];
}

export const attendanceStatusEnum = z.enum([
    "PRESENT",
    "LATE",
    "ABSENT",
    "SICK",
    "ON_LEAVE",
    "PERMISSION",
]);
export type AttendanceStatus = z.infer<typeof attendanceStatusEnum>;

export const createAttendanceSchema = z.object({
    employeeId: z.number().int().positive(),
    date: z.string(),
    clockIn: z.string().nullish(),
    clockOut: z.string().nullish(),
    status: attendanceStatusEnum.default("PRESENT"),
    clockInIp: z.string().nullish(),
    clockOutIp: z.string().nullish(),
    clockInLocation: z.string().nullish(),
    clockOutLocation: z.string().nullish(),
    notes: z.string().nullish(),
});

export const updateAttendanceSchema = z.object({
    id: z.number().int().positive(),
    clockIn: z.string().nullish(),
    clockOut: z.string().nullish(),
    status: attendanceStatusEnum.optional(),
    clockInIp: z.string().nullish(),
    clockOutIp: z.string().nullish(),
    clockInLocation: z.string().nullish(),
    clockOutLocation: z.string().nullish(),
    notes: z.string().nullish(),
});

export const clockInSchema = z.object({
    employeeId: z.number().int().positive(),
    clockInLocation: z.string().nullish(),
    notes: z.string().nullish(),
});

export const clockOutSchema = z.object({
    employeeId: z.number().int().positive(),
    clockOutLocation: z.string().nullish(),
    notes: z.string().nullish(),
});

export type CreateAttendanceInput = z.infer<typeof createAttendanceSchema>;
export type UpdateAttendanceInput = z.infer<typeof updateAttendanceSchema>;
export type ClockInInput = z.infer<typeof clockInSchema>;
export type ClockOutInput = z.infer<typeof clockOutSchema>;

export interface AttendanceRecord {
    id: number;
    employeeId: number;
    date: string;
    clockIn?: string | null;
    clockOut?: string | null;
    status: AttendanceStatus;
    clockInIp?: string | null;
    clockOutIp?: string | null;
    clockInLocation?: string | null;
    clockOutLocation?: string | null;
    workDurationMinutes?: number | null;
    notes?: string | null;
    createdAt?: string;
    updatedAt?: string | null;
    employee?: EmployeeRecord | null;
}

export interface SalaryRecordItem {
    id: number;
    periodId: number;
    employeeId: number;
    basicSalary: number | string;
    totalAllowances: number | string;
    totalDeductions: number | string;
    netSalary: number | string;
    salaryBasis?: string | null;
    payFrequency?: string | null;
    status: "PENDING" | "APPROVED" | "PAID" | "CANCELLED";
    notes?: string | null;
    createdAt?: string;
    period?: {
        id: number;
        name: string;
        startDate: string;
        endDate: string;
        paymentDate?: string | null;
        status: string;
        frequency?: string | null;
    } | null;
    employee?: EmployeeRecord | null;
    details?: Array<{
        id: number;
        componentId: number;
        amount: number | string;
        notes?: string | null;
        component?: {
            id: number;
            name: string;
            type: "basic" | "allowance" | "deduction";
            calculationType: "percentage" | "fixedAmount";
        } | null;
    }>;
}

