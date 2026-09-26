// server/scripts/seedVolunteeringForms.js
// ============================================================
// Employee Volunteering Seeder
// Seeds Volunteering Program, Event Creation, Event Budget,
// and Event Type Master into t_form, t_section, t_modules,
// t_permissions, and physical PostgreSQL database tables.
// ============================================================

require("dotenv").config();
const { sequelize } = require("../src/config/db.config");

const EVENT_TYPES_SEED = [
  { type_code: "TREE_PLANTATION", type_name: "Tree plantation", color: "#16a34a", description: "Tree plantation and urban greening drives" },
  { type_code: "WATER_CONSERVATION", type_name: "Water conservation", color: "#0284c7", description: "Water body cleaning, rainwater harvesting and conservation" },
  { type_code: "POND_RESTORATION", type_name: "Pond restoration", color: "#0891b2", description: "Desilting, revival and cleaning of rural/urban ponds" },
  { type_code: "EDUCATION", type_name: "Education", color: "#7c3aed", description: "Remedial teaching, career guidance and literacy programs" },
  { type_code: "SCHOOL_VOLUNTEERING", type_name: "School volunteering", color: "#9333ea", description: "School infrastructure painting, library setup and mentoring" },
  { type_code: "HEALTH_CAMP", type_name: "Health camp", color: "#dc2626", description: "Free medical screening, eye care and dental checkups" },
  { type_code: "COMMUNITY_DEVELOPMENT", type_name: "Community development", color: "#ea580c", description: "Sanitation, local outreach and community engagement" },
  { type_code: "SKILL_DEVELOPMENT", type_name: "Skill development", color: "#d97706", description: "Vocational training, resume building and digital literacy" },
  { type_code: "DONATION_DRIVE", type_name: "Donation drive", color: "#ca8a04", description: "Clothes, books, food and essential supplies distribution" },
  { type_code: "CLEANLINESS_DRIVE", type_name: "Cleanliness drive", color: "#059669", description: "Swachh Bharat cleanliness and waste segregation drives" },
  { type_code: "DISASTER_RELIEF", type_name: "Disaster relief", color: "#e11d48", description: "Emergency relief packaging and disaster response support" },
  { type_code: "LIVELIHOOD_SUPPORT", type_name: "Livelihood support", color: "#2563eb", description: "Micro-enterprise support and artisan mentoring" },
  { type_code: "OTHER", type_name: "Other", color: "#475569", description: "Other volunteering activities and campaigns" }
];

