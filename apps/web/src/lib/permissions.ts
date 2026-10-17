import type { SessionUser } from "@pz/shared";

export interface DashboardModule {
  id: string;
  label: string;
  shortLabel: string;
  href: string;
  icon: string;
  exact?: boolean;
  category: "General" | "Sales & Retail" | "Operations" | "People & Entities" | "Administration";
  description: string;
  badge?: string;
  isAuthorized: (user: SessionUser | null | undefined, canAccess: (table: string, action: string) => boolean) => boolean;
}

export const ALL_DASHBOARD_MODULES: DashboardModule[] = [
  {
    id: "dashboard",
    label: "Dashboard Overview",
    shortLabel: "Home",
    href: "/",
    icon: "🏠",
    exact: true,
    category: "General",
    description: "System overview, authorized module launchpad, and daily activity metrics.",
    isAuthorized: () => true, // Accessible to all authenticated users
  },
  {
    id: "pos",
    label: "Point of Sale",
    shortLabel: "POS",
    href: "/pos",
    icon: "🛒",
    exact: true,
    category: "Sales & Retail",
    description: "Process retail checkout, manage active cart items, and register customer sales.",
    isAuthorized: (u, can) =>
      Boolean(u?.isSuperAdmin || can("pos", "*") || can("pos", "create") || can("sales-order", "create") || can("sales-order", "*") || can("sales-order", "report") || can("sales-order", "summary")),
  },
  {
    id: "orders",
    label: "Orders History",
    shortLabel: "Orders",
    href: "/pos/orders",
    icon: "📋",
    category: "Sales & Retail",
    description: "Browse completed sales orders, review transaction status, and check receipts.",
    isAuthorized: (u, can) =>
      Boolean(u?.isSuperAdmin || can("sales-order", "all") || can("sales-order", "get") || can("sales-order", "list") || can("sales-order", "get-all") || can("sales-order", "*") || can("pos", "*")),
  },
  {
    id: "reports",
    label: "Reports & Analytics",
    shortLabel: "Reports",
    href: "/report",
    icon: "📊",
    category: "Operations",
    description: "Central reporting hub: sales performance, payroll compensation, equipment fleet, product stock levels, and facility opname.",
    isAuthorized: (u, can) =>
      Boolean(
        u?.isSuperAdmin ||
        can("pos", "report") ||
        can("pos", "summary") ||
        can("pos", "*") ||
        can("sales-order", "*") ||
        can("salary-record", "*") ||
        can("payroll-period", "*") ||
        can("equipment", "*") ||
        can("product", "*")
      ),
  },
  {
    id: "products",
    label: "Products Catalog",
    shortLabel: "Products",
    href: "/products",
    icon: "📦",
    category: "Operations",
    description: "Manage product SKUs, retail pricing, categories, and inventory items.",
    isAuthorized: (u, can) =>
      Boolean(u?.isSuperAdmin || can("product", "get") || can("product", "get-all") || can("product", "read") || can("product", "*")),
  },
  {
    id: "recipes",
    label: "Formulas",
    shortLabel: "Formulas",
    href: "/recipes",
    icon: "🧪",
    category: "Operations",
    description: "Manage formulas, ingredients bill of materials, and automated recursive stock deduction.",
    isAuthorized: (u, can) =>
      Boolean(
        u?.isSuperAdmin ||
        can("product", "get") ||
        can("product", "get-all") ||
        can("product", "*") ||
        can("product-recipe", "*") ||
        can("recipe", "*")
      ),
  },
  {
    id: "inventory",
    label: "Inventory",
    shortLabel: "Inventory",
    href: "/inventory",
    icon: "📊",
    category: "Operations",
    description: "Real-time stock ledger, stock level alerts, and inventory adjustments (IN, OUT, AUDIT).",
    isAuthorized: (u, can) =>
      Boolean(
        u?.isSuperAdmin ||
        can("product", "inventory") ||
        can("product", "get-all") ||
        can("product", "*") ||
        can("item", "*")
      ),
  },
  {
    id: "facilities",
    label: "Facilities",
    shortLabel: "Facilities",
    href: "/facilities",
    icon: "🏬",
    category: "Operations",
    description: "Manage physical store outlets, warehouses, regional depots, and storage section divisions.",
    isAuthorized: (u, can) =>
      Boolean(
        u?.isSuperAdmin ||
        can("facility", "get") ||
        can("facility", "get-all") ||
        can("facility", "*") ||
        can("product", "inventory")
      ),
  },

  {
    id: "equipment",
    label: "Equipments",
    shortLabel: "Equipment",
    href: "/equipment",
    icon: "🚜",
    category: "Operations",
    description: "Machinery, tools, fleet equipment tracking, asset valuation, and maintenance schedules.",
    isAuthorized: (u, can) =>
      Boolean(
        u?.isSuperAdmin ||
        can("equipment", "get") ||
        can("equipment", "get-all") ||
        can("equipment", "*") ||
        can("equipment-brand", "*") ||
        can("equipment-model", "*") ||
        can("equipment-type", "*")
      ),
  },
  {
    id: "purchase-orders",
    label: "Purchase Orders",
    shortLabel: "Procurement",
    href: "/procurement/orders",
    icon: "📑",
    category: "Operations",
    description: "Manage vendor purchase orders, procurement commitments, and supplier deliveries.",
    isAuthorized: (u, can) =>
      Boolean(
        u?.isSuperAdmin ||
        can("purchase-order", "get") ||
        can("purchase-order", "get-all") ||
        can("purchase-order", "*") ||
        can("rfq", "*")
      ),
  },
  {
    id: "persons",
    label: "Persons & Profiles",
    shortLabel: "Persons",
    href: "/persons",
    icon: "🪪",
    category: "People & Entities",
    description: "Master identity directory of individuals and business entities across the platform.",
    isAuthorized: (u, can) =>
      Boolean(
        u?.isSuperAdmin ||
        can("profile", "read") ||
        can("profile", "get-all") ||
        can("profile", "get") ||
        can("profile", "*") ||
        can("customer", "*") ||
        can("employee", "*") ||
        can("user", "*")
      ),
  },
  {
    id: "customers",
    label: "Customers",
    shortLabel: "Customers",
    href: "/customers",
    icon: "👥",
    category: "People & Entities",
    description: "Maintain client profiles, loyalty tiers, address records, and customer groups.",
    isAuthorized: (u, can) =>
      Boolean(u?.isSuperAdmin || can("customer", "read") || can("customer", "get-all") || can("customer", "get") || can("customer", "*")),
  },
  {
    id: "employees",
    label: "Employees",
    shortLabel: "Employees",
    href: "/employees",
    icon: "👔",
    category: "People & Entities",
    description: "Staff directory, internal positions, contact channels, and employment records.",
    isAuthorized: (u, can) =>
      Boolean(u?.isSuperAdmin || can("employee", "read") || can("employee", "get-all") || can("employee", "get") || can("employee", "*")),
  },
  {
    id: "payroll",
    label: "Payroll Management",
    shortLabel: "Payroll",
    href: "/payroll",
    icon: "💵",
    category: "People & Entities",
    description: "Employee salary structure, compensation components, payroll periods, and payslip generation.",
    isAuthorized: (u, can) =>
      Boolean(
        u?.isSuperAdmin ||
        can("salary-record", "*") ||
        can("payroll-period", "*") ||
        can("payroll-component", "*") ||
        can("employee", "*")
      ),
  },
  {
    id: "vendors",
    label: "Vendors",
    shortLabel: "Vendors",
    href: "/vendors",
    icon: "🏢",
    category: "People & Entities",
    description: "Supply chain partners, procurement contacts, and supplier profile identities.",
    isAuthorized: (u, can) =>
      Boolean(u?.isSuperAdmin || can("vendor", "read") || can("vendor", "get-all") || can("vendor", "get") || can("vendor", "*")),
  },
  {
    id: "roles",
    label: "Role Management",
    shortLabel: "Roles",
    href: "/roles",
    icon: "🛡️",
    category: "Administration",
    description: "Define granular security profiles, table privileges, and RBAC permission sets.",
    badge: "Admin",
    isAuthorized: (u, can) =>
      Boolean(u?.isSuperAdmin || can("role", "get-all") || can("role", "get") || can("role", "*")),
  },
  {
    id: "users",
    label: "User Management",
    shortLabel: "Users",
    href: "/users",
    icon: "👤",
    category: "Administration",
    description: "Manage organizational user credentials, role assignments, and profile links.",
    badge: "Admin",
    isAuthorized: (u, can) =>
      Boolean(u?.isSuperAdmin || can("user", "get-all") || can("user", "get") || can("user", "*")),
  },
];
