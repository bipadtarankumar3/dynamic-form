'use client';

import React, { useState, useEffect } from "react";
import { Card, Button, Steps, Space, Tag, App, Checkbox, Modal, Form, Input, Spin } from "antd";
import { ArrowLeftOutlined, SaveOutlined, SendOutlined, EyeOutlined } from "@ant-design/icons";
import { privateHttpClient } from "@/services/api/httpClient";

import Step1SelectTable, { step1ValidationSchema } from "./components/wizard/Step1SelectTable";
import Step2SelectRelations from "./components/wizard/Step2SelectRelations";
import Step3SelectFields from "./components/wizard/Step3SelectFields";
import Step4ConfigureChildTable from "./components/wizard/Step4ConfigureChildTable";
import Step5ViewOptions from "./components/wizard/Step5ViewOptions";
import Step6PreviewView from "./components/wizard/Step6PreviewView";
import AddFieldModal from "./components/wizard/AddFieldModal";
import "./database-views.css";

const API_BASE = "configurator/database-views";

export default function DatabaseViewWizard({ initialData = null, onClose = () => { }, onSuccess = () => { } }) {
  const { message } = App.useApp();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [step1Errors, setStep1Errors] = useState({});

  // Step 3 Drag & Alias Edit State
  const [draggedFieldIdx, setDraggedFieldIdx] = useState(null);
  const [editingField, setEditingField] = useState(null);
  const [editAliasModalOpen, setEditAliasModalOpen] = useState(false);
  const [tempAliasValue, setTempAliasValue] = useState("");

  const moveSelectedField = (fromIdx, toIdx) => {
    if (toIdx < 0 || toIdx >= selectedFields.length) return;
    const updated = [...selectedFields];
    const [moved] = updated.splice(fromIdx, 1);
    updated.splice(toIdx, 0, moved);
    setSelectedFields(updated);
  };

  const moveChildField = (fromIdx, toIdx) => {
    if (!currentActiveChild || toIdx < 0 || toIdx >= (currentActiveChild.fields || []).length) return;
    const realChildIdx = childConfigs.findIndex(c => c.child_table === currentActiveChild.child_table);
    if (realChildIdx === -1) return;

    const newConfigs = [...childConfigs];
    const fields = [...newConfigs[realChildIdx].fields];
    const [moved] = fields.splice(fromIdx, 1);
    fields.splice(toIdx, 0, moved);
    newConfigs[realChildIdx].fields = fields;
    setChildConfigs(newConfigs);
  };

  const moveSubChildField = (childIdx, subChildIdx, fromIdx, toIdx) => {
    if (childIdx < 0 || childIdx >= childConfigs.length) return;
    const sc = childConfigs[childIdx].sub_children?.[subChildIdx];
    if (!sc) return;
    const currentFields = sc.fields || (sc.columns || []).map(c => ({ field: c.column_name, alias: formatAlias(c.column_name), type: c.data_type }));
    if (toIdx < 0 || toIdx >= currentFields.length) return;

    const newConfigs = [...childConfigs];
    const fields = [...currentFields];
    const [moved] = fields.splice(fromIdx, 1);
    fields.splice(toIdx, 0, moved);
    newConfigs[childIdx].sub_children[subChildIdx].fields = fields;
    setChildConfigs(newConfigs);
  };

  // Step 1: View Info State
  const [viewInfo, setViewInfo] = useState({
    view_name: initialData?.view_name || "",
    database_view_name: initialData?.database_view_name || "",
    description: initialData?.description || "",
    schema_name: "public",
    view_type: initialData?.view_type || "STANDARD"
  });

  // Available Tables & Base Table State
  const [tablesList, setTablesList] = useState([]);
  const [selectedBaseTable, setSelectedBaseTable] = useState(initialData?.base_table || "");

  // Discovery Metadata State
  const [relData, setRelData] = useState({
    base_table: initialData?.base_table || "",
    primary_key: "id",
    columns: [],
    many_to_one: [],
    one_to_many: [],
    user_audit: []
  });
  const [selectedRels, setSelectedRels] = useState({});

  // Step 2: Persistent Diagram Canvas State across Wizard Navigation Steps
  const [activeParentL2, setActiveParentL2] = useState(null);
  const [activeParentL3, setActiveParentL3] = useState(null);
  const [col1Masters, setCol1Masters] = useState([]);
  const [col2Masters, setCol2Masters] = useState([]);
  const [col3Masters, setCol3Masters] = useState([]);

  // 100% Dynamic API Table Schema Cache: { [tableName]: { columns: [...], many_to_one: [...], one_to_many: [...] } }
  const [tableCache, setTableCache] = useState({});
  const [loadingTables, setLoadingTables] = useState({});

  const fetchTableMetadata = async (tableName) => {
    if (!tableName || tableCache[tableName] || loadingTables[tableName]) return;
    try {
      setLoadingTables(prev => ({ ...prev, [tableName]: true }));
      const res = await privateHttpClient.get(`${API_BASE}/schema/tables/${tableName}`);
      if (res.data?.success && res.data.data) {
        setTableCache(prev => ({
          ...prev,
          [tableName]: res.data.data
        }));
      }
    } catch (err) {
      console.warn(`Dynamic API schema fetch notice for ${tableName}:`, err);
    } finally {
      setLoadingTables(prev => ({ ...prev, [tableName]: false }));
    }
  };

  // Automatically fetch real API schema whenever active tables change
  useEffect(() => {
    if (activeParentL2) fetchTableMetadata(activeParentL2);
    if (activeParentL3) fetchTableMetadata(activeParentL3);
    col1Masters.forEach(m => fetchTableMetadata(m.tableName));
    col2Masters.forEach(m => fetchTableMetadata(m.tableName));
    col3Masters.forEach(m => fetchTableMetadata(m.tableName));
  }, [activeParentL2, activeParentL3, col1Masters, col2Masters, col3Masters]);

  // Step 3: Fields State
  const [selectedFields, setSelectedFields] = useState(initialData?.selected_fields || []);
  const [searchAvailableField, setSearchAvailableField] = useState("");

  // Step 4: Child Table Config State
  const [childConfigs, setChildConfigs] = useState(initialData?.child_tables || []);
  const [activeChildIndex, setActiveChildIndex] = useState(0);
  const [isAddFieldModalOpen, setIsAddFieldModalOpen] = useState(false);
  const [selectedFieldToAdd, setSelectedFieldToAdd] = useState("");

  // Step 5: Options State
  const [userAuditConfig, setUserAuditConfig] = useState(initialData?.user_audit || {
    created_by: { included: true, name: true, email: true, mobile: false, department: false },
    updated_by: { included: true, name: true, email: true, mobile: false, department: false },
    created_at: true,
    updated_at: true,
    deleted_at: false
  });

  const [filters, setFilters] = useState(initialData?.filters || []);
  const [sorting, setSorting] = useState(initialData?.sorting || []);

  const [viewOptions, setViewOptions] = useState(initialData?.options || {
    pageSize: 20,
    showExport: true,
    showCreate: true,
    showEdit: true,
    showDelete: false,
    groupMain: true,
    groupChild: true
  });

  // Load backend tables metadata on mount
  useEffect(() => {
    fetchTables();
  }, []);

  // Whenever Base Table changes, fetch real schema relationships
  useEffect(() => {
    if (selectedBaseTable) {
      fetchRelationships(selectedBaseTable);
    } else {
      setRelData({
        base_table: "",
        primary_key: "id",
        columns: [],
        many_to_one: [],
        one_to_many: [],
        user_audit: []
      });
    }
  }, [selectedBaseTable]);

  const fetchTables = async () => {
    try {
      setLoading(true);
      const res = await privateHttpClient.get(`${API_BASE}/schema/tables`);
      if (res.data?.success) {
        setTablesList(res.data.data || []);
      }
    } catch (err) {
      message.error("Failed to fetch database tables");
    } finally {
      setLoading(false);
    }
  };

  const fetchRelationships = async (tableName) => {
    try {
      setLoading(true);
      const res = await privateHttpClient.get(`${API_BASE}/schema/tables/${tableName}`);
      if (res.data?.success) {
        const data = res.data.data;
        setRelData(data);

        // Initialize selected relationships, respecting initialData's saved selected_rels
        const savedRels = initialData?.selected_rels || initialData?.configuration_json?.selected_rels;
        const initialSelectedRels = {};
        if (savedRels) {
          (data.many_to_one || []).forEach(r => {
            if (savedRels[r.key] !== undefined) initialSelectedRels[r.key] = savedRels[r.key];
            if (savedRels[r.target_table] !== undefined) initialSelectedRels[r.target_table] = savedRels[r.target_table];
          });
          (data.one_to_many || []).forEach(r => {
            const key = r.key || `child__${r.child_table}`;
            if (savedRels[key] !== undefined) initialSelectedRels[key] = savedRels[key];
            if (savedRels[r.child_table] !== undefined) initialSelectedRels[r.child_table] = savedRels[r.child_table];
          });
          (data.user_audit || []).forEach(r => {
            if (savedRels[r.key] !== undefined) initialSelectedRels[r.key] = savedRels[r.key];
          });
        }
        // Auto-hydrate ERD diagram canvas cards when editing an existing view
        if (initialData) {
          const savedManyToOne = initialData.many_to_one || initialData.configuration_json?.many_to_one || [];
          const savedChildren = initialData.child_tables || initialData.configuration_json?.child_tables || [];
          const savedUserAudit = initialData.user_audit || initialData.configuration_json?.user_audit || {};

          // 1. Auto-open Level 2 Parent Table if saved
          const parentRel = savedManyToOne.find(r => r.relationship_type === "PARENT" || r.source_column === "parent_id");
          const parentL2Table = initialData.active_parent_l2 || initialData.configuration_json?.active_parent_l2 || parentRel?.target_table || null;
          if (parentL2Table) {
            setActiveParentL2(parentL2Table);
          }

          const parentL3Table = initialData.active_parent_l3 || initialData.configuration_json?.active_parent_l3;
          if (parentL3Table) {
            setActiveParentL3(parentL3Table);
          }

          // 2. Auto-open saved Master & Child Table Cards below Column 1 (ONLY if source is base table)
          const baseTbl = data.base_table || selectedBaseTable;
          const savedC1 = initialData.col1_masters || initialData.configuration_json?.col1_masters;
          if (savedC1 && Array.isArray(savedC1)) {
            setCol1Masters(savedC1);
          } else {
            const c1Masters = [];
            savedManyToOne.forEach(r => {
              const isBaseTableRel = !r.source_table || r.source_table === baseTbl;
              const isNotParent = r.target_table !== parentL2Table && r.target_table !== parentL3Table;
              if (isBaseTableRel && r.target_table && isNotParent && (savedRels?.[r.target_table] || r.included)) {
                if (!c1Masters.some(m => m.tableName === r.target_table)) {
                  c1Masters.push({ tableName: r.target_table, label: r.target_table, type: "master", source_column: r.source_column });
                }
              }
            });

            savedChildren.forEach(ch => {
              if (ch.child_table && (savedRels?.[ch.child_table] || ch.included)) {
                if (!c1Masters.some(m => m.tableName === ch.child_table)) {
                  c1Masters.push({ tableName: ch.child_table, label: ch.child_table, type: "child" });
                }
              }
            });

            if ((savedUserAudit.created_by?.included || savedRels?.["users_created_by"] || savedRels?.["created_by"]) && !c1Masters.some(m => m.tableName === "users")) {
              c1Masters.push({ tableName: "users", label: "users (Created By)", type: "master" });
            }

            setCol1Masters(c1Masters);
          }

          // 3. Auto-open saved Col 2 Masters / Col 3 Masters
          const savedC2 = initialData.col2_masters || initialData.configuration_json?.col2_masters;
          if (savedC2 && Array.isArray(savedC2)) {
            setCol2Masters(savedC2);
          } else if (parentL2Table) {
            const derivedC2 = [];
            savedManyToOne.forEach(r => {
              if (r.source_table === parentL2Table && r.target_table && r.target_table !== parentL2Table && r.target_table !== parentL3Table) {
                if (!derivedC2.some(m => m.tableName === r.target_table)) {
                  derivedC2.push({ tableName: r.target_table, label: r.target_table, type: "master", source_column: r.source_column });
                }
              }
            });
            if (derivedC2.length > 0) setCol2Masters(derivedC2);
          }

          const savedC3 = initialData.col3_masters || initialData.configuration_json?.col3_masters;
          if (savedC3 && Array.isArray(savedC3)) {
            setCol3Masters(savedC3);
          } else if (parentL3Table) {
            const derivedC3 = [];
            savedManyToOne.forEach(r => {
              if (r.source_table === parentL3Table && r.target_table && r.target_table !== parentL3Table) {
                if (!derivedC3.some(m => m.tableName === r.target_table)) {
                  derivedC3.push({ tableName: r.target_table, label: r.target_table, type: "master", source_column: r.source_column });
                }
              }
            });
            if (derivedC3.length > 0) setCol3Masters(derivedC3);
          }
        }

        // Only set default selected fields if creating new view and fields currently empty
        if (!initialData && selectedFields.length === 0) {
          const fields = [];
          let sortIdx = 1;

          (data.columns || []).forEach(c => {
            if (!c.column_name.endsWith("_at") && c.column_name !== "created_by" && c.column_name !== "updated_by") {
              fields.push({
                id: `base_${c.column_name}`,
                field: c.column_name,
                source: data.base_table,
                table: data.base_table,
                alias: formatAlias(c.column_name),
                data_type: c.data_type,
                sort_order: sortIdx++
              });
            }
          });

          setSelectedFields(fields);
        }

        // Configure Child Tables dynamically from PostgreSQL metadata!
        setChildConfigs(prev => {
          const existingMap = new Map(prev.map(c => [c.child_table, c]));
          const mergedChildren = (data.one_to_many || []).map(ch => {
            const existing = existingMap.get(ch.child_table);
            if (existing) {
              return {
                ...existing,
                all_columns: ch.columns || [],
                sub_children: ch.sub_children || existing.sub_children || [],
                child_masters: ch.child_masters || existing.child_masters || []
              };
            }
            return {
              key: ch.key || `child__${ch.child_table}`,
              child_table: ch.child_table,
              child_foreign_key: ch.child_foreign_key,
              parent_column: ch.parent_column,
              enabled: true,
              display_type: "table",
              title: formatAlias(ch.child_table),
              sort_by: (ch.columns || [])[0]?.column_name || "id",
              sort_order: "DESC",
              all_columns: ch.columns || [],
              sub_children: ch.sub_children || [],
              child_masters: ch.child_masters || [],
              fields: (ch.columns || [])
                .filter(c => c.column_name !== "id" && c.column_name !== ch.child_foreign_key && !c.column_name.endsWith("_at") && c.column_name !== "created_by" && c.column_name !== "updated_by")
                .map(c => ({
                  field: c.column_name,
                  alias: formatAlias(c.column_name),
                  type: c.data_type,
                  width: "30%"
                }))
            };
          });
          return mergedChildren;
        });
      }
    } catch (err) {
      message.error("Failed to load schema details for table " + tableName);
    } finally {
      setLoading(false);
    }
  };

  const formatAlias = (name) => {
    if (!name) return "";
    return name
      .replace(/_/g, " ")
      .replace(/\b\w/g, l => l.toUpperCase())
      .replace(/^T Frm /, "");
  };

  // Helper: Filter child configs to ONLY include child tables checked in Step 2
  const activeChildConfigs = childConfigs.filter(ch => {
    const key = ch.key || `child__${ch.child_table}`;
    return selectedRels[key] !== false && selectedRels[ch.child_table] !== false;
  });
  const currentActiveChild = activeChildConfigs[activeChildIndex] || activeChildConfigs[0];
  const currentRealChildIdx = childConfigs.findIndex(c => c.child_table === currentActiveChild?.child_table);

  const buildConfigObject = () => {
    const activeManyToOne = (relData.many_to_one || [])
      .filter(r => selectedRels[r.key] === true || selectedRels[r.target_table] === true)
      .map(r => ({ ...r, source_table: r.source_table || selectedBaseTable, included: true }));

    // Include Column 2 Parent table if active & selected
    if (activeParentL2 && selectedRels[activeParentL2] !== false) {
      if (!activeManyToOne.some(r => r.target_table === activeParentL2 && (!r.source_table || r.source_table === selectedBaseTable))) {
        activeManyToOne.push({
          key: `parent_id__${activeParentL2}`,
          source_table: selectedBaseTable,
          source_column: "parent_id",
          target_table: activeParentL2,
          target_column: "id",
          relationship_type: "PARENT",
          included: true
        });
      }
    }

    // Include Column 3 Parent table if active & selected
    if (activeParentL3 && selectedRels[activeParentL3] !== false && activeParentL2) {
      if (!activeManyToOne.some(r => r.target_table === activeParentL3)) {
        activeManyToOne.push({
          key: `parent_id__${activeParentL3}`,
          source_table: activeParentL2,
          source_column: "parent_id",
          target_table: activeParentL3,
          target_column: "id",
          relationship_type: "PARENT",
          included: true
        });
      }
    }

    // Include Column 1 Masters (belonging to selectedBaseTable)
    col1Masters.forEach(m => {
      if (selectedRels[m.tableName] === false || m.type === "child") return;
      if (activeManyToOne.some(r => r.target_table === m.tableName && (!r.source_table || r.source_table === selectedBaseTable))) return;

      const savedRel = (initialData?.many_to_one || initialData?.configuration_json?.many_to_one || []).find(r =>
        (!r.source_table || r.source_table === selectedBaseTable) && r.target_table === m.tableName
      );
      const m2o = (relData.many_to_one || []).find(r => r.target_table === m.tableName);
      let srcCol = savedRel?.source_column || m2o?.source_column || m.source_column;
      if (!srcCol) {
        const clean = m.tableName.replace(/^t_(frm|mst)_/, "");
        const matchedCol = (relData.columns || []).find(c => c.column_name === `${clean}_id` || c.column_name === clean || c.column_name.includes(clean));
        srcCol = matchedCol?.column_name;
      }

      // Ensure srcCol exists on base table before creating a join
      const colExists = (relData.columns || []).some(c => c.column_name === srcCol);
      if (!srcCol || !colExists) {
        return;
      }

      activeManyToOne.push({
        key: `${srcCol}__${m.tableName}`,
        source_table: selectedBaseTable,
        source_column: srcCol,
        target_table: m.tableName,
        target_column: savedRel?.target_column || m2o?.target_column || "id",
        relationship_type: "MASTER",
        included: true
      });
    });

    // Include Column 2 Masters (for Parent Table activeParentL2)
    if (activeParentL2) {
      col2Masters.forEach(m => {
        if (selectedRels[m.tableName] === false || m.type === "child") return;
        if (activeManyToOne.some(r => r.target_table === m.tableName && r.source_table === activeParentL2)) return;

        const savedRel = (initialData?.many_to_one || initialData?.configuration_json?.many_to_one || []).find(r =>
          r.source_table === activeParentL2 && r.target_table === m.tableName
        );
        const p2Schema = tableCache[activeParentL2] || {};
        const m2o = (p2Schema.many_to_one || []).find(r => r.target_table === m.tableName);
        let srcCol = savedRel?.source_column || m2o?.source_column || m.source_column;
        if (!srcCol) {
          const clean = m.tableName.replace(/^t_(frm|mst)_/, "");
          const p2Cols = p2Schema.columns || [];
          const matchedCol = p2Cols.find(c =>
            c.column_name === `${clean}_id` ||
            c.column_name === clean ||
            c.column_name.includes(clean) ||
            clean.includes(c.column_name.replace(/_id$/, ""))
          );
          srcCol = matchedCol?.column_name;
        }

        if (!srcCol) return;

        activeManyToOne.push({
          key: `${activeParentL2}__${srcCol}__${m.tableName}`,
          source_table: activeParentL2,
          source_column: srcCol,
          target_table: m.tableName,
          target_column: savedRel?.target_column || m2o?.target_column || "id",
          relationship_type: "MASTER",
          included: true
        });
      });
    }

    // Include Column 3 Masters (for Parent Table activeParentL3)
    if (activeParentL3) {
      col3Masters.forEach(m => {
        if (selectedRels[m.tableName] === false || m.type === "child") return;
        if (activeManyToOne.some(r => r.target_table === m.tableName && r.source_table === activeParentL3)) return;

        const savedRel = (initialData?.many_to_one || initialData?.configuration_json?.many_to_one || []).find(r =>
          r.source_table === activeParentL3 && r.target_table === m.tableName
        );
        const p3Schema = tableCache[activeParentL3] || {};
        const m2o = (p3Schema.many_to_one || []).find(r => r.target_table === m.tableName);
        let srcCol = savedRel?.source_column || m2o?.source_column || m.source_column;
        if (!srcCol) {
          const clean = m.tableName.replace(/^t_(frm|mst)_/, "");
          const p3Cols = p3Schema.columns || [];
          const matchedCol = p3Cols.find(c => c.column_name === `${clean}_id` || c.column_name === clean || c.column_name.includes(clean));
          srcCol = matchedCol?.column_name;
        }

        if (!srcCol) return;

        activeManyToOne.push({
          key: `${activeParentL3}__${srcCol}__${m.tableName}`,
          source_table: activeParentL3,
          source_column: srcCol,
          target_table: m.tableName,
          target_column: savedRel?.target_column || m2o?.target_column || "id",
          relationship_type: "MASTER",
          included: true
        });
      });
    }

    const activeChildTables = childConfigs
      .filter(ch => {
        const key = ch.key || `child__${ch.child_table}`;
        return (selectedRels[key] === true || selectedRels[ch.child_table] === true) && ch.enabled !== false;
      })
      .map(ch => ({ ...ch, included: true, enabled: true }));

    const activeUserAudit = {
      created_by: { included: selectedRels["users_created_by"] === true || selectedRels["created_by"] === true || selectedRels["users"] === true },
      updated_by: { included: selectedRels["users_updated_by"] === true || selectedRels["updated_by"] === true }
    };

    const checkedTables = new Set([
      selectedBaseTable,
      ...(activeParentL2 && selectedRels[activeParentL2] !== false ? [activeParentL2] : []),
      ...(activeParentL3 && selectedRels[activeParentL3] !== false ? [activeParentL3] : []),
      ...col1Masters.filter(m => selectedRels[m.tableName] !== false).map(m => m.tableName),
      ...col2Masters.filter(m => selectedRels[m.tableName] !== false).map(m => m.tableName),
      ...col3Masters.filter(m => selectedRels[m.tableName] !== false).map(m => m.tableName),
      ...activeManyToOne.map(r => r.target_table),
      ...(activeUserAudit.created_by.included ? ["users"] : []),
      ...(activeUserAudit.updated_by.included ? ["users"] : [])
    ]);

    const activeSelectedFields = selectedFields.filter(f => !f.table || checkedTables.has(f.table));

    return {
      view_name: viewInfo.view_name,
      view_slug: viewInfo.database_view_name,
      database_view_name: viewInfo.database_view_name,
      base_collection: selectedBaseTable ? "formdatas" : "formdatas",
      form_slug: selectedBaseTable,
      base_table: selectedBaseTable,
      description: viewInfo.description,
      schema_name: viewInfo.schema_name,
      view_type: viewInfo.view_type,
      many_to_one: activeManyToOne,
      child_tables: activeChildTables,
      user_audit: activeUserAudit,
      selected_fields: activeSelectedFields,
      filters: filters.filter(f => f.field),
      sorting: sorting.filter(s => s.field),
      options: viewOptions,
      selected_rels: selectedRels,
      active_parent_l2: activeParentL2,
      active_parent_l3: activeParentL3,
      col1_masters: col1Masters,
      col2_masters: col2Masters,
      col3_masters: col3Masters
    };
  };

  const validateAllSteps = () => {
    // 1. Step 1 Validation
    if (!viewInfo.view_name?.trim()) {
      message.warning("Step 1: Please enter a valid View Name.");
      setCurrentStep(0);
      return false;
    }
    if (!viewInfo.database_view_name?.trim()) {
      message.warning("Step 1: Please enter a valid View Code (Slug).");
      setCurrentStep(0);
      return false;
    }
    if (!selectedBaseTable) {
      message.warning("Step 1: Please select a Base Table.");
      setCurrentStep(0);
      return false;
    }

    // 2. Step 3 (Fields) Validation
    if (selectedFields.length === 0) {
      message.warning("Step 3: Please select at least one field for the view.");
      setCurrentStep(2);
      return false;
    }

    // Duplicate alias check for base view fields
    const aliasMap = new Map();
    for (const f of selectedFields) {
      const alias = (f.alias || f.field || '').trim().toLowerCase();
      if (!alias) {
        message.warning(`Step 3: Field "${f.field}" has an empty alias.`);
        setCurrentStep(2);
        return false;
      }
      if (aliasMap.has(alias)) {
        message.warning(`Step 3: Duplicate alias "${f.alias || f.field}" detected. Every field alias must be unique.`);
        setCurrentStep(2);
        return false;
      }
      aliasMap.set(alias, f.field);
    }

    // 3. Step 4 (Child Tables) Validation
    for (const ch of activeChildConfigs) {
      if (!ch.fields || ch.fields.length === 0) {
        message.warning(`Step 4: Child table "${ch.title || ch.child_table}" must have at least one field selected.`);
        setCurrentStep(3);
        return false;
      }
      const childAliasMap = new Map();
      for (const cf of ch.fields) {
        const cAlias = (cf.alias || cf.field || '').trim().toLowerCase();
        if (!cAlias) {
          message.warning(`Step 4: Field "${cf.field}" in child table "${ch.title || ch.child_table}" has an empty alias.`);
          setCurrentStep(3);
          return false;
        }
        if (childAliasMap.has(cAlias)) {
          message.warning(`Step 4: Duplicate alias "${cf.alias || cf.field}" in child table "${ch.title || ch.child_table}".`);
          setCurrentStep(3);
          return false;
        }
        childAliasMap.set(cAlias, cf.field);
      }
    }

    return true;
  };

  const handleCreateView = async () => {
    if (!validateAllSteps()) return;
    try {
      setLoading(true);
      const configObj = buildConfigObject();
      const res = await privateHttpClient.post(API_BASE, configObj);
      if (res.data?.success) {
        message.success(`Database View "${configObj.view_slug || configObj.database_view_name}" saved successfully!`);
        onSuccess();
      }
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to create database view");
    } finally {
      setLoading(false);
    }
  };

  const handleAddFieldToActiveChild = () => {
    if (!selectedFieldToAdd) {
      message.warning("Please select a field to add");
      return;
    }
    const currentChild = activeChildConfigs[activeChildIndex] || activeChildConfigs[0];
    if (!currentChild) return;

    const realChildIdx = childConfigs.findIndex(c => c.child_table === currentChild.child_table);
    if (realChildIdx === -1) return;

    let fieldName = selectedFieldToAdd;
    let sourceTable = currentChild.child_table;
    let dataType = "text";

    if (selectedFieldToAdd.startsWith("col__")) {
      fieldName = selectedFieldToAdd.replace("col__", "");
      const colMeta = (currentChild.all_columns || []).find(c => c.column_name === fieldName);
      dataType = colMeta?.data_type || "text";
    } else if (selectedFieldToAdd.startsWith("master__")) {
      const parts = selectedFieldToAdd.split("__");
      const srcCol = parts[1];
      const targetTbl = parts[2];
      const realColName = parts[3];
      fieldName = realColName;
      sourceTable = targetTbl;

      const cm = (currentChild.child_masters || []).find(m => m.source_column === srcCol && m.target_table === targetTbl);
      const cmc = (cm?.columns || []).find(c => c.column_name === realColName);
      dataType = cmc?.data_type || "text";
    }

    const existing = (currentChild.fields || []).find(f => f.field === fieldName && (f.source_table || currentChild.child_table) === sourceTable);
    if (existing) {
      message.info("Field already exists in child configuration");
      return;
    }

    const newFieldObj = {
      field: fieldName,
      alias: formatAlias(fieldName),
      type: dataType,
      source_table: sourceTable,
      width: "30%"
    };

    const newChildren = [...childConfigs];
    newChildren[realChildIdx].fields = [...(newChildren[realChildIdx].fields || []), newFieldObj];
    setChildConfigs(newChildren);

    setSelectedFieldToAdd("");
    setIsAddFieldModalOpen(false);
    message.success(`Added field "${fieldName}" to ${currentChild.title}`);
  };

  const stepsList = [
    { title: "Create New View" },
    { title: "Select Related Tables" },
    { title: "Select Fields" },
    { title: `Configure Child Table (${childConfigs[activeChildIndex]?.title || 'Child'})` },
    { title: "Set Filters & Options" },
    { title: "Preview View" }
  ];

  const handleNext = async () => {
    // Step 0: Create View validation
    if (currentStep === 0) {
      try {
        await step1ValidationSchema.validate(
          {
            view_name: viewInfo.view_name,
            database_view_name: viewInfo.database_view_name,
            base_table: selectedBaseTable,
          },
          { abortEarly: false }
        );
        setStep1Errors({});
      } catch (err) {
        if (err.inner) {
          const errObj = {};
          err.inner.forEach(e => {
            if (!errObj[e.path]) errObj[e.path] = e.message;
          });
          setStep1Errors(errObj);
          message.warning("Please complete all required fields in Step 1.");
          return;
        }
      }
    }

    // Step 2: Select Fields validation
    if (currentStep === 2) {
      if (selectedFields.length === 0) {
        message.warning("Please select at least one field in Step 3 before proceeding.");
        return;
      }

      // Check for duplicate aliases
      const aliasMap = new Map();
      for (const f of selectedFields) {
        const alias = (f.alias || f.field || '').trim().toLowerCase();
        if (!alias) {
          message.warning(`Field "${f.field}" has an empty alias. Please enter an alias.`);
          return;
        }
        if (aliasMap.has(alias)) {
          message.warning(`Duplicate alias "${f.alias || f.field}" detected. Field aliases must be unique.`);
          return;
        }
        aliasMap.set(alias, f.field);
      }
    }

    // Step 3: Child Table validation
    if (currentStep === 3) {
      for (const ch of activeChildConfigs) {
        if (!ch.fields || ch.fields.length === 0) {
          message.warning(`Child table "${ch.title || ch.child_table}" must have at least one field.`);
          return;
        }
        const childAliasMap = new Map();
        for (const cf of ch.fields) {
          const cAlias = (cf.alias || cf.field || '').trim().toLowerCase();
          if (childAliasMap.has(cAlias)) {
            message.warning(`Duplicate alias "${cf.alias || cf.field}" in child table "${ch.title || ch.child_table}".`);
            return;
          }
          childAliasMap.set(cAlias, cf.field);
        }
      }
    }

    if (currentStep < stepsList.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  // Helper to render columns list with checkboxes for any table in Available Fields accordion
  const renderTableFields = (tableName, cols = []) => {
    const isLoading = loadingTables[tableName];
    if (isLoading && (!cols || cols.length === 0)) {
      return (
        <div style={{ padding: "12px", textAlign: "center" }}>
          <Spin size="small" /> <span style={{ marginLeft: "8px", fontSize: "12px", color: "#64748b" }}>Loading columns for {tableName}...</span>
        </div>
      );
    }
    const filteredCols = (cols || []).filter(c =>
      c.column_name?.toLowerCase().includes(searchAvailableField.toLowerCase())
    );

    if (filteredCols.length === 0) {
      return (
        <span className="db-empty-text" style={{ padding: "8px", display: "block" }}>
          {cols.length === 0 ? `No columns found for ${tableName}` : "No matching fields"}
        </span>
      );
    }

    return (
      <div className="db-flex-col-gap">
        {filteredCols.map((col) => {
          const isSel = selectedFields.some(f => f.table === tableName && f.field === col.column_name);
          return (
            <div key={col.column_name} className="db-field-item-row">
              <Checkbox
                checked={isSel}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedFields(prev => [
                      ...prev,
                      {
                        id: `${tableName}_${col.column_name}`,
                        field: col.column_name,
                        table: tableName,
                        alias: formatAlias(col.column_name),
                        data_type: col.data_type
                      }
                    ]);
                  } else {
                    setSelectedFields(prev => prev.filter(f => !(f.table === tableName && f.field === col.column_name)));
                  }
                }}
              >
                <span className="db-field-mono">{col.column_name}</span>
              </Checkbox>
              <div className="db-flex-center-gap">
                <Tag className="db-field-tag">
                  {col.data_type}
                </Tag>
                <Checkbox checked={isSel} readOnly className="db-pointer-none" />
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Build accordion items for Available Fields (Left Panel in Step 3)
  const addedTableKeys = new Set();

  const collapseItems = [
    {
      key: "base",
      label: (
        <span className="db-table-title-main">
          {selectedBaseTable || "Base Table"} <span className="db-table-title-sub">(Base Table)</span>
        </span>
      ),
      children: (
        <div className="db-flex-col-gap">
          {(relData.columns || []).length === 0 ? (
            <span className="db-empty-text">Select a Base Table in Step 1 first</span>
          ) : (
            (relData.columns || [])
              .filter(c => c.column_name.toLowerCase().includes(searchAvailableField.toLowerCase()))
              .map((col) => {
                const isSel = selectedFields.some(f => f.table === selectedBaseTable && f.field === col.column_name);
                return (
                  <div key={col.column_name} className="db-field-item-row">
                    <Checkbox
                      checked={isSel}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedFields(prev => [...prev, {
                            id: `base_${col.column_name}`,
                            field: col.column_name,
                            table: selectedBaseTable,
                            alias: formatAlias(col.column_name),
                            data_type: col.data_type
                          }]);
                        } else {
                          setSelectedFields(prev => prev.filter(f => !(f.table === selectedBaseTable && f.field === col.column_name)));
                        }
                      }}
                    >
                      <span className="db-field-mono">{col.column_name}</span>
                    </Checkbox>
                    <div className="db-flex-center-gap">
                      <Tag className="db-field-tag">
                        {col.data_type}
                      </Tag>
                      <Checkbox checked={isSel} readOnly className="db-pointer-none" />
                    </div>
                  </div>
                );
              })
          )}
        </div>
      )
    },
    ...(relData.many_to_one || [])
      .filter(rel => {
        const isIncluded = selectedRels[rel.key] === true || selectedRels[rel.target_table] === true || (rel.target_table === activeParentL2 && selectedRels[activeParentL2] !== false);
        if (isIncluded) {
          addedTableKeys.add(rel.target_table);
          return true;
        }
        return false;
      })
      .map(rel => {
        const cols = rel.columns || tableCache[rel.target_table]?.columns || [];
        return {
          key: rel.key || `m2o_${rel.target_table}`,
          label: (
            <span className="db-table-title-main">
              {rel.target_table} <span className="db-table-title-sub">({formatAlias(rel.target_table)})</span>
            </span>
          ),
          children: renderTableFields(rel.target_table, cols)
        };
      }),
    // Level 2 Parent table if not added above
    ...(activeParentL2 && selectedRels[activeParentL2] !== false && !addedTableKeys.has(activeParentL2) ? (() => {
      addedTableKeys.add(activeParentL2);
      return [{
        key: `parent_${activeParentL2}`,
        label: (
          <span className="db-table-title-main" style={{ color: "#059669" }}>
            {activeParentL2} <span className="db-table-title-sub">(Parent Table - Col 2)</span>
          </span>
        ),
        children: renderTableFields(activeParentL2, tableCache[activeParentL2]?.columns || [])
      }];
    })() : []),
    // Column 1 Masters
    ...col1Masters
      .filter(m => selectedRels[m.tableName] !== false && !addedTableKeys.has(m.tableName) && m.type !== "child")
      .map(m => {
        addedTableKeys.add(m.tableName);
        const cols = tableCache[m.tableName]?.columns || [];
        return {
          key: `col1_master_${m.tableName}`,
          label: (
            <span className="db-table-title-main" style={{ color: "#7c3aed" }}>
              {m.tableName} <span className="db-table-title-sub">({formatAlias(m.tableName)} - Col 1 Master)</span>
            </span>
          ),
          children: renderTableFields(m.tableName, cols)
        };
      }),
    // Column 2 Masters for Parent Table (e.g. t_frm_schedule_vii, t_frm_vertical)
    ...col2Masters
      .filter(m => selectedRels[m.tableName] !== false && !addedTableKeys.has(m.tableName) && m.type !== "child")
      .map(m => {
        addedTableKeys.add(m.tableName);
        const cols = tableCache[m.tableName]?.columns || [];
        return {
          key: `col2_master_${m.tableName}`,
          label: (
            <span className="db-table-title-main" style={{ color: "#7c3aed" }}>
              {m.tableName} <span className="db-table-title-sub">({formatAlias(m.tableName)} - Master for {activeParentL2})</span>
            </span>
          ),
          children: renderTableFields(m.tableName, cols)
        };
      }),
    // Level 3 Parent table
    ...(activeParentL3 && selectedRels[activeParentL3] !== false && !addedTableKeys.has(activeParentL3) ? (() => {
      addedTableKeys.add(activeParentL3);
      return [{
        key: `parent_${activeParentL3}`,
        label: (
          <span className="db-table-title-main" style={{ color: "#059669" }}>
            {activeParentL3} <span className="db-table-title-sub">(Parent Table - Col 3)</span>
          </span>
        ),
        children: renderTableFields(activeParentL3, tableCache[activeParentL3]?.columns || [])
      }];
    })() : []),
    // Column 3 Masters
    ...col3Masters
      .filter(m => selectedRels[m.tableName] !== false && !addedTableKeys.has(m.tableName) && m.type !== "child")
      .map(m => {
        addedTableKeys.add(m.tableName);
        const cols = tableCache[m.tableName]?.columns || [];
        return {
          key: `col3_master_${m.tableName}`,
          label: (
            <span className="db-table-title-main" style={{ color: "#7c3aed" }}>
              {m.tableName} <span className="db-table-title-sub">({formatAlias(m.tableName)} - Master for {activeParentL3})</span>
            </span>
          ),
          children: renderTableFields(m.tableName, cols)
        };
      }),
    ...(selectedRels["users_created_by"] === true || selectedRels["created_by"] === true || selectedRels["users"] === true ? [{
      key: "users_created_by",
      label: (
        <span className="db-table-title-main">
          users - Created By
        </span>
      ),
      children: (
        <div className="db-flex-col-gap">
          {["id", "name", "email", "mobile", "department"].map(field => {
            const isSel = selectedFields.some(f => f.table === "users" && f.source_rel === "created_by" && f.field === field);
            return (
              <div key={field} className="db-field-item-row">
                <Checkbox
                  checked={isSel}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedFields(prev => [...prev, {
                        id: `users_cb_${field}`,
                        field: field,
                        table: "users",
                        source_rel: "created_by",
                        alias: `Created By ${formatAlias(field)}`,
                        data_type: field === "id" ? "integer" : "varchar"
                      }]);
                    } else {
                      setSelectedFields(prev => prev.filter(f => !(f.table === "users" && f.source_rel === "created_by" && f.field === field)));
                    }
                  }}
                >
                  <span className="db-field-mono">{field}</span>
                </Checkbox>
                <div className="db-flex-center-gap">
                  <Tag className="db-field-tag">
                    {field === "id" ? "integer" : "varchar"}
                  </Tag>
                  <Checkbox checked={isSel} readOnly className="db-pointer-none" />
                </div>
              </div>
            );
          })}
        </div>
      )
    }] : []),
    ...(selectedRels["users_updated_by"] === true || selectedRels["updated_by"] === true ? [{
      key: "users_updated_by",
      label: (
        <span className="db-table-title-main">
          users - Updated By
        </span>
      ),
      children: (
        <div className="db-flex-col-gap">
          {["id", "name", "email", "mobile", "department"].map(field => {
            const isSel = selectedFields.some(f => f.table === "users" && f.source_rel === "updated_by" && f.field === field);
            return (
              <div key={field} className="db-field-item-row">
                <Checkbox
                  checked={isSel}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedFields(prev => [...prev, {
                        id: `users_ub_${field}`,
                        field: field,
                        table: "users",
                        source_rel: "updated_by",
                        alias: `Updated By ${formatAlias(field)}`,
                        data_type: field === "id" ? "integer" : "varchar"
                      }]);
                    } else {
                      setSelectedFields(prev => prev.filter(f => !(f.table === "users" && f.source_rel === "updated_by" && f.field === field)));
                    }
                  }}
                >
                  <span className="db-field-mono">{field}</span>
                </Checkbox>
                <div className="db-flex-center-gap">
                  <Tag className="db-field-tag">
                    {field === "id" ? "integer" : "varchar"}
                  </Tag>
                  <Checkbox checked={isSel} readOnly className="db-pointer-none" />
                </div>
              </div>
            );
          })}
        </div>
      )
    }] : []),
    ...(relData.one_to_many || [])
      .filter(rel => selectedRels[rel.key] === true || selectedRels[rel.child_table] === true)
      .flatMap(rel => (rel.sub_children || []).map(sc => ({
        key: `sub_child__${sc.child_table}`,
        label: (
          <span className="db-table-title-cyan">
            {sc.child_table} <span className="db-table-title-sub">({sc.child_table})</span>
          </span>
        ),
        children: (
          <div className="db-flex-col-gap">
            {(sc.columns || []).map(col => {
              const isSel = selectedFields.some(f => f.table === sc.child_table && f.field === col.column_name);
              return (
                <div key={col.column_name} className="db-field-item-row">
                  <Checkbox
                    checked={isSel}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedFields(prev => [...prev, {
                          id: `${sc.child_table}_${col.column_name}`,
                          field: col.column_name,
                          table: sc.child_table,
                          parent_child_table: rel.child_table,
                          is_sub_child: true,
                          alias: formatAlias(col.column_name),
                          data_type: col.data_type
                        }]);
                      } else {
                        setSelectedFields(prev => prev.filter(f => !(f.table === sc.child_table && f.field === col.column_name)));
                      }
                    }}
                  >
                    <span className="db-field-mono-cyan">{col.column_name}</span>
                  </Checkbox>
                  <div className="db-flex-center-gap">
                    <Tag className="db-field-tag-cyan">
                      {col.data_type}
                    </Tag>
                    <Checkbox checked={isSel} readOnly className="db-pointer-none" />
                  </div>
                </div>
              );
            })}
          </div>
        )
      })))
  ];

  const handleSaveDraft = async () => {
    try {
      setLoading(true);
      const configObj = { ...buildConfigObject(), is_draft: true, status: "DRAFT" };
      const res = await privateHttpClient.post(API_BASE, configObj);
      if (res.data?.success) {
        message.success("Draft view configuration saved successfully!");
      }
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to save draft");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAllRels = (selectAll) => {
    const newRels = { ...selectedRels };
    const { many_to_one = [], one_to_many = [], user_audit = [] } = relData;
    [...many_to_one, ...one_to_many, ...user_audit].forEach(rel => {
      if (rel.key) {
        newRels[rel.key] = selectAll;
      }
    });
    setSelectedRels(newRels);
  };

  const handleSelectAllBaseFields = () => {
    const allBaseCols = (relData.columns || []).map(c => ({
      id: `base_${c.column_name}`,
      field: c.column_name,
      table: selectedBaseTable,
      alias: formatAlias(c.column_name),
      data_type: c.data_type
    }));
    setSelectedFields(allBaseCols);
  };

  return (
    <div className="db-wizard-container">

      {/* 2-TIER TOP HEADER BAR MATCHING USER MOCKUP */}
      <div className="db-wizard-header-sticky">
        {/* Tier 1: Title & Main Action Buttons */}
        <div className="db-wizard-header-tier1">
          {/* Left Side: Back Arrow, Title, Status Tag */}
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <Button
              type="text"
              icon={<ArrowLeftOutlined style={{ fontSize: "16px", color: "#334155" }} />}
              onClick={onClose}
              className="db-wizard-back-btn"
            />
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span className="db-wizard-title">
                {viewInfo.view_name || "New Database View"}
              </span>
              <Tag color={initialData?.status === "DRAFT" ? "gold" : "green"} className="db-wizard-status-tag">
                {initialData?.status === "DRAFT" ? "DRAFT" : "PUBLISHED"}
              </Tag>
            </div>
          </div>

          {/* Right Side: Action Buttons */}
          <Space size="small">
            <Button
              size="middle"
              icon={<EyeOutlined />}
              onClick={() => setCurrentStep(5)}
              className="db-wizard-action-btn"
            >
              Preview
            </Button>

            <Button
              size="middle"
              icon={<SaveOutlined />}
              loading={loading}
              onClick={handleSaveDraft}
              className="db-wizard-action-btn"
            >
              Save Draft
            </Button>

            <Button
              type="primary"
              size="middle"
              icon={<SendOutlined style={{ color: "#ffffff" }} />}
              loading={loading}
              onClick={handleCreateView}
              className="db-wizard-publish-btn"
            >
              Publish
            </Button>
          </Space>
        </div>

        {/* Tier 2: Dedicated Full-Width Stepper Navigation Bar */}
        <div className="db-wizard-header-tier2">
          <Steps
            size="small"
            current={currentStep}
            onChange={(step) => {
              if (step > 0 && (!viewInfo.view_name?.trim() || !selectedBaseTable)) {
                message.warning("Please complete Step 1 (View Name & Base Table) first.");
                setCurrentStep(0);
                return;
              }
              if (step > 2 && selectedFields.length === 0) {
                message.warning("Please select at least one field in Step 3 first.");
                setCurrentStep(2);
                return;
              }
              setCurrentStep(step);
            }}
            items={stepsList.map((s, idx) => ({
              title: (
                <span style={{ fontWeight: currentStep === idx ? 700 : 500, fontSize: "13px", cursor: "pointer" }}>
                  {s.title}
                </span>
              )
            }))}
          />
        </div>
      </div>

      {/* MAIN CONTAINER TAKING 100% FULL WIDTH */}
      <div className="db-wizard-main-content">
        <Card
          className="db-wizard-card-wrapper"
          styles={{ body: { padding: "24px 28px" } }}
        >
          {currentStep === 0 && (
            <Step1SelectTable
              viewInfo={viewInfo}
              setViewInfo={setViewInfo}
              tablesList={tablesList}
              selectedBaseTable={selectedBaseTable}
              setSelectedBaseTable={setSelectedBaseTable}
              errors={step1Errors}
              setErrors={setStep1Errors}
            />
          )}

          {currentStep === 1 && (
            <Step2SelectRelations
              selectedBaseTable={selectedBaseTable}
              relData={relData}
              selectedRels={selectedRels}
              setSelectedRels={setSelectedRels}
              handleToggleAllRels={handleToggleAllRels}
              activeParentL2={activeParentL2}
              setActiveParentL2={setActiveParentL2}
              activeParentL3={activeParentL3}
              setActiveParentL3={setActiveParentL3}
              col1Masters={col1Masters}
              setCol1Masters={setCol1Masters}
              col2Masters={col2Masters}
              setCol2Masters={setCol2Masters}
              col3Masters={col3Masters}
              setCol3Masters={setCol3Masters}
              tableCache={tableCache}
              setTableCache={setTableCache}
              loadingTables={loadingTables}
              fetchTableMetadata={fetchTableMetadata}
            />
          )}

          {currentStep === 2 && (
            <Step3SelectFields
              selectedFields={selectedFields}
              setSelectedFields={setSelectedFields}
              searchAvailableField={searchAvailableField}
              setSearchAvailableField={setSearchAvailableField}
              handleSelectAllBaseFields={handleSelectAllBaseFields}
              draggedFieldIdx={draggedFieldIdx}
              setDraggedFieldIdx={setDraggedFieldIdx}
              moveSelectedField={moveSelectedField}
              collapseItems={collapseItems}
              activeChildConfigs={activeChildConfigs}
              formatAlias={formatAlias}
              setActiveChildIndex={setActiveChildIndex}
              setCurrentStep={setCurrentStep}
              setEditingField={setEditingField}
              setTempAliasValue={setTempAliasValue}
              setEditAliasModalOpen={setEditAliasModalOpen}
            />
          )}

          {currentStep === 3 && (
            <Step4ConfigureChildTable
              activeChildConfigs={activeChildConfigs}
              activeChildIndex={activeChildIndex}
              setActiveChildIndex={setActiveChildIndex}
              currentActiveChild={currentActiveChild}
              currentRealChildIdx={currentRealChildIdx}
              childConfigs={childConfigs}
              setChildConfigs={setChildConfigs}
              formatAlias={formatAlias}
              moveChildField={moveChildField}
              moveSubChildField={moveSubChildField}
              setIsAddFieldModalOpen={setIsAddFieldModalOpen}
              setEditingField={setEditingField}
              setTempAliasValue={setTempAliasValue}
              setEditAliasModalOpen={setEditAliasModalOpen}
            />
          )}

          {currentStep === 4 && (
            <Step5ViewOptions
              relData={relData}
              filters={filters}
              setFilters={setFilters}
              sorting={sorting}
              setSorting={setSorting}
              viewOptions={viewOptions}
              setViewOptions={setViewOptions}
              viewInfo={viewInfo}
              childConfigs={childConfigs}
            />
          )}

          {currentStep === 5 && (
            <Step6PreviewView
              viewInfo={viewInfo}
              selectedFields={selectedFields}
              activeChildConfigs={activeChildConfigs}
              formatAlias={formatAlias}
              loading={loading}
              handleCreateView={handleCreateView}
              setCurrentStep={setCurrentStep}
              buildConfigObject={buildConfigObject}
            />
          )}
        </Card>
      </div>

      {/* PINNED STICKY FOOTER BAR - ALWAYS VISIBLE AT BOTTOM OF SCREEN */}
      <div className="db-wizard-footer-sticky">
        <Button
          size="middle"
          onClick={currentStep === 0 ? onClose : handlePrev}
          style={{ borderRadius: "8px", fontWeight: 600, padding: "0 20px" }}
        >
          {currentStep === 0 ? "Cancel" : "← Back"}
        </Button>

        <Space size="middle">
          <Button
            size="middle"
            icon={<SaveOutlined />}
            loading={loading}
            onClick={handleSaveDraft}
            style={{ borderRadius: "8px", fontWeight: 600, borderColor: "#cbd5e1" }}
          >
            Save Draft
          </Button>

          {currentStep < stepsList.length - 1 ? (
            <Button
              type="primary"
              size="middle"
              onClick={handleNext}
              style={{ borderRadius: "8px", background: "#4f46e5", borderColor: "#4f46e5", padding: "0 28px", fontWeight: 700 }}
            >
              Next →
            </Button>
          ) : (
            <Button
              type="primary"
              size="middle"
              className="db-wizard-publish-btn"
              icon={<SendOutlined />}
              loading={loading}
              onClick={handleCreateView}
              style={{
                borderRadius: "8px",
                padding: "0 28px",
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              Publish & Exit
            </Button>
          )}
        </Space>
      </div>

      {/* DYNAMIC ADD FIELD TO CHILD TABLE MODAL */}
      <AddFieldModal
        open={isAddFieldModalOpen}
        onOk={handleAddFieldToActiveChild}
        onCancel={() => setIsAddFieldModalOpen(false)}
        currentActiveChild={currentActiveChild}
        selectedFieldToAdd={selectedFieldToAdd}
        setSelectedFieldToAdd={setSelectedFieldToAdd}
      />

      {/* EDIT FIELD ALIAS MODAL */}
      <Modal
        title={`Edit Field Alias (${editingField?.field || ''})`}
        open={editAliasModalOpen}
        onOk={() => {
          if (editingField) {
            setSelectedFields(prev => prev.map(f => f.id === editingField.id ? { ...f, alias: tempAliasValue } : f));
          }
          setEditAliasModalOpen(false);
          message.success("Field alias updated successfully");
        }}
        onCancel={() => setEditAliasModalOpen(false)}
        okText="Save Alias"
      >
        <div className="db-modal-padding">
          <Form layout="vertical">
            <Form.Item label="Original Field Name">
              <Input value={editingField?.field} disabled className="db-field-mono" />
            </Form.Item>
            <Form.Item label="Source Table">
              <Input value={editingField?.table} disabled className="db-field-mono" />
            </Form.Item>
            <Form.Item label="Display Alias *">
              <Input
                value={tempAliasValue}
                onChange={(e) => setTempAliasValue(e.target.value)}
                placeholder="Enter display alias..."
                autoFocus
              />
            </Form.Item>
          </Form>
        </div>
      </Modal>

    </div>
  );
}