const VOLUNTEERING_FORMS = [
  // ── 1. Volunteering Program Form ────────────────────────────────
  {
    form_id: "frm_vol_program_01",
    title: "Volunteering Program",
    slug: "volunteering_program",
    root_entity: {
      table: "t_frm_volunteering_program",
      modal_size: "1200",
      primary_key: "id",
    },
    is_master: false,
    enable_approval: false,
    sections: [
      {
        section_id: "sec_vol_program_info",
        section_label: "Program Information",
        type: "general",
        slug: "volunteering_program_info",
        table: "t_frm_volunteering_program",
        primary_key: "id",
        relation: null,
        fields: [
          {
            id: "fld_prog_id",
            ui: { placeholder: "e.g. VP-2025-001", icon: "KeyOutlined" },
            type: "text",
            label: "Program ID",
            visible: true,
            db_field: "program_id",
            messages: { required: "Program ID is required" },
            required: true,
            data_type: "varchar(100)",
            column_name: "program_id",
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: "fld_prog_name",
            ui: { placeholder: "Enter Program Name", icon: "FolderOutlined" },
            type: "text",
            label: "Program Name",
            visible: true,
            db_field: "program_name",
            messages: { required: "Program name is required" },
            required: true,
            data_type: "varchar(255)",
            column_name: "program_name",
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: "fld_csr_theme",
            ui: { placeholder: "Select CSR Theme" },
            type: "select",
            label: "CSR Theme",
            visible: true,
            db_field: "csr_theme",
            messages: { required: "CSR Theme is required" },
            required: true,
            data_type: "varchar(255)",
            column_name: "csr_theme",
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: "fld_financial_year",
            ui: { placeholder: "Select Financial Year" },
            type: "select",
            label: "Financial Year",
            visible: true,
            db_field: "financial_year",
            messages: { required: "Financial Year is required" },
            required: true,
            data_type: "varchar(50)",
            column_name: "financial_year",
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: "fld_objective",
            ui: { rows: 3, placeholder: "State overarching program objective and scope" },
            type: "textarea",
            label: "Objective",
            visible: true,
            db_field: "objective",
            required: true,
            data_type: "text",
            column_name: "objective",
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: "fld_target_employees",
            ui: { placeholder: "Target employee count" },
            type: "number",
            label: "Target Employees",
            visible: true,
            db_field: "target_employees",
            required: true,
            data_type: "int",
            column_name: "target_employees",
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: "fld_target_events",
            ui: { placeholder: "Target events count" },
            type: "number",
            label: "Target Events",
            visible: true,
            db_field: "target_events",
            required: true,
            data_type: "int",
            column_name: "target_events",
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: "fld_target_hours",
            ui: { placeholder: "Target volunteer hours" },
            type: "number",
            label: "Target Volunteer Hours",
            visible: true,
            db_field: "target_volunteer_hours",
            required: true,
            data_type: "numeric(10,2)",
            column_name: "target_volunteer_hours",
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: "fld_target_beneficiaries",
            ui: { placeholder: "Target beneficiaries" },
            type: "number",
            label: "Target Beneficiaries",
            visible: true,
            db_field: "target_beneficiaries",
            required: false,
            data_type: "int",
            column_name: "target_beneficiaries",
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: "fld_overall_budget",
            ui: { placeholder: "Overall Budget in INR" },
            type: "number",
            label: "Budget (INR)",
            visible: true,
            db_field: "overall_budget",
            required: true,
            data_type: "numeric(15,2)",
            column_name: "overall_budget",
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: "fld_prog_manager",
            ui: { placeholder: "Responsible program manager" },
            type: "text",
            label: "Program Manager",
            visible: true,
            db_field: "program_manager",
            required: false,
            data_type: "varchar(255)",
            column_name: "program_manager",
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: "fld_start_date",
            ui: { placeholder: "Select start date" },
            type: "date",
            label: "Start Date",
            visible: true,
            db_field: "start_date",
            required: true,
            data_type: "date",
            column_name: "start_date",
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: "fld_end_date",
            ui: { placeholder: "Select end date" },
            type: "date",
            label: "End Date",
            visible: true,
            db_field: "end_date",
            required: true,
            data_type: "date",
            column_name: "end_date",
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: "fld_status",
            ui: { placeholder: "Select status" },
            type: "select",
            label: "Status",
            visible: true,
            db_field: "status",
            required: true,
            data_type: "varchar(50)",
            column_name: "status",
            add_to_query: true,
            add_to_list: true,
          }
        ]
      }
    ]
  },

  // ── 2. Volunteering Event Creation Form ─────────────────────────────
  {
    form_id: "frm_vol_event_01",
    title: "Event Creation",
    slug: "volunteering_event",
    root_entity: {
      table: "t_frm_volunteering_event",
      modal_size: "1400",
      primary_key: "id",
    },
    is_master: false,
    enable_approval: true,
    sections: [
      // Section 1: Basic information
      {
        section_id: "sec_vol_event_basic",
        section_label: "Basic information",
        type: "general",
        slug: "volunteering_event_basic",
        table: "t_frm_volunteering_event",
        primary_key: "id",
        relation: null,
        fields: [
          {
            id: "fld_evt_id",
            ui: { placeholder: "e.g. EVT-2025-001" },
            type: "text",
            label: "Event ID",
            visible: true,
            db_field: "event_id",
            required: true,
            data_type: "varchar(100)",
            column_name: "event_id",
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: "fld_evt_name",
            ui: { placeholder: "Enter Event Name" },
            type: "text",
            label: "Event name",
            visible: true,
            db_field: "event_name",
            required: true,
            data_type: "varchar(255)",
            column_name: "event_name",
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: "fld_evt_program",
            ui: { placeholder: "Select Program" },
            type: "select",
            label: "Program",
            visible: true,
            db_field: "program_name",
            required: true,
            data_type: "varchar(255)",
            column_name: "program_name",
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: "fld_evt_csr_theme",
            ui: { placeholder: "Select CSR theme" },
            type: "select",
            label: "CSR theme",
            visible: true,
            db_field: "csr_theme",
            required: true,
            data_type: "varchar(255)",
            column_name: "csr_theme",
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: "fld_evt_type",
            ui: { placeholder: "Select Event type" },
            type: "select",
            label: "Event type",
            visible: true,
            db_field: "event_type",
            required: true,
            data_type: "varchar(100)",
            column_name: "event_type",
            add_to_query: true,
            add_to_list: true,
          }
        ]
      },

      // Section 2: Event description
      {
        section_id: "sec_vol_event_desc",
        section_label: "Event description",
        type: "general",
        slug: "volunteering_event_desc",
        table: "t_frm_volunteering_event",
        primary_key: "id",
        relation: null,
        fields: [
          {
            id: "fld_evt_objective",
            ui: { rows: 2, placeholder: "Enter event objective" },
            type: "textarea",
            label: "Objective",
            visible: true,
            db_field: "objective",
            required: true,
            data_type: "text",
            column_name: "objective",
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: "fld_evt_start_date",
            ui: { placeholder: "Select start date" },
            type: "date",
            label: "Start date",
            visible: true,
            db_field: "start_date",
            required: true,
            data_type: "date",
            column_name: "start_date",
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: "fld_evt_end_date",
            ui: { placeholder: "Select end date" },
            type: "date",
            label: "End date",
            visible: true,
            db_field: "end_date",
            required: true,
            data_type: "date",
            column_name: "end_date",
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: "fld_evt_start_time",
            ui: { placeholder: "Start time (e.g. 09:00 AM)" },
            type: "time",
            label: "Start time",
            visible: true,
            db_field: "start_time",
            required: true,
            data_type: "varchar(50)",
            column_name: "start_time",
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: "fld_evt_end_time",
            ui: { placeholder: "End time (e.g. 01:00 PM)" },
            type: "time",
            label: "End time",
            visible: true,
            db_field: "end_time",
            required: true,
            data_type: "varchar(50)",
            column_name: "end_time",
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: "fld_evt_deadline",
            ui: { placeholder: "Registration deadline" },
            type: "text",
            label: "Registration deadline",
            visible: true,
            db_field: "registration_deadline",
            required: true,
            data_type: "varchar(100)",
            column_name: "registration_deadline",
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: "fld_evt_max_vol",
            ui: { placeholder: "Maximum volunteers" },
            type: "number",
            label: "Maximum volunteers",
            visible: true,
            db_field: "max_volunteers",
            required: true,
            data_type: "int",
            column_name: "max_volunteers",
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: "fld_evt_min_vol",
            ui: { placeholder: "Minimum volunteers" },
            type: "number",
            label: "Minimum volunteers",
            visible: true,
            db_field: "min_volunteers",
            required: false,
            data_type: "int",
            column_name: "min_volunteers",
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: "fld_evt_target_groups",
            ui: { placeholder: "Target employee groups" },
            type: "text",
            label: "Target employee groups",
            visible: true,
            db_field: "target_employee_groups",
            required: false,
            data_type: "text",
            column_name: "target_employee_groups",
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: "fld_evt_ngo",
            ui: { placeholder: "Implementing NGO partner" },
            type: "text",
            label: "Implementing NGO",
            visible: true,
            db_field: "implementing_ngo",
            required: false,
            data_type: "varchar(255)",
            column_name: "implementing_ngo",
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: "fld_evt_coordinator",
            ui: { placeholder: "Event coordinator" },
            type: "text",
            label: "Event coordinator",
            visible: true,
            db_field: "event_coordinator",
            required: false,
            data_type: "varchar(255)",
            column_name: "event_coordinator",
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: "fld_evt_contact",
            ui: { placeholder: "Contact person phone/email" },
            type: "text",
            label: "Contact person",
            visible: true,
            db_field: "contact_person",
            required: false,
            data_type: "varchar(255)",
            column_name: "contact_person",
            add_to_query: true,
            add_to_list: true,
          }
        ]
      },

      // Section 3: Venue
      {
        section_id: "sec_vol_event_venue",
        section_label: "Venue",
        type: "general",
        slug: "volunteering_event_venue",
        table: "t_frm_volunteering_event",
        primary_key: "id",
        relation: null,
        fields: [
          {
            id: "fld_evt_location",
            ui: { placeholder: "Event location name" },
            type: "text",
            label: "Event Location",
            visible: true,
            db_field: "event_location",
            required: true,
            data_type: "varchar(500)",
            column_name: "event_location",
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: "fld_evt_lat_lon",
            ui: { placeholder: "Latitude, Longitude (e.g. 19.0448, 72.8550)" },
            type: "text",
            label: "Let Lon",
            visible: true,
            db_field: "lat_lon",
            required: false,
            data_type: "varchar(100)",
            column_name: "lat_lon",
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: "fld_evt_meeting_point",
            ui: { placeholder: "Meeting point details" },
            type: "text",
            label: "Meeting point",
            visible: true,
            db_field: "meeting_point",
            required: false,
            data_type: "varchar(255)",
            column_name: "meeting_point",
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: "fld_evt_distance",
            ui: { placeholder: "Distance in km" },
            type: "number",
            label: "Distance from office",
            visible: true,
            db_field: "distance_from_office",
            required: false,
            data_type: "numeric(10,2)",
            column_name: "distance_from_office",
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: "fld_evt_address",
            ui: { rows: 2, placeholder: "Complete address of venue" },
            type: "textarea",
            label: "Address",
            visible: true,
            db_field: "address",
            required: false,
            data_type: "text",
            column_name: "address",
            add_to_query: true,
            add_to_list: true,
          }
        ]
      },

      // Section 4: Event Objectives
      {
        section_id: "sec_vol_event_objectives",
        section_label: "Event Objectives",
        type: "general",
        slug: "volunteering_event_objectives",
        table: "t_frm_volunteering_event",
        primary_key: "id",
        relation: null,
        fields: [
          {
            id: "fld_evt_detailed_obj",
            ui: { rows: 3, placeholder: "Detailed objectives and target deliverables" },
            type: "textarea",
            label: "Objectives",
            visible: true,
            db_field: "detailed_objectives",
            required: false,
            data_type: "text",
            column_name: "detailed_objectives",
            add_to_query: true,
            add_to_list: true,
          }
        ]
      },

      // Section 5: Event Budget (Dynamic Repeater)
      {
        section_id: "sec_vol_event_budget",
        section_label: "Event Budget",
        type: "add_more",
        slug: "volunteering_event_budget",
        table: "t_frm_volunteering_event_budget",
        primary_key: "id",
        relation: {
          foreign_key: "parent_id",
          parent_table: "t_frm_volunteering_event",
        },
        context: {
          allow_add_rows: true,
          is_master_driven: false,
          allow_delete_rows: true,
        },
        fields: [
          {
            id: "fld_bgt_head",
            ui: { placeholder: "Select / Enter Budget head" },
            type: "text",
            label: "Budget head",
            visible: true,
            db_field: "budget_head",
            required: true,
            data_type: "varchar(255)",
            column_name: "budget_head",
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: "fld_bgt_desc",
            ui: { placeholder: "Description / specifics" },
            type: "text",
            label: "Description",
            visible: true,
            db_field: "description",
            required: false,
            data_type: "text",
            column_name: "description",
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: "fld_bgt_qty",
            ui: { placeholder: "Quantity" },
            type: "number",
            label: "Quantity",
            visible: true,
            db_field: "quantity",
            required: true,
            data_type: "numeric(10,2)",
            column_name: "quantity",
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: "fld_bgt_unit",
            ui: { placeholder: "Unit (e.g. Units, Persons, Trips)" },
            type: "text",
            label: "Unit",
            visible: true,
            db_field: "unit",
            required: true,
            data_type: "varchar(50)",
            column_name: "unit",
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: "fld_bgt_rate",
            ui: { placeholder: "Rate in INR" },
            type: "number",
            label: "Rate",
            visible: true,
            db_field: "rate",
            required: true,
            data_type: "numeric(15,2)",
            column_name: "rate",
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: "fld_bgt_amt",
            ui: { placeholder: "Estimated amount" },
            type: "number",
            label: "Estimated amount",
            visible: true,
            db_field: "estimated_amount",
            required: true,
            data_type: "numeric(15,2)",
            column_name: "estimated_amount",
            add_to_query: true,
            add_to_list: true,
          }
        ]
      }
    ]
  },

  // ── 3. Event Type Master Form ────────────────────────────────
  {
    form_id: "frm_event_type_01",
    title: "Event Type Master",
    slug: "event_type",
    root_entity: {
      table: "t_frm_event_type",
      modal_size: "800",
      primary_key: "id",
    },
    is_master: true,
    enable_approval: false,
    sections: [
      {
        section_id: "sec_event_type_basic",
        section_label: "Event Type Details",
        type: "general",
        slug: "event_type_basic",
        table: "t_frm_event_type",
        primary_key: "id",
        relation: null,
        fields: [
          {
            id: "fld_evt_type_name",
            ui: { placeholder: "e.g. Tree plantation" },
            type: "text",
            label: "Event Type Name",
            visible: true,
            db_field: "type_name",
            required: true,
            data_type: "varchar(255)",
            column_name: "type_name",
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: "fld_evt_type_code",
            ui: { placeholder: "e.g. TREE_PLANTATION" },
            type: "text",
            label: "Type Code",
            visible: true,
            db_field: "type_code",
            required: true,
            data_type: "varchar(100)",
            column_name: "type_code",
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: "fld_evt_type_color",
            ui: { placeholder: "Color hex code (#16a34a)" },
            type: "text",
            label: "Color Code",
            visible: true,
            db_field: "color",
            required: false,
            data_type: "varchar(50)",
            column_name: "color",
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: "fld_evt_type_desc",
            ui: { rows: 2, placeholder: "Description of event activities" },
            type: "textarea",
            label: "Description",
            visible: true,
            db_field: "description",
            required: false,
            data_type: "text",
            column_name: "description",
            add_to_query: true,
            add_to_list: true,
          }
        ]
      }
    ]
  },

  // ── 4. Volunteer Enrolment & Attendance Form ─────────────────────────
  {
    form_id: "frm_vol_volunteer_01",
    title: "Volunteer Enrolment & Attendance",
    slug: "volunteering_event_volunteer",
    root_entity: {
      table: "t_frm_volunteering_event_volunteer",
      modal_size: "1000",
      primary_key: "id",
    },
    is_master: false,
    enable_approval: false,
    sections: [
      {
        section_id: "sec_vol_volunteer_info",
        section_label: "Volunteer Details & Attendance",
        type: "general",
        slug: "volunteering_volunteer_info",
        table: "t_frm_volunteering_event_volunteer",
        primary_key: "id",
        relation: {
          foreign_key: "event_id",
          parent_table: "t_frm_volunteering_event"
        },
        fields: [
          {
            id: "fld_v_event_id",
            ui: { placeholder: "Event ID" },
            type: "number",
            label: "Event ID",
            visible: true,
            db_field: "event_id",
            required: true,
            data_type: "int",
            column_name: "event_id",
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: "fld_v_user_id",
            ui: { placeholder: "User ID" },
            type: "number",
            label: "User ID",
            visible: true,
            db_field: "user_id",
            required: false,
            data_type: "int",
            column_name: "user_id",
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: "fld_v_emp_id",
            ui: { placeholder: "Employee Code / ID" },
            type: "text",
            label: "Employee Code",
            visible: true,
            db_field: "emp_id",
            required: true,
            data_type: "varchar(100)",
            column_name: "emp_id",
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: "fld_v_name",
            ui: { placeholder: "Employee Name" },
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
            id: "fld_v_email",
            ui: { placeholder: "Email address" },
            type: "text",
            label: "Email",
            visible: true,
            db_field: "email",
            required: true,
            data_type: "varchar(255)",
            column_name: "email",
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: "fld_v_dept",
            ui: { placeholder: "Department" },
            type: "text",
            label: "Department",
            visible: true,
            db_field: "dept",
            required: false,
            data_type: "varchar(150)",
            column_name: "dept",
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: "fld_v_phone",
            ui: { placeholder: "Phone Number" },
            type: "text",
            label: "Phone",
            visible: true,
            db_field: "phone",
            required: false,
            data_type: "varchar(50)",
            column_name: "phone",
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: "fld_v_status",
            ui: { placeholder: "Status (Invited, Accepted, Attended, Declined)" },
            type: "select",
            label: "Status",
            visible: true,
            db_field: "status",
            required: true,
            data_type: "varchar(50)",
            column_name: "status",
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: "fld_v_check_in",
            ui: { placeholder: "Check-in time" },
            type: "text",
            label: "Check-in",
            visible: true,
            db_field: "check_in",
            required: false,
            data_type: "varchar(50)",
            column_name: "check_in",
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: "fld_v_check_out",
            ui: { placeholder: "Check-out time" },
            type: "text",
            label: "Check-out",
            visible: true,
            db_field: "check_out",
            required: false,
            data_type: "varchar(50)",
            column_name: "check_out",
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: "fld_v_hours",
            ui: { placeholder: "Hours volunteered" },
            type: "number",
            label: "Hours",
            visible: true,
            db_field: "hours",
            required: false,
            data_type: "numeric(6,2)",
            column_name: "hours",
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: "fld_v_feedback",
            ui: { placeholder: "Feedback & ratings" },
            type: "json",
            label: "Feedback Form",
            visible: true,
            db_field: "feedback_form",
            required: false,
            data_type: "jsonb",
            column_name: "feedback_form",
            add_to_query: true,
            add_to_list: false,
          },
          {
            id: "fld_v_photos",
            ui: { placeholder: "Upload Event Photos / Selfies" },
            type: "file",
            label: "Event Photos",
            visible: true,
            db_field: "photos",
            required: false,
            data_type: "jsonb",
            column_name: "photos",
            add_to_query: true,
            add_to_list: false,
          },
          {
            id: "fld_v_attachments",
            ui: { placeholder: "Upload Supporting Documents / Certificates" },
            type: "file",
            label: "Documents / Certificates",
            visible: true,
            db_field: "attachments",
            required: false,
            data_type: "jsonb",
            column_name: "attachments",
            add_to_query: true,
            add_to_list: false,
          },
          {
            id: "fld_v_registered_at",
            ui: { placeholder: "Registration date & time" },
            type: "date",
            label: "Registered At",
            visible: true,
            db_field: "registered_at",
            required: false,
            data_type: "timestamp without time zone",
            column_name: "registered_at",
            add_to_query: true,
            add_to_list: true,
          }
        ]
      }
    ]
  }
];

