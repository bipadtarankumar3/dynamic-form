import { Input, Select, Switch } from "antd";

export default function HeadingFieldConfig({ field, updateField }) {
  return (
    <div className="space-y-4">
      <div className="border-b pb-2 mb-3">
        <h3 className="font-semibold text-gray-800 text-base flex items-center gap-2">
          <span>🏷️</span> Section Header / Heading
        </h3>
        <p className="text-xs text-gray-500">
          Create headings, sub-headings, or structural division lines inside a section.
        </p>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Heading Text <span className="text-red-500">*</span>
        </label>
        <Input
          value={field.label || ""}
          onChange={(e) => updateField("label", e.target.value)}
          placeholder="e.g., Financial Information & Bank Details"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Subtext / Description (Optional)
        </label>
        <Input.TextArea
          rows={2}
          value={field.subtext || ""}
          onChange={(e) => updateField("subtext", e.target.value)}
          placeholder="e.g., Please enter all banking information accurately."
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Heading Size Level
          </label>
          <Select
            style={{ width: "100%" }}
            value={field.heading_level || "h3"}
            onChange={(val) => updateField("heading_level", val)}
            options={[
              { label: "H1 - Large Heading", value: "h1" },
              { label: "H2 - Medium Heading", value: "h2" },
              { label: "H3 - Standard Subheading", value: "h3" },
              { label: "H4 - Small Subheading", value: "h4" },
            ]}
          />
        </div>

        <div className="flex flex-col justify-center">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Show Divider Line
          </label>
          <Switch
            checked={field.show_divider !== false}
            onChange={(checked) => updateField("show_divider", checked)}
            checkedChildren="Yes"
            unCheckedChildren="No"
          />
        </div>
      </div>
    </div>
  );
}
