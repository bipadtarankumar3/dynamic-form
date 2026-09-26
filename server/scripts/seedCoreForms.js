// server/scripts/seedCoreForms.js
// ============================================================
// Core Form Seeder — Seeds Implementation Partner, Due Diligence,
// and DD Document Type forms into t_form and t_section automatically.
// ============================================================

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const { sequelize } = require("../src/config/db.config");


const CORE_FORMS_DATA = [
  // ── 1. Implementation Partner Form ────────────────────────────────
  {
    form_id: "frm0000000013",
    title: "Implementation Partner",
    slug: "implementation_partner",
    root_entity: {
      table: "t_frm_implementation_partner",
      modal_size: "1400",
      primary_key: "id",
    },
    is_master: false,
    enable_approval: false,
    sections: [
      {
        section_id: "sec0000000015",
        section_label: "Basic details",
        type: "general",
        slug: "implementation_partner_basic_details",
        table: "t_frm_implementation_partner",
        primary_key: "id",
        relation: null,
        fields: [
          {
            id: "fld_darpan_no",
            ui: { placeholder: "Enter Darpan Number", icon: "SafetyCertificateOutlined" },
            type: "text",
            label: "Darpan No",
            visible: true,
            db_field: "darpan_no",
            messages: { required: "Darpan Number is required" },
            required: true,
            data_type: "varchar(255)",
            type_name: "Text",
            column_name: "darpan_no",
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: "fld_darpan_link",
            ui: { placeholder: "Enter NGO Darpan link", icon: "GlobalOutlined" },
            type: "text",
            label: "NGO Darpan Link",
            visible: true,
            db_field: "darpan_link",
            required: false,
            data_type: "varchar(255)",
            type_name: "Text",
            column_name: "darpan_link",
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: "fld_organization_name",
            ui: { placeholder: "Enter organization name", icon: "BankOutlined" },
            type: "text",
            label: "Organization Name",
            visible: true,
            db_field: "organization_name",
            messages: { required: "Organization name is required" },
            required: true,
            data_type: "varchar(255)",
            type_name: "Text",
            column_name: "organization_name",
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: "fld_email",
            ui: { placeholder: "Enter valid email id", icon: "MailOutlined" },
            type: "text",
            label: "Email",
            visible: true,
            db_field: "email",
            messages: { required: "Email is required", email: "Enter a valid email address" },
            required: true,
            data_type: "varchar(255)",
            type_name: "Text",
            validation: { email: true },
            column_name: "email",
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: "fld_phone_no",
            ui: { placeholder: "Enter valid Phone no", icon: "PhoneOutlined" },
            type: "text",
            label: "Phone No",
            visible: true,
            db_field: "phone_no",
            messages: { required: "Phone number is required" },
            required: true,
            data_type: "varchar(255)",
            type_name: "Text",
            column_name: "phone_no",
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: "fld_person_name",
            ui: { placeholder: "Enter the person's name", icon: "UserOutlined" },
            type: "text",
            label: "Person Name",
            visible: true,
            db_field: "person_name",
            messages: { required: "Contact person name is required" },
            required: true,
            data_type: "varchar(255)",
            type_name: "Text",
            column_name: "person_name",
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: "fld_person_designation",
            ui: { placeholder: "Enter person Designation", icon: "IdcardOutlined" },
            type: "text",
            label: "Person Designation",
            visible: true,
            db_field: "person_designation",
            messages: { required: "Person designation is required" },
            required: true,
            data_type: "varchar(255)",
            type_name: "Text",
            column_name: "person_designation",
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: "fld_address",
            ui: { rows: 3, placeholder: "Enter Address" },
            type: "textarea",
            label: "Address",
            visible: true,
            db_field: "address",
            required: false,
            data_type: "text",
            type_name: "Text Area",
            column_name: "address",
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: "fld_permanent_address",
            ui: { placeholder: "Enter Permanent Address" },
            type: "text",
            label: "Permanent Address",
            visible: true,
            db_field: "permanent_address",
            required: false,
            data_type: "varchar(255)",
            column_name: "permanent_address",
            add_to_query: true,
            add_to_list: true,
          },
        ],
      },
      {
        section_id: "sec0000000016",
        section_label: "Key Contacts",
        type: "add_more",
        slug: "implementation_partner_key_contacts",
        table: "t_frm_implementation_partner_key_contacts",
        primary_key: "id",
        relation: {
          foreign_key: "parent_id",
          parent_table: "t_frm_implementation_partner",
        },
        context: {
          allow_add_rows: true,
          is_master_driven: false,
          allow_delete_rows: true,
        },
        fields: [
          {
            id: "1785998917473_CIkTSRyw9EIFi5XFCrh6G",
            ui: { placeholder: "Enter Contact Person Name" },
            type: "text",
            label: "Name",
            visible: true,
            db_field: "name",
            required: true,
            data_type: "varchar(255)",
            column_name: "name",
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: "1785999029431__TIZtG9P5TU4wbn3ivVE6",
            ui: { placeholder: "Enter Designation" },
            type: "text",
            label: "Designation",
            visible: true,
            db_field: "designation",
            required: true,
            data_type: "varchar(255)",
            column_name: "designation",
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: "1785998932799_2sFz762ICOm-Fx6bt1Nx2",
            ui: { placeholder: "Enter Contact Number" },
            type: "number",
            label: "Contact",
            visible: true,
            db_field: "contact",
            required: true,
            data_type: "varchar(255)",
            column_name: "contact",
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: "1785998941782_Bw3pWpBjizvCIVsDkqxU5",
            ui: { placeholder: "Enter Email Address" },
            type: "text",
            label: "Email",
            visible: true,
            db_field: "email",
            required: true,
            data_type: "varchar(255)",
            validation: { email: true },
            column_name: "email",
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: "1785999051526_vCdanTsFu3cYXYBut-Emt",
            ui: { rows: 3, placeholder: "Enter Remarks" },
            type: "textarea",
            label: "Remarks",
            visible: true,
            db_field: "remarks",
            required: false,
            data_type: "text",
            column_name: "remarks",
            add_to_query: true,
            add_to_list: true,
          },
        ],
      },
    ],
  },

  // ── 2. Due Diligence Form ─────────────────────────────────────────
  {
    form_id: "frm0000000025",
    title: "Due Diligence",
    slug: "due_diligence",
    parent_form_id: "frm0000000013",
    root_entity: {
      table: "t_frm_due_diligence",
      modal_size: "1400",
      primary_key: "id",
    },
    is_master: false,
    enable_approval: true,
    view_name: "v_due_diligence",
    view_slug: "v_due_diligence",
    sections: [
      {
        section_id: "sec0000000043",
        section_label: "Due Diligence Details",
        type: "general",
        slug: "due_diligence_details",
        table: "t_frm_due_diligence",
        primary_key: "id",
        relation: null,
        fields: [
          {
            id: "fld_1788775064893",
            ui: { placeholder: "Enter Title", col_span: 6, visible: true },
            type: "text",
            label: "Title",
            visible: true,
            db_field: "title",
            required: true,
            data_type: "varchar(255)",
            column_name: "title",
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: "fld_1788775503375",
            ui: { placeholder: "Enter Date of submission" },
            type: "date",
            label: "Date of submission",
            visible: true,
            db_field: "date_of_submission",
            required: false,
            data_type: "date",
            column_name: "date_of_submission",
            add_to_query: true,
            add_to_list: true,
          },
        ],
      },
      {
        section_id: "sec0000000044",
        section_label: "Due Diligence Documents",
        type: "add_more",
        slug: "section_2",
        table: "t_section_2",
        primary_key: "id",
        relation: {
          foreign_key: "parent_id",
          parent_table: "t_frm_due_diligence",
        },
        context: {
          master_source: "dd_document_type",
          allow_add_rows: true,
          is_master_driven: true,
          allow_delete_rows: true,
        },
        fields: [
          {
            id: "fld_1788775128530",
            ui: { placeholder: "Select Registration Document Type" },
            type: "select",
            label: "Registration",
            visible: true,
            db_field: "registration",
            required: true,
            data_type: "varchar(255)",
            data_source: {
              name: "dd_document_type",
              type: "master",
              label_key: "type_name",
              value_key: "id",
              table_name: "t_frm_dd_document_type",
              primary_key: "id",
            },
            column_name: "registration",
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: "fld_1788775556423",
            ui: { placeholder: "Applicable" },
            type: "select",
            label: "Applicable",
            options: [
              { label: "Yes", value: "yes" },
              { label: "No", value: "no" },
            ],
            visible: true,
            db_field: "applicable",
            required: false,
            data_type: "varchar(255)",
            column_name: "applicable",
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: "fld_1788775172016",
            ui: { placeholder: "Available" },
            type: "select",
            label: "Available",
            options: [
              { label: "Yes", value: "yes" },
              { label: "No", value: "no" },
              { label: "Near Feature", value: "near_feature" },
            ],
            visible: true,
            db_field: "available",
            required: false,
            data_type: "varchar(255)",
            column_name: "available",
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: "fld_1788775213423",
            ui: { placeholder: "Enter Document Number" },
            type: "text",
            label: "Document Number",
            visible: true,
            db_field: "document_number",
            required: false,
            data_type: "varchar(255)",
            column_name: "document_number",
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: "fld_1788775225177",
            ui: { placeholder: "Enter Valid Till Date" },
            type: "date",
            label: "Valid Till",
            visible: true,
            db_field: "valid_till",
            required: false,
            data_type: "date",
            column_name: "valid_till",
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: "fld_1788775625921",
            ui: { placeholder: "Enter Remarks" },
            type: "textarea",
            label: "Remarks",
            visible: true,
            db_field: "remarks",
            required: false,
            data_type: "text",
            column_name: "remarks",
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: "fld_1788775899560",
            ui: { placeholder: "Upload Document File" },
            type: "file",
            label: "File Upload",
            visible: true,
            db_field: "file_upload",
            required: false,
            data_type: "file",
            column_name: "file_upload",
            add_to_query: true,
            add_to_list: true,
          },
        ],
      },
    ],
  },

  // ── 3. DD Document Type Master Form ──────────────────────────────
  {
    form_id: "frm0000000010",
    title: "DD Document Type",
    slug: "dd_document_type",
    root_entity: {
      table: "t_frm_dd_document_type",
      modal_size: "1400",
      primary_key: "id",
    },
    is_master: true,
    enable_approval: false,
    sections: [
      {
        section_id: "sec0000000010",
        section_label: "General",
        type: "general",
        slug: "dd_document_type_general",
        table: "t_frm_dd_document_type",
        primary_key: "id",
        relation: null,
        fields: [
          {
            id: "fld_dd_doc_name",
            ui: { placeholder: "Enter Document Type Name" },
            type: "text",
            label: "Type Name",
            visible: true,
            db_field: "type_name",
            required: true,
            data_type: "varchar(255)",
            column_name: "type_name",
            add_to_query: true,
            add_to_list: true,
          },
        ],
      },
    ],
  },
  // ── 4. Request for Proposal (RFP) Form ──────────────────────────────
  {
    form_id: "frm0000000026",
    title: "Request for Proposal",
    slug: "request_for_proposal",
    root_entity: {
      table: "t_frm_request_for_proposal",
      modal_size: "1400",
      primary_key: "id",
    },
    is_master: false,
    enable_approval: false,
    sections: [
      {
        section_id: "sec0000000045",
        section_label: "Request for Proposal Details",
        type: "general",
        slug: "request_for_proposal_details",
        table: "t_frm_request_for_proposal",
        primary_key: "id",
        relation: null,
        context: null,
        fields: [
          {
            id: "fld_1788784557830",
            ui: { placeholder: "Enter Project Details" },
            icon: "📝",
            type: "textarea",
            group: "Basic",
            label: "Project Details",
            visible: true,
            db_field: "project_details",
            required: false,
            data_type: "text",
            validation: { required: false },
            add_to_list: true,
            column_name: "project_details",
            add_to_query: true,
          },
          {
            id: "fld_1788784563261",
            ui: { placeholder: "Enter Objective" },
            icon: "📝",
            type: "textarea",
            group: "Basic",
            label: "Objective",
            visible: true,
            db_field: "objective",
            required: false,
            data_type: "text",
            validation: { required: false },
            add_to_list: true,
            column_name: "objective",
            add_to_query: true,
          },
          {
            id: "fld_1788784572093",
            ui: { placeholder: "Enter Scope of Work" },
            icon: "📝",
            type: "textarea",
            group: "Basic",
            label: "Scope of Work",
            visible: true,
            db_field: "scope_of_work",
            required: false,
            data_type: "text",
            validation: { required: false },
            add_to_list: true,
            column_name: "scope_of_work",
            add_to_query: true,
          },
          {
            id: "fld_1788784579600",
            ui: { placeholder: "Enter Deliverables" },
            icon: "📝",
            type: "textarea",
            group: "Basic",
            label: "Deliverables",
            visible: true,
            db_field: "deliverables",
            required: false,
            data_type: "text",
            validation: { required: false },
            add_to_list: true,
            column_name: "deliverables",
            add_to_query: true,
          },
          {
            id: "fld_1788784590964",
            ui: { placeholder: "Enter Timelines" },
            icon: "📝",
            type: "textarea",
            group: "Basic",
            label: "Timelines",
            visible: true,
            db_field: "timelines",
            required: false,
            data_type: "text",
            validation: { required: false },
            add_to_list: true,
            column_name: "timelines",
            add_to_query: true,
          },
          {
            id: "fld_1788784596716",
            ui: { placeholder: "Enter Budget Range" },
            icon: "🔤",
            type: "text",
            group: "Basic",
            label: "Budget Range",
            visible: true,
            db_field: "budget_range",
            required: false,
            data_type: "varchar(255)",
            validation: { required: false },
            add_to_list: true,
            column_name: "budget_range",
            add_to_query: true,
          },
          {
            id: "fld_1788784602340",
            ui: { placeholder: "Enter Eligibility Criteria" },
            icon: "🔤",
            type: "text",
            group: "Basic",
            label: "Eligibility Criteria",
            visible: true,
            db_field: "eligibility_criteria",
            required: false,
            data_type: "varchar(255)",
            validation: { required: false },
            add_to_list: true,
            column_name: "eligibility_criteria",
            add_to_query: true,
          },
          {
            id: "fld_1788784611921",
            ui: { placeholder: "Enter Required Documents" },
            icon: "📝",
            type: "textarea",
            group: "Basic",
            label: "Required Documents",
            visible: true,
            db_field: "required_documents",
            required: false,
            data_type: "text",
            validation: { required: false },
            add_to_list: true,
            column_name: "required_documents",
            add_to_query: true,
          },
          {
            id: "fld_1788784620956",
            ui: { placeholder: "Enter Evaluation Criteria" },
            icon: "📝",
            type: "textarea",
            group: "Basic",
            label: "Evaluation Criteria",
            visible: true,
            db_field: "evaluation_criteria",
            required: false,
            data_type: "text",
            validation: { required: false },
            add_to_list: true,
            column_name: "evaluation_criteria",
            add_to_query: true,
          },
          {
            id: "fld_1788784630859",
            ui: { placeholder: "Enter Submission Deadline" },
            icon: "📅",
            type: "date",
            group: "Basic",
            label: "Submission Deadline",
            visible: true,
            db_field: "submission_deadline",
            required: false,
            data_type: "date",
            validation: { required: false },
            add_to_list: true,
            column_name: "submission_deadline",
            add_to_query: true,
          },
          {
            id: "fld_1788784639064",
            ui: { placeholder: "Enter Contact Person" },
            icon: "📝",
            type: "textarea",
            group: "Basic",
            label: "Contact Person",
            visible: true,
            db_field: "contact_person",
            required: false,
            data_type: "text",
            validation: { required: false },
            add_to_list: true,
            column_name: "contact_person",
            add_to_query: true,
          },
          {
            id: "fld_1788784667508",
            ui: { placeholder: "Enter RFP Type" },
            icon: "🔽",
            type: "select",
            group: "Advanced",
            label: "RFP Type",
            options: [
              { label: "Open", value: "open" },
              { label: "Closed", value: "closed" }
            ],
            visible: true,
            db_field: "rfp_type",
            required: false,
            data_type: "varchar(255)",
            validation: { required: false },
            add_to_list: true,
            column_name: "rfp_type",
            add_to_query: true,
          },
          {
            id: "fld_1788784698988",
            ui: { placeholder: "Enter NGO" },
            icon: "🔽",
            type: "select",
            group: "Advanced",
            label: "NGO",
            visible: true,
            db_field: "ngo",
            multiple: false,
            required: false,
            data_type: "varchar(255)",
            conditions: {
              rules: [
                {
                  field: "rfp_type",
                  value: "closed",
                  operator: "equals",
                },
              ],
              match_type: "all",
            },
            validation: { required: false },
            add_to_list: true,
            column_name: "ngo",
            data_source: {
              name: "implementation_partner",
              type: "master",
              label_key: "organization_name",
              value_key: "id",
              table_name: "t_frm_implementation_partner",
              primary_key: "id",
            },
            add_to_query: true,
            allow_multiple: false,
            options_source: "master",
          },
        ],
      },
    ],
  },

  // ── 4. RFP Evaluation Criteria Form (Master) ─────────────────────────
  {
    form_id: "frm0000000011",
    title: "RFP Evaluation Criteria",
    slug: "rfp_evaluation_criteria",
    root_entity: {
      table: "t_frm_rfp_evaluation_criteria",
      modal_size: "1400",
      primary_key: "id",
    },
    is_master: true,
    enable_approval: false,
    sections: [
      {
        section_id: "sec0000000011",
        section_label: "General",
        type: "general",
        slug: "rfp_evaluation_criteria_general",
        table: "t_frm_rfp_evaluation_criteria",
        primary_key: "id",
        relation: null,
        fields: [
          {
            id: "fld_criteria_name",
            ui: { placeholder: "Enter Criteria Name", icon: "CheckSquareOutlined" },
            type: "text",
            label: "Criteria Name",
            visible: true,
            db_field: "criteria_name",
            messages: { required: "Criteria name is required" },
            required: true,
            data_type: "varchar(255)",
            type_name: "Text",
            column_name: "criteria_name",
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: "fld_weightage",
            ui: { placeholder: "Enter Default Weightage (%)", icon: "PercentageOutlined" },
            type: "number",
            label: "Default Weightage (%)",
            visible: true,
            db_field: "weightage",
            required: false,
            data_type: "numeric(5, 2)",
            type_name: "Number",
            column_name: "weightage",
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: "fld_description",
            ui: { placeholder: "Enter Criteria Description", rows: 3 },
            type: "textarea",
            label: "Description",
            visible: true,
            db_field: "description",
            required: false,
            data_type: "text",
            type_name: "Text Area",
            column_name: "description",
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: "fld_status",
            ui: { placeholder: "Select Status" },
            type: "select",
            label: "Status",
            options: [
              { label: "Active", value: "active" },
              { label: "Draft", value: "draft" },
              { label: "Inactive", value: "inactive" },
            ],
            visible: true,
            db_field: "status",
            required: false,
            data_type: "varchar(50)",
            type_name: "Select",
            column_name: "status",
            add_to_query: true,
            add_to_list: true,
          },
        ],
      },
    ],
  },

  // ── 5. RFP Proposal Submission Form ──────────────────────────────────
  require("./rfp_submission_schema.json"),

  // ── 6. RFP Float Form ────────────────────────────────────────────────
  require("./rfp_float_schema.json"),

  // ── 7. Financial Year Master Form ─────────────────────────────────────
  {
    form_id: "frm0000000030",
    title: "Financial Year",
    slug: "financial_year",
    root_entity: {
      table: "t_frm_financial_year",
      modal_size: "1000",
      primary_key: "id",
    },
    is_master: true,
    enable_approval: false,
    sections: [
      {
        section_id: "sec0000000055",
        section_label: "Financial Year Details",
        type: "general",
        slug: "financial_year_general",
        table: "t_frm_financial_year",
        primary_key: "id",
        relation: null,
        fields: [
          {
            id: "fld_fy_name",
            ui: { placeholder: "Enter Financial Year (e.g. FY 2024-25)", icon: "CalendarOutlined" },
            type: "text",
            label: "Financial Year Name",
            visible: true,
            db_field: "name",
            messages: { required: "Financial Year Name is required" },
            required: true,
            data_type: "varchar(255)",
            type_name: "Text",
            column_name: "name",
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: "fld_fy_code",
            ui: { placeholder: "Enter Code (e.g. 2024-25)", icon: "KeyOutlined" },
            type: "text",
            label: "Code",
            visible: true,
            db_field: "code",
            messages: { required: "Code is required" },
            required: true,
            data_type: "varchar(50)",
            type_name: "Text",
            column_name: "code",
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: "fld_fy_start_date",
            ui: { placeholder: "Select Start Date", icon: "CalendarOutlined" },
            type: "date",
            label: "Start Date",
            visible: true,
            db_field: "start_date",
            messages: { required: "Start date is required" },
            required: true,
            data_type: "date",
            type_name: "Date",
            column_name: "start_date",
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: "fld_fy_end_date",
            ui: { placeholder: "Select End Date", icon: "CalendarOutlined" },
            type: "date",
            label: "End Date",
            visible: true,
            db_field: "end_date",
            messages: { required: "End date is required" },
            required: true,
            data_type: "date",
            type_name: "Date",
            column_name: "end_date",
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: "fld_fy_is_current",
            ui: { placeholder: "Is Current FY?" },
            type: "checkbox",
            label: "Is Current FY",
            visible: true,
            db_field: "is_current",
            required: false,
            data_type: "boolean",
            type_name: "Checkbox",
            column_name: "is_current",
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: "fld_fy_is_active",
            ui: { placeholder: "Is Active?" },
            type: "checkbox",
            label: "Is Active",
            visible: true,
            db_field: "is_active",
            required: false,
            data_type: "boolean",
            type_name: "Checkbox",
            column_name: "is_active",
            add_to_query: true,
            add_to_list: true,
          },
        ],
      },
    ],
  },
];

