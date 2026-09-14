"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  DownloadOutlined, PlusOutlined, UnorderedListOutlined, AppstoreOutlined
} from "@ant-design/icons";
import { Button, Input, Tabs, Tag } from "antd";
import {
  dynamicGeneralExportExcel,
  dynamicGeneralListViewAPI
} from "@/services/dynamicForm-service";
import { getDynamicFormHooks } from "../../hooks/dynamicFormHookRegistry";
import GeneralTableRender from "./GeneralTableRender";
import DefaultGridCardRender from "./components/DefaultGridCardRender";
import DynamicFormModals from "./components/DynamicFormModals";
import { buildColumnsOptimized } from "./helper/buildColumnWithData.helper";
import { useSearchParams } from "@/hooks/useNextRouter";
import { hasModulePermissions } from "@/context/PermissionContext";
import ProjectHeaderCard from "@/modules/project/ProjectHeaderCard";

const getFieldValue = (row, fieldKey) => {
  if (!row || !fieldKey) return undefined;
  let val = row[fieldKey];
  if (val === undefined || val === null) {
    const lowerKey = fieldKey.toLowerCase();
    const foundKey = Object.keys(row).find((k) => k.toLowerCase() === lowerKey);
    if (foundKey) val = row[foundKey];
  }
  if (val && typeof val === "object") {
    if (val.value !== undefined) return val.value;
    if (val.label !== undefined) return val.label;
    if (val.name !== undefined) return val.name;
  }
  return val;
};

const evaluateCondition = (row, cond) => {
  if (!cond || !cond.field) return true;
  const rawValue = getFieldValue(row, cond.field);
  const targetVal = cond.value;
  const op = (cond.operator || "equals").toLowerCase();

  if (op === "is_not_empty") {
    return rawValue !== null && rawValue !== undefined && String(rawValue).trim() !== "";
  }
  if (op === "is_empty") {
    return rawValue === null || rawValue === undefined || String(rawValue).trim() === "";
  }

  const strRow = rawValue !== undefined && rawValue !== null ? String(rawValue).trim().toLowerCase() : "";
  const strTarget = targetVal !== undefined && targetVal !== null ? String(targetVal).trim().toLowerCase() : "";

  switch (op) {
    case "equals":
    case "=":
    case "eq":
      return strRow === strTarget;

    case "not_equals":
    case "!=":
    case "neq":
      return strRow !== strTarget;

    case "gt":
    case ">":
      return Number(rawValue) > Number(targetVal);

    case "gte":
    case ">=":
      return Number(rawValue) >= Number(targetVal);

    case "lt":
    case "<":
      return Number(rawValue) < Number(targetVal);

    case "lte":
    case "<=":
      return Number(rawValue) <= Number(targetVal);

    case "contains":
      return strRow.includes(strTarget);

    default:
      return strRow === strTarget;
  }
};

const matchesTab = (row, tab) => {
  if (!tab || tab.id === "ALL" || tab.key === "ALL") return true;
  const conditions = Array.isArray(tab.conditions) && tab.conditions.length > 0
    ? tab.conditions
    : (tab.field ? [{ field: tab.field, operator: tab.operator || "equals", value: tab.value || "" }] : []);

  if (conditions.length === 0) return true;

  if (tab.match_type === "ANY") {
    return conditions.some((cond) => evaluateCondition(row, cond));
  } else {
    return conditions.every((cond) => evaluateCondition(row, cond));
  }
};

/**
 * Dynamic General List View Component
 * Provides standard DB fetching, custom page hooks, and fallback Table/Grid views
 */
