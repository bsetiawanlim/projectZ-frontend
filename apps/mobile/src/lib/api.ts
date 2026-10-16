import {
  createApiClient,
  createAuthApi,
  createPosApi,
  createProductApi,
  createCustomerApi,
  type TokenStorage,
} from "@pz/shared";

// In Android emulator, 10.0.2.2 maps to host machine localhost:3000
const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || "http://10.0.2.2:3000";

let inMemoryToken: string | null = null;

export const tokenStorage: TokenStorage = {
  get: () => inMemoryToken,
  set: (token) => {
    inMemoryToken = token;
  },
};

export const apiClient = createApiClient({
  baseUrl: API_BASE_URL,
  withCredentials: true,
  tokenStorage,
});

export const authApi = createAuthApi(apiClient);
export const posApi = createPosApi(apiClient);
export const productApi = createProductApi(apiClient);
export const customerApi = createCustomerApi(apiClient);
