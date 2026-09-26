import { Input, Switch, Tabs, Tag } from "antd";
import FieldConfigLayout from "../FieldConfigLayout";
import EncryptionValidationConfig from "./EncryptionValidationConfig";
import "./css/FieldConfig.css";

export default function GeometryFieldConfig({
  activeField,
  updateField,
  updateNested,
  errors,
}) {
  const getIcon = (type) => {
    if (type === "point") return "📍";
    if (type === "multipolygon") return "⬡";
    if (type === "line") return "📈";
    return "🌐";
  };

  const getTypeName = (type) => {
    if (type === "point") return "Point";
    if (type === "multipolygon") return "MultiPolygon";
    if (type === "line") return "Line";
    return "Geometry";
  };

  const getSampleGeoJson = (type) => {
    if (type === "point") {
      return JSON.stringify({ type: "Point", coordinates: [77.5946, 12.9716] }, null, 2);
    }
    if (type === "line") {
      return JSON.stringify(
        {
          type: "LineString",
          coordinates: [
            [77.5946, 12.9716],
            [77.6046, 12.9816],
          ],
        },
        null,
        2
      );
    }
    if (type === "multipolygon") {
      return JSON.stringify(
        {
          type: "MultiPolygon",
          coordinates: [
            [
              [
                [77.59, 12.97],
                [77.60, 12.97],
                [77.60, 12.98],
                [77.59, 12.98],
                [77.59, 12.97],
              ],
            ],
          ],
        },
        null,
        2
      );
    }
    return "";
  };

  const handleLabel = (val) => {
    const currentLabel = activeField?.label || "";
    const currentDb = activeField?.db_field || "";
    const expectedDbFromOldLabel = currentLabel
      ?.toLowerCase()
      ?.replace(/\s+/g, "_")
      ?.replace(/[^a-z0-9_]/g, "");

    updateField("label", val);

    if (!currentDb || currentDb === expectedDbFromOldLabel) {
      const newDb = val
        ?.toLowerCase()
        ?.replace(/\s+/g, "_")
        ?.replace(/[^a-z0-9_]/g, "");
      updateField("db_field", newDb);
    }
  };

  const handleDbField = (val) => {
    const db = val
      ?.toLowerCase()
      ?.replace(/\s+/g, "_")
      ?.replace(/[^a-z0-9_]/g, "");
    updateField("db_field", db);
  };

  const fieldType = activeField?.type || "point";

  return (
    <FieldConfigLayout>
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-xl">{getIcon(fieldType)}</span>
          <div>
            <h3 className="font-semibold text-gray-800 text-sm m-0 flex items-center gap-2">
              {getTypeName(fieldType)} Geometry Field
              <Tag color="purple" className="font-mono text-[10px]">
                JSON
              </Tag>
            </h3>
            <p className="text-xs text-gray-500 m-0">
              Geometry field storing spatial coordinates as JSON / GeoJSON in the database.
            </p>
          </div>
        </div>
      </div>

      <Tabs
        defaultActiveKey="basic"
        className="tfc-tabs"
        items={[
          {
            key: "basic",
            label: "Basic",
            children: (
              <div className="tfc-basic-grid">
                <div className="tfc-field">
                  <label className="tfc-label">Label / Name</label>
                  <Input
                    value={activeField?.label || ""}
                    onChange={(e) => handleLabel(e.target.value)}
                    placeholder={`e.g. ${getTypeName(fieldType)} Location`}
                  />
                  {errors?.label && (
                    <div className="error text-danger">{errors?.label}</div>
                  )}
                </div>

                <div className="tfc-field">
                  <label className="tfc-label">
                    DB Field
                    <span className="tfc-badge">editable</span>
                  </label>
                  <Input
                    className="tfc-input tfc-input--mono"
                    value={activeField?.db_field || ""}
                    onChange={(e) => handleDbField(e.target.value)}
                    placeholder="e.g. location_point"
                  />
                  {errors?.db_field && (
                    <div className="error text-danger">{errors?.db_field}</div>
                  )}
                </div>

                <div className="tfc-field">
                  <label className="tfc-label">Data Storage Type</label>
                  <Input
                    className="tfc-input tfc-input--mono bg-gray-50"
                    value="json"
                    disabled
                  />
                </div>

                <div className="tfc-field">
                  <label className="tfc-label">Geometry Type</label>
                  <Input
                    className="tfc-input tfc-input--mono bg-gray-50 capitalize"
                    value={fieldType}
                    disabled
                  />
                </div>

                <div className="tfc-field tfc-field--full">
                  <label className="tfc-label">Placeholder Text</label>
                  <Input
                    value={activeField?.ui?.placeholder || ""}
                    onChange={(e) =>
                      updateNested("ui", "placeholder", e.target.value)
                    }
                    placeholder="e.g. Enter GeoJSON coordinates..."
                  />
                  {errors?.[`ui.placeholder`] && (
                    <div className="error text-danger">
                      {errors[`ui.placeholder`]}
                    </div>
                  )}
                </div>

                <div className="tfc-field tfc-field--full">
                  <label className="tfc-label">Validation & Requirements</label>
                  <div className="flex items-center gap-3 mt-1">
                    <Switch
                      checked={activeField?.required || false}
                      onChange={(checked) => updateField("required", checked)}
                    />
                    <span className="text-xs text-gray-700">Required Field</span>
                  </div>
                </div>

                <div className="tfc-field tfc-field--full">
                  <label className="tfc-label">Expected GeoJSON Sample Format</label>
                  <pre className="text-xs bg-slate-950 text-emerald-400 p-3 rounded-lg font-mono overflow-auto max-h-40 border border-slate-800 m-0">
                    {getSampleGeoJson(fieldType)}
                  </pre>
                  <p className="text-[11px] text-gray-500 mt-1">
                    When submitted in forms, this field will be stored as JSON format.
                  </p>
                </div>
              </div>
            ),
          },
          {
            key: "security",
            label: "Security & Encryption",
            children: (
              <EncryptionValidationConfig
                activeField={activeField}
                updateNested={updateNested}
              />
            ),
          },
        ]}
      />
    </FieldConfigLayout>
  );
}
