import { DndContext, closestCenter } from "@dnd-kit/core";
import { restrictToParentElement } from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Button,
  Divider,
  Input,
  App,
  Modal,
  Popconfirm,
  Radio,
  Select,
  Tag,
  Switch,
  Tabs,
  Tooltip,
  Alert,
} from "antd";
import { nanoid } from "nanoid";
import { useEffect, useState } from "react";
import { privateHttpClient } from "@/services/api/httpClient";
import FormSectionBuilder from "./FormSectionBuilder";
import DynamicGeneralListViewV2 from "@/modules/dynamic-form-v2/list-view/general-list-view/DynamicGeneralListViewV2";
import GeneralSectionV2 from "@/modules/dynamic-form-v2/add-edit/general-section/GeneralSectionV2";
import AddMoreSectionV2 from "@/modules/dynamic-form-v2/add-edit/add-more-section/AddMoreSectionV2";
import IconPickerModal, { getAntdIconComponent } from "./IconPickerModal";
import * as AntdIcons from "@ant-design/icons";
import * as Yup from "yup";

const renderActionIconPreview = (iconStr) => {
  if (!iconStr) {
    return <span style={{ color: "#999", fontSize: 12 }}>+ Choose Icon</span>;
  }
  const iconName = String(iconStr).trim();
  const IconComp = getAntdIconComponent(iconName);

  if (IconComp) {
    return (
      <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#7c3aed", fontWeight: 500 }}>
        <IconComp style={{ fontSize: 15 }} />
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 70 }}>
          {iconName.replace("Outlined", "")}
        </span>
      </span>
    );
  }
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#7c3aed", fontWeight: 500 }}>
      <span style={{ fontSize: 15 }}>{iconStr}</span>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 70 }}>
        {iconStr}
      </span>
    </span>
  );
};

