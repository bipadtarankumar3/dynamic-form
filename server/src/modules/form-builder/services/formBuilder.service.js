const { sequelize } = require("../../../config/db.config");
const FormModel = require("../../../models/form.model");
const SectionModel = require("../../../models/section.model");
const {
  generateFieldColumns,
  buildCreateTableSQL,
} = require("./sqlBuilder.service");
const { buildCreateViewSQL } = require("./viewBuilder.service");

const validateFormAndSections = async ({ slug, sections, transaction }) => {
  // 🔹 1. Check form slug
  const existingForm = await FormModel.findOne({
    where: { slug },
    transaction,
  });

  if (existingForm) {
    throw new Error("Form slug already exists");
  }

  // 🔹 2. Check duplicate section slug in request
  const seen = new Set();
  for (const sec of sections) {
    if (seen.has(sec.slug)) {
      throw new Error(`Duplicate section slug: ${sec.slug}`);
    }
    seen.add(sec.slug);
  }

  // 🔹 3. Check section slug in DB (optional but safer)
  const existingSections = await SectionModel.findAll({
    where: {
      slug: sections.map((s) => s.slug),
    },
    transaction,
  });

  if (existingSections.length > 0) {
    const slugs = existingSections.map((s) => s.slug).join(", ");
    throw new Error(`Section slug already exists: ${slugs}`);
  }

  // 🔥 4. Check table already exists
  for (const sec of sections) {
    const tableName = `t_${sec.slug}`;

    const tableCheck = await sequelize.query(
      `
      SELECT to_regclass(:tableName) as exists
      `,
      {
        replacements: { tableName },
        type: sequelize.QueryTypes.SELECT,
        transaction,
      },
    );

    if (tableCheck[0]?.exists) {
      throw new Error(`Table already exists: ${tableName}`);
    }
  }
};

const createFormService = async (req) => {
  const transaction = await sequelize.transaction();

  try {
    const { is_editable = false, title, slug, sections, project_id } = req.body;
    // console.log("req.body--------- ",req.body);
    // return;
    if (!sections?.length) throw new Error("Sections required");

    // ✅ VALIDATION FIRST
    await validateFormAndSections({ slug, sections, transaction });

    // 🔹 Create form
    const form = await FormModel.create(
      {
        title,
        slug,
        parent_id: project_id || null,
        created_by: req.user?.user_id || 0,
        api: {
          add: "/form-builder/add",
          edit: "/form-builder/edit",
          view: "/form-builder/view",
        },
      },
      { transaction },
    );

    let rootTable = "";
    let rootPrimaryKey = "";

    // 🔥 Process sections
    for (let i = 0; i < sections.length; i++) {
      const sec = sections[i];

      const tableName = `t_${sec.slug}`;
      const primaryKey = `${tableName}_id`;

      const fieldColumns = generateFieldColumns(sec.fields);

      const createSQL = buildCreateTableSQL({
        tableName,
        primaryKey,
        fieldColumns,
        isRoot: i === 0,
        rootTable,
        rootPrimaryKey,
      });

      await sequelize.query(createSQL, { transaction });

      if (i === 0) {
        rootTable = tableName;
        rootPrimaryKey = primaryKey;
      }

      await SectionModel.create(
        {
          section_form_id: form.form_id,
          section_label: sec.section_label,
          type: sec.type,
          slug: sec.slug,
          table: tableName,
          primary_key: primaryKey,
          relation:
            i === 0
              ? null
              : {
                  type: sec.type === "add_more" ? "one_to_many" : "one_to_one",
                  parent_key: rootPrimaryKey,
                  foreign_key: rootPrimaryKey,
                  parent_table: rootTable,
                },
          fields: [
            ...sec?.fields,
            {
              id: "created_by",
              type: "text",
              label: "Created By",
              visible: false,
              db_field: "created_by",
              add_to_list: true,
              add_to_query: true,
            },
            {
              id: "created_at",
              type: "text",
              label: "Created At",
              visible: false,
              db_field: "created_at",
              add_to_list: true,
              add_to_query: true,
            },
            ...(i === 0
              ? [
                  {
                    id: "latitude",
                    type: "number",
                    label: "Latitude",
                    visible: false,
                    db_field: "latitude",
                    regex_type: "decimal",
                    number_type: "decimal",
                    add_to_query: true,
                  },
                  {
                    id: "longitude",
                    type: "number",
                    label: "Longitude",
                    visible: false,
                    db_field: "longitude",
                    regex_type: "decimal",
                    number_type: "decimal",
                    add_to_query: true,
                  },
                ]
              : []),
          ],
          created_by: req.user?.user_id || 0,
        },
        { transaction },
      );
    }

    // 🔹 Update root entity
    await form.update(
      {
        root_entity: {
          table: rootTable,
          primary_key: rootPrimaryKey,
        },
        actions: [
          {
            name: "View",
            slug: "view",
            type: "OPEN_TAB",
            form_details: {
              form_slug: slug,
              primary_key: rootPrimaryKey,
            },
            view_url_TAB: "/project/form/view",
          },
          ...(is_editable
            ? [
                {
                  name: "Edit",
                  slug: "edit",
                  type: "OPEN_MODAL",
                  created_by_key: "created_by",
                },
              ]
            : []),
        ],
      },
      { transaction },
    );

    const createViewSQL = await buildCreateViewSQL({
      transaction,
      form,
    });

    await sequelize.query(createViewSQL, {
      transaction,
    });

    await transaction.commit();
    return form;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

module.exports = { createFormService };
