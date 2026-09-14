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
import {
  publicFormSchemaAPI,
  publicFormSubmitAPI,
} from "@/services/dynamicForm-service";
import AddMoreSection from "../add-edit/add-more-section/AddMoreSection";
import { appendSectionToFormData } from "../add-edit/formData.helper";
import GeneralSection from "../add-edit/general-section/GeneralSection";
import CaptchaWidget from "@/components/CaptchaWidget";
import { getDynamicFormHooks } from "../hooks/dynamicFormHookRegistry";
import { useSettings } from "@/context/SettingsContext";

const PublicDynamicAddEditForm = forwardRef((props, ref) => {
  const { settings } = useSettings();
  const primaryColor = settings?.primary_color || "#15803d";
  const secondaryColor = settings?.secondary_color || "#659327";
  const [messageApi, contextHolder] = message.useMessage();
  const {
    onClose,
    mode = "add",
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

  const [loading, setLoading] = useState(false);
  const [schema, setSchema] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState({});
  const [serverError, setServerError] = useState({});
  const [isCaptchaVerified, setIsCaptchaVerified] = useState(false);

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

  const handleSubmit = useCallback(async () => {
    if (!isCaptchaVerified) {
      messageApi.error("Please complete the CAPTCHA verification before submitting.");
      return;
    }

    const finalFD = new FormData();
    finalFD.append("form_slug", childrenInformation?.form_slug || form_slug);
    let hasError = false;
    const sectionResults = [];

    for (const section of memoizedSections) {
      const sectionRef = sectionRefs.current[section.section_id];
      if (!sectionRef?.getData) continue;

      const result = await sectionRef.getData();
      sectionResults.push({ section, result });

      if (!result.valid) {
        hasError = true;
      }
    }

    if (hasError) {
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

    // Convert section results into payload for public submission
    const formObj = { form_slug: childrenInformation?.form_slug || form_slug };
    for (const { section, result } of sectionResults) {
      if (result.data) {
        if (section.type === "add_more") {
          const secKey = section.slug || section.table || section.section_id;
          formObj[secKey] = result.data;
        } else {
          Object.assign(formObj, result.data);
        }
      }
    }

    let finalPayload = { ...formObj };
    const hooks = getDynamicFormHooks(form_slug);
    if (hooks.onBeforeSubmit) {
      try {
        finalPayload = await hooks.onBeforeSubmit(finalPayload);
      } catch (err) {
        messageApi.error(err.message || "Hook validation failed");
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await publicFormSubmitAPI(finalPayload);
      messageApi.success("Public registration submitted successfully!");
      if (hooks.onAfterSubmit) {
        await hooks.onAfterSubmit(res?.data, finalPayload);
      }
      if (onClose) onClose();
      resetAllSections();
    } catch (error) {
      console.error("[PublicDynamicAddEditForm] Submission error:", error);
      const errMsg = error?.response?.data?.message || "Failed to submit public registration.";
      messageApi.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  }, [form_slug, childrenInformation, memoizedSections, resetAllSections, onClose, messageApi, isCaptchaVerified]);

  useImperativeHandle(ref, () => ({
    submit: handleSubmit,
    reset: resetAllSections,
  }));

  // Fetch schema details via dedicated public endpoint
  useEffect(() => {
    const loadSchema = async () => {
      if (!form_slug) return;
      setLoading(true);
      try {
        const response = await publicFormSchemaAPI({ form_slug });
        setSchema(response?.data?.data || response?.data || {});
      } catch (err) {
        console.error("[PublicDynamicAddEditForm] Load schema error:", err);
        messageApi.error("Failed to load registration form layout.");
      } finally {
        setLoading(false);
      }
    };
    loadSchema();
  }, [form_slug, messageApi]);

  const containerRef = useRef(null);

  return (
    <div className="relative">
      {contextHolder}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Spin size="large" />
        </div>
      )}
      {!loading && memoizedSections?.length === 0 && (
        <div className="text-center py-6 text-gray-500">No form sections configured.</div>
      )}
      {!loading && memoizedSections?.length > 0 && (
        <div ref={containerRef} className="relative p-1 flex flex-col gap-6">
          {memoizedSections?.map((section, secIdx) => {
            const secKey = section.section_id || section.slug || `sec_${secIdx}`;
            const hooks = getDynamicFormHooks(form_slug);
            const extraFields = hooks.getExtraFields
              ? hooks.getExtraFields({ form_slug, mode, data: memoizedSectionsData, sectionSlug: section.slug || section.section_id })
              : null;
            return (
              <div key={secKey} id={`edit_sec_${secKey}`}>
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
                {/* Hook-injected custom fields for this section */}
                {extraFields}
              </div>
            );
          })}

          {/* VAPT CAPTCHA Security Verification inside Form */}
          <div className="mt-4">
            <CaptchaWidget onVerify={(isValid) => setIsCaptchaVerified(isValid)} />
          </div>

          {/* Dynamic Gradient Submit Button aligned with admin theme */}
          <div className="mt-4 pt-3 border-t border-gray-100 flex justify-center">
            <Button
              type="primary"
              onClick={handleSubmit}
              loading={submitting}
              disabled={!isCaptchaVerified}
              style={{
                width: "100%",
                maxWidth: "400px",
                height: "46px",
                borderRadius: "10px",
                fontWeight: 700,
                fontSize: "16px",
                background: isCaptchaVerified
                  ? "var(--primary-gradient, linear-gradient(135deg, " + primaryColor + " 0%, " + secondaryColor + " 100%))"
                  : "#cbd5e1",
                border: "none",
                boxShadow: isCaptchaVerified ? `0 6px 20px ${primaryColor}40` : "none"
              }}
            >
              Submit Registration
            </Button>
          </div>
        </div>
      )}
    </div>
  );
});

export default PublicDynamicAddEditForm;
