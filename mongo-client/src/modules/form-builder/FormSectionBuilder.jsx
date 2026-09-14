import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  restrictToParentElement,
  restrictToVerticalAxis,
} from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Input, Modal, Popconfirm } from "antd";
import { nanoid } from "nanoid";
import { useEffect, useState } from "react";

import FieldConfigRenderer from "./FieldConfigRenderer";

const FIELD_TYPES = [
  { type_name: "Text", type: "text", icon: "📄", group: "Basic" },
  { type_name: "Text Area", type: "textarea", icon: "📝", group: "Basic" },
  { type_name: "Number", type: "number", icon: "🔢", group: "Basic" },
  { type_name: "Date", type: "date", icon: "📅", group: "Basic" },
  {
    type_name: "Date Range",
    type: "date_range",
    icon: "📆",
    group: "Advanced",
  },
  { type_name: "Select", type: "select", icon: "🔽", group: "Advanced" },
  { type_name: "File", type: "file", icon: "📁", group: "Advanced" },
  { type_name: "Custom HTML", type: "custom_html", icon: "💻", group: "Layout & Content" },
  { type_name: "Section Header", type: "heading", icon: "🏷️", group: "Layout & Content" },
  { type_name: "Note / Instruction", type: "note", icon: "📌", group: "Layout & Content" },
  { type_name: "Point", type: "point", icon: "📍", group: "Geometry" },
  { type_name: "MultiPolygon", type: "multipolygon", icon: "⬡", group: "Geometry" },
  { type_name: "Line", type: "line", icon: "📈", group: "Geometry" },
];

function DraggableType({ item }) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("type", item.type);
        e.dataTransfer.setData("type_name", item.type_name);
      }}
      className="p-2 mb-2 rounded-lg bg-white border text-sm cursor-grab hover:bg-gray-100 flex gap-2"
    >
      <span>{item.icon}</span>
      <span>{item.type_name}</span>
    </div>
  );
}

