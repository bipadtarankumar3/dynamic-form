import React from "react";
import { Input, Select, Form, Row, Col } from "antd";
import * as yup from "yup";
import "../../database-views.css";

export const step1ValidationSchema = yup.object().shape({
  view_name: yup
    .string()
    .trim()
    .required("View Name is required")
    .min(2, "View Name must be at least 2 characters"),
  database_view_name: yup
    .string()
    .trim()
    .required("View Code (Slug) is required")
    .matches(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "View Code can only contain letters, numbers, and underscores"),
  base_table: yup
    .string()
    .trim()
    .required("Please select a Base Table"),
});

export default function Step1SelectTable({
  viewInfo,
  setViewInfo,
  tablesList,
  selectedBaseTable,
  setSelectedBaseTable,
  errors = {},
  setErrors = () => {},
}) {
  const handleFieldChange = async (fieldName, value, updatedObj) => {
    try {
      await step1ValidationSchema.validateAt(fieldName, { ...viewInfo, base_table: selectedBaseTable, ...updatedObj, [fieldName]: value });
      setErrors((prev) => ({ ...prev, [fieldName]: undefined }));
    } catch (err) {
      setErrors((prev) => ({ ...prev, [fieldName]: err.message }));
    }
  };

  return (
    <div className="db-step-wrapper">
      <div className="db-step-header-box">
        <h3 className="db-step-title">Create View</h3>
        <p className="db-step-subtitle">
          Define the base table and metadata for your database view
        </p>
      </div>

      <Form layout="vertical">
        <Row gutter={[24, 16]}>
          {/* Row 1: View Name & View Code (Slug) */}
          <Col xs={24} sm={24} md={12} lg={12}>
            <Form.Item
              label={<span className="db-form-label">View Name *</span>}
              validateStatus={errors.view_name ? "error" : ""}
              help={
                errors.view_name ? (
                  <span style={{ color: "#ef4444", fontSize: "12px", fontWeight: 600, marginTop: "4px", display: "block" }}>
                    ⚠️ {errors.view_name}
                  </span>
                ) : null
              }
            >
              <Input
                size="large"
                value={viewInfo.view_name}
                status={errors.view_name ? "error" : ""}
                onChange={(e) => {
                  const val = e.target.value;
                  const slug = "v_" + val.toLowerCase().replace(/[^a-z0-9_]+/g, "_");
                  setViewInfo({ ...viewInfo, view_name: val, database_view_name: slug });
                  handleFieldChange("view_name", val, { view_name: val, database_view_name: slug });
                }}
                placeholder="e.g. Monitoring Details View"
                className="db-input-radius"
              />
            </Form.Item>
          </Col>

          <Col xs={24} sm={24} md={12} lg={12}>
            <Form.Item
              label={<span className="db-form-label">View Code (Slug) *</span>}
              validateStatus={errors.database_view_name ? "error" : ""}
              help={
                errors.database_view_name ? (
                  <span style={{ color: "#ef4444", fontSize: "12px", fontWeight: 600, marginTop: "4px", display: "block" }}>
                    ⚠️ {errors.database_view_name}
                  </span>
                ) : (
                  <span className="db-form-extra">PostgreSQL view: public.{viewInfo.database_view_name || 'v_view_name'}</span>
                )
              }
            >
              <Input
                size="large"
                value={viewInfo.database_view_name}
                status={errors.database_view_name ? "error" : ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setViewInfo({ ...viewInfo, database_view_name: val });
                  handleFieldChange("database_view_name", val, { database_view_name: val });
                }}
                placeholder="e.g. v_monitoring_details"
                className="db-input-radius"
              />
            </Form.Item>
          </Col>

          {/* Row 2: Base Table */}
          <Col xs={24} sm={24} md={24} lg={24}>
            <Form.Item
              label={<span className="db-form-label">Base Table (Main Table) *</span>}
              validateStatus={errors.base_table ? "error" : ""}
              help={
                errors.base_table ? (
                  <span style={{ color: "#ef4444", fontSize: "12px", fontWeight: 600, marginTop: "4px", display: "block" }}>
                    ⚠️ {errors.base_table}
                  </span>
                ) : (
                  <span className="db-form-extra">Select the primary table for this view</span>
                )
              }
            >
              <Select
                size="large"
                showSearch
                status={errors.base_table ? "error" : ""}
                placeholder="-- Select Base Table --"
                value={selectedBaseTable || undefined}
                onChange={(val) => {
                  setSelectedBaseTable(val);
                  handleFieldChange("base_table", val, { base_table: val });
                }}
                options={tablesList.map(t => ({
                  label: `${t.table_name} (${t.column_count} columns)`,
                  value: t.table_name
                }))}
                listHeight={320}
                styles={{ popup: { root: { maxHeight: 320, padding: 6, borderRadius: 10 } } }}
                className="db-input-radius"
              />
            </Form.Item>
          </Col>

          {/* Row 3: Description */}
          <Col xs={24} sm={24} md={24} lg={24}>
            <Form.Item label={<span className="db-form-label">Description</span>}>
              <Input.TextArea
                rows={2}
                value={viewInfo.description}
                onChange={(e) => setViewInfo({ ...viewInfo, description: e.target.value })}
                placeholder="Enter view description..."
                className="db-input-radius"
              />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </div>
  );
}
