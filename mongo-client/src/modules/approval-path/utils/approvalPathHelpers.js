// client/src/modules/approval-path/utils/approvalPathHelpers.js

export const BASE_API = "approval-path";

export const STEP_ACTIONS = [
  { label: "Approve", value: "approve", color: "green", icon: "CheckCircleOutlined" },
  { label: "Reject", value: "reject", color: "red", icon: "CloseCircleOutlined" },
  { label: "Forward", value: "forward", color: "blue", icon: "SwapOutlined" },
  { label: "Resend / Request Info", value: "resend", color: "orange", icon: "UndoOutlined" },
  { label: "Pull Back", value: "pull_back", color: "gold", icon: "RollbackOutlined" },
  { label: "Review", value: "review", color: "purple", icon: "FileDoneOutlined" },
];

export const OPERATORS = [
  { label: "= (Equals)", value: "=" },
  { label: "!= (Not Equals)", value: "!=" },
  { label: "> (Greater Than)", value: ">" },
  { label: "< (Less Than)", value: "<" },
  { label: ">= (Greater or Equal)", value: ">=" },
  { label: "<= (Less or Equal)", value: "<=" },
  { label: "contains", value: "contains" },
  { label: "in (Comma Separated)", value: "in" },
  { label: "is empty", value: "is_empty" },
  { label: "is not empty", value: "is_not_empty" },
];

export const DEFAULT_SYSTEM_FORMS = [
  { label: "Purchase Order (purchase_order)", value: "purchase_order", title: "Purchase Order", slug: "purchase_order" },
  { label: "Vendor Master (vendor_master)", value: "vendor_master", title: "Vendor Master", slug: "vendor_master" },
  { label: "Material Requisition (material_request)", value: "material_request", title: "Material Requisition", slug: "material_request" },
  { label: "CSR Project Proposal (project_proposal)", value: "project_proposal", title: "CSR Project Proposal", slug: "project_proposal" },
  { label: "Disbursement Request (disbursement_request)", value: "disbursement_request", title: "Disbursement Request", slug: "disbursement_request" },
  { label: "Employee Requisition (employee_requisition)", value: "employee_requisition", title: "Employee Requisition", slug: "employee_requisition" }
];

export const COMMON_MASTER_OPTIONS = {
  unit: [
    { label: "Unit 1 - Fertilizers", value: "unit_fertilizers" },
    { label: "Unit 2 - Chemicals", value: "unit_chemicals" },
    { label: "Unit 3 - Sugar & Allied", value: "unit_sugar" },
    { label: "Unit 4 - Cement & Infrastructure", value: "unit_cement" },
    { label: "Unit 5 - Corporate HQ", value: "unit_corporate" },
    { label: "Unit 6 - Textiles", value: "unit_textiles" },
    { label: "Unit 7 - Power & Energy", value: "unit_energy" },
    { label: "Unit 8 - North Plant", value: "unit_north" },
    { label: "Unit 9 - South Plant", value: "unit_south" },
  ],
  location: [
    { label: "Mumbai HQ", value: "mumbai" },
    { label: "Delhi NCR", value: "delhi" },
    { label: "Bengaluru Tech Center", value: "bengaluru" },
    { label: "Chennai Plant", value: "chennai" },
    { label: "Kolkata Hub", value: "kolkata" },
    { label: "Hyderabad Center", value: "hyderabad" },
    { label: "Pune Operations", value: "pune" },
    { label: "Ahmedabad Facility", value: "ahmedabad" },
  ],
  department: [
    { label: "CSR & Community Relations", value: "csr" },
    { label: "Procurement & Supply Chain", value: "procurement" },
    { label: "Finance & Accounts", value: "finance" },
    { label: "Operations & Maintenance", value: "operations" },
    { label: "Human Resources (HR)", value: "hr" },
    { label: "Legal & Compliance", value: "legal" },
    { label: "Information Technology (IT)", value: "it" },
    { label: "Admin & Facilities", value: "admin" },
  ],
  category: [
    { label: "Education & Literacy", value: "education" },
    { label: "Healthcare & Sanitation", value: "healthcare" },
    { label: "Rural Infrastructure", value: "rural_infra" },
    { label: "Environment & Sustainability", value: "environment" },
    { label: "Livelihood & Skill Development", value: "livelihood" },
    { label: "Disaster Relief & Rehabilitation", value: "disaster_relief" },
    { label: "Women Empowerment", value: "women_empowerment" },
  ]
};

export const normalizeFormList = (rawList) => {
  if (!Array.isArray(rawList) || rawList.length === 0) {
    return DEFAULT_SYSTEM_FORMS;
  }
  const mapped = rawList.map(f => {
    if (!f) return null;
    const title = f.title || f.name || f.label || f.slug || f.value || "Form";
    const slug = f.slug || f.value || f.id || f.form_id || title;
    return {
      title,
      slug,
      value: slug,
      label: `${title} (${slug})`,
      id: f.id || f.form_id || slug
    };
  }).filter(Boolean);

  return mapped.length > 0 ? mapped : DEFAULT_SYSTEM_FORMS;
};