function SortableItem({
  field,
  activeId,
  setActiveId,
  removeField,
  isDisabled,
  hasError,
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return field?.visible === false ? null : (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      onClick={() => setActiveId(field.id)}
      className={`p-3 mb-2 rounded-xl border flex justify-between items-center transition-all cursor-pointer ${
        hasError
          ? "bg-red-50 border-red-500 ring-2 ring-red-400 shadow-sm"
          : activeId === field.id
          ? "bg-purple-50 border-purple-500 shadow-sm ring-2 ring-purple-300"
          : "bg-white hover:bg-slate-50 border-slate-200"
      }`}
    >
      <div className="flex-1">
        <div className="font-medium text-slate-800 flex items-center justify-between">
          <span>
            {field.label ||
              (field.type === "heading"
                ? "Section Header"
                : field.type === "note"
                ? "Note"
                : field.type === "custom_html"
                ? "Custom HTML"
                : "Untitled Field")}
          </span>
          {hasError && (
            <span className="text-[10px] font-bold text-red-600 bg-red-100 border border-red-300 px-1.5 py-0.5 rounded-full flex items-center gap-1">
              ⚠️ Error
            </span>
          )}
        </div>
        <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
          <span className="capitalize">{field.type_name || field.type}</span>
          {field.db_field ? (
            <span className="text-[10px] px-1.5 py-0.2 bg-slate-200 rounded text-slate-700 font-mono">
              {field.db_field}
            </span>
          ) : (
            <span className="text-[10px] px-1.5 py-0.2 bg-purple-100 text-purple-700 rounded font-medium">
              Layout Element
            </span>
          )}
          {(field?.ui?.is_text_editor || field?.is_text_editor) && (
            <span className="text-[10px] px-1.5 py-0.2 bg-blue-100 text-blue-700 rounded font-medium">
              Rich Text Editor
            </span>
          )}
        </div>
      </div>
      {!isDisabled && (
        <div className="flex gap-2 ml-2">
          <span {...listeners} className="cursor-move text-slate-400">
            ☰
          </span>

          <Popconfirm title="Delete?" onConfirm={() => removeField(field.id)}>
            <button
              onClick={(e) => e.stopPropagation()}
              className="text-red-500 text-xs"
            >
              Delete
            </button>
          </Popconfirm>
        </div>
      )}
    </div>
  );
}

export default function FormSectionBuilder({
  initialFields = [],
  onFieldsChange,
  activeSection,
  isDisabled,
  errors,
  allFormFields = [],
}) {
  
  const getFieldErrors = (errors, fieldIndex) => {
    const prefix = `fields[${fieldIndex}].`;

    return Object.keys(errors || {})
      .filter((key) => key.startsWith(prefix))
      .reduce((acc, key) => {
        const newKey = key.replace(prefix, "");
        acc[newKey] = errors[key];
        return acc;
      }, {});
  };
  const [fields, setFields] = useState(initialFields);
  const [activeId, setActiveId] = useState(null);
  const [search, setSearch] = useState("");

  const activeField = fields.find((f) => f.id === activeId);
  const activeIndex = fields.findIndex((f) => f.id === activeId);

  const filteredTypes = FIELD_TYPES.filter(
    (f) =>
      f.type.toLowerCase().includes(search.toLowerCase()) ||
      f.type_name.toLowerCase().includes(search.toLowerCase()),
  );

  const handleDrop = (e) => {
    const id = nanoid();
    const type = e.dataTransfer.getData("type");
    const type_name = e.dataTransfer.getData("type_name");
    let newField = {
      id: `${Date.now()}_${id}`,
      type,
      type_name,
      label: "",
      db_field: "",
      required: false,
      ui: { placeholder: "" },
      validation: {},
      messages: {},
    };
    if (type === "text") {
      newField = {
        id: `${Date.now()}_${id}`,
        type,
        type_name,
        db_field: "",
        data_type: "varchar(255)",
        messages: {
          email: "Invalid email address",
          min_length: "Minimum length not met",
          max_length: "Maximum length exceeded",
          required: "This field is required",
        },
        ui: {
          placeholder: "Enter value",
        },
        label: "",
        required: false,
        validation: {
          email: false,
          min_length: "",
          max_length: "",
        },
      };
    } else if (type === "textarea") {
      newField = {
        id: `${Date.now()}_${id}`,
        type,
        type_name,
        db_field: "",
        data_type: "text",
        messages: {
          min_length: "Minimum length not met",
          max_length: "Maximum length exceeded",
          required: "This field is required",
        },
        is_text_editor: false,
        ui: {
          placeholder: "Enter value",
          rows: 4,
          auto_size: {
            minRows: 3,
            maxRows: 6,
          },
          max_length_hint: false,
          is_text_editor: false,
        },
        label: "",
        required: false,
        validation: {
          min_length: "",
          max_length: "",
        },
      };
    } else if (type === "number") {
      newField = {
        id: `${Date.now()}_${id}`,
        type,
        type_name,
        label: "",
        db_field: "",
        data_type: "varchar(255)",
        number_type: "integer",
        regex_type: "integer",
        messages: {
          min_length: "Minimum length not met",
          max_length: "Maximum length exceeded",
          required: "This field is required",
        },
        ui: {
          placeholder: "Enter number",
        },
        required: false,
        validation: {
          min_length: "",
          max_length: "",
        },
      };
    } else if (type === "date") {
      newField = {
        id: `${Date.now()}_${id}`,
        type,
        type_name,
        label: "",
        db_field: "",
        data_type: "date",
        messages: {
          min_date: "Date is too early",
          max_date: "Date is too late",
          required: "This field is required",
        },
        ui: {
          placeholder: "Select date",
        },
        required: false,
        validation: {
          min_date: null,
          max_date: null,
        },
      };
    } else if (type === "date_range") {
      newField = {
        id: `${Date.now()}_${id}`,
        type,
        type_name,
        label: "",
        db_field: "",
        data_type: "daterange",
        act_db_field: {
          end: "",
          start: "",
        },
        messages: {
          range: "Invalid date range",
          min_date: "Date is too early",
          max_date: "Date is too late",
          required: "This field is required",
        },
        ui: {
          placeholder: "Select date range",
        },
        required: false,
        validation: {
          min_date: null,
          max_date: null,
        },
      };
    } else if (type === "file") {
      newField = {
        id: `${Date.now()}_${id}`,
        type,
        type_name,
        label: "",
        db_field: "",
        data_type: "file",
        ui: {
          placeholder: "Upload file",
        },
        file: {
          table: "t_documents",
          multiple: false,
          foreign_key: "final_doc_id",
          max_size_mb: 5,
          primary_key: "tdoc_id",
          upload_path: "project/dynamic_forms",
          doc_base_url: "BASE_URL",
          doc_type_key: "doc_purpose",
          allowed_types: [],
          file_name_key: "file_name",
          file_path_key: "file_path",
        },
        messages: {
          required: "File is required",
          file_size: "File size exceeds limit",
          file_type: "Invalid file type",
          max_items: "Maximum files exceeded",
          min_items: "Minimum files required",
        },
        required: false,
        validation: {
          max_items: "",
          min_items: "",
        },
      };
    } else if (type === "select") {
      newField = {
        id: `${Date.now()}_${id}`,
        ui: {
          placeholder: "Select option",
        },
        type,
        type_name,
        data_type: "varchar(255)",
        label: "",
        db_field: "",
        messages: {
          required: "This field is required",
        },
        required: false,
        multiple: false,
        options: [],
      };
    } else if (type === "custom_html") {
      newField = {
        id: `${Date.now()}_${id}`,
        type,
        type_name,
        label: "Custom HTML",
        html_content: "<div class='p-3 bg-slate-50 border rounded text-sm'><h4>Custom Content</h4><p>Add HTML or instructions here.</p></div>",
      };
    } else if (type === "heading") {
      newField = {
        id: `${Date.now()}_${id}`,
        type,
        type_name,
        label: "Section Header",
        subtext: "",
        heading_level: "h3",
        show_divider: true,
      };
    } else if (type === "note") {
      newField = {
        id: `${Date.now()}_${id}`,
        type,
        type_name,
        label: "Note",
        note_type: "info",
        content: "Please complete all fields in this section accurately.",
      };
    } else if (["point", "multipolygon", "line"].includes(type)) {
      const defaultLabel =
        type === "point"
          ? "Point"
          : type === "multipolygon"
          ? "MultiPolygon"
          : "Line";
      const samplePlaceholder =
        type === "point"
          ? '{"type": "Point", "coordinates": [77.5946, 12.9716]}'
          : type === "line"
          ? '{"type": "LineString", "coordinates": [[77.59, 12.97], [77.60, 12.98]]}'
          : '{"type": "MultiPolygon", "coordinates": [...]}';
      newField = {
        id: `${Date.now()}_${id}`,
        type,
        type_name: defaultLabel,
        label: defaultLabel,
        db_field: type,
        data_type: "json",
        ui: {
          placeholder: samplePlaceholder,
        },
        messages: {
          required: "This field is required",
        },
        required: false,
        validation: {},
      };
    }
    setFields((prev) => [...prev, newField]);
    setActiveId(newField.id);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over) return;

    setFields((prev) => {
      const oldIndex = prev.findIndex((f) => f.id === active.id);
      const newIndex = prev.findIndex((f) => f.id === over.id);

      if (oldIndex === -1 || newIndex === -1) return prev;

      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const updateField = (key, value) => {
    setFields((prev) => {
      const updated = [...prev];
      const field = { ...updated[activeIndex] }; // avoid mutation
      field[key] = value;
      updated[activeIndex] = field;
      return updated;
    });
  };
  const updateNested = (parent, key, value) => {
    setFields((prev) => {
      const updated = [...prev];

      const field = { ...updated[activeIndex] };
      field[parent] = {
        ...(field[parent] || {}),
        [key]: value,
      };

      updated[activeIndex] = field;

      return updated;
    });
  };

  const removeField = (id) => {
    setFields((prev) => prev.filter((f) => f.id !== id));

    if (activeId === id) {
      setActiveId(null);
    }
  };

  useEffect(() => {
    onFieldsChange && onFieldsChange(fields);
  }, [fields]);

  return (
    <>
      <div className="flex gap-3 max-h-[80vh] overflow-y-auto overflow-x-hidden p-2">
        {Object.keys(activeSection || {}).length > 0 && (
          <>
            {/* LEFT */}
            <div className="w-1/4 bg-gray-50 p-3 rounded-xl overflow-y-auto">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
              />

              <div className="mt-3 space-y-3">
                {["Basic", "Advanced", "Layout & Content", "Geometry"].map((groupName) => {
                  const itemsInGroup = filteredTypes.filter(
                    (f) => (f.group || "Basic") === groupName
                  );
                  if (!itemsInGroup.length) return null;
                  return (
                    <div key={groupName}>
                      <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1 px-1">
                        {groupName}
                      </div>
                      {itemsInGroup.map((item) => (
                        <DraggableType key={item.type} item={item} />
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* CENTER */}
            <div
              className="w-1/4 bg-gray-100 p-3 rounded-xl border-2 border-dashed overflow-y-auto"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              {fields.length === 0 && (
                <div className="text-center text-gray-400 mt-20">
                  Drag fields here 👇
                </div>
              )}
              <DndContext
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
                modifiers={[restrictToVerticalAxis, restrictToParentElement]}
              >
                <SortableContext
                  items={fields.map((f) => f.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {fields.map((field, idx) => (
                    <SortableItem
                      key={field.id}
                      field={field}
                      activeId={activeId}
                      setActiveId={setActiveId}
                      removeField={removeField}
                      isDisabled={isDisabled}
                      hasError={Object.keys(getFieldErrors(errors, idx)).length > 0}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>

            {/* RIGHT */}
            <div className="w-2/4 bg-white p-4 rounded-xl shadow overflow-y-auto">
              {activeField ? (
                <FieldConfigRenderer
                  errors={getFieldErrors(errors, activeIndex)}
                  field={activeField}
                  activeField={activeField}
                  updateField={updateField}
                  updateNested={updateNested}
                  setFields={setFields}
                  allFormFields={allFormFields?.length ? allFormFields : fields}
                />
              ) : (
                <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-6 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                  <div className="w-14 h-14 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-2xl mb-3 shadow-sm">
                    🎨
                  </div>
                  <h4 className="font-semibold text-gray-800 text-base mb-1">
                    {activeSection?.section_label || "Elementor Section Inspector"}
                  </h4>
                  <p className="text-gray-500 text-xs max-w-xs mb-4">
                    Click any field in the middle canvas to edit its Elementor properties, column width span, validation, and parent-child dependencies.
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <span className="text-xs px-3 py-1 bg-white border border-slate-200 rounded-full text-purple-700 font-medium shadow-2xs">
                      Type: {activeSection?.type === "add_more" ? "Add-More Table" : "General Section"}
                    </span>
                    {activeSection?.type === "add_more" && (
                      <span className="text-xs px-3 py-1 bg-white border border-slate-200 rounded-full text-blue-700 font-medium shadow-2xs">
                        Layout: {activeSection?.display_mode || "table"}
                      </span>
                    )}
                    <span className="text-xs px-3 py-1 bg-white border border-slate-200 rounded-full text-emerald-700 font-medium shadow-2xs">
                      Total Fields: {fields.length}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
