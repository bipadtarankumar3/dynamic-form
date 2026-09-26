"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  DownloadOutlined,
  PlusOutlined,
  UnorderedListOutlined,
  AppstoreOutlined,
  FilterOutlined,
  SearchOutlined,
  FolderOpenOutlined,
  EditOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  GlobalOutlined,
  EnvironmentOutlined,
  CompassOutlined,
  CalendarOutlined,
  FileProtectOutlined,
} from "@ant-design/icons";
import { Button, Input, Tabs, Tag, App, Segmented } from "antd";
import "@/modules/auth-management/permissions-page.css";
import "@/modules/approval-path/approval-path-new.css";
import {
  dynamicGeneralExportExcel,
  dynamicGeneralListViewAPI,
  dynamicViewListViewAPI,
  dynamicSchemaDetailsAPI,
} from "@/services/dynamicForm-service";
import GeneralTableRenderV2 from "@/modules/dynamic-form-v2/list-view/general-list-view/GeneralTableRenderV2";
import DefaultGridCardRenderV2 from "@/modules/dynamic-form-v2/list-view/general-list-view/components/DefaultGridCardRenderV2";
import DynamicFormModalsV2 from "@/modules/dynamic-form-v2/list-view/general-list-view/components/DynamicFormModalsV2";
import { useRouter } from "next/navigation";
import { buildColumnsOptimized } from "@/modules/dynamic-form-v2/list-view/general-list-view/helper/buildColumnWithData.helper";
import { useSearchParams } from "@/hooks/useNextRouter";
import { hasModulePermissions } from "@/context/PermissionContext";
import { getDynamicFormHooks } from "@/modules/dynamic-form-v2/hooks/registerAllFormHooksV2";

const getFieldValue = (row, fieldKey) => {
  if (!row || !fieldKey) return undefined;
  let val = row[fieldKey];
  if (val === undefined || val === null) {
    const lowerKey = fieldKey.toLowerCase();
    const foundKey = Object.keys(row).find((k) => k.toLowerCase() === lowerKey);
    if (foundKey) val = row[foundKey];
  }
  return val;
};

