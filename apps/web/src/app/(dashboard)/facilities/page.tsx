"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";
import { useAuth } from "@/lib/authContext";
import { facilityApi, employeeApi, productApi, equipmentApi } from "@/lib/api";
import QRCode from "qrcode";
import type { EmployeeRecord, ProductItem, EquipmentEntityRecord } from "@pz/shared";
import type {
  FacilityRecord,
  FacilitySectionRecord,
  FacilityType,
  FacilitySectionType,
  CreateFacilityInput,
  UpdateFacilityInput,
  CreateFacilitySectionInput,
  FacilityEmployeeRecord,
  FacilityProductRecord,
  FacilityEquipmentRecord,
  FacilityTableRecord,
  CreateFacilityTableInput,
  UpdateFacilityTableInput,
} from "@/lib/api";

const FACILITY_TYPES: Array<{ value: FacilityType; label: string; icon: string }> = [
  { value: "WAREHOUSE", label: "Warehouse & Depot", icon: "🏭" },
  { value: "STORE", label: "Store / POS Outlet", icon: "🏪" },
  { value: "OFFICE", label: "Office & Branch", icon: "🏢" },
  { value: "FACTORY", label: "Kitchen / Factory", icon: "🏗️" },
  { value: "OTHER", label: "Other Location", icon: "📍" },
];

const SECTION_TYPES: Array<{ value: FacilitySectionType; label: string }> = [
  { value: "ZONE", label: "Zone / Floor" },
  { value: "AISLE", label: "Storage Aisle" },
  { value: "RACK", label: "Rack / Shelf" },
  { value: "ROOM", label: "Cold / Dry Room" },
  { value: "COUNTER", label: "POS Checkout Counter" },
  { value: "DISPLAY", label: "Sales Display" },
  { value: "STAGING", label: "Dispatch / Loading Bay" },
  { value: "OTHER", label: "Other Section" },
];

