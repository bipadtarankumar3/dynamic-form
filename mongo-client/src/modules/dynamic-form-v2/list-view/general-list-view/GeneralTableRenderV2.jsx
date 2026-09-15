import React, { useState, useMemo } from "react";
import * as AntdIcons from "@ant-design/icons";
import { getAntdIconComponent } from "@/modules/form-builder/IconPickerModal";
import {
  CheckCircleOutlined,
  EditOutlined,
  EyeFilled,
  EyeOutlined,
  DeleteOutlined,
  ReloadOutlined,
  SendOutlined,
  SettingOutlined,
  StopOutlined,
  UserSwitchOutlined,
  UserOutlined,
  FileTextOutlined,
  StarOutlined,
  MoreOutlined
} from "@ant-design/icons";
import { App, Button, Dropdown, Menu, message, Modal, Spin, Table, Tooltip } from "antd";
import { getUser } from "@/context/AuthContext";
import { dynamicActiveInactiveAPI } from "@/services/dynamicForm-service";
import { privateHttpClient } from "@/services/api/httpClient";
import { getDynamicFormHooks } from "@/modules/dynamic-form-v2/hooks/registerAllFormHooksV2";
import FloatRfpModal from "@/app/(ngo)/_modules/ngo/components/FloatRfpModal";
import authUtils from "@/utils/authUtils";
import { hasModulePermissions } from "@/context/PermissionContext";
import { loginAsAPI, resetPasswordAPI } from "@/services/user-service";

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

const getRecordCellValue = (record, colKey) => {
  if (!record || !colKey) return undefined;
  if (record[colKey] !== undefined && record[colKey] !== null) return record[colKey];

  const trimmed = String(colKey).trim();
  if (record[trimmed] !== undefined && record[trimmed] !== null) return record[trimmed];

  const snake = trimmed.toLowerCase().replace(/\s+/g, "_");
  if (record[snake] !== undefined && record[snake] !== null) return record[snake];

  const title = snake.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  if (record[title] !== undefined && record[title] !== null) return record[title];

  // Check ID fields
  if (snake === "id" || snake === "_id") {
    return record.id || record._id || record.Id || record.ID;
  }

  // Check master label variations (e.g. state -> state_name, name_state, state_label)
  if (record[`${snake}_name`] !== undefined && record[`${snake}_name`] !== null) return record[`${snake}_name`];
  if (record[`name_${snake}`] !== undefined && record[`name_${snake}`] !== null) return record[`name_${snake}`];
  if (record[`${snake}_label`] !== undefined && record[`${snake}_label`] !== null) return record[`${snake}_label`];

  // Case & separator insensitive search across record keys
  const normTarget = trimmed.toLowerCase().replace(/[\s_]/g, "");
  const foundKey = Object.keys(record).find(
    (k) => k.toLowerCase().trim().replace(/[\s_]/g, "") === normTarget
  );
  if (foundKey && record[foundKey] !== undefined && record[foundKey] !== null) {
    return record[foundKey];
  }

  return undefined;
};

