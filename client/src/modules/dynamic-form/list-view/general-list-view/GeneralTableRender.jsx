import React, { useState } from "react";
import * as AntdIcons from "@ant-design/icons";
import { getAntdIconComponent } from "@/modules/form-builder/IconPickerModal";
import {
  CheckCircleOutlined,
  EditOutlined, EyeFilled,
  ReloadOutlined,
  SendOutlined,
  SettingOutlined,
  StopOutlined, UserSwitchOutlined,
  FileTextOutlined, StarOutlined
} from "@ant-design/icons";
import { App, Dropdown, Menu, message, Modal, Spin } from "antd";
import { getUser } from "@/context/AuthContext";
import { dynamicActiveInactiveAPI } from "@/services/dynamicForm-service";
import { privateHttpClient } from "@/services/api/httpClient";
import { getDynamicFormHooks } from "@/modules/dynamic-form/hooks/dynamicFormHookRegistry";
import FloatRfpModal from "@/app/(ngo)/_modules/ngo/components/FloatRfpModal";

const getActionLabel = (action, row) => {
  if (action.slug === "active_inactive") {
    const isActive = row?.[action?.form_details?.is_active_key];
    return isActive ? "Inactive" : "Active";
  }
  if (action.name) return action.name;
  if (action.label) return action.label;
  if (action.slug) {
    return action.slug.charAt(0).toUpperCase() + action.slug.slice(1).replace(/_/g, " ");
  }
  return "";
};

import authUtils from "@/utils/authUtils";
import { hasModulePermissions } from "@/context/PermissionContext";
import { loginAsAPI, resetPasswordAPI } from "@/services/user-service";

