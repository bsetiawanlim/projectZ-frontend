import {
  createApiClient,
  createAuthApi,
  createPosApi,
  createProductApi,
  createCustomerApi,
  createEmployeeApi,
  createRoleApi,
  createProfileApi,
  createVendorApi,
  createUserApi,
  createEquipmentApi,
  createOrderApi,
  createPayrollApi,
  createFacilityApi,
} from "@pz/shared";

const API_BASE_URL =
  (typeof window !== "undefined" && window.location.hostname)
    ? `${window.location.protocol}//${window.location.hostname}:3000`
    : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000");

export const apiClient = createApiClient({
  baseUrl: API_BASE_URL,
  withCredentials: true, // Use Better Auth session cookies
  onUnauthorized: () => {
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
  },
});

export const authApi = createAuthApi(apiClient);
export const posApi = createPosApi(apiClient);
export const productApi = createProductApi(apiClient);
export const customerApi = createCustomerApi(apiClient);
export const employeeApi = createEmployeeApi(apiClient);
export const roleApi = createRoleApi(apiClient);
export const profileApi = createProfileApi(apiClient);
export const vendorApi = createVendorApi(apiClient);
export const userApi = createUserApi(apiClient);
export const equipmentApi = createEquipmentApi(apiClient);
export const orderApi = createOrderApi(apiClient);
export const payrollApi = createPayrollApi(apiClient);
export const facilityApi = createFacilityApi(apiClient);

export type {
  RoleRecord,
  ProtoPermission,
  CreateRoleInput,
  UpdateRoleInput,
  UserRecord,
  CreateUserInput,
  UpdateUserInput,
  CheckUserDeleteResult,
  EquipmentEntityRecord,
  CreateEquipmentEntityInput,
  UpdateEquipmentEntityInput,
  EquipmentBrandRecord,
  EquipmentModelRecord,
  EquipmentTypeRecord,
  PurchaseOrderRecord,
  CreatePurchaseOrderInput,
  UpdatePurchaseOrderInput,
  RfqRecord,
  VendorProductRecord,
  CreateVendorProductInput,
  UpdateVendorProductInput,
  VendorRecord,
  CustomerRecord,
  EmployeeRecord,
  PositionRecord,
  FacilityType,
  FacilitySectionType,
  FacilityRecord,
  FacilitySectionRecord,
  CreateFacilityInput,
  UpdateFacilityInput,
  CreateFacilitySectionInput,
  UpdateFacilitySectionInput,
} from "@pz/shared";