const GeneralTableRenderV2 = ({
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

  const targetFormSlug = formSlug || schema?.slug || schema?.form_slug;
  const formHooks = useMemo(() => getDynamicFormHooks(targetFormSlug), [targetFormSlug]);

  const processedColumns = useMemo(() => {
    if (formHooks?.getColumns) {
      return formHooks.getColumns({ defaultColumns: columns, schema });
    }
    return columns;
  }, [formHooks, columns, schema]);

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
              user_id: row?.tup_user_id,
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
              user_id: row?.tup_user_id,
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
          `${process.env.NEXT_PUBLIC_BASE_URL}${action?.view_url_TAB}?ctx=${encoded}`,
          "_blank"
        );
        break;
      }

      case "FORM":
      case "OPEN_MODAL": {
        if (action.slug === "view") {
          onViewAction?.({ data: row, mode: "view" });
        } else if (action.slug === "edit") {
          onEditAction?.({ data: row, mode: "edit" });
        } else if (action?.form_details?.is_children === true || (action.slug !== "view" && action.slug !== "edit")) {
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
          return;
        }

        modal.confirm({
          title: "Confirm",
          content: `Do you want to ${row[isActiveKey] ? "inactive" : "active"} this record?`,
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
        const pageSlug =
          action?.child_form_slug ||
          action?.form_details?.form_slug ||
          formSlug ||
          schema?.slug ||
          schema?.form_slug;
        const primaryKey = action?.form_details?.primary_key || schema?.root_entity?.primary_key || "id";
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
        const childSlug = action?.child_form_slug || action?.target_child_form_schema || action?.form_details?.form_slug || action?.slug;
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

      case "CUSTOM_PAGE": {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
        const targetSchema = action?.target_form_schema || action?.child_form_slug || "";
        const mode = action?.custom_page_mode || "details";
        const primaryKey = schema?.root_entity?.primary_key || "id";
        const rowId = row?.[primaryKey] || row?.id;
        const userId = row?.user_id || row?.created_by || row?.tup_user_id || rowId;
        const partnerId = row?.partner_id || rowId;
        const rawOrgName = row?.name || row?.organization_name || row?.org_name || "";

        let targetUrl = (action?.custom_url || "").trim();

        if (!targetUrl) {
          targetUrl = `${baseUrl}/admin/custom-page`;
        } else if (!targetUrl.startsWith("/") && !targetUrl.startsWith("http")) {
          // If relative (e.g. "dd-form" or "review-panel"), route to /admin/custom-page/<targetUrl>
          targetUrl = `${baseUrl}/admin/custom-page/${targetUrl}`;
        } else {
          // Replace dynamic tokens if any
          targetUrl = targetUrl
            .replace(/:id\b/g, rowId)
            .replace(/\[id\]/g, rowId)
            .replace(/:user_id\b/g, userId)
            .replace(/\[user_id\]/g, userId);

          if (baseUrl && targetUrl.startsWith("/") && !targetUrl.startsWith(baseUrl)) {
            targetUrl = `${baseUrl}${targetUrl}`;
          }
        }

        const separator = targetUrl.includes("?") ? "&" : "?";
        const queryParams = new URLSearchParams();
        if (targetSchema) queryParams.set("form_slug", targetSchema);
        if (mode) queryParams.set("mode", mode);
        if (userId) queryParams.set("user_id", String(userId));
        if (partnerId) queryParams.set("partner_id", String(partnerId));
        if (rawOrgName) queryParams.set("org_name", rawOrgName);
        if (formSlug) queryParams.set("parent_slug", formSlug);
        if (action?.always_last_row !== false) queryParams.set("always_last_row", "1");
        if (action?.enable_approval === true || action?.enable_approval === "1" || action?.enable_approval === "true") {
          queryParams.set("enable_approval", "1");
        } else if (action?.enable_approval === false || action?.enable_approval === 0 || action?.enable_approval === "0") {
          queryParams.set("enable_approval", "0");
        }

        const finalUrl = `${targetUrl}${separator}${queryParams.toString()}`;
        window.location.href = finalUrl;
        break;
      }

      default:
        console.warn("Action type executed:", action);
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
      messageApi.error(err?.response?.data?.message || "Failed to approve NGO");
    } finally {
      setApproving(false);
    }
  };

  const evaluateActionConditions = (action, row) => {
    if (!action?.conditions) return true;
    const condList = Array.isArray(action.conditions)
      ? action.conditions
      : (typeof action.conditions === "object" ? Object.values(action.conditions) : []);

    if (condList.length === 0) return true;

    return condList.every((cond) => {
      if (!cond?.field && !cond?.db_field && !cond?.column) return true;
      const fieldKey = cond.field || cond.db_field || cond.column;

      let val = row?.[fieldKey];
      if (val === undefined && row) {
        const lowerKey = String(fieldKey).toLowerCase();
        const foundKey = Object.keys(row).find((k) => k.toLowerCase() === lowerKey);
        if (foundKey) val = row[foundKey];
      }

      const target = cond.value;
      const op = cond.operator || cond.op || "equals";

      if (op === "equals" || op === "=" || op === "eq") {
        if (target === undefined || target === null || target === "") return true;
        return String(val ?? "").toLowerCase().trim() === String(target).toLowerCase().trim();
      }
      if (op === "not_equals" || op === "!=" || op === "neq") return String(val ?? "").toLowerCase().trim() !== String(target).toLowerCase().trim();
      if (op === "contains") return String(val ?? "").toLowerCase().includes(String(target).toLowerCase());
      if (op === "is_empty") return val === null || val === undefined || String(val).trim() === "";
      if (op === "is_not_empty") return val !== null && val !== undefined && String(val).trim() !== "";
      return true;
    });
  };

  const getRowActions = (row) => {
    const validActions = [];

    actions.forEach((action) => {
      if (action?.slug === "add") return;

      const isEditAction = action?.slug === "edit";
      const isViewAction = action?.slug === "view";
      const isActiveInactiveAction = action?.slug === "active_inactive";
      const isDeleteAction = action?.slug === "delete";
      const isLoginAsAction = action?.slug === "login_as";
      const isResetPasswordAction = action?.slug === "reset_password";
      const userPerms = Array.isArray(perms) ? perms : [];
      const isAdmin =
        role_slug === "admin" ||
        role_slug === "configurator" ||
        role_slug === "super_admin" ||
        role_slug === "superadmin" ||
        userPerms.includes("*") ||
        userPerms.length === 0;

      if (Array.isArray(action?.roles) && action.roles.length > 0 && !isAdmin) {
        if (!action.roles.includes(role_slug) && !userPerms.includes(action?.slug)) {
          return;
        }
      }

      const hideLoginAsAction = isLoginAsAction && !isAdmin;
      const hideResetPasswordAction = isResetPasswordAction && !isAdmin;
      const hideViewAction = isViewAction && !userPerms.includes("view") && !userPerms.includes("*") && !isAdmin;
      const hideDeleteAction = isDeleteAction && !userPerms.includes("delete") && !userPerms.includes("*") && !isAdmin;
      const hideActiveInactiveAction = isActiveInactiveAction && !userPerms.includes("active_inactive") && !userPerms.includes("*") && !isAdmin;
      const hideEditAction = isEditAction && !userPerms.includes("edit") && !userPerms.includes("*") && !isAdmin;

      if (
        hideEditAction ||
        hideViewAction ||
        hideActiveInactiveAction ||
        hideDeleteAction ||
        hideLoginAsAction ||
        hideResetPasswordAction
      ) {
        return;
      }

      if (!evaluateActionConditions(action, row)) {
        return;
      }

      validActions.push(action);
    });

    return validActions;
  };

  const antdColumns = useMemo(() => {
    const list = [];

    // 1. SL Column (Serial number)
    list.push({
      title: (
        <span className="font-extrabold uppercase tracking-wider text-[11.5px] text-slate-700">
          SL
        </span>
      ),
      key: "sl_no",
      width: 60,
      align: "center",
      className: "text-center align-middle font-semibold text-slate-500 text-xs",
      render: (_, __, index) => index + 1,
    });

    // 2. Actions Column
    if (actions.length > 0) {
      list.push({
        title: (
          <span className="font-extrabold uppercase tracking-wider text-[11.5px] text-slate-700">
            Actions
          </span>
        ),
        key: "actions",
        fixed: "left",
        width: 105,
        align: "center",
        className: "text-center align-middle py-1",
        render: (_, record) => {
          const rowActions = getRowActions(record);
          if (!rowActions || rowActions.length === 0) return <span className="text-slate-300">—</span>;

          const editAction = rowActions.find((a) => a.slug === "edit");
          const deleteAction = rowActions.find((a) => a.slug === "delete");
          const viewAction = rowActions.find((a) => a.slug === "view");
          const otherActions = rowActions.filter(
            (a) => a.slug !== "view" && a.slug !== "edit" && a.slug !== "delete"
          );

          return (
            <div
              className="db-views-action-btns"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              {editAction && (
                <Tooltip title={getActionLabel(editAction, record) || "Edit"} color="#7c3aed">
                  <Button
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => executeAction(editAction, record)}
                    className="conf-action-outline-btn conf-action-edit-view-btn"
                  />
                </Tooltip>
              )}

              {deleteAction && (
                <Tooltip title={getActionLabel(deleteAction, record) || "Delete"} color="#dc2626">
                  <Button
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() => executeAction(deleteAction, record)}
                    className="conf-action-delete-btn"
                  />
                </Tooltip>
              )}

              {viewAction && (
                <Tooltip title={getActionLabel(viewAction, record) || "View"} color="#16a34a">
                  <Button
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={() => executeAction(viewAction, record)}
                    className="conf-action-edit-btn conf-action-preview-btn"
                  />
                </Tooltip>
              )}

              {otherActions.length > 0 && otherActions.length <= 2 && !viewAction && (
                otherActions.map((act) => (
                  <Tooltip key={act.slug || act.name} title={getActionLabel(act, record)}>
                    <Button
                      size="small"
                      icon={getActionIcon(act, record)}
                      onClick={() => executeAction(act, record)}
                      className="conf-action-outline-btn"
                    />
                  </Tooltip>
                ))
              )}

              {((otherActions.length > 0 && viewAction) || (otherActions.length > 2)) && (
                <Dropdown
                  menu={{
                    items: otherActions.map((act) => ({
                      key: act.slug || act.name,
                      label: (
                        <span className="flex items-center gap-2 text-[13px]">
                          {getActionIcon(act, record)}
                          <span>{getActionLabel(act, record)}</span>
                        </span>
                      ),
                      onClick: () => executeAction(act, record),
                    })),
                  }}
                  trigger={["click"]}
                  placement="bottomRight"
                >
                  <Tooltip title="More Actions">
                    <Button
                      size="small"
                      icon={<MoreOutlined />}
                      className="conf-action-outline-btn"
                      style={{
                        borderColor: "#cbd5e1",
                        color: "#64748b",
                      }}
                    />
                  </Tooltip>
                </Dropdown>
              )}
            </div>
          );
        },
      });
    }

    // 3. Data Columns
    processedColumns.forEach((col) => {
      list.push({
        title: (
          <span className="font-extrabold text-[11.5px] uppercase tracking-wider text-slate-700">
            {col.label || col.title || col.key}
          </span>
        ),
        dataIndex: col.dataIndex || col.key,
        key: col.key,
        align: col.align || "left",
        sorter: col.sortable !== false ? (a, b) => {
          const valA = getRecordCellValue(a, col.key) ?? "";
          const valB = getRecordCellValue(b, col.key) ?? "";
          if (typeof valA === "number" && typeof valB === "number") {
            return valA - valB;
          }
          return String(valA).localeCompare(String(valB));
        } : false,
        render: (cellVal, record, index) => {
          const resolvedVal = (cellVal !== undefined && cellVal !== null && cellVal !== "")
            ? cellVal
            : getRecordCellValue(record, col.key);

          const value = col.getValue
            ? col.getValue(record)
            : col.render
            ? col.render(resolvedVal, record, index)
            : resolvedVal;

          if (value === null || value === undefined || value === "" || value === "-") {
            return <span className="text-slate-300 font-normal italic">—</span>;
          }

          // Format numbers / amounts (e.g. 100000 -> ₹100,000)
          const isAmountField = col.key?.toLowerCase().includes("amount") || col.key?.toLowerCase().includes("cost") || col.key?.toLowerCase().includes("budget") || col.key?.toLowerCase().includes("price");
          if (isAmountField && !isNaN(Number(value)) && Number(value) > 0) {
            return (
              <span className="font-bold text-slate-900 text-[13px]">
                ₹{Number(value).toLocaleString("en-IN")}
              </span>
            );
          }

          // User / Created by / Updated by formatting
          const isUserField =
            col.key?.toLowerCase().includes("user") ||
            col.key?.toLowerCase().includes("created_by") ||
            col.key?.toLowerCase().includes("updated_by") ||
            col.key?.toLowerCase().includes("modified_by") ||
            col.key?.toLowerCase().includes("owner") ||
            col.key?.toLowerCase().includes("author");

          if (isUserField && typeof value === "string" && value.trim()) {
            const isUpdated = col.key?.toLowerCase().includes("updated") || col.key?.toLowerCase().includes("modified");
            return (
              <span className={`conf-user-chip ${isUpdated ? "conf-user-chip--updated" : "conf-user-chip--created"}`}>
                <span className="conf-user-avatar">
                  <UserOutlined />
                </span>
                <span className="conf-user-name">{value}</span>
              </span>
            );
          }

          // Status & Badge strings
          if (typeof value === "string") {
            const low = value.toLowerCase().trim();
            if (low === "active" || low === "published" || low === "approved") {
              return (
                <span className="conf-badge-published">
                  {value.toUpperCase()}
                </span>
              );
            }
            if (low === "inactive" || low === "rejected" || low === "deleted") {
              return (
                <span
                  style={{
                    background: "#fef2f2",
                    color: "#dc2626",
                    border: "1px dashed #f87171",
                    fontWeight: 700,
                    fontSize: "11px",
                    borderRadius: "6px",
                    padding: "2px 9px",
                    letterSpacing: "0.3px",
                    textTransform: "uppercase",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {value.toUpperCase()}
                </span>
              );
            }
            if (low === "draft" || low === "pending" || low === "pending approval" || low === "in draft") {
              return (
                <span className="conf-badge-draft">
                  {value.toUpperCase()}
                </span>
              );
            }
            if (low === "plant" || low === "cpc" || low === "ongoing" || low === "completed") {
              return (
                <span
                  style={{
                    background: "rgba(var(--primary-color-rgb, 79, 70, 229), 0.08)",
                    color: "var(--primary-color, #4f46e5)",
                    border: "1px dashed rgba(var(--primary-color-rgb, 79, 70, 229), 0.3)",
                    fontWeight: 700,
                    fontSize: "11px",
                    borderRadius: "6px",
                    padding: "2px 9px",
                    letterSpacing: "0.3px",
                    textTransform: "uppercase",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {value.toUpperCase()}
                </span>
              );
            }
          }

          if (typeof value === "string") {
            const isWideCol =
              col.key?.toLowerCase().includes("name") ||
              col.key?.toLowerCase().includes("desc") ||
              col.key?.toLowerCase().includes("title") ||
              col.key?.toLowerCase().includes("activity") ||
              col.key?.toLowerCase().includes("address") ||
              col.key?.toLowerCase().includes("schedule");

            return (
              <Tooltip title={value} placement="topLeft">
                <span
                  className={`text-slate-800 text-[13px] font-medium conf-cell-truncate ${
                    isWideCol ? "conf-cell-truncate--wide" : ""
                  }`}
                >
                  {value}
                </span>
              </Tooltip>
            );
          }

          return <span className="text-slate-800 text-[13px] font-medium">{value}</span>;
        },
      });
    });

    return list;
  }, [actions, processedColumns, perms, role_slug]);

  const dataSourceWithKeys = useMemo(() => {
    if (!Array.isArray(data)) return [];
    const pk = schema?.root_entity?.primary_key || "id";
    return data.map((record, index) => {
      const uniqueKey =
        record?.id ??
        record?.key ??
        record?.[pk] ??
        record?._id ??
        record?.uuid ??
        `row_${index}`;
      return {
        ...record,
        __table_row_key: String(uniqueKey),
      };
    });
  }, [data, schema]);

  return (
    <div className="w-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {contextHolder}
      <style jsx global>{`
        .techcsr-modern-datatable .ant-table-thead > tr > th {
          background-color: #f8fafc !important;
          border-bottom: 2px solid #e2e8f0 !important;
          padding: 8px 12px !important;
          font-size: 11px !important;
          font-weight: 800 !important;
          letter-spacing: 0.04em !important;
          color: #334155 !important;
          white-space: nowrap !important;
        }
        .techcsr-modern-datatable .ant-table-tbody > tr.ant-table-measure-row,
        .techcsr-modern-datatable tr.ant-table-measure-row {
          height: 0 !important;
          visibility: collapse !important;
          border: none !important;
          padding: 0 !important;
          margin: 0 !important;
        }
        .techcsr-modern-datatable .ant-table-tbody > tr.ant-table-measure-row > td,
        .techcsr-modern-datatable tr.ant-table-measure-row > td {
          padding: 0 !important;
          border: none !important;
          height: 0 !important;
          font-size: 0 !important;
          line-height: 0 !important;
          visibility: collapse !important;
        }
        .techcsr-modern-datatable .ant-table-tbody > tr:not(.ant-table-measure-row) > td {
          padding: 8px 12px !important;
          border-bottom: 1px solid #f1f5f9 !important;
          font-size: 12.5px !important;
          color: #1e293b !important;
        }
        .techcsr-modern-datatable .ant-table-tbody > tr:not(.ant-table-measure-row):hover > td {
          background-color: #f8fafc !important;
        }
        .techcsr-modern-datatable .ant-pagination {
          margin: 0 !important;
          padding: 10px 16px !important;
          border-top: 1px solid #e2e8f0 !important;
          background: #ffffff !important;
          display: flex !important;
          align-items: center !important;
          justify-content: flex-end !important;
          gap: 6px !important;
        }
        .techcsr-modern-datatable .ant-pagination-item-active {
          background-color: #4f46e5 !important;
          border-color: #4f46e5 !important;
        }
        .techcsr-modern-datatable .ant-pagination-item-active a {
          color: #ffffff !important;
          font-weight: 700 !important;
        }
      `}</style>
      <Table
        columns={antdColumns}
        dataSource={dataSourceWithKeys}
        rowKey="__table_row_key"
        loading={dataFetchLoading}
        size="small"
        scroll={{ x: "max-content" }}
        className="techcsr-modern-datatable"
        pagination={{
          defaultPageSize: 10,
          pageSizeOptions: ["10", "25", "50", "100"],
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => (
            <span className="text-xs text-slate-500 font-semibold mr-3">
              Showing {range[0]} to {range[1]} of {total} entries
            </span>
          ),
          position: ["bottomRight"],
        }}
      />

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

      <FloatRfpModal
        open={floatRfpModalVisible}
        onCancel={() => setFloatRfpModalVisible(false)}
        rfpRecord={selectedRowToFloatRfp}
        onSuccess={fetchData}
      />
    </div>
  );
};

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
      const isActive = row?.[action?.form_details?.is_active_key];
      return isActive ? (
        <StopOutlined className="text-red-500" />
      ) : (
        <CheckCircleOutlined className="text-green-500" />
      );
    }
    default:
      return <SettingOutlined />;
  }
};

export default GeneralTableRenderV2;
