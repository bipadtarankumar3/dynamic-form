import { Input } from "antd";

const { TextArea } = Input;

export default function CustomHtmlConfig({ field, updateField }) {
  return (
    <div className="space-y-4">
      <div className="border-b pb-2 mb-3">
        <h3 className="font-semibold text-gray-800 text-base flex items-center gap-2">
          <span>💻</span> Custom HTML Element
        </h3>
        <p className="text-xs text-gray-500">
          Inject custom HTML content, text blocks, or custom embedded components into the form.
        </p>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Element Label / Internal Title
        </label>
        <Input
          value={field.label || ""}
          onChange={(e) => updateField("label", e.target.value)}
          placeholder="e.g., Terms Notice or Custom Banner"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          HTML Code Content
        </label>
        <TextArea
          rows={6}
          value={field.html_content || ""}
          onChange={(e) => updateField("html_content", e.target.value)}
          placeholder="<div className='p-3 bg-blue-50 border border-blue-200 rounded'>...</div>"
          className="font-mono text-xs"
        />
        <p className="text-[11px] text-gray-400 mt-1">
          Write raw HTML code or text to display directly on the form section.
        </p>
      </div>
    </div>
  );
}
