"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { productApi } from "@/lib/api";
import type { ProductCategoryItem } from "@pz/shared";

interface CategoryManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoriesChanged?: () => void;
}

export function CategoryManagementModal({
  isOpen,
  onClose,
  onCategoriesChanged,
}: CategoryManagementModalProps) {
  const [categories, setCategories] = useState<ProductCategoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [parentCategoryId, setParentCategoryId] = useState<number | "">("");
  const [description, setDescription] = useState("");
  const [editingCategory, setEditingCategory] = useState<ProductCategoryItem | null>(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await productApi.getCategories();
      setCategories(res.data || []);
    } catch (err: any) {
      console.error("Failed to load categories", err);
      setError(err?.message || "Failed to load categories.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      resetForm();
    }
  }, [isOpen, fetchCategories]);

  const resetForm = () => {
    setName("");
    setParentCategoryId("");
    setDescription("");
    setEditingCategory(null);
    setError(null);
    setSuccessMsg(null);
  };

  // Helper to compute depth (number of parent-child relation steps from root)
  const getCategoryDepth = useCallback(
    (cat: ProductCategoryItem): number => {
      let depth = 0;
      let currentParentId = cat.parentCategoryId;
      const visited = new Set<number>();
      while (currentParentId && !visited.has(currentParentId)) {
        visited.add(currentParentId);
        depth++;
        const parent = categories.find((c) => c.id === currentParentId);
        currentParentId = parent?.parentCategoryId;
      }
      return depth;
    },
    [categories]
  );

  // Helper to check if potentialDescendant is descendant of targetId
  const isDescendant = useCallback(
    (targetId: number, potentialDescendantId: number): boolean => {
      let currentId: number | null | undefined = potentialDescendantId;
      const visited = new Set<number>();
      while (currentId && !visited.has(currentId)) {
        visited.add(currentId);
        const current = categories.find((c) => c.id === currentId);
        if (current?.parentCategoryId === targetId) {
          return true;
        }
        currentId = current?.parentCategoryId;
      }
      return false;
    },
    [categories]
  );

  // Topologically sorted tree items for display
  const hierarchicalCategories = useMemo(() => {
    const depthMap = new Map<number, number>();
    categories.forEach((c) => {
      depthMap.set(c.id, getCategoryDepth(c));
    });

    const roots = categories.filter((c) => !c.parentCategoryId);
    const result: Array<{ category: ProductCategoryItem; depth: number }> = [];

    const appendChildren = (parentId: number, currentDepth: number) => {
      const children = categories
        .filter((c) => c.parentCategoryId === parentId)
        .sort((a, b) => a.categoryName.localeCompare(b.categoryName));

      for (const child of children) {
        result.push({ category: child, depth: currentDepth });
        appendChildren(child.id, currentDepth + 1);
      }
    };

    roots
      .sort((a, b) => a.categoryName.localeCompare(b.categoryName))
      .forEach((root) => {
        result.push({ category: root, depth: 0 });
        appendChildren(root.id, 1);
      });

    // In case of orphan disconnected categories, include them as well
    const addedIds = new Set(result.map((r) => r.category.id));
    categories.forEach((c) => {
      if (!addedIds.has(c.id)) {
        result.push({ category: c, depth: depthMap.get(c.id) || 0 });
      }
    });

    return result;
  }, [categories, getCategoryDepth]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Category name is required.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (editingCategory) {
        await productApi.updateCategory({
          id: editingCategory.id,
          categoryName: name.trim(),
          parentCategoryId: parentCategoryId ? Number(parentCategoryId) : null,
          description: description.trim() || null,
        });
        setSuccessMsg(`Category "${name.trim()}" updated successfully.`);
      } else {
        await productApi.createCategory({
          categoryName: name.trim(),
          parentCategoryId: parentCategoryId ? Number(parentCategoryId) : undefined,
          description: description.trim() || undefined,
        });
        setSuccessMsg(`Category "${name.trim()}" created successfully.`);
      }

      resetForm();
      await fetchCategories();
      onCategoriesChanged?.();
    } catch (err: any) {
      console.error("Category save error", err);
      setError(err?.message || "Failed to save category.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (cat: ProductCategoryItem) => {
    setEditingCategory(cat);
    setName(cat.categoryName);
    setParentCategoryId(cat.parentCategoryId ?? "");
    setDescription(cat.description || "");
    setError(null);
    setSuccessMsg(null);
  };

  const handleAddSubcategoryClick = (parentCat: ProductCategoryItem) => {
    const parentDepth = getCategoryDepth(parentCat);
    if (parentDepth >= 5) {
      setError(`Cannot add subcategory under "${parentCat.categoryName}": maximum hierarchy limit of 5 steps reached.`);
      return;
    }
    resetForm();
    setParentCategoryId(parentCat.id);
  };

  const handleDeleteClick = async (cat: ProductCategoryItem) => {
    if (!confirm(`Are you sure you want to delete category "${cat.categoryName}"?`)) {
      return;
    }

    setError(null);
    setSuccessMsg(null);
    try {
      await productApi.deleteCategory(cat.id);
      setSuccessMsg(`Category "${cat.categoryName}" deleted.`);
      await fetchCategories();
      onCategoriesChanged?.();
    } catch (err: any) {
      console.error("Failed to delete category", err);
      setError(err?.message || "Failed to delete category. It may have subcategories or assigned products.");
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 60,
        padding: "1rem",
      }}
    >
      <div style={{ width: "100%", maxWidth: "860px", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
        <Card glass style={{ padding: "1.75rem", backgroundColor: "var(--bg-surface)", display: "flex", flexDirection: "column", maxHeight: "90vh", overflow: "hidden" }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <h2 style={{ fontSize: "1.3rem", fontWeight: 700 }}>Category Management</h2>
                <Badge variant="info">Max 5 Steps Limit</Badge>
              </div>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                Organize product categories into a parent-child hierarchy (limited to at most 5 steps from root).
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={submitting}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-muted)",
                fontSize: "1.25rem",
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>

          {/* Feedback Alerts */}
          {error && (
            <div
              style={{
                padding: "0.75rem 1rem",
                backgroundColor: "rgba(244, 63, 94, 0.15)",
                border: "1px solid rgba(244, 63, 94, 0.3)",
                borderRadius: "var(--radius-md)",
                color: "var(--accent-rose)",
                fontSize: "0.85rem",
                marginBottom: "1rem",
              }}
            >
              {error}
            </div>
          )}

          {successMsg && (
            <div
              style={{
                padding: "0.75rem 1rem",
                backgroundColor: "rgba(16, 185, 129, 0.15)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                borderRadius: "var(--radius-md)",
                color: "var(--accent-emerald)",
                fontSize: "0.85rem",
                marginBottom: "1rem",
              }}
            >
              {successMsg}
            </div>
          )}

          {/* Two-Column Layout: Tree List on Left, Create/Edit Form on Right */}
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "1.25rem", flex: 1, minHeight: 0, overflow: "hidden" }}>
            {/* Left: Category Tree List */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                padding: "0.75rem",
                overflowY: "auto",
                backgroundColor: "rgba(0, 0, 0, 0.15)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                  Hierarchy Tree ({categories.length} total)
                </span>
                <Button size="sm" variant="ghost" onClick={resetForm}>
                  + New Root Category
                </Button>
              </div>

              {loading ? (
                <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", padding: "1rem" }}>Loading categories...</p>
              ) : hierarchicalCategories.length === 0 ? (
                <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
                  <p style={{ fontSize: "0.875rem" }}>No categories found.</p>
                  <p style={{ fontSize: "0.75rem", marginTop: "0.25rem" }}>Create your first category using the form on the right.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  {hierarchicalCategories.map(({ category: c, depth }) => {
                    const isSelected = editingCategory?.id === c.id;
                    const isMaxDepth = depth >= 5;

                    return (
                      <div
                        key={c.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "0.45rem 0.6rem",
                          paddingLeft: `${0.6 + depth * 1.1}rem`,
                          borderRadius: "var(--radius-sm)",
                          backgroundColor: isSelected ? "rgba(99, 102, 241, 0.2)" : "transparent",
                          border: isSelected ? "1px solid var(--primary)" : "1px solid transparent",
                          fontSize: "0.85rem",
                          transition: "background-color var(--transition-fast)",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", minWidth: 0, flex: 1 }}>
                          <span style={{ color: depth === 0 ? "var(--primary)" : "var(--text-muted)", fontSize: "0.8rem" }}>
                            {depth === 0 ? "📁" : "↳"}
                          </span>
                          <span
                            style={{
                              fontWeight: depth === 0 ? 600 : 500,
                              color: "var(--text-primary)",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {c.categoryName}
                          </span>
                          <span
                            style={{
                              fontSize: "0.7rem",
                              color: isMaxDepth ? "var(--accent-rose)" : "var(--text-muted)",
                              backgroundColor: isMaxDepth ? "rgba(244, 63, 94, 0.1)" : "rgba(255, 255, 255, 0.05)",
                              padding: "0.1rem 0.35rem",
                              borderRadius: "var(--radius-sm)",
                              whiteSpace: "nowrap",
                            }}
                          >
                            Step {depth}/5
                          </span>
                        </div>

                        <div style={{ display: "flex", gap: "0.25rem", alignItems: "center" }}>
                          <button
                            type="button"
                            title={isMaxDepth ? "Cannot add subcategory: max 5 steps reached" : "Add child subcategory"}
                            disabled={isMaxDepth}
                            onClick={() => handleAddSubcategoryClick(c)}
                            style={{
                              background: "none",
                              border: "none",
                              color: isMaxDepth ? "var(--text-muted)" : "var(--primary)",
                              cursor: isMaxDepth ? "not-allowed" : "pointer",
                              fontSize: "0.75rem",
                              padding: "0.15rem 0.35rem",
                              opacity: isMaxDepth ? 0.4 : 1,
                            }}
                          >
                            +Sub
                          </button>
                          <button
                            type="button"
                            title="Edit category"
                            onClick={() => handleEditClick(c)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "var(--text-secondary)",
                              cursor: "pointer",
                              fontSize: "0.75rem",
                              padding: "0.15rem 0.35rem",
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            title="Delete category"
                            onClick={() => handleDeleteClick(c)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "var(--accent-rose)",
                              cursor: "pointer",
                              fontSize: "0.75rem",
                              padding: "0.15rem 0.35rem",
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right: Category Form */}
            <form
              onSubmit={handleSubmit}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.9rem",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                padding: "1rem",
                backgroundColor: "rgba(0, 0, 0, 0.1)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontSize: "0.95rem", fontWeight: 600 }}>
                  {editingCategory ? `Edit: ${editingCategory.categoryName}` : "Add Category"}
                </h3>
                {editingCategory && (
                  <button
                    type="button"
                    onClick={resetForm}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--text-muted)",
                      fontSize: "0.75rem",
                      cursor: "pointer",
                    }}
                  >
                    Switch to Add
                  </button>
                )}
              </div>

              <Input
                id="cat-name-input"
                label="Category Name *"
                placeholder="e.g. Building Materials or Portland Cement"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                <label style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--text-secondary)" }}>
                  Parent Category (Optional)
                </label>
                <select
                  id="cat-parent-select"
                  value={parentCategoryId}
                  onChange={(e) => setParentCategoryId(e.target.value ? Number(e.target.value) : "")}
                  style={{
                    width: "100%",
                    padding: "0.55rem 0.75rem",
                    backgroundColor: "var(--bg-surface)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-md)",
                    color: "var(--text-primary)",
                    fontSize: "0.875rem",
                    outline: "none",
                  }}
                >
                  <option value="">None (Root Category — 0 steps)</option>
                  {hierarchicalCategories.map(({ category: c, depth }) => {
                    // When editing, cannot choose self or descendants (cycle prevention)
                    if (editingCategory && (c.id === editingCategory.id || isDescendant(editingCategory.id, c.id))) {
                      return null;
                    }

                    // A category already at 5 steps cannot be a parent (adding under it would make depth 6)
                    const cannotBeParent = depth >= 5;

                    return (
                      <option
                        key={c.id}
                        value={c.id}
                        disabled={cannotBeParent}
                      >
                        {"— ".repeat(depth)}${c.categoryName} (${depth}/5 steps)${cannotBeParent ? " [MAX REACHED]" : ""}
                      </option>
                    );
                  })}
                </select>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  Parent-child chain cannot exceed 5 steps from root.
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                <label style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--text-secondary)" }}>
                  Description (Optional)
                </label>
                <textarea
                  id="cat-desc-input"
                  placeholder="Category specifications or details..."
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.55rem 0.75rem",
                    backgroundColor: "var(--bg-surface)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-md)",
                    color: "var(--text-primary)",
                    fontSize: "0.875rem",
                    outline: "none",
                    resize: "vertical",
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "auto" }}>
                {editingCategory && (
                  <Button type="button" variant="ghost" size="sm" onClick={resetForm} disabled={submitting}>
                    Cancel
                  </Button>
                )}
                <Button id="cat-submit-btn" type="submit" size="sm" disabled={submitting}>
                  {submitting ? "Saving..." : editingCategory ? "Update Category" : "Create Category"}
                </Button>
              </div>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
}