const GeneralTableRender = ({
  columns = [],
  data = [],
  actions = [],
  schema = {},
  onSort,
  sort,
  onEditAction,
  onViewAction,
  dataFetchLoading,
  title,
  onParentAction,
  tab,
  fetchData,
  formSlug,
  parent_slug,
  parent_id,
}) => {
  const [messageApi, contextHolder] = message.useMessage();
  const app = App.useApp();
  const modal = (app?.modal && typeof app.modal.confirm === 'function') ? app.modal : Modal;
  const { user_id, role_slug } = getUser();
  const perms = hasModulePermissions(formSlug);

  const executeAction = (action, row) => {

    const handleLoginAs = (row) => {
      modal.confirm({
        title: "Login As",
        content: `Login for ${row?.tup_user_name || "this user"}?`,
        okText: "Yes, Login",
        okType: "danger",
        onOk: async () => {
          try {
            const response = await loginAsAPI({
              user_id: row?.tup_user_id, // ✅ IMPORTANT
            });
            const { token } = response.data;
            authUtils.saveToken(token);
            window.location.href = `${process.env.NEXT_PUBLIC_BASE_URL || ''}/project`;
            messageApi.success("Login successfully");
          } catch (error) {
            messageApi.error(
              error?.response?.data?.message || "Failed to login password"
            );
          }
        },
      });
    };

    const handleResetPassword = (row) => {
      modal.confirm({
        title: "Reset Password",
        content: `Reset password for ${row?.tup_user_name || "this user"}?`,
        okText: "Yes, Reset",
        okType: "danger",
        onOk: async () => {
          try {
            await resetPasswordAPI({
              user_id: row?.tup_user_id, // ✅ IMPORTANT
            });

            messageApi.success("Password reset successfully");
          } catch (error) {
            messageApi.error(
              error?.response?.data?.message || "Failed to reset password"
            );
          }
        },
      });
    };


    switch (action.type) {
      case "OPEN_TAB": {
        const payload = {
          form_slug: action?.form_details?.form_slug,
          title,
          workflow_slug: action?.workflow_slug,
          parent_primary_key_value:
            row?.[action?.form_details?.parent_primary_key],
          parent_primary_key: action?.form_details?.parent_primary_key,
          primary_key_value: row?.[action?.form_details?.primary_key],
          primary_key: action?.form_details?.primary_key,
        };

        const encoded = btoa(JSON.stringify(payload));

        window.open(
          `${process.env.NEXT_PUBLIC_BASE_URL}${action?.view_url_TAB
          }?ctx=${encoded}`,
          "_blank",
        );
        break;
      }

      case "FORM":
      case "OPEN_MODAL": {
        if (action.slug === "view") {
          onViewAction?.({ data: row, mode: "view" });
        }
        if (action.slug === "edit") {
          onEditAction?.({ data: row, mode: "edit" });
        }
        if (action?.form_details?.is_children === true) {
          onParentAction?.({ data: row, mode: "add", action });
        }
        break;
      }

      case "API": {
        if (action.slug === "delete") {
          modal.confirm({
            title: "Confirm Delete",
            content: "Are you sure you want to delete this record?",
            okText: "Yes, Delete",
            okType: "danger",
            onOk: async () => {
              try {
                const id = row.id || row[schema?.root_entity?.primary_key || "id"];
                await privateHttpClient.delete(`/dynamic-form/${formSlug}/${id}`);
                messageApi.success("Record deleted successfully");
                fetchData?.();
              } catch (err) {
                messageApi.error(err?.response?.data?.message || "Failed to delete record");
              }
            }
          });
        }
        break;
      }

      case "ACTIVE_INACTIVE": {
        const primaryKey =
          action?.form_details?.primary_key ||
          Object.keys(row).find(k => k.endsWith("_id"));

        const isActiveKey =
          action?.form_details?.is_active_key ||
          Object.keys(row).find(k => k.endsWith("_is_active"));

        if (!primaryKey || !isActiveKey) {
          console.error("Missing keys for active/inactive", { action, row });
          return;
        }

        modal.confirm({
          title: "Confirm",
          content: `Do you want to ${row[isActiveKey] ? "inactive" : "active"
            } this record?`,
          onOk: async () => {
            await dynamicActiveInactiveAPI(
              schema?.api?.active_inactive,
              {
                form_slug: action?.form_details?.form_slug,
                primary_key_value: row[primaryKey],
                is_active: !row[isActiveKey],
              }
            );
            fetchData?.();
          },
        });
        break;
      }

      case "LOGIN_AS": {
        handleLoginAs(row);
        break;
      }

      case "RESET_PASSWORD": {
        handleResetPassword(row);
        break;
      }

      case "PAGE":
      case "OPEN_PAGE": {
        // Navigate to the detail page for this record.
        // The slug is sourced from the action config, the schema, or formSlug prop.
        const pageSlug =
          action?.form_details?.form_slug ||
          schema?.slug ||
          formSlug;

        if (!pageSlug) {
          console.warn("OPEN_PAGE: could not determine slug", { action, schema });
          break;
        }

        const primaryKey =
          action?.form_details?.primary_key ||
          schema?.root_entity?.primary_key ||
          "id";

        const pkValue = row?.[primaryKey];

        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
        let url;
        if (parent_slug && parent_id) {
          url = pkValue
            ? `${baseUrl}/admin/forms/${parent_slug}/${pageSlug}/${parent_id}/${pkValue}`
            : `${baseUrl}/admin/forms/${parent_slug}/${pageSlug}/${parent_id}`;
        } else {
          const basePath = `${baseUrl}/admin/forms/${pageSlug}`;
          url = pkValue ? `${basePath}/${pkValue}` : basePath;
        }

        window.location.href = url;
        break;
      }

      case "Navigate to Child Form":
      case "OPEN_CHILD_FORM":
      case "CHILD_FORM": {
        const parentSlug = formSlug || schema?.slug;
        const childSlug = action?.child_form_slug || action?.form_details?.form_slug || action?.slug;
        const primaryKey = action?.form_details?.parent_primary_key || schema?.root_entity?.primary_key || "id";
        const parentId = row?.[primaryKey] || row?.id;

        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
        const currentPath = typeof window !== "undefined" ? window.location.pathname : "";

        let targetUrl = "";
        if (currentPath.includes("/admin/forms/")) {
          const cleanPath = currentPath.replace(/\/$/, "");
          targetUrl = `${cleanPath}/${childSlug}/${parentId}`;
        } else {
          targetUrl = `${baseUrl}/admin/forms/${parentSlug}/${childSlug}/${parentId}`;
        }

        window.location.href = targetUrl;
        break;
      }

      default:
        console.warn("Unknown action type:", action.type);
    }
  };

  const [approveModalVisible, setApproveModalVisible] = useState(false);
  const [selectedRowToApprove, setSelectedRowToApprove] = useState(null);
  const [approving, setApproving] = useState(false);

  const [floatRfpModalVisible, setFloatRfpModalVisible] = useState(false);
  const [selectedRowToFloatRfp, setSelectedRowToFloatRfp] = useState(null);

  const handleFloatRFP = (row) => {
    setSelectedRowToFloatRfp(row);
    setFloatRfpModalVisible(true);
  };

  const handleApproveNGO = (row) => {
    setSelectedRowToApprove(row);
    setApproveModalVisible(true);
  };

  const confirmApproveNGO = async () => {
    if (!selectedRowToApprove?.id) return;
    try {
      setApproving(true);
      const res = await privateHttpClient.post("ngo/approve", {
        record_id: selectedRowToApprove.id,
        form_slug: formSlug || "implementation_partner"
      });
      messageApi.success(res?.data?.message || `Approved NGO! User created with password Default@123.`);
      setApproveModalVisible(false);
      fetchData?.();
    } catch (err) {
      console.error("NGO approval error:", err);
      messageApi.error(err?.response?.data?.message || "Failed to approve NGO registration.");
    } finally {
      setApproving(false);
    }
  };

const extractComparableValues = (val) => {
  if (val === undefined || val === null) return [];
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.flatMap(extractComparableValues);
        }
      } catch (e) {}
    }
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === "object") {
          return extractComparableValues(parsed);
        }
      } catch (e) {}
    }
    return [trimmed.toLowerCase()];
  }
  if (Array.isArray(val)) {
    return val.flatMap(extractComparableValues);
  }
  if (typeof val === "object") {
    const values = [];
    if (val.value !== undefined) values.push(...extractComparableValues(val.value));
    if (val.label !== undefined) values.push(...extractComparableValues(val.label));
    if (val.slug !== undefined) values.push(...extractComparableValues(val.slug));
    if (val.name !== undefined) values.push(...extractComparableValues(val.name));
    if (values.length > 0) return values;
    return [JSON.stringify(val).toLowerCase()];
  }
  return [String(val).trim().toLowerCase()];
};

