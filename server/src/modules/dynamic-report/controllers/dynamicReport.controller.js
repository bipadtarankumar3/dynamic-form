const { sequelize, DataTypes } = require("../../../config/db.config");
const DynamicReportSavedQueriesModel = sequelize.define(
  "t_dynamic_report_saved_queries",
  {
    tdrsq_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    tdrsq_title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    tdrsq_folder: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    tdrsq_query_data: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    tdrsq_author: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    tdrsq_date: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
  },
  {
    timestamps: false,
    freezeTableName: true,
  }
);

// Mock Metadata for different modules
const MOCK_METADATA = {
  finance: [
    { label: "Project Name", value: "project_name", type: "string" },
    { label: "Total Expense (INR)", value: "total_expense_inr", type: "number" },
    { label: "Budget Allocated", value: "budget_allocated", type: "number" },
    { label: "Expenditure Date", value: "expenditure_date", type: "date" }
  ],
  hr: [
    { label: "Employee Name", value: "employee_name", type: "string" },
    { label: "Department", value: "department", type: "string" },
    { label: "Salary (INR)", value: "salary_inr", type: "number" }
  ],
  operations: [
    { label: "Activity Name", value: "activity_name", type: "string" },
    { label: "Status", value: "status", type: "string" },
    { label: "Beneficiaries Covered", value: "beneficiaries_covered", type: "number" }
  ]
};

// Mock data to return upon execution
const MOCK_REPORT_DATA = [
  { project_name: "Water Conservation", total_expense_inr: 150000, budget_allocated: 200000, expenditure_date: "2023-10-15" },
  { project_name: "Education Support", total_expense_inr: 50000, budget_allocated: 50000, expenditure_date: "2023-11-01" },
  { project_name: "Health Camp", total_expense_inr: 75000, budget_allocated: 100000, expenditure_date: "2024-01-20" }
];

const initDB = async () => {
  try {
    // Sync model with database
    await DynamicReportSavedQueriesModel.sync();
    console.log("t_dynamic_report_saved_queries table initialized via model.");

    // Clean up any seeded default mock query to ensure it's empty
    await DynamicReportSavedQueriesModel.destroy({
      where: {
        tdrsq_title: 'tasks-unestimated or uncategorized or unassigned'
      }
    });
  } catch (error) {
    console.error("Error initializing t_dynamic_report_saved_queries table:", error);
  }
};
initDB();