const DynamicGeneralListView = ({ form_slug, parent_id, parent_slug, slug_list = {} }) => {
  const { general_list_view_url } = slug_list;
  const [searchParams] = useSearchParams();
  const ctx = searchParams.get("ctx");
  const decoded = useMemo(() => {
    if (!ctx) return null;
    try {
      return JSON.parse(atob(ctx));
    } catch {
      return null;
    }
  }, [ctx]);

  const formRef = useRef(null);
  const [formSlug, setFormSlug] = useState(form_slug || decoded?.form_slug);

  useEffect(() => {
    if (form_slug) setFormSlug(form_slug);
  }, [form_slug]);

  const [urlListAPI, setUrlListAPI] = useState({
    general_list_view_excel_url_API: null,
    details_url_API: null,
    view_url_API: null,
  });
  
  const perms = hasModulePermissions(formSlug);

  // Schema & Data States
  const [columns, setColumns] = useState([]);
  const [schema, setSchema] = useState({});
  const [rows, setRows] = useState(null);
  const [actions, setActions] = useState([]);
  const [total, setTotal] = useState(0);

  // Controls States
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState(null);
  const [pageSize, setPageSize] = useState(10);
  const [dataFetchLoading, setDataFetchLoading] = useState(false);
  const [viewLayout, setViewLayout] = useState("table"); // "table" | "grid"
  const [activeActionTabKey, setActiveActionTabKey] = useState("ALL");
  const [serverTabCounts, setServerTabCounts] = useState({});

  // Modal States
  const [mode, setMode] = useState("add");
  const [selectedData, setSelectedData] = useState({});
  const [openDynamicAddEditForm, setOpenDynamicAddEditForm] = useState(false);
  const [openDynamicViewForm, setOpenDynamicViewForm] = useState(false);

  // Children Modal State
  const [childrenInformation, setChildrenInformation] = useState({
    parent_primary_key: null,
    parent_primary_key_value: null,
    form_slug: null,
  });

  const targetFormSlug = formSlug || decoded?.form_slug;

  // Action Tabs List & Active Tab Resolution
  const actionTabsList = useMemo(() => {
    if (!schema?.enable_action_tabs || !Array.isArray(schema?.action_tabs) || schema.action_tabs.length === 0) {
      return [];
    }
    return schema.action_tabs;
  }, [schema]);

  const activeTab = useMemo(() => {
    if (activeActionTabKey === "ALL") return null;
    return actionTabsList.find((t, idx) => (t.id || `tab_${idx}`) === activeActionTabKey);
  }, [activeActionTabKey, actionTabsList]);

  const handleTabChange = (key) => {
    setActiveActionTabKey(key);
    setPage(1);
  };

  // ── Step 1: Fully Custom Page Hook (100% Manual Developer Control) ──
  const earlyFormHooks = getDynamicFormHooks(targetFormSlug);
  if (earlyFormHooks?.fullyCustomPage) {
    const fullyCustomRes = earlyFormHooks.fullyCustomPage({
      form_slug: targetFormSlug,
      searchParams,
      decoded,
      parent_id
    });
    if (fullyCustomRes) return fullyCustomRes;
  }

  // ── Step 2: Fetch Schema & Records from Backend (Server-Side Action Tab Filtered) ──
  const fetchData = async () => {
    if (!targetFormSlug) return;
    setDataFetchLoading(true);

    const payload = {
      form_slug: targetFormSlug,
      filters: { search },
      pagination: { current_page: page, page_size: pageSize },
      ...(sort && { sort }),
      ...(parent_id && { parent_id }),
      ...(parent_slug && { parent_slug }),
      action_tab_id: activeActionTabKey,
      action_tab: activeTab,
    };

    try {
      const targetUrl = typeof general_list_view_url === "string" && general_list_view_url ? general_list_view_url : "dynamic-form/general-list-view";
      const response = await dynamicGeneralListViewAPI(targetUrl, payload);
      const respData = response?.data?.data || response?.data || {};
      const fetchedRows = Array.isArray(respData.rows)
        ? respData.rows
        : (Array.isArray(response?.data?.rows) ? response.data.rows : (Array.isArray(respData) ? respData : (Array.isArray(respData.data) ? respData.data : [])));
      const fetchedSchema = respData.schema || response?.data?.schema || {};
      const fetchedActions = respData.actions || fetchedSchema?.actions || [];
      const fetchedTotal = respData.total_count !== undefined ? respData.total_count : (respData.total !== undefined ? respData.total : (response?.data?.total_count || fetchedRows.length));

      setSchema(fetchedSchema);
      setActions(fetchedActions);
      setRows(fetchedRows);
      setTotal(fetchedTotal);

      if (respData.tab_counts && typeof respData.tab_counts === "object") {
        setServerTabCounts(respData.tab_counts);
      }

      const builtCols = buildColumnsOptimized(
        fetchedSchema,
        respData.columns || fetchedSchema?.columns || [],
        fetchedRows,
        targetFormSlug
      );

      const finalCols = earlyFormHooks?.getColumns
        ? earlyFormHooks.getColumns({ defaultColumns: builtCols, schema: fetchedSchema })
        : builtCols;

      setColumns(finalCols);

      if (respData.general_list_view_excel_url_API || respData.details_url_API || respData.view_url_API) {
        setUrlListAPI({
          general_list_view_excel_url_API: respData.general_list_view_excel_url_API,
          details_url_API: respData.details_url_API,
          view_url_API: respData.view_url_API,
        });
      }
    } catch (error) {
      console.error("Dynamic General List View Fetch Error:", error);
    } finally {
      setDataFetchLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [targetFormSlug, page, pageSize, search, sort, activeActionTabKey]);

  // Modal Handlers
  const handleOpenDynamicAddEditForm = ({ data = {}, mode: m = "add" }) => {
    if (Object.keys(data || {}).length > 0) {
      setSelectedData({
        [schema?.root_entity?.primary_key || "id"]: data[schema?.root_entity?.primary_key || "id"],
      });
    }
    if (parent_id) {
      setChildrenInformation({
        parent_primary_key: "parent_id",
        parent_primary_key_value: parent_id,
        form_slug: targetFormSlug,
      });
    }
    setMode(m);
    setOpenDynamicAddEditForm(true);
  };

  const handleCloseDynamicAddEditForm = () => {
    setOpenDynamicAddEditForm(false);
    setSelectedData({});
  };

  const handleOpenDynamicViewForm = ({ data = {} }) => {
    setSelectedData({
      [schema?.root_entity?.primary_key || "id"]: data[schema?.root_entity?.primary_key || "id"],
    });
    setOpenDynamicViewForm(true);
  };

  const handleOpenChildrenAddEditForm = ({ data = {}, mode: m = "add", action }) => {
    const parentPk = schema?.root_entity?.primary_key || "id";
    const parentPkValue = data[parentPk];
    const childFormSlug = action?.child_form_slug || action?.form_details?.form_slug || action?.slug;

    setChildrenInformation({
      parent_primary_key: parentPk,
      parent_primary_key_value: parentPkValue,
      form_slug: childFormSlug,
    });
    setMode(m);
    setSelectedData({});
    setOpenDynamicAddEditForm(true);
  };

  const getModalWidth = () => {
    const raw = schema?.modal_size || schema?.root_entity?.modal_size;
    if (!raw) return 1350;
    if (raw === "100vw" || raw === "full" || raw === "full_width") return "96vw";
    if (raw === "600" || raw === "sm" || raw === "small") return 600;
    if (raw === "900" || raw === "md" || raw === "medium") return 900;
    if (raw === "1200" || raw === "lg" || raw === "large") return 1200;
    const parsed = parseInt(raw, 10);
    return isNaN(parsed) ? 1350 : parsed;
  };

  useEffect(() => {
    if (activeActionTabKey !== "ALL" && actionTabsList.length > 0) {
      const exists = actionTabsList.some((t, idx) => (t.id || `tab_${idx}`) === activeActionTabKey);
      if (!exists) {
        setActiveActionTabKey("ALL");
      }
    }
  }, [actionTabsList, activeActionTabKey]);

  const tabCounts = useMemo(() => {
    if (serverTabCounts && Object.keys(serverTabCounts).length > 0) {
      return serverTabCounts;
    }
    if (!actionTabsList.length || !rows) return {};
    const counts = { ALL: total || (rows ? rows.length : 0) };
    actionTabsList.forEach((tab, idx) => {
      const key = tab.id || `tab_${idx}`;
      counts[key] = (rows || []).filter((r) => matchesTab(r, tab)).length;
    });
    return counts;
  }, [serverTabCounts, actionTabsList, rows, total]);

  const tabItems = useMemo(() => {
    if (!schema?.enable_action_tabs || !actionTabsList.length) return [];

    const allCount = tabCounts["ALL"] !== undefined ? tabCounts["ALL"] : (total || (rows?.length || 0));

    const items = [
      {
        key: "ALL",
        label: (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: activeActionTabKey === "ALL" ? 700 : 500 }}>
            <span>All Records</span>
            <Tag color={activeActionTabKey === "ALL" ? "blue" : "default"} style={{ borderRadius: 10, margin: 0, fontSize: 11, fontWeight: 700 }}>
              {allCount}
            </Tag>
          </span>
        ),
      },
    ];

    actionTabsList.forEach((tab, idx) => {
      const key = tab.id || `tab_${idx}`;
      const count = tabCounts[key] !== undefined ? tabCounts[key] : 0;
      const tagColor = tab.color === "gray" ? "default" : (tab.color || "blue");

      items.push({
        key,
        label: (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: activeActionTabKey === key ? 700 : 500 }}>
            <span>{tab.title || `Tab ${idx + 1}`}</span>
            <Tag color={tagColor} style={{ borderRadius: 10, margin: 0, fontSize: 11, fontWeight: 700 }}>
              {count}
            </Tag>
          </span>
        ),
      });
    });

    return items;
  }, [schema?.enable_action_tabs, actionTabsList, tabCounts, rows, total, activeActionTabKey]);

  // ── Step 3: Data & Schema-Driven Custom Page Hook ──
  const formHooks = getDynamicFormHooks(targetFormSlug);
  const customPageFn = formHooks?.customPage || formHooks?.getCustomPage;
  if (customPageFn) {
    const customPageRes = customPageFn({
      form_slug: targetFormSlug,
      schema,
      columns,
      actions: actions || schema?.actions || [],
      rows: rows || [],
      filteredDisplayRows: displayRows || rows || [],
      activeActionTabKey,
      setActiveActionTabKey,
      actionTabsList,
      dataFetchLoading,
      fetchData,
      perms: perms || [],
      handleOpenDynamicAddEditForm,
      handleOpenDynamicViewForm,
      handleOpenChildrenAddEditForm
    });

    if (customPageRes) {
      return (
        <>
          {customListHeader}
          {customPageRes}

          <DynamicFormModals
            openDynamicAddEditForm={openDynamicAddEditForm}
            handleCloseDynamicAddEditForm={handleCloseDynamicAddEditForm}
            getModalWidth={getModalWidth}
            schema={schema}
            formRef={formRef}
            formSlug={targetFormSlug}
            fetchData={fetchData}
            selectedData={selectedData}
            mode={mode}
            urlListAPI={urlListAPI}
            childrenInformation={childrenInformation}
            openDynamicViewForm={openDynamicViewForm}
            setOpenDynamicViewForm={setOpenDynamicViewForm}
          />
        </>
      );
    }
  }

  const handleTabChangeMonitoring = (tabKey, tabFormSlug) => {
    const pSlug = parent_slug || "project";
    const targetSlug = tabFormSlug || tabKey;
    if (typeof window !== "undefined") {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
      window.history.pushState({}, "", `${baseUrl}/admin/forms/${pSlug}/${targetSlug}/${parent_id}`);
    }
    setFormSlug(targetSlug);
    setPage(1);
    setActiveActionTabKey("ALL");
  };

  const customListHeader = useMemo(() => {
    if (earlyFormHooks?.getListHeader) {
      const headerRes = earlyFormHooks.getListHeader({
        form_slug: targetFormSlug,
        parent_id,
        parent_slug: parent_slug || "project",
        activeTab: targetFormSlug,
        onTabChange: handleTabChangeMonitoring,
      });
      if (headerRes) return headerRes;
    }
    if (parent_id) {
      return <ProjectHeaderCard projectId={parent_id} />;
    }
    return null;
  }, [earlyFormHooks, targetFormSlug, parent_id, parent_slug]);

  // ── Step 4: Fallback Default Table & Card Grid View ──
  return (
    <div className="main-content flex-grow-1">
      <div className="container-fluid">
        <div className="p-3">
          {/* Custom Project Header Card / Monitoring Tabs Bar */}
          {customListHeader}

          {/* Header Controls Bar */}
          <div className="flex justify-between items-center mb-5 gap-4 flex-wrap bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
            <div>
              <h2 className="text-xl font-extrabold text-slate-800 m-0 tracking-tight">{schema?.title || "List View"}</h2>
              <span className="text-xs font-semibold text-slate-500 mt-1 inline-block">
                Total Entries: <span className="text-blue-600 font-extrabold">{total}</span>
                {activeActionTabKey !== "ALL" && (
                  <span className="text-slate-400 font-normal ml-1">
                    (Filtered by server)
                  </span>
                )}
              </span>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <Input.Search
                placeholder="Search records..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: 240, borderRadius: 8 }}
                allowClear
              />

              <div className="flex border border-slate-200 rounded-lg overflow-hidden p-0.5 bg-slate-100/70">
                <Button
                  type={viewLayout === "table" ? "primary" : "text"}
                  size="small"
                  icon={<UnorderedListOutlined />}
                  onClick={() => setViewLayout("table")}
                  style={{ borderRadius: 6, fontWeight: 700 }}
                />
                <Button
                  type={viewLayout === "grid" ? "primary" : "text"}
                  size="small"
                  icon={<AppstoreOutlined />}
                  onClick={() => setViewLayout("grid")}
                  style={{ borderRadius: 6, fontWeight: 700 }}
                />
              </div>

              {perms?.includes("add") && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => handleOpenDynamicAddEditForm({ mode: "add" })}
                  style={{
                    borderRadius: 8,
                    fontWeight: 700,
                    height: 38,
                    paddingInline: 18,
                    background: "linear-gradient(135deg, #dc2626 0%, #ea580c 100%)",
                    border: "none",
                    boxShadow: "0 2px 8px rgba(220, 38, 38, 0.3)"
                  }}
                >
                  Add New
                </Button>
              )}
            </div>
          </div>

          {/* Action Tabs Bar */}
          {schema?.enable_action_tabs && actionTabsList.length > 0 && (
            <div className="bg-white px-5 pt-3 pb-0 mb-5 rounded-xl border border-slate-200/80 shadow-sm">
              <Tabs
                activeKey={activeActionTabKey}
                onChange={handleTabChange}
                items={tabItems}
                style={{ marginBottom: 0 }}
              />
            </div>
          )}

          {/* Main Content Area */}
          {viewLayout === "table" ? (
            <GeneralTableRender
              columns={columns}
              data={rows || []}
              actions={actions}
              schema={schema}
              sort={sort}
              onSort={(key) => setSort((prev) => ({ field: key, order: prev?.field === key && prev?.order === "asc" ? "desc" : "asc" }))}
              dataFetchLoading={dataFetchLoading}
              onEditAction={handleOpenDynamicAddEditForm}
              onViewAction={handleOpenDynamicViewForm}
              onParentAction={handleOpenChildrenAddEditForm}
              fetchData={fetchData}
              title={schema?.title}
              formSlug={targetFormSlug}
              parent_slug={parent_slug}
              parent_id={parent_id}
            />
          ) : (
            <DefaultGridCardRender
              dataFetchLoading={dataFetchLoading}
              filteredDisplayRows={rows || []}
              columns={columns}
              page={page}
              pageSize={pageSize}
              formSlug={targetFormSlug}
              perms={perms}
              handleOpenDynamicAddEditForm={handleOpenDynamicAddEditForm}
              handleOpenDynamicViewForm={handleOpenDynamicViewForm}
              fetchData={fetchData}
            />
          )}
        </div>
      </div>

      <DynamicFormModals
        openDynamicAddEditForm={openDynamicAddEditForm}
        handleCloseDynamicAddEditForm={handleCloseDynamicAddEditForm}
        getModalWidth={getModalWidth}
        schema={schema}
        formRef={formRef}
        formSlug={targetFormSlug}
        fetchData={fetchData}
        selectedData={selectedData}
        mode={mode}
        urlListAPI={urlListAPI}
        childrenInformation={childrenInformation}
        openDynamicViewForm={openDynamicViewForm}
        setOpenDynamicViewForm={setOpenDynamicViewForm}
      />
    </div>
  );
};

export default DynamicGeneralListView;
