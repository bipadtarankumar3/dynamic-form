"use client";
import React, { useEffect } from "react";
import { Button, Col, Form, Input, InputNumber, Row, Select } from "antd";
import { MinusCircleOutlined } from "@ant-design/icons";
import { COMMON_MASTER_OPTIONS, OPERATORS } from "../../utils/approvalPathHelpers";

export const MatrixConditionClauseRow = ({
  name,
  restField,
  remove,
  canRemove,
  currentFormFields = [],
  fieldsLoading = false,
  masterOptionsMap = {},
  fetchMasterOptions,
  ruleDrawerForm,
}) => {
  const selectedFieldKey = Form.useWatch(["conditions", name, "field"], ruleDrawerForm);
  const selectedOperator =
    Form.useWatch(["conditions", name, "operator"], ruleDrawerForm) || "=";

  const fieldObj = currentFormFields.find(
    (f) => f.value === selectedFieldKey || f.name === selectedFieldKey
  );
  const normalizedKey = (selectedFieldKey || "").toLowerCase().trim();
  const masterKey =
    fieldObj?.master ||
    fieldObj?.dataSource?.master ||
    fieldObj?.data_source?.master ||
    fieldObj?.dataSource?.table ||
    fieldObj?.data_source?.table ||
    (COMMON_MASTER_OPTIONS[normalizedKey] ? normalizedKey : selectedFieldKey);

  useEffect(() => {
    if (masterKey && !masterOptionsMap[masterKey] && fetchMasterOptions) {
      fetchMasterOptions(masterKey);
    }
  }, [masterKey, masterOptionsMap, fetchMasterOptions]);

  const rawOpts =
    (masterKey && masterOptionsMap[masterKey]) ||
    (selectedFieldKey && masterOptionsMap[selectedFieldKey]) ||
    (normalizedKey && masterOptionsMap[normalizedKey]) ||
    COMMON_MASTER_OPTIONS[normalizedKey] ||
    (fieldObj?.options && fieldObj.options.length > 0 ? fieldObj.options : []);

  const fieldOptions = rawOpts.map((o) => {
    if (typeof o === "object") {
      return {
        label: o.label || o.name || o.title || String(o.value !== undefined ? o.value : o.id),
        value: String(o.value !== undefined ? o.value : o.id),
      };
    }
    return { label: String(o), value: String(o) };
  });

  const isUnary = selectedOperator === "is_empty" || selectedOperator === "is_not_empty";
  const isMulti = selectedOperator === "in";
  const hasDropdownOptions =
    fieldOptions.length > 0 ||
    fieldObj?.type === "select" ||
    fieldObj?.type === "dropdown" ||
    fieldObj?.type === "radio" ||
    fieldObj?.type === "master";

  return (
    <div className="matrix-condition-row">
      <Row gutter={10} align="middle">
        <Col xs={24} md={8}>
          <Form.Item
            {...restField}
            name={[name, "field"]}
            label={<span style={{ fontSize: "11px", fontWeight: 700, color: "#6b21a8" }}>Field</span>}
            rules={[{ required: true, message: "Field required" }]}
            style={{ marginBottom: 0 }}
          >
            <Select
              placeholder="Select form field"
              showSearch
              loading={fieldsLoading}
              optionFilterProp="label"
              onChange={(fVal) => {
                const conds = ruleDrawerForm.getFieldValue("conditions") || [];
                if (conds[name]) {
                  conds[name].value = isMulti ? [] : "";
                  conds[name].value_label = "";
                  ruleDrawerForm.setFieldsValue({ conditions: [...conds] });
                }
                const found = currentFormFields.find((f) => f.value === fVal || f.name === fVal);
                const mKey =
                  found?.master ||
                  found?.dataSource?.master ||
                  found?.data_source?.master ||
                  found?.dataSource?.table;
                if (mKey && fetchMasterOptions) fetchMasterOptions(mKey);
              }}
              options={
                currentFormFields.length > 0
                  ? currentFormFields.map((f) => ({
                      label: `${f.label || f.name} (${f.value})`,
                      value: f.value,
                    }))
                  : [
                      { label: "Location / SBU (location)", value: "location" },
                      { label: "Amount / PO Value (amount)", value: "amount" },
                      { label: "Department (department)", value: "department" },
                      { label: "Category (category)", value: "category" },
                    ]
              }
            />
          </Form.Item>
        </Col>

        <Col xs={24} md={6}>
          <Form.Item
            {...restField}
            name={[name, "operator"]}
            label={<span style={{ fontSize: "11px", fontWeight: 700, color: "#6b21a8" }}>Operator</span>}
            style={{ marginBottom: 0 }}
          >
            <Select
              options={OPERATORS}
              onChange={(nextOp) => {
                const conds = ruleDrawerForm.getFieldValue("conditions") || [];
                if (conds[name]) {
                  if (nextOp === "in" && !Array.isArray(conds[name].value)) {
                    conds[name].value = conds[name].value ? [conds[name].value] : [];
                  } else if (nextOp !== "in" && Array.isArray(conds[name].value)) {
                    conds[name].value = conds[name].value[0] || "";
                  }
                  ruleDrawerForm.setFieldsValue({ conditions: [...conds] });
                }
              }}
            />
          </Form.Item>
        </Col>

        <Col xs={20} md={8}>
          <Form.Item
            {...restField}
            name={[name, "value"]}
            label={
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#6b21a8" }}>
                Target Value {hasDropdownOptions ? "(Select Option)" : isMulti ? "(Multiple)" : ""}
              </span>
            }
            rules={[{ required: !isUnary, message: "Value required" }]}
            style={{ marginBottom: 0 }}
          >
            {isUnary ? (
              <Input
                disabled
                placeholder="Unary Check (No value needed)"
                style={{ borderRadius: 6 }}
              />
            ) : hasDropdownOptions ? (
              <Select
                mode={isMulti ? "multiple" : undefined}
                placeholder={isMulti ? "Select multiple options..." : "Select option..."}
                showSearch
                allowClear
                optionFilterProp="label"
                getPopupContainer={(trigger) => trigger.parentNode || document.body}
                options={
                  fieldOptions.length > 0
                    ? fieldOptions
                    : [
                        { label: "Option 1 (Default)", value: "option_1" },
                        { label: "Option 2", value: "option_2" },
                      ]
                }
                onChange={(val, opt) => {
                  const conds = ruleDrawerForm.getFieldValue("conditions") || [];
                  if (conds[name]) {
                    if (Array.isArray(opt)) {
                      conds[name].value_label = opt.map((o) => o.label || o.value).join(", ");
                    } else if (opt) {
                      conds[name].value_label = opt.label || String(val);
                    }
                    ruleDrawerForm.setFieldsValue({ conditions: [...conds] });
                  }
                }}
                style={{ borderRadius: 6 }}
              />
            ) : isMulti ? (
              <Select
                mode="tags"
                placeholder="Type values & press Enter..."
                style={{ borderRadius: 6 }}
              />
            ) : fieldObj?.type === "number" ||
              fieldObj?.type === "numeric" ||
              selectedFieldKey === "amount" ? (
              <InputNumber
                placeholder="e.g. 2000000"
                style={{ width: "100%", borderRadius: 6 }}
              />
            ) : (
              <Input
                placeholder="Value (e.g. Fertilizers or 2000000)"
                style={{ borderRadius: 6 }}
              />
            )}
          </Form.Item>
        </Col>

        <Col xs={4} md={2} style={{ textAlign: "center", paddingTop: 18 }}>
          {canRemove && (
            <Button
              type="text"
              danger
              icon={<MinusCircleOutlined />}
              onClick={() => remove(name)}
            />
          )}
        </Col>
      </Row>
    </div>
  );
};

export default MatrixConditionClauseRow;