export default function RfpListPage({
  slug = "request_for_proposal",
  title = "Request for Proposal",
}) {
  const formSlug = slug;
  const router = useRouter();
  const [searchParams] = useSearchParams();
  const rawPerms = hasModulePermissions(formSlug);
  const perms = Array.isArray(rawPerms) ? rawPerms : [];

  const formHooks = useMemo(() => getDynamicFormHooks(formSlug), [formSlug]);

  const [fetchedSchema, setFetchedSchema] = useState(null);
  const [dataFetchLoading, setDataFetchLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [actions, setActions] = useState([]);
  const [exportLoading, setExportLoading] = useState(false);
  const [searchKey, setSearchKey] = useState("");
  const [tabFilter, setTabFilter] = useState("all");
  const [viewMode, setViewMode] = useState("table");

  const [openDynamicAddEditForm, setOpenDynamicAddEditForm] = useState(false);
  const [openDynamicViewForm, setOpenDynamicViewForm] = useState(false);

  const [childrenInformation, setChildrenInformation] = useState({
    parent_primary_key_value: null,
    form_slug: null,
  });

  const [selectedData, setSelectedData] = useState(null);
  const [mode, setMode] = useState("add");
  const [urlListAPI, setUrlListAPI] = useState({
    details_url_API: null,
    view_url_API: null,
  });

  const formRef = useRef(null);

  const fetchData = async () => {
    try {
      setDataFetchLoading(true);

      const payload = {
        form_slug: formSlug,
        filters: { search: "" },
        pagination: { current_page: 1, page_size: 100 },
      };

      if (searchParams && typeof searchParams.forEach === "function") {
        searchParams.forEach((val, key) => {
          if (!["form_slug", "parent_slug", "parent_id"].includes(key)) {
            payload[key] = val;
          }
        });
      }

      const [res, schemaRes] = await Promise.all([
        dynamicViewListViewAPI(payload),
        dynamicSchemaDetailsAPI({ form_slug: formSlug }).catch(() => null),
      ]);

      const rawRes = res?.data || {};
      const respData = rawRes?.data !== undefined ? rawRes.data : rawRes;
      const listSchema = rawRes?.schema || {};
      const fullSchema =
        schemaRes?.data?.data?.schema_details ||
        schemaRes?.data?.schema_details ||
        schemaRes?.data?.data ||
        schemaRes?.data ||
        {};

      const fetchedRows = Array.isArray(respData?.rows)
        ? respData.rows
        : Array.isArray(respData)
        ? respData
        : [];

      setRows(fetchedRows);

      const tableCols =
        listSchema?.table_columns && listSchema.table_columns.length > 0
          ? listSchema.table_columns
          : fullSchema?.table_columns && fullSchema.table_columns.length > 0
          ? fullSchema.table_columns
          : [];

      const activeSchema = {
        ...fullSchema,
        ...listSchema,
        table_columns: tableCols,
        view_name: listSchema?.view_name || fullSchema?.view_name,
        view_slug: listSchema?.view_slug || fullSchema?.view_slug,
        sections:
          fullSchema?.sections && fullSchema.sections.length > 0
            ? fullSchema.sections
            : listSchema?.sections || [],
        actions:
          fullSchema?.actions && fullSchema.actions.length > 0
            ? fullSchema.actions
            : listSchema?.actions || [],
      };

      setFetchedSchema(activeSchema);

      if (respData?.details_url_API || respData?.view_url_API || respData?.urls) {
        setUrlListAPI({
          details_url_API: respData?.details_url_API || respData?.urls?.details_url_API,
          view_url_API: respData?.view_url_API || respData?.urls?.view_url_API,
        });
      }
      const apiActions = Array.isArray(respData?.actions) ? respData.actions : [];
      const schemaActions = Array.isArray(activeSchema?.actions) ? activeSchema.actions : [];
      const formActions = Array.isArray(activeSchema?.form_actions) ? activeSchema.form_actions : [];
      const customActions = Array.isArray(activeSchema?.custom_actions) ? activeSchema.custom_actions : [];

      const mergedActions = [];

      const addActionToMerged = (act) => {
        if (!act || typeof act !== "object") return;
        const actSlug =
          act.slug || act.child_form_slug || act.target_child_form_schema || act.name || act.label;
        if (!actSlug) return;

        const existingIdx = mergedActions.findIndex(
          (a) => (a.slug || a.name || a.label) === actSlug
        );

        if (existingIdx === -1) {
          mergedActions.push({ ...act });
        } else {
          mergedActions[existingIdx] = { ...mergedActions[existingIdx], ...act };
        }
      };

      apiActions.forEach(addActionToMerged);
      schemaActions.forEach(addActionToMerged);
      formActions.forEach(addActionToMerged);
      customActions.forEach(addActionToMerged);

      if (mergedActions.length === 0) {
        mergedActions.push(
          { slug: "view", name: "View", type: "FORM" },
          { slug: "edit", name: "Edit", type: "FORM" },
          { slug: "delete", name: "Delete", type: "API" }
        );
      }
      setActions(mergedActions);

      let builtCols = buildColumnsOptimized(activeSchema, fetchedRows);

      if (formHooks?.getColumns) {
        builtCols = formHooks.getColumns({
          defaultColumns: builtCols,
          schema: activeSchema,
        });
      }

      setColumns(builtCols);
    } catch (error) {
      console.error("fetchData error:", error);
    } finally {
      setDataFetchLoading(false);
    }
  };

  useEffect(() => {
    if (formSlug) {
      fetchData();
    }
  }, [formSlug]);

  const schema = fetchedSchema;

  const tabsConfig = useMemo(() => {
    let conf = schema?.tabs || schema?.tab_config || [];

    if (Array.isArray(conf) && conf.length > 0) {
      return conf.map((t) => {
        if (typeof t === "string") return { id: t, label: t };
        return {
          id: t.id || t.key || t.value || t.slug || t.name,
          label: t.label || t.title || t.name || t.id,
          ...t,
        };
      });
    }

    const defaultTabs = [
      { id: "draft", label: "Draft", field: "status", target_value: "draft" },
      { id: "pending", label: "Pending", field: "status", target_value: "pending" },
      { id: "approved", label: "Approved", field: "status", target_value: "approved" },
      { id: "rejected", label: "Rejected", field: "status", target_value: "rejected" },
    ];

    const hasAnyStatus = rows.some((row) => {
      const st = getFieldValue(row, "status");
      return defaultTabs.some(
        (dt) => String(st || "").toLowerCase().trim() === String(dt.target_value).toLowerCase().trim()
      );
    });

    if (hasAnyStatus) {
      return defaultTabs;
    }

    return [];
  }, [schema, rows]);

  const tabCounts = useMemo(() => {
    const counts = { all: rows.length };
    tabsConfig.forEach((tab) => {
      const tabId = tab.id || tab.key;
      counts[tabId] = rows.filter((row) => {
        if (tab.filters && typeof tab.filters === "object") {
          return Object.entries(tab.filters).every(([fieldKey, expectedVal]) => {
            const actualVal = getFieldValue(row, fieldKey);
            if (Array.isArray(expectedVal)) {
              return expectedVal.map(String).includes(String(actualVal));
            }
            return String(actualVal ?? "").toLowerCase().trim() === String(expectedVal ?? "").toLowerCase().trim();
          });
        }

        const tabField = tab.field || tab.db_field || tab.column;
        const expectedVal = tab.value !== undefined ? tab.value : tab.target_value;
        if (tabField && expectedVal !== undefined && expectedVal !== null) {
          const actualVal = getFieldValue(row, tabField);
          if (Array.isArray(expectedVal)) {
            return expectedVal.map(String).includes(String(actualVal));
          }
          return String(actualVal ?? "").toLowerCase().trim() === String(expectedVal ?? "").toLowerCase().trim();
        }

        const rowStatus = getFieldValue(row, "status") || getFieldValue(row, "state") || getFieldValue(row, "tab");
        if (rowStatus) {
          return String(rowStatus).toLowerCase().trim() === String(tabId).toLowerCase().trim();
        }

        return true;
      }).length;
    });
    return counts;
  }, [rows, tabsConfig]);

  const filteredRows = useMemo(() => {
    let result = rows;

    if (tabFilter !== "all") {
      const activeTab = tabsConfig.find((t) => (t.id || t.key) === tabFilter);
      if (activeTab) {
        result = result.filter((row) => {
          if (activeTab.filters && typeof activeTab.filters === "object") {
            return Object.entries(activeTab.filters).every(([fieldKey, expectedVal]) => {
              const actualVal = getFieldValue(row, fieldKey);
              if (Array.isArray(expectedVal)) {
                return expectedVal.map(String).includes(String(actualVal));
              }
              return String(actualVal ?? "").toLowerCase().trim() === String(expectedVal ?? "").toLowerCase().trim();
            });
          }

          const tabField = activeTab.field || activeTab.db_field || activeTab.column;
          const expectedVal = activeTab.value !== undefined ? activeTab.value : activeTab.target_value;
          if (tabField && expectedVal !== undefined && expectedVal !== null) {
            const actualVal = getFieldValue(row, tabField);
            if (Array.isArray(expectedVal)) {
              return expectedVal.map(String).includes(String(actualVal));
            }
            return String(actualVal ?? "").toLowerCase().trim() === String(expectedVal ?? "").toLowerCase().trim();
          }

          const rowStatus = getFieldValue(row, "status") || getFieldValue(row, "state") || getFieldValue(row, "tab");
          if (rowStatus) {
            return String(rowStatus).toLowerCase().trim() === String(activeTab.id || activeTab.key).toLowerCase().trim();
          }

          return true;
        });
      }
    }

    if (searchKey.trim()) {
      const term = searchKey.toLowerCase().trim();
      result = result.filter((row) => {
        return Object.values(row).some((val) => {
          if (val === null || val === undefined) return false;
          if (typeof val === "object") return false;
          return String(val).toLowerCase().includes(term);
        });
      });
    }

    return result;
  }, [rows, tabFilter, tabsConfig, searchKey]);

  const handleExport = async () => {
    try {
      setExportLoading(true);
      await dynamicGeneralExportExcel(formSlug);
    } catch (err) {
      console.error("Export error:", err);
    } finally {
      setExportLoading(false);
    }
  };

  const onEditAction = ({ data }) => {
    const primaryKey = schema?.root_entity?.primary_key || "id";
    const pkValue = data?.[primaryKey] ?? data?.id ?? data?.[Object.keys(data || {}).find((k) => k.endsWith("_id"))];
    router.push(`/admin/request-for-proposal/edit/${pkValue}`);
  };

  const onViewAction = ({ data }) => {
    const primaryKey = schema?.root_entity?.primary_key || "id";
    const pkValue = data?.[primaryKey] ?? data?.id ?? data?.[Object.keys(data || {}).find((k) => k.endsWith("_id"))];
    router.push(`/admin/request-for-proposal/${pkValue}`);
  };

  const onParentAction = ({ data, mode, action }) => {
    setSelectedData(null);
    setMode(mode);
    setChildrenInformation({
      parent_primary_key_value: data?.id,
      parent_primary_key: action?.form_details?.parent_primary_key || "parent_id",
      form_slug: action?.form_details?.form_slug || action?.slug,
    });
    setOpenDynamicAddEditForm(true);
  };

  const addAction = actions.find((a) => a.slug === "add");
  const canAdd = addAction ? perms.length === 0 || perms.includes("add") || perms.includes("*") : true;

  return (
    <App>
      <div className="perm-page-container">
        {/* ── 1. ENTERPRISE PAGE HEADER ── */}
        <div className="perm-page-header">
          <div className="perm-page-header-left">
            <div className="perm-page-header-icon">
              <FolderOpenOutlined />
            </div>
            <div>
              <h1 className="perm-page-title">
                {title || (schema?.title ? `${schema.title} Management` : "Request for Proposal Management")}
              </h1>
              <p className="perm-page-subtitle">
                {schema?.description || `Manage, configure, and oversee ${schema?.title || "Request for Proposal"} records.`}
              </p>
            </div>
          </div>

          <div className="perm-header-actions">
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchData}
              loading={dataFetchLoading}
              className="perm-btn-refresh"
            >
              Refresh
            </Button>

            {canAdd && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => router.push("/admin/request-for-proposal/add")}
                className="perm-btn-create"
              >
                Add {schema?.title || "Request for Proposal"}
              </Button>
            )}
          </div>
        </div>

        {/* 2. Status / Filter Tabs */}
        {tabsConfig.length > 0 && (
          <div className="flex items-center gap-2.5 overflow-x-auto pb-2 mb-4 scrollbar-none">
            {tabsConfig.map((t) => {
              const key = t.id || t.key;
              const count = tabCounts[key] !== undefined ? tabCounts[key] : 0;
              const isActive = tabFilter === key;
              let icon = null;
              if (t.label?.toLowerCase().includes("draft")) icon = <EditOutlined />;
              else if (t.label?.toLowerCase().includes("pending")) icon = <ClockCircleOutlined />;
              else if (t.label?.toLowerCase().includes("approv")) icon = <CheckCircleOutlined />;
              else if (t.label?.toLowerCase().includes("reject")) icon = <CloseCircleOutlined />;

              return (
                <Button
                  key={key}
                  type={isActive ? "primary" : "default"}
                  icon={icon}
                  onClick={() => setTabFilter(key)}
                  style={{
                    borderRadius: "12px",
                    height: "38px",
                    fontWeight: 600,
                  }}
                  className={`inline-flex items-center gap-1.5 px-4 ${
                    isActive ? "shadow-md shadow-indigo-500/20" : "bg-white hover:border-indigo-300 text-slate-700"
                  }`}
                >
                  <span>{t.label || t.title}</span>
                  <Tag
                    bordered={false}
                    className="m-0 text-xs font-bold rounded-full px-2"
                    style={{
                      backgroundColor: isActive ? "rgba(255,255,255,0.25)" : "#f1f5f9",
                      color: isActive ? "#ffffff" : "#475569",
                    }}
                  >
                    {count}
                  </Tag>
                </Button>
              );
            })}
          </div>
        )}

        {/* 3. Spacious Modern Actions & Search Toolbar */}
        <div style={{ padding: "12px 18px", marginTop: "16px", marginBottom: "16px" }} className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Button
              icon={<FilterOutlined />}
              style={{ borderRadius: "12px", height: "40px", fontWeight: 600 }}
              className="text-slate-700 flex items-center gap-1.5 flex-shrink-0"
            >
              Filters
            </Button>

            <div className="relative flex-1 min-w-[180px] max-w-full lg:max-w-md">
              <Input
                placeholder={`Search ${schema?.title || "Request for Proposal"}...`}
                prefix={<SearchOutlined className="text-slate-400 mr-1.5" />}
                allowClear
                value={searchKey}
                onChange={(e) => setSearchKey(e.target.value)}
                style={{ borderRadius: "12px", height: "40px" }}
                className="text-xs px-3.5 w-full hover:border-indigo-400 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap justify-between sm:justify-end">
            <Tag
              color="blue"
              style={{
                borderRadius: "12px",
                height: "40px",
                display: "inline-flex",
                alignItems: "center",
                fontWeight: 700,
                fontSize: "12px",
                padding: "0 14px",
                margin: 0,
              }}
            >
              {filteredRows.length} Records
            </Tag>

            <Button
              icon={<DownloadOutlined />}
              onClick={handleExport}
              loading={exportLoading}
              style={{ borderRadius: "12px", height: "40px", fontWeight: 600 }}
              className="text-slate-700 flex items-center gap-1.5"
            >
              Export
            </Button>

            {canAdd && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => router.push("/admin/request-for-proposal/add")}
                style={{
                  borderRadius: "12px",
                  height: "40px",
                  fontWeight: 700,
                }}
                className="shadow-sm flex items-center gap-1.5 px-3"
              >
                Create {schema?.title || "Request for Proposal"}
              </Button>
            )}

            <Segmented
              value={viewMode === "table" ? "table" : "grid"}
              onChange={(val) => setViewMode(val)}
              className="conf-segmented-toggle"
              style={{
                height: "40px",
                borderRadius: "12px",
                display: "inline-flex",
                alignItems: "center",
              }}
              options={[
                {
                  value: "grid",
                  icon: <AppstoreOutlined />,
                  label: "Grid",
                },
                {
                  value: "table",
                  icon: <UnorderedListOutlined />,
                  label: "List",
                },
              ]}
            />
          </div>
        </div>

        {/* 4. Table / Grid Render */}
        {viewMode === "table" ? (
          <GeneralTableRenderV2
            columns={columns}
            data={filteredRows}
            actions={actions}
            schema={schema}
            onEditAction={onEditAction}
            onViewAction={onViewAction}
            onParentAction={onParentAction}
            dataFetchLoading={dataFetchLoading}
            fetchData={fetchData}
            formSlug={formSlug}
          />
        ) : (
          <DefaultGridCardRenderV2
            columns={columns}
            filteredDisplayRows={filteredRows}
            actions={actions}
            page={1}
            pageSize={filteredRows?.length || 20}
            formSlug={formSlug}
            perms={perms}
            handleOpenDynamicAddEditForm={onEditAction}
            handleOpenDynamicViewForm={onViewAction}
            fetchData={fetchData}
            dataFetchLoading={dataFetchLoading}
          />
        )}

        <DynamicFormModalsV2
          openDynamicAddEditForm={openDynamicAddEditForm}
          handleCloseDynamicAddEditForm={() => setOpenDynamicAddEditForm(false)}
          getModalWidth={() => "75vw"}
          schema={schema}
          formRef={formRef}
          formSlug={formSlug}
          fetchData={fetchData}
          selectedData={selectedData}
          mode={mode}
          urlListAPI={urlListAPI}
          childrenInformation={childrenInformation}
          openDynamicViewForm={openDynamicViewForm}
          setOpenDynamicViewForm={setOpenDynamicViewForm}
        />
      </div>
    </App>
  );
}
