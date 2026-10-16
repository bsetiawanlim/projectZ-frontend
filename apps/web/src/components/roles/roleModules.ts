export interface RoleModuleDefinition {
  table: string;
  label: string;
  category: string;
  actions: string[];
}

export const ALL_ROLE_MODULES: RoleModuleDefinition[] = [
  // POS & Sales
  {
    table: 'sales-order',
    label: 'POS Sales Orders',
    category: 'POS & Sales',
    actions: ['create', 'get', 'all', 'update', 'delete', 'complete', 'void', 'refund', 'summary', 'report'],
  },
  {
    table: 'sales-order-item',
    label: 'Sales Order Items',
    category: 'POS & Sales',
    actions: ['create', 'get', 'list', 'update', 'delete'],
  },
  {
    table: 'sales-payment',
    label: 'Sales Payments',
    category: 'POS & Sales',
    actions: ['create', 'get', 'list', 'update', 'delete'],
  },

  // Products & Inventory
  {
    table: 'product',
    label: 'Product Catalog',
    category: 'Inventory & Catalog',
    actions: ['create', 'get', 'get-all', 'update', 'delete', 'price', 'inventory', 'image', 'attribute', 'attribute-value', 'waste'],
  },
  {
    table: 'product-category',
    label: 'Product Categories',
    category: 'Inventory & Catalog',
    actions: ['create', 'get', 'get-all', 'update', 'delete'],
  },
  {
    table: 'product-recipe',
    label: 'Product Recipe / Bill of Materials',
    category: 'Inventory & Catalog',
    actions: ['create', 'delete', 'get-all', 'set', 'update'],
  },
  {
    table: 'production-batch',
    label: 'Production Batches',
    category: 'Inventory & Catalog',
    actions: ['cancel', 'create', 'get-all', 'preview'],
  },
  {
    table: 'facility',
    label: 'Facilities & Locations',
    category: 'Inventory & Catalog',
    actions: ['create', 'get', 'get-all', 'update', 'delete'],
  },
  {
    table: 'facility-section',
    label: 'Facility Sections',
    category: 'Inventory & Catalog',
    actions: ['create', 'get', 'get-by-facility', 'update', 'delete'],
  },

  // People & Associates
  {
    table: 'user',
    label: 'User Accounts',
    category: 'People & Associates',
    actions: ['create', 'read', 'get', 'get-all', 'update', 'toggle-status', 'delete', 'check-delete'],
  },
  {
    table: 'profile',
    label: 'User Profiles',
    category: 'People & Associates',
    actions: ['create', 'get-me', 'get-id', 'get-all', 'update', 'update-me', 'delete', 'grant-superuser', 'revoke-superuser', 'associate-user'],
  },
  {
    table: 'profileContact',
    label: 'Profile Contacts',
    category: 'People & Associates',
    actions: ['create', 'read', 'get', 'getContacts', 'update', 'delete'],
  },
  {
    table: 'profileDocument',
    label: 'Profile Documents',
    category: 'People & Associates',
    actions: ['create', 'get', 'update', 'delete'],
  },
  {
    table: 'profileSocialMedia',
    label: 'Profile Social Media',
    category: 'People & Associates',
    actions: ['create', 'get', 'update', 'delete'],
  },
  {
    table: 'customer',
    label: 'Customers',
    category: 'People & Associates',
    actions: ['create', 'read', 'get-all', 'update', 'restore', 'delete'],
  },
  {
    table: 'vendor',
    label: 'Vendors',
    category: 'People & Associates',
    actions: ['create', 'read', 'get-all', 'update', 'restore', 'delete'],
  },
  {
    table: 'vendor-product',
    label: 'Vendor Products',
    category: 'People & Associates',
    actions: ['create', 'get', 'get-all', 'update', 'delete'],
  },
  {
    table: 'employee',
    label: 'Employees & Staff',
    category: 'People & Associates',
    actions: ['create', 'read', 'get-all', 'update', 'delete'],
  },
  {
    table: 'position',
    label: 'Employee Positions & Titles',
    category: 'People & Associates',
    actions: ['create', 'get-all', 'update', 'delete'],
  },

  // Finance & Payroll
  {
    table: 'monetaryAccount',
    label: 'Bank & Cash Accounts',
    category: 'Finance & Payroll',
    actions: ['*', 'create', 'get-all', 'get-by-profile', 'update'],
  },
  {
    table: 'monetaryTransaction',
    label: 'Financial Transactions',
    category: 'Finance & Payroll',
    actions: ['create', 'get-all', 'get-by-account', 'update', 'delete'],
  },
  {
    table: 'payroll-period',
    label: 'Payroll Periods',
    category: 'Finance & Payroll',
    actions: ['create', 'get', 'get-all', 'update', 'delete'],
  },
  {
    table: 'payroll-component',
    label: 'Salary & Benefit Components',
    category: 'Finance & Payroll',
    actions: ['create', 'get', 'get-all', 'update', 'delete'],
  },
  {
    table: 'salary-record',
    label: 'Salary Records & Payslips',
    category: 'Finance & Payroll',
    actions: ['generate', 'get', 'get-all', 'get-by-period', 'update', 'delete'],
  },

  // Procurement
  {
    table: 'rfq',
    label: 'Requests for Quotation (RFQ)',
    category: 'Procurement',
    actions: ['create', 'create-with-products', 'get', 'get-all', 'product', 'update', 'delete'],
  },
  {
    table: 'rfqProduct',
    label: 'RFQ Products',
    category: 'Procurement',
    actions: ['create', 'get', 'get-all', 'product', 'update', 'delete'],
  },
  {
    table: 'purchase-order',
    label: 'Purchase Orders (PO)',
    category: 'Procurement',
    actions: ['create', 'get', 'get-all', 'product', 'update', 'delete'],
  },
  {
    table: 'request',
    label: 'Internal Purchase Requests',
    category: 'Procurement',
    actions: ['create', 'get', 'get-all', 'product', 'source', 'update', 'delete'],
  },

  // Transport & Fleet
  {
    table: 'vehicle',
    label: 'Fleet Vehicles',
    category: 'Transport & Fleet',
    actions: ['create', 'get', 'get-all', 'update', 'delete'],
  },
  {
    table: 'driver',
    label: 'Fleet Drivers',
    category: 'Transport & Fleet',
    actions: ['create', 'get', 'get-all', 'update', 'delete'],
  },
  {
    table: 'trip',
    label: 'Logistics Trips',
    category: 'Transport & Fleet',
    actions: ['create', 'get', 'get-all', 'update', 'delete'],
  },
  {
    table: 'fuel-log',
    label: 'Fuel Logs',
    category: 'Transport & Fleet',
    actions: ['create', 'get', 'get-all', 'update', 'delete'],
  },

  // Equipments
  {
    table: 'equipment',
    label: 'Heavy & Operational Equipment',
    category: 'Equipments',
    actions: ['create', 'get', 'get-all', 'update', 'delete'],
  },
  {
    table: 'equipment-type',
    label: 'Equipment Types',
    category: 'Equipments',
    actions: ['create', 'get', 'get-all', 'update', 'delete'],
  },
  {
    table: 'equipment-brand',
    label: 'Equipment Brands',
    category: 'Equipments',
    actions: ['create', 'get', 'get-all', 'update', 'delete'],
  },
  {
    table: 'equipment-model',
    label: 'Equipment Models',
    category: 'Equipments',
    actions: ['create', 'get', 'get-all', 'get-by-type', 'update', 'delete'],
  },
  {
    table: 'equipment-feature',
    label: 'Equipment Features',
    category: 'Equipments',
    actions: ['create', 'get', 'get-by-entity', 'update', 'delete'],
  },
  {
    table: 'equipment-model-feature',
    label: 'Equipment Model Features',
    category: 'Equipments',
    actions: ['create', 'get', 'get-by-model', 'update', 'delete'],
  },
  {
    table: 'equipment-part',
    label: 'Equipment Spare Parts',
    category: 'Equipments',
    actions: ['create', 'get', 'get-all', 'get-by-model', 'update', 'delete'],
  },
  {
    table: 'equipment-price',
    label: 'Equipment Rental Rates',
    category: 'Equipments',
    actions: ['create', 'get', 'by-equipment', 'update', 'delete'],
  },
  {
    table: 'equipment-maintenance',
    label: 'Equipment Maintenance Logs',
    category: 'Equipments',
    actions: ['create', 'get', 'get-by-entity', 'update', 'delete'],
  },

  // Work & Projects
  {
    table: 'work',
    label: 'Project Contracts / BOQ',
    category: 'Work & Projects',
    actions: ['create', 'get', 'get-all', 'update', 'delete'],
  },
  {
    table: 'work-item',
    label: 'Work Project Items',
    category: 'Work & Projects',
    actions: ['create', 'get', 'get-by-work', 'update', 'delete'],
  },
  {
    table: 'work-worker',
    label: 'Work Labor Assignments',
    category: 'Work & Projects',
    actions: ['create', 'get', 'get-all', 'get-by-work', 'update', 'delete'],
  },
  {
    table: 'work-equipment',
    label: 'Work Equipment Allocations',
    category: 'Work & Projects',
    actions: ['create', 'get', 'get-all', 'get-by-work', 'update', 'delete'],
  },
  {
    table: 'work-offer',
    label: 'Project Bids & Offers',
    category: 'Work & Projects',
    actions: ['create', 'get', 'get-all', 'update', 'delete'],
  },
  {
    table: 'work-offer-item',
    label: 'Project Bid Line Items',
    category: 'Work & Projects',
    actions: ['create', 'get', 'get-all', 'get-by-offer', 'update', 'delete'],
  },
  {
    table: 'item',
    label: 'Bill of Materials Items',
    category: 'Work & Projects',
    actions: ['add', 'get', 'get-all', 'get-by-product', 'update', 'delete'],
  },
  {
    table: 'worker',
    label: 'Field Labor Personnel',
    category: 'Work & Projects',
    actions: ['add', 'get', 'get-all', 'update', 'delete'],
  },
  {
    table: 'task',
    label: 'Operational Tasks',
    category: 'Work & Projects',
    actions: ['create', 'get', 'get-all', 'update', 'delete'],
  },

  // Security & RBAC
  {
    table: 'role',
    label: 'Roles & RBAC',
    category: 'Security & RBAC',
    actions: ['create', 'get', 'get-id', 'get-all', 'update', 'delete'],
  },
  {
    table: 'permission',
    label: 'System Permissions Matrix',
    category: 'Security & RBAC',
    actions: ['create', 'read', 'update', 'delete'],
  },
  {
    table: 'auth',
    label: 'Authentication & Tokens',
    category: 'Security & RBAC',
    actions: ['*', 'sign-up'],
  },
  {
    table: 'session',
    label: 'User Active Sessions',
    category: 'Security & RBAC',
    actions: ['create', 'read', 'update', 'delete'],
  },
  {
    table: 'unit',
    label: 'Measurement Units',
    category: 'Inventory & Catalog',
    actions: ['create', 'convert', 'get-by-quantity', 'update'],
  },
];