export const WIZARD_STEPS = [
  { title: "General Info & Form", description: "Name & Trigger" },
  { title: "Match Criteria & Rules", description: "Filter Conditions" },
  { title: "Approval Steps & Roles", description: "Step Sequence" },
  { title: "Pipeline Architecture Preview", description: "Verify & Flow" },
];

export const decodeOp = (op) => {
  if (!op) return "=";
  return String(op)
    .replace(/&gt;=/g, ">=")
    .replace(/&lt;=/g, "<=")
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&")
    .replace(/&ne;/g, "!=");
};

export const extractFormFields = (data) => {
  if (!data) return [];
  const fieldList = [];
  const seen = new Set();

  const addField = (f) => {
    if (!f || typeof f !== "object") return;
    const col = f.db_field || f.column_name || f.name || f.key || f.id || f.field || (f.label ? String(f.label).toLowerCase().trim().replace(/[^a-z0-9_]+/g, "_") : null);
    if (!col || seen.has(col)) return;
    seen.add(col);

    let parsedOptions = [];
    if (Array.isArray(f.options)) {
      parsedOptions = f.options;
    } else if (typeof f.options === "string") {
      try { parsedOptions = JSON.parse(f.options); } catch { parsedOptions = []; }
    }

    const masterName = f.data_source?.master || f.dataSource?.master || f.data_source?.table || f.dataSource?.table || f.master || (f.type?.includes("master") ? col : null);

    fieldList.push({
      label: f.label || f.title || f.placeholder || col,
      value: col,
      type: f.type || f.data_type || "text",
      options: parsedOptions,
      master: masterName,
      dataSource: f.dataSource || f.data_source || null,
    });
  };

  const processFieldsArray = (arr) => {
    if (!Array.isArray(arr)) return;
    arr.forEach((item) => {
      if (item?.fields && Array.isArray(item.fields)) {
        item.fields.forEach(addField);
      } else {
        addField(item);
      }
    });
  };

  if (Array.isArray(data)) {
    processFieldsArray(data);
  } else if (typeof data === "object") {
    if (Array.isArray(data.fields)) processFieldsArray(data.fields);
    if (Array.isArray(data.form_fields)) processFieldsArray(data.form_fields);

    const sections = Array.isArray(data.sections) ? data.sections : (Array.isArray(data.tabs) ? data.tabs : []);
    sections.forEach((sec) => {
      let flds = sec.fields;
      if (typeof flds === "string") {
        try { flds = JSON.parse(flds); } catch { flds = []; }
      }
      if (Array.isArray(flds)) {
        processFieldsArray(flds);
      } else if (flds && typeof flds === "object") {
        if (Array.isArray(flds.columns)) processFieldsArray(flds.columns);
        if (Array.isArray(flds.fields)) processFieldsArray(flds.fields);
      }
    });

    if (data.definition) {
      let def = data.definition;
      if (typeof def === "string") {
        try { def = JSON.parse(def); } catch { def = {}; }
      }
      if (Array.isArray(def.fields)) processFieldsArray(def.fields);
      const defSections = Array.isArray(def.sections) ? def.sections : (Array.isArray(def.tabs) ? def.tabs : []);
      defSections.forEach((sec) => {
        let flds = sec.fields;
        if (typeof flds === "string") {
          try { flds = JSON.parse(flds); } catch { flds = []; }
        }
        if (Array.isArray(flds)) processFieldsArray(flds);
      });
    }

    if (data.schema) {
      let sc = data.schema;
      if (typeof sc === "string") {
        try { sc = JSON.parse(sc); } catch { sc = {}; }
      }
      if (Array.isArray(sc)) processFieldsArray(sc);
      else if (sc && typeof sc === "object") {
        if (Array.isArray(sc.fields)) processFieldsArray(sc.fields);
        if (Array.isArray(sc.sections)) {
          sc.sections.forEach((s) => {
            if (Array.isArray(s.fields)) processFieldsArray(s.fields);
          });
        }
      }
    }
  }

  return fieldList;
};

export const getRoleLabel = (roleVal, roles = []) => {
  if (roleVal === undefined || roleVal === null || roleVal === "") return "";
  const matched = roles.find(
    (r) => r.id === roleVal || String(r.id) === String(roleVal) || r.slug === roleVal || r.name === roleVal
  );
  return matched ? matched.name : String(roleVal);
};

export const getRoleSlug = (roleVal, roles = []) => {
  if (roleVal === undefined || roleVal === null || roleVal === "") return "";
  const matched = roles.find(
    (r) => r.id === roleVal || String(r.id) === String(roleVal) || r.slug === roleVal || r.name === roleVal
  );
  return matched ? matched.slug : String(roleVal);
};

export const getRoleId = (roleVal, roles = []) => {
  if (roleVal === undefined || roleVal === null || roleVal === "") return null;
  const matched = roles.find(
    (r) => r.id === roleVal || String(r.id) === String(roleVal) || r.slug === roleVal || r.name === roleVal
  );
  return matched ? matched.id : (!isNaN(Number(roleVal)) ? Number(roleVal) : roleVal);
};

