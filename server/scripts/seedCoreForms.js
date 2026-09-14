// server/scripts/seedCoreForms.js
// ============================================================
// Core Form Seeder — Seeds Implementation Partner, Due Diligence,
// and DD Document Type forms into t_form and t_section automatically.
// ============================================================

require("dotenv").config();
const path = require("path");
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
    // 0. Core Form Engine Sequences & Tables
    await sequelize.query(`
      CREATE SEQUENCE IF NOT EXISTS t_form_id_seq START WITH 1 INCREMENT BY 1;
      CREATE SEQUENCE IF NOT EXISTS t_section_id_seq START WITH 1 INCREMENT BY 1;
      CREATE SEQUENCE IF NOT EXISTS t_form_group_id_seq START WITH 1 INCREMENT BY 1;

      CREATE TABLE IF NOT EXISTS t_form (
        form_id                VARCHAR(255) PRIMARY KEY DEFAULT ('frm' || LPAD(NEXTVAL('t_form_id_seq')::TEXT, 10, '0')),
        title                  VARCHAR(255),
        slug                   VARCHAR(255),
        root_entity            JSONB,
        context                JSONB,
        api                    JSONB,
        actions                JSONB,
        enable_action_tabs     BOOLEAN      DEFAULT FALSE,
        action_tabs            JSONB        DEFAULT '[]'::jsonb,
        table_columns          JSONB        DEFAULT '[]'::jsonb,
        triggers               JSONB        DEFAULT '[]'::jsonb,
        enable_approval        BOOLEAN      DEFAULT FALSE,
        view_name              VARCHAR(255),
        view_slug              VARCHAR(255),
        relation_with_parent   JSONB,
        relation_with_children JSONB,
        parent_id              VARCHAR(255),
        parent_form_id         VARCHAR(255),
        is_draft               BOOLEAN      DEFAULT FALSE,
        modal_size             VARCHAR(50)  DEFAULT '1400',
        is_master              BOOLEAN      DEFAULT FALSE,
        is_active              BOOLEAN      DEFAULT TRUE,
        created_by             INTEGER      DEFAULT 0,
        updated_by             INTEGER      DEFAULT 0,
        created_at             TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at             TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
        deleted_at             TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS t_section (
        section_id      VARCHAR(255) PRIMARY KEY DEFAULT ('sec' || LPAD(NEXTVAL('t_section_id_seq')::TEXT, 10, '0')),
        section_form_id VARCHAR(255),
        section_label   VARCHAR(255),
        type            VARCHAR(20),
        slug            VARCHAR(255),
        "table"         VARCHAR(255),
        primary_key     VARCHAR(255),
        relation        JSONB,
        context         JSONB,
        fields          JSONB,
        is_active       BOOLEAN      DEFAULT TRUE,
        created_by      INTEGER      DEFAULT 0,
        updated_by      INTEGER      DEFAULT 0,
        created_at      TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at      TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
        deleted_at      TIMESTAMPTZ
      );

      -- Ensure columns on t_notifications if present
      ALTER TABLE t_notifications ADD COLUMN IF NOT EXISTS event_key VARCHAR(100);
      ALTER TABLE t_notifications ADD COLUMN IF NOT EXISTS ref_table VARCHAR(200);
      ALTER TABLE t_notifications ADD COLUMN IF NOT EXISTS ref_id INTEGER;
      ALTER TABLE t_notifications ADD COLUMN IF NOT EXISTS is_deletable BOOLEAN DEFAULT FALSE;
      ALTER TABLE t_notifications ADD COLUMN IF NOT EXISTS status_flag VARCHAR(50);
    `).catch((err) => {
      console.warn("[Seed Core Forms] Core engine table ensure warning:", err.message);
    });

    // 1. Implementation Partner Root Table (Clean Seed Columns)
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS t_frm_implementation_partner (
        id SERIAL PRIMARY KEY,
        darpan_no VARCHAR(255),
        darpan_link VARCHAR(500),
        organization_name VARCHAR(255),
        email VARCHAR(255),
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
  } catch (err) {
    console.warn("[Seed Core Forms] Table ensure warning:", err.message);
  }
}

async function seedCoreForms() {
  try {
    console.log("[Seed Core Forms] Ensuring core tables and seeding Implementation Partner and Due Diligence forms...");

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

    console.log("[Seed Core Forms] ✅ Successfully seeded Implementation Partner and Due Diligence forms!");
  } catch (err) {
    console.error("[Seed Core Forms] ❌ Failed to seed core forms:", err.message);
  }
}

if (require.main === module) {
  seedCoreForms().then(() => process.exit(0));
}

module.exports = { seedCoreForms };
