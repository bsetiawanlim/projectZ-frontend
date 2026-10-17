import type { ApiClient } from "../api/client";
import type { ApiSuccess, Paginated, PaginationParams } from "../api/types";
import type {
  PayrollComponentRecord,
  CreatePayrollComponentInput,
  UpdatePayrollComponentInput,
  PayrollPeriodRecord,
  CreatePayrollPeriodInput,
  UpdatePayrollPeriodInput,
  GenerateSalaryRecordInput,
  UpdateSalaryRecordInput,
} from "./schemas";
import type { SalaryRecordItem } from "../employee/schemas";

export function createPayrollApi(client: ApiClient) {
  return {
    // Payroll Periods
    async listPeriods(query?: PaginationParams): Promise<Paginated<PayrollPeriodRecord>> {
      return client.list<PayrollPeriodRecord>("/api/payroll-period/get-all", query);
    },
    async getPeriod(id: number): Promise<ApiSuccess<{ payrollPeriod: PayrollPeriodRecord }>> {
      return client.post<{ payrollPeriod: PayrollPeriodRecord }>("/api/payroll-period/get", { id });
    },
    async createPeriod(input: CreatePayrollPeriodInput): Promise<ApiSuccess<PayrollPeriodRecord>> {
      return client.post<PayrollPeriodRecord>("/api/payroll-period/create", input);
    },
    async updatePeriod(input: UpdatePayrollPeriodInput): Promise<ApiSuccess<PayrollPeriodRecord>> {
      return client.post<PayrollPeriodRecord>("/api/payroll-period/update", input);
    },
    async deletePeriod(id: number): Promise<ApiSuccess<void>> {
      return client.post<void>("/api/payroll-period/delete", { id });
    },

    // Payroll Components
    async listComponents(query?: PaginationParams): Promise<Paginated<PayrollComponentRecord>> {
      return client.list<PayrollComponentRecord>("/api/payroll-component/get-all", query);
    },
    async getComponent(id: number): Promise<ApiSuccess<{ payrollComponent: PayrollComponentRecord }>> {
      return client.post<{ payrollComponent: PayrollComponentRecord }>("/api/payroll-component/get", { id });
    },
    async createComponent(input: CreatePayrollComponentInput): Promise<ApiSuccess<PayrollComponentRecord>> {
      return client.post<PayrollComponentRecord>("/api/payroll-component/create", input);
    },
    async updateComponent(input: UpdatePayrollComponentInput): Promise<ApiSuccess<PayrollComponentRecord>> {
      return client.post<PayrollComponentRecord>("/api/payroll-component/update", input);
    },
    async deleteComponent(id: number): Promise<ApiSuccess<void>> {
      return client.post<void>("/api/payroll-component/delete", { id });
    },

    // Salary Records
    async listSalaryRecords(query?: {
      employeeId?: number;
      facilityId?: number | string;
      periodId?: number | string;
      status?: string;
      search?: string;
      limit?: number;
      page?: number;
    }): Promise<Paginated<SalaryRecordItem>> {
      return client.list<SalaryRecordItem>("/api/salary-record/get-all", query);
    },
    async getSalaryRecord(id: number): Promise<ApiSuccess<{ salaryRecord: SalaryRecordItem }>> {
      return client.post<{ salaryRecord: SalaryRecordItem }>("/api/salary-record/get", { id });
    },
    async getSalaryRecordsByPeriod(periodId: number): Promise<ApiSuccess<SalaryRecordItem[]>> {
      return client.post<SalaryRecordItem[]>("/api/salary-record/get-by-period", { periodId });
    },
    async generateSalaryRecord(input: GenerateSalaryRecordInput): Promise<ApiSuccess<SalaryRecordItem>> {
      return client.post<SalaryRecordItem>("/api/salary-record/generate", input);
    },
    async updateSalaryRecord(input: UpdateSalaryRecordInput): Promise<ApiSuccess<SalaryRecordItem>> {
      return client.post<SalaryRecordItem>("/api/salary-record/update", input);
    },
    async deleteSalaryRecord(id: number): Promise<ApiSuccess<void>> {
      return client.post<void>("/api/salary-record/delete", { id });
    },
  };
}