const DEFAULT_DD_DOCUMENT_TYPES = [
  "Registration Certificate",
  "PAN Card",
  "12A Certificate",
  "80G Certificate",
  "CSR-1 Certificate",
  "FCRA Certificate",
  "NGO DARPAN Certificate",
  "Memorandum/Trust Deed",
  "Bye-laws",
  "Board Resolution",
  "Last 3 Years Audited Balance Sheet",
  "Annual Activity Report"
];

async function ensureCoreDatabaseTables() {
  try {
    // 1. Implementation Partner Root Table (Clean Seed Columns)
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS t_frm_implementation_partner (
        id SERIAL PRIMARY KEY,
        darpan_no VARCHAR(255),
        darpan_link VARCHAR(500),
        organization_name VARCHAR(255),
        email VARCHAR(255),
        primary_email VARCHAR(255),
        phone_no VARCHAR(50),
        person_name VARCHAR(255),
        person_designation VARCHAR(255),
        address TEXT,
        permanent_address VARCHAR(255),
        status VARCHAR(50) DEFAULT 'Draft',
        registration_status VARCHAR(50) DEFAULT 'PENDING_VERIFICATION',
        is_verified BOOLEAN DEFAULT FALSE,
        otp_code VARCHAR(20),
        otp_expires_at TIMESTAMP WITHOUT TIME ZONE,
        otp_attempts INT DEFAULT 0,
        user_id INT,
        rejection_reason TEXT,
        profile_data JSONB DEFAULT '{}'::jsonb,
        created_by INT DEFAULT 1,
        updated_by INT DEFAULT 1,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
        deleted_at TIMESTAMP WITHOUT TIME ZONE
      );

      ALTER TABLE t_users
      ADD COLUMN IF NOT EXISTS is_first_login BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS implementation_partner_id INTEGER;

      ALTER TABLE t_frm_implementation_partner
      ADD COLUMN IF NOT EXISTS primary_email VARCHAR(255),
      ADD COLUMN IF NOT EXISTS user_id INT,
      ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS registration_status VARCHAR(50) DEFAULT 'PENDING_VERIFICATION',
      ADD COLUMN IF NOT EXISTS profile_data JSONB DEFAULT '{}'::jsonb;
    `);

    // 2. Implementation Partner Key Contacts (Child Table)
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS t_frm_implementation_partner_key_contacts (
        id SERIAL PRIMARY KEY,
        parent_id INT,
        name VARCHAR(255),
        designation VARCHAR(255),
        contact VARCHAR(255),
        email VARCHAR(255),
        remarks TEXT,
        status VARCHAR(50) DEFAULT 'Active',
        created_by INT DEFAULT 1,
        updated_by INT DEFAULT 1,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
        deleted_at TIMESTAMP WITHOUT TIME ZONE
      );
    `);

    // 3. DD Document Type Master Table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS t_frm_dd_document_type (
        id SERIAL PRIMARY KEY,
        type_name VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'draft',
        created_by INT,
        updated_by INT,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
        deleted_at TIMESTAMP WITHOUT TIME ZONE
      );
    `);

    // 4. Due Diligence Root Table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS t_frm_due_diligence (
        id SERIAL PRIMARY KEY,
        parent_id INT,
        title VARCHAR(255),
        date_of_submission DATE,
        registration VARCHAR(255),
        status VARCHAR(50) DEFAULT 'Draft',
        created_by INT DEFAULT 1,
        updated_by INT DEFAULT 1,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
        deleted_at TIMESTAMP WITHOUT TIME ZONE
      );
    `);

    // 5. Due Diligence Documents Child Table (t_section_2)
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS t_section_2 (
        id SERIAL PRIMARY KEY,
        parent_id INT,
        registration VARCHAR(255),
        applicable VARCHAR(50),
        available VARCHAR(50),
        document_number VARCHAR(255),
        valid_till DATE,
        remarks TEXT,
        file_upload TEXT,
        status VARCHAR(50) DEFAULT 'Active',
        created_by INT DEFAULT 1,
        updated_by INT DEFAULT 1,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
        deleted_at TIMESTAMP WITHOUT TIME ZONE
      );
    `);

    // 6. NGO Due Diligence Versions Table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS t_ngo_due_diligence_versions (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL,
        version_number INT NOT NULL DEFAULT 1,
        form_slug VARCHAR(100) DEFAULT 'due_diligence',
        status VARCHAR(50) DEFAULT 'DRAFT',
        data JSONB DEFAULT '{}'::jsonb,
        approval_track JSONB DEFAULT '[]'::jsonb,
        change_summary TEXT,
        created_by INT,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
        deleted_at TIMESTAMP WITHOUT TIME ZONE
      );
    `);

    // 7. Seed Default DD Document Types if table is empty
    const [existingTypes] = await sequelize.query(`SELECT COUNT(*) as count FROM t_frm_dd_document_type WHERE deleted_at IS NULL`);
    const count = parseInt(existingTypes[0]?.count || "0", 10);
    if (count === 0) {
      for (const docTypeName of DEFAULT_DD_DOCUMENT_TYPES) {
        await sequelize.query(
          `INSERT INTO t_frm_dd_document_type (type_name, status, created_at, updated_at) VALUES (:name, 'draft', NOW(), NOW())`,
          { replacements: { name: docTypeName } }
        );
      }
      console.log(`[Seed Core Forms] ✅ Seeded ${DEFAULT_DD_DOCUMENT_TYPES.length} default DD document types`);
    }

    // 8. Request for Proposal (RFP) Table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS t_frm_request_for_proposal (
        id SERIAL PRIMARY KEY,
        rfp_title VARCHAR(255),
        rfp_code VARCHAR(100),
        rfp_type VARCHAR(100) DEFAULT 'open',
        project_category VARCHAR(150),
        budget_amount NUMERIC(15, 2),
        start_date DATE,
        submission_deadline DATE,
        description TEXT,
        scope_of_work TEXT,
        eligibility_criteria TEXT,
        terms_and_conditions TEXT,
        attached_document VARCHAR(500),
        remarks TEXT,
        status VARCHAR(50) DEFAULT 'draft',
        tagged_ngo_id INT,
        tagged_ngo_name VARCHAR(255),
        is_active BOOLEAN DEFAULT TRUE,
        created_by INT DEFAULT 1,
        updated_by INT DEFAULT 1,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
        deleted_at TIMESTAMP WITHOUT TIME ZONE
      );
    `);

    // 9. RFP Evaluation Criteria Master Table (t_frm_rfp_evaluation_criteria)
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS t_frm_rfp_evaluation_criteria (
        id SERIAL PRIMARY KEY,
        criteria_name VARCHAR(255) NOT NULL,
        weightage NUMERIC(5, 2) DEFAULT 10,
        description TEXT,
        status VARCHAR(50) DEFAULT 'active',
        is_active BOOLEAN DEFAULT TRUE,
        created_by INT DEFAULT 1,
        updated_by INT DEFAULT 1,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
        deleted_at TIMESTAMP WITHOUT TIME ZONE
      );
    `);

    await sequelize.query(`
      ALTER TABLE t_frm_rfp_evaluation_criteria ADD COLUMN IF NOT EXISTS criteria_name VARCHAR(255);
      ALTER TABLE t_frm_rfp_evaluation_criteria ADD COLUMN IF NOT EXISTS weightage NUMERIC(5, 2) DEFAULT 10;
      ALTER TABLE t_frm_rfp_evaluation_criteria ADD COLUMN IF NOT EXISTS description TEXT;
      ALTER TABLE t_frm_rfp_evaluation_criteria ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';
      ALTER TABLE t_frm_rfp_evaluation_criteria ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
      ALTER TABLE t_frm_rfp_evaluation_criteria ADD COLUMN IF NOT EXISTS created_by INT DEFAULT 1;
      ALTER TABLE t_frm_rfp_evaluation_criteria ADD COLUMN IF NOT EXISTS updated_by INT DEFAULT 1;
      ALTER TABLE t_frm_rfp_evaluation_criteria ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW();
      ALTER TABLE t_frm_rfp_evaluation_criteria ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW();
      ALTER TABLE t_frm_rfp_evaluation_criteria ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITHOUT TIME ZONE;
    `);

    const DEFAULT_RFP_EVALUATION_CRITERIA = [
      { name: "Technical Proposal & Feasibility", weight: 25, desc: "Alignment with project objectives, technical methodology, innovation, and implementation feasibility." },
      { name: "Financial Budget & Cost Effectiveness", weight: 20, desc: "Cost reasonableness, itemized budget breakdown, and financial transparency." },
      { name: "Past Experience & Track Record", weight: 20, desc: "Demonstrated past experience in executing similar CSR projects and verifiable outcomes." },
      { name: "Organizational Capacity & Governance", weight: 15, desc: "Valid legal compliances (80G, 12A, CSR-1), governance structure, and organizational stability." },
      { name: "Team Qualification & Key Personnel", weight: 10, desc: "Qualifications, competence, and dedicated capacity of key project personnel." },
      { name: "Monitoring, Evaluation & Sustainability", weight: 10, desc: "Robust monitoring framework, community impact metrics, and long-term sustainability." },
    ];

    const [existingCriteria] = await sequelize.query(`SELECT COUNT(*) as count FROM t_frm_rfp_evaluation_criteria WHERE deleted_at IS NULL`);
    const criteriaCount = parseInt(existingCriteria[0]?.count || "0", 10);
    if (criteriaCount === 0) {
      for (const item of DEFAULT_RFP_EVALUATION_CRITERIA) {
        await sequelize.query(
          `INSERT INTO t_frm_rfp_evaluation_criteria (criteria_name, weightage, description, status, is_active, created_at, updated_at)
           VALUES (:name, :weight, :desc, 'active', TRUE, NOW(), NOW())`,
          { replacements: { name: item.name, weight: item.weight, desc: item.desc } }
        );
      }
      console.log(`[Seed Core Forms] ✅ Seeded ${DEFAULT_RFP_EVALUATION_CRITERIA.length} default RFP evaluation criteria records`);
    }

    // 10. RFP Submission Table (t_frm_rfp_submission)
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS t_frm_rfp_submission (
        id SERIAL PRIMARY KEY,
        parent_id INT,
        name_of_the_organization VARCHAR(255),
        registered_under VARCHAR(255),
        registration_number VARCHAR(255),
        registration_address TEXT,
        present_address TEXT,
        contact_name VARCHAR(255),
        designation VARCHAR(255),
        phone_number VARCHAR(50),
        website VARCHAR(255),
        it_example_under_sec_12_a_no VARCHAR(255),
        it_example_under_sec_35_ac_no VARCHAR(255),
        it_example_under_sec_80_g_no VARCHAR(255),
        area_of_expertise VARCHAR(255),
        overall_experience VARCHAR(255),
        status VARCHAR(50) DEFAULT 'Submitted',
        final_status VARCHAR(50) DEFAULT 'Submitted',
        rating NUMERIC(5, 2) DEFAULT 0,
        criteria_scores JSONB DEFAULT '[]'::jsonb,
        evaluation_notes TEXT,
        created_by INT DEFAULT 1,
        updated_by INT DEFAULT 1,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
        deleted_at TIMESTAMP WITHOUT TIME ZONE
      );
    `);

    await sequelize.query(`
      ALTER TABLE t_frm_rfp_submission ADD COLUMN IF NOT EXISTS parent_id INT;
      ALTER TABLE t_frm_rfp_submission ADD COLUMN IF NOT EXISTS name_of_the_organization VARCHAR(255);
      ALTER TABLE t_frm_rfp_submission ADD COLUMN IF NOT EXISTS registered_under VARCHAR(255);
      ALTER TABLE t_frm_rfp_submission ADD COLUMN IF NOT EXISTS registration_number VARCHAR(255);
      ALTER TABLE t_frm_rfp_submission ADD COLUMN IF NOT EXISTS registration_address TEXT;
      ALTER TABLE t_frm_rfp_submission ADD COLUMN IF NOT EXISTS present_address TEXT;
      ALTER TABLE t_frm_rfp_submission ADD COLUMN IF NOT EXISTS contact_name VARCHAR(255);
      ALTER TABLE t_frm_rfp_submission ADD COLUMN IF NOT EXISTS designation VARCHAR(255);
      ALTER TABLE t_frm_rfp_submission ADD COLUMN IF NOT EXISTS phone_number VARCHAR(50);
      ALTER TABLE t_frm_rfp_submission ADD COLUMN IF NOT EXISTS website VARCHAR(255);
      ALTER TABLE t_frm_rfp_submission ADD COLUMN IF NOT EXISTS it_example_under_sec_12_a_no VARCHAR(255);
      ALTER TABLE t_frm_rfp_submission ADD COLUMN IF NOT EXISTS it_example_under_sec_35_ac_no VARCHAR(255);
      ALTER TABLE t_frm_rfp_submission ADD COLUMN IF NOT EXISTS it_example_under_sec_80_g_no VARCHAR(255);
      ALTER TABLE t_frm_rfp_submission ADD COLUMN IF NOT EXISTS area_of_expertise VARCHAR(255);
      ALTER TABLE t_frm_rfp_submission ADD COLUMN IF NOT EXISTS overall_experience VARCHAR(255);
      ALTER TABLE t_frm_rfp_submission ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Submitted';
      ALTER TABLE t_frm_rfp_submission ADD COLUMN IF NOT EXISTS final_status VARCHAR(50) DEFAULT 'Submitted';
      ALTER TABLE t_frm_rfp_submission ADD COLUMN IF NOT EXISTS rating NUMERIC(5, 2) DEFAULT 0;
      ALTER TABLE t_frm_rfp_submission ADD COLUMN IF NOT EXISTS criteria_scores JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE t_frm_rfp_submission ADD COLUMN IF NOT EXISTS evaluation_notes TEXT;
      ALTER TABLE t_frm_rfp_submission ADD COLUMN IF NOT EXISTS created_by INT DEFAULT 1;
      ALTER TABLE t_frm_rfp_submission ADD COLUMN IF NOT EXISTS updated_by INT DEFAULT 1;
      ALTER TABLE t_frm_rfp_submission ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW();
      ALTER TABLE t_frm_rfp_submission ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW();
      ALTER TABLE t_frm_rfp_submission ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITHOUT TIME ZONE;
    `);

    // 11. Documents Add-More Table (t_documents)
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS t_documents (
        id SERIAL PRIMARY KEY,
        parent_id INT,
        registration VARCHAR(255),
        file_upload TEXT,
        created_by INT DEFAULT 1,
        updated_by INT DEFAULT 1,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
        deleted_at TIMESTAMP WITHOUT TIME ZONE
      );
    `);

    await sequelize.query(`
      ALTER TABLE t_documents ADD COLUMN IF NOT EXISTS parent_id INT;
      ALTER TABLE t_documents ADD COLUMN IF NOT EXISTS registration VARCHAR(255);
      ALTER TABLE t_documents ADD COLUMN IF NOT EXISTS file_upload TEXT;
      ALTER TABLE t_documents ADD COLUMN IF NOT EXISTS created_by INT DEFAULT 1;
      ALTER TABLE t_documents ADD COLUMN IF NOT EXISTS updated_by INT DEFAULT 1;
      ALTER TABLE t_documents ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW();
      ALTER TABLE t_documents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW();
      ALTER TABLE t_documents ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITHOUT TIME ZONE;
    `);

    // 12. Format of Budget Add-More Table (t_format_of_budget)
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS t_format_of_budget (
        id SERIAL PRIMARY KEY,
        parent_id INT,
        particulars VARCHAR(255),
        unit INT,
        number_of_unit VARCHAR(255),
        unit_cost INT,
        number_of_months INT,
        total INT,
        created_by INT DEFAULT 1,
        updated_by INT DEFAULT 1,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
        deleted_at TIMESTAMP WITHOUT TIME ZONE
      );
    `);

    await sequelize.query(`
      ALTER TABLE t_format_of_budget ADD COLUMN IF NOT EXISTS parent_id INT;
      ALTER TABLE t_format_of_budget ADD COLUMN IF NOT EXISTS particulars VARCHAR(255);
      ALTER TABLE t_format_of_budget ADD COLUMN IF NOT EXISTS unit INT;
      ALTER TABLE t_format_of_budget ADD COLUMN IF NOT EXISTS number_of_unit VARCHAR(255);
      ALTER TABLE t_format_of_budget ADD COLUMN IF NOT EXISTS unit_cost INT;
      ALTER TABLE t_format_of_budget ADD COLUMN IF NOT EXISTS number_of_months INT;
      ALTER TABLE t_format_of_budget ADD COLUMN IF NOT EXISTS total INT;
      ALTER TABLE t_format_of_budget ADD COLUMN IF NOT EXISTS created_by INT DEFAULT 1;
      ALTER TABLE t_format_of_budget ADD COLUMN IF NOT EXISTS updated_by INT DEFAULT 1;
      ALTER TABLE t_format_of_budget ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW();
      ALTER TABLE t_format_of_budget ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW();
      ALTER TABLE t_format_of_budget ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITHOUT TIME ZONE;
    `);

    // 14. Financial Year Table (t_frm_financial_year)
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS t_frm_financial_year (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        code VARCHAR(50) UNIQUE NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        is_current BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        created_by INT DEFAULT 1,
        updated_by INT DEFAULT 1,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
        deleted_at TIMESTAMP WITHOUT TIME ZONE
      );
    `);

    // Migrate data and drop legacy t_financial_years if it exists
    await sequelize.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 't_financial_years') THEN
          INSERT INTO t_frm_financial_year (id, name, code, start_date, end_date, is_current, is_active, created_by, updated_by, created_at, updated_at, deleted_at)
          SELECT id, COALESCE(code, 'FY ' || id), code, start_date, end_date, COALESCE(is_current, FALSE), COALESCE(is_active, TRUE), created_by, updated_by, created_at, updated_at, deleted_at
          FROM t_financial_years
          ON CONFLICT (code) DO NOTHING;

          IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 't_frm_financial_year_id_seq') THEN
            PERFORM setval(pg_get_serial_sequence('t_frm_financial_year', 'id'), COALESCE(MAX(id), 1)) FROM t_frm_financial_year;
          END IF;

          DROP TABLE IF EXISTS t_financial_years CASCADE;
        END IF;
      END $$;
    `);

    // Seed default current financial year if table is empty
    const now = new Date();
    const curYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    const defaultFyCode = `${curYear}-${String(curYear + 1).slice(-2)}`;
    const defaultFyName = `FY ${defaultFyCode}`;
    const defaultStartDate = `${curYear}-04-01`;
    const defaultEndDate = `${curYear + 1}-03-31`;

    await sequelize.query(`
      INSERT INTO t_frm_financial_year (name, code, start_date, end_date, is_current, is_active)
      VALUES (:name, :code, :start_date, :end_date, TRUE, TRUE)
      ON CONFLICT (code) DO NOTHING;
    `, {
      replacements: {
        name: defaultFyName,
        code: defaultFyCode,
        start_date: defaultStartDate,
        end_date: defaultEndDate,
      }
    });

    // Ensure t_master_configs contains financial_year
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS t_master_configs (
        id SERIAL PRIMARY KEY,
        slug VARCHAR(255) UNIQUE NOT NULL,
        table_name VARCHAR(255) NOT NULL,
        primary_key VARCHAR(255) NOT NULL,
        label_key VARCHAR(255) NOT NULL,
        is_active_key VARCHAR(255) DEFAULT NULL,
        foreign_key VARCHAR(255) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      INSERT INTO t_master_configs (slug, table_name, primary_key, label_key, is_active_key)
      VALUES 
        ('financial_year', 't_frm_financial_year', 'id', 'name', 'is_active'),
        ('financial_years', 't_frm_financial_year', 'id', 'name', 'is_active')
      ON CONFLICT (slug) DO UPDATE
        SET table_name = EXCLUDED.table_name,
            label_key = EXCLUDED.label_key,
            is_active_key = EXCLUDED.is_active_key;
    `);
  } catch (err) {
    console.warn("[Seed Core Forms] Table ensure warning:", err.message);
  }
}

