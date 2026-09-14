// mongo-server/src/seedCoreForms.js
// Seeds core forms into MongoDB: implementation_partner, due_diligence, etc.
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const mongoose = require("mongoose");
const Form = require("./models/Form.model");
const DatabaseView = require("./models/DatabaseView.model");

const CORE_FORMS = [
  {
    form_id: "frm_implementation_partner",
    title: "Implementation Partner",
    slug: "implementation_partner",
    root_entity: {
      table: "t_frm_implementation_partner",
      modal_size: "1400",
      primary_key: "id",
    },
    is_master: false,
    enable_approval: false,
    status: "published",
    table_columns: [
      { key: "organization_name", label: "Organization Name", type: "text" },
      { key: "darpan_no", label: "Darpan No", type: "text" },
      { key: "email", label: "Email", type: "text" },
      { key: "phone_no", label: "Phone", type: "text" },
      { key: "person_name", label: "Contact Person", type: "text" },
      { key: "created_at", label: "Registered At", type: "datetime" },
    ],
    sections: [
      {
        section_id: "sec_ip_basic",
        section_label: "Basic details",
        type: "general",
        slug: "implementation_partner_basic_details",
        fields: [
          {
            id: "fld_darpan_no",
            ui: { placeholder: "Enter Darpan Number", icon: "SafetyCertificateOutlined" },
            type: "text",
            label: "Darpan No",
            visible: true,
            db_field: "darpan_no",
            required: true,
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
            add_to_query: true,
          },
          {
            id: "fld_org_name",
            ui: { placeholder: "Enter organization name", icon: "BankOutlined" },
            type: "text",
            label: "Organization Name",
            visible: true,
            db_field: "organization_name",
            required: true,
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: "fld_email",
            ui: { placeholder: "Enter official email", icon: "MailOutlined" },
            type: "text",
            label: "Official Email",
            visible: true,
            db_field: "email",
            required: true,
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: "fld_phone",
            ui: { placeholder: "Enter phone number", icon: "PhoneOutlined" },
            type: "text",
            label: "Phone No",
            visible: true,
            db_field: "phone_no",
            required: true,
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: "fld_person_name",
            ui: { placeholder: "Enter contact person name", icon: "UserOutlined" },
            type: "text",
            label: "Person Name",
            visible: true,
            db_field: "person_name",
            required: true,
            add_to_query: true,
            add_to_list: true,
          },
          {
            id: "fld_person_desig",
            ui: { placeholder: "Enter designation", icon: "IdcardOutlined" },
            type: "text",
            label: "Person Designation",
            visible: true,
            db_field: "person_designation",
            required: true,
            add_to_query: true,
          },
        ],
      },
    ],
  },
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/dynamicform_db");
  console.log("Connected to MongoDB for seeding core forms...");

  for (const form of CORE_FORMS) {
    const existing = await Form.findOne({ slug: form.slug });
    if (!existing) {
      await Form.create(form);
      console.log(`✅ Seeded form "${form.title}" (${form.slug})`);

      // Create MongoDB aggregation view
      const viewSlug = `v_${form.slug}`;
      const pipeline = [
        { $match: { form_slug: form.slug, deleted_at: null } },
        {
          $project: {
            _id: 1,
            created_at: 1,
            status: 1,
            ...(form.table_columns || []).reduce((acc, col) => {
              acc[col.key] = `$data.${col.key}`;
              return acc;
            }, {}),
          },
        },
      ];

      try {
        const collections = await mongoose.connection.db.listCollections({ name: viewSlug }).toArray();
        if (collections.length > 0) {
          await mongoose.connection.db.dropCollection(viewSlug);
        }
        await mongoose.connection.db.createCollection(viewSlug, {
          viewOn: "formdatas",
          pipeline,
        });
        console.log(`✅ Created MongoDB view "${viewSlug}"`);
      } catch (err) {
        console.warn(`Could not create view "${viewSlug}":`, err.message);
      }
    } else {
      console.log(`Form "${form.slug}" already exists, skipping.`);
    }
  }

  await mongoose.disconnect();
  console.log("Finished seeding core forms.");
}

if (require.main === module) {
  seed().catch((err) => {
    console.error("Seeding error:", err);
    process.exit(1);
  });
}

module.exports = seed;
