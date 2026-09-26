"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  Breadcrumb,
  Button,
  App,
  Spin,
  Card,
  Space,
} from "antd";
import {
  ArrowLeftOutlined,
  SaveOutlined,
  SendOutlined,
  FileProtectOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import { privateHttpClient } from "@/services/api/httpClient";
import { dynamicSchemaDetailsAPI } from "@/services/dynamicForm-service";
import GeneralSectionV2 from "@/modules/dynamic-form-v2/add-edit/general-section/GeneralSectionV2";
import AddMoreSectionV2 from "@/modules/dynamic-form-v2/add-edit/add-more-section/AddMoreSectionV2";
import { appendSectionToFormData } from "@/modules/dynamic-form-v2/add-edit/formData.helper";
import { evaluateConditions } from "@/modules/dynamic-form-v2/helper/runTimeCondition.helper";
import { getDynamicFormHooks } from "@/modules/dynamic-form-v2/hooks/registerAllFormHooksV2";

export default function RfpAddPage() {
  const formSlug = "request_for_proposal";
  const router = useRouter();
  const { message, modal } = App.useApp();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [schema, setSchema] = useState(null);
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

  // Load Form Builder Schema dynamically
  useEffect(() => {
    let isMounted = true;
    const fetchSchema = async () => {
      try {
        setLoading(true);
        const res = await dynamicSchemaDetailsAPI({ form_slug: formSlug });
        const schemaData =
          res?.data?.data?.schema_details ||
          res?.data?.schema_details ||
          res?.data?.data ||
          res?.data ||
          {};
        if (isMounted) {
          setSchema(schemaData);
        }
      } catch (err) {
        console.error("Failed to load RFP schema:", err);
        message.error("Failed to load Request for Proposal form schema.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchSchema();
    return () => {
      isMounted = false;
    };
  }, [formSlug, message]);

  const memoizedSections = useMemo(() => schema?.sections || [], [schema?.sections]);

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

  // Form submission handler
  const handleSubmit = useCallback(
    async (statusVal = "submit") => {
      if (!schema) return;

      const finalFD = new FormData();
      finalFD.append("form_slug", formSlug);
      finalFD.append("status", statusVal);

      const isDraftSave = statusVal === "draft";
      let hasError = false;
      const sectionResults = [];

      // Validate and collect data from all visible dynamic sections
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

      // Hook extra fields if any
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
          await formHooks.onBeforeSubmit(finalFD, { isDraftSave, mode: "add" });
        } catch (err) {
          message.error(err.message || "Hook validation failed");
          return;
        }
      }

      setSubmitting(true);
      try {
        const url = schema?.api?.add || "dynamic-form/add";
        const res = await privateHttpClient.post(url, finalFD, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        const resData = res?.data || {};
        const rfpId =
          resData?.id ||
          resData?.data?.id ||
          resData?.primary_key_value ||
          resData?.data?.primary_key_value;

        // Custom post-submission workflow
        if (isDraftSave) {
          message.success("Request for Proposal saved as draft.");
          router.push("/admin/request-for-proposal");
          return;
        }

        const rfpType = String(finalFD.get("rfp_type") || "").toLowerCase();
        if (rfpType === "closed") {
          modal.confirm({
            title: "Closed Tender RFP Created",
            content:
              "The RFP has been created successfully. Would you like to view its details or return to the RFP list?",
            okText: "View Details",
            cancelText: "RFP List",
            okButtonProps: { className: "bg-blue-600 hover:bg-blue-700" },
            onOk: () => {
              if (rfpId) router.push(`/admin/request-for-proposal/${rfpId}`);
              else router.push("/admin/request-for-proposal");
            },
            onCancel: () => router.push("/admin/request-for-proposal"),
          });
          return;
        }

        message.success(
          resData?.message || "Request for Proposal created and published successfully!"
        );
        if (rfpId) {
          router.push(`/admin/request-for-proposal/${rfpId}`);
        } else {
          router.push("/admin/request-for-proposal");
        }
      } catch (error) {
        if (error?.response?.data?.errors) {
          setServerError(error?.response?.data?.errors);
        }
        message.error(
          error?.response?.data?.originalError ||
            error?.response?.data?.message ||
            "Failed to submit Request for Proposal."
        );
      } finally {
        setSubmitting(false);
      }
    },
    [schema, memoizedSections, isSectionVisible, formHooks, message, modal, router]
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
            { title: <span className="text-slate-800 font-semibold">Create RFP</span> },
          ]}
          className="text-xs"
        />
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => router.push("/admin/request-for-proposal")}
          className="rounded-lg shadow-xs hover:border-slate-400"
        >
          Back to List
        </Button>
      </div>

      {/* ── Enterprise Header ── */}
      <div className="bg-white rounded-xl p-5 shadow-xs border border-slate-200/80 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 text-2xl shadow-xs">
            <FileProtectOutlined />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 m-0">
              Create Request for Proposal
            </h1>
            <p className="text-xs text-slate-500 m-0 mt-0.5">
              {schema?.description ||
                "Publish a new RFP for NGOs and partners to submit project proposals"}
            </p>
          </div>
        </div>

        <Space className="flex-wrap">
          <Button
            icon={<SaveOutlined />}
            onClick={() => handleSubmit("draft")}
            loading={submitting}
            disabled={loading}
            className="rounded-lg font-medium"
          >
            Save Draft
          </Button>
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={() => handleSubmit("submit")}
            loading={submitting}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold shadow-xs"
          >
            Publish RFP
          </Button>
        </Space>
      </div>

      {/* ── Dynamic Form Sections ── */}
      {loading ? (
        <div className="bg-white rounded-xl p-16 shadow-xs border border-slate-200/80 flex flex-col items-center justify-center gap-3">
          <Spin size="large" />
          <span className="text-xs text-slate-500 font-medium">
            Loading Form Builder schema...
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
              <div key={section.section_id} id={`add_sec_${section.section_id}`}>
                {section.type === "general" && (
                  <GeneralSectionV2
                    ref={setSectionRef(section.section_id)}
                    section={section}
                    data={{}}
                    allFormValues={currentFormValues}
                    onValuesChange={(newVals) =>
                      handleValuesChange(section.section_id, newVals)
                    }
                    mode="add"
                    form_slug={formSlug}
                    serverError={serverError?.[section.section_id]}
                  />
                )}
                {section.type === "add_more" && (
                  <AddMoreSectionV2
                    ref={setSectionRef(section.section_id)}
                    section={section}
                    data={[]}
                    allData={currentFormValues}
                    mode="add"
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
              mode: "add",
              data: {},
              extraFieldsRef,
              position: "after_all_sections",
            })}

          {/* Bottom Action Bar */}
          <div className="bg-white rounded-xl p-4 shadow-xs border border-slate-200/80 flex items-center justify-between mt-2">
            <Button
              onClick={() => router.push("/admin/request-for-proposal")}
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
                Save Draft
              </Button>
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={() => handleSubmit("submit")}
                loading={submitting}
                className="bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold shadow-xs"
              >
                Publish RFP
              </Button>
            </Space>
          </div>
        </div>
      )}
    </div>
  );
}