const evaluateActionConditions = (action, row) => {
  const conditions = action?.conditions;
  if (!Array.isArray(conditions) || conditions.length === 0) {
    return true;
  }

  const matchMode = action?.condition_match || "ALL";

  const evaluateRule = (rule) => {
    if (!rule || !rule.field) return true;

    const fieldKeyLower = String(rule.field).trim().toLowerCase();

    // Robust case-insensitive field lookup on row & row.data
    let rawVal = row?.[rule.field];
    if (rawVal === undefined && row && typeof row === "object") {
      const matchKey = Object.keys(row).find((k) => k.toLowerCase() === fieldKeyLower);
      if (matchKey) rawVal = row[matchKey];
    }
    if (rawVal === undefined && row?.data && typeof row.data === "object") {
      rawVal = row.data[rule.field];
      if (rawVal === undefined) {
        const matchKey = Object.keys(row.data).find((k) => k.toLowerCase() === fieldKeyLower);
        if (matchKey) rawVal = row.data[matchKey];
      }
    }

    const op = rule.operator || "equals";
    const expected = rule.value;
    const actualValues = extractComparableValues(rawVal);
    const expectedStr = String(expected ?? "").trim().toLowerCase();

    switch (op) {
      case "equals":
      case "eq":
      case "==":
      case "===": {
        if (actualValues.length === 0) {
          return expectedStr === "" || expected === undefined || expected === null;
        }
        return actualValues.some((v) => v === expectedStr);
      }
      case "not_equals":
      case "neq":
      case "!=":
      case "!==": {
        if (actualValues.length === 0) {
          return expectedStr !== "" && expected !== undefined && expected !== null;
        }
        return !actualValues.some((v) => v === expectedStr);
      }
      case "gt":
      case ">":
      case "gte":
      case ">=":
      case "lt":
      case "<":
      case "lte":
      case "<=": {
        const firstNum = actualValues.map((v) => Number(v)).find((n) => !isNaN(n));
        const numExp = Number(expected);
        if (firstNum === undefined || isNaN(numExp)) return false;
        if (op === "gt" || op === ">") return firstNum > numExp;
        if (op === "gte" || op === ">=") return firstNum >= numExp;
        if (op === "lt" || op === "<") return firstNum < numExp;
        if (op === "lte" || op === "<=") return firstNum <= numExp;
        return false;
      }
      case "contains": {
        if (actualValues.length === 0) return false;
        return actualValues.some((v) => v.includes(expectedStr));
      }
      case "in": {
        if (actualValues.length === 0) return false;
        const expectedList = (Array.isArray(expected) ? expected : String(expected ?? "").split(",")).map((s) => String(s).trim().toLowerCase());
        return actualValues.some((v) => expectedList.includes(v));
      }
      case "is_not_empty":
      case "not_null": {
        return actualValues.length > 0 && actualValues.some((v) => v !== "" && v !== null && v !== undefined);
      }
      case "is_empty":
      case "null": {
        return actualValues.length === 0 || actualValues.every((v) => v === "" || v === null || v === undefined);
      }
      default:
        return true;
    }
  };

  if (matchMode === "ANY") {
    return conditions.some(evaluateRule);
  }
  return conditions.every(evaluateRule);
};

  const getMenuItems = (row) => {
    const standardItems = [];
    const childItems = [];

    actions.forEach((action) => {
      // Add action belongs to top bar button, not row menu
      if (action?.slug === "add") return;

      const isEditAction = action?.slug === "edit";
      const isViewAction = action?.slug === "view";
      const isActiveInactiveAction = action?.slug === "active_inactive";
      const isDeleteAction = action?.slug === "delete";
      const isLoginAsAction = action?.slug === "login_as";
      const isResetPasswordAction = action?.slug === "reset_password";

      const isStandardAction = isEditAction || isViewAction || isActiveInactiveAction
        || isDeleteAction || isLoginAsAction || isResetPasswordAction;

      const isAdmin = role_slug === "admin" || role_slug === "configurator" || (Array.isArray(perms) && perms.includes("*"));

      // 1. Role-based check from action.roles (if explicitly set on action)
      if (Array.isArray(action?.roles) && action.roles.length > 0 && !isAdmin) {
        if (!action.roles.includes(role_slug) && !perms.includes(action?.slug)) {
          return;
        }
      }

      // 2. RBAC permission checks for standard and custom actions
      const hideLoginAsAction = isLoginAsAction && !isAdmin;
      const hideResetPasswordAction = isResetPasswordAction && !isAdmin;
      const hideViewAction = isViewAction && !perms.includes("view") && !isAdmin;
      const hideDeleteAction = isDeleteAction && !perms.includes("delete") && !isAdmin;
      const hideActiveInactiveAction = isActiveInactiveAction && !perms.includes("active_inactive") && !isAdmin;
      const hideEditAction = isEditAction && !perms.includes("edit") && !isAdmin;
      const hideCustomAction = !isStandardAction && action?.slug && !perms.includes(action.slug) && !isAdmin;

      if (
        hideEditAction ||
        hideViewAction ||
        hideActiveInactiveAction ||
        hideDeleteAction || 
        hideLoginAsAction || 
        hideResetPasswordAction ||
        hideCustomAction
      ) {
        return;
      }

      // 3. Dynamic row-level condition check (field values, amounts, thresholds)
      if (!evaluateActionConditions(action, row)) {
        return;
      }

      const menuItem = {
        key: action.slug || action.name,
        label: (
          <span className="flex items-center gap-2 text-[13px]">
            {getActionIcon(action, row)}
            <span>{getActionLabel(action, row)}</span>
          </span>
        ),
        onClick: () => executeAction(action, row),
      };

      // Separate child form actions into sub-menu if there are multiple child forms
      const isChildAction = action?.is_children === true ||
        action?.type === "OPEN_CHILD_FORM" ||
        action?.type === "CHILD_FORM" ||
        action?.type === "Navigate to Child Form" ||
        action?.type === "OPEN_PAGE" ||
        action?.type === "PAGE";
      if (isChildAction && !["view", "edit", "delete", "active_inactive"].includes(action.slug)) {
        childItems.push(menuItem);
      } else {
        standardItems.push(menuItem);
      }
    });

    let finalItems = [...standardItems];

    // If there are 3 or more child form actions, group them into a clean Sub-Menu
    if (childItems.length >= 3) {
      finalItems.push({
        type: "divider",
      });
      finalItems.push({
        key: "related_forms_submenu",
        label: (
          <span className="flex items-center gap-2 text-[13px] font-semibold text-slate-700">
            <AntdIcons.FolderOutlined style={{ color: "#f59e0b" }} />
            <span>Related Forms ({childItems.length})</span>
          </span>
        ),
        children: childItems,
      });
    } else {
      finalItems = [...standardItems, ...childItems];
    }

    const currentSlug = formSlug || schema?.slug;

    const hooks = getDynamicFormHooks(currentSlug);
    if (hooks.getRowActions) {
      const hookedItems = hooks.getRowActions({
        row,
        defaultActions: finalItems,
        handleApproveNGO,
        handleFloatRFP,
        formSlug: currentSlug
      });
      return { items: hookedItems, className: "py-1" };
    }

    return { items: finalItems, className: "py-1" };
  };

  return (
    <div className="w-full overflow-x-auto border border-slate-200/80 rounded-xl shadow-sm bg-white">
      {contextHolder}
      {dataFetchLoading ? (
        <div className="flex items-center justify-center min-h-[300px] p-8">
          <Spin size="large" spinning />
        </div>
      ) : (
        <table className="w-full border-collapse text-[13px]">
          {/* ================= HEADER ================= */}
          <thead className="bg-slate-100/90 border-b border-slate-200">
            <tr>
              {actions.length > 0 && (
                <th className="px-4 py-3.5 bg-slate-100 text-slate-700 font-extrabold uppercase tracking-wider text-[11px] text-center w-[75px] border-b border-slate-200">
                  Actions
                </th>
              )}

              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => col.sortable && onSort && onSort(col.key)}
                  className={`
                  px-4 py-3.5
                  bg-slate-100
                  text-slate-700
                  font-extrabold
                  uppercase
                  tracking-wider
                  border-b border-slate-200
                  text-[11px]
                  ${col.sortable
                      ? "cursor-pointer select-none hover:bg-slate-200/80 transition-colors"
                      : "cursor-default"
                    }
                `}
                >
                  <span className="flex items-center gap-1.5 whitespace-nowrap">
                    {col.label || col.title}
                    {sort?.field === col.key && (
                      <span className="text-blue-600 font-extrabold text-[12px]">
                        {sort.order === "asc" ? "▲" : "▼"}
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          {/* ================= BODY ================= */}
          <tbody className="divide-y divide-slate-100">
            {dataFetchLoading || data === null ? (
              <tr>
                <td
                  colSpan={columns.length + (actions.length > 0 ? 1 : 0)}
                  className="text-center py-12"
                >
                  <Spin size="large" />
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (actions.length > 0 ? 1 : 0)}
                  className="text-center py-12 text-slate-400 font-medium"
                >
                  No records found
                </td>
              </tr>
            ) : (
              data.map((row, i) => (
                <tr
                  key={i}
                  className={`
                    transition-colors duration-150
                    ${i % 2 === 0 ? "bg-white" : "bg-slate-50/40"}
                    hover:bg-blue-50/30
                  `}
                >
                  {actions.length > 0 && (
                    <td className="px-3 py-3 border-b border-slate-100 text-center align-middle w-[75px]">
                      <Dropdown
                        menu={getMenuItems(row)}
                        trigger={["click"]}
                        placement="bottomLeft"
                      >
                        <button
                          type="button"
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-600 hover:bg-red-700 text-white shadow-sm transition-all cursor-pointer border-none"
                          title="Actions Menu"
                        >
                          <SettingOutlined style={{ fontSize: 14 }} />
                        </button>
                      </Dropdown>
                    </td>
                  )}

                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className="
                        px-4 py-3.5
                        border-b border-slate-100
                        text-slate-700
                        align-middle
                        text-[13px]
                        whitespace-nowrap
                      "
                    >
                      {(() => {
                        const cellVal = row[col.key] || row[col.dataIndex];
                        const value = col.getValue
                          ? col.getValue(row)
                          : col.render
                          ? col.render(cellVal, row)
                          : cellVal;

                        // show clean dash for null / undefined / empty / "-"
                        if (value === null || value === undefined || value === "" || value === "-") {
                          return <span className="text-slate-300 font-normal italic">—</span>;
                        }

                        return value;
                      })()}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>

        </table>
      )}

      {/* Approve NGO Confirmation Modal */}
      <Modal
        title={`Approve Implementation Partner "${selectedRowToApprove?.name || selectedRowToApprove?.organization_name || 'NGO'}"?`}
        open={approveModalVisible}
        onOk={confirmApproveNGO}
        onCancel={() => setApproveModalVisible(false)}
        confirmLoading={approving}
        okText="Yes, Approve & Create User"
        okButtonProps={{ style: { background: "#16a34a", borderColor: "#16a34a" } }}
      >
        <div style={{ padding: "8px 0" }}>
          <p style={{ fontSize: "14px", color: "#334155" }}>Are you sure you want to approve this registration?</p>
          <div style={{ marginTop: 12, padding: "12px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", color: "#15803d", fontWeight: 600 }}>
            ✅ An active user account will be automatically generated for <strong>{selectedRowToApprove?.email_id || selectedRowToApprove?.email || 'NGO Email'}</strong> with default login password <strong>Default@123</strong>.
          </div>
        </div>
      </Modal>

      {/* Float RFP Modal */}
      <FloatRfpModal
        open={floatRfpModalVisible}
        onCancel={() => setFloatRfpModalVisible(false)}
        rfpRecord={selectedRowToFloatRfp}
        onSuccess={fetchData}
      />
    </div>
  );
};

/* ================= ICON MAPPER ================= */
// const getActionIcon = (slug) => {
//   switch (slug) {
//     case "view":
//       return <EyeFilled />;
//     case "edit":
//       return <EditOutlined />;
//     case "delete":
//       return <SettingOutlined />;
//     case "active_inactive": {
//       const isActive =
//         row?.[action?.form_details?.is_active_key];

//       return isActive ? (
//         <StopOutlined className="text-red-500" />
//       ) : (
//         <CheckCircleOutlined className="text-green-500" />
//       );
//     }
//     default:
//       return <SettingOutlined />;
//   }
// };
const getActionIcon = (action, row) => {
  if (action?.icon) {
    const iconName = String(action.icon).trim();
    const IconComp = getAntdIconComponent(iconName);
    if (IconComp) {
      return <IconComp />;
    }

    return <span className="text-sm font-normal">{action.icon}</span>;
  }

  switch (action.slug) {
    case "view":
      return <EyeFilled />;

    case "edit":
      return <EditOutlined />;

    case "active_inactive": {
      const isActive =
        row?.[action?.form_details?.is_active_key];

      return isActive ? (
        <StopOutlined className="text-red-500" />
      ) : (
        <CheckCircleOutlined className="text-green-500" />
      );
    }

    case "login_as":
      return <UserSwitchOutlined className="text-blue-500" />;

    case "reset_password":
      return <ReloadOutlined className="text-orange-500" />;

    default:
      return <SettingOutlined />;
  }
};


export default GeneralTableRender;
