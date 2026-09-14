// mongo-server/src/modules/database-view/databaseView.controller.js
// MongoDB equivalent of PostgreSQL app_database_views
// Instead of SQL CREATE VIEW, we use db.createCollection with viewOn + pipeline
const DatabaseView = require("../../models/DatabaseView.model");
const mongoose = require("mongoose");

const databaseViewController = {

  // List all database views
  listViews: async (req, res) => {
    try {
      const views = await DatabaseView.find({ deleted_at: null })
        .select("-pipeline")
        .sort({ created_at: -1 });
      return res.json({ success: true, count: views.length, data: views });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },

  getView: async (req, res) => {
    try {
      const { slug } = req.params;
      const view = await DatabaseView.findOne({ view_slug: slug, deleted_at: null });
      if (!view) return res.status(404).json({ success: false, message: "View not found" });
      return res.json({ success: true, data: view });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },

  // Create or update a database view
  saveView: async (req, res) => {
    try {
      const userId = req.user?.user_id;
      const { view_name, view_slug, base_collection, form_slug, description, pipeline, configuration } = req.body;

      if (!view_slug || !view_name || !base_collection) {
        return res.status(400).json({ success: false, message: "view_slug, view_name, and base_collection are required" });
      }

      if (!Array.isArray(pipeline) || pipeline.length === 0) {
        return res.status(400).json({ success: false, message: "pipeline (aggregation array) is required" });
      }

      // Save metadata
      const viewDoc = await DatabaseView.findOneAndUpdate(
        { view_slug, deleted_at: null },
        { view_name, view_slug, base_collection, form_slug: form_slug || null, description: description || "", pipeline, configuration: configuration || {}, is_active: true, status: "ACTIVE", auto_generated: false, updated_by: userId },
        { new: true, upsert: true }
      );

      // Apply MongoDB view
      const db = mongoose.connection.db;
      await applyMongoView(db, view_slug, base_collection, pipeline);

      return res.status(201).json({ success: true, message: "View saved and applied to MongoDB", data: viewDoc });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },

  // Preview view results with optional filtering
  queryView: async (req, res) => {
    try {
      const { slug } = req.params;
      const { page = 1, limit = 20, search, search_fields = [] } = req.body;

      const viewMeta = await DatabaseView.findOne({ view_slug: slug, deleted_at: null });
      if (!viewMeta) return res.status(404).json({ success: false, message: "View not found" });

      const db = mongoose.connection.db;
      const skip = (Number(page) - 1) * Number(limit);

      let matchFilter = {};
      if (search && search_fields.length > 0) {
        matchFilter.$or = search_fields.map(f => ({ [f]: { $regex: search, $options: "i" } }));
      }

      const aggPipeline = [
        ...viewMeta.pipeline,
        ...(Object.keys(matchFilter).length > 0 ? [{ $match: matchFilter }] : []),
      ];

      const countPipeline = [...aggPipeline, { $count: "total" }];
      const dataPipeline = [...aggPipeline, { $skip: skip }, { $limit: Number(limit) }];

      const viewCollection = db.collection(viewMeta.base_collection);
      const [countResult, data] = await Promise.all([
        viewCollection.aggregate(countPipeline).toArray(),
        viewCollection.aggregate(dataPipeline).toArray(),
      ]);

      const total = countResult[0]?.total || 0;

      return res.json({
        success: true,
        view_meta: { view_name: viewMeta.view_name, view_slug: viewMeta.view_slug, configuration: viewMeta.configuration },
        pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
        data,
      });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },

  // Refresh / reapply MongoDB view from saved pipeline
  refreshView: async (req, res) => {
    try {
      const { slug } = req.params;
      const view = await DatabaseView.findOne({ view_slug: slug, deleted_at: null });
      if (!view) return res.status(404).json({ success: false, message: "View not found" });

      const db = mongoose.connection.db;
      await applyMongoView(db, view.view_slug, view.base_collection, view.pipeline);

      return res.json({ success: true, message: `View "${slug}" refreshed in MongoDB` });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },

  // Delete a database view
  deleteView: async (req, res) => {
    try {
      const { slug } = req.params;
      const view = await DatabaseView.findOneAndUpdate({ view_slug: slug, deleted_at: null }, { deleted_at: new Date(), status: "INACTIVE", is_active: false });
      if (!view) return res.status(404).json({ success: false, message: "View not found" });

      // Drop MongoDB view
      try {
        const db = mongoose.connection.db;
        await db.dropCollection(slug);
      } catch (_) { /* view may not exist in MongoDB yet */ }

      return res.json({ success: true, message: `View "${slug}" deleted` });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },

  // Auto-generate a view for a form (based on its schema)
  autoGenerateView: async (req, res) => {
    try {
      const userId = req.user?.user_id;
      const { form_slug } = req.body;
      if (!form_slug) return res.status(400).json({ success: false, message: "form_slug is required" });

      const Form = require("../../models/Form.model");
      const form = await Form.findOne({ slug: form_slug, deleted_at: null });
      if (!form) return res.status(404).json({ success: false, message: "Form schema not found" });

      const viewSlug = `v_${form_slug}`;
      const viewName = `${form.title} View`;

      // Build project stage from table_columns
      const projectFields = { _id: 1, form_slug: 1, status: 1, created_at: 1, updated_at: 1 };
      for (const col of form.table_columns || []) {
        if (!col.key || col.checked === false) continue;
        if (col.key === "id") {
          projectFields["id"] = "$_id";
        } else if (["_id", "form_slug", "status", "created_at", "updated_at", "created_by", "updated_by"].includes(col.key)) {
          projectFields[col.key] = 1;
        } else {
          projectFields[col.key] = `$data.${col.key}`;
        }
      }
      projectFields["submitted_by_name"] = { $arrayElemAt: ["$created_by_user.name", 0] };
      projectFields["submitted_by_email"] = { $arrayElemAt: ["$created_by_user.email", 0] };

      const pipeline = [
        { $match: { form_slug, deleted_at: null } },
        {
          $lookup: {
            from: "users",
            localField: "created_by",
            foreignField: "_id",
            as: "created_by_user",
          },
        },
        { $project: projectFields },
      ];

      const db = mongoose.connection.db;
      await applyMongoView(db, viewSlug, "formdatas", pipeline);

      const viewDoc = await DatabaseView.findOneAndUpdate(
        { view_slug: viewSlug },
        { view_name: viewName, view_slug: viewSlug, base_collection: "formdatas", form_slug, pipeline, configuration: { fields: form.table_columns || [] }, is_active: true, status: "ACTIVE", auto_generated: true, updated_by: userId },
        { new: true, upsert: true }
      );

      return res.json({ success: true, message: `View "${viewSlug}" generated`, data: viewDoc });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },
};

// Helper: apply / replace a MongoDB view
async function applyMongoView(db, viewName, viewOn, pipeline) {
  const existing = await db.listCollections({ name: viewName }).toArray();
  if (existing.length > 0) {
    await db.dropCollection(viewName);
  }
  await db.createCollection(viewName, { viewOn, pipeline });
  console.log(`[DatabaseView] ✅ MongoDB View "${viewName}" on "${viewOn}" created`);
}

module.exports = databaseViewController;
