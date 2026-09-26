// mongo-server/src/seedCoreForms.js
// Seeds Core CSR Forms with complete field metadata & sections into MongoDB
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const mongoose = require('mongoose');
const Form = require('./models/Form.model');
const FormSchema = require('./models/FormSchema.model');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/csrdynamicform_db';

const CORE_FORMS_DATA = [
  // ── 1. Implementation Partner Form ────────────────────────────────
  {
    form_id: 'frm0000000013',
    title: 'Implementation Partner',
    slug: 'implementation_partner',
    form_code: 'implementation_partner',
    table_name: 'implementation_partner',
    root_entity: {
      table: 'implementation_partner',
      modal_size: '1400',
      primary_key: 'id',
    },
    is_master: false,
    enable_approval: false,
    sections: [
      {
        section_id: 'sec0000000015',
        section_label: 'Basic details',
        type: 'general',
        slug: 'implementation_partner_basic_details',
        table: 'implementation_partner',
        primary_key: 'id',
        fields: [
          {
            id: 'fld_darpan_no',
            ui: { placeholder: 'Enter Darpan Number', icon: 'SafetyCertificateOutlined' },
            type: 'text',
            label: 'Darpan No',
            visible: true,
            db_field: 'darpan_no',
            column_name: 'darpan_no',
            messages: { required: 'Darpan Number is required' },
            required: true,
            data_type: 'varchar(255)',
            type_name: 'Text',
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: 'fld_darpan_link',
            ui: { placeholder: 'Enter NGO Darpan link', icon: 'GlobalOutlined' },
            type: 'text',
            label: 'NGO Darpan Link',
            visible: true,
            db_field: 'darpan_link',
            column_name: 'darpan_link',
            required: false,
            data_type: 'varchar(255)',
            type_name: 'Text',
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: 'fld_organization_name',
            ui: { placeholder: 'Enter organization name', icon: 'BankOutlined' },
            type: 'text',
            label: 'Organization Name',
            visible: true,
            db_field: 'organization_name',
            column_name: 'organization_name',
            messages: { required: 'Organization name is required' },
            required: true,
            data_type: 'varchar(255)',
            type_name: 'Text',
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: 'fld_email',
            ui: { placeholder: 'Enter valid email id', icon: 'MailOutlined' },
            type: 'text',
            label: 'Email',
            visible: true,
            db_field: 'email',
            column_name: 'email',
            messages: { required: 'Email is required', email: 'Enter a valid email address' },
            required: true,
            data_type: 'varchar(255)',
            type_name: 'Text',
            validation: { email: true },
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: 'fld_phone_no',
            ui: { placeholder: 'Enter valid Phone no', icon: 'PhoneOutlined' },
            type: 'text',
            label: 'Phone No',
            visible: true,
            db_field: 'phone_no',
            column_name: 'phone_no',
            messages: { required: 'Phone number is required' },
            required: true,
            data_type: 'varchar(20)',
            type_name: 'Text',
            validation: { minLength: 10, maxLength: 15 },
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: 'fld_person_name',
            ui: { placeholder: 'Enter contact person name', icon: 'UserOutlined' },
            type: 'text',
            label: 'Contact Person Name',
            visible: true,
            db_field: 'person_name',
            column_name: 'person_name',
            required: true,
            data_type: 'varchar(255)',
            type_name: 'Text',
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: 'fld_state',
            ui: { placeholder: 'Select State' },
            type: 'select',
            label: 'State',
            visible: true,
            db_field: 'state',
            column_name: 'state',
            required: true,
            data_type: 'varchar(100)',
            type_name: 'Select',
            options_source: 'states',
            options_source_table: 'states',
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: 'fld_status',
            ui: { placeholder: 'Select Status' },
            type: 'select',
            label: 'Status',
            visible: true,
            db_field: 'status',
            column_name: 'status',
            required: true,
            default_value: 'Approved',
            options: [
              { label: 'Draft', value: 'Draft' },
              { label: 'Submitted', value: 'Submitted' },
              { label: 'Under Review', value: 'Under Review' },
              { label: 'Approved', value: 'Approved' },
              { label: 'Rejected', value: 'Rejected' },
            ],
            add_to_query: true,
            add_to_list: true,
          }
        ]
      }
    ]
  },

  // ── 2. NGO Due Diligence Form ──────────────────────────────────────
  {
    form_id: 'frm0000000014',
    title: 'NGO Due Diligence',
    slug: 'ngo_due_diligence',
    form_code: 'ngo_due_diligence',
    table_name: 'ngo_due_diligence',
    root_entity: {
      table: 'ngo_due_diligence',
      modal_size: '1400',
      primary_key: 'id',
    },
    is_master: false,
    enable_approval: true,
    sections: [
      {
        section_id: 'sec_dd_01',
        section_label: 'Statutory Compliance Details',
        type: 'general',
        slug: 'ngo_due_diligence_statutory',
        table: 'ngo_due_diligence',
        primary_key: 'id',
        fields: [
          {
            id: 'fld_partner_id',
            type: 'text',
            label: 'Implementation Partner ID',
            visible: true,
            db_field: 'partner_id',
            column_name: 'partner_id',
            required: true,
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: 'fld_12a_cert',
            ui: { placeholder: 'Select 12A Status' },
            type: 'select',
            label: '12A Registration Available',
            visible: true,
            db_field: 'has_12a_cert',
            column_name: 'has_12a_cert',
            required: true,
            options: [{ label: 'Yes', value: 'Yes' }, { label: 'No', value: 'No' }],
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: 'fld_12a_no',
            type: 'text',
            label: '12A Certificate No',
            visible: true,
            db_field: 'cert_12a_number',
            column_name: 'cert_12a_number',
            required: false,
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: 'fld_80g_cert',
            ui: { placeholder: 'Select 80G Status' },
            type: 'select',
            label: '80G Registration Available',
            visible: true,
            db_field: 'has_80g_cert',
            column_name: 'has_80g_cert',
            required: true,
            options: [{ label: 'Yes', value: 'Yes' }, { label: 'No', value: 'No' }],
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: 'fld_80g_no',
            type: 'text',
            label: '80G Certificate No',
            visible: true,
            db_field: 'cert_80g_number',
            column_name: 'cert_80g_number',
            required: false,
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: 'fld_csr1_cert',
            type: 'select',
            label: 'CSR-1 Registration Available',
            visible: true,
            db_field: 'has_csr1_cert',
            column_name: 'has_csr1_cert',
            required: true,
            options: [{ label: 'Yes', value: 'Yes' }, { label: 'No', value: 'No' }],
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: 'fld_csr1_no',
            type: 'text',
            label: 'CSR-1 Registration No',
            visible: true,
            db_field: 'csr1_number',
            column_name: 'csr1_number',
            required: false,
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: 'fld_fcra_cert',
            type: 'select',
            label: 'FCRA Registration',
            visible: true,
            db_field: 'has_fcra_cert',
            column_name: 'has_fcra_cert',
            required: false,
            options: [{ label: 'Yes', value: 'Yes' }, { label: 'No', value: 'No' }, { label: 'Not Applicable', value: 'Not Applicable' }],
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: 'fld_version',
            type: 'number',
            label: 'Due Diligence Version',
            visible: true,
            db_field: 'version',
            column_name: 'version',
            default_value: 1,
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: 'fld_dd_status',
            type: 'select',
            label: 'Due Diligence Status',
            visible: true,
            db_field: 'status',
            column_name: 'status',
            default_value: 'Submitted',
            options: [{ label: 'Draft', value: 'Draft' }, { label: 'Submitted', value: 'Submitted' }, { label: 'Verified', value: 'Verified' }, { label: 'Flagged', value: 'Flagged' }],
            add_to_query: true,
            add_to_list: true,
          }
        ]
      }
    ]
  },

  // ── 3. Request for Proposal (RFP) Form ─────────────────────────────
  {
    form_id: 'frm0000000015',
    title: 'Request For Proposal (RFP)',
    slug: 'rfp',
    form_code: 'rfp',
    table_name: 'rfp',
    root_entity: {
      table: 'rfp',
      modal_size: '1400',
      primary_key: 'id',
    },
    is_master: false,
    enable_approval: true,
    sections: [
      {
        section_id: 'sec_rfp_01',
        section_label: 'RFP Overview & Target Budget',
        type: 'general',
        slug: 'rfp_overview',
        table: 'rfp',
        primary_key: 'id',
        fields: [
          {
            id: 'fld_rfp_code',
            type: 'text',
            label: 'RFP Code',
            visible: true,
            db_field: 'rfp_code',
            column_name: 'rfp_code',
            required: true,
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: 'fld_rfp_title',
            type: 'text',
            label: 'RFP Title',
            visible: true,
            db_field: 'rfp_title',
            column_name: 'rfp_title',
            required: true,
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: 'fld_focus_area',
            type: 'select',
            label: 'CSR Focus Area / Thematic Sector',
            visible: true,
            db_field: 'focus_area',
            column_name: 'focus_area',
            required: true,
            options: [
              { label: 'Education', value: 'Education' },
              { label: 'Healthcare', value: 'Healthcare' },
              { label: 'Skill Development', value: 'Skill Development' },
              { label: 'Environment & Sustainability', value: 'Environment & Sustainability' },
              { label: 'Women Empowerment', value: 'Women Empowerment' },
              { label: 'Rural Development', value: 'Rural Development' },
            ],
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: 'fld_target_budget',
            type: 'number',
            label: 'Estimated Budget (INR)',
            visible: true,
            db_field: 'target_budget',
            column_name: 'target_budget',
            required: true,
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: 'fld_target_beneficiaries',
            type: 'number',
            label: 'Target Beneficiaries Count',
            visible: true,
            db_field: 'target_beneficiaries',
            column_name: 'target_beneficiaries',
            required: false,
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: 'fld_target_geography',
            type: 'text',
            label: 'Target State/Locations',
            visible: true,
            db_field: 'target_geography',
            column_name: 'target_geography',
            required: true,
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: 'fld_submission_deadline',
            type: 'date',
            label: 'Proposal Submission Deadline',
            visible: true,
            db_field: 'submission_deadline',
            column_name: 'submission_deadline',
            required: true,
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: 'fld_project_duration_months',
            type: 'number',
            label: 'Duration (Months)',
            visible: true,
            db_field: 'project_duration_months',
            column_name: 'project_duration_months',
            default_value: 12,
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: 'fld_rfp_status',
            type: 'select',
            label: 'RFP Status',
            visible: true,
            db_field: 'status',
            column_name: 'status',
            default_value: 'Draft',
            options: [
              { label: 'Draft', value: 'Draft' },
              { label: 'Approved', value: 'Approved' },
              { label: 'Floated', value: 'Floated' },
              { label: 'Under Evaluation', value: 'Under Evaluation' },
              { label: 'Awarded', value: 'Awarded' },
              { label: 'Closed', value: 'Closed' }
            ],
            add_to_query: true,
            add_to_list: true,
          }
        ]
      }
    ]
  },

  // ── 4. CSR Project Master Form ─────────────────────────────────────
  {
    form_id: 'frm0000000016',
    title: 'CSR Project Master',
    slug: 'project',
    form_code: 'project',
    table_name: 'project',
    root_entity: {
      table: 'project',
      modal_size: '1400',
      primary_key: 'id',
    },
    is_master: false,
    enable_approval: true,
    sections: [
      {
        section_id: 'sec_proj_01',
        section_label: 'Project Details & Targets',
        type: 'general',
        slug: 'project_details',
        table: 'project',
        primary_key: 'id',
        fields: [
          {
            id: 'fld_project_code',
            type: 'text',
            label: 'Project Code',
            visible: true,
            db_field: 'project_code',
            column_name: 'project_code',
            required: true,
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: 'fld_project_name',
            type: 'text',
            label: 'Project Name',
            visible: true,
            db_field: 'project_name',
            column_name: 'project_name',
            required: true,
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: 'fld_partner_name',
            type: 'text',
            label: 'Implementing NGO Partner',
            visible: true,
            db_field: 'partner_name',
            column_name: 'partner_name',
            required: true,
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: 'fld_proj_focus_area',
            type: 'text',
            label: 'Thematic Sector',
            visible: true,
            db_field: 'focus_area',
            column_name: 'focus_area',
            required: true,
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: 'fld_sanctioned_budget',
            type: 'number',
            label: 'Sanctioned Budget (INR)',
            visible: true,
            db_field: 'sanctioned_budget',
            column_name: 'sanctioned_budget',
            required: true,
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: 'fld_start_date',
            type: 'date',
            label: 'Start Date',
            visible: true,
            db_field: 'start_date',
            column_name: 'start_date',
            required: true,
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: 'fld_end_date',
            type: 'date',
            label: 'End Date',
            visible: true,
            db_field: 'end_date',
            column_name: 'end_date',
            required: true,
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: 'fld_proj_status',
            type: 'select',
            label: 'Project Status',
            visible: true,
            db_field: 'status',
            column_name: 'status',
            default_value: 'Active',
            options: [
              { label: 'Active', value: 'Active' },
              { label: 'In Progress', value: 'In Progress' },
              { label: 'Completed', value: 'Completed' },
              { label: 'On Hold', value: 'On Hold' }
            ],
            add_to_query: true,
            add_to_list: true,
          }
        ]
      }
    ]
  }
];

async function seedCoreForms() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB for Core Forms Seeding');

  for (const formData of CORE_FORMS_DATA) {
    const { sections, ...formMeta } = formData;

    const form = await Form.findOneAndUpdate(
      { form_code: formMeta.form_code },
      {
        ...formMeta,
        sections: sections || [],
        deleted_at: null
      },
      { new: true, upsert: true }
    );

    await FormSchema.findOneAndUpdate(
      { form_id: form._id },
      {
        form_id: form._id,
        form_code: form.form_code,
        slug: form.slug || form.form_code,
        title: form.title,
        table_name: form.table_name || form.form_code,
        sections: sections || [],
        version: 1,
        is_published: true
      },
      { new: true, upsert: true }
    );

    console.log(`  Form & Schema: "${form.title}" (${form.form_code}) with ${sections?.[0]?.fields?.length || 0} fields ✓`);
  }

  console.log('\n✨ Core CSR forms seeded successfully!');
  await mongoose.disconnect();
}

if (require.main === module) {
  seedCoreForms().catch(err => {
    console.error('❌ seedCoreForms failed:', err);
    process.exit(1);
  });
}

module.exports = { seedCoreForms };
