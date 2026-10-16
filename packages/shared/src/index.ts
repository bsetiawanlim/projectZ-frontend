// Core API
export * from "./api/types";
export * from "./api/client";

// Auth & Permissions
export * from "./auth/authApi";
export * from "./auth/permissions";

// Product Domain
export * from "./product/schemas";
export * from "./product/productApi";

// POS Domain
export * from "./pos/calculation";
export * from "./pos/schemas";
export * from "./pos/posApi";
export * from "./pos/cartStore";

// Customer Domain
export * from "./customer/schemas";
export * from "./customer/customerApi";

// Employee Domain
export * from "./employee/schemas";
export * from "./employee/employeeApi";

// Role Domain
export * from "./role/schemas";
export * from "./role/roleApi";
export type {
  ProtoPermission,
  CreateRoleInput,
  UpdateRoleInput,
  DeleteRoleInput,
  RolePermissionItem,
  RoleRecord,
} from "./role/schemas";

// Profile Domain
export * from "./profile/schemas";
export { formatAddress } from "./profile/schemas";
export * from "./profile/profileApi";

// Vendor Domain
export * from "./vendor/schemas";
export * from "./vendor/vendorApi";

// User Domain
export * from "./user/types";
export * from "./user/userApi";

// Equipment Domain
export * from "./equipment/schemas";
export * from "./equipment/equipmentApi";

// Order Domain (Procurement & Purchase Orders)
export * from "./order/schemas";
export * from "./order/orderApi";

// Payroll Domain
export * from "./payroll/schemas";
export * from "./payroll/payrollApi";
export * from "./payroll/calculation";

// Utils
export * from "./utils/money";


// Facility & Warehouse Domain
export * from "./facility/schemas";
export * from "./facility/facilityApi";

export * from "./i18n";