export const parseSteps = (wf, roles = []) => {
  if (!wf) return [];
  const rawSteps = wf?.wdf_steps || wf?.steps || [];
  let parsed = [];
  if (Array.isArray(rawSteps)) {
    parsed = rawSteps;
  } else if (typeof rawSteps === "string") {
    try { parsed = JSON.parse(rawSteps); } catch { parsed = []; }
  }
  return parsed.map((s, i) => {
    let acts = [];
    if (Array.isArray(s.actions) && s.actions.length > 0) {
      acts = s.actions;
    } else if (Array.isArray(s.action)) {
      acts = s.action;
    } else if (s.action) {
      acts = [s.action];
    } else {
      acts = ["approve", "reject", "resend"];
    }

    const rawRoleIdentifier = s.role_id !== undefined && s.role_id !== null ? s.role_id : s.role;
    let resolvedId = null;
    let resolvedSlug = s.role || "";
    let resolvedName = s.role_name || "";

    if (roles && roles.length > 0) {
      const match = roles.find(
        (r) => r.id === rawRoleIdentifier || String(r.id) === String(rawRoleIdentifier) || r.slug === rawRoleIdentifier || r.name === rawRoleIdentifier
      );
      if (match) {
        resolvedId = match.id;
        resolvedSlug = match.slug;
        resolvedName = match.name;
      } else if (!isNaN(Number(rawRoleIdentifier)) && rawRoleIdentifier !== "") {
        resolvedId = Number(rawRoleIdentifier);
      }
    } else if (!isNaN(Number(rawRoleIdentifier)) && rawRoleIdentifier !== "") {
      resolvedId = Number(rawRoleIdentifier);
    }

    return {
      step: s.step || i + 1,
      role_id: resolvedId !== null ? resolvedId : rawRoleIdentifier,
      role: resolvedSlug || (resolvedId !== null ? String(resolvedId) : rawRoleIdentifier),
      role_name: resolvedName,
      actions: acts,
      action: acts[0] || "approve",
      label: s.label || s.step_name || "",
      reject_to_step: s.reject_to_step !== undefined ? s.reject_to_step : "0"
    };
  });
};

export const parseInitiators = (wf, roles = []) => {
  if (!wf) return [];
  const raw = wf?.wdf_initiator_roles || wf?.initiator_roles || [];
  let parsed = [];
  if (Array.isArray(raw)) parsed = raw;
  else if (typeof raw === "string") {
    try { parsed = JSON.parse(raw); } catch { parsed = []; }
  }
  return parsed.map((item) => {
    if (roles && roles.length > 0) {
      const match = roles.find(
        (r) => r.id === item || String(r.id) === String(item) || r.slug === item || r.name === item
      );
      if (match) return match.id;
    }
    if (!isNaN(Number(item)) && item !== "" && item !== null) {
      return Number(item);
    }
    return item;
  });
};

export const parseConditions = (wf) => {
  if (!wf) return [];
  const raw = wf?.wdf_conditions || wf?.conditions || [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try { return JSON.parse(raw); } catch { return []; }
  }
  return [];
};

export const parseRules = (wf, roles = []) => {
  if (!wf) return [];
  const rawRules = wf?.rules || [];
  let parsed = [];
  if (Array.isArray(rawRules)) {
    parsed = rawRules;
  } else if (typeof rawRules === "string") {
    try { parsed = JSON.parse(rawRules); } catch { parsed = []; }
  }

  if (parsed.length > 0) {
    return parsed.map((r, idx) => ({
      id: r.id,
      workflow_id: r.workflow_id || wf.id || wf.wdf_id,
      rule_name: r.rule_name || `Matrix Rule ${idx + 1}`,
      conditions: parseConditions(r),
      initiator_roles: parseInitiators(r, roles),
      steps: parseSteps(r, roles),
      order_index: r.order_index !== undefined ? r.order_index : idx,
      is_active: r.is_active !== undefined ? r.is_active : true,
    }));
  }

  // Fallback if legacy parent format
  const rootSteps = parseSteps(wf, roles);
  const rootInits = parseInitiators(wf, roles);
  const rootConds = parseConditions(wf);

  if (rootSteps.length > 0 || rootInits.length > 0 || rootConds.length > 0) {
    return [
      {
        id: "default_fallback",
        rule_name: "Default Path",
        conditions: rootConds,
        initiator_roles: rootInits,
        steps: rootSteps,
        order_index: 0,
        is_active: true,
      }
    ];
  }

  return [];
};

export const formatConditionSummary = (conditions = [], masterOptionsMap = {}) => {
  if (!conditions || conditions.length === 0) return "All Submissions (Always Active)";
  return conditions
    .map(c => {
      const opts = masterOptionsMap[c.field] || [];
      const matched = opts.find(o => String(o.value) === String(c.value));
      const valLabel = matched ? matched.label : (c.value_label || c.value);
      return `${c.field} ${decodeOp(c.operator)} ${valLabel}`;
    })
    .join(" AND ");
};


