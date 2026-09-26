import { Input, Select } from "antd";

const { TextArea } = Input;

export default function NoteFieldConfig({ field, updateField }) {
  return (
    <div className="space-y-4">
      <div className="border-b pb-2 mb-3">
        <h3 className="font-semibold text-gray-800 text-base flex items-center gap-2">
          <span>📌</span> Instructional Note / Callout
        </h3>
        <p className="text-xs text-gray-500">
          Display guidance notes, warnings, or instructions to users filling out the form.
        </p>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Note Title / Label (Optional)
        </label>
        <Input
          value={field.label || ""}
          onChange={(e) => updateField("label", e.target.value)}
          placeholder="e.g., Important Notice"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Note Message / Instructions <span className="text-red-500">*</span>
        </label>
        <TextArea
          rows={3}
          value={field.content || ""}
          onChange={(e) => updateField("content", e.target.value)}
          placeholder="Enter instructional message for the user..."
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Callout Style / Banner Type
        </label>
        <Select
          style={{ width: "100%" }}
          value={field.note_type || "info"}
          onChange={(val) => updateField("note_type", val)}
          options={[
            { label: "ℹ️ Info Callout (Blue)", value: "info" },
            { label: "⚠️ Warning Banner (Yellow)", value: "warning" },
            { label: "✅ Success Banner (Green)", value: "success" },
            { label: "🚨 Alert / Error Banner (Red)", value: "error" },
            { label: "📄 Plain Text Note", value: "neutral" },
          ]}
        />
      </div>
    </div>
  );
}