export default function FacilitiesPage() {
  const { user, canAccess } = useAuth();
  const [facilities, setFacilities] = useState<FacilityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<FacilityType | "ALL">("ALL");
  const [selectedStatus, setSelectedStatus] = useState<"ALL" | "ACTIVE" | "DEACTIVATED">("ALL");

  // Active facility drawer / sections modal
  const [activeFacility, setActiveFacility] = useState<FacilityRecord | null>(null);
  const [sections, setSections] = useState<FacilitySectionRecord[]>([]);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [activeFacilityTab, setActiveFacilityTab] = useState<"sections" | "staff" | "products" | "equipment" | "tables">("sections");

  // Tables Management (Dining / Cafe / Seating)
  const [facilityTables, setFacilityTables] = useState<FacilityTableRecord[]>([]);
  const [facilityTablesLoading, setFacilityTablesLoading] = useState(false);
  const [tableSearch, setTableSearch] = useState("");
  const [tableStatusFilter, setTableStatusFilter] = useState<"ALL" | "AVAILABLE" | "OCCUPIED" | "RESERVED" | "OUT_OF_SERVICE">("ALL");

  const [isAddTableModalOpen, setIsAddTableModalOpen] = useState(false);
  const [newTableNumber, setNewTableNumber] = useState("");
  const [newTableLabel, setNewTableLabel] = useState("");
  const [newTableSectionId, setNewTableSectionId] = useState<number | "">("");
  const [newTableCapacity, setNewTableCapacity] = useState<number>(4);
  const [newTableStatus, setNewTableStatus] = useState<string>("AVAILABLE");
  const [newTableNotes, setNewTableNotes] = useState("");
  const [savingTable, setSavingTable] = useState(false);
  const [tableError, setTableError] = useState<string | null>(null);

  const [isEditTableModalOpen, setIsEditTableModalOpen] = useState(false);
  const [editingTableRecord, setEditingTableRecord] = useState<FacilityTableRecord | null>(null);
  const [editingTableNumber, setEditingTableNumber] = useState("");
  const [editingTableLabel, setEditingTableLabel] = useState("");
  const [editingTableSectionId, setEditingTableSectionId] = useState<number | "">("");
  const [editingTableCapacity, setEditingTableCapacity] = useState<number>(4);
  const [editingTableStatus, setEditingTableStatus] = useState<string>("AVAILABLE");
  const [editingTableIsActive, setEditingTableIsActive] = useState(true);
  const [editingTableNotes, setEditingTableNotes] = useState("");
  const [savingEditTable, setSavingEditTable] = useState(false);
  const [editTableError, setEditTableError] = useState<string | null>(null);

  const [qrModalTable, setQrModalTable] = useState<FacilityTableRecord | null>(null);
  const [qrModalDataUrl, setQrModalDataUrl] = useState<string | null>(null);
  const [generatingQr, setGeneratingQr] = useState(false);

  // Conjunction 1: Staff (facilityEmployee)
  const [facilityEmployees, setFacilityEmployees] = useState<FacilityEmployeeRecord[]>([]);
  const [allEmployees, setAllEmployees] = useState<EmployeeRecord[]>([]);
  const [facilityEmployeesLoading, setFacilityEmployeesLoading] = useState(false);
  const [isAssignStaffModalOpen, setIsAssignStaffModalOpen] = useState(false);
  const [selectedStaffToAssign, setSelectedStaffToAssign] = useState<number | "">("");
  const [staffAssignmentRole, setStaffAssignmentRole] = useState("");
  const [staffIsPrimary, setStaffIsPrimary] = useState(false);
  const [staffNotes, setStaffNotes] = useState("");
  const [assigningStaff, setAssigningStaff] = useState(false);
  const [assignStaffError, setAssignStaffError] = useState<string | null>(null);

  const [isEditStaffModalOpen, setIsEditStaffModalOpen] = useState(false);
  const [editingStaffRecord, setEditingStaffRecord] = useState<FacilityEmployeeRecord | null>(null);
  const [editingStaffRole, setEditingStaffRole] = useState("");
  const [editingStaffIsPrimary, setEditingStaffIsPrimary] = useState(false);
  const [editingStaffNotes, setEditingStaffNotes] = useState("");
  const [savingStaffAssignment, setSavingStaffAssignment] = useState(false);
  const [editStaffError, setEditStaffError] = useState<string | null>(null);

  // Conjunction 2: Products (facilityProduct)
  const [facilityProducts, setFacilityProducts] = useState<FacilityProductRecord[]>([]);
  const [allCatalogProducts, setAllCatalogProducts] = useState<ProductItem[]>([]);
  const [facilityProductsLoading, setFacilityProductsLoading] = useState(false);
  const [productFilterMode, setProductFilterMode] = useState<"ALL" | "TRADEABLE" | "INTERNAL">("ALL");
  const [productSearch, setProductSearch] = useState("");

  const [isAssignProductModalOpen, setIsAssignProductModalOpen] = useState(false);
  const [selectedProductToAssign, setSelectedProductToAssign] = useState<number | "">("");
  const [productIsTradeable, setProductIsTradeable] = useState(true);
  const [productMinStock, setProductMinStock] = useState<string>("");
  const [productMaxStock, setProductMaxStock] = useState<string>("");
  const [productNotes, setProductNotes] = useState("");
  const [assigningProduct, setAssigningProduct] = useState(false);
  const [assignProductError, setAssignProductError] = useState<string | null>(null);

  const [isEditProductModalOpen, setIsEditProductModalOpen] = useState(false);
  const [editingProductRecord, setEditingProductRecord] = useState<FacilityProductRecord | null>(null);
  const [editingProductIsTradeable, setEditingProductIsTradeable] = useState(true);
  const [editingProductMinStock, setEditingProductMinStock] = useState<string>("");
  const [editingProductMaxStock, setEditingProductMaxStock] = useState<string>("");
  const [editingProductIsActive, setEditingProductIsActive] = useState(true);
  const [editingProductNotes, setEditingProductNotes] = useState("");
  const [savingProduct, setSavingProduct] = useState(false);
  const [editProductError, setEditProductError] = useState<string | null>(null);
  const [togglingProductId, setTogglingProductId] = useState<number | null>(null);

  // Conjunction 3: Equipment (facilityEquipment)
  const [facilityEquipments, setFacilityEquipments] = useState<FacilityEquipmentRecord[]>([]);
  const [allEquipmentEntities, setAllEquipmentEntities] = useState<EquipmentEntityRecord[]>([]);
  const [facilityEquipmentsLoading, setFacilityEquipmentsLoading] = useState(false);
  const [equipmentSearch, setEquipmentSearch] = useState("");

  const [isAssignEquipmentModalOpen, setIsAssignEquipmentModalOpen] = useState(false);
  const [selectedEquipmentToAssign, setSelectedEquipmentToAssign] = useState<number | "">("");
  const [selectedEquipmentSectionId, setSelectedEquipmentSectionId] = useState<number | "">("");
  const [equipmentStatus, setEquipmentStatus] = useState<string>("ACTIVE");
  const [equipmentQuantity, setEquipmentQuantity] = useState<number>(1);
  const [equipmentNotes, setEquipmentNotes] = useState("");
  const [assigningEquipment, setAssigningEquipment] = useState(false);
  const [assignEquipmentError, setAssignEquipmentError] = useState<string | null>(null);

  const [isEditEquipmentModalOpen, setIsEditEquipmentModalOpen] = useState(false);
  const [editingEquipmentRecord, setEditingEquipmentRecord] = useState<FacilityEquipmentRecord | null>(null);
  const [editingEquipmentSectionId, setEditingEquipmentSectionId] = useState<number | "">("");
  const [editingEquipmentStatus, setEditingEquipmentStatus] = useState<string>("ACTIVE");
  const [editingEquipmentQuantity, setEditingEquipmentQuantity] = useState<number>(1);
  const [editingEquipmentIsActive, setEditingEquipmentIsActive] = useState(true);
  const [editingEquipmentNotes, setEditingEquipmentNotes] = useState("");
  const [savingEquipment, setSavingEquipment] = useState(false);
  const [editEquipmentError, setEditEquipmentError] = useState<string | null>(null);

  // Status toggle state
  const [togglingFacilityId, setTogglingFacilityId] = useState<number | null>(null);

  // Add Facility Modal
  const [isAddFacilityOpen, setIsAddFacilityOpen] = useState(false);
  const [newFacility, setNewFacility] = useState<CreateFacilityInput>({
    facilityCode: "",
    facilityName: "",
    type: "WAREHOUSE",
    city: "",
    province: "",
    address: "",
    phoneNumber: "",
    isActive: true,
  });
  const [savingFacility, setSavingFacility] = useState(false);
  const [facilityError, setFacilityError] = useState<string | null>(null);

  // Edit Facility Modal
  const [isEditFacilityOpen, setIsEditFacilityOpen] = useState(false);
  const [editingFacility, setEditingFacility] = useState<UpdateFacilityInput | null>(null);
  const [savingEditFacility, setSavingEditFacility] = useState(false);
  const [editFacilityError, setEditFacilityError] = useState<string | null>(null);

  // Delete Facility Modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [facilityToDelete, setFacilityToDelete] = useState<FacilityRecord | null>(null);
  const [deletingFacility, setDeletingFacility] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Add Section Modal
  const [isAddSectionOpen, setIsAddSectionOpen] = useState(false);
  const [newSection, setNewSection] = useState<Partial<CreateFacilitySectionInput>>({
    sectionCode: "",
    sectionName: "",
    type: "ZONE",
    description: "",
    isActive: true,
  });
  const [savingSection, setSavingSection] = useState(false);
  const [sectionError, setSectionError] = useState<string | null>(null);

  // Delete Section State
  const [deletingSectionId, setDeletingSectionId] = useState<number | null>(null);

  const canManage = Boolean(
    user?.isSuperAdmin ||
      canAccess("facility", "create") ||
      canAccess("facility", "update") ||
      canAccess("facility", "delete") ||
      canAccess("facility", "*")
  );

  const loadFacilities = useCallback(async () => {
    setLoading(true);
    try {
      const res = await facilityApi.getFacilities({ limit: 100 });
      const items = res?.items ?? (res as any)?.data ?? (Array.isArray(res) ? res : []);
      setFacilities(items);
    } catch (err: any) {
      console.error("Failed to load facilities:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFacilities();
  }, [loadFacilities]);

  const loadFacilityEmployees = async (facilityId: number) => {
    setFacilityEmployeesLoading(true);
    try {
      const [facEmpRes, allEmpRes] = await Promise.all([
        facilityApi.getEmployeesByFacility(facilityId),
        employeeApi.listEmployees({ limit: 200 }),
      ]);
      const facItems = (facEmpRes as any)?.data ?? (Array.isArray(facEmpRes) ? facEmpRes : []);
      const allItems = Array.isArray(allEmpRes) ? allEmpRes : (allEmpRes as any).items || (allEmpRes as any).data || [];
      setFacilityEmployees(facItems);
      setAllEmployees(allItems);
    } catch (err) {
      console.error("Failed to load facility employees:", err);
    } finally {
      setFacilityEmployeesLoading(false);
    }
  };

  const loadFacilityProducts = async (facilityId: number) => {
    setFacilityProductsLoading(true);
    try {
      const [facProdRes, allProdRes] = await Promise.all([
        facilityApi.getProductsByFacility(facilityId),
        productApi.getProducts({ limit: 200 }),
      ]);
      const items = (facProdRes as any)?.data ?? (Array.isArray(facProdRes) ? facProdRes : []);
      const allItems = (allProdRes as any)?.data ?? (Array.isArray(allProdRes) ? allProdRes : []);
      setFacilityProducts(items);
      setAllCatalogProducts(allItems);
    } catch (err) {
      console.error("Failed to load facility products:", err);
    } finally {
      setFacilityProductsLoading(false);
    }
  };

  const loadFacilityEquipments = async (facilityId: number) => {
    setFacilityEquipmentsLoading(true);
    try {
      const [facEquipRes, allEquipRes] = await Promise.all([
        facilityApi.getEquipmentsByFacility(facilityId),
        equipmentApi.listEquipment({ limit: 200 }),
      ]);
      const items = (facEquipRes as any)?.data ?? (Array.isArray(facEquipRes) ? facEquipRes : []);
      const allItems = (allEquipRes as any)?.items ?? (allEquipRes as any)?.data ?? (Array.isArray(allEquipRes) ? allEquipRes : []);
      setFacilityEquipments(items);
      setAllEquipmentEntities(allItems);
    } catch (err) {
      console.error("Failed to load facility equipment:", err);
    } finally {
      setFacilityEquipmentsLoading(false);
    }
  };

  const loadSections = async (facilityId: number) => {
    setSectionsLoading(true);
    try {
      const res = await facilityApi.getSectionsByFacility(facilityId);
      const items = (res as any)?.data ?? (res as any)?.items ?? (Array.isArray(res) ? res : []);
      setSections(items);
    } catch (err) {
      console.error("Failed to load sections:", err);
    } finally {
      setSectionsLoading(false);
    }
  };

  const loadFacilityTables = async (facilityId: number) => {
    setFacilityTablesLoading(true);
    try {
      const res = await facilityApi.getTablesByFacility(facilityId);
      const items = (res as any)?.data ?? (res as any)?.items ?? (Array.isArray(res) ? res : []);
      setFacilityTables(items);
    } catch (err) {
      console.error("Failed to load tables:", err);
    } finally {
      setFacilityTablesLoading(false);
    }
  };

  const handleSelectFacility = (fac: FacilityRecord) => {
    setActiveFacility(fac);
    loadSections(fac.id);
    loadFacilityEmployees(fac.id);
    loadFacilityProducts(fac.id);
    loadFacilityEquipments(fac.id);
    loadFacilityTables(fac.id);
  };

  // Toggle Facility Status (Active <-> Deactivated)
  const handleToggleStatus = async (fac: FacilityRecord, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!canManage) return;

    const nextStatus = !fac.isActive;
    setTogglingFacilityId(fac.id);
    try {
      await facilityApi.updateFacility({
        id: fac.id,
        isActive: nextStatus,
      });

      // Update state locally
      setFacilities((prev) =>
        prev.map((item) => (item.id === fac.id ? { ...item, isActive: nextStatus } : item))
      );

      if (activeFacility?.id === fac.id) {
        setActiveFacility((prev) => (prev ? { ...prev, isActive: nextStatus } : null));
      }
    } catch (err: any) {
      alert(err.message || "Failed to update facility status.");
    } finally {
      setTogglingFacilityId(null);
    }
  };

  // Open Edit Facility Modal
  const handleOpenEditFacility = (fac: FacilityRecord, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingFacility({
      id: fac.id,
      facilityCode: fac.facilityCode,
      facilityName: fac.facilityName,
      type: fac.type,
      description: fac.description || "",
      address: fac.address || "",
      city: fac.city || "",
      province: fac.province || "",
      phoneNumber: fac.phoneNumber || "",
      isActive: fac.isActive,
    });
    setEditFacilityError(null);
    setIsEditFacilityOpen(true);
  };

  // Submit Edit Facility
  const handleUpdateFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFacility) return;

    setSavingEditFacility(true);
    setEditFacilityError(null);
    try {
      const res = await facilityApi.updateFacility(editingFacility);
      const updated = res.data ?? (res as any);

      setFacilities((prev) =>
        prev.map((item) => (item.id === editingFacility.id ? { ...item, ...updated } : item))
      );

      if (activeFacility?.id === editingFacility.id) {
        setActiveFacility((prev) => (prev ? { ...prev, ...updated } : null));
      }

      setIsEditFacilityOpen(false);
      setEditingFacility(null);
    } catch (err: any) {
      setEditFacilityError(err.message || "Failed to update facility.");
    } finally {
      setSavingEditFacility(false);
    }
  };

  // Open Delete Confirmation Modal
  const handleOpenDeleteModal = (fac: FacilityRecord, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFacilityToDelete(fac);
    setDeleteError(null);
    setIsDeleteModalOpen(true);
  };

  // Confirm Delete Facility
  const handleConfirmDelete = async () => {
    if (!facilityToDelete) return;

    setDeletingFacility(true);
    setDeleteError(null);
    try {
      await facilityApi.deleteFacility(facilityToDelete.id);

      // Remove from list
      setFacilities((prev) => prev.filter((item) => item.id !== facilityToDelete.id));

      if (activeFacility?.id === facilityToDelete.id) {
        setActiveFacility(null);
      }

      setIsDeleteModalOpen(false);
      setFacilityToDelete(null);
    } catch (err: any) {
      setDeleteError(err.message || "Failed to delete facility.");
    } finally {
      setDeletingFacility(false);
    }
  };

  // Section deletion
  const handleDeleteSection = async (sectionId: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm("Are you sure you want to delete this section?")) return;

    setDeletingSectionId(sectionId);
    try {
      await facilityApi.deleteSection(sectionId);
      setSections((prev) => prev.filter((s) => s.id !== sectionId));
      if (activeFacility) {
        loadFacilities();
      }
    } catch (err: any) {
      alert(err.message || "Failed to delete section.");
    } finally {
      setDeletingSectionId(null);
    }
  };

  // Section toggle status
  const handleToggleSectionStatus = async (sec: FacilitySectionRecord, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const nextStatus = !sec.isActive;
      await facilityApi.updateSection({
        id: sec.id,
        isActive: nextStatus,
      });
      setSections((prev) =>
        prev.map((s) => (s.id === sec.id ? { ...s, isActive: nextStatus } : s))
      );
    } catch (err: any) {
      alert(err.message || "Failed to update section status.");
    }
  };

  // Staff Handlers (Many-to-Many via facilityEmployee)
  const handleAssignEmployee = async () => {
    if (!selectedStaffToAssign || !activeFacility) return;
    setAssigningStaff(true);
    setAssignStaffError(null);
    try {
      await facilityApi.addEmployee({
        facilityId: activeFacility.id,
        employeeId: Number(selectedStaffToAssign),
        role: staffAssignmentRole.trim() || undefined,
        isPrimary: staffIsPrimary,
        notes: staffNotes.trim() || undefined,
      });
      setIsAssignStaffModalOpen(false);
      setSelectedStaffToAssign("");
      setStaffAssignmentRole("");
      setStaffIsPrimary(false);
      setStaffNotes("");
      await Promise.all([
        loadFacilityEmployees(activeFacility.id),
        loadFacilities(),
      ]);
    } catch (err: any) {
      setAssignStaffError(err.message || "Failed to assign employee.");
    } finally {
      setAssigningStaff(false);
    }
  };

  const handleOpenEditStaff = (rec: FacilityEmployeeRecord) => {
    setEditingStaffRecord(rec);
    setEditingStaffRole(rec.role || "");
    setEditingStaffIsPrimary(Boolean(rec.isPrimary));
    setEditingStaffNotes(rec.notes || "");
    setEditStaffError(null);
    setIsEditStaffModalOpen(true);
  };

  const handleUpdateStaffAssignment = async () => {
    if (!editingStaffRecord || !activeFacility) return;
    setSavingStaffAssignment(true);
    setEditStaffError(null);
    try {
      await facilityApi.updateEmployee({
        id: editingStaffRecord.id,
        role: editingStaffRole.trim() || undefined,
        isPrimary: editingStaffIsPrimary,
        notes: editingStaffNotes.trim() || undefined,
      });
      setIsEditStaffModalOpen(false);
      setEditingStaffRecord(null);
      await Promise.all([
        loadFacilityEmployees(activeFacility.id),
        loadFacilities(),
      ]);
    } catch (err: any) {
      setEditStaffError(err.message || "Failed to update employee assignment.");
    } finally {
      setSavingStaffAssignment(false);
    }
  };

  const handleUnassignEmployee = async (recordId: number) => {
    if (!activeFacility) return;
    if (!confirm("Are you sure you want to unassign this employee from this facility?")) return;
    try {
      await facilityApi.removeEmployee(recordId);
      await Promise.all([
        loadFacilityEmployees(activeFacility.id),
        loadFacilities(),
      ]);
    } catch (err: any) {
      alert(err.message || "Failed to unassign employee.");
    }
  };

  // Product Handlers (Many-to-Many via facilityProduct)
  const handleAssignProduct = async () => {
    if (!selectedProductToAssign || !activeFacility) return;
    setAssigningProduct(true);
    setAssignProductError(null);
    try {
      await facilityApi.addProduct({
        facilityId: activeFacility.id,
        productId: Number(selectedProductToAssign),
        isTradeable: productIsTradeable,
        isActive: true,
        minStock: productMinStock !== "" ? Number(productMinStock) : undefined,
        maxStock: productMaxStock !== "" ? Number(productMaxStock) : undefined,
        notes: productNotes.trim() || undefined,
      });
      setIsAssignProductModalOpen(false);
      setSelectedProductToAssign("");
      setProductIsTradeable(true);
      setProductMinStock("");
      setProductMaxStock("");
      setProductNotes("");
      await Promise.all([
        loadFacilityProducts(activeFacility.id),
        loadFacilities(),
      ]);
    } catch (err: any) {
      setAssignProductError(err.message || "Failed to assign product.");
    } finally {
      setAssigningProduct(false);
    }
  };

  const handleToggleProductTradeable = async (rec: FacilityProductRecord, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!canManage) return;
    setTogglingProductId(rec.id);
    try {
      const nextTradeable = !rec.isTradeable;
      await facilityApi.updateProduct({
        id: rec.id,
        isTradeable: nextTradeable,
      });
      setFacilityProducts((prev) =>
        prev.map((item) => (item.id === rec.id ? { ...item, isTradeable: nextTradeable } : item))
      );
    } catch (err: any) {
      alert(err.message || "Failed to toggle tradeable status.");
    } finally {
      setTogglingProductId(null);
    }
  };

  const handleOpenEditProduct = (rec: FacilityProductRecord) => {
    setEditingProductRecord(rec);
    setEditingProductIsTradeable(rec.isTradeable !== false);
    setEditingProductMinStock(rec.minStock !== null && rec.minStock !== undefined ? String(rec.minStock) : "");
    setEditingProductMaxStock(rec.maxStock !== null && rec.maxStock !== undefined ? String(rec.maxStock) : "");
    setEditingProductIsActive(rec.isActive !== false);
    setEditingProductNotes(rec.notes || "");
    setEditProductError(null);
    setIsEditProductModalOpen(true);
  };

  const handleUpdateFacilityProduct = async () => {
    if (!editingProductRecord || !activeFacility) return;
    setSavingProduct(true);
    setEditProductError(null);
    try {
      await facilityApi.updateProduct({
        id: editingProductRecord.id,
        isTradeable: editingProductIsTradeable,
        minStock: editingProductMinStock !== "" ? Number(editingProductMinStock) : null,
        maxStock: editingProductMaxStock !== "" ? Number(editingProductMaxStock) : null,
        isActive: editingProductIsActive,
        notes: editingProductNotes.trim() || undefined,
      });
      setIsEditProductModalOpen(false);
      setEditingProductRecord(null);
      await Promise.all([
        loadFacilityProducts(activeFacility.id),
        loadFacilities(),
      ]);
    } catch (err: any) {
      setEditProductError(err.message || "Failed to update facility product.");
    } finally {
      setSavingProduct(false);
    }
  };

  const handleRemoveProduct = async (recordId: number) => {
    if (!activeFacility) return;
    if (!confirm("Are you sure you want to remove this product from this facility?")) return;
    try {
      await facilityApi.removeProduct(recordId);
      await Promise.all([
        loadFacilityProducts(activeFacility.id),
        loadFacilities(),
      ]);
    } catch (err: any) {
      alert(err.message || "Failed to remove product.");
    }
  };

  // Equipment Handlers (Many-to-Many via facilityEquipment)
  const handleAssignEquipment = async () => {
    if (!selectedEquipmentToAssign || !activeFacility) return;
    setAssigningEquipment(true);
    setAssignEquipmentError(null);
    try {
      await facilityApi.addEquipment({
        facilityId: activeFacility.id,
        equipmentEntityId: Number(selectedEquipmentToAssign),
        sectionId: selectedEquipmentSectionId !== "" ? Number(selectedEquipmentSectionId) : null,
        status: equipmentStatus || "ACTIVE",
        quantity: Number(equipmentQuantity) || 1,
        isActive: true,
        notes: equipmentNotes.trim() || undefined,
      });
      setIsAssignEquipmentModalOpen(false);
      setSelectedEquipmentToAssign("");
      setSelectedEquipmentSectionId("");
      setEquipmentStatus("ACTIVE");
      setEquipmentQuantity(1);
      setEquipmentNotes("");
      await Promise.all([
        loadFacilityEquipments(activeFacility.id),
        loadFacilities(),
      ]);
    } catch (err: any) {
      setAssignEquipmentError(err.message || "Failed to assign equipment.");
    } finally {
      setAssigningEquipment(false);
    }
  };

  const handleOpenEditEquipment = (rec: FacilityEquipmentRecord) => {
    setEditingEquipmentRecord(rec);
    setEditingEquipmentSectionId(rec.sectionId ?? "");
    setEditingEquipmentStatus(rec.status || "ACTIVE");
    setEditingEquipmentQuantity(rec.quantity || 1);
    setEditingEquipmentIsActive(rec.isActive !== false);
    setEditingEquipmentNotes(rec.notes || "");
    setEditEquipmentError(null);
    setIsEditEquipmentModalOpen(true);
  };

  const handleUpdateFacilityEquipment = async () => {
    if (!editingEquipmentRecord || !activeFacility) return;
    setSavingEquipment(true);
    setEditEquipmentError(null);
    try {
      await facilityApi.updateEquipment({
        id: editingEquipmentRecord.id,
        sectionId: editingEquipmentSectionId !== "" ? Number(editingEquipmentSectionId) : null,
        status: editingEquipmentStatus,
        quantity: Number(editingEquipmentQuantity) || 1,
        isActive: editingEquipmentIsActive,
        notes: editingEquipmentNotes.trim() || undefined,
      });
      setIsEditEquipmentModalOpen(false);
      setEditingEquipmentRecord(null);
      await Promise.all([
        loadFacilityEquipments(activeFacility.id),
        loadFacilities(),
      ]);
    } catch (err: any) {
      setEditEquipmentError(err.message || "Failed to update facility equipment.");
    } finally {
      setSavingEquipment(false);
    }
  };

  const handleRemoveEquipment = async (recordId: number) => {
    if (!activeFacility) return;
    if (!confirm("Are you sure you want to remove this equipment from this facility?")) return;
    try {
      await facilityApi.removeEquipment(recordId);
      await Promise.all([
        loadFacilityEquipments(activeFacility.id),
        loadFacilities(),
      ]);
    } catch (err: any) {
      alert(err.message || "Failed to remove equipment.");
    }
  };

  // Table Action Handlers
  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFacility || !newTableNumber.trim()) return;
    setSavingTable(true);
    setTableError(null);
    try {
      await facilityApi.addTable({
        facilityId: activeFacility.id,
        tableNumber: newTableNumber.trim().toUpperCase(),
        label: newTableLabel.trim() || undefined,
        sectionId: newTableSectionId !== "" ? Number(newTableSectionId) : null,
        capacity: Number(newTableCapacity) || 4,
        status: newTableStatus || "AVAILABLE",
        notes: newTableNotes.trim() || undefined,
      });
      setIsAddTableModalOpen(false);
      setNewTableNumber("");
      setNewTableLabel("");
      setNewTableSectionId("");
      setNewTableCapacity(4);
      setNewTableStatus("AVAILABLE");
      setNewTableNotes("");
      await Promise.all([
        loadFacilityTables(activeFacility.id),
        loadFacilities(),
      ]);
    } catch (err: any) {
      setTableError(err.message || "Failed to create table.");
    } finally {
      setSavingTable(false);
    }
  };

  const handleOpenEditTable = (t: FacilityTableRecord) => {
    setEditingTableRecord(t);
    setEditingTableNumber(t.tableNumber);
    setEditingTableLabel(t.label || "");
    setEditingTableSectionId(t.sectionId ?? "");
    setEditingTableCapacity(t.capacity || 4);
    setEditingTableStatus(t.status || "AVAILABLE");
    setEditingTableIsActive(t.isActive !== false);
    setEditingTableNotes(t.notes || "");
    setEditTableError(null);
    setIsEditTableModalOpen(true);
  };

  const handleUpdateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTableRecord || !activeFacility) return;
    setSavingEditTable(true);
    setEditTableError(null);
    try {
      await facilityApi.updateTable({
        id: editingTableRecord.id,
        tableNumber: editingTableNumber.trim().toUpperCase(),
        label: editingTableLabel.trim() || null,
        sectionId: editingTableSectionId !== "" ? Number(editingTableSectionId) : null,
        capacity: Number(editingTableCapacity) || 4,
        status: editingTableStatus,
        isActive: editingTableIsActive,
        notes: editingTableNotes.trim() || null,
      });
      setIsEditTableModalOpen(false);
      setEditingTableRecord(null);
      await Promise.all([
        loadFacilityTables(activeFacility.id),
        loadFacilities(),
      ]);
    } catch (err: any) {
      setEditTableError(err.message || "Failed to update table.");
    } finally {
      setSavingEditTable(false);
    }
  };

  const handleRemoveTable = async (id: number) => {
    if (!activeFacility) return;
    if (!confirm("Are you sure you want to delete this table?")) return;
    try {
      await facilityApi.removeTable(id);
      await Promise.all([
        loadFacilityTables(activeFacility.id),
        loadFacilities(),
      ]);
    } catch (err: any) {
      alert(err.message || "Failed to delete table.");
    }
  };

  const handleQuickTableStatus = async (t: FacilityTableRecord, nextStatus: string) => {
    try {
      await facilityApi.updateTable({
        id: t.id,
        status: nextStatus,
      });
      setFacilityTables((prev) =>
        prev.map((item) => (item.id === t.id ? { ...item, status: nextStatus } : item))
      );
    } catch (err: any) {
      alert(err.message || "Failed to update table status.");
    }
  };

  const handleOpenQrModal = async (t: FacilityTableRecord) => {
    if (!activeFacility) return;
    setQrModalTable(t);
    setGeneratingQr(true);
    setQrModalDataUrl(null);
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const tableOrderUrl = `${origin}/order/table?facilityId=${activeFacility.id}&tableNumber=${encodeURIComponent(t.tableNumber)}`;
      const dataUrl = await QRCode.toDataURL(tableOrderUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: "#0f172a",
          light: "#ffffff",
        },
      });
      setQrModalDataUrl(dataUrl);
    } catch (err) {
      console.error("Failed to generate table QR code:", err);
    } finally {
      setGeneratingQr(false);
    }
  };

  const handleCreateFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    setFacilityError(null);
    setSavingFacility(true);
    try {
      await facilityApi.createFacility(newFacility);
      setIsAddFacilityOpen(false);
      setNewFacility({
        facilityCode: "",
        facilityName: "",
        type: "WAREHOUSE",
        city: "",
        province: "",
        address: "",
        phoneNumber: "",
        isActive: true,
      });
      loadFacilities();
    } catch (err: any) {
      setFacilityError(err.message || "Failed to create facility.");
    } finally {
      setSavingFacility(false);
    }
  };

  const handleCreateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFacility) return;
    setSectionError(null);
    setSavingSection(true);
    try {
      await facilityApi.createSection({
        facilityId: activeFacility.id,
        sectionCode: newSection.sectionCode!,
        sectionName: newSection.sectionName!,
        type: newSection.type as FacilitySectionType,
        description: newSection.description,
        isActive: true,
      });
      setIsAddSectionOpen(false);
      setNewSection({ sectionCode: "", sectionName: "", type: "ZONE", description: "", isActive: true });
      loadSections(activeFacility.id);
      loadFacilities();
    } catch (err: any) {
      setSectionError(err.message || "Failed to create section.");
    } finally {
      setSavingSection(false);
    }
  };

  const filteredFacilities = useMemo(() => {
    return facilities.filter((f) => {
      const matchType = selectedType === "ALL" || f.type === selectedType;
      const matchStatus =
        selectedStatus === "ALL" ||
        (selectedStatus === "ACTIVE" && f.isActive) ||
        (selectedStatus === "DEACTIVATED" && !f.isActive);

      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        f.facilityName.toLowerCase().includes(q) ||
        f.facilityCode.toLowerCase().includes(q) ||
        (f.city && f.city.toLowerCase().includes(q)) ||
        (f.address && f.address.toLowerCase().includes(q));

      return matchType && matchStatus && matchSearch;
    });
  }, [facilities, selectedType, selectedStatus, search]);

  const activeCount = facilities.filter((f) => f.isActive).length;
  const deactivatedCount = facilities.filter((f) => !f.isActive).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", height: "100%" }}>
      {/* Top Header & Actions */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h2 style={{ fontSize: "1.35rem", fontWeight: 700, color: "var(--text-primary)" }}>
            Facilities Network
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "0.2rem" }}>
            Multi-warehouse network, store branches, offices, and sub-divided storage sections.
          </p>
        </div>

        {canManage && (
          <Button id="add-facility-btn" onClick={() => setIsAddFacilityOpen(true)}>
            + Add Facility / Warehouse
          </Button>
        )}
      </div>

      {/* Filter & Search Bar */}
      <Card style={{ padding: "1rem", display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ flex: 1, minWidth: "260px" }}>
          <Input
            id="facility-search-input"
            placeholder="Search facility name, code, city, address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Status Filter */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Status:</span>
          <select
            id="filter-facility-status-select"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as any)}
            style={{
              padding: "0.45rem 0.85rem",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-subtle)",
              backgroundColor: "var(--surface, var(--bg-surface-elevated))",
              color: "var(--text-primary)",
              fontSize: "0.85rem",
              cursor: "pointer",
              outline: "none",
            }}
          >
            <option value="ALL">All Statuses ({facilities.length})</option>
            <option value="ACTIVE">🟢 Active Only ({activeCount})</option>
            <option value="DEACTIVATED">🔴 Deactivated ({deactivatedCount})</option>
          </select>
        </div>

        {/* Type Filter */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Type:</span>
          <select
            id="filter-facility-type-select"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as any)}
            style={{
              padding: "0.45rem 0.85rem",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-subtle)",
              backgroundColor: "var(--surface, var(--bg-surface-elevated))",
              color: "var(--text-primary)",
              fontSize: "0.85rem",
              cursor: "pointer",
              outline: "none",
            }}
          >
            <option value="ALL">All Types ({facilities.length})</option>
            {FACILITY_TYPES.map((t) => {
              const count = facilities.filter((f) => f.type === t.value).length;
              return (
                <option key={t.value} value={t.value}>
                  {t.icon} {t.label} ({count})
                </option>
              );
            })}
          </select>
        </div>
      </Card>

      {/* Main Grid: Facilities List & Active Detail */}
      <div style={{ display: "grid", gridTemplateColumns: activeFacility ? "minmax(0, 1fr) 520px" : "1fr", gap: "1.25rem", flex: 1, minHeight: 0 }}>
        {/* Facilities Grid */}
        <div style={{ overflowY: "auto", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: "1rem", alignContent: "start" }}>
          {loading ? (
            <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
              Loading facilities network...
            </div>
          ) : filteredFacilities.length === 0 ? (
            <Card style={{ gridColumn: "1 / -1", textAlign: "center", padding: "3rem" }}>
              <span style={{ fontSize: "2.5rem" }}>🏬</span>
              <h3 style={{ marginTop: "1rem", color: "var(--text-primary)" }}>No facilities found</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "0.3rem" }}>
                {search || selectedStatus !== "ALL" || selectedType !== "ALL"
                  ? "No records match your query."
                  : "Register your first central warehouse or retail store outlet."}
              </p>
              {canManage && (
                <Button style={{ marginTop: "1.25rem" }} onClick={() => setIsAddFacilityOpen(true)}>
                  + Add Facility
                </Button>
              )}
            </Card>
          ) : (
            filteredFacilities.map((fac) => {
              const typeMeta = FACILITY_TYPES.find((t) => t.value === fac.type) || { icon: "📍", label: fac.type };
              const isSelected = activeFacility?.id === fac.id;
              const sectionCount = fac._count?.sections ?? fac.sections?.length ?? 0;
              const stockItemCount = fac._count?.storageStocks ?? 0;
              const staffCount = fac._count?.employees ?? 0;
              const isToggling = togglingFacilityId === fac.id;

              return (
                <Card
                  key={fac.id}
                  id={`facility-card-${fac.id}`}
                  onClick={() => handleSelectFacility(fac)}
                  style={{
                    padding: "1.25rem",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    border: isSelected
                      ? "2px solid var(--primary)"
                      : fac.isActive
                      ? "1px solid var(--border-subtle)"
                      : "1px dashed rgba(244, 63, 94, 0.4)",
                    backgroundColor: isSelected
                      ? "var(--bg-surface-elevated)"
                      : fac.isActive
                      ? "var(--bg-surface)"
                      : "rgba(15, 23, 42, 0.4)",
                    opacity: fac.isActive ? 1 : 0.82,
                    boxShadow: isSelected ? "0 0 15px rgba(99, 102, 241, 0.2)" : undefined,
                    transition: "all var(--transition-fast)",
                  }}
                >
                  <div>
                    {/* Top Row: Icon + Status Badge + Actions */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                      <span style={{ fontSize: "1.35rem" }}>{typeMeta.icon}</span>
                      
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <Badge variant={fac.isActive ? "success" : "default"}>
                          {fac.isActive ? "Active" : "Deactivated"}
                        </Badge>

                        {canManage && (
                          <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                            {/* Edit Button */}
                            <button
                              title="Edit facility details"
                              onClick={(e) => handleOpenEditFacility(fac, e)}
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                padding: "0.2rem 0.35rem",
                                borderRadius: "var(--radius-sm)",
                                color: "var(--text-muted)",
                                fontSize: "0.85rem",
                                transition: "color var(--transition-fast)",
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--primary)")}
                              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                            >
                              ✏️
                            </button>

                            {/* Delete Button */}
                            <button
                              title="Delete facility"
                              onClick={(e) => handleOpenDeleteModal(fac, e)}
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                padding: "0.2rem 0.35rem",
                                borderRadius: "var(--radius-sm)",
                                color: "var(--text-muted)",
                                fontSize: "0.85rem",
                                transition: "color var(--transition-fast)",
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent-rose)")}
                              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                            >
                              🗑️
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.2rem" }}>
                      {fac.facilityName}
                    </h3>
                    <span style={{ fontSize: "0.75rem", fontFamily: "monospace", color: "var(--accent-cyan)", display: "block", marginBottom: "0.6rem" }}>
                      {fac.facilityCode}
                    </span>

                    <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.4, marginBottom: "0.75rem" }}>
                      {fac.address ? `${fac.address}, ${fac.city || ""}` : fac.city || "No address specified"}
                    </p>
                  </div>

                  {/* Quick Toggle Status Button on Card */}
                  {canManage && (
                    <div style={{ marginBottom: "0.75rem" }}>
                      <button
                        disabled={isToggling}
                        onClick={(e) => handleToggleStatus(fac, e)}
                        style={{
                          width: "100%",
                          padding: "0.35rem 0.6rem",
                          borderRadius: "var(--radius-sm)",
                          border: fac.isActive ? "1px solid rgba(244, 63, 94, 0.4)" : "1px solid rgba(16, 185, 129, 0.4)",
                          backgroundColor: fac.isActive ? "rgba(244, 63, 94, 0.08)" : "rgba(16, 185, 129, 0.08)",
                          color: fac.isActive ? "var(--accent-rose)" : "var(--accent-emerald)",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          transition: "all var(--transition-fast)",
                        }}
                      >
                        {isToggling
                          ? "Updating..."
                          : fac.isActive
                          ? "⏸️ Deactivate Facility"
                          : "▶️ Activate Facility"}
                      </button>
                    </div>
                  )}

                  {/* Metrics summary */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      gap: "0.4rem",
                      borderTop: "1px solid var(--border-subtle)",
                      paddingTop: "0.75rem",
                      fontSize: "0.75rem",
                      color: "var(--text-muted)",
                    }}
                  >
                    <span><strong>{sectionCount}</strong> Sections</span>
                    <span><strong>{stockItemCount}</strong> Stocks</span>
                    <span><strong>{staffCount}</strong> Staff</span>
                    <span><strong>{fac._count?.purchaseOrders ?? 0}</strong> POs</span>
                    <span><strong>{fac._count?.salesOrders ?? 0}</strong> Sales</span>
                    <span style={{ color: "var(--primary)", fontWeight: 600 }}>Explore →</span>
                  </div>
                </Card>
              );
            })
          )}
        </div>

        {/* Section Breakdown Drawer / Panel */}
        {activeFacility && (
          <Card style={{ display: "flex", flexDirection: "column", height: "100%", padding: "1.25rem", backgroundColor: "var(--bg-surface-elevated)" }}>
            {/* Header: Name, Code & Actions */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--accent-cyan)", fontFamily: "monospace" }}>
                    {activeFacility.facilityCode}
                  </span>
                  <Badge variant={activeFacility.isActive ? "success" : "default"} style={{ fontSize: "0.68rem" }}>
                    {activeFacility.isActive ? "Active" : "Deactivated"}
                  </Badge>
                </div>
                <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary)", marginTop: "0.2rem" }}>
                  {activeFacility.facilityName}
                </h3>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                {canManage && (
                  <>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleOpenEditFacility(activeFacility)}
                      title="Edit facility settings"
                    >
                      ✏️ Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleOpenDeleteModal(activeFacility)}
                      title="Delete facility"
                      style={{ color: "var(--accent-rose)" }}
                    >
                      🗑️
                    </Button>
                  </>
                )}
                <Button size="sm" variant="ghost" onClick={() => setActiveFacility(null)}>
                  ✕
                </Button>
              </div>
            </div>

            {/* Quick Toggle Status in Drawer */}
            {canManage && (
              <div style={{ marginBottom: "0.75rem" }}>
                <Button
                  size="sm"
                  variant={activeFacility.isActive ? "secondary" : "primary"}
                  onClick={() => handleToggleStatus(activeFacility)}
                  disabled={togglingFacilityId === activeFacility.id}
                  style={{
                    width: "100%",
                    fontSize: "0.78rem",
                    borderColor: activeFacility.isActive ? "rgba(244, 63, 94, 0.4)" : undefined,
                    color: activeFacility.isActive ? "var(--accent-rose)" : undefined,
                  }}
                >
                  {togglingFacilityId === activeFacility.id
                    ? "Updating..."
                    : activeFacility.isActive
                    ? "Deactivate This Facility (Set Inactive)"
                    : "Activate This Facility (Set Operational)"}
                </Button>
              </div>
            )}

            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
              {activeFacility.description || "Facility storage layout and sub-sections."}
            </p>

            {/* Quick Hub Navigation Links */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0.5rem",
                padding: "0.75rem",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--bg-primary)",
                border: "1px solid var(--border-subtle)",
                marginBottom: "1rem",
              }}
            >
              <Link
                href={`/inventory?facilityId=${activeFacility.id}`}
                style={{
                  padding: "0.5rem 0.65rem",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: "var(--bg-surface)",
                  border: "1px solid var(--border-subtle)",
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: "0.8rem",
                  color: "var(--text-primary)",
                }}
              >
                <span>📦 Inventory Stock</span>
                <Badge variant="info">{activeFacility._count?.storageStocks ?? 0}</Badge>
              </Link>

              <Link
                href={`/employees?facilityId=${activeFacility.id}`}
                style={{
                  padding: "0.5rem 0.65rem",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: "var(--bg-surface)",
                  border: "1px solid var(--border-subtle)",
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: "0.8rem",
                  color: "var(--text-primary)",
                }}
              >
                <span>👥 Stationed Staff</span>
                <Badge variant="default">{activeFacility._count?.employees ?? 0}</Badge>
              </Link>

              <Link
                href={`/procurement/orders?facilityId=${activeFacility.id}`}
                style={{
                  padding: "0.5rem 0.65rem",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: "var(--bg-surface)",
                  border: "1px solid var(--border-subtle)",
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: "0.8rem",
                  color: "var(--text-primary)",
                }}
              >
                <span>📑 Purchase Orders</span>
                <Badge variant="warning">{activeFacility._count?.purchaseOrders ?? 0}</Badge>
              </Link>

              <Link
                href={`/pos/orders?facilityId=${activeFacility.id}`}
                style={{
                  padding: "0.5rem 0.65rem",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: "var(--bg-surface)",
                  border: "1px solid var(--border-subtle)",
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: "0.8rem",
                  color: "var(--text-primary)",
                }}
              >
                <span>💳 POS Sales Orders</span>
                <Badge variant="success">{activeFacility._count?.salesOrders ?? 0}</Badge>
              </Link>
            </div>

            {/* Sections, Staff, Products & Equipment Tabs */}
            <div
              style={{
                display: "flex",
                gap: "0.35rem",
                borderBottom: "1px solid var(--border-subtle)",
                marginBottom: "0.75rem",
                paddingBottom: "0.5rem",
                overflowX: "auto",
              }}
            >
              <button
                onClick={() => setActiveFacilityTab("sections")}
                style={{
                  padding: "0.35rem 0.65rem",
                  borderRadius: "var(--radius-sm)",
                  border: "none",
                  backgroundColor: activeFacilityTab === "sections" ? "var(--primary)" : "transparent",
                  color: activeFacilityTab === "sections" ? "#ffffff" : "var(--text-secondary)",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                📐 Sections ({sections.length})
              </button>
              <button
                onClick={() => setActiveFacilityTab("staff")}
                style={{
                  padding: "0.35rem 0.65rem",
                  borderRadius: "var(--radius-sm)",
                  border: "none",
                  backgroundColor: activeFacilityTab === "staff" ? "var(--primary)" : "transparent",
                  color: activeFacilityTab === "staff" ? "#ffffff" : "var(--text-secondary)",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                👥 Staff ({facilityEmployees.length})
              </button>
              <button
                onClick={() => setActiveFacilityTab("products")}
                style={{
                  padding: "0.35rem 0.65rem",
                  borderRadius: "var(--radius-sm)",
                  border: "none",
                  backgroundColor: activeFacilityTab === "products" ? "var(--primary)" : "transparent",
                  color: activeFacilityTab === "products" ? "#ffffff" : "var(--text-secondary)",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                🛒 Products ({facilityProducts.length})
              </button>
              <button
                onClick={() => setActiveFacilityTab("equipment")}
                style={{
                  padding: "0.35rem 0.65rem",
                  borderRadius: "var(--radius-sm)",
                  border: "none",
                  backgroundColor: activeFacilityTab === "equipment" ? "var(--primary)" : "transparent",
                  color: activeFacilityTab === "equipment" ? "#ffffff" : "var(--text-secondary)",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                🚜 Equipment ({facilityEquipments.length})
              </button>
              <button
                onClick={() => setActiveFacilityTab("tables")}
                style={{
                  padding: "0.35rem 0.65rem",
                  borderRadius: "var(--radius-sm)",
                  border: "none",
                  backgroundColor: activeFacilityTab === "tables" ? "var(--primary)" : "transparent",
                  color: activeFacilityTab === "tables" ? "#ffffff" : "var(--text-secondary)",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                🪑 Tables ({facilityTables.length})
              </button>
            </div>

            {/* Tab 1: Storage Sections */}
            {activeFacilityTab === "sections" && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                  <h4 style={{ fontSize: "0.92rem", fontWeight: 600, color: "var(--text-primary)" }}>
                    Storage Sections List
                  </h4>
                  {canManage && (
                    <Button size="sm" onClick={() => setIsAddSectionOpen(true)}>
                      + Add Section
                    </Button>
                  )}
                </div>

                <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                  {sectionsLoading ? (
                    <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>
                      Loading storage sections...
                    </p>
                  ) : sections.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "2.5rem 1rem", border: "1px dashed var(--border-subtle)", borderRadius: "var(--radius-md)" }}>
                      <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                        No sections configured yet.
                      </p>
                      <p style={{ color: "var(--text-secondary)", fontSize: "0.75rem", marginTop: "0.25rem" }}>
                        Divide this warehouse into Cold Rooms, Aisles, Racks, or Floor Zones.
                      </p>
                      {canManage && (
                        <Button size="sm" style={{ marginTop: "0.75rem" }} onClick={() => setIsAddSectionOpen(true)}>
                          + Create First Section
                        </Button>
                      )}
                    </div>
                  ) : (
                    sections.map((sec) => (
                      <div
                        key={sec.id}
                        style={{
                          padding: "0.75rem 0.9rem",
                          borderRadius: "var(--radius-md)",
                          backgroundColor: "var(--bg-surface)",
                          border: "1px solid var(--border-subtle)",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          opacity: sec.isActive ? 1 : 0.75,
                        }}
                      >
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--text-primary)" }}>
                              {sec.sectionName}
                            </span>
                            <Badge variant="default" style={{ fontSize: "0.65rem" }}>
                              {sec.type}
                            </Badge>
                          </div>
                          <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: "monospace" }}>
                            {sec.sectionCode}
                          </span>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                          <button
                            title={sec.isActive ? "Deactivate section" : "Activate section"}
                            onClick={(e) => handleToggleSectionStatus(sec, e)}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              padding: "0.15rem",
                            }}
                          >
                            <Badge variant={sec.isActive ? "success" : "default"}>
                              {sec.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </button>

                          {canManage && (
                            <button
                              title="Delete section"
                              onClick={(e) => handleDeleteSection(sec.id, e)}
                              disabled={deletingSectionId === sec.id}
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                padding: "0.2rem",
                                color: "var(--text-muted)",
                                fontSize: "0.8rem",
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent-rose)")}
                              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

            {/* Tab 2: Assigned Staff */}
            {activeFacilityTab === "staff" && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                  <div>
                    <h4 style={{ fontSize: "0.92rem", fontWeight: 600, color: "var(--text-primary)" }}>
                      Assigned Personnel
                    </h4>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      Employees assigned to this facility
                    </span>
                  </div>
                  {canManage && (
                    <Button size="sm" onClick={() => setIsAssignStaffModalOpen(true)}>
                      + Assign Staff
                    </Button>
                  )}
                </div>

                <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                  {facilityEmployeesLoading ? (
                    <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>
                      Loading assigned personnel...
                    </p>
                  ) : facilityEmployees.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "2.5rem 1rem", border: "1px dashed var(--border-subtle)", borderRadius: "var(--radius-md)" }}>
                      <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                        No staff assigned to this facility yet.
                      </p>
                      <p style={{ color: "var(--text-secondary)", fontSize: "0.75rem", marginTop: "0.25rem" }}>
                        Assign team members with facility roles and primary designations.
                      </p>
                      {canManage && (
                        <Button size="sm" style={{ marginTop: "0.75rem" }} onClick={() => setIsAssignStaffModalOpen(true)}>
                          Assign First Employee
                        </Button>
                      )}
                    </div>
                  ) : (
                    facilityEmployees.map((emp) => {
                      const empName = emp.employee?.profile
                        ? `${emp.employee.profile.firstName || ""} ${emp.employee.profile.lastName || ""}`.trim()
                        : `Employee #${emp.employeeId || emp.id}`;
                      const posName = emp.employee?.position?.positionName || emp.employee?.position?.name || "Team Member";

                      return (
                        <div
                          key={emp.id}
                          style={{
                            padding: "0.75rem 0.9rem",
                            borderRadius: "var(--radius-md)",
                            backgroundColor: "var(--bg-surface)",
                            border: "1px solid var(--border-subtle)",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: "0.5rem",
                          }}
                        >
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                              <span style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--text-primary)" }}>
                                {empName}
                              </span>
                              {emp.isPrimary && (
                                <Badge variant="warning" style={{ fontSize: "0.65rem" }}>
                                  ⭐ Primary
                                </Badge>
                              )}
                              {emp.role && (
                                <Badge variant="info" style={{ fontSize: "0.65rem" }}>
                                  {emp.role}
                                </Badge>
                              )}
                            </div>
                            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                              {posName} • ID #{emp.employeeId || emp.id}
                            </div>
                            {emp.notes && (
                              <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                                📝 {emp.notes}
                              </div>
                            )}
                          </div>

                          {canManage && (
                            <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                              <Button
                                size="sm"
                                variant="ghost"
                                style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
                                onClick={() => handleOpenEditStaff(emp)}
                                title="Edit Assignment"
                              >
                                ✏️
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                style={{ color: "var(--accent-rose)", fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
                                onClick={() => handleUnassignEmployee(emp.id)}
                                title="Unassign Employee"
                              >
                                🗑️
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}

            {/* Tab 3: Tradeable Products */}
            {activeFacilityTab === "products" && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <div>
                    <h4 style={{ fontSize: "0.92rem", fontWeight: 600, color: "var(--text-primary)" }}>
                      Facility Products & Trade Catalog
                    </h4>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      Items stocked and tradeable at this facility / POS
                    </span>
                  </div>
                  {canManage && (
                    <Button size="sm" onClick={() => setIsAssignProductModalOpen(true)}>
                      + Add Product
                    </Button>
                  )}
                </div>

                {/* Filter & Search Bar */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginBottom: "0.75rem" }}>
                  <Input
                    placeholder="Search by product name, SKU, or barcode..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    style={{ fontSize: "0.8rem", padding: "0.35rem 0.65rem" }}
                  />

                  <div style={{ display: "flex", gap: "0.3rem" }}>
                    <button
                      onClick={() => setProductFilterMode("ALL")}
                      style={{
                        padding: "0.25rem 0.55rem",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--border-subtle)",
                        backgroundColor: productFilterMode === "ALL" ? "var(--primary)" : "transparent",
                        color: productFilterMode === "ALL" ? "#ffffff" : "var(--text-secondary)",
                        fontSize: "0.74rem",
                        cursor: "pointer",
                      }}
                    >
                      All ({facilityProducts.length})
                    </button>
                    <button
                      onClick={() => setProductFilterMode("TRADEABLE")}
                      style={{
                        padding: "0.25rem 0.55rem",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--border-subtle)",
                        backgroundColor: productFilterMode === "TRADEABLE" ? "var(--primary)" : "transparent",
                        color: productFilterMode === "TRADEABLE" ? "#ffffff" : "var(--text-secondary)",
                        fontSize: "0.74rem",
                        cursor: "pointer",
                      }}
                    >
                      🛒 Tradeable ({facilityProducts.filter((p) => p.isTradeable).length})
                    </button>
                    <button
                      onClick={() => setProductFilterMode("INTERNAL")}
                      style={{
                        padding: "0.25rem 0.55rem",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--border-subtle)",
                        backgroundColor: productFilterMode === "INTERNAL" ? "var(--primary)" : "transparent",
                        color: productFilterMode === "INTERNAL" ? "#ffffff" : "var(--text-secondary)",
                        fontSize: "0.74rem",
                        cursor: "pointer",
                      }}
                    >
                      📦 Storage Only ({facilityProducts.filter((p) => !p.isTradeable).length})
                    </button>
                  </div>
                </div>

                <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                  {facilityProductsLoading ? (
                    <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>
                      Loading facility products...
                    </p>
                  ) : facilityProducts.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "2.5rem 1rem", border: "1px dashed var(--border-subtle)", borderRadius: "var(--radius-md)" }}>
                      <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                        No products linked to this facility yet.
                      </p>
                      <p style={{ color: "var(--text-secondary)", fontSize: "0.75rem", marginTop: "0.25rem" }}>
                        Add products and specify whether they are tradeable on POS registers.
                      </p>
                      {canManage && (
                        <Button size="sm" style={{ marginTop: "0.75rem" }} onClick={() => setIsAssignProductModalOpen(true)}>
                          + Add First Product
                        </Button>
                      )}
                    </div>
                  ) : (
                    facilityProducts
                      .filter((fp) => {
                        if (productFilterMode === "TRADEABLE" && !fp.isTradeable) return false;
                        if (productFilterMode === "INTERNAL" && fp.isTradeable) return false;
                        if (productSearch.trim()) {
                          const q = productSearch.toLowerCase();
                          const pName = (fp.product?.productName || "").toLowerCase();
                          const pSku = (fp.product?.sku || "").toLowerCase();
                          const pBarcode = (fp.product?.barcode || "").toLowerCase();
                          return pName.includes(q) || pSku.includes(q) || pBarcode.includes(q);
                        }
                        return true;
                      })
                      .map((fp) => {
                        const pName = fp.product?.productName || `Product #${fp.productId}`;
                        const pSku = fp.product?.sku || "—";
                        const pBarcode = fp.product?.barcode || "—";
                        const catName = fp.product?.category?.categoryName || "Catalog";

                        return (
                          <div
                            key={fp.id}
                            style={{
                              padding: "0.75rem 0.9rem",
                              borderRadius: "var(--radius-md)",
                              backgroundColor: "var(--bg-surface)",
                              border: "1px solid var(--border-subtle)",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "flex-start",
                              gap: "0.5rem",
                              opacity: fp.isActive ? 1 : 0.65,
                            }}
                          >
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                                <span style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--text-primary)" }}>
                                  {pName}
                                </span>
                                <button
                                  onClick={(e) => handleToggleProductTradeable(fp, e)}
                                  disabled={togglingProductId === fp.id}
                                  title="Click to toggle POS tradeable status"
                                  style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                                >
                                  <Badge variant={fp.isTradeable ? "success" : "default"} style={{ fontSize: "0.68rem" }}>
                                    {fp.isTradeable ? "🛒 POS Tradeable" : "📦 Storage Only"}
                                  </Badge>
                                </button>
                                {!fp.isActive && (
                                  <Badge variant="warning" style={{ fontSize: "0.65rem" }}>
                                    Inactive
                                  </Badge>
                                )}
                              </div>

                              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                                SKU: <span style={{ fontFamily: "monospace" }}>{pSku}</span> • Barcode: <span style={{ fontFamily: "monospace" }}>{pBarcode}</span> • {catName}
                              </div>

                              {(fp.minStock !== null || fp.maxStock !== null) && (
                                <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: "0.15rem" }}>
                                  Min Stock: {fp.minStock ?? "—"} | Max Stock: {fp.maxStock ?? "—"}
                                </div>
                              )}

                              {fp.notes && (
                                <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                                  📝 {fp.notes}
                                </div>
                              )}
                            </div>

                            {canManage && (
                              <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
                                  onClick={() => handleOpenEditProduct(fp)}
                                  title="Edit Product Settings"
                                >
                                  ✏️
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  style={{ color: "var(--accent-rose)", fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
                                  onClick={() => handleRemoveProduct(fp.id)}
                                  title="Remove Product"
                                >
                                  🗑️
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })
                  )}
                </div>
              </>
            )}

            {/* Tab 4: Stationed Equipment */}
            {activeFacilityTab === "equipment" && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <div>
                    <h4 style={{ fontSize: "0.92rem", fontWeight: 600, color: "var(--text-primary)" }}>
                      Stationed Machinery & Equipment
                    </h4>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      Machinery, tools, and vehicles located here
                    </span>
                  </div>
                  {canManage && (
                    <Button size="sm" onClick={() => setIsAssignEquipmentModalOpen(true)}>
                      + Station Equipment
                    </Button>
                  )}
                </div>

                {/* Search Bar */}
                <div style={{ marginBottom: "0.75rem" }}>
                  <Input
                    placeholder="Search equipment by name, code, brand, or model..."
                    value={equipmentSearch}
                    onChange={(e) => setEquipmentSearch(e.target.value)}
                    style={{ fontSize: "0.8rem", padding: "0.35rem 0.65rem" }}
                  />
                </div>

                <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                  {facilityEquipmentsLoading ? (
                    <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>
                      Loading stationed equipment...
                    </p>
                  ) : facilityEquipments.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "2.5rem 1rem", border: "1px dashed var(--border-subtle)", borderRadius: "var(--radius-md)" }}>
                      <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                        No equipment stationed at this facility yet.
                      </p>
                      <p style={{ color: "var(--text-secondary)", fontSize: "0.75rem", marginTop: "0.25rem" }}>
                        Assign forklifts, POS registers, delivery vehicles, and machinery.
                      </p>
                      {canManage && (
                        <Button size="sm" style={{ marginTop: "0.75rem" }} onClick={() => setIsAssignEquipmentModalOpen(true)}>
                          + Station Equipment
                        </Button>
                      )}
                    </div>
                  ) : (
                    facilityEquipments
                      .filter((fe) => {
                        if (equipmentSearch.trim()) {
                          const q = equipmentSearch.toLowerCase();
                          const eName = (fe.equipmentEntity?.name || "").toLowerCase();
                          const eCode = (fe.equipmentEntity?.code || "").toLowerCase();
                          const bName = (fe.equipmentEntity?.brand?.name || fe.equipmentEntity?.brand?.brandName || "").toLowerCase();
                          const mName = (fe.equipmentEntity?.model?.name || fe.equipmentEntity?.model?.modelName || "").toLowerCase();
                          const sName = (fe.section?.sectionName || fe.facilitySection?.sectionName || "").toLowerCase();
                          return eName.includes(q) || eCode.includes(q) || bName.includes(q) || mName.includes(q) || sName.includes(q);
                        }
                        return true;
                      })
                      .map((fe) => {
                        const eqName = fe.equipmentEntity?.name || `Equipment #${fe.equipmentEntityId}`;
                        const eqCode = fe.equipmentEntity?.code || "—";
                        const brandModel = [
                          fe.equipmentEntity?.brand?.name || fe.equipmentEntity?.brand?.brandName,
                          fe.equipmentEntity?.model?.name || fe.equipmentEntity?.model?.modelName,
                        ]
                          .filter(Boolean)
                          .join(" ");
                        const sectionName = fe.section?.sectionName || fe.facilitySection?.sectionName;

                        return (
                          <div
                            key={fe.id}
                            style={{
                              padding: "0.75rem 0.9rem",
                              borderRadius: "var(--radius-md)",
                              backgroundColor: "var(--bg-surface)",
                              border: "1px solid var(--border-subtle)",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "flex-start",
                              gap: "0.5rem",
                              opacity: fe.isActive ? 1 : 0.65,
                            }}
                          >
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                                <span style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--text-primary)" }}>
                                  {eqName}
                                </span>
                                <Badge
                                  variant={fe.status === "ACTIVE" ? "success" : fe.status === "MAINTENANCE" ? "warning" : "default"}
                                  style={{ fontSize: "0.68rem" }}
                                >
                                  {fe.status}
                                </Badge>
                                {!fe.isActive && (
                                  <Badge variant="warning" style={{ fontSize: "0.65rem" }}>
                                    Inactive
                                  </Badge>
                                )}
                              </div>

                              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                                Code: <span style={{ fontFamily: "monospace" }}>{eqCode}</span>
                                {brandModel && ` • ${brandModel}`}
                                {fe.quantity > 1 && ` • Qty: ${fe.quantity}`}
                              </div>

                              <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: "0.15rem" }}>
                                📍 {sectionName ? `Section: ${sectionName}` : "General Facility (Unassigned Section)"}
                              </div>

                              {fe.notes && (
                                <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                                  📝 {fe.notes}
                                </div>
                              )}
                            </div>

                            {canManage && (
                              <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
                                  onClick={() => handleOpenEditEquipment(fe)}
                                  title="Edit Equipment Placement"
                                >
                                  ✏️
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  style={{ color: "var(--accent-rose)", fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
                                  onClick={() => handleRemoveEquipment(fe.id)}
                                  title="Remove Equipment"
                                >
                                  🗑️
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })
                  )}
                </div>
              </>
            )}

            {/* Tab 5: Dining & Service Tables */}
            {activeFacilityTab === "tables" && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <div>
                    <h4 style={{ fontSize: "0.92rem", fontWeight: 600, color: "var(--text-primary)" }}>
                      Dining & Service Tables
                    </h4>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      Customer seating & table QR ordering
                    </span>
                  </div>
                  {canManage && (
                    <Button size="sm" onClick={() => setIsAddTableModalOpen(true)}>
                      + Add Table
                    </Button>
                  )}
                </div>

                {/* Search & Status Filter */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginBottom: "0.75rem" }}>
                  <Input
                    placeholder="Search by table number or label..."
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    style={{ fontSize: "0.8rem", padding: "0.35rem 0.65rem" }}
                  />

                  <div style={{ display: "flex", gap: "0.3rem", overflowX: "auto" }}>
                    <button
                      onClick={() => setTableStatusFilter("ALL")}
                      style={{
                        padding: "0.25rem 0.55rem",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--border-subtle)",
                        backgroundColor: tableStatusFilter === "ALL" ? "var(--primary)" : "transparent",
                        color: tableStatusFilter === "ALL" ? "#ffffff" : "var(--text-secondary)",
                        fontSize: "0.74rem",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      All ({facilityTables.length})
                    </button>
                    <button
                      onClick={() => setTableStatusFilter("AVAILABLE")}
                      style={{
                        padding: "0.25rem 0.55rem",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--border-subtle)",
                        backgroundColor: tableStatusFilter === "AVAILABLE" ? "var(--primary)" : "transparent",
                        color: tableStatusFilter === "AVAILABLE" ? "#ffffff" : "var(--text-secondary)",
                        fontSize: "0.74rem",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      🟢 Available ({facilityTables.filter((t) => t.status === "AVAILABLE").length})
                    </button>
                    <button
                      onClick={() => setTableStatusFilter("OCCUPIED")}
                      style={{
                        padding: "0.25rem 0.55rem",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--border-subtle)",
                        backgroundColor: tableStatusFilter === "OCCUPIED" ? "var(--primary)" : "transparent",
                        color: tableStatusFilter === "OCCUPIED" ? "#ffffff" : "var(--text-secondary)",
                        fontSize: "0.74rem",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      🔴 Occupied ({facilityTables.filter((t) => t.status === "OCCUPIED").length})
                    </button>
                    <button
                      onClick={() => setTableStatusFilter("RESERVED")}
                      style={{
                        padding: "0.25rem 0.55rem",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--border-subtle)",
                        backgroundColor: tableStatusFilter === "RESERVED" ? "var(--primary)" : "transparent",
                        color: tableStatusFilter === "RESERVED" ? "#ffffff" : "var(--text-secondary)",
                        fontSize: "0.74rem",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      🟡 Reserved ({facilityTables.filter((t) => t.status === "RESERVED").length})
                    </button>
                    <button
                      onClick={() => setTableStatusFilter("OUT_OF_SERVICE")}
                      style={{
                        padding: "0.25rem 0.55rem",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--border-subtle)",
                        backgroundColor: tableStatusFilter === "OUT_OF_SERVICE" ? "var(--primary)" : "transparent",
                        color: tableStatusFilter === "OUT_OF_SERVICE" ? "#ffffff" : "var(--text-secondary)",
                        fontSize: "0.74rem",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      ⚪ Out of Service ({facilityTables.filter((t) => t.status === "OUT_OF_SERVICE").length})
                    </button>
                  </div>
                </div>

                <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                  {facilityTablesLoading ? (
                    <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>
                      Loading facility tables...
                    </p>
                  ) : facilityTables.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "2.5rem 1rem", border: "1px dashed var(--border-subtle)", borderRadius: "var(--radius-md)" }}>
                      <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                        No tables configured for this facility yet.
                      </p>
                      <p style={{ color: "var(--text-secondary)", fontSize: "0.75rem", marginTop: "0.25rem" }}>
                        Add dining or cafe tables with QR codes for customer self-ordering.
                      </p>
                      {canManage && (
                        <Button size="sm" style={{ marginTop: "0.75rem" }} onClick={() => setIsAddTableModalOpen(true)}>
                          + Add First Table
                        </Button>
                      )}
                    </div>
                  ) : (
                    facilityTables
                      .filter((t) => {
                        if (tableStatusFilter !== "ALL" && t.status !== tableStatusFilter) return false;
                        if (tableSearch.trim()) {
                          const q = tableSearch.toLowerCase();
                          const tNum = (t.tableNumber || "").toLowerCase();
                          const tLbl = (t.label || "").toLowerCase();
                          const tSec = (t.section?.sectionName || "").toLowerCase();
                          return tNum.includes(q) || tLbl.includes(q) || tSec.includes(q);
                        }
                        return true;
                      })
                      .map((t) => {
                        const statusVariant =
                          t.status === "AVAILABLE"
                            ? "success"
                            : t.status === "OCCUPIED"
                            ? "danger"
                            : t.status === "RESERVED"
                            ? "warning"
                            : "default";

                        return (
                          <div
                            key={t.id}
                            style={{
                              padding: "0.75rem 0.9rem",
                              borderRadius: "var(--radius-md)",
                              backgroundColor: "var(--bg-surface)",
                              border: "1px solid var(--border-subtle)",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "flex-start",
                              gap: "0.5rem",
                              opacity: t.isActive ? 1 : 0.65,
                            }}
                          >
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                                <span style={{ fontWeight: 700, fontSize: "0.92rem", color: "var(--text-primary)" }}>
                                  🪑 Table {t.tableNumber}
                                </span>
                                <Badge variant={statusVariant} style={{ fontSize: "0.68rem" }}>
                                  {t.status}
                                </Badge>
                                {!t.isActive && (
                                  <Badge variant="warning" style={{ fontSize: "0.65rem" }}>
                                    Inactive
                                  </Badge>
                                )}
                              </div>

                              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                                {t.label && <span>{t.label} • </span>}
                                <span>👥 {t.capacity} Seats</span>
                                <span> • 📍 {t.section?.sectionName || "General Area"}</span>
                              </div>

                              {t.notes && (
                                <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: "0.15rem" }}>
                                  📝 {t.notes}
                                </div>
                              )}

                              {/* Quick Status Selector */}
                              {canManage && (
                                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginTop: "0.4rem" }}>
                                  <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Quick Status:</span>
                                  <select
                                    value={t.status}
                                    onChange={(e) => handleQuickTableStatus(t, e.target.value)}
                                    style={{
                                      fontSize: "0.72rem",
                                      padding: "0.15rem 0.4rem",
                                      borderRadius: "var(--radius-sm)",
                                      border: "1px solid var(--border-subtle)",
                                      backgroundColor: "var(--bg-surface-elevated)",
                                      color: "var(--text-primary)",
                                      cursor: "pointer",
                                    }}
                                  >
                                    <option value="AVAILABLE">AVAILABLE (🟢)</option>
                                    <option value="OCCUPIED">OCCUPIED (🔴)</option>
                                    <option value="RESERVED">RESERVED (🟡)</option>
                                    <option value="OUT_OF_SERVICE">OUT OF SERVICE (⚪)</option>
                                  </select>
                                </div>
                              )}
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                              <Button
                                size="sm"
                                variant="secondary"
                                style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
                                onClick={() => handleOpenQrModal(t)}
                                title="View & Print Table QR Code"
                              >
                                📱 QR
                              </Button>
                              {canManage && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
                                    onClick={() => handleOpenEditTable(t)}
                                    title="Edit Table"
                                  >
                                    ✏️
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    style={{ color: "var(--accent-rose)", fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
                                    onClick={() => handleRemoveTable(t.id)}
                                    title="Delete Table"
                                  >
                                    🗑️
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </>
            )}
          </Card>
        )}
      </div>

      {/* Add Facility Modal */}
      {isAddFacilityOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "1rem",
          }}
        >
          <Card style={{ width: "100%", maxWidth: "520px", padding: "1.75rem", maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.25rem" }}>
              Add New Facility
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", marginBottom: "1.25rem" }}>
              Create a warehouse, store outlet, or administrative office location.
            </p>

            {facilityError && (
              <div style={{ padding: "0.6rem 0.8rem", backgroundColor: "rgba(239, 68, 68, 0.15)", color: "var(--accent-rose)", borderRadius: "var(--radius-md)", fontSize: "0.82rem", marginBottom: "1rem" }}>
                {facilityError}
              </div>
            )}

            <form onSubmit={handleCreateFacility} style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                    Facility Code *
                  </label>
                  <Input
                    required
                    placeholder="e.g. WH-JKT-01"
                    value={newFacility.facilityCode}
                    onChange={(e) => setNewFacility({ ...newFacility, facilityCode: e.target.value.toUpperCase() })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                    Facility Type *
                  </label>
                  <select
                    style={{
                      width: "100%",
                      padding: "0.5rem 0.75rem",
                      borderRadius: "var(--radius-md)",
                      backgroundColor: "var(--bg-surface-elevated)",
                      border: "1px solid var(--border-subtle)",
                      color: "var(--text-primary)",
                      fontSize: "0.85rem",
                    }}
                    value={newFacility.type}
                    onChange={(e) => setNewFacility({ ...newFacility, type: e.target.value as FacilityType })}
                  >
                    {FACILITY_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.icon} {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                  Facility Name *
                </label>
                <Input
                  required
                  placeholder="e.g. Central Distribution Warehouse Jakarta"
                  value={newFacility.facilityName}
                  onChange={(e) => setNewFacility({ ...newFacility, facilityName: e.target.value })}
                />
              </div>

              {/* Status Selector */}
              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                  Operational Status *
                </label>
                <select
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.75rem",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "var(--bg-surface-elevated)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-primary)",
                    fontSize: "0.85rem",
                  }}
                  value={newFacility.isActive ? "true" : "false"}
                  onChange={(e) => setNewFacility({ ...newFacility, isActive: e.target.value === "true" })}
                >
                  <option value="true">🟢 Active (Operational & Available)</option>
                  <option value="false">🔴 Deactivated (Offline / Under Maintenance)</option>
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                    City
                  </label>
                  <Input
                    placeholder="e.g. Jakarta Barat"
                    value={newFacility.city || ""}
                    onChange={(e) => setNewFacility({ ...newFacility, city: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                    Province
                  </label>
                  <Input
                    placeholder="e.g. DKI Jakarta"
                    value={newFacility.province || ""}
                    onChange={(e) => setNewFacility({ ...newFacility, province: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                  Street Address
                </label>
                <Input
                  placeholder="e.g. Jl. Daan Mogot KM 12 No. 8"
                  value={newFacility.address || ""}
                  onChange={(e) => setNewFacility({ ...newFacility, address: e.target.value })}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
                <Button type="button" variant="secondary" onClick={() => setIsAddFacilityOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={savingFacility}>
                  {savingFacility ? "Saving..." : "Create Facility"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Edit Facility Modal */}
      {isEditFacilityOpen && editingFacility && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "1rem",
          }}
        >
          <Card style={{ width: "100%", maxWidth: "520px", padding: "1.75rem", maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.25rem" }}>
              Edit Facility
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", marginBottom: "1.25rem" }}>
              Update facility properties, location, or active operational status.
            </p>

            {editFacilityError && (
              <div style={{ padding: "0.6rem 0.8rem", backgroundColor: "rgba(239, 68, 68, 0.15)", color: "var(--accent-rose)", borderRadius: "var(--radius-md)", fontSize: "0.82rem", marginBottom: "1rem" }}>
                {editFacilityError}
              </div>
            )}

            <form onSubmit={handleUpdateFacility} style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                    Facility Code *
                  </label>
                  <Input
                    required
                    placeholder="e.g. WH-JKT-01"
                    value={editingFacility.facilityCode || ""}
                    onChange={(e) => setEditingFacility({ ...editingFacility, facilityCode: e.target.value.toUpperCase() })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                    Facility Type *
                  </label>
                  <select
                    style={{
                      width: "100%",
                      padding: "0.5rem 0.75rem",
                      borderRadius: "var(--radius-md)",
                      backgroundColor: "var(--bg-surface-elevated)",
                      border: "1px solid var(--border-subtle)",
                      color: "var(--text-primary)",
                      fontSize: "0.85rem",
                    }}
                    value={editingFacility.type}
                    onChange={(e) => setEditingFacility({ ...editingFacility, type: e.target.value as FacilityType })}
                  >
                    {FACILITY_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.icon} {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                  Facility Name *
                </label>
                <Input
                  required
                  placeholder="Facility Name"
                  value={editingFacility.facilityName || ""}
                  onChange={(e) => setEditingFacility({ ...editingFacility, facilityName: e.target.value })}
                />
              </div>

              {/* Status Select in Edit Modal */}
              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                  Operational Status *
                </label>
                <select
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.75rem",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "var(--bg-surface-elevated)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-primary)",
                    fontSize: "0.85rem",
                  }}
                  value={editingFacility.isActive ? "true" : "false"}
                  onChange={(e) => setEditingFacility({ ...editingFacility, isActive: e.target.value === "true" })}
                >
                  <option value="true">🟢 Active (Operational & Visible in Daily Workflows)</option>
                  <option value="false">🔴 Deactivated (Offline / Disabled for Operations)</option>
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                    City
                  </label>
                  <Input
                    placeholder="City"
                    value={editingFacility.city || ""}
                    onChange={(e) => setEditingFacility({ ...editingFacility, city: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                    Province
                  </label>
                  <Input
                    placeholder="Province"
                    value={editingFacility.province || ""}
                    onChange={(e) => setEditingFacility({ ...editingFacility, province: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                  Street Address
                </label>
                <Input
                  placeholder="Address"
                  value={editingFacility.address || ""}
                  onChange={(e) => setEditingFacility({ ...editingFacility, address: e.target.value })}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
                <Button type="button" variant="secondary" onClick={() => setIsEditFacilityOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={savingEditFacility}>
                  {savingEditFacility ? "Updating..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && facilityToDelete && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 110,
            padding: "1rem",
          }}
        >
          <Card style={{ width: "100%", maxWidth: "440px", padding: "1.75rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "50%",
                  backgroundColor: "rgba(244, 63, 94, 0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.25rem",
                  color: "var(--accent-rose)",
                  flexShrink: 0,
                }}
              >
                ⚠️
              </div>
              <div>
                <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  Delete Facility
                </h3>
                <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  Permanent soft-delete action
                </span>
              </div>
            </div>

            <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: "1rem" }}>
              Are you sure you want to delete <strong>{facilityToDelete.facilityName}</strong> (
              <span style={{ fontFamily: "monospace", color: "var(--accent-cyan)" }}>
                {facilityToDelete.facilityCode}
              </span>
              )?
            </p>

            <div
              style={{
                padding: "0.75rem",
                borderRadius: "var(--radius-md)",
                backgroundColor: "rgba(244, 63, 94, 0.08)",
                border: "1px solid rgba(244, 63, 94, 0.2)",
                fontSize: "0.8rem",
                color: "var(--accent-rose)",
                marginBottom: "1.25rem",
              }}
            >
              ⚠️ All sub-sections under this facility will also be removed from active operational views.
            </div>

            {deleteError && (
              <div
                style={{
                  padding: "0.6rem 0.8rem",
                  backgroundColor: "rgba(239, 68, 68, 0.15)",
                  color: "var(--accent-rose)",
                  borderRadius: "var(--radius-md)",
                  fontSize: "0.82rem",
                  marginBottom: "1rem",
                }}
              >
                {deleteError}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <Button type="button" variant="secondary" onClick={() => setIsDeleteModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deletingFacility}
                style={{
                  backgroundColor: "var(--accent-rose)",
                  color: "#ffffff",
                }}
              >
                {deletingFacility ? "Deleting..." : "Yes, Delete Facility"}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Add Section Modal */}
      {isAddSectionOpen && activeFacility && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "1rem",
          }}
        >
          <Card style={{ width: "100%", maxWidth: "460px", padding: "1.75rem" }}>
            <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.25rem" }}>
              Add Storage Section
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", marginBottom: "1.25rem" }}>
              Create a section inside <strong>{activeFacility.facilityName}</strong>.
            </p>

            {sectionError && (
              <div style={{ padding: "0.6rem 0.8rem", backgroundColor: "rgba(239, 68, 68, 0.15)", color: "var(--accent-rose)", borderRadius: "var(--radius-md)", fontSize: "0.82rem", marginBottom: "1rem" }}>
                {sectionError}
              </div>
            )}

            <form onSubmit={handleCreateSection} style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                    Section Code *
                  </label>
                  <Input
                    required
                    placeholder="e.g. SEC-A1, RACK-04"
                    value={newSection.sectionCode || ""}
                    onChange={(e) => setNewSection({ ...newSection, sectionCode: e.target.value.toUpperCase() })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                    Section Type *
                  </label>
                  <select
                    style={{
                      width: "100%",
                      padding: "0.5rem 0.75rem",
                      borderRadius: "var(--radius-md)",
                      backgroundColor: "var(--bg-surface-elevated)",
                      border: "1px solid var(--border-subtle)",
                      color: "var(--text-primary)",
                      fontSize: "0.85rem",
                    }}
                    value={newSection.type}
                    onChange={(e) => setNewSection({ ...newSection, type: e.target.value as FacilitySectionType })}
                  >
                    {SECTION_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                  Section Name *
                </label>
                <Input
                  required
                  placeholder="e.g. Zone A - Cold Storage Room"
                  value={newSection.sectionName || ""}
                  onChange={(e) => setNewSection({ ...newSection, sectionName: e.target.value })}
                />
              </div>

              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                  Description / Notes
                </label>
                <Input
                  placeholder="Temperature controlled at 4°C, dairy & meats"
                  value={newSection.description || ""}
                  onChange={(e) => setNewSection({ ...newSection, description: e.target.value })}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
                <Button type="button" variant="secondary" onClick={() => setIsAddSectionOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={savingSection}>
                  {savingSection ? "Saving..." : "Create Section"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Assign Staff Modal */}
      {isAssignStaffModalOpen && activeFacility && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "1rem",
          }}
        >
          <Card style={{ width: "100%", maxWidth: "480px", padding: "1.75rem" }}>
            <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.25rem" }}>
              Assign Employee to Facility
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", marginBottom: "1.25rem" }}>
              Station personnel to <strong>{activeFacility.facilityName}</strong>. Employees can be assigned to multiple facilities.
            </p>

            {assignStaffError && (
              <div style={{ padding: "0.6rem 0.8rem", backgroundColor: "rgba(239, 68, 68, 0.15)", color: "var(--accent-rose)", borderRadius: "var(--radius-md)", fontSize: "0.82rem", marginBottom: "1rem" }}>
                {assignStaffError}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                  Select Employee *
                </label>
                <select
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.75rem",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "var(--bg-surface-elevated)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-primary)",
                    fontSize: "0.85rem",
                  }}
                  value={selectedStaffToAssign}
                  onChange={(e) => setSelectedStaffToAssign(e.target.value ? Number(e.target.value) : "")}
                >
                  <option value="">-- Choose employee --</option>
                  {allEmployees.map((emp) => {
                    const empName = emp.profile ? `${emp.profile.firstName || ""} ${emp.profile.lastName || ""}`.trim() : `Employee #${emp.id}`;
                    return (
                      <option key={emp.id} value={emp.id}>
                        {empName} ({emp.position?.positionName || "Staff"})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                  Assignment Role / Title (Optional)
                </label>
                <Input
                  placeholder="e.g. Lead Cashier, Shift Supervisor, Warehouse Operator"
                  value={staffAssignmentRole}
                  onChange={(e) => setStaffAssignmentRole(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input
                  type="checkbox"
                  id="staff-is-primary-cb"
                  checked={staffIsPrimary}
                  onChange={(e) => setStaffIsPrimary(e.target.checked)}
                  style={{ cursor: "pointer", width: "16px", height: "16px" }}
                />
                <label htmlFor="staff-is-primary-cb" style={{ fontSize: "0.82rem", color: "var(--text-primary)", cursor: "pointer" }}>
                  Set as Primary Facility for this employee
                </label>
              </div>

              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                  Notes (Optional)
                </label>
                <Input
                  placeholder="e.g. Assigned for night shift or special project"
                  value={staffNotes}
                  onChange={(e) => setStaffNotes(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
                <Button type="button" variant="secondary" onClick={() => setIsAssignStaffModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={!selectedStaffToAssign || assigningStaff}
                  onClick={handleAssignEmployee}
                >
                  {assigningStaff ? "Assigning..." : "Assign to Facility"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Edit Staff Assignment Modal */}
      {isEditStaffModalOpen && editingStaffRecord && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "1rem",
          }}
        >
          <Card style={{ width: "100%", maxWidth: "460px", padding: "1.75rem" }}>
            <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.25rem" }}>
              Edit Staff Assignment
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", marginBottom: "1.25rem" }}>
              Update role and primary facility status for assigned employee.
            </p>

            {editStaffError && (
              <div style={{ padding: "0.6rem 0.8rem", backgroundColor: "rgba(239, 68, 68, 0.15)", color: "var(--accent-rose)", borderRadius: "var(--radius-md)", fontSize: "0.82rem", marginBottom: "1rem" }}>
                {editStaffError}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                  Assignment Role / Title
                </label>
                <Input
                  placeholder="e.g. Head Cashier, Inventory Specialist"
                  value={editingStaffRole}
                  onChange={(e) => setEditingStaffRole(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input
                  type="checkbox"
                  id="edit-staff-is-primary-cb"
                  checked={editingStaffIsPrimary}
                  onChange={(e) => setEditingStaffIsPrimary(e.target.checked)}
                  style={{ cursor: "pointer", width: "16px", height: "16px" }}
                />
                <label htmlFor="edit-staff-is-primary-cb" style={{ fontSize: "0.82rem", color: "var(--text-primary)", cursor: "pointer" }}>
                  Primary Facility Designation
                </label>
              </div>

              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                  Notes
                </label>
                <Input
                  placeholder="e.g. Schedule notes or job duties"
                  value={editingStaffNotes}
                  onChange={(e) => setEditingStaffNotes(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
                <Button type="button" variant="secondary" onClick={() => setIsEditStaffModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={savingStaffAssignment}
                  onClick={handleUpdateStaffAssignment}
                >
                  {savingStaffAssignment ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Add / Assign Product Modal */}
      {isAssignProductModalOpen && activeFacility && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "1rem",
          }}
        >
          <Card style={{ width: "100%", maxWidth: "480px", padding: "1.75rem" }}>
            <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.25rem" }}>
              Add Product to Facility
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", marginBottom: "1.25rem" }}>
              Link a tradeable or stored catalog product to <strong>{activeFacility.facilityName}</strong>.
            </p>

            {assignProductError && (
              <div style={{ padding: "0.6rem 0.8rem", backgroundColor: "rgba(239, 68, 68, 0.15)", color: "var(--accent-rose)", borderRadius: "var(--radius-md)", fontSize: "0.82rem", marginBottom: "1rem" }}>
                {assignProductError}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                  Select Product *
                </label>
                <select
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.75rem",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "var(--bg-surface-elevated)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-primary)",
                    fontSize: "0.85rem",
                  }}
                  value={selectedProductToAssign}
                  onChange={(e) => setSelectedProductToAssign(e.target.value ? Number(e.target.value) : "")}
                >
                  <option value="">-- Choose product from catalog --</option>
                  {allCatalogProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.productName} ({p.sku || "No SKU"}) {p.barcode ? `[Barcode: ${p.barcode}]` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input
                  type="checkbox"
                  id="product-is-tradeable-cb"
                  checked={productIsTradeable}
                  onChange={(e) => setProductIsTradeable(e.target.checked)}
                  style={{ cursor: "pointer", width: "16px", height: "16px" }}
                />
                <label htmlFor="product-is-tradeable-cb" style={{ fontSize: "0.82rem", color: "var(--text-primary)", cursor: "pointer" }}>
                  Tradeable in Point of Sale (POS) at this facility
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                    Min Stock Alert
                  </label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="e.g. 10"
                    value={productMinStock}
                    onChange={(e) => setProductMinStock(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                    Max Stock Capacity
                  </label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="e.g. 500"
                    value={productMaxStock}
                    onChange={(e) => setProductMaxStock(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                  Notes (Optional)
                </label>
                <Input
                  placeholder="e.g. Fast-moving merchandise, stored in cold section"
                  value={productNotes}
                  onChange={(e) => setProductNotes(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
                <Button type="button" variant="secondary" onClick={() => setIsAssignProductModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={!selectedProductToAssign || assigningProduct}
                  onClick={handleAssignProduct}
                >
                  {assigningProduct ? "Adding..." : "Add to Facility"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Edit Facility Product Modal */}
      {isEditProductModalOpen && editingProductRecord && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "1rem",
          }}
        >
          <Card style={{ width: "100%", maxWidth: "460px", padding: "1.75rem" }}>
            <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.25rem" }}>
              Modify Facility Product
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", marginBottom: "1.25rem" }}>
              Update tradeable status, stock limits, or active status.
            </p>

            {editProductError && (
              <div style={{ padding: "0.6rem 0.8rem", backgroundColor: "rgba(239, 68, 68, 0.15)", color: "var(--accent-rose)", borderRadius: "var(--radius-md)", fontSize: "0.82rem", marginBottom: "1rem" }}>
                {editProductError}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input
                  type="checkbox"
                  id="edit-product-is-tradeable-cb"
                  checked={editingProductIsTradeable}
                  onChange={(e) => setEditingProductIsTradeable(e.target.checked)}
                  style={{ cursor: "pointer", width: "16px", height: "16px" }}
                />
                <label htmlFor="edit-product-is-tradeable-cb" style={{ fontSize: "0.82rem", color: "var(--text-primary)", cursor: "pointer" }}>
                  Tradeable in Point of Sale (POS)
                </label>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input
                  type="checkbox"
                  id="edit-product-is-active-cb"
                  checked={editingProductIsActive}
                  onChange={(e) => setEditingProductIsActive(e.target.checked)}
                  style={{ cursor: "pointer", width: "16px", height: "16px" }}
                />
                <label htmlFor="edit-product-is-active-cb" style={{ fontSize: "0.82rem", color: "var(--text-primary)", cursor: "pointer" }}>
                  Active in this facility catalog
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                    Min Stock Alert
                  </label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="e.g. 10"
                    value={editingProductMinStock}
                    onChange={(e) => setEditingProductMinStock(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                    Max Stock Capacity
                  </label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="e.g. 500"
                    value={editingProductMaxStock}
                    onChange={(e) => setEditingProductMaxStock(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                  Notes
                </label>
                <Input
                  placeholder="e.g. Special stocking notes"
                  value={editingProductNotes}
                  onChange={(e) => setEditingProductNotes(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
                <Button type="button" variant="secondary" onClick={() => setIsEditProductModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={savingProduct}
                  onClick={handleUpdateFacilityProduct}
                >
                  {savingProduct ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Station / Assign Equipment Modal */}
      {isAssignEquipmentModalOpen && activeFacility && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "1rem",
          }}
        >
          <Card style={{ width: "100%", maxWidth: "480px", padding: "1.75rem" }}>
            <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.25rem" }}>
              Station Equipment to Facility
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", marginBottom: "1.25rem" }}>
              Place machinery, vehicles, or tools at <strong>{activeFacility.facilityName}</strong>.
            </p>

            {assignEquipmentError && (
              <div style={{ padding: "0.6rem 0.8rem", backgroundColor: "rgba(239, 68, 68, 0.15)", color: "var(--accent-rose)", borderRadius: "var(--radius-md)", fontSize: "0.82rem", marginBottom: "1rem" }}>
                {assignEquipmentError}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                  Select Equipment Entity *
                </label>
                <select
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.75rem",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "var(--bg-surface-elevated)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-primary)",
                    fontSize: "0.85rem",
                  }}
                  value={selectedEquipmentToAssign}
                  onChange={(e) => setSelectedEquipmentToAssign(e.target.value ? Number(e.target.value) : "")}
                >
                  <option value="">-- Choose equipment entity --</option>
                  {allEquipmentEntities.map((eq) => {
                    const modelName = eq.model?.name;
                    return (
                      <option key={eq.id} value={eq.id}>
                        {eq.name} ({eq.code || "No Code"}) {modelName ? `[${modelName}]` : ""}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                  Storage Section Location (Optional)
                </label>
                <select
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.75rem",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "var(--bg-surface-elevated)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-primary)",
                    fontSize: "0.85rem",
                  }}
                  value={selectedEquipmentSectionId}
                  onChange={(e) => setSelectedEquipmentSectionId(e.target.value ? Number(e.target.value) : "")}
                >
                  <option value="">-- General Facility / Unassigned Section --</option>
                  {sections.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.sectionName} ({sec.sectionCode}) [{sec.type}]
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                    Operational Status
                  </label>
                  <select
                    style={{
                      width: "100%",
                      padding: "0.5rem 0.75rem",
                      borderRadius: "var(--radius-md)",
                      backgroundColor: "var(--bg-surface-elevated)",
                      border: "1px solid var(--border-subtle)",
                      color: "var(--text-primary)",
                      fontSize: "0.85rem",
                    }}
                    value={equipmentStatus}
                    onChange={(e) => setEquipmentStatus(e.target.value)}
                  >
                    <option value="ACTIVE">ACTIVE (Operational)</option>
                    <option value="MAINTENANCE">MAINTENANCE (Repair)</option>
                    <option value="STANDBY">STANDBY (Reserve)</option>
                    <option value="RETIRED">RETIRED (Out of service)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                    Quantity
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={equipmentQuantity}
                    onChange={(e) => setEquipmentQuantity(Number(e.target.value) || 1)}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                  Notes (Optional)
                </label>
                <Input
                  placeholder="e.g. Parked in bay 3, key kept with manager"
                  value={equipmentNotes}
                  onChange={(e) => setEquipmentNotes(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
                <Button type="button" variant="secondary" onClick={() => setIsAssignEquipmentModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={!selectedEquipmentToAssign || assigningEquipment}
                  onClick={handleAssignEquipment}
                >
                  {assigningEquipment ? "Stationing..." : "Station Equipment"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Edit Facility Equipment Modal */}
      {isEditEquipmentModalOpen && editingEquipmentRecord && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "1rem",
          }}
        >
          <Card style={{ width: "100%", maxWidth: "480px", padding: "1.75rem" }}>
            <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.25rem" }}>
              Edit Stationed Equipment
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", marginBottom: "1.25rem" }}>
              Update location section, status, or quantity.
            </p>

            {editEquipmentError && (
              <div style={{ padding: "0.6rem 0.8rem", backgroundColor: "rgba(239, 68, 68, 0.15)", color: "var(--accent-rose)", borderRadius: "var(--radius-md)", fontSize: "0.82rem", marginBottom: "1rem" }}>
                {editEquipmentError}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                  Storage Section Location
                </label>
                <select
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.75rem",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "var(--bg-surface-elevated)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-primary)",
                    fontSize: "0.85rem",
                  }}
                  value={editingEquipmentSectionId}
                  onChange={(e) => setEditingEquipmentSectionId(e.target.value ? Number(e.target.value) : "")}
                >
                  <option value="">-- General Facility / Unassigned Section --</option>
                  {sections.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.sectionName} ({sec.sectionCode}) [{sec.type}]
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                    Operational Status
                  </label>
                  <select
                    style={{
                      width: "100%",
                      padding: "0.5rem 0.75rem",
                      borderRadius: "var(--radius-md)",
                      backgroundColor: "var(--bg-surface-elevated)",
                      border: "1px solid var(--border-subtle)",
                      color: "var(--text-primary)",
                      fontSize: "0.85rem",
                    }}
                    value={editingEquipmentStatus}
                    onChange={(e) => setEditingEquipmentStatus(e.target.value)}
                  >
                    <option value="ACTIVE">ACTIVE (Operational)</option>
                    <option value="MAINTENANCE">MAINTENANCE (Repair)</option>
                    <option value="STANDBY">STANDBY (Reserve)</option>
                    <option value="RETIRED">RETIRED (Out of service)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                    Quantity
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={editingEquipmentQuantity}
                    onChange={(e) => setEditingEquipmentQuantity(Number(e.target.value) || 1)}
                  />
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input
                  type="checkbox"
                  id="edit-equipment-is-active-cb"
                  checked={editingEquipmentIsActive}
                  onChange={(e) => setEditingEquipmentIsActive(e.target.checked)}
                  style={{ cursor: "pointer", width: "16px", height: "16px" }}
                />
                <label htmlFor="edit-equipment-is-active-cb" style={{ fontSize: "0.82rem", color: "var(--text-primary)", cursor: "pointer" }}>
                  Active at this facility
                </label>
              </div>

              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                  Notes
                </label>
                <Input
                  placeholder="e.g. Relocated to section B"
                  value={editingEquipmentNotes}
                  onChange={(e) => setEditingEquipmentNotes(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
                <Button type="button" variant="secondary" onClick={() => setIsEditEquipmentModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={savingEquipment}
                  onClick={handleUpdateFacilityEquipment}
                >
                  {savingEquipment ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Add Table Modal */}
      {isAddTableModalOpen && activeFacility && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "1rem",
          }}
        >
          <Card style={{ width: "100%", maxWidth: "480px", padding: "1.75rem" }}>
            <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.25rem" }}>
              Add Dining / Service Table
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", marginBottom: "1.25rem" }}>
              Create a seating or ordering table in <strong>{activeFacility.facilityName}</strong>.
            </p>

            {tableError && (
              <div style={{ padding: "0.6rem 0.8rem", backgroundColor: "rgba(239, 68, 68, 0.15)", color: "var(--accent-rose)", borderRadius: "var(--radius-md)", fontSize: "0.82rem", marginBottom: "1rem" }}>
                {tableError}
              </div>
            )}

            <form onSubmit={handleCreateTable} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                    Table Number / Code *
                  </label>
                  <Input
                    required
                    placeholder="e.g. T-01, 1, VIP-02"
                    value={newTableNumber}
                    onChange={(e) => setNewTableNumber(e.target.value.toUpperCase())}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                    Seating Capacity
                  </label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="e.g. 4"
                    value={newTableCapacity}
                    onChange={(e) => setNewTableCapacity(Number(e.target.value) || 1)}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                  Table Label / Description (Optional)
                </label>
                <Input
                  placeholder="e.g. Window Booth, Balcony 4-top, Bar Stool 2"
                  value={newTableLabel}
                  onChange={(e) => setNewTableLabel(e.target.value)}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                    Section Location
                  </label>
                  <select
                    style={{
                      width: "100%",
                      padding: "0.5rem 0.75rem",
                      borderRadius: "var(--radius-md)",
                      backgroundColor: "var(--bg-surface-elevated)",
                      border: "1px solid var(--border-subtle)",
                      color: "var(--text-primary)",
                      fontSize: "0.85rem",
                    }}
                    value={newTableSectionId}
                    onChange={(e) => setNewTableSectionId(e.target.value ? Number(e.target.value) : "")}
                  >
                    <option value="">-- General Seating (No Section) --</option>
                    {sections.map((sec) => (
                      <option key={sec.id} value={sec.id}>
                        {sec.sectionName} ({sec.sectionCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                    Initial Status
                  </label>
                  <select
                    style={{
                      width: "100%",
                      padding: "0.5rem 0.75rem",
                      borderRadius: "var(--radius-md)",
                      backgroundColor: "var(--bg-surface-elevated)",
                      border: "1px solid var(--border-subtle)",
                      color: "var(--text-primary)",
                      fontSize: "0.85rem",
                    }}
                    value={newTableStatus}
                    onChange={(e) => setNewTableStatus(e.target.value)}
                  >
                    <option value="AVAILABLE">AVAILABLE (🟢)</option>
                    <option value="OCCUPIED">OCCUPIED (🔴)</option>
                    <option value="RESERVED">RESERVED (🟡)</option>
                    <option value="OUT_OF_SERVICE">OUT OF SERVICE (⚪)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                  Notes (Optional)
                </label>
                <Input
                  placeholder="e.g. Has power socket for laptops"
                  value={newTableNotes}
                  onChange={(e) => setNewTableNotes(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
                <Button type="button" variant="secondary" onClick={() => setIsAddTableModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={savingTable || !newTableNumber.trim()}>
                  {savingTable ? "Creating..." : "Create Table"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Edit Table Modal */}
      {isEditTableModalOpen && editingTableRecord && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "1rem",
          }}
        >
          <Card style={{ width: "100%", maxWidth: "480px", padding: "1.75rem" }}>
            <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.25rem" }}>
              Edit Table {editingTableRecord.tableNumber}
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", marginBottom: "1.25rem" }}>
              Update table properties, capacity, section location, or status.
            </p>

            {editTableError && (
              <div style={{ padding: "0.6rem 0.8rem", backgroundColor: "rgba(239, 68, 68, 0.15)", color: "var(--accent-rose)", borderRadius: "var(--radius-md)", fontSize: "0.82rem", marginBottom: "1rem" }}>
                {editTableError}
              </div>
            )}

            <form onSubmit={handleUpdateTable} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                    Table Number / Code *
                  </label>
                  <Input
                    required
                    value={editingTableNumber}
                    onChange={(e) => setEditingTableNumber(e.target.value.toUpperCase())}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                    Seating Capacity
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={editingTableCapacity}
                    onChange={(e) => setEditingTableCapacity(Number(e.target.value) || 1)}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                  Table Label / Description
                </label>
                <Input
                  placeholder="e.g. Window Booth"
                  value={editingTableLabel}
                  onChange={(e) => setEditingTableLabel(e.target.value)}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                    Section Location
                  </label>
                  <select
                    style={{
                      width: "100%",
                      padding: "0.5rem 0.75rem",
                      borderRadius: "var(--radius-md)",
                      backgroundColor: "var(--bg-surface-elevated)",
                      border: "1px solid var(--border-subtle)",
                      color: "var(--text-primary)",
                      fontSize: "0.85rem",
                    }}
                    value={editingTableSectionId}
                    onChange={(e) => setEditingTableSectionId(e.target.value ? Number(e.target.value) : "")}
                  >
                    <option value="">-- General Seating (No Section) --</option>
                    {sections.map((sec) => (
                      <option key={sec.id} value={sec.id}>
                        {sec.sectionName} ({sec.sectionCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                    Operational Status
                  </label>
                  <select
                    style={{
                      width: "100%",
                      padding: "0.5rem 0.75rem",
                      borderRadius: "var(--radius-md)",
                      backgroundColor: "var(--bg-surface-elevated)",
                      border: "1px solid var(--border-subtle)",
                      color: "var(--text-primary)",
                      fontSize: "0.85rem",
                    }}
                    value={editingTableStatus}
                    onChange={(e) => setEditingTableStatus(e.target.value)}
                  >
                    <option value="AVAILABLE">AVAILABLE (🟢)</option>
                    <option value="OCCUPIED">OCCUPIED (🔴)</option>
                    <option value="RESERVED">RESERVED (🟡)</option>
                    <option value="OUT_OF_SERVICE">OUT OF SERVICE (⚪)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input
                  type="checkbox"
                  id="edit-table-is-active-cb"
                  checked={editingTableIsActive}
                  onChange={(e) => setEditingTableIsActive(e.target.checked)}
                  style={{ cursor: "pointer", width: "16px", height: "16px" }}
                />
                <label htmlFor="edit-table-is-active-cb" style={{ fontSize: "0.82rem", color: "var(--text-primary)", cursor: "pointer" }}>
                  Active at this facility
                </label>
              </div>

              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                  Notes
                </label>
                <Input
                  placeholder="e.g. Schedule or location notes"
                  value={editingTableNotes}
                  onChange={(e) => setEditingTableNotes(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
                <Button type="button" variant="secondary" onClick={() => setIsEditTableModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={savingEditTable || !editingTableNumber.trim()}>
                  {savingEditTable ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Table QR Code & Placard Modal */}
      {qrModalTable && activeFacility && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 110,
            padding: "1rem",
          }}
        >
          <Card style={{ width: "100%", maxWidth: "420px", padding: "1.75rem", textAlign: "center" }}>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.25rem" }}>
              🪑 Table {qrModalTable.tableNumber}
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", marginBottom: "1.25rem" }}>
              {activeFacility.facilityName} {qrModalTable.label ? `• ${qrModalTable.label}` : ""}
            </p>

            <div
              style={{
                backgroundColor: "#ffffff",
                padding: "1rem",
                borderRadius: "var(--radius-md)",
                display: "inline-block",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                marginBottom: "1rem",
              }}
            >
              {generatingQr ? (
                <div style={{ width: "256px", height: "256px", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}>
                  Generating QR Code...
                </div>
              ) : qrModalDataUrl ? (
                <img
                  src={qrModalDataUrl}
                  alt={`Table ${qrModalTable.tableNumber} QR`}
                  style={{ width: "256px", height: "256px", display: "block" }}
                />
              ) : (
                <div style={{ width: "256px", height: "256px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent-rose)" }}>
                  Failed to generate QR
                </div>
              )}
            </div>

            <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "1.25rem", lineHeight: 1.4 }}>
              Guests can scan this placard with any smartphone camera to open the menu and place orders directly to Table <strong>{qrModalTable.tableNumber}</strong>.
            </p>

            <div style={{ display: "flex", justifyContent: "center", gap: "0.75rem" }}>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  const origin = typeof window !== "undefined" ? window.location.origin : "";
                  const url = `${origin}/order/table?facilityId=${activeFacility.id}&tableNumber=${encodeURIComponent(qrModalTable.tableNumber)}`;
                  navigator.clipboard.writeText(url);
                  alert("Table order URL copied to clipboard!");
                }}
              >
                📋 Copy Link
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  const printWindow = window.open("", "_blank");
                  if (printWindow && qrModalDataUrl) {
                    printWindow.document.write(`
                      <html>
                        <head>
                          <title>Table ${qrModalTable.tableNumber} QR Placard</title>
                          <style>
                            body { font-family: system-ui, sans-serif; text-align: center; padding: 2rem; }
                            .placard { border: 2px solid #0f172a; border-radius: 16px; padding: 2rem; max-width: 340px; margin: 0 auto; }
                            h1 { font-size: 1.8rem; margin: 0 0 0.25rem; }
                            p { color: #64748b; margin: 0 0 1.5rem; }
                            img { width: 280px; height: 280px; }
                            .instructions { margin-top: 1rem; font-size: 0.85rem; color: #334155; }
                          </style>
                        </head>
                        <body>
                          <div class="placard">
                            <h1>TABLE ${qrModalTable.tableNumber}</h1>
                            <p>${activeFacility.facilityName}</p>
                            <img src="${qrModalDataUrl}" />
                            <div class="instructions">Scan to view menu & place your order</div>
                          </div>
                          <script>
                            window.onload = function() { window.print(); window.close(); };
                          </script>
                        </body>
                      </html>
                    `);
                    printWindow.document.close();
                  }
                }}
              >
                🖨️ Print Placard
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setQrModalTable(null)}
              >
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