async function seedCoreForms() {
  try {
    console.log("[Seed Core Forms] Ensuring core tables and seeding Implementation Partner, Due Diligence, and RFP forms...");

    // 1. Ensure all backing tables exist
    await ensureCoreDatabaseTables();

    // 2. Upsert Forms & Sections
    for (const formData of CORE_FORMS_DATA) {
      const rootEntityStr = JSON.stringify(formData.root_entity);
      const isMaster = Boolean(formData.is_master);
      const enableApproval = Boolean(formData.enable_approval);
      const parentFormId = formData.parent_form_id || null;
      const viewName = formData.view_name || null;
      const viewSlug = formData.view_slug || null;

      await sequelize.query(
        `INSERT INTO t_form (
           form_id, title, slug, root_entity, is_master, enable_approval,
           parent_form_id, view_name, view_slug, is_active, created_by, updated_by
         ) VALUES (
           :form_id, :title, :slug, :root_entity::jsonb, :is_master, :enable_approval,
           :parent_form_id, :view_name, :view_slug, TRUE, 1, 1
         ) ON CONFLICT (form_id) DO UPDATE SET
           title = EXCLUDED.title,
           slug = EXCLUDED.slug,
           root_entity = EXCLUDED.root_entity,
           is_master = EXCLUDED.is_master,
           enable_approval = EXCLUDED.enable_approval,
           parent_form_id = EXCLUDED.parent_form_id,
           view_name = COALESCE(EXCLUDED.view_name, t_form.view_name),
           view_slug = COALESCE(EXCLUDED.view_slug, t_form.view_slug),
           updated_at = NOW()`,
        {
          replacements: {
            form_id: formData.form_id,
            title: formData.title,
            slug: formData.slug,
            root_entity: rootEntityStr,
            is_master: isMaster,
            enable_approval: enableApproval,
            parent_form_id: parentFormId,
            view_name: viewName,
            view_slug: viewSlug,
          },
          type: sequelize.QueryTypes.INSERT,
        }
      );

      const formId = formData.form_id;

      // Upsert Sections
      for (const sec of formData.sections) {
        const relStr = sec.relation ? JSON.stringify(sec.relation) : null;
        const ctxStr = sec.context ? JSON.stringify(sec.context) : null;
        const fieldsStr = JSON.stringify(sec.fields);

        await sequelize.query(
          `INSERT INTO t_section (
             section_id, section_form_id, section_label, type, slug, "table",
             primary_key, relation, context, fields, is_active, created_by, updated_by
           ) VALUES (
             :section_id, :form_id, :section_label, :type, :slug, :table,
             :primary_key, :relation::jsonb, :context::jsonb, :fields::jsonb, TRUE, 1, 1
           ) ON CONFLICT (section_id) DO UPDATE SET
             section_label = EXCLUDED.section_label,
             type = EXCLUDED.type,
             slug = EXCLUDED.slug,
             "table" = EXCLUDED."table",
             primary_key = EXCLUDED.primary_key,
             relation = EXCLUDED.relation,
             context = COALESCE(EXCLUDED.context, t_section.context),
             fields = EXCLUDED.fields,
             updated_at = NOW()`,
          {
            replacements: {
              section_id: sec.section_id,
              form_id: formId,
              section_label: sec.section_label,
              type: sec.type,
              slug: sec.slug,
              table: sec.table,
              primary_key: sec.primary_key,
              relation: relStr,
              context: ctxStr,
              fields: fieldsStr,
            },
            type: sequelize.QueryTypes.INSERT,
          }
        );
      }
    }

    // 3. Seed Menu Item for Request for Proposal (marked as protected core system menu)
    await sequelize.query(`
      INSERT INTO t_menus (label, icon, image, url, "order", module_key, is_configurator, is_public, is_active, is_system, is_deletable)
      SELECT 'Request for Proposal', 'FileProtectOutlined', NULL, '/admin/request-for-proposal', 15, 'request_for_proposal', FALSE, FALSE, TRUE, TRUE, FALSE
      WHERE NOT EXISTS (
        SELECT 1 FROM t_menus WHERE url = '/admin/request-for-proposal' OR module_key = 'request_for_proposal'
      );
    `);

    // 4. Seed Module & Permissions for Request for Proposal
    await sequelize.query(`
      INSERT INTO t_modules (key, label, icon, "order")
      VALUES ('request_for_proposal', 'Request for Proposal', 'file', 16)
      ON CONFLICT (key) DO NOTHING;
    `);

    const baseActions = ["list", "add", "edit", "delete", "export", "view"];
    const [adminRole] = await sequelize.query(`SELECT id FROM t_roles WHERE slug = 'admin' AND deleted_at IS NULL LIMIT 1`);
    const adminRoleId = adminRole?.[0]?.id;

    for (const act of baseActions) {
      const permKey = `request_for_proposal.${act}`;
      const permLabel = `Request for Proposal - ${act.toUpperCase()}`;

      const [permRes] = await sequelize.query(`
        INSERT INTO t_permissions (key, label, type, module)
        VALUES (:key, :label, :type, 'request_for_proposal')
        ON CONFLICT (key) DO UPDATE
          SET label = EXCLUDED.label, type = EXCLUDED.type, module = EXCLUDED.module, deleted_at = NULL
        RETURNING id;
      `, {
        replacements: { key: permKey, label: permLabel, type: act }
      });

      const permId = permRes?.[0]?.id;
      if (adminRoleId && permId) {
        await sequelize.query(`
          INSERT INTO t_role_permissions (role_id, permission_id)
          VALUES (:role_id, :perm_id)
          ON CONFLICT (role_id, permission_id)
          DO UPDATE SET deleted_at = NULL, updated_at = NOW();
        `, {
          replacements: { role_id: adminRoleId, perm_id: permId }
        });
      }
    }

    // 5. Seed Menu Item for RFP Evaluation Criteria under Masters
    const [mastersMenu] = await sequelize.query(`SELECT id FROM t_menus WHERE label = 'Masters' OR url = 'masters' LIMIT 1`);
    const mastersParentId = mastersMenu?.[0]?.id || null;

    const [existingCriteriaMenu] = await sequelize.query(`
      SELECT id FROM t_menus 
      WHERE url = 'rfp_evaluation_criteria' 
         OR url = '/admin/masters/rfp_evaluation_criteria' 
         OR url = 'masters/rfp_evaluation_criteria'
         OR module_key = 'rfp_evaluation_criteria'
         OR (label = 'Criteria' AND parent_id = :parent_id)
         OR (label = 'RFP Evaluation Criteria' AND parent_id = :parent_id)
      LIMIT 1
    `, { replacements: { parent_id: mastersParentId } });

    if (existingCriteriaMenu && existingCriteriaMenu.length > 0) {
      await sequelize.query(`
        UPDATE t_menus 
        SET label = 'RFP Evaluation Criteria',
            icon = 'FormOutlined',
            url = 'rfp_evaluation_criteria',
            module_key = 'rfp_evaluation_criteria',
            parent_id = :parent_id,
            is_active = TRUE
        WHERE id = :id
      `, { replacements: { id: existingCriteriaMenu[0].id, parent_id: mastersParentId } });
    } else {
      await sequelize.query(`
        INSERT INTO t_menus (label, icon, image, url, "order", parent_id, module_key, is_configurator, is_public, is_active, is_system, is_deletable)
        VALUES ('RFP Evaluation Criteria', 'FormOutlined', NULL, 'rfp_evaluation_criteria', 25, :parent_id, 'rfp_evaluation_criteria', FALSE, FALSE, TRUE, TRUE, FALSE)
      `, { replacements: { parent_id: mastersParentId } });
    }

    // 6. Seed Module & Permissions for RFP Evaluation Criteria
    await sequelize.query(`
      INSERT INTO t_modules (key, label, icon, "order")
      VALUES ('rfp_evaluation_criteria', 'RFP Evaluation Criteria', 'forms', 25)
      ON CONFLICT (key) DO NOTHING;
    `);

    for (const act of baseActions) {
      const permKey = `rfp_evaluation_criteria.${act}`;
      const permLabel = `RFP Evaluation Criteria - ${act.toUpperCase()}`;

      const [permRes] = await sequelize.query(`
        INSERT INTO t_permissions (key, label, type, module)
        VALUES (:key, :label, :type, 'rfp_evaluation_criteria')
        ON CONFLICT (key) DO UPDATE
          SET label = EXCLUDED.label, type = EXCLUDED.type, module = EXCLUDED.module, deleted_at = NULL
        RETURNING id;
      `, {
        replacements: { key: permKey, label: permLabel, type: act }
      });

      const permId = permRes?.[0]?.id;
      if (adminRoleId && permId) {
        await sequelize.query(`
          INSERT INTO t_role_permissions (role_id, permission_id)
          VALUES (:role_id, :perm_id)
          ON CONFLICT (role_id, permission_id)
          DO UPDATE SET deleted_at = NULL, updated_at = NOW();
        `, {
          replacements: { role_id: adminRoleId, perm_id: permId }
        });
      }
    }

    // 7. Seed Module & Permissions for RFP Submission
    await sequelize.query(`
      INSERT INTO t_modules (key, label, icon, "order")
      VALUES ('rfp_submission', 'RFP Submissions', 'file', 26)
      ON CONFLICT (key) DO NOTHING;
    `);

    for (const act of baseActions) {
      const permKey = `rfp_submission.${act}`;
      const permLabel = `RFP Submission - ${act.toUpperCase()}`;

      const [permRes] = await sequelize.query(`
        INSERT INTO t_permissions (key, label, type, module)
        VALUES (:key, :label, :type, 'rfp_submission')
        ON CONFLICT (key) DO UPDATE
          SET label = EXCLUDED.label, type = EXCLUDED.type, module = EXCLUDED.module, deleted_at = NULL
        RETURNING id;
      `, {
        replacements: { key: permKey, label: permLabel, type: act }
      });

      const permId = permRes?.[0]?.id;
      if (permId) {
        if (adminRoleId) {
          await sequelize.query(`
            INSERT INTO t_role_permissions (role_id, permission_id)
            VALUES (:role_id, :perm_id)
            ON CONFLICT (role_id, permission_id)
            DO UPDATE SET deleted_at = NULL, updated_at = NOW();
          `, {
            replacements: { role_id: adminRoleId, perm_id: permId }
          });
        }
        // Grant permissions to NGO role (role 6 / slug 'ngo')
        const [ngoRoles] = await sequelize.query(`
          SELECT id FROM t_roles WHERE slug = 'ngo' OR id = 6;
        `);
        for (const nr of (ngoRoles || [])) {
          await sequelize.query(`
            INSERT INTO t_role_permissions (role_id, permission_id)
            VALUES (:role_id, :perm_id)
            ON CONFLICT (role_id, permission_id)
            DO UPDATE SET deleted_at = NULL, updated_at = NOW();
          `, {
            replacements: { role_id: nr.id, perm_id: permId }
          });
        }
      }
    }

    // 8. Seed Module & Permissions for RFP Float
    await sequelize.query(`
      INSERT INTO t_modules (key, label, icon, "order")
      VALUES ('rfp_float', 'RFP Float', 'send', 27)
      ON CONFLICT (key) DO NOTHING;
    `);

    for (const act of baseActions) {
      const permKey = `rfp_float.${act}`;
      const permLabel = `RFP Float - ${act.toUpperCase()}`;

      const [permRes] = await sequelize.query(`
        INSERT INTO t_permissions (key, label, type, module)
        VALUES (:key, :label, :type, 'rfp_float')
        ON CONFLICT (key) DO UPDATE
          SET label = EXCLUDED.label, type = EXCLUDED.type, module = EXCLUDED.module, deleted_at = NULL
        RETURNING id;
      `, {
        replacements: { key: permKey, label: permLabel, type: act }
      });

      const permId = permRes?.[0]?.id;
      if (permId && adminRoleId) {
        await sequelize.query(`
          INSERT INTO t_role_permissions (role_id, permission_id)
          VALUES (:role_id, :perm_id)
          ON CONFLICT (role_id, permission_id)
          DO UPDATE SET deleted_at = NULL, updated_at = NOW();
        `, {
          replacements: { role_id: adminRoleId, perm_id: permId }
        });
      }
    }

    // 9. Seed Menu Item for Financial Year under Masters
    // First, clean up any duplicate Financial Year entries (keep the lowest id)
    const [allFyMenus] = await sequelize.query(`
      SELECT id FROM t_menus
      WHERE (url = 'financial_year'
         OR url = '/admin/masters/financial_year'
         OR url = 'masters/financial_year'
         OR (module_key = 'financial_year' AND parent_id = :parent_id)
         OR (label = 'Financial Year' AND parent_id = :parent_id))
      AND deleted_at IS NULL
      ORDER BY id ASC
    `, { replacements: { parent_id: mastersParentId } });

    if (allFyMenus && allFyMenus.length > 1) {
      // Keep the first (lowest id), soft-delete the rest
      const idsToRemove = allFyMenus.slice(1).map(r => r.id);
      await sequelize.query(`
        UPDATE t_menus SET deleted_at = NOW() WHERE id IN (:ids)
      `, { replacements: { ids: idsToRemove } });
    }

    const existingFyId = allFyMenus && allFyMenus.length > 0 ? allFyMenus[0].id : null;

    if (existingFyId) {
      // Update label/icon/url/module_key but DO NOT touch is_active — preserve admin's choice
      await sequelize.query(`
        UPDATE t_menus
        SET label = 'Financial Year',
            icon = 'CalendarOutlined',
            url = 'masters/financial_year',
            module_key = 'financial_year',
            parent_id = :parent_id
        WHERE id = :id
      `, { replacements: { id: existingFyId, parent_id: mastersParentId } });
    } else {
      await sequelize.query(`
        INSERT INTO t_menus (label, icon, image, url, "order", parent_id, module_key, is_configurator, is_public, is_active, is_system, is_deletable)
        VALUES ('Financial Year', 'CalendarOutlined', NULL, 'masters/financial_year', 1, :parent_id, 'financial_year', FALSE, FALSE, TRUE, TRUE, FALSE)
      `, { replacements: { parent_id: mastersParentId } });
    }

    // 10. Seed Module & Permissions for Financial Year
    await sequelize.query(`
      INSERT INTO t_modules (key, label, icon, "order")
      VALUES ('financial_year', 'Financial Year', 'calendar', 10)
      ON CONFLICT (key) DO NOTHING;
    `);

    for (const act of baseActions) {
      const permKey = `financial_year.${act}`;
      const permLabel = `Financial Year - ${act.toUpperCase()}`;

      const [permRes] = await sequelize.query(`
        INSERT INTO t_permissions (key, label, type, module)
        VALUES (:key, :label, :type, 'financial_year')
        ON CONFLICT (key) DO UPDATE
          SET label = EXCLUDED.label, type = EXCLUDED.type, module = EXCLUDED.module, deleted_at = NULL
        RETURNING id;
      `, {
        replacements: { key: permKey, label: permLabel, type: act }
      });

      const permId = permRes?.[0]?.id;
      if (adminRoleId && permId) {
        await sequelize.query(`
          INSERT INTO t_role_permissions (role_id, permission_id)
          VALUES (:role_id, :perm_id)
          ON CONFLICT (role_id, permission_id)
          DO UPDATE SET deleted_at = NULL, updated_at = NOW();
        `, {
          replacements: { role_id: adminRoleId, perm_id: permId }
        });
      }
    }

    console.log("[Seed Core Forms] ✅ Successfully seeded Implementation Partner, Due Diligence, Request for Proposal, RFP Evaluation Criteria, Financial Year, RFP Proposal Submission, and RFP Float forms and menus!");
  } catch (err) {
    console.error("[Seed Core Forms] ❌ Failed to seed core forms:", err.message);
  }
}

if (require.main === module) {
  seedCoreForms().then(() => process.exit(0));
}

module.exports = { seedCoreForms };

