"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Breadcrumb,
  Button,
  App,
  Spin,
  Space,
  Alert,
} from "antd";
import {
  ArrowLeftOutlined,
  SaveOutlined,
  CheckCircleOutlined,
  EditOutlined,
  EyeOutlined,
  LockOutlined,
} from "@ant-design/icons";
import { privateHttpClient } from "@/services/api/httpClient";
import {
  dynamicDetailsAPI,
  dynamicSchemaDetailsAPI,
} from "@/services/dynamicForm-service";
import GeneralSectionV2 from "@/modules/dynamic-form-v2/add-edit/general-section/GeneralSectionV2";
import AddMoreSectionV2 from "@/modules/dynamic-form-v2/add-edit/add-more-section/AddMoreSectionV2";
import { appendSectionToFormData } from "@/modules/dynamic-form-v2/add-edit/formData.helper";
import {
  evaluateConditions,
  evaluateActionConditions,
} from "@/modules/dynamic-form-v2/helper/runTimeCondition.helper";
import { getUser } from "@/context/AuthContext";
import { getDynamicFormHooks } from "@/modules/dynamic-form-v2/hooks/registerAllFormHooksV2";

export default function RfpEditPage() {
  const formSlug = "request_for_proposal";
  const router = useRouter();
  const params = useParams();
  const rfpId = params?.id;
  const { message } = App.useApp();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [schema, setSchema] = useState(null);
  const [data, setData] = useState({});
  const [currentFormValues, setCurrentFormValues] = useState({});
  const [serverError, setServerError] = useState({});

  const sectionRefs = useRef({});
  const setSectionRef = useCallback(
    (id) => (r) => {
      sectionRefs.current[id] = r;
    },
    []
  );

  const extraFieldsRef = useRef(null);
  const formHooks = useMemo(() => getDynamicFormHooks(formSlug), [formSlug]);

  // Load both Form Builder Schema and RFP record data dynamically
  useEffect(() => {
    let isMounted = true;
    if (!rfpId) return;

    const loadData = async () => {
      try {
        setLoading(true);
        const [schemaRes, dataRes] = await Promise.all([
          dynamicSchemaDetailsAPI({ form_slug: formSlug }),
          dynamicDetailsAPI("dynamic-form/details", {
            selected_data: { id: rfpId },
            form_slug: formSlug,
          }),
        ]);

        const schemaData =
          schemaRes?.data?.data?.schema_details ||
          schemaRes?.data?.schema_details ||
          schemaRes?.data?.data ||
          schemaRes?.data ||
          {};

        const recordData =
          dataRes?.data?.data ||
          dataRes?.data ||
          {};

        if (isMounted) {
          setSchema(schemaData);
          setData(recordData);
          setCurrentFormValues(recordData);
        }
      } catch (err) {
        console.error("Failed to load RFP edit data:", err);
        message.error("Failed to load Request for Proposal details for editing.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, [formSlug, rfpId, message]);

  const loggedInUser = getUser();
  const currentUserId = loggedInUser?.user_id || loggedInUser?.id;
  const isAdmin =
    loggedInUser?.role_slug === "superadmin" ||
    loggedInUser?.role_slug === "admin" ||
    loggedInUser?.role_id === 1 ||
    loggedInUser?.role_id === 2;

  const recordCreatedBy = data?.created_by || data?.user_id;
  const isRecordCreator = Boolean(
    currentUserId && Number(currentUserId) === Number(recordCreatedBy)
  );

  const editAction = schema?.actions?.find((a) => a.slug === "edit");
  const hasConfiguredConditions = Boolean(
    editAction?.conditions &&
    (Array.isArray(editAction.conditions)
      ? editAction.conditions.length > 0
      : Array.isArray(editAction.conditions?.rules)
      ? editAction.conditions.rules.length > 0
      : Object.keys(editAction.conditions).length > 0)
  );

  const passesEditActionConditions = editAction ? evaluateActionConditions(editAction, data) : true;

  const recordStatus = String(data?.status || data?.frm_status || "").trim().toUpperCase();
  const isApprovalLocked =
    recordStatus === "APPROVED" ||
    recordStatus.startsWith("PENDING_") ||
    recordStatus === "SEND_FOR_APPROVAL";

  const isEditable = editAction
    ? (hasConfiguredConditions
        ? passesEditActionConditions
        : (!isApprovalLocked && (recordStatus === "DRAFT" || recordStatus === "" || isAdmin || isRecordCreator)))
    : (!isApprovalLocked && (recordStatus === "DRAFT" || recordStatus === ""));

  const memoizedSections = useMemo(() => schema?.sections || [], [schema?.sections]);
  const memoizedSectionsData = useMemo(() => data || {}, [data]);

  const handleValuesChange = useCallback((sectionId, newSectionValues) => {
    setCurrentFormValues((prev) => ({
      ...prev,
      ...newSectionValues,
      [sectionId]: newSectionValues,
    }));
  }, []);

  const isSectionVisible = useCallback(
    (section) => {
      if (!section?.conditions?.rules || section.conditions.rules.length === 0) {
        return true;
      }
      return evaluateConditions(section.conditions, currentFormValues);
    },
    [currentFormValues]
  );

  // Form edit submission handler
  const handleSubmit = useCallback(
    async (statusVal = "submit") => {
      if (!schema || !rfpId) return;

      if (!isEditable) {
        message.warning("This RFP cannot be edited because it does not meet the edit conditions.");
        return;
      }

      const finalFD = new FormData();
      finalFD.append("form_slug", formSlug);
      finalFD.append("status", statusVal);

      const rootPKField = schema?.root_entity?.primary_key || "id";
      finalFD.append(rootPKField, rfpId);
      if (rootPKField !== "id") finalFD.append("id", rfpId);

      const isDraftSave = statusVal === "draft";
      let hasError = false;
      const sectionResults = [];

      for (const section of memoizedSections) {
        if (!isSectionVisible(section)) continue;
        const ref = sectionRefs.current[section.section_id];
        if (!ref?.getData) continue;

        const result = await ref.getData();
        sectionResults.push({ section, result });

        if (!isDraftSave && !result.valid) {
          hasError = true;
        }
      }

      if (!isDraftSave && hasError) {
        for (const { section, result } of sectionResults) {
          if (!result.valid) {
            const errKeys = Object.keys(result?.errors || {});
            const firstErrMsg =
              errKeys.length > 0 ? result.errors[errKeys[0]] : "Validation failed";
            const secName = section?.section_label || "General";
            message.error(`Section "${secName}": ${firstErrMsg}`);
            return;
          }
        }
      }

      for (const { section, result } of sectionResults) {
        if (result?.data) {
          appendSectionToFormData(finalFD, section.section_id, result.data);
        }
      }

      if (extraFieldsRef.current?.getData) {
        const extraResult = await extraFieldsRef.current.getData();
        if (!isDraftSave && extraResult && !extraResult.valid) {
          message.error(
            extraResult.errors?.[Object.keys(extraResult.errors || {})[0]] ||
              "Extra field validation failed."
          );
          return;
        }
        if (extraResult?.data) {
          for (const [key, value] of Object.entries(extraResult.data)) {
            if (value !== undefined && value !== null) {
              finalFD.append(
                `extra__${key}`,
                typeof value === "object" ? JSON.stringify(value) : value
              );
            }
          }
        }
      }

      if (formHooks?.onBeforeSubmit) {
        try {
          await formHooks.onBeforeSubmit(finalFD, { isDraftSave, mode: "edit" });
        } catch (err) {
          message.error(err.message || "Hook validation failed");
          return;
        }
      }

      setSubmitting(true);
      try {
        const url = schema?.api?.edit || "dynamic-form/edit";
        const res = await privateHttpClient.post(url, finalFD, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        message.success(
          res?.data?.message || "Request for Proposal updated successfully!"
        );
        router.push(`/admin/request-for-proposal/${rfpId}`);
      } catch (error) {
        if (error?.response?.data?.errors) {
          setServerError(error?.response?.data?.errors);
        }
        message.error(
          error?.response?.data?.originalError ||
            error?.response?.data?.message ||
            "Failed to update Request for Proposal."
        );
      } finally {
        setSubmitting(false);
      }
    },
    [schema, rfpId, memoizedSections, isSectionVisible, formHooks, message, router, isEditable]
  );

  return (
    <div className="perm-page-container p-6 bg-slate-50 min-h-screen">
      {/* ── Breadcrumb & Top Bar ── */}
      <div className="mb-4 flex items-center justify-between">
        <Breadcrumb
          items={[
            {
              title: (
                <span
                  onClick={() => router.push("/admin/request-for-proposal")}
                  className="cursor-pointer text-slate-500 hover:text-blue-600 font-medium"
                >
                  RFP Management
                </span>
              ),
            },
            {
              title: (
                <span
                  onClick={() => router.push(`/admin/request-for-proposal/${rfpId}`)}
                  className="cursor-pointer text-slate-500 hover:text-blue-600 font-medium"
                >
                  RFP #{rfpId}
                </span>
              ),
            },
            { title: <span className="text-slate-800 font-semibold">Edit</span> },
          ]}
          className="text-xs"
        />
        <Space>
          <Button
            icon={<EyeOutlined />}
            onClick={() => router.push(`/admin/request-for-proposal/${rfpId}`)}
            className="rounded-lg shadow-xs hover:border-slate-400"
          >
            View Details
          </Button>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push("/admin/request-for-proposal")}
            className="rounded-lg shadow-xs hover:border-slate-400"
          >
            Back to List
          </Button>
        </Space>
      </div>

      {/* ── Enterprise Header ── */}
      <div className="bg-white rounded-xl p-5 shadow-xs border border-slate-200/80 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 text-2xl shadow-xs">
            <EditOutlined />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 m-0">
              Edit Request for Proposal #{rfpId}
            </h1>
            <p className="text-xs text-slate-500 m-0 mt-0.5">
              Update RFP requirements, budget guidelines, timeline milestones, or eligibility
            </p>
          </div>
        </div>

        <Space className="flex-wrap">
          <Button
            icon={<SaveOutlined />}
            onClick={() => handleSubmit("draft")}
            loading={submitting}
            disabled={loading || !isEditable}
            className="rounded-lg font-medium"
          >
            Save as Draft
          </Button>
          <Button
            type="primary"
            icon={<CheckCircleOutlined />}
            onClick={() => handleSubmit("submit")}
            loading={submitting}
            disabled={loading || !isEditable}
            className="bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold shadow-xs"
          >
            Save Changes
          </Button>
        </Space>
      </div>

      {/* ── Locked / Not Editable Alert ── */}
      {!loading && !isEditable && (
        <Alert
          type="warning"
          showIcon
          icon={<LockOutlined style={{ fontSize: 20, color: "#d97706" }} />}
          className="mb-6 rounded-xl border border-amber-200 bg-amber-50/80 p-4 shadow-xs"
          message={
            <span className="text-sm font-bold text-amber-900">
              Editing Not Permitted
            </span>
          }
          description={
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-1">
              <span className="text-xs text-amber-800">
                This Request for Proposal cannot be modified because its current status (
                <strong>{recordStatus || "UNKNOWN"}</strong>) does not meet the configured edit criteria. Editing is only permitted when status satisfies condition rules (e.g. Draft).
              </span>
              <Button
                size="small"
                type="primary"
                icon={<EyeOutlined />}
                onClick={() => router.push(`/admin/request-for-proposal/${rfpId}`)}
                className="bg-amber-700 hover:bg-amber-800 text-white font-semibold self-start sm:self-auto"
              >
                View Details
              </Button>
            </div>
          }
        />
      )}

      {/* ── Dynamic Form Sections ── */}
      {loading ? (
        <div className="bg-white rounded-xl p-16 shadow-xs border border-slate-200/80 flex flex-col items-center justify-center gap-3">
          <Spin size="large" />
          <span className="text-xs text-slate-500 font-medium">
            Loading RFP #{rfpId} data and Form Builder schema...
          </span>
        </div>
      ) : memoizedSections.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center text-slate-400 border border-slate-200">
          No form sections found for Request for Proposal.
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {memoizedSections.map((section) => {
            if (!isSectionVisible(section)) return null;
            return (
              <div key={section.section_id} id={`edit_sec_${section.section_id}`}>
                {section.type === "general" && (
                  <GeneralSectionV2
                    ref={setSectionRef(section.section_id)}
                    section={section}
                    data={memoizedSectionsData}
                    allFormValues={currentFormValues}
                    onValuesChange={(newVals) =>
                      handleValuesChange(section.section_id, newVals)
                    }
                    mode="edit"
                    form_slug={formSlug}
                    serverError={serverError?.[section.section_id]}
                  />
                )}
                {section.type === "add_more" && (
                  <AddMoreSectionV2
                    ref={setSectionRef(section.section_id)}
                    section={section}
                    data={
                      memoizedSectionsData[section.slug] ||
                      memoizedSectionsData[section.section_id] ||
                      []
                    }
                    allData={currentFormValues}
                    mode="edit"
                    form_slug={formSlug}
                    serverError={serverError?.[section.section_id]}
                  />
                )}
              </div>
            );
          })}

          {formHooks?.getExtraFields &&
            formHooks.getExtraFields({
              form_slug: formSlug,
              mode: "edit",
              data: memoizedSectionsData,
              selectedData: { id: rfpId },
              extraFieldsRef,
              position: "after_all_sections",
            })}

          {/* Bottom Action Bar */}
          <div className="bg-white rounded-xl p-4 shadow-xs border border-slate-200/80 flex items-center justify-between mt-2">
            <Button
              onClick={() => router.push(`/admin/request-for-proposal/${rfpId}`)}
              disabled={submitting}
              className="rounded-lg font-medium"
            >
              Cancel
            </Button>
            <Space>
              <Button
                icon={<SaveOutlined />}
                onClick={() => handleSubmit("draft")}
                loading={submitting}
                className="rounded-lg font-medium"
              >
                Save as Draft
              </Button>
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={() => handleSubmit("submit")}
                loading={submitting}
                className="bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold shadow-xs"
              >
                Save Changes
              </Button>
            </Space>
          </div>
        </div>
      )}
    </div>
  );
}
