import { Button, message, Spin } from "antd";
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { privateHttpClient } from "@/services/api/httpClient";
import {
  dynamicDetailsAPI,
  dynamicSchemaDetailsAPI,
} from "@/services/dynamicForm-service";
import AddMoreSectionV2 from "./add-more-section/AddMoreSectionV2";
import GeneralSectionV2 from "./general-section/GeneralSectionV2";
import { appendSectionToFormData } from "./formData.helper";
import { getDynamicFormHooks } from "../hooks/registerAllFormHooksV2";
import { evaluateConditions } from "@/modules/dynamic-form-v2/helper/runTimeCondition.helper";

const DynamicAddEditFormV2 = forwardRef((props, ref) => {
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

  const extraFieldsRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [schema, setSchema] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState({});
  const [serverError, setServerError] = useState({});
  const [currentFormValues, setCurrentFormValues] = useState({});

  useEffect(() => {
    if (data && typeof data === "object") {
      setCurrentFormValues((prev) => ({ ...data, ...prev }));
    }
  }, [data]);

  const handleValuesChange = useCallback((sectionId, newSectionValues) => {
    setCurrentFormValues((prev) => ({
      ...prev,
      ...newSectionValues,
      [sectionId]: newSectionValues,
    }));
  }, []);

  const isSectionVisible = useCallback((section) => {
    if (!section?.conditions || !section.conditions.rules || section.conditions.rules.length === 0) {
      return true;
    }
    return evaluateConditions(section.conditions, currentFormValues);
  }, [currentFormValues]);

  const memoizedSections = useMemo(
    () =>
      (schema?.sections || []).map((s, idx) => ({
        ...s,
        section_id: s.section_id || s.id || s.slug || `sec_${idx}`,
      })),
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
    finalFD.append("status", statusVal);
    const effectiveParentId = childrenInformation?.parent_primary_key_value || props.parent_id;
    if (effectiveParentId) {
      finalFD.append("parent_id", effectiveParentId);
      finalFD.append("parent_primary_key_value", effectiveParentId);
      if (childrenInformation?.parent_primary_key) {
        finalFD.append("parent_primary_key", childrenInformation.parent_primary_key);
      }
    }

    // In edit mode the server requires the root record's primary key to be present
    // in the form data (e.g. payment_id=5). selectedData holds the full row from the
    // list, so we extract the PK from there using the schema's primary_key definition.
    if (mode === "edit" && selectedData) {
      const rootPKField = schema?.root_entity?.primary_key || "id";
      const pkValue =
        selectedData[rootPKField] ||
        selectedData["id"] ||
        selectedData[Object.keys(selectedData).find((k) => k.endsWith("_id")) || ""];
      if (pkValue) {
        // Append under the schema-defined key so segregateData can find it
        finalFD.append(rootPKField, pkValue);
        // Also append under "id" as a common fallback
        if (rootPKField !== "id") finalFD.append("id", pkValue);
      }
    }

    let hasError = false;
    const sectionResults = [];

    const isDraftSave = statusVal === "draft";

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
          const firstErrMsg = errKeys.length > 0 ? result.errors[errKeys[0]] : "Validation failed";
          const secName = section?.section_label || "General";
          messageApi.error(`Section "${secName}": ${firstErrMsg}`);
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
        messageApi.error(extraResult.errors?.[Object.keys(extraResult.errors || {})[0]] || "Extra field validation failed.");
        return;
      }
      if (extraResult?.data) {
        for (const [key, value] of Object.entries(extraResult.data)) {
          if (value !== undefined && value !== null) {
            finalFD.append(`extra__${key}`, typeof value === "object" ? JSON.stringify(value) : value);
          }
        }
      }
    }

    const hooks = getDynamicFormHooks(childrenInformation?.form_slug || form_slug);
    if (hooks.onBeforeSubmit) {
      try {
        await hooks.onBeforeSubmit(finalFD, { isDraftSave, mode });
      } catch (err) {
        messageApi.error(err.message || "Hook validation failed");
        return;
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

      if (hooks.onAfterSubmit) {
        await hooks.onAfterSubmit(res?.data, finalFD);
      }

      fetchData?.();
      onClose?.();
      messageApi.success(
        res?.data?.message || (isDraftSave ? "Draft saved successfully." : "Form submitted successfully.")
      );
    } catch (error) {
      if (error?.response?.data?.errors) {
        setServerError(error?.response?.data?.errors);
      }
      messageApi.error(
        error?.response?.data?.originalError || error?.response?.data?.message || "Failed to submit form."
      );
    } finally {
      setSubmitting(false);
    }
  }, [memoizedSections, form_slug, mode, messageApi, childrenInformation, schema, selectedData, fetchData, onClose]);

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
          setSchema(schemaRes?.data?.data || schemaRes?.data || {});
          setData(dataRes?.data?.data || dataRes?.data || {});
        } else {
          const schemaRes = await dynamicSchemaDetailsAPI({
            form_slug: childrenInformation?.form_slug || form_slug,
          });
          if (!alive) return;
          setSchema(schemaRes?.data?.data || schemaRes?.data || {});
          setData({});
        }
      } catch (err) {
        if (!alive) return;
        messageApi.error("Failed to load form schema.");
      } finally {
        if (alive) setLoading(false);
      }
    };

    if (form_slug) load();

    return () => {
      alive = false;
    };
  }, [form_slug, mode, selectedData, details_url_API, messageApi, childrenInformation]);

  const targetSlug = childrenInformation?.form_slug || form_slug;
  const hooks = useMemo(() => getDynamicFormHooks(targetSlug), [targetSlug]);

  return (
    <div className="relative">
      {contextHolder}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3">
          <Spin size="large" />
          <span className="text-xs text-slate-500 font-medium">Loading form data...</span>
        </div>
      ) : memoizedSections?.length === 0 ? (
        <div className="text-center py-6 text-gray-500">No sections found.</div>
      ) : (
        <>
          <div className="relative max-h-[75vh] overflow-y-auto overflow-x-hidden p-1 flex items-start">
        <div className="flex-1 min-w-0 flex flex-col gap-4 pr-1">
          {memoizedSections?.map((section) => {
            if (!isSectionVisible(section)) return null;
            return (
              <div key={section.section_id} id={`edit_sec_${section.section_id}`}>
                {section.type === "general" && (
                  <GeneralSectionV2
                    ref={setSectionRef(section.section_id)}
                    section={section}
                    data={memoizedSectionsData}
                    allFormValues={currentFormValues}
                    onValuesChange={(newVals) => handleValuesChange(section.section_id, newVals)}
                    mode={mode}
                    form_slug={targetSlug}
                    serverError={serverError?.[section.section_id]}
                  />
                )}
                {section.type === "add_more" && (
                  <AddMoreSectionV2
                    ref={setSectionRef(section.section_id)}
                    section={section}
                    data={memoizedSectionsData[section.slug] || memoizedSectionsData[section.section_id]}
                    allData={currentFormValues}
                    mode={mode}
                    form_slug={targetSlug}
                    serverError={serverError?.[section.section_id]}
                  />
                )}
              </div>
            );
          })}

          {hooks?.getExtraFields && hooks.getExtraFields({
            form_slug: targetSlug,
            mode,
            data: memoizedSectionsData,
            selectedData,
            childrenInformation,
            extraFieldsRef,
            position: "after_all_sections",
          })}
        </div>
      </div>
      {memoizedSections?.length > 0 && (
        <div className="flex justify-end gap-2 mt-3 pt-2 border-t border-gray-100">
          <Button onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={() => handleSubmit("draft")} loading={submitting}>
            Save Draft
          </Button>
          <Button type="primary" onClick={() => handleSubmit("submit")} loading={submitting}>
            Submit Final
          </Button>
        </div>
      )}
        </>
      )}
    </div>
  );
});

export default DynamicAddEditFormV2;
