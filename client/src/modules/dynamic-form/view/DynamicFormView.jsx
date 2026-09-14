import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  dynamicFormViewAPI,
  dynamicSchemaDetailsAPI,
} from "@/services/dynamicForm-service";

import { Button, Spin } from "antd";
import GeneralSectionView from "./general-section/GeneralSectionView";
import AddMoreSectionView from "./add-more-section/AddMoreSectionView";
import { useSearchParams } from "@/hooks/useNextRouter";
import WorkflowActionPanel from "@/modules/approval-workflow/panel/WorkflowActionPanel";
import { getDynamicFormHooks } from "../hooks/dynamicFormHookRegistry";

const DynamicFormView = ({
  onClose,
  selectedData,
  form_slug,
  view_url_API,
  title: titleProp,
  childrenInformation,
  parentId: propParentId,
  hideTitle = false,
}) => {
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

  const [loading, setLoading] = useState(true);
  const [schema, setSchema] = useState({});
  const [data, setData] = useState({});
  const isModalView = Boolean(onClose);
  const activeInactiveAction = schema?.actions?.find(
    (a) => a.slug === "active_inactive"
  );
  const isActiveKey = activeInactiveAction?.form_details?.is_active_key;

  useEffect(() => {
    setLoading(true);
    dynamicFormViewAPI(view_url_API || "dynamic-form/view", {
      selected_data: selectedData || {
        [decoded?.primary_key]: decoded?.primary_key_value,
      },
      form_slug: form_slug || decoded?.form_slug,
    })
      .then((res) => {
        setData(res?.data?.data || {});
      })
      .catch((err) => {
        console.error("Error fetching details:", err);
        setData({});
      });
    dynamicSchemaDetailsAPI({ form_slug: form_slug || decoded?.form_slug })
      .then((res) => {
        setSchema(res.data.data);
      })
      .catch((err) => {
        console.error("Error fetching schema details:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [selectedData, form_slug, decoded, view_url_API]);

  const [activeSectionId, setActiveSectionId] = useState(null);

  useEffect(() => {
    if (schema?.sections?.length > 0 && !activeSectionId) {
      setActiveSectionId(schema.sections[0]?.section_id);
    }
  }, [schema?.sections, activeSectionId]);

  const modalContainerRef = useRef(null);

  return (
    <>
      {isModalView ? (
        <div className="relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60 z-20">
              <Spin size="large" />
            </div>
          )}

          <div className="flex flex-col gap-4">
            {!hideTitle && (
              <div className="card-header flex justify-between items-center" style={{ background: "var(--primary-gradient, var(--primary-color, #15803d))", color: "#ffffff", padding: "12px 16px", borderRadius: "8px 8px 0 0" }}>
                <h5 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#ffffff" }}>
                  {titleProp || schema?.title || decoded?.title || "Details"}
                </h5>
              </div>
            )}
            <div className="flex flex-col gap-4 w-full">
              {schema?.sections?.map((section) => {
                const currentSlug = form_slug || decoded?.form_slug;
                if (currentSlug === "monitoring" && section.type === "add_more") return null;
                return (
                  <div key={section.section_id} id={`view_sec_${section.section_id}`}>
                    {section.type === "general" && (
                      <GeneralSectionView
                        section={section}
                        data={data || {}}
                        isActiveKey={isActiveKey}
                        form_slug={currentSlug}
                      />
                    )}
                    {section.type === "add_more" && (
                      <AddMoreSectionView
                        section={section}
                        data={data?.[section.slug] || data?.[section.section_id] || []}
                        allData={data || {}}
                        isActiveKey={isActiveKey}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Hook-injected extra fields */}
            {(() => {
              const currentSlug = form_slug || decoded?.form_slug;
              const hooks = getDynamicFormHooks(currentSlug);
              if (!hooks.getExtraFields) return null;
              const resolvedParentId = propParentId || childrenInformation?.parent_primary_key_value || decoded?.parent_primary_key_value || data?.parent_id || data?.project_id || data?.project || selectedData?.parent_id || searchParams.get("parent_id") || null;
              const resolvedRecordId = selectedData?.id || data?.id || decoded?.primary_key_value || null;
              return hooks.getExtraFields({
                form_slug: currentSlug,
                mode: "view",
                data,
                selectedData,
                childrenInformation,
                parentId: resolvedParentId,
                recordId: resolvedRecordId,
                sectionSlug: "after_all_sections",
                position: "after_all_sections",
              });
            })()}
          </div>
          <div className="flex justify-end gap-2 mt-3 pt-2 border-t border-gray-100">
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      ) : (
        <div className="home-content p-3">
          {!hideTitle && (
            <div className="card pb-3 mb-3">
              <div className="card-header flex justify-between items-center" style={{ background: "var(--primary-gradient, var(--primary-color, #15803d))", color: "#ffffff", padding: "12px 16px", borderRadius: "8px 8px 0 0" }}>
                <h5 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#ffffff" }}>
                  {titleProp || schema?.title || decoded?.title || "Details"}
                </h5>
              </div>
            </div>
          )}
          <div className="card-body p-0">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/60 z-20">
                <Spin size="large" />
              </div>
            )}

            <div className="flex flex-col gap-4 w-full">
              {schema?.sections?.map((section) => {
                const currentSlug = form_slug || decoded?.form_slug;
                if (currentSlug === "monitoring" && section.type === "add_more") return null;
                return (
                  <div key={section.section_id} id={`view_sec_${section.section_id}`}>
                    {section.type === "general" && (
                      <GeneralSectionView
                        section={section}
                        data={data || {}}
                        isActiveKey={isActiveKey}
                        form_slug={currentSlug}
                      />
                    )}
                    {section.type === "add_more" && (
                      <AddMoreSectionView
                        section={section}
                        data={data?.[section.slug] || data?.[section.section_id] || []}
                        allData={data || {}}
                        isActiveKey={isActiveKey}
                      />
                    )}
                  </div>
                );
              })}

              {/* Hook-injected extra fields */}
              {(() => {
                const currentSlug = form_slug || decoded?.form_slug;
                const hooks = getDynamicFormHooks(currentSlug);
                if (!hooks.getExtraFields) return null;
                const resolvedParentId = propParentId || childrenInformation?.parent_primary_key_value || decoded?.parent_primary_key_value || data?.parent_id || data?.project_id || data?.project || selectedData?.parent_id || searchParams.get("parent_id") || null;
                const resolvedRecordId = selectedData?.id || data?.id || decoded?.primary_key_value || null;
                return hooks.getExtraFields({
                  form_slug: currentSlug,
                  mode: "view",
                  data,
                  selectedData,
                  childrenInformation,
                  parentId: resolvedParentId,
                  recordId: resolvedRecordId,
                  sectionSlug: "after_all_sections",
                  position: "after_all_sections",
                });
              })()}
            </div>
          </div>
          {decoded?.workflow_slug && (
            <WorkflowActionPanel
              reference_id={decoded?.primary_key_value}
              workflow_slug={decoded?.workflow_slug}
            />
          )}
        </div>
      )}
    </>
  );
};

export default DynamicFormView;