async function seedVolunteeringForms() {
  console.log("[Seed Volunteering] Starting Employee Volunteering seeding...");

  try {
    // 1. Create Physical Tables in PostgreSQL
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS t_frm_event_type (
        id SERIAL PRIMARY KEY,
        type_code VARCHAR(100) UNIQUE,
        type_name VARCHAR(255),
        color VARCHAR(50) DEFAULT '#2563eb',
        description TEXT,
        status BOOLEAN DEFAULT TRUE,
        is_active BOOLEAN DEFAULT TRUE,
        created_by INT DEFAULT 1,
        updated_by INT DEFAULT 1,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
        deleted_at TIMESTAMP WITHOUT TIME ZONE
      );

      CREATE TABLE IF NOT EXISTS t_frm_volunteering_program (
        id SERIAL PRIMARY KEY,
        program_id VARCHAR(100) UNIQUE,
        program_name VARCHAR(255),
        csr_theme VARCHAR(255),
        financial_year VARCHAR(50),
        objective TEXT,
        target_employees INT DEFAULT 0,
        target_events INT DEFAULT 0,
        target_volunteer_hours NUMERIC(10,2) DEFAULT 0,
        target_beneficiaries INT DEFAULT 0,
        overall_budget NUMERIC(15,2) DEFAULT 0,
        program_manager VARCHAR(255),
        start_date DATE,
        end_date DATE,
        status VARCHAR(50) DEFAULT 'Active',
        achieved_events INT DEFAULT 0,
        achieved_employees INT DEFAULT 0,
        achieved_hours NUMERIC(10,2) DEFAULT 0,
        created_by INT DEFAULT 1,
        updated_by INT DEFAULT 1,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
        deleted_at TIMESTAMP WITHOUT TIME ZONE
      );

      CREATE TABLE IF NOT EXISTS t_frm_volunteering_event (
        id SERIAL PRIMARY KEY,
        event_id VARCHAR(100) UNIQUE,
        event_name VARCHAR(255),
        program_id VARCHAR(100),
        program_name VARCHAR(255),
        csr_theme VARCHAR(255),
        event_type VARCHAR(100),
        objective TEXT,
        start_date DATE,
        end_date DATE,
        event_date DATE,
        start_time VARCHAR(50),
        end_time VARCHAR(50),
        registration_deadline VARCHAR(100),
        max_volunteers INT DEFAULT 0,
        min_volunteers INT DEFAULT 0,
        registered_count INT DEFAULT 0,
        attended_count INT DEFAULT 0,
        target_employee_groups TEXT,
        implementing_ngo VARCHAR(255),
        event_coordinator VARCHAR(255),
        contact_person VARCHAR(255),
        event_location VARCHAR(500),
        lat_lon VARCHAR(100),
        meeting_point VARCHAR(255),
        distance_from_office NUMERIC(10,2) DEFAULT 0,
        address TEXT,
        detailed_objectives TEXT,
        total_budget NUMERIC(15,2) DEFAULT 0,
        budget_items JSONB DEFAULT '[]'::jsonb,
        approval_status VARCHAR(50) DEFAULT 'DRAFT',
        approval_history JSONB DEFAULT '[]'::jsonb,
        volunteers JSONB DEFAULT '[]'::jsonb,
        media JSONB DEFAULT '[]'::jsonb,
        closure_summary JSONB DEFAULT '{}'::jsonb,
        story JSONB DEFAULT '{}'::jsonb,
        status VARCHAR(50) DEFAULT 'Active',
        created_by INT DEFAULT 1,
        updated_by INT DEFAULT 1,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
        deleted_at TIMESTAMP WITHOUT TIME ZONE
      );

      CREATE TABLE IF NOT EXISTS t_frm_volunteering_event_budget (
        id SERIAL PRIMARY KEY,
        parent_id INT,
        event_id VARCHAR(100),
        budget_head VARCHAR(255),
        description TEXT,
        quantity NUMERIC(10,2) DEFAULT 1,
        unit VARCHAR(50) DEFAULT 'Units',
        rate NUMERIC(15,2) DEFAULT 0,
        estimated_amount NUMERIC(15,2) DEFAULT 0,
        created_by INT DEFAULT 1,
        updated_by INT DEFAULT 1,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
        deleted_at TIMESTAMP WITHOUT TIME ZONE
      );

      CREATE TABLE IF NOT EXISTS t_frm_volunteering_event_volunteer (
        id SERIAL PRIMARY KEY,
        event_id INT,
        user_id INT,
        emp_id VARCHAR(100),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        dept VARCHAR(150),
        phone VARCHAR(50),
        status VARCHAR(50) DEFAULT 'Invited',
        check_in VARCHAR(50),
        check_out VARCHAR(50),
        hours NUMERIC(6,2) DEFAULT 0,
        feedback_form JSONB,
        photos JSONB DEFAULT '[]'::jsonb,
        attachments JSONB DEFAULT '[]'::jsonb,
        registered_at TIMESTAMP WITHOUT TIME ZONE,
        created_by INT DEFAULT 1,
        updated_by INT DEFAULT 1,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
        deleted_at TIMESTAMP WITHOUT TIME ZONE
      );
    `);

    // Migrate any data from legacy t_volunteering_event_volunteers if it exists
    await sequelize.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 't_volunteering_event_volunteers') THEN
          INSERT INTO t_frm_volunteering_event_volunteer (
            event_id, user_id, emp_id, name, email, dept, phone, status, 
            check_in, check_out, hours, feedback_form, registered_at, 
            created_at, updated_at, deleted_at
          )
          SELECT 
            event_id, user_id, emp_id, name, email, dept, phone, status, 
            check_in, check_out, hours, feedback_form, registered_at, 
            created_at, updated_at, deleted_at
          FROM t_volunteering_event_volunteers v
          WHERE NOT EXISTS (
            SELECT 1 FROM t_frm_volunteering_event_volunteer fv 
            WHERE fv.event_id = v.event_id AND fv.emp_id = v.emp_id
          );

          DROP TABLE IF EXISTS t_volunteering_event_volunteers CASCADE;
        END IF;
      END $$;

      ALTER TABLE t_frm_volunteering_event ADD COLUMN IF NOT EXISTS start_date DATE;
      ALTER TABLE t_frm_volunteering_event ADD COLUMN IF NOT EXISTS end_date DATE;
      UPDATE t_frm_volunteering_event SET start_date = event_date WHERE start_date IS NULL AND event_date IS NOT NULL;
      UPDATE t_frm_volunteering_event SET end_date = event_date WHERE end_date IS NULL AND event_date IS NOT NULL;
    `).catch(() => {});

    // 2. Seed Master Event Types
    for (const item of EVENT_TYPES_SEED) {
      await sequelize.query(`
        INSERT INTO t_frm_event_type (type_code, type_name, color, description, status, is_active)
        VALUES (:type_code, :type_name, :color, :description, TRUE, TRUE)
        ON CONFLICT (type_code) DO UPDATE
          SET type_name = EXCLUDED.type_name,
              color = EXCLUDED.color,
              description = EXCLUDED.description,
              updated_at = NOW();
      `, {
        replacements: item
      });
    }

    // 3. Upsert Forms and Sections into t_form and t_section
    for (const formData of VOLUNTEERING_FORMS) {
      const rootEntityStr = JSON.stringify(formData.root_entity);

      await sequelize.query(
        `INSERT INTO t_form (
           form_id, title, slug, root_entity, is_master, enable_approval,
           is_active, created_by, updated_by
         ) VALUES (
           :form_id, :title, :slug, :root_entity::jsonb, :is_master, :enable_approval,
           TRUE, 1, 1
         ) ON CONFLICT (form_id) DO UPDATE SET
           title = EXCLUDED.title,
           slug = EXCLUDED.slug,
           root_entity = EXCLUDED.root_entity,
           is_master = EXCLUDED.is_master,
           enable_approval = EXCLUDED.enable_approval,
           updated_at = NOW()`,
        {
          replacements: {
            form_id: formData.form_id,
            title: formData.title,
            slug: formData.slug,
            root_entity: rootEntityStr,
            is_master: formData.is_master,
            enable_approval: formData.enable_approval,
          },
          type: sequelize.QueryTypes.INSERT,
        }
      );

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
              form_id: formData.form_id,
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

    // 4. Seed Initial Programs and Events Data if table is empty
    const [progCount] = await sequelize.query(`SELECT COUNT(*) as count FROM t_frm_volunteering_program`);
    if (parseInt(progCount[0]?.count || 0) === 0) {
      await sequelize.query(`
        INSERT INTO t_frm_volunteering_program (
          program_id, program_name, csr_theme, financial_year, objective,
          target_employees, target_events, target_volunteer_hours, target_beneficiaries,
          overall_budget, program_manager, start_date, end_date, status,
          achieved_events, achieved_employees, achieved_hours
        ) VALUES 
        (
          'VP-2025-001', 'Green Canopy & Eco Restoration Drive', 'Environment & Sustainability', '2024-2025',
          'To mobilize corporate volunteers for extensive urban afforestation, mangrove cleanup, and pond restoration across key city locations.',
          350, 12, 1400.00, 15000, 850000.00, 'Ananya Sharma', '2024-04-01', '2025-03-31', 'Active', 5, 180, 720.00
        ),
        (
          'VP-2025-002', 'STEM & Digital Literacy in Rural Schools', 'Education & Literacy', '2024-2025',
          'Employee-led mentoring and weekend workshops in government schools to enhance digital skills and science learning.',
          200, 8, 800.00, 3000, 450000.00, 'Vikram Malhotra', '2024-06-01', '2025-03-31', 'Active', 3, 95, 380.00
        ),
        (
          'VP-2025-003', 'Community Health & Nutrition Outreach', 'Healthcare & Nutrition', '2024-2025',
          'Organizing periodic health screening camps, blood donation drives, and adolescent nutrition counseling.',
          150, 6, 600.00, 5000, 600000.00, 'Dr. Radhika Sen', '2024-05-15', '2025-02-28', 'Active', 2, 70, 280.00
        );
      `);
    }

    const [evtCount] = await sequelize.query(`SELECT COUNT(*) as count FROM t_frm_volunteering_event`);
    if (parseInt(evtCount[0]?.count || 0) === 0) {
      await sequelize.query(`
        INSERT INTO t_frm_volunteering_event (
          event_id, event_name, program_id, program_name, csr_theme, event_type,
          objective, event_date, start_time, end_time, registration_deadline,
          max_volunteers, min_volunteers, registered_count, attended_count,
          target_employee_groups, implementing_ngo, event_coordinator, contact_person,
          event_location, lat_lon, meeting_point, distance_from_office, address,
          detailed_objectives, total_budget, budget_items, approval_status, approval_history,
          volunteers, media, closure_summary
        ) VALUES 
        (
          'EVT-2025-001', 'Mangrove Cleanup & Sapling Plantation', 'VP-2025-001', 'Green Canopy & Eco Restoration Drive',
          'Environment & Sustainability', 'Tree plantation',
          'Plant 500 indigenous mangrove saplings and clear plastic waste along the coastal belt.',
          '2025-03-22', '07:30 AM', '11:30 AM', '2025-03-20 06:00 PM',
          45, 20, 38, 36,
          'All Employees', 'Green Earth Foundation', 'Rahul Varma', 'Rahul Varma (+91 9876543210)',
          'Mahim Nature Park & Coastal Strip, Mumbai', '19.0448, 72.8550', 'Gate 1 Main Entry', 8.5,
          'Bandra-Sion Link Road, Dharavi, Mumbai, Maharashtra 400017',
          '1. 500 mangrove saplings planted.\\n2. 200kg plastic collected.\\n3. Awareness talk by environmental botanist.',
          55000.00,
          '[{"id":"b1","budget_head":"Materials & Plantation Kits","description":"500 saplings with protective cages","quantity":500,"unit":"Units","rate":60,"estimated_amount":30000},{"id":"b2","budget_head":"Logistics & Transport","description":"Bus for volunteer pickup","quantity":1,"unit":"Trips","rate":12000,"estimated_amount":12000},{"id":"b3","budget_head":"Refreshments & Water","description":"Breakfast boxes and water","quantity":50,"unit":"Persons","rate":180,"estimated_amount":9000},{"id":"b4","budget_head":"Safety & First Aid","description":"Gloves, gumboots, medical kit","quantity":50,"unit":"Units","rate":80,"estimated_amount":4000}]'::jsonb,
          'APPROVED',
          '[{"step":"Created","user":"Rahul Varma","role":"Coordinator","date":"2025-03-01 10:00 AM","status":"Submitted","comments":"Submitted for review."},{"step":"Program Manager Review","user":"Ananya Sharma","role":"Program Manager","date":"2025-03-02 02:30 PM","status":"Approved","comments":"Approved."},{"step":"CSR Head Approval","user":"Suresh Menon","role":"Head of CSR","date":"2025-03-03 11:15 AM","status":"Approved","comments":"Budget approved."}]'::jsonb,
          '[{"id":"v1","emp_id":"EMP0142","name":"Priya Nair","email":"priya.nair@company.com","dept":"Tech","status":"Attended","check_in":"07:35 AM","check_out":"11:35 AM","hours":4.0},{"id":"v2","emp_id":"EMP0209","name":"Amit Joshi","email":"amit.joshi@company.com","dept":"Marketing","status":"Attended","check_in":"07:40 AM","check_out":"11:30 AM","hours":4.0}]'::jsonb,
          '[{"id":"m1","type":"photo","url":"https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=600&auto=format&fit=crop","caption":"Volunteers planting mangrove saplings","author":"Priya Nair"},{"id":"m2","type":"photo","url":"https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=600&auto=format&fit=crop","caption":"Team group photo at Mahim Nature Park","author":"Rahul Varma"}]'::jsonb,
          '{"status":"Closed","actual_beneficiaries":1200,"actual_hours_logged":144,"key_learnings":"High enthusiasm; recommended earlier morning schedule.","rating":4.8}'::jsonb
        ),
        (
          'EVT-2025-002', 'Weekend Robotics & AI Workshop for High Schoolers', 'VP-2025-002', 'STEM & Digital Literacy in Rural Schools',
          'Education & Literacy', 'School volunteering',
          'Conduct hands-on coding and science experiments for 120 students in grades 8-10.',
          '2025-03-29', '09:00 AM', '02:00 PM', '2025-03-27 12:00 PM',
          25, 10, 22, 0,
          'Engineering & Tech, Product', 'Pratham Shiksha Trust', 'Neha Deshmukh', 'Neha Deshmukh (+91 9820112233)',
          'Zilla Parishad High School, Thane West', '19.2183, 72.9781', 'School Auditorium', 22.0,
          'Near Old Talao, Station Road, Thane West 400601',
          '1. 120 students trained.\\n2. Arduino kits distributed.\\n3. Career counseling.',
          56000.00,
          '[{"id":"b1","budget_head":"Materials & Plantation Kits","description":"Arduino Student Kits","quantity":12,"unit":"Kits","rate":2500,"estimated_amount":30000},{"id":"b2","budget_head":"Refreshments & Water","description":"Lunch for students and volunteers","quantity":150,"unit":"Persons","rate":120,"estimated_amount":18000},{"id":"b3","budget_head":"Logistics & Transport","description":"Transport van","quantity":1,"unit":"Trips","rate":8000,"estimated_amount":8000}]'::jsonb,
          'PENDING_CSR_HEAD',
          '[{"step":"Created","user":"Neha Deshmukh","role":"Coordinator","date":"2025-03-10 11:00 AM","status":"Submitted","comments":"Submitted."},{"step":"Program Manager Review","user":"Vikram Malhotra","role":"Program Manager","date":"2025-03-11 04:00 PM","status":"Approved","comments":"Verified schedule."}]'::jsonb,
          '[]'::jsonb, '[]'::jsonb, '{}'::jsonb
        ),
        (
          'EVT-2025-003', 'Community Health Screening & Blood Donation Camp', 'VP-2025-003', 'Community Health & Nutrition Outreach',
          'Healthcare & Nutrition', 'Health camp',
          'Provide free diagnostic tests, general physician consultations, and blood donation facility.',
          '2025-04-05', '08:30 AM', '03:30 PM', '2025-04-03 05:00 PM',
          35, 15, 18, 0,
          'All Employees', 'Rotary Health Alliance', 'Siddharth Das', 'Siddharth Das (+91 9711223344)',
          'Community Hall, Kurla East', '19.0657, 72.8794', 'Community Hall Reception', 6.0,
          'Nehru Nagar, Kurla East, Mumbai 400024',
          '1. 400 residents screened.\\n2. 75 blood units collected.\\n3. Nutrition kits provided.',
          61000.00,
          '[{"id":"b1","budget_head":"Trainer / Expert Honorarium","description":"Honorarium for doctors","quantity":7,"unit":"Persons","rate":3000,"estimated_amount":21000},{"id":"b2","budget_head":"Safety & First Aid","description":"Medical strips, gloves","quantity":1,"unit":"Lump sum","rate":25000,"estimated_amount":25000},{"id":"b3","budget_head":"Refreshments & Water","description":"Snacks and juice","quantity":100,"unit":"Persons","rate":150,"estimated_amount":15000}]'::jsonb,
          'DRAFT',
          '[{"step":"Created","user":"Siddharth Das","role":"Coordinator","date":"2025-03-14 03:00 PM","status":"Draft","comments":"Drafting schedule."}]'::jsonb,
          '[]'::jsonb, '[]'::jsonb, '{}'::jsonb
        );
      `);
    }

    // 5. Seed Modules and Permissions for Volunteering
    const modulesToSeed = [
      { key: "volunteering_program", label: "Volunteering Program", icon: "folder", order: 30 },
      { key: "volunteering_event", label: "Volunteering Event", icon: "calendar", order: 31 },
      { key: "event_type", label: "Event Type Master", icon: "appstore", order: 32 }
    ];

    for (const mod of modulesToSeed) {
      await sequelize.query(`
        INSERT INTO t_modules (key, label, icon, "order")
        VALUES (:key, :label, :icon, :order)
        ON CONFLICT (key) DO NOTHING;
      `, { replacements: mod });
    }

    const baseActions = ["list", "add", "edit", "delete", "export", "view", "approve"];
    const [adminRole] = await sequelize.query(`SELECT id FROM t_roles WHERE slug = 'admin' AND deleted_at IS NULL LIMIT 1`);
    const adminRoleId = adminRole?.[0]?.id;

    for (const mod of modulesToSeed) {
      for (const act of baseActions) {
        const permKey = `${mod.key}.${act}`;
        const permLabel = `${mod.label} - ${act.toUpperCase()}`;

        const [permRes] = await sequelize.query(`
          INSERT INTO t_permissions (key, label, type, module)
          VALUES (:key, :label, :type, :module)
          ON CONFLICT (key) DO UPDATE
            SET label = EXCLUDED.label, type = EXCLUDED.type, module = EXCLUDED.module, deleted_at = NULL
          RETURNING id;
        `, {
          replacements: { key: permKey, label: permLabel, type: act, module: mod.key }
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
    }

    // Grant volunteering_event view & list permissions to all user roles (Employee, Manager, Viewer, etc.)
    const [allUserRoles] = await sequelize.query(`SELECT id, slug FROM t_roles WHERE deleted_at IS NULL`);
    for (const r of allUserRoles) {
      if (['admin', 'employee', 'manager', 'viewer', 'configurator'].includes(r.slug)) {
        for (const act of ['list', 'view', 'edit']) {
          const permKey = `volunteering_event.${act}`;
          const [pRes] = await sequelize.query(`SELECT id FROM t_permissions WHERE key = :key AND deleted_at IS NULL LIMIT 1`, { replacements: { key: permKey } });
          const pId = pRes?.[0]?.id;
          if (pId) {
            await sequelize.query(`
              INSERT INTO t_role_permissions (role_id, permission_id)
              VALUES (:role_id, :perm_id)
              ON CONFLICT (role_id, permission_id)
              DO UPDATE SET deleted_at = NULL, updated_at = NOW();
            `, { replacements: { role_id: r.id, perm_id: pId } });
          }
        }
      }
    }

    // 6. Seed Parent and Child Menus in t_menus
    let parentMenuId = null;
    const [existingParent] = await sequelize.query(`
      SELECT id FROM t_menus WHERE label = 'Employee Volunteering' OR url = 'volunteering' LIMIT 1;
    `);

    if (existingParent && existingParent.length > 0) {
      parentMenuId = existingParent[0].id;
    } else {
      const [newParent] = await sequelize.query(`
        INSERT INTO t_menus (label, icon, url, "order", module_key, is_configurator, is_public, is_active, is_system, is_deletable)
        VALUES ('Employee Volunteering', 'HeartOutlined', 'volunteering', 25, 'volunteering_event', FALSE, FALSE, TRUE, TRUE, FALSE)
        RETURNING id;
      `);
      parentMenuId = newParent?.[0]?.id;
    }

    if (parentMenuId) {
      // Remove any old/duplicate menus under Employee Volunteering
      await sequelize.query(`
        DELETE FROM t_menus 
        WHERE parent_id = :parent_id 
          AND (
            url = '/admin/forms/volunteering-event' 
            OR id NOT IN (
              SELECT MIN(id) 
              FROM t_menus 
              WHERE parent_id = :parent_id 
              GROUP BY label
            )
          );
      `, { replacements: { parent_id: parentMenuId } });

      const childMenus = [
        { label: "My Volunteering Hub", icon: "TeamOutlined", url: "/admin/volunteering/portal", order: 1, module: "volunteering_event" },
        { label: "Impact Story Feed", icon: "FireOutlined", url: "/admin/volunteering/feed", order: 2, module: "volunteering_impact_story" },
        { label: "Events & Calendar", icon: "CalendarOutlined", url: "/admin/event/volunteering-event", order: 3, module: "volunteering_event" },
        { label: "Volunteering Programs", icon: "FolderOutlined", url: "/admin/forms/volunteering-program", order: 4, module: "volunteering_program" },
        { label: "Community Impact Stories", icon: "FileTextOutlined", url: "/admin/event/volunteering-impact-story", order: 5, module: "volunteering_impact_story" },
        { label: "Event Type Master", icon: "AppstoreOutlined", url: "/admin/masters/event_type", order: 6, module: "event_type" }
      ];

      for (const cm of childMenus) {
        await sequelize.query(`
          INSERT INTO t_menus (label, icon, url, "order", parent_id, module_key, is_configurator, is_public, is_active, is_system, is_deletable)
          SELECT :label, :icon, :url, :order, :parent_id, :module, FALSE, FALSE, TRUE, TRUE, FALSE
          WHERE NOT EXISTS (
            SELECT 1 FROM t_menus WHERE label = :label AND parent_id = :parent_id
          );

          UPDATE t_menus
          SET url = :url, icon = :icon, module_key = :module, "order" = :order, is_system = TRUE, is_deletable = FALSE, is_active = TRUE
          WHERE label = :label AND parent_id = :parent_id;
        `, {
          replacements: { ...cm, parent_id: parentMenuId }
        });
      }
    }

    console.log("[Seed Volunteering] ✅ Successfully created tables, seeded forms, sections, master event types, initial records, permissions, and menus for Employee Volunteering!");
  } catch (err) {
    console.error("[Seed Volunteering] ❌ Error seeding volunteering forms:", err.message);
    throw err;
  }
}

if (require.main === module) {
  seedVolunteeringForms().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = { seedVolunteeringForms };
