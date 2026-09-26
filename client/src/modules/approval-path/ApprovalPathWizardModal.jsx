"use client";
// client/src/modules/approval-path/ApprovalPathWizardModal.jsx
// Ultra-Premium, Fully-Responsive Enterprise Studio: Normal Flow vs Multi-Level Matrix Flow

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Form, Modal, message } from "antd";
import {
  BASE_API,
  DEFAULT_SYSTEM_FORMS,
  normalizeFormList,
  decodeOp,
  extractFormFields,
  parseConditions,
  parseInitiators,
  parseSteps,
  parseRules,
  getRoleLabel,
  getRoleSlug,
} from "./utils/approvalPathHelpers";
import { privateHttpClient } from "@/services/api/httpClient";
import WizardHeader from "./components/wizard/WizardHeader";
import WizardFooter from "./components/wizard/WizardFooter";
import WizardStepGeneralInfo from "./components/wizard/WizardStepGeneralInfo";
import WizardStepApprovalChain from "./components/wizard/WizardStepApprovalChain";
import WizardStepPipelinePreview from "./components/wizard/WizardStepPipelinePreview";
import RuleDrawerModal from "./components/wizard/RuleDrawerModal";
import "./approval-path.css";

const ApprovalPathWizardModal = ({
  open,
  onClose,
  onSuccess,
  initialWorkflow = null,
  roles = [],
  formList = [],
}) => {
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm();
  const [ruleDrawerForm] = Form.useForm();

  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [workflowNameValue, setWorkflowNameValue] = useState("");
  const [selectedFormSlug, setSelectedFormSlug] = useState(null);
  const [currentFormFields, setCurrentFormFields] = useState([]);
  const [fieldsLoading, setFieldsLoading] = useState(false);

  const [flowType, setFlowType] = useState("normal");
  const [applyConditions, setApplyConditions] = useState(false);
  const [matrixRules, setMatrixRules] = useState([]);
  const [ruleDrawerOpen, setRuleDrawerOpen] = useState(false);
  const [editingRuleIndex, setEditingRuleIndex] = useState(null);

  const [displayFormList, setDisplayFormList] = useState(() => normalizeFormList(formList));
  const [formsLoading, setFormsLoading] = useState(false);
  const [masterOptionsMap, setMasterOptionsMap] = useState({});

  const isEditing = Boolean(initialWorkflow);

  const loadFormOptions = useCallback(async () => {
    if (formList && formList.length > 0) {
      setDisplayFormList(normalizeFormList(formList));
      return;
    }
    setFormsLoading(true);
    try {
      const res = await privateHttpClient.get("configurator/form-schemas?limit=200");
      const raw = Array.isArray(res?.data?.data)
        ? res.data.data
        : Array.isArray(res?.data?.rows)
        ? res.data.rows
        : Array.isArray(res?.data)
        ? res.data
        : [];
      if (raw.length > 0) {
        setDisplayFormList(normalizeFormList(raw));
      } else {
        const res2 = await privateHttpClient
          .get("configurator/form-schemas/masters")
          .catch(() => null);
        const raw2 = Array.isArray(res2?.data?.data) ? res2.data.data : [];
        setDisplayFormList(normalizeFormList(raw2));
      }
    } catch (e) {
      console.warn("Form schema fetch error:", e.message);
      setDisplayFormList(DEFAULT_SYSTEM_FORMS);
    } finally {
      setFormsLoading(false);
    }
  }, [formList]);

  useEffect(() => {
    loadFormOptions();
  }, [loadFormOptions]);

  const formSelectOptions = useMemo(() => {
    return normalizeFormList(displayFormList);
  }, [displayFormList]);

  const uniqueRolesCount = useMemo(() => {
    const roleSet = new Set();
    if (flowType === "multi_level") {
      matrixRules.forEach((r) => {
        (r.initiator_roles || []).forEach((rid) => roleSet.add(String(rid)));
        (r.steps || []).forEach((s) => roleSet.add(String(s.role_id || s.role)));
      });
    } else {
      const inits = form.getFieldValue("normal_initiator_roles") || [];
      const stps = form.getFieldValue("normal_steps") || [];
      inits.forEach((rid) => roleSet.add(String(rid)));
      stps.forEach((s) => roleSet.add(String(s.role_id || s.role)));
    }
    return roleSet.size;
  }, [flowType, matrixRules, form]);

  const maxStepsCount = useMemo(() => {
    if (flowType === "multi_level") {
      return matrixRules.reduce((max, r) => Math.max(max, (r.steps || []).length), 0);
    }
    return (form.getFieldValue("normal_steps") || []).length;
  }, [flowType, matrixRules, form]);

  const getDynamicLevelColumns = useCallback(
    (maxLevels = 5) => {
      const totalCols = Math.max(3, maxLevels);
      return Array.from({ length: totalCols }, (_, idx) => {
        const levelNum = idx + 1;
        const suffix = levelNum === 1 ? "st" : levelNum === 2 ? "nd" : levelNum === 3 ? "rd" : "th";
        const title = `${levelNum}${suffix} Level`;

        return {
          title: (
            <div style={{ textAlign: "center", fontWeight: 800, color: "#1e293b", fontSize: "13px" }}>
              {title}
            </div>
          ),
          key: `level_col_${levelNum}`,
          width: 150,
          align: "center",
          render: (_, record) => {
            const step = (record.steps || [])[idx];
            if (!step) {
              return <span style={{ color: "#94a3b8", fontSize: "14px" }}>—</span>;
            }
            const roleLabel = step.role_name || getRoleLabel(step.role_id || step.role, roles);

            return (
              <div style={{ display: "flex", justifyContent: "center" }}>
                <span style={{ fontWeight: 700, color: "#1e293b", fontSize: "13px" }}>
                  {roleLabel}
                </span>
              </div>
            );
          },
        };
      });
    },
    [roles]
  );

  const fetchMasterOptions = useCallback(async (masterKey) => {
    if (!masterKey) return;
    try {
      const res = await privateHttpClient.post("dynamic-form/master-details", {
        master: masterKey,
      });
      const rawData = res?.data?.data || [];
      const opts = rawData.map((item) => ({
        label: item.label || item.name || item.title || String(item.value || item.id),
        value: String(item.value !== undefined ? item.value : item.id),
      }));
      setMasterOptionsMap((prev) => ({ ...prev, [masterKey]: opts }));
    } catch (e) {
      console.warn("Could not fetch master options for:", masterKey, e.message);
    }
  }, []);

  const fetchFieldsForForm = useCallback(
    async (slug) => {
      if (!slug) {
        setCurrentFormFields([]);
        return;
      }
      setFieldsLoading(true);
      try {
        let formData = null;

        try {
          const res1 = await privateHttpClient.post("dynamic-form/schema-details", {
            form_slug: slug,
          });
          if (res1?.data?.data) formData = res1.data.data;
        } catch (e) {
          console.warn("dynamic-form/schema-details attempt:", e.message);
        }

        if (!formData) {
          try {
            const res2 = await privateHttpClient.get(`forms/schema/${slug}`);
            if (res2?.data?.data) formData = res2.data.data;
          } catch (e) {
            console.warn("forms/schema attempt:", e.message);
          }
        }

        if (!formData && formList?.length > 0) {
          const matchedForm = formList.find(
            (f) => f.slug === slug || f.value === slug || String(f.id) === String(slug)
          );
          if (matchedForm?.id) {
            try {
              const res3 = await privateHttpClient.get(
                `configurator/form-schemas/${matchedForm.id}`
              );
              if (res3?.data?.data) formData = res3.data.data;
            } catch (e) {}
          }
        }

        const fields = extractFormFields(formData || {});
        setCurrentFormFields(fields);
        fields.forEach((f) => {
          if (f.master) fetchMasterOptions(f.master);
        });
      } catch (e) {
        console.warn("Could not load form schema for slug:", slug, e.message);
        setCurrentFormFields([]);
      } finally {
        setFieldsLoading(false);
      }
    },
    [fetchMasterOptions, formList]
  );

  useEffect(() => {
    if (open) {
      if (initialWorkflow) {
        const name = initialWorkflow.wdf_name || initialWorkflow.name || "";
        const triggerForm =
          initialWorkflow.wdf_trigger_form || initialWorkflow.trigger_form || null;
        const initialFlowType =
          initialWorkflow.flow_type ||
          (initialWorkflow.has_conditions ? "multi_level" : "normal");
        const hasConds = Boolean(
          initialWorkflow.has_conditions || initialFlowType === "multi_level"
        );

        setWorkflowNameValue(name);
        setSelectedFormSlug(triggerForm);
        setFlowType(initialFlowType);
        setApplyConditions(hasConds);

        const parsedRules = parseRules(initialWorkflow, roles);
        setMatrixRules(parsedRules);

        const firstRule = parsedRules[0] || {};
        const normalInits =
          firstRule.initiator_roles || parseInitiators(initialWorkflow, roles);
        const normalSteps =
          firstRule.steps && firstRule.steps.length > 0
            ? firstRule.steps
            : parseSteps(initialWorkflow, roles);

        form.setFieldsValue({
          name,
          trigger_form: triggerForm,
          flow_type: initialFlowType,
          has_conditions: hasConds,
          is_active:
            initialWorkflow.wdf_is_active !== undefined
              ? initialWorkflow.wdf_is_active
              : initialWorkflow.is_active !== undefined
              ? initialWorkflow.is_active
              : true,
          normal_initiator_roles: normalInits,
          normal_steps:
            normalSteps.length > 0
              ? normalSteps
              : [
                  {
                    level: 1,
                    step: 1,
                    role_id: roles[0]?.id || null,
                    actions: ["approve", "reject"],
                    label: "Stage Level 1 Review",
                  },
                ],
        });

        if (triggerForm) fetchFieldsForForm(triggerForm);
      } else {
        setWorkflowNameValue("");
        setSelectedFormSlug(null);
        setFlowType("normal");
        setApplyConditions(false);
        setMatrixRules([]);

        form.resetFields();
        form.setFieldsValue({
          name: "",
          trigger_form: null,
          flow_type: "normal",
          has_conditions: false,
          is_active: true,
          normal_initiator_roles: [],
          normal_steps: [
            {
              level: 1,
              step: 1,
              role_id: roles[0]?.id || null,
              actions: ["approve", "reject"],
              label: "Stage Level 1 Review",
            },
          ],
        });
      }
      setCurrentStep(0);
    }
  }, [open, initialWorkflow, roles, form, fetchFieldsForForm]);

  const handleFlowTypeToggle = (type) => {
    setFlowType(type);
    const isMulti = type === "multi_level";
    setApplyConditions(isMulti);
    form.setFieldsValue({ flow_type: type, has_conditions: isMulti });

    if (isMulti && matrixRules.length === 0) {
      const currentNormalInits = form.getFieldValue("normal_initiator_roles") || [];
      const currentNormalSteps = form.getFieldValue("normal_steps") || [];
      setMatrixRules([
        {
          id: `rule_seed_${Date.now()}`,
          rule_name: "Rule Tier 1 (e.g. 0 to 20,00,000)",
          conditions: [
            {
              logic: "Where",
              field: currentFormFields[0]?.value || "location",
              operator: "=",
              value: "",
              value_label: "",
            },
          ],
          initiator_roles: currentNormalInits,
          steps:
            currentNormalSteps.length > 0
              ? currentNormalSteps
              : [
                  {
                    level: 1,
                    step: 1,
                    role_id: roles[0]?.id || null,
                    actions: ["approve", "reject"],
                    label: "1st Level Review",
                  },
                ],
          order_index: 0,
          is_active: true,
        },
      ]);
    }
  };

  const handleOpenRuleDrawer = (ruleIndex = null) => {
    setEditingRuleIndex(ruleIndex);
    const triggerSlug = selectedFormSlug || form.getFieldValue("trigger_form");
    if (triggerSlug && currentFormFields.length === 0) {
      fetchFieldsForForm(triggerSlug);
    }
    if (ruleIndex !== null && matrixRules[ruleIndex]) {
      const rule = matrixRules[ruleIndex];
      ruleDrawerForm.setFieldsValue({
        rule_name: rule.rule_name || `Matrix Rule ${ruleIndex + 1}`,
        initiator_roles: parseInitiators(rule, roles),
        conditions:
          rule.conditions && rule.conditions.length > 0
            ? rule.conditions
            : [
                {
                  logic: "Where",
                  field: currentFormFields[0]?.value || "location",
                  operator: "=",
                  value: "",
                  value_label: "",
                },
              ],
        steps:
          rule.steps && rule.steps.length > 0
            ? rule.steps
            : [
                {
                  level: 1,
                  step: 1,
                  role_id: roles[0]?.id || null,
                  actions: ["approve", "reject"],
                  label: "1st Level Review",
                },
              ],
        is_active: rule.is_active !== undefined ? rule.is_active : true,
      });
    } else {
      ruleDrawerForm.resetFields();
      ruleDrawerForm.setFieldsValue({
        rule_name: `Matrix Rule ${matrixRules.length + 1}`,
        initiator_roles: [],
        conditions: [
          {
            logic: "Where",
            field: currentFormFields[0]?.value || "location",
            operator: "=",
            value: "",
            value_label: "",
          },
        ],
        steps: [
          {
            level: 1,
            step: 1,
            role_id: roles[0]?.id || null,
            actions: ["approve", "reject"],
            label: "1st Level Review",
          },
          {
            level: 2,
            step: 2,
            role_id: roles[1]?.id || null,
            actions: ["approve", "reject"],
            label: "2nd Level Review",
          },
        ],
        is_active: true,
      });
    }
    setRuleDrawerOpen(true);
  };

  const handleSaveRuleFromDrawer = async () => {
    try {
      const values = await ruleDrawerForm.validateFields();
      const sanitizedRule = {
        rule_name:
          values.rule_name || `Matrix Rule ${(editingRuleIndex ?? matrixRules.length) + 1}`,
        initiator_roles: values.initiator_roles || [],
        conditions: (values.conditions || [])
          .filter((c) => c.field && String(c.field).trim() !== "")
          .map((c) => {
            let val = c.value;
            let valLabel = c.value_label || "";
            if (Array.isArray(val)) {
              val = val.join(",");
            }
            return {
              ...c,
              operator: decodeOp(c.operator),
              value: val !== undefined && val !== null ? val : "",
              value_label: valLabel,
            };
          }),
        steps: (values.steps || []).map((s, idx) => ({
          ...s,
          level: idx + 1,
          step: idx + 1,
          role_name: getRoleLabel(s.role_id, roles),
          role: getRoleSlug(s.role_id, roles),
        })),
        order_index: editingRuleIndex !== null ? editingRuleIndex : matrixRules.length,
        is_active: values.is_active !== undefined ? values.is_active : true,
      };

      if (editingRuleIndex !== null) {
        setMatrixRules((prev) => {
          const updated = [...prev];
          updated[editingRuleIndex] = sanitizedRule;
          return updated;
        });
      } else {
        setMatrixRules((prev) => [...prev, sanitizedRule]);
      }

      setRuleDrawerOpen(false);
      messageApi.success("Matrix rule saved to workflow architecture");
    } catch (e) {
      console.warn("Validation error on rule drawer:", e);
    }
  };

  const handleDeleteMatrixRule = (index) => {
    setMatrixRules((prev) => prev.filter((_, i) => i !== index));
    messageApi.info("Matrix rule removed");
  };

  const handleCloneMatrixRule = (index) => {
    const source = matrixRules[index];
    if (!source) return;
    const cloned = {
      ...source,
      id: `clone_${Date.now()}`,
      rule_name: `${source.rule_name} (Copy)`,
      order_index: matrixRules.length,
    };
    setMatrixRules((prev) => [...prev, cloned]);
    messageApi.success("Matrix rule duplicated");
  };

  const handleSaveWorkflow = async (asDraft = false) => {
    try {
      const allVals = form.getFieldsValue(true) || {};
      const wName = (allVals.name || workflowNameValue || "").trim();
      if (!wName) {
        messageApi.error("Workflow Name is required (Step 1).");
        setCurrentStep(0);
        return;
      }
      const tForm = allVals.trigger_form || selectedFormSlug;
      if (!tForm) {
        messageApi.error("Trigger Form is required (Step 1).");
        setCurrentStep(0);
        return;
      }

      const isMulti = flowType === "multi_level" || applyConditions;
      let payloadRules = [];

      if (isMulti) {
        if (matrixRules.length === 0) {
          messageApi.error("Multi-Level Matrix mode requires at least one matrix rule branch.");
          setCurrentStep(1);
          return;
        }
        payloadRules = matrixRules.map((r, rIdx) => ({
          rule_name: r.rule_name || `Rule Tier ${rIdx + 1}`,
          conditions: (r.conditions || []).map((c) => ({
            ...c,
            operator: decodeOp(c.operator),
            value: Array.isArray(c.value) ? c.value.join(",") : c.value,
          })),
          initiator_roles: (r.initiator_roles || []).map((id) =>
            !isNaN(Number(id)) ? Number(id) : id
          ),
          steps: (r.steps || []).map((s, sIdx) => ({
            level: s.level || sIdx + 1,
            step: s.step || sIdx + 1,
            role_id: !isNaN(Number(s.role_id)) ? Number(s.role_id) : s.role_id,
            role: getRoleSlug(s.role_id || s.role, roles),
            role_name: s.role_name || getRoleLabel(s.role_id || s.role, roles),
            actions:
              Array.isArray(s.actions) && s.actions.length > 0
                ? s.actions
                : [s.action || "approve"],
            label: s.label || `Level ${sIdx + 1} Review`,
            reject_to_step: s.reject_to_step !== undefined ? s.reject_to_step : "0",
          })),
          order_index: r.order_index !== undefined ? r.order_index : rIdx,
          is_active: r.is_active !== undefined ? r.is_active : true,
        }));
      } else {
        const nSteps = allVals.normal_steps || [];
        if (nSteps.length === 0) {
          messageApi.error("At least 1 approval step is required.");
          setCurrentStep(1);
          return;
        }
        payloadRules = [
          {
            rule_name: "Default Sequential Path",
            conditions: [],
            initiator_roles: (allVals.normal_initiator_roles || []).map((id) =>
              !isNaN(Number(id)) ? Number(id) : id
            ),
            steps: nSteps.map((s, sIdx) => ({
              level: sIdx + 1,
              step: sIdx + 1,
              role_id: !isNaN(Number(s.role_id)) ? Number(s.role_id) : s.role_id,
              role: getRoleSlug(s.role_id || s.role, roles),
              role_name: getRoleLabel(s.role_id || s.role, roles),
              actions:
                Array.isArray(s.actions) && s.actions.length > 0
                  ? s.actions
                  : [s.action || "approve"],
              label: s.label || `Stage Level ${sIdx + 1} Review`,
              reject_to_step: s.reject_to_step !== undefined ? s.reject_to_step : "0",
            })),
            order_index: 0,
            is_active: true,
          },
        ];
      }

      const primaryRule = payloadRules[0] || {};
      const payload = {
        name: wName,
        trigger_form: tForm,
        flow_type: isMulti ? "multi_level" : "normal",
        has_conditions: isMulti,
        is_active: asDraft ? false : allVals.is_active !== undefined ? allVals.is_active : true,
        is_draft: asDraft,
        initiator_roles: primaryRule.initiator_roles || [],
        conditions: primaryRule.conditions || [],
        steps: primaryRule.steps || [],
        rules: payloadRules,
      };

      setSaving(true);
      if (isEditing) {
        const id = initialWorkflow.wdf_id || initialWorkflow.id;
        await privateHttpClient.put(`${BASE_API}/${id}`, payload);
        messageApi.success("Approval path updated successfully");
      } else {
        await privateHttpClient.post(`${BASE_API}`, payload);
        messageApi.success("Approval path created successfully");
      }

      onSuccess();
    } catch (err) {
      console.error("Save workflow error:", err);
      messageApi.error(err?.response?.data?.message || "Failed to save approval path");
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    if (currentStep === 0) {
      try {
        await form.validateFields(["name", "trigger_form"]);
        setCurrentStep(1);
      } catch {
        messageApi.error("Please fill required fields in Step 1.");
      }
    } else if (currentStep === 1) {
      if (flowType === "multi_level") {
        if (matrixRules.length === 0) {
          messageApi.error("Please configure at least one matrix rule.");
          return;
        }
        setCurrentStep(2);
      } else {
        try {
          await form.validateFields(["normal_steps"]);
          setCurrentStep(2);
        } catch {
          messageApi.error("Please configure approver roles for all steps.");
        }
      }
    }
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  };

  return (
    <Modal
      forceRender
      open={open}
      onCancel={onClose}
      footer={null}
      closable={false}
      wrapClassName="approval-wizard-fullscreen-modal"
      width="100vw"
      style={{ top: 0, padding: 0 }}
      destroyOnHidden
    >
      {contextHolder}

      <div className="approval-studio-layout">
        {/* Top Header with Stepper in Top Right */}
        <WizardHeader
          workflowName={workflowNameValue}
          isEditing={isEditing}
          flowType={flowType}
          selectedFormSlug={selectedFormSlug}
          currentStep={currentStep}
          onStepClick={(step) => setCurrentStep(step)}
          onClose={onClose}
        />

        {/* Scrollable Workspace */}
        <div className="approval-studio-body">
          <Form
            form={form}
            layout="vertical"
            preserve={true}
            initialValues={{
              flow_type: "normal",
              is_active: true,
              normal_steps: [
                {
                  level: 1,
                  step: 1,
                  role_id: roles[0]?.id || null,
                  actions: ["approve", "reject"],
                  label: "Stage Level 1 Review",
                },
              ],
            }}
          >
            {/* Step 0: Setup */}
            {currentStep === 0 && (
              <WizardStepGeneralInfo
                workflowNameValue={workflowNameValue}
                onNameChange={setWorkflowNameValue}
                formSelectOptions={formSelectOptions}
                formsLoading={formsLoading}
                loadFormOptions={loadFormOptions}
                onFormSelect={(slug) => {
                  setSelectedFormSlug(slug);
                  fetchFieldsForForm(slug);
                }}
                flowType={flowType}
                onFlowTypeToggle={handleFlowTypeToggle}
                applyConditions={applyConditions}
              />
            )}

            {/* Step 1: Approval Architecture (Normal or Matrix) */}
            {currentStep === 1 && (
              <WizardStepApprovalChain
                flowType={flowType}
                roles={roles}
                matrixRules={matrixRules}
                onOpenRuleDrawer={handleOpenRuleDrawer}
                onCloneRule={handleCloneMatrixRule}
                onDeleteRule={handleDeleteMatrixRule}
                dynamicLevelColumns={getDynamicLevelColumns(maxStepsCount)}
              />
            )}

            {/* Step 2: Verification & Preview */}
            {currentStep === 2 && (
              <WizardStepPipelinePreview
                workflowNameValue={workflowNameValue}
                isEditing={isEditing}
                initialWorkflow={initialWorkflow}
                selectedFormSlug={selectedFormSlug}
                flowType={flowType}
                matrixRules={matrixRules}
                roles={roles}
                uniqueRolesCount={uniqueRolesCount}
                maxStepsCount={maxStepsCount}
                dynamicLevelColumns={getDynamicLevelColumns(maxStepsCount)}
                form={form}
              />
            )}
          </Form>
        </div>

        {/* Studio Footer */}
        <WizardFooter
          currentStep={currentStep}
          onPrev={handlePrev}
          onNext={handleNext}
          onSaveDraft={() => handleSaveWorkflow(true)}
          onPublish={() => handleSaveWorkflow(false)}
          saving={saving}
        />

        {/* Matrix Rule Configuration Drawer */}
        <RuleDrawerModal
          open={ruleDrawerOpen}
          onClose={() => setRuleDrawerOpen(false)}
          form={ruleDrawerForm}
          editingIndex={editingRuleIndex}
          onSave={handleSaveRuleFromDrawer}
          roles={roles}
          currentFormFields={currentFormFields}
          fieldsLoading={fieldsLoading}
          masterOptionsMap={masterOptionsMap}
          fetchMasterOptions={fetchMasterOptions}
        />
      </div>
    </Modal>
  );
};

export default ApprovalPathWizardModal;
