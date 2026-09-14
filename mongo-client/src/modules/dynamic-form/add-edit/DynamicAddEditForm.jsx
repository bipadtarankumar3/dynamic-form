import { Button, message, Spin } from "antd";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { privateHttpClient } from "@/services/api/httpClient";
import { getDynamicFormHooks } from "../hooks/dynamicFormHookRegistry";
import {
  dynamicDetailsAPI,
  dynamicSchemaDetailsAPI,
} from "@/services/dynamicForm-service";
import AddMoreSection from "./add-more-section/AddMoreSection";
import { appendSectionToFormData } from "./formData.helper";
import GeneralSection from "./general-section/GeneralSection";

const DynamicAddEditForm = forwardRef((props, ref) => {
  const [messageApi, contextHolder] = message.useMessage();
  const {
    onClose,
    mode,
    form_slug,
    fetchData,
    selectedData,
    details_url_API,
    childrenInformation,
  } = props;
  const sectionRefs = useRef({});
  const setSectionRef = useCallback(
    (id) => (r) => {
      sectionRefs.current[id] = r;
    },
    []
  );
  // Ref exposed to hook-injected extra fields so they can participate in submit
  const extraFieldsRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [schema, setSchema] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState({});
  const [serverError, setServerError] = useState({});

  const memoizedSections = useMemo(
    () => schema?.sections || [],
    [schema?.sections]
  );
  const memoizedSectionsData = useMemo(() => data || {}, [data]);

  const resetAllSections = useCallback(() => {
    Object.values(sectionRefs.current).forEach((sectionRef) => {
      sectionRef?.reset?.();
    });
  }, []);

  const handleSubmit = useCallback(async (statusVal = "submit") => {
    const finalFD = new FormData();
    finalFD.append("form_slug", childrenInformation?.form_slug || form_slug);
    finalFD.append("status", statusVal); // "draft" or "submit"
    if (
      childrenInformation?.parent_primary_key &&
      childrenInformation?.parent_primary_key_value
    ) {
      finalFD.append(
        "parent_primary_key",
        childrenInformation?.parent_primary_key
      );
      finalFD.append(
        "parent_primary_key_value",
        childrenInformation?.parent_primary_key_value
      );
    }
    let hasError = false;
    const sectionResults = [];

    // Skip strict field validation when saving draft so users can save partial progress
    const isDraftSave = statusVal === "draft";

    for (const section of memoizedSections) {
      const ref = sectionRefs.current[section.section_id];
      if (!ref?.getData) continue;

      const result = await ref.getData();

      sectionResults.push({ section, result });

      if (!isDraftSave && !result.valid) {
        hasError = true;
      }
    }

    // ❌ STOP immediately if any validation failed (for final submit)
    if (!isDraftSave && hasError) {
      for (const { section, result } of sectionResults) {
        if (!result.valid) {
          const errKeys = Object.keys(result?.errors || {});
          const firstErrMsg = errKeys.length > 0 ? result.errors[errKeys[0]] : "Validation failed";
          const secName = section?.section_label || "General";
          messageApi.error(`Section "${secName}": ${firstErrMsg}`);
          break;
        }
      }
      return;
    }

    // ✅ Append section data to FormData
    for (const { section, result } of sectionResults) {
      if (result?.data) {
        appendSectionToFormData(finalFD, section.section_id, result.data);
      }
    }

    // ── Collect extra hook-injected field data ──────────────────────
    if (extraFieldsRef.current?.getData) {
      const extraResult = await extraFieldsRef.current.getData();
      if (!isDraftSave && extraResult && !extraResult.valid) {
        messageApi.error(extraResult.errors?.[Object.keys(extraResult.errors || {})[0]] || "Extra field validation failed.");
        return;
      }
      if (extraResult?.data) {
        // Append each extra field key directly into the FormData
        for (const [key, value] of Object.entries(extraResult.data)) {
          if (value !== undefined && value !== null) {
            finalFD.append(`extra__${key}`, typeof value === "object" ? JSON.stringify(value) : value);
          }
        }
      }
    }

    setSubmitting(true);
    try {
      const url =
        (mode === "add" ? schema?.api?.add : schema?.api?.edit) ||
        (mode === "add" ? "dynamic-form/add" : "dynamic-form/edit");

      const res = await privateHttpClient.post(url, finalFD, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      fetchData?.(res?.data);
      onClose?.();
      messageApi.success(
        res?.data?.message || (isDraftSave ? "Draft saved successfully." : "Form submitted successfully.")
      );
    } catch (error) {
      if (error?.response?.data?.errors) {
        setServerError(error?.response?.data?.errors);
      }
      messageApi.error(
        error?.response?.data?.originalError || error?.response?.data?.message
      );
    } finally {
      setSubmitting(false);
    }
  }, [memoizedSections, form_slug, mode, messageApi, childrenInformation, schema]);

  useImperativeHandle(ref, () => ({
    resetAll: resetAllSections,
  }));

  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        setLoading(true);

        if (mode === "edit" && selectedData) {
          const [schemaRes, dataRes] = await Promise.all([
            dynamicSchemaDetailsAPI({ form_slug }),
            dynamicDetailsAPI(details_url_API || "dynamic-form/details", {
              selected_data: selectedData,
              form_slug,
            }),
          ]);

          if (!alive) return;

          setSchema(schemaRes?.data?.data);
          setData(dataRes.data.data);
        } else {
          const schemaRes = await dynamicSchemaDetailsAPI({
            form_slug: childrenInformation?.form_slug || form_slug,
          });

          if (!alive) return;

          setSchema(schemaRes?.data?.data);
          setData({});
        }
      } catch (err) {
        console.error("Error loading form:", err);
      } finally {
        if (alive) setLoading(false);
      }
    };

    load();

    return () => {
      alive = false;
    };
  }, [mode, selectedData, form_slug, childrenInformation, details_url_API]);

  const [activeSectionId, setActiveSectionId] = useState(null);

  useEffect(() => {
    if (memoizedSections?.length > 0 && !activeSectionId) {
      setActiveSectionId(memoizedSections[0]?.section_id);
    }
  }, [memoizedSections, activeSectionId]);

  const containerRef = useRef(null);

  const scrollToSection = (secId) => {
    setActiveSectionId(secId);
    const el = document.getElementById(`edit_sec_${secId}`);
    const container = containerRef.current;
    if (el && container) {
      const top = el.offsetTop - container.offsetTop;
      container.scrollTo({ top, behavior: "smooth" });
    } else if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" });
    }
  };

  const renderSidebar = () => {
    if (!memoizedSections || memoizedSections.length <= 1) return null;

    return (
      <div
        style={{
          width: 210,
          minWidth: 210,
          borderRight: "1px solid #e2e8f0",
          paddingRight: 12,
          marginRight: 16,
          position: "sticky",
          top: 10,
          alignSelf: "flex-start",
          maxHeight: "calc(100vh - 120px)",
          overflowY: "auto",
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8, paddingLeft: 6 }}>
          SECTIONS
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {memoizedSections.map((sec, idx) => {
            const isActive = activeSectionId === sec.section_id || (!activeSectionId && idx === 0);
            return (
              <button
                key={sec.section_id || idx}
                type="button"
                onClick={() => scrollToSection(sec.section_id)}
                style={{
                  textAlign: "left",
                  padding: "8px 10px",
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? "var(--primary-color, #15803d)" : "#475569",
                  backgroundColor: isActive ? "rgba(var(--primary-color-rgb, 21, 128, 61), 0.12)" : "transparent",
                  borderLeft: isActive ? "3px solid var(--primary-color, #15803d)" : "3px solid transparent",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {sec.type === "add_more" ? "📋 " : "📄 "}
                {sec.section_label}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="relative">
      {contextHolder}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/60 z-20">
          <Spin size="large" />
        </div>
      )}
      {!loading && memoizedSections?.length === 0 && (
        <div className="text-center py-6 text-gray-500">No sections found.</div>
      )}
      <div ref={containerRef} className="relative max-h-[75vh] overflow-y-auto overflow-x-hidden p-1 flex items-start">
        {renderSidebar()}
        <div className="flex-1 min-w-0 flex flex-col gap-4 pr-1">
          {memoizedSections?.map((section) => {
            if (form_slug === "monitoring" && section.type === "add_more") return null;
            return (
              <div key={section.section_id} id={`edit_sec_${section.section_id}`}>
                {section.type === "general" && (
                  <GeneralSection
                    ref={setSectionRef(section.section_id)}
                    section={section}
                    data={memoizedSectionsData}
                    mode={mode}
                    form_slug={form_slug}
                    serverError={serverError?.[section.section_id]}
                  />
                )}
                {section.type === "add_more" && (
                  <AddMoreSection
                    ref={setSectionRef(section.section_id)}
                    section={section}
                    data={memoizedSectionsData[section.slug] || memoizedSectionsData[section.section_id]}
                    allData={memoizedSectionsData}
                    mode={mode}
                    form_slug={form_slug}
                    serverError={serverError?.[section.section_id]}
                  />
                )}
              </div>
            );
          })}

          {/* Hook-injected extra fields — rendered ONCE after all sections */}
          {(() => {
            const hooks = getDynamicFormHooks(form_slug);
            if (!hooks.getExtraFields) return null;
            const parentId = childrenInformation?.parent_primary_key_value || props.parentId || memoizedSectionsData?.parent_id || memoizedSectionsData?.project_id || memoizedSectionsData?.project || selectedData?.parent_id || null;
            const monitoringId = selectedData?.id || memoizedSectionsData?.id || null;
            return hooks.getExtraFields({
              form_slug,
              mode,
              data: memoizedSectionsData,
              selectedData,
              childrenInformation,
              parentId,
              recordId: monitoringId,
              sectionSlug: "after_all_sections",
              position: "after_all_sections",
              // Pass the ref so hook component can expose getData()
              extraFieldsRef,
            });
          })()}
        </div>
      </div>
      {memoizedSections?.length > 0 && (
        <div className="flex justify-end gap-2 mt-3 pt-2 border-t border-gray-100">
          <Button onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={() => handleSubmit("draft")}
            loading={submitting}
            style={{ borderColor: "#d97706", color: "#d97706", fontWeight: 600 }}
          >
            📝 Save Draft
          </Button>
          <Button
            type="primary"
            onClick={() => handleSubmit("submit")}
            loading={submitting}
            style={{ backgroundColor: "#16a34a", borderColor: "#16a34a", fontWeight: 600 }}
          >
            🚀 Submit Final
          </Button>
        </div>
      )}
    </div>
  );
});

export default DynamicAddEditForm;