const fieldSchema = Yup.object().shape({
  type: Yup.string().required(),

  db_field: Yup.string().when("type", {
    is: (type) => !["heading", "note", "custom_html"].includes(type),
    then: () => Yup.string()
      .required("DB field is required")
      .matches(
        /^[a-z][a-z0-9_]*$/,
        "Must start with a letter and contain only lowercase letters, numbers, and underscores",
      ),
    otherwise: () => Yup.string().notRequired().nullable()
  }),

  data_type: Yup.string().when("type", {
    is: (type) => !["heading", "note", "custom_html"].includes(type),
    then: () => Yup.string().required("Data type is required"),
    otherwise: () => Yup.string().notRequired().nullable()
  }),

  label: Yup.string()
    .required("Label is required")
    .matches(/^[a-zA-Z0-9][a-zA-Z0-9_\-\s\/&(),.?:#@!+='"]*$/, "Must start with a letter or number"),

  ui: Yup.object().when("type", {
    is: (type) => !["heading", "note", "custom_html"].includes(type),
    then: () => Yup.object().shape({
      placeholder: Yup.string().required("Placeholder is required"),
    }),
    otherwise: () => Yup.object().notRequired().nullable()
  }),
});

const sectionSchema = Yup.object().shape({
  section_label: Yup.string().required("Section label is required"),

  type: Yup.string()
    .oneOf(["general", "add_more"])
    .required("Section type is required"),

  slug: Yup.string()
    .required("Section slug is required")
    .matches(/^[a-z0-9_]+$/, "Invalid section slug"),

  fields: Yup.array().of(fieldSchema).min(1, "At least one field is required"),
});

export const formSchema = Yup.object().shape({
  title: Yup.string()
    .required("Title is required")
    .min(3, "Minimum 3 characters"),

  slug: Yup.string()
    .required("Slug is required")
    .matches(/^[a-z0-9_]+$/, "Invalid slug format"),

  sections: Yup.array()
    .of(sectionSchema)
    .min(1, "At least one section is required")
    .test(
      "first-section-general",
      "First section must be 'general'",
      (sections) => sections?.[0]?.type === "general",
    ),
});

const slugify = (str = "") =>
  str
    ?.toLowerCase()
    ?.trim()
    ?.replace(/\s+/g, "_")
    ?.replace(/[^a-z0-9_]/g, "");

// 🎨 Color + Icon presets
const SECTION_STYLES = [
  { color: "bg-blue-100 border-blue-400", icon: "📘" },
  { color: "bg-green-100 border-green-400", icon: "📗" },
  { color: "bg-purple-100 border-purple-400", icon: "📙" },
  { color: "bg-orange-100 border-orange-400", icon: "📕" },
];

function SortableSection({
  sec,
  index,
  activeIndex,
  setActive,
  remove,
  toggleCollapse,
  isDisabled,
  hasError,
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: sec?.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const styleObj = SECTION_STYLES[index % SECTION_STYLES.length];

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`group flex items-center gap-2 px-3 py-2 rounded-xl border min-w-[160px] transition-all
        ${
          hasError
            ? "bg-red-50 border-2 border-red-500 text-red-800 shadow-md animate-pulse"
            : activeIndex === index
            ? `${styleObj?.color} shadow-sm`
            : "bg-white hover:bg-gray-50 border-gray-200"
        }`}
    >
      {/* DRAG HANDLE */}
      {!isDisabled && (
        <span {...listeners} className="cursor-move text-gray-400">
          ☰
        </span>
      )}

      {/* ✅ CLICK AREA ONLY HERE */}
      <div
        className="flex items-center gap-2 flex-1 cursor-pointer"
        onClick={() => setActive(index)}
      >
        <span>{hasError ? "🚨" : styleObj?.icon}</span>
        <span className={`text-sm font-medium truncate ${hasError ? "font-bold text-red-700" : ""}`}>
          {sec?.section_label}
        </span>
        {hasError && (
          <Tag color="error" className="ml-1 text-[10px] px-1 py-0 font-bold border-red-400">
            Error
          </Tag>
        )}
      </div>

      {/* COLLAPSE */}
      <span
        onClick={(e) => {
          e.stopPropagation();
          toggleCollapse(index);
        }}
        className="text-xs"
      >
        {sec?.collapsed ? "▸" : "▾"}
      </span>

      {/* DELETE */}
      {index !== 0 && !isDisabled && (
        <span onClick={(e) => e.stopPropagation()}>
          <Popconfirm title="Delete section?" onConfirm={() => remove(index)}>
            <span className="text-red-400 hover:text-red-600 text-xs hidden group-hover:block">
              ✕
            </span>
          </Popconfirm>
        </span>
      )}
    </div>
  );
}

export default function FormBuilderModal({
  open,
  onClose,
  project_id,
  selectedRow,
  refreshTable,
}) {
  const { message } = App.useApp();
  const id = nanoid();
  const [isDisabled, setIsDisabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [allFormsList, setAllFormsList] = useState([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [expandedConditions, setExpandedConditions] = useState({});
  const [fieldSearchVals, setFieldSearchVals] = useState({});
  const [draggedTabIdx, setDraggedTabIdx] = useState(null);
  const [dragOverTabIdx, setDragOverTabIdx] = useState(null);

  const handleReorderActionTabs = (fromIdx, toIdx) => {
    if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0) return;
    setFormDetails((prev) => {
      const list = [...(prev?.action_tabs || [])];
      if (fromIdx >= list.length || toIdx >= list.length) return prev;
      const [moved] = list.splice(fromIdx, 1);
      list.splice(toIdx, 0, moved);
      return { ...prev, action_tabs: list };
    });
  };
  const [formDetails, setFormDetails] = useState({
    title: "",
    slug: "",
    is_master: false,
    is_editable: false,
    parent_form_id: null,
    enable_action_tabs: false,
    action_tabs: [],
    actions: [
      { name: "View",   slug: "view",   type: "OPEN_MODAL" },
      { name: "Edit",   slug: "edit",   type: "OPEN_MODAL" },
    ],
    sections: [
      {
        id: `sec_${Date.now()}_${id}`,
        section_label: "General",
        type: "general",
        slug: "general",
        fields: [],
        collapsed: false,
      },
    ],
  });

  useEffect(() => {
    if (!open) return;
    const fetchFormsList = async () => {
      try {
        const res = await privateHttpClient.get("configurator/form-schemas?limit=200");
        if (res?.data?.data) {
          setAllFormsList(res.data.data);
        }
      } catch (e) {
        console.error("Failed to fetch forms list for parent selection:", e);
      }
    };
    fetchFormsList();
  }, [open]);

  useEffect(() => {
    if (selectedRow && Object.keys(selectedRow).length > 0) {
      setIsDisabled(!!selectedRow?.isView);
      const loadSchema = async () => {
        let row = selectedRow;
        const schemaId = selectedRow.id || selectedRow.form_id || selectedRow.slug;
        if (schemaId) {
          try {
            const res = await privateHttpClient.get(`configurator/form-schemas/${schemaId}`);
            if (res?.data?.data) {
              row = res.data.data;
            }
          } catch (e) {
            console.error("Failed to load schema detail:", e);
          }
        }

        const name = row.title || row.name || "";
        const slug = row.slug || "";
        const def = row.definition || {};

        const rawSections = def.sections || row.sections || [];
        const sections = rawSections.length > 0 ? rawSections : [
          {
            id: `sec_${Date.now()}`,
            section_label: "General",
            type: "general",
            slug: "general",
            fields: [],
            collapsed: false,
          }
        ];

        setFormDetails({
          id: row.id || schemaId,
          title: name,
          slug: slug,
          is_master: !!row.is_master,
          is_draft: !!row.is_draft,
          is_editable: true,
          parent_form_id: row.parent_form_id !== undefined && row.parent_form_id !== null ? String(row.parent_form_id) : null,
          enable_action_tabs: row.enable_action_tabs ?? def.enable_action_tabs ?? false,
          action_tabs: row.action_tabs || def.action_tabs || [],
          actions: row.actions || [
            { name: "View",   slug: "view",   type: "OPEN_MODAL", roles: ["admin", "user"] },
            { name: "Edit",   slug: "edit",   type: "OPEN_MODAL", roles: ["admin"] },
          ],
          sections: sections.map((sec, idx) => ({
            ...sec,
            id: sec.id || sec.section_id || `sec_${Date.now()}_${idx}`,
            section_label: sec.section_label || sec.title || "Section",
            fields: sec.fields || [],
          })),
        });
        setActiveSectionIndex(0);
      };

      loadSchema();
    } else {
      // Reset for creating a new form
      setIsDisabled(false);
      setFormDetails({
        title: "",
        slug: "",
        is_master: false,
        is_draft: false,
        is_editable: false,
        parent_form_id: null,
        enable_action_tabs: false,
        action_tabs: [],
        actions: [
          { name: "View",   slug: "view",   type: "OPEN_MODAL", roles: ["admin", "user"] },
          { name: "Edit",   slug: "edit",   type: "OPEN_MODAL", roles: ["admin"] },
        ],
        sections: [
          {
            id: `sec_${Date.now()}_${id}`,
            section_label: "General",
            type: "general",
            slug: "general",
            fields: [],
            collapsed: false,
          },
        ],
      });
      setActiveSectionIndex(0);
    }
  }, [selectedRow]);

  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const [iconPickerState, setIconPickerState] = useState({ visible: false, targetActionIdx: null });

  const activeSection = formDetails?.sections?.[activeSectionIndex] || null;
  // ===== TITLE =====
  const handleTitleChange = (val) => {
    const formSlug = slugify(val);

    setFormDetails((prev) => ({
      ...prev,
      title: val,
      slug: formSlug,
      sections: prev?.sections?.map((sec) => ({
        ...sec,
        slug: `${formSlug}_${slugify(sec?.section_label)}`,
      })),
    }));

    setErrors((prev) => {
      const updated = { ...prev };
      if (val.trim().length >= 3) {
        delete updated.title;
      }
      if (formSlug) {
        delete updated.slug;
      }
      return updated;
    });
  };

  // ===== ADD =====
  const addSection = () => {
    const id = nanoid();

    setFormDetails((prev) => {
      const newSection = {
        id: `sec_${Date.now()}_${id}`,
        section_label: `Section ${prev?.sections?.length + 1}`,
        type: "add_more",
        slug: `Section ${prev?.sections?.length + 1}`
          .toLowerCase()
          .replace(/\s+/g, "_"),
        fields: [],
        collapsed: false,
      };

      const updatedSections = [...prev.sections, newSection];

      // ✅ set correct index based on latest length
      setActiveSectionIndex(updatedSections.length - 1);

      return {
        ...prev,
        sections: updatedSections,
      };
    });
  };

  // ===== DELETE =====
  const removeSection = (index) => {
    setFormDetails((prev) => {
      const updatedSections = prev?.sections?.filter((_, i) => i !== index);

      return {
        ...prev,
        sections: updatedSections,
      };
    });

    setActiveSectionIndex((prev) => {
      if (prev >= index) {
        return Math.max(0, prev - 1);
      }
      return prev;
    });
  };

  // ===== COLLAPSE =====
  const toggleCollapse = (index) => {
    setFormDetails((prev) => {
      const updated = [...prev?.sections];
      updated[index].collapsed = !updated?.[index]?.collapsed;
      return { ...prev, sections: updated };
    });
  };

  // ===== UPDATE =====
  const updateSection = (index, key, value) => {
    setFormDetails((prev) => {
      const updated = [...prev.sections];

      const newSec = {
        ...updated[index],
        [key]: value,
        slug: `${prev?.slug}_${slugify(
          key === "section_label" ? value : updated?.[index]?.section_label,
        )}`,
      };

      if (key === "section_label") {
        delete newSec.table;
      }

      updated[index] = newSec;

      return { ...prev, sections: updated };
    });
  };

  // ===== DRAG =====
  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over) return;

    const oldIndex = formDetails?.sections?.findIndex(
      (s) => s?.id === active?.id,
    );
    const newIndex = formDetails?.sections?.findIndex(
      (s) => s?.id === over?.id,
    );

    if (oldIndex === -1 || newIndex === -1) return;

    setFormDetails((prev) => ({
      ...prev,
      sections: arrayMove(prev?.sections, oldIndex, newIndex),
    }));

    setActiveSectionIndex((prev) => {
      if (prev === oldIndex) return newIndex;
      if (prev === newIndex) return oldIndex;
      return prev;
    });
  };

  const validate = async () => {
    try {
      await formSchema.validate(formDetails, { abortEarly: false });

      setErrors({});
      return { status: true, errors: null };
    } catch (err) {
      const errObj = {};

      err.inner.forEach((e) => {
        if (!errObj[e.path]) {
          errObj[e.path] = e.message;
        }
      });

      setErrors(errObj);
      return { status: false, errors: errObj };
    }
  };

  const validateForm = (formDetails) => {
    if (!formDetails?.slug) {
      return { message: "Form must have a slug." };
    }

    if (!formDetails?.sections?.length) {
      return { message: "At least one section is required." };
    }

    if (formDetails.sections[0]?.type !== "general") {
      return { message: "First section must be of type 'General'." };
    }

    for (let i = 0; i < formDetails.sections.length; i++) {
      const sec = formDetails.sections[i];
      if (!sec?.slug) {
        return { secIdx: i, message: `Section #${i + 1} ("${sec?.section_label || "Unnamed"}") must have a slug.` };
      }

      if (!sec?.fields?.length) {
        return { secIdx: i, message: `Section #${i + 1} ("${sec?.section_label || "Unnamed"}") must have at least one field.` };
      }
    }

    return null; // ✅ no errors
  };

  const handleSave = async (isDraft = false) => {
    try {
      const { status: isValid, errors } = await validate();

      if (!isValid) {
        const errorList = Object.entries(errors || {}).map(([path, msg]) => {
          const fieldMatch = path.match(/^sections\[(\d+)\]\.fields\[(\d+)\]\.(.+)$/);
          if (fieldMatch) {
            const secIdx = parseInt(fieldMatch[1], 10);
            const fieldIdx = parseInt(fieldMatch[2], 10);
            const prop = fieldMatch[3];
            const sec = formDetails?.sections?.[secIdx];
            const field = sec?.fields?.[fieldIdx];
            const secName = sec?.section_label || `Section ${secIdx + 1}`;
            const fieldName = field?.label || field?.db_field || `Field #${fieldIdx + 1}`;
            const propLabel = prop === "db_field" ? "DB Field" : prop === "label" ? "Label" : prop;
            return {
              secIdx,
              fieldIdx,
              message: `Section "${secName}" ➔ Field "${fieldName}" (${propLabel}): ${msg}`,
            };
          }

          const secMatch = path.match(/^sections\[(\d+)\]\.(.+)$/);
          if (secMatch) {
            const secIdx = parseInt(secMatch[1], 10);
            const sec = formDetails?.sections?.[secIdx];
            const secName = sec?.section_label || `Section ${secIdx + 1}`;
            return {
              secIdx,
              message: `Section "${secName}": ${msg}`,
            };
          }

          return { message: `${path}: ${msg}` };
        });

        const firstSecError = errorList.find((e) => e.secIdx !== undefined);
        if (firstSecError !== undefined && firstSecError.secIdx !== null) {
          setActiveSectionIndex(firstSecError.secIdx);
        }

        errorList.slice(0, 3).forEach((err) => {
          message.error({
            content: err.message,
            duration: 6,
          });
        });

        return;
      }
      const customError = validateForm(formDetails);

      if (customError) {
        if (customError.secIdx !== undefined) {
          setActiveSectionIndex(customError.secIdx);
        }
        message.error(customError.message);
        return;
      }
      setLoading(true);
      const payload = { ...formDetails, is_draft: isDraft, project_id };
      const schemaId = formDetails?.fsc_id || selectedRow?.fsc_id;
      let res;
      if (schemaId) {
        res = await privateHttpClient.put(
          `configurator/form-schemas/${schemaId}`,
          payload,
        );
      } else {
        res = await privateHttpClient.post(
          "form-builder/create-form",
          payload,
        );
      }
      refreshTable();
      onClose();
      message.success(
        res?.data?.message || (isDraft ? "Draft saved successfully." : "Form submitted successfully.")
      );
    } catch (error) {
      const status = error?.response?.status;
      const data = error?.response?.data;

      if (status === 400) {
        setErrors(data?.errors || {});
        message.error(data?.message || "Validation failed on server.");
      } else if (status === 404) {
        message.error(data?.message || "Not found");
      } else if (!status) {
        message.error("Network error or server unavailable.");
      }
    } finally {
      setLoading(false);
    }
  };




  const getSectionErrors = (errors, sectionIndex) => {
    const prefix = `sections[${sectionIndex}].`;

    return Object.keys(errors || {})
      .filter((key) => key.startsWith(prefix))
      .reduce((acc, key) => {
        const newKey = key.replace(prefix, "");
        acc[newKey] = errors[key];
        return acc;
      }, {});
  };

  const tabItems = [
    {
      key: "1",
      label: "Form Builder",
      children: (
        <>
          {/* 🔥 STICKY HEADER */}
          <div className="sticky top-0 bg-white z-10 pb-2 border-b">
            <div className="flex items-center justify-between flex-wrap gap-3 py-1">
              {/* TITLE & CONFIG CONTROLS */}
              <div className="flex items-center flex-wrap gap-3">
                <div>
                  <Input
                    disabled={isDisabled}
                    style={{ width: 220 }}
                    placeholder="Form name"
                    value={formDetails?.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                  />
                  {errors?.title && (
                    <div className="error text-danger text-xs mt-0.5">{errors?.title}</div>
                  )}
                </div>
                <Switch
                  checked={formDetails?.is_editable}
                  onChange={(checked) =>
                    setFormDetails((prev) => ({
                      ...prev,
                      is_editable: checked,
                    }))
                  }
                  checkedChildren="Editable"
                  unCheckedChildren="Locked"
                />
                <Switch
                  checked={formDetails?.is_master}
                  onChange={(checked) =>
                    setFormDetails((prev) => ({
                      ...prev,
                      is_master: checked,
                    }))
                  }
                  checkedChildren="Master"
                  unCheckedChildren="Not Master"
                  style={{ backgroundColor: formDetails?.is_master ? "#722ed1" : undefined }}
                />
                <div className="flex items-center gap-1.5">
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#475569" }}>Parent Form:</span>
                  <Select
                    disabled={isDisabled}
                    showSearch
                    allowClear
                    size="small"
                    style={{ width: 170 }}
                    placeholder="Select Parent Form"
                    optionFilterProp="label"
                    filterOption={(input, option) =>
                      String(option?.label || "").toLowerCase().includes(input.toLowerCase())
                    }
                    value={
                      formDetails?.parent_form_id !== undefined && formDetails?.parent_form_id !== null && formDetails?.parent_form_id !== ""
                        ? String(formDetails.parent_form_id)
                        : undefined
                    }
                    onChange={(val) => {
                      const selectedParentObj = allFormsList.find(
                        (f) => String(f.fsc_id || f.id || f.fsc_slug || f.slug) === String(val)
                      );
                      const parentSlug = selectedParentObj?.fsc_slug || selectedParentObj?.slug || null;
                      const parentName = selectedParentObj?.fsc_name || selectedParentObj?.title || selectedParentObj?.name || null;

                      setFormDetails((prev) => ({
                        ...prev,
                        parent_form_id: val ? String(val) : null,
                        parent_slug: parentSlug,
                        fsc_parent_form: parentSlug,
                        fsc_parent_form_id: val ? String(val) : null,
                        parent_form_name: parentName,
                      }));
                    }}
                    options={allFormsList
                      .filter((f) => String(f.fsc_id || f.id || "") !== String(formDetails?.fsc_id || formDetails?.id || "") && (f.fsc_slug || f.slug) !== formDetails?.slug)
                      .map((f) => ({
                        label: f.fsc_name || f.title || f.fsc_slug || f.slug,
                        value: String(f.fsc_id || f.id || f.fsc_slug || f.slug),
                      }))
                    }
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#475569" }}>Size:</span>
                  <Select
                    disabled={isDisabled}
                    size="small"
                    style={{ width: 140 }}
                    value={formDetails?.modal_size || formDetails?.modalSize || formDetails?.root_entity?.modal_size || "1400"}
                    onChange={(val) =>
                      setFormDetails((prev) => ({
                        ...prev,
                        modal_size: val,
                      }))
                    }
                    options={[
                      { label: "Medium (900px)", value: "900" },
                      { label: "Large (1200px)", value: "1200" },
                      { label: "Extra Large (1400px)", value: "1400" },
                      { label: "Full Width (100vw)", value: "100vw" },
                    ]}
                  />
                </div>
                {formDetails?.is_draft ? (
                  <Tag color="warning" className="m-0 flex items-center font-medium">
                    📝 Draft (Tables not created)
                  </Tag>
                ) : selectedRow ? (
                  <Tag color="success" className="m-0 flex items-center font-medium">
                    ✅ Submitted
                  </Tag>
                ) : null}
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setIsPreviewOpen(true)}
                  style={{ backgroundColor: "#6d28d9", borderColor: "#6d28d9", color: "#ffffff", fontWeight: 600 }}
                >
                  👁️ Live Form Preview
                </Button>
                {!isDisabled && (
                  <Button
                    type="primary"
                    onClick={addSection}
                  >
                    + Add Section
                  </Button>
                )}
              </div>
            </div>
            {/* ⚠️ VALIDATION ERROR ALERT BANNER */}
            {Object.keys(errors || {}).length > 0 && (
              <Alert
                type="error"
                showIcon
                className="my-2 border-2 border-red-400 bg-red-50 shadow-sm"
                message={
                  <div className="font-bold text-red-800 text-sm flex items-center justify-between">
                    <span>⚠️ Validation Errors Found ({Object.keys(errors).length}) — Click an error below to jump to that section & field:</span>
                    <Button size="small" type="text" danger onClick={() => setErrors({})}>
                      Dismiss ✕
                    </Button>
                  </div>
                }
                description={
                  <div className="max-h-28 overflow-y-auto mt-1">
                    <ul className="list-disc pl-5 text-xs text-red-800 space-y-1">
                      {Object.entries(errors).map(([path, msg], idx) => {
                        const fieldMatch = path.match(/^sections\[(\d+)\]\.fields\[(\d+)\]\.(.+)$/);
                        const secMatch = path.match(/^sections\[(\d+)\]\.(.+)$/);
                        
                        let secIdx = null;
                        let secName = "";
                        let fieldName = "";
                        let propLabel = "";

                        if (fieldMatch) {
                          secIdx = parseInt(fieldMatch[1], 10);
                          const fieldIdx = parseInt(fieldMatch[2], 10);
                          const prop = fieldMatch[3];
                          const sec = formDetails?.sections?.[secIdx];
                          const field = sec?.fields?.[fieldIdx];
                          secName = sec?.section_label || `Section ${secIdx + 1}`;
                          fieldName = field?.label || field?.db_field || `Field #${fieldIdx + 1}`;
                          propLabel = prop === "db_field" ? "DB Field" : prop === "label" ? "Label" : prop;
                        } else if (secMatch) {
                          secIdx = parseInt(secMatch[1], 10);
                          const sec = formDetails?.sections?.[secIdx];
                          secName = sec?.section_label || `Section ${secIdx + 1}`;
                          propLabel = secMatch[2];
                        } else {
                          secName = "Form Settings";
                          propLabel = path;
                        }

                        return (
                          <li
                            key={idx}
                            className="cursor-pointer hover:underline text-red-900"
                            onClick={() => {
                              if (secIdx !== null && secIdx !== undefined) {
                                setActiveSectionIndex(secIdx);
                              }
                            }}
                          >
                            <strong className="font-semibold text-red-950">{secName}</strong>
                            {fieldName ? <span> ➔ Field: <strong className="text-red-950">{fieldName}</strong></span> : ""}
                            <span> ({propLabel}): </span>
                            <span className="font-bold text-red-700">{msg}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                }
              />
            )}

            {/* SECTIONS */}
            <div className="overflow-x-auto">
              <div className="flex gap-2 min-w-max">
                <DndContext
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                  modifiers={[restrictToParentElement]}
                >
                  <SortableContext
                    items={formDetails?.sections?.map((s) => s?.id)}
                    strategy={horizontalListSortingStrategy}
                  >
                    {formDetails?.sections?.map((sec, index) => (
                      <SortableSection
                        key={sec?.id}
                        sec={sec}
                        index={index}
                        activeIndex={activeSectionIndex}
                        setActive={setActiveSectionIndex}
                        remove={removeSection}
                        toggleCollapse={toggleCollapse}
                        isDisabled={isDisabled}
                        hasError={Object.keys(errors || {}).some((k) => k.startsWith(`sections[${index}].`))}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </div>
            </div>
          </div>

          {/* 📊 SECTION TYPE SUMMARY */}
          {(formDetails?.sections || []).length > 0 && (
            <div className="flex items-center justify-between flex-wrap gap-2 my-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
              <div className="flex items-center flex-wrap gap-1.5">
                <span className="font-medium text-slate-500 whitespace-nowrap mr-1">
                  Form structure:
                </span>
                {formDetails.sections.map((sec, idx) => (
                  <Tooltip
                    key={sec.id}
                    title={
                      sec.type === "add_more"
                        ? (sec.storage_type || "table") === "table"
                          ? "Table section — after Save you will be prompted to add rows"
                          : "Add-More section saved as JSON schema only (no table data entry)"
                        : "General section — saved as JSON schema only"
                    }
                  >
                    <Tag
                      color={
                        sec.type === "add_more"
                          ? (sec.storage_type || "table") === "table"
                            ? "purple"
                            : "blue"
                          : "green"
                      }
                      className="m-0 cursor-default"
                    >
                      {sec.type === "add_more"
                        ? (sec.storage_type || "table") === "table"
                          ? "📋 "
                          : "📄 "
                        : "📄 "}
                      {sec.section_label || `Section ${idx + 1}`}
                      <span className="ml-1 opacity-75 text-[10px] font-normal">
                        {sec.type === "add_more"
                          ? (sec.storage_type || "table") === "table"
                            ? "(Table)"
                            : "(JSON)"
                          : "(JSON)"}
                      </span>
                    </Tag>
                  </Tooltip>
                ))}
              </div>

              {/* Overall hint */}
              {(() => {
                const hasAddMoreTable = formDetails.sections.some(
                  (s) =>
                    s.type === "add_more" &&
                    (s.fields || []).length > 0 &&
                    (s.storage_type || "table") === "table"
                );
                return (
                  <span
                    className={`font-semibold text-xs whitespace-nowrap ${
                      hasAddMoreTable ? "text-purple-700" : "text-emerald-700"
                    }`}
                  >
                    {hasAddMoreTable
                      ? "💡 Save → Provisions SQL table(s)"
                      : "💡 Save → JSON schema only"}
                  </span>
                );
              })()}
            </div>
          )}

          {/* CONFIG HEADER BAR */}
          {!activeSection?.collapsed &&
            Object.keys(activeSection || {}).length > 0 && (
              <>
                <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-1.5 my-1 shadow-2xs flex-wrap gap-2">
                {/* Left: Active Section Title */}
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-700 text-sm">
                    ⚙️ {activeSection?.section_label || "Section"} Settings
                  </span>
                  <Tag
                    color={activeSection?.type === "add_more" ? "purple" : "blue"}
                    className="m-0 font-medium"
                  >
                    {activeSection?.type === "add_more" ? "Add More Table" : "General Section"}
                  </Tag>
                </div>

                {/* Right: Section Controls */}
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Error display */}
                  {errors[`sections[${activeSectionIndex}].fields`] && (
                    <div className="text-red-500 text-xs font-medium">
                      {errors[`sections[${activeSectionIndex}].fields`]}
                    </div>
                  )}

                  {/* Section Name Input */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-gray-600 whitespace-nowrap">
                      Section Name:
                    </span>
                    <div>
                      <Input
                        disabled={isDisabled}
                        placeholder="Section name"
                        style={{ width: 170 }}
                        value={activeSection?.section_label}
                        onChange={(e) =>
                          updateSection(
                            activeSectionIndex,
                            "section_label",
                            e.target.value,
                          )
                        }
                      />
                      {errors[`sections[${activeSectionIndex}].section_label`] && (
                        <div className="text-red-500 text-xs mt-0.5">
                          {errors[`sections[${activeSectionIndex}].section_label`]}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Section Type Select */}
                  <div className="flex items-center gap-1.5 pl-2 border-l border-gray-300">
                    <span className="text-xs font-medium text-gray-600 whitespace-nowrap">
                      Type:
                    </span>
                    <div>
                      <Select
                        disabled={isDisabled}
                        style={{ width: 120 }}
                        value={activeSection?.type}
                        onChange={(val) => {
                          updateSection(activeSectionIndex, "type", val);
                          if (val === "add_more") {
                            setFormDetails((prev) => {
                              const updated = [...prev.sections];
                              if (!updated[activeSectionIndex]) return prev;
                              updated[activeSectionIndex] = {
                                ...updated[activeSectionIndex],
                                storage_type: updated[activeSectionIndex].storage_type || "table",
                              };
                              return { ...prev, sections: updated };
                            });
                          }
                        }}
                        options={[
                          { label: "General", value: "general" },
                          { label: "Add More", value: "add_more" },
                        ]}
                      />
                      {errors[`sections[${activeSectionIndex}].type`] && (
                        <div className="text-red-500 text-xs mt-0.5">
                          {errors[`sections[${activeSectionIndex}].type`]}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Storage Type Picker (for add_more) */}
                  {activeSection?.type === "add_more" && !isDisabled && (
                    <div className="flex items-center gap-1.5 pl-2 border-l border-gray-300">
                      <span className="text-xs font-medium text-gray-600 whitespace-nowrap">
                        Save entries as:
                      </span>
                      <Select
                        size="middle"
                        style={{ width: 110 }}
                        value={activeSection?.storage_type || "table"}
                        onChange={(val) =>
                          setFormDetails((prev) => {
                            const updated = [...prev.sections];
                            if (!updated[activeSectionIndex]) return prev;
                            updated[activeSectionIndex] = {
                              ...updated[activeSectionIndex],
                              storage_type: val,
                            };
                            return { ...prev, sections: updated };
                          })
                        }
                        options={[
                          { label: "📋 Table", value: "table" },
                          { label: "📄 JSON", value: "json" },
                        ]}
                      />
                    </div>
                  )}

                  {/* View Layout Configurator (for add_more) */}
                  {activeSection?.type === "add_more" && !isDisabled && (
                    <div className="flex items-center gap-1.5 pl-2 border-l border-gray-300">
                      <span className="text-xs font-medium text-gray-600 whitespace-nowrap">
                        Details View Layout:
                      </span>
                      <Select
                        size="middle"
                        style={{ width: 180 }}
                        value={activeSection?.display_mode || "table"}
                        onChange={(val) =>
                          setFormDetails((prev) => {
                            const updated = [...prev.sections];
                            if (!updated[activeSectionIndex]) return prev;
                            updated[activeSectionIndex] = {
                              ...updated[activeSectionIndex],
                              display_mode: val,
                            };
                            return { ...prev, sections: updated };
                          })
                        }
                        options={[
                          { label: "📊 Table (Grand Total)", value: "table" },
                          { label: "📈 Stat Widgets + Table", value: "stat_widgets" },
                          { label: "🎴 Card Grid", value: "cards" },
                        ]}
                      />
                    </div>
                  )}
                </div>
              </div>

                <FormSectionBuilder
                  errors={getSectionErrors(errors, activeSectionIndex)}
                  isDisabled={isDisabled}
                  key={activeSection?.id}
                  activeSection={activeSection}
                  initialFields={activeSection?.fields}
                  allFormFields={(formDetails.sections || []).flatMap((sec) => sec.fields || [])}
                  onFieldsChange={(fields) =>
                    setFormDetails((prev) => {
                      const updated = [...prev.sections];

                      if (!updated?.[activeSectionIndex]) return prev;

                      updated[activeSectionIndex] = {
                        ...updated[activeSectionIndex],
                        fields,
                      };

                      return { ...prev, sections: updated };
                    })
                  }
                />
              </>
            )}
        </>
      )
    },
    {
      key: "2",
      label: "⚡ Actions",
      children: (
        <div style={{ padding: "16px 0" }}>
          <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>Configure Form Actions</span>
              <a
                href="https://ant.design/components/icon"
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 12, color: "#1677ff", display: "inline-flex", alignItems: "center", gap: 4 }}
              >
                <span>🔗 Open Ant Design Icons Website ↗</span>
              </a>
            </div>
            {!isDisabled && (
              <Button
                size="small"
                type="dashed"
                onClick={() =>
                  setFormDetails((prev) => ({
                    ...prev,
                    actions: [
                      ...(prev.actions || []),
                      { name: "Action", slug: `action_${Date.now()}`, type: "OPEN_MODAL" },
                    ],
                  }))
                }
              >
                + Add Action
              </Button>
            )}
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            {(formDetails?.actions || []).map((action, idx) => {
              const allFormFields = (formDetails.sections || []).flatMap((sec) => sec.fields || []);
              const baseFieldOptions = [
                ...allFormFields
                  .filter((f) => f.db_field || f.label)
                  .map((f) => ({
                    label: `${f.label || f.db_field} (${f.db_field || "key"})`,
                    value: f.db_field || f.label,
                  })),
                { label: "Status (status)", value: "status" },
                { label: "Amount / Total (amount)", value: "amount" },
                { label: "Is Active (is_active)", value: "is_active" },
                { label: "ID (id)", value: "id" },
              ];

              const currentFieldMap = new Map(baseFieldOptions.map((opt) => [opt.value, opt]));
              (action?.conditions || []).forEach((c) => {
                if (c.field && !currentFieldMap.has(c.field)) {
                  currentFieldMap.set(c.field, { label: `${c.field} (custom)`, value: c.field });
                }
              });
              const fieldOptionsList = Array.from(currentFieldMap.values());

              const hasConditions = Array.isArray(action.conditions) && action.conditions.length > 0;
              const isConditionsExpanded = expandedConditions[idx] ?? hasConditions;

              return (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    padding: "14px 16px",
                    borderRadius: 8,
                    border: "1px solid #f0f0f0",
                    background: "#fafafa",
                  }}
                >
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
                    {/* Type (Display Type first) */}
                    <div style={{ flex: "0 0 190px" }}>
                      <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>Display Type</div>
                      <Select
                        disabled={isDisabled}
                        style={{ width: "100%" }}
                        value={action.type}
                        placeholder="Select type"
                        allowClear
                        onChange={(val) => {
                          const updated = [...(formDetails.actions || [])];
                          updated[idx] = { ...updated[idx], type: val };
                          setFormDetails((prev) => ({ ...prev, actions: updated }));
                        }}
                        options={[
                          { label: "🪟 Open Modal (Pop-up Form)",     value: "OPEN_MODAL" },
                          { label: "📄 Open Page (Full View)",        value: "OPEN_PAGE"  },
                          { label: "🔀 Navigate to Child Form",       value: "OPEN_CHILD_FORM" },
                          { label: "🗑️ Delete Record",                 value: "DELETE"     },
                          { label: "🔗 Custom URL",                   value: "CUSTOM_URL" },
                        ]}
                      />
                    </div>

                    {/* Child Form Selection (when OPEN_CHILD_FORM) */}
                    {action.type === "OPEN_CHILD_FORM" && (
                      <div style={{ flex: "0 0 190px" }}>
                        <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>Child Form</div>
                        <Select
                          disabled={isDisabled}
                          showSearch
                          allowClear
                          style={{ width: "100%" }}
                          value={action.child_form_slug || (allFormsList.some(f => f.fsc_slug === action.slug || f.slug === action.slug) ? action.slug : undefined)}
                          placeholder="Search child form..."
                          optionFilterProp="label"
                          filterOption={(input, option) =>
                            String(option?.label || "").toLowerCase().includes(input.toLowerCase())
                          }
                          onChange={(val) => {
                            const childForm = allFormsList.find((f) => f.fsc_slug === val || f.slug === val);
                            const childSlug = childForm?.fsc_slug || childForm?.slug || val || "";
                            const childName = childForm?.fsc_name || childForm?.title || childSlug;
                            const updated = [...(formDetails.actions || [])];
                            const currentAction = updated[idx] || {};
                            
                            const isGenericName = !currentAction.name || currentAction.name.startsWith("Action ") || currentAction.name.startsWith("action_");
                            
                            updated[idx] = {
                              ...currentAction,
                              slug: childSlug || currentAction.slug,
                              name: isGenericName && childName ? childName : (currentAction.name || childName),
                              child_form_slug: childSlug,
                              is_children: true,
                              url_pattern: `forms/${formDetails.slug}/${childSlug}/:id`,
                              form_details: {
                                form_slug: childSlug,
                                parent_primary_key: "id",
                                is_children: true,
                              },
                            };
                            setFormDetails((prev) => ({ ...prev, actions: updated }));
                          }}
                          options={allFormsList
                            .filter((f) => f.fsc_id !== formDetails?.fsc_id && f.fsc_id !== formDetails?.id)
                            .map((f) => ({
                              label: f.fsc_name || f.title || f.fsc_slug || f.slug,
                              value: f.fsc_slug || f.slug,
                            }))
                          }
                        />
                      </div>
                    )}

                    {/* Name */}
                    <div style={{ flex: "0 0 140px" }}>
                      <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>Name</div>
                      <Input
                        disabled={isDisabled}
                        value={action.name}
                        placeholder="Action name"
                        onChange={(e) => {
                          const updated = [...(formDetails.actions || [])];
                          updated[idx] = { ...updated[idx], name: e.target.value };
                          setFormDetails((prev) => ({ ...prev, actions: updated }));
                        }}
                      />
                    </div>

                    {/* Slug */}
                    <div style={{ flex: "0 0 130px" }}>
                      <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>Slug</div>
                      <Input
                        disabled={isDisabled}
                        value={action.slug}
                        placeholder="action_slug"
                        onChange={(e) => {
                          const updated = [...(formDetails.actions || [])];
                          updated[idx] = { ...updated[idx], slug: e.target.value };
                          setFormDetails((prev) => ({ ...prev, actions: updated }));
                        }}
                      />
                    </div>

                    {/* Icon */}
                    <div style={{ flex: "0 0 115px" }}>
                      <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>Icon</div>
                      <Button
                        disabled={isDisabled}
                        onClick={() => setIconPickerState({ visible: true, targetActionIdx: idx })}
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          height: 32,
                          padding: "0 8px",
                          borderRadius: 6,
                        }}
                      >
                        {renderActionIconPreview(action.icon)}
                      </Button>
                    </div>

                    {/* Display Conditions Button */}
                    <div style={{ flex: "0 0 160px" }}>
                      <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>Conditions</div>
                      <Button
                        size="middle"
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                          borderColor: hasConditions ? "#7c3aed" : "#d9d9d9",
                          color: hasConditions ? "#7c3aed" : "#595959",
                          fontWeight: hasConditions ? 600 : 400,
                        }}
                        onClick={() =>
                          setExpandedConditions((prev) => ({
                            ...prev,
                            [idx]: !isConditionsExpanded,
                          }))
                        }
                      >
                        <span>⚡ Conditions</span>
                        {hasConditions && (
                          <Tag color="purple" style={{ margin: 0, padding: "0 5px", fontSize: 11, borderRadius: 10 }}>
                            {action.conditions.length}
                          </Tag>
                        )}
                      </Button>
                    </div>

                    {/* Remove */}
                    {!isDisabled && (
                      <Popconfirm
                        title="Remove Action"
                        description="Are you sure you want to remove this action?"
                        onConfirm={() => {
                          const updated = (formDetails.actions || []).filter((_, i) => i !== idx);
                          setFormDetails((prev) => ({ ...prev, actions: updated }));
                        }}
                        okText="Yes, Remove"
                        cancelText="Cancel"
                        okButtonProps={{ danger: true }}
                      >
                        <Tooltip title="Remove action">
                          <Button
                            danger
                            size="small"
                            style={{ marginTop: 22, flexShrink: 0 }}
                          >
                            ✕
                          </Button>
                        </Tooltip>
                      </Popconfirm>
                    )}
                  </div>

                  {/* Conditions Details Panel */}
                  {isConditionsExpanded && (
                    <div
                      style={{
                        marginTop: 4,
                        padding: "12px 14px",
                        borderRadius: 6,
                        background: "#ffffff",
                        border: "1px solid #e0e7ff",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>
                            🎯 Display Conditions (Show action when criteria met):
                          </span>
                          <Select
                            size="small"
                            style={{ width: 230 }}
                            value={action.condition_match || "ALL"}
                            onChange={(val) => {
                              const updated = [...(formDetails.actions || [])];
                              updated[idx] = { ...updated[idx], condition_match: val };
                              setFormDetails((prev) => ({ ...prev, actions: updated }));
                            }}
                            options={[
                              { label: "ALL rules must match (AND)", value: "ALL" },
                              { label: "ANY rule can match (OR)",   value: "ANY" },
                            ]}
                          />
                        </div>
                        {!isDisabled && (
                          <Button
                            size="small"
                            type="dashed"
                            style={{ color: "#7c3aed", borderColor: "#c4b5fd" }}
                            onClick={() => {
                              const updated = [...(formDetails.actions || [])];
                              const conds = updated[idx].conditions || [];
                              updated[idx] = {
                                ...updated[idx],
                                conditions: [...conds, { field: "", operator: "equals", value: "" }],
                              };
                              setFormDetails((prev) => ({ ...prev, actions: updated }));
                            }}
                          >
                            + Add Condition Rule
                          </Button>
                        )}
                      </div>

                      {(!action.conditions || action.conditions.length === 0) ? (
                        <div style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic" }}>
                          No condition rules set. Action will be visible for all records.
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {action.conditions.map((cond, cIdx) => {
                            const searchKey = `${idx}_${cIdx}`;
                            const searchVal = fieldSearchVals[searchKey] || "";

                            const currentOptions = [...fieldOptionsList];
                            if (searchVal && !currentOptions.some((o) => o.value === searchVal)) {
                              currentOptions.unshift({
                                label: `➕ Use "${searchVal}"`,
                                value: searchVal,
                              });
                            }

                            return (
                              <div key={cIdx} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                                {/* Field Picker */}
                                <div style={{ flex: "1 1 210px" }}>
                                  <Select
                                    showSearch
                                    allowClear
                                    disabled={isDisabled}
                                    size="small"
                                    style={{ width: "100%" }}
                                    value={cond.field || undefined}
                                    placeholder="Select or type field name…"
                                    onSearch={(text) =>
                                      setFieldSearchVals((prev) => ({ ...prev, [searchKey]: text }))
                                    }
                                    onChange={(val) => {
                                      const updatedActions = [...(formDetails.actions || [])];
                                      const conds = [...(updatedActions[idx].conditions || [])];
                                      conds[cIdx] = { ...conds[cIdx], field: val };
                                      updatedActions[idx] = { ...updatedActions[idx], conditions: conds };
                                      setFormDetails((prev) => ({ ...prev, actions: updatedActions }));
                                    }}
                                    options={currentOptions}
                                    filterOption={(input, option) =>
                                      String(option?.label || "").toLowerCase().includes(input.toLowerCase())
                                    }
                                  />
                                </div>

                                {/* Operator */}
                                <div style={{ flex: "0 0 170px" }}>
                                  <Select
                                    disabled={isDisabled}
                                    size="small"
                                    style={{ width: "100%" }}
                                    value={cond.operator || "equals"}
                                    onChange={(val) => {
                                      const updatedActions = [...(formDetails.actions || [])];
                                      const conds = [...(updatedActions[idx].conditions || [])];
                                      conds[cIdx] = { ...conds[cIdx], operator: val };
                                      updatedActions[idx] = { ...updatedActions[idx], conditions: conds };
                                      setFormDetails((prev) => ({ ...prev, actions: updatedActions }));
                                    }}
                                    options={[
                                      { label: "= (Equals)",                 value: "equals" },
                                      { label: "!= (Not Equals)",             value: "not_equals" },
                                      { label: "> (Greater Than)",           value: "gt" },
                                      { label: ">= (Greater Than or Equal)", value: "gte" },
                                      { label: "< (Less Than)",              value: "lt" },
                                      { label: "<= (Less Than or Equal)",    value: "lte" },
                                      { label: "Contains Text",              value: "contains" },
                                      { label: "Is Not Empty",               value: "is_not_empty" },
                                      { label: "Is Empty",                   value: "is_empty" },
                                    ]}
                                  />
                                </div>

                                {/* Value Input / Select */}
                                <div style={{ flex: "1 1 200px" }}>
                                  {(() => {
                                    const selectedFieldSchema = allFormFields.find(
                                      (f) => f.db_field === cond.field || f.label === cond.field
                                    );
                                    const fieldOptionsRaw =
                                      selectedFieldSchema?.options ||
                                      selectedFieldSchema?.ui?.options ||
                                      selectedFieldSchema?.config?.options;

                                    const hasPredefinedOptions = Array.isArray(fieldOptionsRaw) && fieldOptionsRaw.length > 0;

                                    if (hasPredefinedOptions && !["is_not_empty", "is_empty"].includes(cond.operator)) {
                                      const valueOptionsList = fieldOptionsRaw.map((opt) => {
                                        if (typeof opt === "object" && opt !== null) {
                                          return {
                                            label: opt.label || opt.value || String(opt),
                                            value: opt.value !== undefined ? opt.value : opt.label,
                                          };
                                        }
                                        return { label: String(opt), value: String(opt) };
                                      });

                                      const valSearchKey = `val_${idx}_${cIdx}`;
                                      const valSearchText = fieldSearchVals[valSearchKey] || "";
                                      const dropdownOpts = [...valueOptionsList];
                                      if (valSearchText && !dropdownOpts.some((o) => String(o.value) === String(valSearchText))) {
                                        dropdownOpts.unshift({ label: `➕ Use "${valSearchText}"`, value: valSearchText });
                                      }

                                      return (
                                        <Select
                                          showSearch
                                          allowClear
                                          disabled={isDisabled}
                                          size="small"
                                          style={{ width: "100%" }}
                                          value={cond.value || undefined}
                                          placeholder="Select option value…"
                                          onSearch={(text) =>
                                            setFieldSearchVals((prev) => ({ ...prev, [valSearchKey]: text }))
                                          }
                                          onChange={(val) => {
                                            const updatedActions = [...(formDetails.actions || [])];
                                            const conds = [...(updatedActions[idx].conditions || [])];
                                            conds[cIdx] = { ...conds[cIdx], value: val };
                                            updatedActions[idx] = { ...updatedActions[idx], conditions: conds };
                                            setFormDetails((prev) => ({ ...prev, actions: updatedActions }));
                                          }}
                                          options={dropdownOpts}
                                          filterOption={(input, option) =>
                                            String(option?.label || "").toLowerCase().includes(input.toLowerCase())
                                          }
                                        />
                                      );
                                    }

                                    return (
                                      <Input
                                        disabled={isDisabled || ["is_not_empty", "is_empty"].includes(cond.operator)}
                                        size="small"
                                        value={cond.value}
                                        placeholder={["is_not_empty", "is_empty"].includes(cond.operator) ? "N/A" : "Value (e.g. 50000 / Approved)"}
                                        onChange={(e) => {
                                          const updatedActions = [...(formDetails.actions || [])];
                                          const conds = [...(updatedActions[idx].conditions || [])];
                                          conds[cIdx] = { ...conds[cIdx], value: e.target.value };
                                          updatedActions[idx] = { ...updatedActions[idx], conditions: conds };
                                          setFormDetails((prev) => ({ ...prev, actions: updatedActions }));
                                        }}
                                      />
                                    );
                                  })()}
                                </div>

                                {/* Delete Rule */}
                                {!isDisabled && (
                                  <Popconfirm
                                    title="Remove Condition Rule"
                                    description="Are you sure you want to remove this condition rule?"
                                    onConfirm={() => {
                                      const updatedActions = [...(formDetails.actions || [])];
                                      const conds = (updatedActions[idx].conditions || []).filter((_, i) => i !== cIdx);
                                      updatedActions[idx] = { ...updatedActions[idx], conditions: conds };
                                      setFormDetails((prev) => ({ ...prev, actions: updatedActions }));
                                    }}
                                    okText="Yes, Remove"
                                    cancelText="Cancel"
                                    okButtonProps={{ danger: true }}
                                  >
                                    <Tooltip title="Remove rule">
                                      <Button danger size="small" type="text">
                                        ✕
                                      </Button>
                                    </Tooltip>
                                  </Popconfirm>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ),
    },
    {
      key: "3",
      label: (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span>📑 Action Tabs</span>
          {formDetails?.enable_action_tabs && (
            <Tag color="orange" style={{ margin: 0, padding: "0 6px", fontSize: 11, borderRadius: 10 }}>
              {formDetails?.action_tabs?.length || 0}
            </Tag>
          )}
        </span>
      ),
      children: (
        <div style={{ padding: "16px 0" }}>
          {/* Header & Toggle */}
          <div
            style={{
              marginBottom: 16,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "#f8fafc",
              padding: "14px 18px",
              borderRadius: 8,
              border: "1px solid #e2e8f0",
            }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#1e293b", display: "flex", alignItems: "center", gap: 8 }}>
                <span>📑 Action Tabs / List View Filters</span>
                <Tag color={formDetails?.enable_action_tabs ? "green" : "default"}>
                  {formDetails?.enable_action_tabs ? "Enabled" : "Disabled"}
                </Tag>
              </div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                Add status or field condition tabs to filter records on the list view page (e.g. Approved, Pending, Draft, Rejected).
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>Enable Action Tabs:</span>
              <Switch
                checked={!!formDetails?.enable_action_tabs}
                onChange={(checked) => {
                  setFormDetails((prev) => {
                    const hasTabs = prev?.action_tabs && prev.action_tabs.length > 0;
                    const defaultTabs = [
                      { id: `tab_${Date.now()}_1`, title: "Submitted", field: "status", operator: "equals", value: "submit",   color: "blue" },
                      { id: `tab_${Date.now()}_2`, title: "Approved",  field: "status", operator: "equals", value: "approved", color: "green" },
                      { id: `tab_${Date.now()}_3`, title: "Pending",   field: "status", operator: "equals", value: "pending",  color: "orange" },
                      { id: `tab_${Date.now()}_4`, title: "Draft",     field: "status", operator: "equals", value: "draft",    color: "gray" },
                      { id: `tab_${Date.now()}_5`, title: "Rejected",  field: "status", operator: "equals", value: "rejected", color: "red" },
                    ];
                    return {
                      ...prev,
                      enable_action_tabs: checked,
                      action_tabs: checked && !hasTabs ? defaultTabs : (prev?.action_tabs || []),
                    };
                  });
                }}
              />
            </div>
          </div>

          {!formDetails?.enable_action_tabs ? (
            <Alert
              type="info"
              showIcon
              message="Action Tabs Disabled"
              description="Toggle ON above to enable custom tabs on the form list page. Once enabled, you can configure tabs like Submitted, Approved, Draft, Pending, and Rejected with field-wise conditions."
              style={{ marginTop: 16 }}
            />
          ) : (
            <div>
              {/* Actions Toolbar */}
              <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>
                  Configured Action Tabs ({formDetails?.action_tabs?.length || 0})
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Button
                    size="small"
                    type="default"
                    onClick={() => {
                      setFormDetails((prev) => ({
                        ...prev,
                        action_tabs: [
                          { id: `tab_${Date.now()}_1`, title: "Submitted", field: "status", operator: "equals", value: "submit",   color: "blue" },
                          { id: `tab_${Date.now()}_2`, title: "Approved",  field: "status", operator: "equals", value: "approved", color: "green" },
                          { id: `tab_${Date.now()}_3`, title: "Pending",   field: "status", operator: "equals", value: "pending",  color: "orange" },
                          { id: `tab_${Date.now()}_4`, title: "Draft",     field: "status", operator: "equals", value: "draft",    color: "gray" },
                          { id: `tab_${Date.now()}_5`, title: "Rejected",  field: "status", operator: "equals", value: "rejected", color: "red" },
                        ],
                      }));
                    }}
                  >
                    ⚡ Load Default Status Tabs
                  </Button>
                  {!isDisabled && (
                    <Button
                      size="small"
                      type="primary"
                      onClick={() => {
                        setFormDetails((prev) => ({
                          ...prev,
                          action_tabs: [
                            ...(prev?.action_tabs || []),
                            {
                              id: `tab_${Date.now()}`,
                              title: "New Tab",
                              field: "status",
                              operator: "equals",
                              value: "approved",
                              color: "blue",
                            },
                          ],
                        }));
                      }}
                    >
                      + Add Action Tab
                    </Button>
                  )}
                </div>
              </div>

              {/* Tabs List */}
              {(!formDetails?.action_tabs || formDetails.action_tabs.length === 0) ? (
                <div
                  style={{
                    padding: 32,
                    textAlign: "center",
                    background: "#fafafa",
                    borderRadius: 8,
                    border: "1px dashed #d9d9d9",
                    color: "#8c8c8c",
                  }}
                >
                  No action tabs configured. Click "+ Add Action Tab" or "Load Default Status Tabs" above.
                </div>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  {formDetails.action_tabs.map((tabItem, tabIdx) => {
                    const allFormFields = (formDetails.sections || []).flatMap((sec) => sec.fields || []);
                    const baseFieldOptions = [
                      ...allFormFields
                        .filter((f) => f.db_field || f.label)
                        .map((f) => ({
                          label: `${f.label || f.db_field} (${f.db_field || "key"})`,
                          value: f.db_field || f.label,
                        })),
                      { label: "Status (status)", value: "status" },
                      { label: "Amount / Total (amount)", value: "amount" },
                      { label: "Is Active (is_active)", value: "is_active" },
                      { label: "ID (id)", value: "id" },
                    ];

                    const currentFieldMap = new Map(baseFieldOptions.map((opt) => [opt.value, opt]));
                    if (tabItem.field && !currentFieldMap.has(tabItem.field)) {
                      currentFieldMap.set(tabItem.field, { label: `${tabItem.field} (custom)`, value: tabItem.field });
                    }
                    const fieldOptionsList = Array.from(currentFieldMap.values());

                    return (
                        <div
                          key={tabItem.id || tabIdx}
                          draggable={!isDisabled}
                          onDragStart={(e) => {
                            e.dataTransfer.effectAllowed = "move";
                            setDraggedTabIdx(tabIdx);
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = "move";
                            if (dragOverTabIdx !== tabIdx) setDragOverTabIdx(tabIdx);
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            if (draggedTabIdx !== null && draggedTabIdx !== tabIdx) {
                              handleReorderActionTabs(draggedTabIdx, tabIdx);
                            }
                            setDraggedTabIdx(null);
                            setDragOverTabIdx(null);
                          }}
                          onDragEnd={() => {
                            setDraggedTabIdx(null);
                            setDragOverTabIdx(null);
                          }}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 12,
                            padding: "16px 18px",
                            borderRadius: 10,
                            border: dragOverTabIdx === tabIdx ? "2px dashed #1677ff" : "1px solid #cbd5e1",
                            background: draggedTabIdx === tabIdx ? "#f0fdf4" : "#ffffff",
                            boxShadow: "0 2px 5px rgba(0,0,0,0.03)",
                            opacity: draggedTabIdx === tabIdx ? 0.6 : 1,
                            transition: "all 0.15s ease",
                          }}
                        >
                          {/* Top Row: Controls & Main Tab Settings */}
                          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", borderBottom: "1px solid #f1f5f9", paddingBottom: 10 }}>
                            {/* Drag Handle & Up/Down Buttons */}
                            {!isDisabled && (
                              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                <Tooltip title="Drag to reorder tabs">
                                  <span
                                    style={{
                                      cursor: "grab",
                                      fontSize: 16,
                                      color: "#94a3b8",
                                      userSelect: "none",
                                      padding: "2px 6px",
                                      borderRadius: 4,
                                      background: "#f8fafc",
                                      border: "1px solid #e2e8f0",
                                    }}
                                  >
                                    ⋮⋮
                                  </span>
                                </Tooltip>
                                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                  <Button
                                    size="small"
                                    type="text"
                                    disabled={tabIdx === 0}
                                    style={{ padding: "0 4px", height: 14, fontSize: 9, lineHeight: 1 }}
                                    onClick={() => handleReorderActionTabs(tabIdx, tabIdx - 1)}
                                    title="Move Up"
                                  >
                                    ▲
                                  </Button>
                                  <Button
                                    size="small"
                                    type="text"
                                    disabled={tabIdx === (formDetails.action_tabs || []).length - 1}
                                    style={{ padding: "0 4px", height: 14, fontSize: 9, lineHeight: 1 }}
                                    onClick={() => handleReorderActionTabs(tabIdx, tabIdx + 1)}
                                    title="Move Down"
                                  >
                                    ▼
                                  </Button>
                                </div>
                              </div>
                            )}

                            {/* Tab Title */}
                            <div style={{ flex: "1 1 200px" }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 3 }}>Tab Name / Title</div>
                              <Input
                                disabled={isDisabled}
                                value={tabItem.title}
                                placeholder="e.g. Approved / Draft / Pending"
                                onChange={(e) => {
                                  const updated = [...(formDetails.action_tabs || [])];
                                  updated[tabIdx] = { ...updated[tabIdx], title: e.target.value };
                                  setFormDetails((prev) => ({ ...prev, action_tabs: updated }));
                                }}
                              />
                            </div>

                            {/* Match Logic (AND / OR) */}
                            <div style={{ flex: "0 0 180px" }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 3 }}>Condition Logic</div>
                              <Select
                                disabled={isDisabled}
                                style={{ width: "100%" }}
                                value={tabItem.match_type || "ALL"}
                                onChange={(val) => {
                                  const updated = [...(formDetails.action_tabs || [])];
                                  updated[tabIdx] = { ...updated[tabIdx], match_type: val };
                                  setFormDetails((prev) => ({ ...prev, action_tabs: updated }));
                                }}
                                options={[
                                  { label: "AND (Match ALL Conditions)", value: "ALL" },
                                  { label: "OR (Match ANY Condition)",  value: "ANY" },
                                ]}
                              />
                            </div>

                            {/* Tag Color */}
                            <div style={{ flex: "0 0 130px" }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 3 }}>Tag Color</div>
                              <Select
                                disabled={isDisabled}
                                style={{ width: "100%" }}
                                value={tabItem.color || "blue"}
                                onChange={(val) => {
                                  const updated = [...(formDetails.action_tabs || [])];
                                  updated[tabIdx] = { ...updated[tabIdx], color: val };
                                  setFormDetails((prev) => ({ ...prev, action_tabs: updated }));
                                }}
                                options={[
                                  { label: "🟢 Green",    value: "green" },
                                  { label: "🟠 Orange",   value: "orange" },
                                  { label: "🔵 Blue",     value: "blue" },
                                  { label: "🔴 Red",      value: "red" },
                                  { label: "🟣 Purple",   value: "purple" },
                                  { label: "🩵 Cyan",     value: "cyan" },
                                  { label: "⚪ Gray",     value: "gray" },
                                ]}
                              />
                            </div>

                            {/* Remove Tab Button */}
                            {!isDisabled && (
                              <Popconfirm
                                title="Remove Action Tab"
                                description={`Are you sure you want to delete the "${tabItem.title || 'this'}" tab?`}
                                onConfirm={() => {
                                  const updated = (formDetails.action_tabs || []).filter((_, i) => i !== tabIdx);
                                  setFormDetails((prev) => ({ ...prev, action_tabs: updated }));
                                }}
                                okText="Yes, Delete"
                                cancelText="Cancel"
                                okButtonProps={{ danger: true }}
                              >
                                <Button
                                  danger
                                  size="small"
                                  style={{ marginTop: 18 }}
                                >
                                  ✕ Remove Tab
                                </Button>
                              </Popconfirm>
                            )}
                          </div>

                          {/* Bottom Panel: Multi-Condition List */}
                          {(() => {
                            const condList = Array.isArray(tabItem.conditions) && tabItem.conditions.length > 0
                              ? tabItem.conditions
                              : [{ field: tabItem.field || "status", operator: tabItem.operator || "equals", value: tabItem.value || "" }];

                            return (
                              <div style={{ background: "#f8fafc", padding: 12, borderRadius: 8, border: "1px solid #f1f5f9" }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                  <span>Tab Conditions ({condList.length})</span>
                                  <span style={{ fontSize: 11, fontWeight: 500, color: "#94a3b8" }}>
                                    {tabItem.match_type === "ANY" ? "Rows matching ANY condition below will show" : "Rows matching ALL conditions below will show"}
                                  </span>
                                </div>

                                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                  {condList.map((cond, cIdx) => (
                                    <div key={cond.id || cIdx} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                                      {cIdx > 0 && (
                                        <Tag color={tabItem.match_type === "ANY" ? "volcano" : "blue"} style={{ fontWeight: 700, margin: 0 }}>
                                          {tabItem.match_type === "ANY" ? "OR" : "AND"}
                                        </Tag>
                                      )}

                                      {/* Condition Field */}
                                      <div style={{ flex: "1 1 200px" }}>
                                        <Select
                                          showSearch
                                          allowClear
                                          disabled={isDisabled}
                                          style={{ width: "100%" }}
                                          value={cond.field || "status"}
                                          placeholder="Select condition field"
                                          onChange={(val) => {
                                            const updated = [...(formDetails.action_tabs || [])];
                                            const currentTab = { ...updated[tabIdx] };
                                            const cArray = [...(currentTab.conditions || condList)];
                                            cArray[cIdx] = { ...cArray[cIdx], field: val };
                                            currentTab.conditions = cArray;
                                            if (cIdx === 0) { currentTab.field = val; }
                                            updated[tabIdx] = currentTab;
                                            setFormDetails((prev) => ({ ...prev, action_tabs: updated }));
                                          }}
                                          options={fieldOptionsList}
                                          filterOption={(input, option) =>
                                            String(option?.label || "").toLowerCase().includes(input.toLowerCase())
                                          }
                                        />
                                      </div>

                                      {/* Operator */}
                                      <div style={{ flex: "0 0 170px" }}>
                                        <Select
                                          disabled={isDisabled}
                                          style={{ width: "100%" }}
                                          value={cond.operator || "equals"}
                                          onChange={(val) => {
                                            const updated = [...(formDetails.action_tabs || [])];
                                            const currentTab = { ...updated[tabIdx] };
                                            const cArray = [...(currentTab.conditions || condList)];
                                            cArray[cIdx] = { ...cArray[cIdx], operator: val };
                                            currentTab.conditions = cArray;
                                            if (cIdx === 0) { currentTab.operator = val; }
                                            updated[tabIdx] = currentTab;
                                            setFormDetails((prev) => ({ ...prev, action_tabs: updated }));
                                          }}
                                          options={[
                                            { label: "= (Equals)",                 value: "equals" },
                                            { label: "!= (Not Equals)",             value: "not_equals" },
                                            { label: "> (Greater Than)",           value: "gt" },
                                            { label: ">= (Greater Than or Equal)", value: "gte" },
                                            { label: "< (Less Than)",              value: "lt" },
                                            { label: "<= (Less Than or Equal)",    value: "lte" },
                                            { label: "Contains Text",              value: "contains" },
                                            { label: "Is Not Empty",               value: "is_not_empty" },
                                            { label: "Is Empty",                   value: "is_empty" },
                                          ]}
                                        />
                                      </div>

                                      {/* Value Input */}
                                      <div style={{ flex: "1 1 180px" }}>
                                        <Input
                                          disabled={isDisabled || ["is_not_empty", "is_empty"].includes(cond.operator)}
                                          value={cond.value}
                                          placeholder="Condition value e.g. approved"
                                          onChange={(e) => {
                                            const updated = [...(formDetails.action_tabs || [])];
                                            const currentTab = { ...updated[tabIdx] };
                                            const cArray = [...(currentTab.conditions || condList)];
                                            cArray[cIdx] = { ...cArray[cIdx], value: e.target.value };
                                            currentTab.conditions = cArray;
                                            if (cIdx === 0) { currentTab.value = e.target.value; }
                                            updated[tabIdx] = currentTab;
                                            setFormDetails((prev) => ({ ...prev, action_tabs: updated }));
                                          }}
                                        />
                                      </div>

                                      {/* Delete Condition Button */}
                                      {!isDisabled && (
                                        <Popconfirm
                                          title="Remove Condition"
                                          description="Are you sure you want to remove this condition?"
                                          onConfirm={() => {
                                            const updated = [...(formDetails.action_tabs || [])];
                                            const currentTab = { ...updated[tabIdx] };
                                            const cArray = condList.filter((_, i) => i !== cIdx);
                                            currentTab.conditions = cArray;
                                            if (cArray[0]) {
                                              currentTab.field = cArray[0].field;
                                              currentTab.operator = cArray[0].operator;
                                              currentTab.value = cArray[0].value;
                                            }
                                            updated[tabIdx] = currentTab;
                                            setFormDetails((prev) => ({ ...prev, action_tabs: updated }));
                                          }}
                                          okText="Yes, Remove"
                                          cancelText="Cancel"
                                          okButtonProps={{ danger: true }}
                                          disabled={condList.length <= 1}
                                        >
                                          <Button
                                            danger
                                            type="text"
                                            size="small"
                                            disabled={condList.length <= 1}
                                            title="Remove this condition"
                                          >
                                            ✕
                                          </Button>
                                        </Popconfirm>
                                      )}
                                    </div>
                                  ))}
                                </div>

                                {/* Add Condition Button */}
                                {!isDisabled && (
                                  <Button
                                    size="small"
                                    type="dashed"
                                    style={{ marginTop: 10, borderColor: "#1677ff", color: "#1677ff", fontWeight: 600 }}
                                    onClick={() => {
                                      const updated = [...(formDetails.action_tabs || [])];
                                      const currentTab = { ...updated[tabIdx] };
                                      const cArray = [...condList, { id: `cond_${Date.now()}`, field: "status", operator: "equals", value: "" }];
                                      currentTab.conditions = cArray;
                                      updated[tabIdx] = currentTab;
                                      setFormDetails((prev) => ({ ...prev, action_tabs: updated }));
                                    }}
                                  >
                                    + Add Another Condition to "{tabItem.title || "Tab"}"
                                  </Button>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      ),
    },
    ...(isDisabled
      ? [
          {
            key: "4",
            label: "Data Preview",
            children: <DynamicGeneralListView form_slug={selectedRow?.slug} />
          }
        ]
      : [])
  ];

  return (
    <>
      <style>{`
        .fb-full-modal {
          max-width: 100vw !important;
          width: 100vw !important;
          top: 0 !important;
          padding-bottom: 0 !important;
          margin: 0 !important;
        }
        .fb-full-modal .ant-modal-content {
          border-radius: 0 !important;
          min-height: 100vh !important;
          height: 100vh !important;
          display: flex !important;
          flex-direction: column !important;
        }
        .fb-full-modal .ant-modal-body {
          flex: 1 !important;
          overflow-y: auto !important;
        }
      `}</style>
      <Modal
        className="fb-full-modal"
        open={open}
        onCancel={onClose}
        width="100vw"
        style={{ top: 0, margin: 0, padding: 0, maxWidth: "100vw" }}
        title="Form Builder"
        maskClosable={false}
        footer={[
          <Divider key="divider" style={{ margin: "12px 0" }} />,
          <Button key="cancel" onClick={onClose}>
            Cancel
          </Button>,
          ...(!isDisabled
            ? [
                <Button
                  key="save_draft"
                  onClick={() => handleSave(true)}
                  loading={loading}
                  style={{ borderColor: "#d97706", color: "#d97706", fontWeight: 600 }}
                >
                  📝 Save Draft
                </Button>,
                <Button
                  key="final_submit"
                  type="primary"
                  onClick={() => handleSave(false)}
                  loading={loading}
                  style={{ backgroundColor: "#16a34a", borderColor: "#16a34a", fontWeight: 600 }}
                >
                  🚀 Final Submit
                </Button>,
              ]
            : []),
        ]}
      >
        <div
          className="overflow-y-auto overflow-x-hidden"
          style={{ height: "100%" }}
        >
          <Tabs defaultActiveKey="1" items={tabItems} />
        </div>
      </Modal>

      {/* 👁️ LIVE FORM PREVIEW MODAL */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-base font-bold text-slate-800">
            <span>👁️ Live Form Preview</span>
            <Tag color="purple">{formDetails.title || formDetails.form_name || "Untitled Form"}</Tag>
          </div>
        }
        open={isPreviewOpen}
        onCancel={() => setIsPreviewOpen(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setIsPreviewOpen(false)}>
            Close Preview
          </Button>,
        ]}
        width={950}
        destroyOnHidden
      >
        <div className="space-y-4 py-3 max-h-[75vh] overflow-y-auto pr-1">
          {formDetails?.sections?.map((section, idx) => {
            if (section.type === "add_more") {
              return (
                <AddMoreSection
                  key={section.id || idx}
                  section={section}
                  data={[]}
                  mode="add"
                />
              );
            }
            return (
              <GeneralSection
                key={section.id || idx}
                section={section}
                data={{}}
                mode="add"
              />
            );
          })}
        </div>
      </Modal>

      <IconPickerModal
        visible={iconPickerState.visible}
        onClose={() => setIconPickerState({ visible: false, targetActionIdx: null })}
        onSelectIcon={(selectedIcon) => {
          if (iconPickerState.targetActionIdx !== null) {
            const updated = [...(formDetails.actions || [])];
            updated[iconPickerState.targetActionIdx] = {
              ...updated[iconPickerState.targetActionIdx],
              icon: selectedIcon,
            };
            setFormDetails((prev) => ({ ...prev, actions: updated }));
          }
        }}
      />
    </>
  );
}