exports.getSavedQueries = async (req, res) => {
  try {
    const queries = await DynamicReportSavedQueriesModel.findAll({
      order: [['tdrsq_id', 'DESC']]
    });

    const formattedQueries = queries.map(q => ({
      id: q.tdrsq_id,
      title: q.tdrsq_title,
      folder: q.tdrsq_folder,
      queryData: q.tdrsq_query_data,
      author: q.tdrsq_author,
      date: q.tdrsq_date
    }));

    return res.status(200).json({ success: true, data: formattedQueries });
  } catch (error) {
    console.error("Error in getSavedQueries:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

exports.saveQuery = async (req, res) => {
  try {
    const { id, title, folder, queryData } = req.body;
    const author = 'Admin User';
    const date = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');

    if (id) {
      const existingQuery = await DynamicReportSavedQueriesModel.findByPk(id);
      if (existingQuery) {
        existingQuery.tdrsq_title = title || existingQuery.tdrsq_title;
        existingQuery.tdrsq_folder = folder || existingQuery.tdrsq_folder;
        existingQuery.tdrsq_query_data = queryData || existingQuery.tdrsq_query_data;
        existingQuery.tdrsq_date = date;
        await existingQuery.save();

        return res.status(200).json({
          success: true,
          message: "Query updated successfully",
          data: {
            id: existingQuery.tdrsq_id,
            title: existingQuery.tdrsq_title,
            folder: existingQuery.tdrsq_folder,
            author: existingQuery.tdrsq_author,
            date: existingQuery.tdrsq_date,
            queryData: existingQuery.tdrsq_query_data
          }
        });
      }
    }

    const newQuery = await DynamicReportSavedQueriesModel.create({
      tdrsq_title: title || 'Untitled Query',
      tdrsq_folder: folder || 'My favorites',
      tdrsq_query_data: queryData,
      tdrsq_author: author,
      tdrsq_date: date
    });

    return res.status(200).json({ 
      success: true, 
      message: "Query saved successfully",
      data: { 
        id: newQuery.tdrsq_id, 
        title: newQuery.tdrsq_title, 
        folder: newQuery.tdrsq_folder, 
        author: newQuery.tdrsq_author, 
        date: newQuery.tdrsq_date, 
        queryData: newQuery.tdrsq_query_data 
      } 
    });
  } catch (error) {
    console.error("Error in saveQuery:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

exports.getViews = async (req, res) => {
  try {
    const sql = `
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public' AND table_name LIKE 'v_%';
    `;
    const views = await sequelize.query(sql, {
      type: sequelize.QueryTypes.SELECT
    });

    const formattedViews = views.map(v => {
      const viewName = v.table_name;
      // Strip v_ prefix if present
      let cleanName = viewName.startsWith("v_") ? viewName.substring(2) : viewName;
      // Format as title case with spaces
      const label = cleanName
        .split("_")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

      return {
        label,
        value: viewName
      };
    });

    return res.status(200).json({ success: true, data: formattedViews });
  } catch (error) {
    console.error("Error in getViews:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

exports.getMetadata = async (req, res) => {
  try {
    const { module } = req.query;
    if (!module) {
      return res.status(400).json({ success: false, message: "Module parameter is required." });
    }

    // Query columns of the view from database
    const sql = `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = :module 
      AND table_schema = 'public'
    `;
    const columns = await sequelize.query(sql, {
      replacements: { module },
      type: sequelize.QueryTypes.SELECT
    });

    let parameters = [];
    if (columns && columns.length > 0) {
      parameters = columns.map(c => {
        let type = 'string';
        if (['integer', 'bigint', 'double precision', 'numeric', 'real', 'smallint'].includes(c.data_type)) type = 'number';
        if (['date', 'timestamp', 'timestamp without time zone', 'timestamp with time zone', 'timestamp', 'time'].includes(c.data_type)) type = 'date';
        if (['boolean'].includes(c.data_type)) type = 'boolean';

        // Format label: replace underscores with spaces and capitalize each word
        const label = c.column_name
          .split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');

        return {
          label: label,
          value: c.column_name,
          type: type
        };
      });
    } else {
      // Fallback to MOCK_METADATA if table/view not found in DB
      parameters = MOCK_METADATA[module.toLowerCase()] || [];
    }

    return res.status(200).json({
      success: true,
      data: { parameters }
    });
  } catch (error) {
    console.error("Error in getMetadata:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

exports.executeReport = async (req, res) => {
  try {
    const { module, adminFilters, parameterFilters, outputFields } = req.body;

    console.log("Received Dynamic Report Query:");
    console.log("Module:", module);
    console.log("Admin Filters:", adminFilters);
    console.log("Parameter Filters:", JSON.stringify(parameterFilters, null, 2));
    console.log("Output Fields:", outputFields);

    if (!outputFields || !Array.isArray(outputFields) || outputFields.length === 0 || outputFields.every(f => !f)) {
      return res.status(400).json({ success: false, message: "Please select at least one column in Column options." });
    }

    // Verify if view exists in DB
    const viewExistsSql = `
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public' AND table_name = :module;
    `;
    const viewExists = await sequelize.query(viewExistsSql, {
      replacements: { module },
      type: sequelize.QueryTypes.SELECT
    });

    if (viewExists && viewExists.length > 0) {
      // Query database columns to validate filters and output fields to prevent SQL injection
      const colSql = `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = :module 
        AND table_schema = 'public'
      `;
      const dbColumns = await sequelize.query(colSql, {
        replacements: { module },
        type: sequelize.QueryTypes.SELECT
      });

      const validColumns = new Set(dbColumns.map(c => c.column_name));

      // Build Select clause
      let selectFields = '*';
      if (outputFields && outputFields.length > 0) {
        const filteredOutputs = outputFields.filter(f => validColumns.has(f));
        if (filteredOutputs.length > 0) {
          selectFields = filteredOutputs.map(f => `"${f}"`).join(', ');
        }
      }

      // Build Where clause
      let whereClause = '';
      const replacements = { module };
      
      if (parameterFilters && parameterFilters.length > 0) {
        parameterFilters.forEach((filter, index) => {
          const { logic, field, operator, value } = filter;
          if (!field || !validColumns.has(field)) return;

          // Validate operator
          const allowedOperators = ['=', '>', '<', '>=', '<=', '!='];
          if (!allowedOperators.includes(operator)) return;

          const paramName = `val_${index}`;
          replacements[paramName] = value;

          const logicStr = (logic && ['and', 'or'].includes(logic.toLowerCase())) ? ` ${logic.toUpperCase()} ` : ' AND ';

          if (whereClause === '') {
            whereClause = `"${field}" ${operator} :${paramName}`;
          } else {
            whereClause += `${logicStr}"${field}" ${operator} :${paramName}`;
          }
        });
      }

      // Build Order By clause dynamically and securely
      let orderClause = '';
      if (req.body.sortFields && Array.isArray(req.body.sortFields) && req.body.sortFields.length > 0) {
        const orderSegments = req.body.sortFields
          .filter(s => s && s.field && validColumns.has(s.field))
          .map(s => {
            const dir = (s.direction && s.direction.toLowerCase() === 'desc') ? 'DESC' : 'ASC';
            return `"${s.field}" ${dir}`;
          });
        if (orderSegments.length > 0) {
          orderClause = `ORDER BY ${orderSegments.join(', ')}`;
        }
      }

      const query = `
        SELECT ${selectFields}
        FROM "${module}"
        ${whereClause ? `WHERE ${whereClause}` : ''}
        ${orderClause}
      `;

      const finalData = await sequelize.query(query, {
        replacements,
        type: sequelize.QueryTypes.SELECT
      });

      return res.status(200).json({
        success: true,
        data: finalData
      });
    }

    // Fallback to mock data execution
    let finalData = MOCK_REPORT_DATA;
    if (outputFields && outputFields.length > 0) {
      finalData = MOCK_REPORT_DATA.map(row => {
        let newRow = {};
        outputFields.forEach(field => {
          if (row[field] !== undefined) {
            newRow[field] = row[field];
          }
        });
        return newRow;
      });
    }

    return res.status(200).json({
      success: true,
      data: finalData
    });

  } catch (error) {
    console.error("Error in executeReport:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
