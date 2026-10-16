import type { ApiClient } from "../api/client";
import type { ApiSuccess, Paginated, PaginationParams } from "../api/types";
import type {
    EmployeeInput,
    EmployeeRecord,
    PositionRecord,
    AttendanceRecord,
    CreateAttendanceInput,
    UpdateAttendanceInput,
    ClockInInput,
    ClockOutInput,
    SalaryRecordItem,
} from "./schemas";

export function createEmployeeApi(client: ApiClient) {
    return {
        async createEmployee(input: EmployeeInput): Promise<ApiSuccess<EmployeeRecord>> {
            return client.post<EmployeeRecord>("/api/employee/create", input);
        },
        async updateEmployee(input: EmployeeInput): Promise<ApiSuccess<EmployeeRecord>> {
            return client.post<EmployeeRecord>("/api/employee/update", input);
        },
        async deleteEmployee(id: number, departReason?: string): Promise<ApiSuccess<void>> {
            return client.post<void>("/api/employee/delete", { id, departReason });
        },
        async listEmployees(query?: PaginationParams): Promise<Paginated<EmployeeRecord>> {
            return client.list<EmployeeRecord>("/api/employee/get-all", query);
        },
        async listPositions(): Promise<Paginated<PositionRecord>> {
            return client.list<PositionRecord>("/api/position/get-all");
        },

        // Attendance API
        async listAttendance(query?: { employeeId?: number; date?: string; status?: string; limit?: number; page?: number }): Promise<Paginated<AttendanceRecord>> {
            return client.list<AttendanceRecord>("/api/attendance/get-all", query);
        },
        async clockIn(input: ClockInInput): Promise<ApiSuccess<AttendanceRecord>> {
            return client.post<AttendanceRecord>("/api/attendance/clock-in", input);
        },
        async clockOut(input: ClockOutInput): Promise<ApiSuccess<AttendanceRecord>> {
            return client.post<AttendanceRecord>("/api/attendance/clock-out", input);
        },
        async createAttendance(input: CreateAttendanceInput): Promise<ApiSuccess<AttendanceRecord>> {
            return client.post<AttendanceRecord>("/api/attendance/create", input);
        },
        async updateAttendance(input: UpdateAttendanceInput): Promise<ApiSuccess<AttendanceRecord>> {
            return client.post<AttendanceRecord>("/api/attendance/update", input);
        },
        async deleteAttendance(id: number): Promise<ApiSuccess<void>> {
            return client.post<void>("/api/attendance/delete", { id });
        },

        // Payroll / Salary Records API
        async listSalaryRecords(query?: { employeeId?: number; limit?: number; page?: number }): Promise<Paginated<SalaryRecordItem>> {
            return client.list<SalaryRecordItem>("/api/salary-record/get-all", query);
        },
        async getSalaryRecord(id: number): Promise<ApiSuccess<{ salaryRecord: SalaryRecordItem }>> {
            return client.post<{ salaryRecord: SalaryRecordItem }>("/api/salary-record/get", { id });
        },
    };
}

