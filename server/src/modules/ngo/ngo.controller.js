// server/src/modules/ngo/ngo.controller.js
// ============================================================
// NGO Core Controller (Registrations, RFPs, Due Diligence, Proposals, Ratings)
// Handles NGO Registration approval, auto user creation (Default@123),
// RFP opportunities listing, and dynamic evaluation ratings.
// ============================================================

const db = require("../../config/db");
const bcrypt = require("bcryptjs");
const { sendNgoProfileCreateEmail } = require("../../email/services/ngoProfileCreateService");
const NgoDueDiligenceVersionsModel = require("../../models/ngoDueDiligenceVersions.model");

/**
 * Approve Implementation Partner / NGO Registration & Auto-Create NGO User
 */
const approvePartner = async (req, res, next) => {
  try {
    const { record_id, form_slug = "implementation_partner", source = "implementation_partner", password: customPassword } = req.body || {};

    if (!record_id) {
      return res.status(400).json({ success: false, message: "record_id is required" });
    }

    let cleanEmail = "";
    let ngoName = "NGO Partner";
    let registrationNo = "";

    // 1. Fetch submitted partner registration from t_frm_implementation_partner
    const partnerRes = await db.query(
      `SELECT * FROM t_frm_implementation_partner WHERE id = $1 AND deleted_at IS NULL`,
      [record_id]
    );

    if (partnerRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Implementation Partner record not found" });
    }

    const partner = partnerRes.rows[0];
    cleanEmail = (partner.email || partner.primary_email || partner.email_id || partner.official_email || "").trim().toLowerCase();
    ngoName = partner.organization_name || partner.name_of_the_organization || partner.name || partner.person_name || "NGO Partner";
    registrationNo = partner.darpan_no || partner.csr_registration_number || "";

    // 2. Update status to Approved in t_frm_implementation_partner
    await db.query(
      `UPDATE t_frm_implementation_partner 
       SET status = 'Approved', registration_status = 'APPROVED', updated_at = NOW() 
       WHERE id = $1`,
      [record_id]
    );

    if (!cleanEmail) {
      return res.status(400).json({
        success: false,
        message: "Registration record does not contain a valid email address."
      });
    }

    // 3. Ensure 'ngo' role exists in t_roles
    let roleRes = await db.query(
      `SELECT id FROM t_roles WHERE slug = 'ngo' AND deleted_at IS NULL LIMIT 1`
    );

    let roleId;
    if (roleRes.rows.length === 0) {
      const newRole = await db.query(
        `INSERT INTO t_roles (name, slug, is_configurator, description)
         VALUES ('NGO Partner', 'ngo', FALSE, 'Registered NGO user access')
         RETURNING id`
      );
      roleId = newRole.rows[0].id;
    } else {
      roleId = roleRes.rows[0].id;
    }

    // 4. Hash default or custom password
    const rawPassword = customPassword || "Default@123";
    const hashedPassword = await bcrypt.hash(rawPassword, 12);

    // 5. Create or activate user in t_users
    let userId;
    const existingUser = await db.query(
      `SELECT id FROM t_users WHERE LOWER(email) = LOWER($1) AND deleted_at IS NULL LIMIT 1`,
      [cleanEmail]
    );

    if (existingUser.rows.length > 0) {
      userId = existingUser.rows[0].id;
      await db.query(
        `UPDATE t_users SET is_active = TRUE, role_id = $1, role_slug = 'ngo', updated_at = NOW() WHERE id = $2`,
        [roleId, userId]
      );
    } else {
      const newUser = await db.query(
        `INSERT INTO t_users
           (name, email, password, role_id, role_slug, department, designation, is_active)
         VALUES ($1, $2, $3, $4, 'ngo', 'NGO Portal', 'Authorized Representative', TRUE)
         RETURNING id`,
        [ngoName, cleanEmail, hashedPassword, roleId]
      );
      userId = newUser.rows[0].id;
    }

    // 6. Dispatch Credentials Email to the NGO
    try {
      sendNgoProfileCreateEmail({
        name: ngoName,
        email: cleanEmail,
        password: rawPassword,
      });
    } catch (mailErr) {
      console.warn("[approvePartner] Email send failed:", mailErr.message);
    }

    return res.status(200).json({
      success: true,
      message: `NGO partner approved successfully! User account created for "${cleanEmail}" with credentials sent via email.`,
      data: {
        partner_id: record_id,
        user_id: userId,
        email: cleanEmail,
        default_password: rawPassword
      }
    });

  } catch (err) {
    console.error("[approvePartner] Error:", err);
    next(err);
  }
};

/**
 * Fetch All NGO Registrations for NGO Manager Listview
 */
const getNgoRegistrations = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    let query = `SELECT * FROM t_frm_implementation_partner WHERE deleted_at IS NULL`;
    const params = [];

    if (status && status !== "ALL") {
      params.push(status);
      query += ` AND (registration_status = $${params.length} OR status = $${params.length})`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (
        LOWER(COALESCE(organization_name, name_of_the_organization, '')) LIKE LOWER($${params.length})
        OR LOWER(COALESCE(darpan_no, csr_registration_number, '')) LIKE LOWER($${params.length})
        OR LOWER(COALESCE(primary_email, email, '')) LIKE LOWER($${params.length})
        OR LOWER(COALESCE(person_name, '')) LIKE LOWER($${params.length})
      )`;
    }

    query += ` ORDER BY created_at DESC`;

    const result = await db.query(query, params);
    return res.status(200).json({
      success: true,
      data: result.rows,
      count: result.rows.length,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Fetch Single Registration Details
 */
const getNgoRegistrationDetail = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT * FROM t_frm_implementation_partner WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Registration not found" });
    }
    return res.status(200).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

/**
 * Manager Update Registration Status / Send for Approval
 */
const updateRegistrationStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: "Status is required" });
    }

    await db.query(
      `UPDATE t_frm_implementation_partner 
       SET registration_status = $1, status = $1, rejection_reason = COALESCE($2, rejection_reason), updated_at = NOW() 
       WHERE id = $3`,
      [status, remarks || null, id]
    );

    return res.status(200).json({
      success: true,
      message: `Registration status updated to ${status}.`,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Fetch All NGO Users from t_users for Admin Float RFP Dropdown
 */
const getApprovedNgos = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT u.id AS user_id, u.name, u.email, u.role_slug
       FROM t_users u
       WHERE u.deleted_at IS NULL
         AND u.is_active = TRUE
         AND (
           u.role_slug = 'ngo'
           OR u.role_id = 6
           OR LOWER(u.department) LIKE '%ngo%'
           OR LOWER(u.designation) LIKE '%ngo%'
         )
       ORDER BY u.name ASC`
    );

    return res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    console.error("[getApprovedNgos] Error:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch NGO users" });
  }
};

/**
 * Fetch Criteria from Master Table t_frm_criteria or RFP Child Table t_frm_request_for_proposal_criteria
 */
const getMasterCriteria = async (req, res, next) => {
  try {
    const { rfp_id } = req.query || {};

    if (rfp_id) {
      // 1. Try to fetch criteria added to this specific RFP via add-more child table
      const childRes = await db.query(
        `SELECT 
          c_child.id AS id,
          c_child.parent_id,
          c_child.request_criteria,
          COALESCE(c_child.weight, 10) AS weightage,
          COALESCE(c_master.criteria_name, 'Criterion #' || c_child.id) AS criteria_name,
          COALESCE(c_master.criteria_name, 'Criterion #' || c_child.id) AS name
        FROM t_frm_request_for_proposal_criteria c_child
        LEFT JOIN t_frm_criteria c_master ON c_master.id::text = c_child.request_criteria::text OR LOWER(c_master.criteria_name) = LOWER(c_child.request_criteria::text)
        WHERE c_child.parent_id = $1 AND c_child.deleted_at IS NULL
        ORDER BY c_child.id ASC`,
        [rfp_id]
      );

      if (childRes.rows.length > 0) {
        return res.status(200).json({
          success: true,
          data: childRes.rows
        });
      }

      // 2. Check JSON column evaluation_criteria on t_frm_request_for_proposal
      const rfpRes = await db.query(
        `SELECT evaluation_criteria FROM t_frm_request_for_proposal WHERE id = $1 AND deleted_at IS NULL`,
        [rfp_id]
      );

      const rawEval = rfpRes.rows[0]?.evaluation_criteria;
      let parsedEval = [];
      if (typeof rawEval === "string") {
        try { parsedEval = JSON.parse(rawEval); } catch (e) {}
      } else if (Array.isArray(rawEval)) {
        parsedEval = rawEval;
      }

      if (Array.isArray(parsedEval) && parsedEval.length > 0) {
        const formatted = parsedEval.map((c, i) => ({
          id: c.id || (i + 1),
          criteria_name: c.name || c.criteria_name || c.title || `Criteria ${i + 1}`,
          name: c.name || c.criteria_name || c.title || `Criteria ${i + 1}`,
          weightage: Number(c.weight || c.weightage || 10)
        }));
        return res.status(200).json({ success: true, data: formatted });
      }
    }

    // Fallback: Fetch all from master criteria table t_frm_criteria
    const result = await db.query(
      `SELECT id, criteria_name AS name, criteria_name, 10 AS weightage
       FROM t_frm_criteria
       WHERE deleted_at IS NULL
       ORDER BY id ASC`
    );

    return res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    console.error("[getMasterCriteria] Error:", err);
    return res.status(200).json({ success: true, data: [] });
  }
};

/**
 * Float RFP to Selected NGOs (Targeted RFP Floating into t_frm_rfp_float)
 */
const floatRfp = async (req, res, next) => {
  try {
    const { rfp_id, ngo_ids, evaluation_criteria, remarks, float_date } = req.body || {};
    const creatorId = req.user?.id || 1;

    if (!rfp_id) {
      return res.status(400).json({ success: false, message: "rfp_id is required" });
    }

    if (!Array.isArray(ngo_ids) || ngo_ids.length === 0) {
      return res.status(400).json({ success: false, message: "At least one NGO must be selected to float the RFP." });
    }

    const updatedCriteria = evaluation_criteria || [];

    // Ensure float_date columns exist on t_frm_request_for_proposal
    try {
      await db.query(`
        ALTER TABLE t_frm_request_for_proposal
        ADD COLUMN IF NOT EXISTS float_date DATE,
        ADD COLUMN IF NOT EXISTS floated_date DATE;
      `);
    } catch (colErr) {
      console.warn("[floatRfp] Column ensure notice:", colErr.message);
    }

    // 1. Fetch details of selected NGO users for name_ngo column
    const ngoUsersRes = await db.query(
      `SELECT id, name, email FROM t_users WHERE id = ANY($1::int[])`,
      [ngo_ids]
    );

    const ngoNamesJson = JSON.stringify(ngoUsersRes.rows);
    const ngoIdsJson = JSON.stringify(ngo_ids);
    const targetFloatDate = float_date || null;

    // 2. Insert record into t_frm_rfp_float table
    await db.query(
      `INSERT INTO t_frm_rfp_float (parent_id, float_date, remarks, ngo, status, created_by, updated_by, name_ngo)
       VALUES ($1, COALESCE($2::date, CURRENT_DATE), $3, $4, 'floated', $5, $5, $6)`,
      [rfp_id, targetFloatDate, remarks || `Criteria: ${updatedCriteria.join(", ")}`, ngoIdsJson, creatorId, ngoNamesJson]
    );

    // 3. Update master RFP table t_frm_request_for_proposal
    await db.query(
      `UPDATE t_frm_request_for_proposal
       SET floated_ngos = $1,
           evaluation_criteria = $2,
           status = 'floated',
           float_date = COALESCE($4::date, CURRENT_DATE),
           floated_date = COALESCE($4::date, CURRENT_DATE),
           updated_at = NOW()
       WHERE id = $3`,
      [ngoIdsJson, JSON.stringify(updatedCriteria), rfp_id, targetFloatDate]
    );

    return res.status(200).json({
      success: true,
      message: `RFP floated successfully to ${ngo_ids.length} selected NGO(s)!`
    });
  } catch (err) {
    console.error("[floatRfp] Error:", err);
    next(err);
  }
};

/**
 * Shared Helper: Query RFPs from dynamic form table (e.g. t_frm_request_for_proposal)
 * Supports dynamic form_slug, targetRfpType ('open' | 'closed'), and multi-type NGO assignment
 */
const fetchRfpList = async ({ req, res, targetRfpType }) => {
  try {
    const userId = req.user?.id || req.user?.userId || 0;
    const cleanEmail = (req.user?.email || "").trim().toLowerCase();
    const isConfigurator = Boolean(req.user?.isConfigurator);

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 8);
    const offset = (page - 1) * limit;
    const search = (req.query.search || "").trim();
    const statusFilter = (req.query.status_filter || "all").toLowerCase();

    // 1. Resolve form_slug and corresponding table name
    const rawSlug = (req.query.form_slug || req.query.slug || "request_for_proposal").trim();
    const formSlug = rawSlug.toLowerCase().replace(/[^a-z0-9_]/g, "");
    const tableName = `t_frm_${formSlug}`;

    // 2. Check if table exists in postgres
    const tblCheck = await db.query(
      `SELECT to_regclass('public.' || quote_ident($1)) AS tbl`,
      [tableName]
    );
    if (!tblCheck.rows[0]?.tbl) {
      return res.status(200).json({
        success: true,
        data: [],
        totalCount: 0,
        page,
        limit,
        formSlug,
        rfpType: targetRfpType || "all",
        stats: { totalAssigned: 0, submittedCount: 0, pendingCount: 0 }
      });
    }

    // 3. Ensure proposal submission table exists with form_slug support
    await db.query(`
      CREATE TABLE IF NOT EXISTS t_frm_rfp_proposal_submission (
        id SERIAL PRIMARY KEY,
        parent_id INT,
        form_slug VARCHAR(150),
        organization_profile TEXT,
        project_understanding TEXT,
        methodology TEXT,
        team TEXT,
        implementation_plan TEXT,
        risk_plan TEXT,
        budget TEXT,
        timeline TEXT,
        sustainability TEXT,
        monitoring_framework TEXT,
        proposal_pdf TEXT,
        budget_excel TEXT,
        team_cvs TEXT,
        previous_experience TEXT,
        case_studies TEXT,
        status VARCHAR(50) DEFAULT 'Submitted',
        final_status VARCHAR(50) DEFAULT 'Submitted',
        rating NUMERIC(4,2),
        criteria_scores JSONB,
        evaluation_notes TEXT,
        created_by INT,
        updated_by INT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_at TIMESTAMPTZ
      );
      ALTER TABLE t_frm_rfp_proposal_submission ADD COLUMN IF NOT EXISTS form_slug VARCHAR(150);
      ALTER TABLE t_frm_rfp_proposal_submission ADD COLUMN IF NOT EXISTS rating NUMERIC(4,2);
      ALTER TABLE t_frm_rfp_proposal_submission ADD COLUMN IF NOT EXISTS evaluation_notes TEXT;
      ALTER TABLE t_frm_rfp_proposal_submission ADD COLUMN IF NOT EXISTS criteria_scores JSONB;
      ALTER TABLE t_frm_rfp_proposal_submission ADD COLUMN IF NOT EXISTS final_status VARCHAR(50) DEFAULT 'Submitted';
    `);

    // 4. Introspect table columns to safely support dynamic schema
    const colCheck = await db.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = $1`,
      [tableName]
    );
    const colSet = new Set(colCheck.rows.map(r => r.column_name.toLowerCase()));

    const hasDeletedAt = colSet.has("deleted_at");
    const hasRfpType = colSet.has("rfp_type");
    const hasNgo = colSet.has("ngo");
    const hasProjectDetails = colSet.has("project_details");
    const hasTitle = colSet.has("title");
    const hasObjective = colSet.has("objective");
    const hasScopeOfWork = colSet.has("scope_of_work");
    const hasDeliverables = colSet.has("deliverables");
    const hasBudgetRange = colSet.has("budget_range");
    const hasBudget = colSet.has("budget");
    const hasContactPerson = colSet.has("contact_person");
    const hasCreatedAt = colSet.has("created_at");

    // 5. Lookup linked NGO partner ID for this user
    let partnerId = null;
    if (userId || cleanEmail) {
      try {
        const partnerRes = await db.query(
          `SELECT id FROM t_frm_implementation_partner 
           WHERE ($1::int IS NOT NULL AND $1::int > 0 AND created_by = $1::int) 
              OR (LOWER(COALESCE(primary_email, '')) = $2 AND $2 <> '') 
           LIMIT 1`,
          [userId || null, cleanEmail]
        );
        if (partnerRes.rows.length > 0) {
          partnerId = partnerRes.rows[0].id;
        }
      } catch (err) {
        console.warn("[fetchRfpList] Partner lookup notice:", err.message);
      }
    }

    const params = [];
    let whereConditions = hasDeletedAt ? `rfp.deleted_at IS NULL` : `1=1`;

    // Filter by target rfp_type (e.g. 'open' vs 'closed')
    if (hasRfpType && targetRfpType) {
      params.push(targetRfpType);
      whereConditions += ` AND LOWER(TRIM(COALESCE(rfp.rfp_type, ''))) = LOWER(TRIM($${params.length}))`;
    }

    // Filter by NGO assignment (support single int today, and multiple / arrays / comma-separated / JSON in future)
    if (!isConfigurator && hasNgo) {
      params.push(partnerId);
      const pIdx = params.length;
      params.push(userId);
      const uIdx = params.length;

      whereConditions += ` AND (
        rfp.ngo IS NULL
        OR rfp.ngo = 0
        OR (
          $${pIdx}::int IS NOT NULL
          AND (
            rfp.ngo = $${pIdx}::int
            OR rfp.ngo::text = $${pIdx}::text
            OR rfp.ngo::text ~* ('\\y' || $${pIdx}::text || '\\y')
          )
        )
        OR (
          $${uIdx}::int IS NOT NULL AND $${uIdx}::int > 0
          AND (
            rfp.ngo = $${uIdx}::int
            OR rfp.ngo::text = $${uIdx}::text
            OR rfp.ngo::text ~* ('\\y' || $${uIdx}::text || '\\y')
          )
        )
      )`;
    }

    // Search query across available text fields
    if (search) {
      params.push(`%${search}%`);
      const sIdx = params.length;
      const searchFields = [];
      if (hasProjectDetails) searchFields.push(`COALESCE(rfp.project_details, '')`);
      if (hasTitle) searchFields.push(`COALESCE(rfp.title, '')`);
      if (hasObjective) searchFields.push(`COALESCE(rfp.objective, '')`);
      if (hasScopeOfWork) searchFields.push(`COALESCE(rfp.scope_of_work, '')`);
      if (hasDeliverables) searchFields.push(`COALESCE(rfp.deliverables, '')`);
      if (hasBudgetRange) searchFields.push(`COALESCE(rfp.budget_range, '')`);
      if (hasBudget) searchFields.push(`COALESCE(rfp.budget, '')`);
      if (hasContactPerson) searchFields.push(`COALESCE(rfp.contact_person, '')`);

      if (searchFields.length > 0) {
        whereConditions += ` AND (${searchFields.map(f => `LOWER(${f}) LIKE LOWER($${sIdx})`).join(" OR ")})`;
      }
    }

    // Having clause for submission status filter (all / pending / submitted)
    let havingClause = "";
    if (statusFilter === "submitted") {
      havingClause = "HAVING COUNT(sub.id) > 0";
    } else if (statusFilter === "pending") {
      havingClause = "HAVING COUNT(sub.id) = 0";
    }

    params.push(userId);
    const subUserIdx = params.length;
    params.push(partnerId);
    const subPartnerIdx = params.length;

    params.push(limit);
    const limitIdx = params.length;
    params.push(offset);
    const offsetIdx = params.length;

    const orderByCol = hasCreatedAt ? "rfp.created_at DESC" : "rfp.id DESC";
    const titleExpr = hasProjectDetails
      ? "rfp.project_details"
      : hasTitle
      ? "rfp.title"
      : "'RFP #' || rfp.id";

    const budgetExpr = hasBudgetRange
      ? "rfp.budget_range"
      : hasBudget
      ? "rfp.budget"
      : "NULL";

    const query = `
      SELECT 
        rfp.*, 
        ${titleExpr} AS title,
        ${budgetExpr} AS budget,
        (COUNT(sub.id) > 0) AS is_already_submitted,
        MAX(sub.created_at) AS submitted_at,
        MAX(sub.status) AS submission_status,
        MAX(sub.final_status) AS final_status,
        MAX(sub.rating) AS rating,
        MAX(sub.evaluation_notes) AS evaluation_notes,
        MAX(sub.id) AS submission_id,
        COUNT(*) OVER() AS full_count
      FROM ${tableName} rfp
      LEFT JOIN t_frm_rfp_proposal_submission sub ON sub.parent_id = rfp.id 
        AND sub.deleted_at IS NULL 
        AND (
          sub.created_by = $${subUserIdx} 
          OR ($${subPartnerIdx}::int IS NOT NULL AND sub.created_by = $${subPartnerIdx}::int)
        )
      WHERE ${whereConditions}
      GROUP BY rfp.id
      ${havingClause}
      ORDER BY ${orderByCol}
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `;

    const result = await db.query(query, params);
    const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].full_count, 10) : 0;

    // Get statistics for the current filtered rfp_type and form table
    const statsParams = [];
    let statsWhere = hasDeletedAt ? `rfp.deleted_at IS NULL` : `1=1`;
    if (hasRfpType && targetRfpType) {
      statsParams.push(targetRfpType);
      statsWhere += ` AND LOWER(TRIM(COALESCE(rfp.rfp_type, ''))) = LOWER(TRIM($${statsParams.length}))`;
    }
    if (!isConfigurator && hasNgo) {
      statsParams.push(partnerId);
      const spIdx = statsParams.length;
      statsParams.push(userId);
      const suIdx = statsParams.length;
      statsWhere += ` AND (
        rfp.ngo IS NULL
        OR rfp.ngo = 0
        OR (
          $${spIdx}::int IS NOT NULL
          AND (
            rfp.ngo = $${spIdx}::int
            OR rfp.ngo::text = $${spIdx}::text
            OR rfp.ngo::text ~* ('\\y' || $${spIdx}::text || '\\y')
          )
        )
        OR (
          $${suIdx}::int IS NOT NULL AND $${suIdx}::int > 0
          AND (
            rfp.ngo = $${suIdx}::int
            OR rfp.ngo::text = $${suIdx}::text
            OR rfp.ngo::text ~* ('\\y' || $${suIdx}::text || '\\y')
          )
        )
      )`;
    }
    statsParams.push(userId);
    const stUserIdx = statsParams.length;
    statsParams.push(partnerId);
    const stPartIdx = statsParams.length;

    const statsRes = await db.query(`
      SELECT 
        COUNT(DISTINCT rfp.id) AS total_assigned,
        COUNT(DISTINCT CASE WHEN sub.id IS NOT NULL THEN rfp.id END) AS submitted_count
      FROM ${tableName} rfp
      LEFT JOIN t_frm_rfp_proposal_submission sub ON sub.parent_id = rfp.id 
        AND sub.deleted_at IS NULL 
        AND (
          sub.created_by = $${stUserIdx} 
          OR ($${stPartIdx}::int IS NOT NULL AND sub.created_by = $${stPartIdx}::int)
        )
      WHERE ${statsWhere}
    `, statsParams);

    const totalAssigned = parseInt(statsRes.rows[0]?.total_assigned || 0, 10);
    const submittedCount = parseInt(statsRes.rows[0]?.submitted_count || 0, 10);

    return res.status(200).json({
      success: true,
      data: result.rows,
      totalCount,
      page,
      limit,
      formSlug,
      rfpType: targetRfpType || "all",
      stats: {
        totalAssigned,
        submittedCount,
        pendingCount: Math.max(0, totalAssigned - submittedCount)
      }
    });
  } catch (err) {
    console.error("[fetchRfpList] Error:", err);
    return res.status(200).json({
      success: true,
      data: [],
      totalCount: 0,
      page: 1,
      limit: 8,
      formSlug: req.query?.form_slug || "request_for_proposal",
      rfpType: targetRfpType || "all",
      stats: { totalAssigned: 0, submittedCount: 0, pendingCount: 0 }
    });
  }
};

/**
 * 1. Dedicated API: Fetch Open RFPs (rfp_type = 'open')
 * Query params: ?form_slug=request_for_proposal&page=1&limit=8&search=&status_filter=all
 */
const getOpenRfps = async (req, res, next) => {
  return fetchRfpList({ req, res, targetRfpType: "open" });
};

/**
 * 2. Dedicated API: Fetch Closed RFPs (rfp_type = 'closed')
 * Query params: ?form_slug=request_for_proposal&page=1&limit=8&search=&status_filter=all
 */
const getClosedRfps = async (req, res, next) => {
  return fetchRfpList({ req, res, targetRfpType: "closed" });
};

/**
 * Fetch My Submitted Proposal & Evaluation Details for a specific RFP
 */
const getMyProposal = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.user?.userId || 0;
    const cleanEmail = (req.user?.email || "").trim().toLowerCase();
    const rfpId = parseInt(req.params?.rfpId || req.query?.rfp_id, 10);

    if (!rfpId) {
      return res.status(400).json({ success: false, message: "Valid RFP ID is required" });
    }

    let partnerId = null;
    if (userId || cleanEmail) {
      try {
        const partnerRes = await db.query(
          `SELECT id FROM t_frm_implementation_partner 
           WHERE ($1::int IS NOT NULL AND $1::int > 0 AND created_by = $1::int) 
              OR (LOWER(COALESCE(primary_email, '')) = $2 AND $2 <> '') 
           LIMIT 1`,
          [userId || null, cleanEmail]
        );
        if (partnerRes.rows.length > 0) {
          partnerId = partnerRes.rows[0].id;
        }
      } catch (err) {
        console.warn("[getMyProposal] Partner lookup notice:", err.message);
      }
    }

    const subRes = await db.query(
      `SELECT sub.*, 
              rfp.project_details, rfp.title, rfp.rfp_type, rfp.submission_deadline, rfp.budget_range
       FROM t_frm_rfp_proposal_submission sub
       LEFT JOIN t_frm_request_for_proposal rfp ON rfp.id = sub.parent_id
       WHERE sub.parent_id = $1 AND sub.deleted_at IS NULL
         AND (
           sub.created_by = $2 
           OR ($3::int IS NOT NULL AND sub.created_by = $3::int)
         )
       ORDER BY sub.created_at DESC
       LIMIT 1`,
      [rfpId, userId, partnerId]
    );

    if (subRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "No proposal submission found for this RFP" });
    }

    return res.status(200).json({
      success: true,
      data: subRes.rows[0],
    });
  } catch (err) {
    console.error("getMyProposal error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 3. Backwards Compatibility: Fetch RFP Opportunities with optional rfp_type param
 */
const getRfpOpportunities = async (req, res, next) => {
  const rfpType = (req.query.rfp_type || req.query.rfptype || "").trim().toLowerCase();
  return fetchRfpList({ req, res, targetRfpType: rfpType });
};

/**
 * Save Admin Rating & Dynamic Criteria Evaluation for Submitted NGO Proposal
 */
const saveNgoEvaluation = async (req, res, next) => {
  try {
    const { due_diligence_id, rfp_id, rating, criteria_scores, evaluation_notes, final_status } = req.body || {};

    if (!due_diligence_id) {
      return res.status(400).json({ success: false, message: "due_diligence_id is required" });
    }

    const scoresJson = JSON.stringify(criteria_scores || {});

    // Try updating t_frm_partner_due_dilligence
    await db.query(
      `UPDATE t_frm_partner_due_dilligence
       SET rating = $1, criteria_scores = $2, evaluation_notes = $3, final_status = $4, updated_at = NOW()
       WHERE id = $5`,
      [rating || 0, scoresJson, evaluation_notes || "", final_status || "Evaluated", due_diligence_id]
    );

    // Also try updating t_frm_rfp_proposal_submission if it exists
    await db.query(
      `UPDATE t_frm_rfp_proposal_submission
       SET rating = $1, criteria_scores = $2, evaluation_notes = $3, final_status = $4, updated_at = NOW()
       WHERE id = $5`,
      [rating || 0, scoresJson, evaluation_notes || "", final_status || "Evaluated", due_diligence_id]
    );

    return res.status(200).json({
      success: true,
      message: "NGO evaluation and criteria ratings saved successfully!"
    });
  } catch (err) {
    console.error("[saveNgoEvaluation] Error:", err);
    next(err);
  }
};

/**
 * Submit Floated RFP Proposal by Logged-In NGO
 */
const submitRfpProposal = async (req, res, next) => {
  try {
    const {
      rfp_id,
      form_slug,
      organization_profile,
      project_understanding,
      methodology,
      team,
      implementation_plan,
      risk_plan,
      budget,
      timeline,
      sustainability,
      monitoring_framework,
      proposal_pdf,
      budget_excel,
      team_cvs,
      previous_experience,
      case_studies
    } = req.body || {};

    const creatorId = req.user?.id || 1;

    if (!rfp_id) {
      return res.status(400).json({ success: false, message: "rfp_id is required" });
    }

    // Single-Submission Check: Prevent duplicate proposal submissions for the same RFP
    const existing = await db.query(
      `SELECT id, created_at FROM t_frm_rfp_proposal_submission 
       WHERE parent_id = $1 AND created_by = $2 AND deleted_at IS NULL`,
      [rfp_id, creatorId]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "You have already submitted a proposal for this RFP. Re-submission is not permitted, but you can view your submission details."
      });
    }

    const cleanFormSlug = String(form_slug || "request_for_proposal").trim().toLowerCase().replace(/[^a-z0-9_]/g, "");

    const insertResult = await db.query(
      `INSERT INTO t_frm_rfp_proposal_submission (
        parent_id,
        form_slug,
        organization_profile,
        project_understanding,
        methodology,
        team,
        implementation_plan,
        risk_plan,
        budget,
        timeline,
        sustainability,
        monitoring_framework,
        proposal_pdf,
        budget_excel,
        team_cvs,
        previous_experience,
        case_studies,
        status,
        final_status,
        created_by,
        updated_by,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
        'Submitted', 'Submitted', $18, $18, NOW(), NOW()
      ) RETURNING id`,
      [
        rfp_id,
        cleanFormSlug,
        organization_profile || "",
        project_understanding || "",
        methodology || "",
        team || "",
        implementation_plan || "",
        risk_plan || "",
        budget ? String(budget) : "",
        timeline || "",
        sustainability || "",
        monitoring_framework || "",
        proposal_pdf || null,
        budget_excel || null,
        team_cvs || null,
        previous_experience || null,
        case_studies || null,
        creatorId
      ]
    );

    return res.status(200).json({
      success: true,
      message: "Proposal submitted to CSR Admin successfully!",
      submission_id: insertResult.rows[0]?.id
    });
  } catch (err) {
    console.error("[submitRfpProposal] Error:", err);
    next(err);
  }
};

/**
 * Helper: Ensure RFP table has approval and tagging columns
 */
const ensureRfpColumnsExist = async () => {
  try {
    await db.query(`
      ALTER TABLE t_frm_request_for_proposal
      ADD COLUMN IF NOT EXISTS assigned_approver_id INTEGER,
      ADD COLUMN IF NOT EXISTS approver_role_id INTEGER,
      ADD COLUMN IF NOT EXISTS approval_remarks TEXT,
      ADD COLUMN IF NOT EXISTS tagged_ngo_id INTEGER,
      ADD COLUMN IF NOT EXISTS tagged_ngo_name VARCHAR(255);
    `);
  } catch (err) {
    console.warn("[ensureRfpColumnsExist] Notice:", err.message);
  }
};

/**
 * Helper: Ensure Approval Track table exists
 */
const ensureApprovalTrackTableExist = async () => {
  try {
    await db.query(`
      CREATE SEQUENCE IF NOT EXISTS t_approval_process_track_id_seq;

      CREATE TABLE IF NOT EXISTS public.t_approval_process_track
      (
          apt_id character varying(255) PRIMARY KEY DEFAULT ('APT'::text || lpad(((nextval('t_approval_process_track_id_seq'::regclass))::character varying)::text, 20, '0'::text)),
          apt_type character varying(255),
          apt_item_id integer,
          apt_user_id integer,
          apt_user_role character varying(255),
          apt_accept_step character varying(255),
          apt_remarks text,
          apt_recipient_role character varying(255),
          apt_recipient_id integer,
          apt_accept_status character varying(255),
          apt_status_flag character varying(255),
          apt_created_at timestamp without time zone DEFAULT NOW(),
          apt_updated_at timestamp without time zone DEFAULT NOW(),
          apt_deleted_at timestamp without time zone DEFAULT NULL,
          apt_created_by integer,
          apt_updated_by integer
      );
    `);
  } catch (err) {
    console.warn("[ensureApprovalTrackTableExist] Notice:", err.message);
  }
};

/**
 * Helper: Ensure Notification table has prefix columns for notification listing & header count
 */
const ensureNotificationColumnsExist = async () => {
  try {
    await db.query(`
      ALTER TABLE t_notifications
      ADD COLUMN IF NOT EXISTS ntf_id SERIAL,
      ADD COLUMN IF NOT EXISTS ntf_user_id INTEGER,
      ADD COLUMN IF NOT EXISTS ntf_title VARCHAR(300),
      ADD COLUMN IF NOT EXISTS ntf_message TEXT,
      ADD COLUMN IF NOT EXISTS ntf_type VARCHAR(50),
      ADD COLUMN IF NOT EXISTS ntf_link VARCHAR(500),
      ADD COLUMN IF NOT EXISTS ntf_is_read BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS ntf_created_at TIMESTAMPTZ DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS ntf_deleted_at TIMESTAMPTZ DEFAULT NULL;
    `);
  } catch (err) {
    console.warn("[ensureNotificationColumnsExist] Notice:", err.message);
  }
};

/**
 * Admin / Approver: Get approval process track timeline for an RFP
 */
const getApprovalTrack = async (req, res, next) => {
  try {
    const { rfp_id } = req.query || {};
    if (!rfp_id) {
      return res.status(400).json({ success: false, message: "rfp_id is required" });
    }

    await ensureApprovalTrackTableExist();

    const result = await db.query(
      `SELECT
        apt.*,
        u1.name AS user_name,
        u1.email AS user_email,
        u2.name AS recipient_name,
        u2.email AS recipient_email
       FROM t_approval_process_track apt
       LEFT JOIN t_users u1 ON u1.id = apt.apt_user_id
       LEFT JOIN t_users u2 ON u2.id = apt.apt_recipient_id
       WHERE (apt.apt_item_id = $1 OR apt.apt_item_id::text = $1::text)
         AND apt.apt_deleted_at IS NULL
       ORDER BY apt.apt_created_at ASC`,
      [rfp_id]
    );

    return res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    console.error("[getApprovalTrack] Error:", err);
    next(err);
  }
};

/**
 * Admin: Get all submitted proposals for an RFP
 */
const getSubmittedProposals = async (req, res, next) => {
  try {
    const { rfp_id } = req.query || {};
    if (!rfp_id) {
      return res.status(400).json({ success: false, message: "rfp_id is required" });
    }

    await ensureRfpColumnsExist();

    const [subRes, floatRes, rfpRes] = await Promise.all([
      db.query(
        `SELECT 
          sub.*,
          u.name AS ngo_name,
          u.email AS ngo_email
        FROM t_frm_rfp_proposal_submission sub
        LEFT JOIN t_users u ON u.id = sub.created_by
        WHERE sub.parent_id = $1 AND sub.deleted_at IS NULL
        ORDER BY sub.created_at ASC`,
        [rfp_id]
      ),
      db.query(
        `SELECT 
          fl.*
        FROM t_frm_rfp_float fl
        WHERE fl.parent_id = $1 AND fl.deleted_at IS NULL
        ORDER BY fl.created_at DESC`,
        [rfp_id]
      ),
      db.query(
        `SELECT 
          rfp.*,
          u.name AS approver_name,
          u.email AS approver_email,
          r.name AS approver_role_name
        FROM t_frm_request_for_proposal rfp
        LEFT JOIN t_users u ON u.id = rfp.assigned_approver_id
        LEFT JOIN t_roles r ON r.id = rfp.approver_role_id
        WHERE rfp.id = $1 AND rfp.deleted_at IS NULL`,
        [rfp_id]
      )
    ]);

    const floatRecord = floatRes.rows[0] || {};
    const floatedNgosCount = floatRes.rows.length;
    const rfpRecord = rfpRes.rows[0] || {};

    return res.status(200).json({
      success: true,
      data: subRes.rows,
      rfpRecord,
      floatDetails: {
        float_date: floatRecord.float_date || floatRecord.created_at || null,
        remarks: floatRecord.remarks || "No remarks provided.",
        floated_ngos_count: floatedNgosCount,
        ngo_names: floatRes.rows.map(r => r.name_ngo).filter(Boolean),
      }
    });
  } catch (err) {
    console.error("[getSubmittedProposals] Error:", err);
    next(err);
  }
};

/**
 * Admin: Save criteria-wise scores for a submitted NGO proposal
 */
const saveCriteriaScore = async (req, res, next) => {
  try {
    const {
      submission_id,
      rfp_id,
      criteria_scores,
      rating,
      evaluation_notes,
      final_status,
      approver_role_id,
      assigned_approver_id,
      approval_remarks
    } = req.body || {};

    if (!submission_id) {
      return res.status(400).json({ success: false, message: "submission_id is required" });
    }

    await ensureRfpColumnsExist();

    // 1. Update NGO submission proposal score
    await db.query(
      `UPDATE t_frm_rfp_proposal_submission
       SET criteria_scores = $1, rating = $2, evaluation_notes = $3, final_status = $4, updated_at = NOW()
       WHERE id = $5`,
      [
        JSON.stringify(criteria_scores || []),
        rating || 0,
        evaluation_notes || "",
        final_status || "Evaluated",
        submission_id
      ]
    );

    // 2. If sent for approval, update main RFP record status, approver role, user, & remarks
    if (final_status === "Sent for Approval") {
      let targetRfpId = rfp_id;
      if (!targetRfpId) {
        const subCheck = await db.query(
          `SELECT parent_id, rfp_id FROM t_frm_rfp_proposal_submission WHERE id = $1`,
          [submission_id]
        );
        targetRfpId = subCheck.rows[0]?.parent_id || subCheck.rows[0]?.rfp_id;
      }

      if (targetRfpId) {
        await db.query(
          `UPDATE t_frm_request_for_proposal
           SET status = 'Sent for Approval',
               assigned_approver_id = $1,
               approver_role_id = $2,
               approval_remarks = $3,
               tagged_ngo_id = NULL,
               tagged_ngo_name = NULL,
               updated_at = NOW()
           WHERE id = $4`,
          [assigned_approver_id || null, approver_role_id || null, approval_remarks || "", targetRfpId]
        );

        // Deduplicate: Check if an approval track entry was ALREADY created for this RFP in the last 10 seconds
        let alreadyInsertedTrack = false;
        try {
          await ensureApprovalTrackTableExist();
          const checkTrack = await db.query(
            `SELECT apt_id FROM t_approval_process_track
             WHERE apt_type = 'RFP_ASSESSMENT'
               AND apt_item_id = $1
               AND apt_accept_step = 'Sent for Approval'
               AND apt_created_at > NOW() - INTERVAL '10 seconds'`,
            [parseInt(targetRfpId, 10)]
          );
          if (checkTrack.rows.length > 0) {
            alreadyInsertedTrack = true;
          }
        } catch (checkErr) {
          console.warn("[saveCriteriaScore] Track check notice:", checkErr.message);
        }

        if (!alreadyInsertedTrack) {
          // 3. Send in-app notification to selected approver user or all users in selected role
          try {
            await ensureNotificationColumnsExist();
            const notifTitle = "RFP Assessment Matrix Sent for Approval";
            const notifMsg = `An RFP Assessment Matrix has been submitted for your approval.${
              approval_remarks ? ` Remarks: ${approval_remarks}` : ""
            }`;
            const notifLink = `/admin/ngo/rfp-assessment?rfp_id=${targetRfpId || ""}`;

            let targetUserIds = [];

            if (assigned_approver_id) {
              const uid = parseInt(assigned_approver_id, 10);
              if (!isNaN(uid)) {
                targetUserIds.push(uid);
              } else {
                // Find by email/name
                const uRes = await db.query(
                  `SELECT id FROM t_users WHERE (email = $1 OR usr_email = $1 OR name = $1) AND deleted_at IS NULL LIMIT 1`,
                  [String(assigned_approver_id).trim()]
                );
                if (uRes.rows.length > 0) {
                  targetUserIds.push(uRes.rows[0].id);
                }
              }
            }

            if (targetUserIds.length === 0 && approver_role_id) {
              const roleUsers = await db.query(
                `SELECT id FROM t_users WHERE (role_id = $1 OR role_id::text = $1::text OR role_slug = $1) AND deleted_at IS NULL`,
                [approver_role_id]
              );
              targetUserIds = roleUsers.rows.map((r) => r.id).filter(Boolean);
            }

            // Fallback: If no approver ID resolved, send notification to current authenticated user
            if (targetUserIds.length === 0 && req.user?.id) {
              targetUserIds.push(req.user.id);
            }

            for (const targetUid of targetUserIds) {
              await db.query(
                `INSERT INTO t_notifications 
                  (user_id, ntf_user_id, title, ntf_title, message, ntf_message, type, ntf_type, link, ntf_link, is_read, ntf_is_read, created_at, ntf_created_at, ntf_deleted_at, deleted_at)
                 VALUES 
                  ($1, $1, $2, $2, $3, $3, $4, $4, $5, $5, false, false, NOW(), NOW(), NULL, NULL)`,
                [targetUid, notifTitle, notifMsg, "RFP_APPROVAL", notifLink]
              );
            }

            // 4. Insert row into t_approval_process_track
            try {
              const currentUserId = parseInt(req.user?.id || req.user?.user_id || 1, 10);
              const currentUserRole = String(req.user?.role_name || req.user?.role_slug || req.user?.role || "Admin");

              await db.query(
                `INSERT INTO t_approval_process_track
                  (apt_type, apt_item_id, apt_user_id, apt_user_role, apt_accept_step, apt_remarks, apt_recipient_role, apt_recipient_id, apt_accept_status, apt_status_flag, apt_created_at, apt_updated_at, apt_created_by, apt_updated_by)
                 VALUES
                  ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW(), $11, $11)`,
                [
                  "RFP_ASSESSMENT",
                  parseInt(targetRfpId, 10) || 0,
                  currentUserId,
                  currentUserRole,
                  "Sent for Approval",
                  approval_remarks || "",
                  String(approver_role_id || "Approver"),
                  parseInt(assigned_approver_id, 10) || null,
                  "Pending Approval",
                  "P",
                  currentUserId
                ]
              );
            } catch (trackErr) {
              console.warn("[saveCriteriaScore] Approval track insert notice:", trackErr.message);
            }
          } catch (notifErr) {
            console.warn("[saveCriteriaScore] Notification dispatch notice:", notifErr.message);
          }
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: final_status === "Sent for Approval"
        ? "RFP Assessment matrix submitted for approval & notification sent!"
        : "Scores saved successfully!"
    });
  } catch (err) {
    console.error("[saveCriteriaScore] Error:", err);
    next(err);
  }
};

/**
 * Admin / Approver: Select and tag NGO implementation partner for RFP
 */
const selectPartner = async (req, res, next) => {
  try {
    const { rfp_id, submission_id, ngo_name } = req.body || {};

    if (!submission_id && !rfp_id) {
      return res.status(400).json({ success: false, message: "rfp_id and submission_id are required" });
    }

    await ensureRfpColumnsExist();

    // 1. Reset previous selected NGO for this RFP
    if (rfp_id) {
      try {
        await db.query(
          `UPDATE t_frm_rfp_proposal_submission
           SET final_status = 'Evaluated'
           WHERE parent_id = $1 AND final_status = 'Selected'`,
          [rfp_id]
        );
      } catch (err) {
        console.warn("[selectPartner] Reset notice:", err.message);
      }
    }

    // 2. Tag target submission
    if (submission_id) {
      await db.query(
        `UPDATE t_frm_rfp_proposal_submission
         SET final_status = 'Selected', updated_at = NOW()
         WHERE id = $1`,
        [submission_id]
      );
    }

    // 3. Update main RFP record with tagged NGO partner details & status
    if (rfp_id) {
      await db.query(
        `UPDATE t_frm_request_for_proposal
         SET status = 'NGO Selected',
             tagged_ngo_id = $1,
             tagged_ngo_name = $2,
             updated_at = NOW()
         WHERE id = $3`,
        [submission_id || null, ngo_name || "", rfp_id]
      );

      // 4. Insert row into t_approval_process_track
      try {
        await ensureApprovalTrackTableExist();
        const currentUserId = parseInt(req.user?.id || req.user?.user_id || 1, 10);
        const currentUserRole = String(req.user?.role_name || req.user?.role_slug || req.user?.role || "Approver");

        await db.query(
          `INSERT INTO t_approval_process_track
            (apt_type, apt_item_id, apt_user_id, apt_user_role, apt_accept_step, apt_remarks, apt_recipient_role, apt_recipient_id, apt_accept_status, apt_status_flag, apt_created_at, apt_updated_at, apt_created_by, apt_updated_by)
           VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW(), $11, $11)`,
          [
            "RFP_ASSESSMENT",
            parseInt(rfp_id, 10) || 0,
            currentUserId,
            currentUserRole,
            "NGO Selected",
            `Selected & Tagged NGO: ${ngo_name || "Partner"}`,
            "Admin",
            null,
            "Approved",
            "A",
            currentUserId
          ]
        );
      } catch (trackErr) {
        console.warn("[selectPartner] Approval track insert notice:", trackErr.message);
      }

      // 5. Mark notifications for this RFP as READ
      try {
        await ensureNotificationColumnsExist();
        await db.query(
          `UPDATE t_notifications
           SET is_read = TRUE, ntf_is_read = TRUE, updated_at = NOW()
           WHERE (
             link LIKE $1
             OR ntf_link LIKE $1
             OR (COALESCE(type, ntf_type) = 'RFP_APPROVAL' AND (link LIKE $2 OR ntf_link LIKE $2))
           )`,
          [`%rfp_id=${rfp_id}%`, `%${rfp_id}%`]
        );
      } catch (notifErr) {
        console.warn("[selectPartner] Mark notification read notice:", notifErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: `${ngo_name || "NGO"} tagged as selected implementation partner for RFP successfully!`,
      data: { rfp_id, submission_id, ngo_name, status: "NGO Selected" }
    });
  } catch (err) {
    console.error("[selectPartner] Error:", err);
    next(err);
  }
};

/**
 * Get Profile & Due Diligence Status for Logged-In NGO
 */
const getNgoProfileStatus = async (req, res, next) => {
  try {
    const userEmail = (req.user?.email || "").trim().toLowerCase();
    const formSlug = req.query?.form_slug || "implementation_partner";

    if (!userEmail) {
      return res.status(200).json({
        success: true,
        data: { status: "DRAFT", id: null }
      });
    }

    // 1. Dynamically check table for requested formSlug (e.g. t_frm_implementation_partner or t_frm_due_diligence)
    const cleanSlug = String(formSlug || "implementation_partner").replace(/[^a-zA-Z0-9_]/g, "");
    const tableName = `t_frm_${cleanSlug}`;
    const userId = req.user?.id;

    let partnerRecord = null;
    try {
      // First try checking by created_by or common email columns
      const dynamicRes = await db.query(
        `SELECT * FROM ${tableName} 
         WHERE deleted_at IS NULL 
           AND (
             ($1::int IS NOT NULL AND created_by = $1::int)
             OR LOWER(COALESCE(email_id, '')) = $2
             OR LOWER(COALESCE(email, '')) = $2
             OR LOWER(COALESCE(official_email, '')) = $2
           )
         ORDER BY id DESC LIMIT 1`,
        [userId || null, userEmail]
      );
      if (dynamicRes.rows.length > 0) {
        partnerRecord = dynamicRes.rows[0];
      }
    } catch (tblErr) {
      // Fallback in case table columns differ (e.g. table only has created_by or email)
      try {
        const fallbackRes = await db.query(
          `SELECT * FROM ${tableName} 
           WHERE deleted_at IS NULL 
             AND ($1::int IS NOT NULL AND created_by = $1::int)
           ORDER BY id DESC LIMIT 1`,
          [userId || null]
        );
        if (fallbackRes.rows.length > 0) {
          partnerRecord = fallbackRes.rows[0];
        }
      } catch (err2) {
        // Table may not have been created yet or doesn't have created_by
      }
    }

    if (partnerRecord) {
      const rawStatus = (partnerRecord.status || "UNDER_REVIEW").toUpperCase();
      let normalizedStatus = "UNDER_REVIEW";
      if (rawStatus.includes("APPROV")) normalizedStatus = "APPROVED";
      else if (rawStatus.includes("REJECT") || rawStatus.includes("REVIS")) normalizedStatus = "NEEDS_REVISION";
      else if (rawStatus.includes("DRAFT")) normalizedStatus = "DRAFT";

      return res.status(200).json({
        success: true,
        data: {
          id: partnerRecord.id,
          status: normalizedStatus,
          organization_name: partnerRecord.name || partnerRecord.organization_name || partnerRecord.title,
          email: userEmail,
          raw_status: partnerRecord.status,
          record: partnerRecord
        }
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: null,
        status: "DRAFT",
        email: userEmail
      }
    });
  } catch (err) {
    console.error("[getNgoProfileStatus] Error:", err);
    next(err);
  }
};

/**
 * Get NGO Profile (Record + Schema metadata)
 */
const getNgoProfile = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const userEmail = (req.user?.email || "").trim().toLowerCase();
    const formSlug = req.query?.form_slug || "implementation_partner";
    const cleanSlug = String(formSlug).replace(/[^a-zA-Z0-9_]/g, "");
    const tableName = `t_frm_${cleanSlug}`;

    let record = null;
    try {
      const colRes = await db.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = $1`,
        [tableName]
      );
      if (colRes.rows.length > 0) {
        const validCols = new Set(colRes.rows.map(c => c.column_name));
        const emailCols = ["primary_email", "email_id", "email", "official_email"].filter(c => validCols.has(c));
        let emailCond = emailCols.map(c => `LOWER(COALESCE("${c}", '')) = $2`).join(" OR ");
        if (!emailCond) emailCond = "FALSE";

        const qRes = await db.query(
          `SELECT * FROM ${tableName}
           WHERE deleted_at IS NULL
             AND (
               ($1::int IS NOT NULL AND (created_by = $1::int OR user_id = $1::int))
               OR (${emailCond})
             )
           ORDER BY id DESC LIMIT 1`,
          [userId || null, userEmail]
        );
        if (qRes.rows.length > 0) {
          record = qRes.rows[0];
        }
      }
    } catch (err) {
      console.warn("[getNgoProfile] Query warning:", err.message);
    }

    // Fetch child tables for add_more sections
    if (record?.id) {
      try {
        const { getFormWithSection } = require("../../helper/getFormWithSection.helper");
        const schema = await getFormWithSection({ form_slug: formSlug });
        for (const sec of schema?.sections || []) {
          if (sec.type === "add_more" && sec.table && sec.table !== tableName) {
            const childRes = await db.query(
              `SELECT * FROM ${sec.table} WHERE parent_id = $1 AND deleted_at IS NULL ORDER BY id ASC`,
              [record.id]
            );
            record[sec.slug || sec.section_id] = childRes.rows;
            if (sec.section_id) record[sec.section_id] = childRes.rows;
            if (sec.slug) record[sec.slug] = childRes.rows;
          }
        }
      } catch (err) {
        console.warn("[getNgoProfile] Add-more fetch notice:", err.message);
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        form_slug: formSlug,
        record: record || null,
        has_record: Boolean(record?.id),
        status: record?.status || "DRAFT"
      }
    });
  } catch (err) {
    console.error("[getNgoProfile] Error:", err);
    next(err);
  }
};

/**
 * Save NGO Profile (Create or Update)
 */
const saveNgoProfile = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const userEmail = (req.user?.email || "").trim().toLowerCase();
    const formSlug = req.body?.form_slug || req.query?.form_slug || "implementation_partner";
    const cleanSlug = String(formSlug).replace(/[^a-zA-Z0-9_]/g, "");
    const tableName = `t_frm_${cleanSlug}`;
    const payload = { ...req.body };

    delete payload.form_slug;

    // Check if table exists and inspect columns
    const colRes = await db.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = $1`,
      [tableName]
    );

    if (colRes.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: `Dynamic table ${tableName} does not exist.`
      });
    }

    const validCols = new Set(colRes.rows.map(c => c.column_name));
    const emailCols = ["primary_email", "email_id", "email", "official_email"].filter(c => validCols.has(c));
    let emailCond = emailCols.map(c => `LOWER(COALESCE("${c}", '')) = $2`).join(" OR ");
    if (!emailCond) emailCond = "FALSE";

    // Check if existing record exists for this user
    let existingId = payload.id || null;
    if (!existingId) {
      const checkRes = await db.query(
        `SELECT id FROM ${tableName} 
         WHERE deleted_at IS NULL 
           AND (
             ($1::int IS NOT NULL AND created_by = $1::int)
             OR (${emailCond})
           )
         LIMIT 1`,
        [userId || null, userEmail]
      );
      if (checkRes.rows.length > 0) {
        existingId = checkRes.rows[0].id;
      }
    }

    let savedRecord = null;
    if (existingId) {
      // UPDATE
      const updateCols = [];
      const updateVals = [];
      let pIdx = 1;

      for (const [key, val] of Object.entries(payload)) {
        if (validCols.has(key) && key !== "id" && key !== "created_at" && key !== "created_by") {
          updateCols.push(`"${key}" = $${pIdx}`);
          updateVals.push(typeof val === "object" && val !== null ? JSON.stringify(val) : val);
          pIdx++;
        }
      }

      if (validCols.has("updated_at")) {
        updateCols.push(`"updated_at" = NOW()`);
      }

      updateVals.push(existingId);
      const updateQuery = `UPDATE ${tableName} SET ${updateCols.join(", ")} WHERE id = $${pIdx} RETURNING *`;
      const updateRes = await db.query(updateQuery, updateVals);
      savedRecord = updateRes.rows[0];
    } else {
      // INSERT
      const insertCols = [];
      const insertVals = [];
      const insertPlaceholders = [];
      let pIdx = 1;

      for (const [key, val] of Object.entries(payload)) {
        if (validCols.has(key) && key !== "id") {
          insertCols.push(`"${key}"`);
          insertVals.push(typeof val === "object" && val !== null ? JSON.stringify(val) : val);
          insertPlaceholders.push(`$${pIdx}`);
          pIdx++;
        }
      }

      if (validCols.has("created_by") && userId) {
        insertCols.push(`"created_by"`);
        insertVals.push(userId);
        insertPlaceholders.push(`$${pIdx}`);
        pIdx++;
      }

      if (validCols.has("status") && !payload.status) {
        insertCols.push(`"status"`);
        insertVals.push("UNDER_REVIEW");
        insertPlaceholders.push(`$${pIdx}`);
        pIdx++;
      }

      const insertQuery = `INSERT INTO ${tableName} (${insertCols.join(", ")}) VALUES (${insertPlaceholders.join(", ")}) RETURNING *`;
      const insertRes = await db.query(insertQuery, insertVals);
      savedRecord = insertRes.rows[0];
    }

    // Handle add_more child sections
    if (savedRecord?.id) {
      try {
        const { getFormWithSection } = require("../../helper/getFormWithSection.helper");
        const schema = await getFormWithSection({ form_slug: formSlug });
        for (const sec of schema?.sections || []) {
          if (sec.type === "add_more") {
            const secKey = sec.slug || sec.section_id;
            const rawVal =
              payload[secKey] !== undefined
                ? payload[secKey]
                : payload[sec.section_id] !== undefined
                ? payload[sec.section_id]
                : payload[sec.slug] !== undefined
                ? payload[sec.slug]
                : payload[sec.table];

            // If not provided in payload, preserve existing child rows untouched
            if (rawVal === undefined) {
              continue;
            }

            let rows = rawVal;
            if (typeof rows === "string") {
              try {
                rows = JSON.parse(rows);
              } catch {
                rows = [];
              }
            }

            if (Array.isArray(rows) && sec.table && sec.table !== tableName) {
              // Inspect child table columns
              const childColRes = await db.query(
                `SELECT column_name FROM information_schema.columns WHERE table_name = $1`,
                [sec.table]
              );
              const childValidCols = new Set(childColRes.rows.map((c) => c.column_name));

              // Extract IDs of existing rows that were retained/updated
              const submittedIds = rows
                .map((r) => r && (r.id || r._id))
                .filter((id) => id !== undefined && id !== null && id !== "" && !isNaN(Number(id)))
                .map(Number);

              // 1. Soft-delete or delete ONLY child rows that the user explicitly removed
              if (childValidCols.has("deleted_at")) {
                if (submittedIds.length > 0) {
                  const notInPlaceholders = submittedIds.map((_, i) => `$${i + 2}`).join(", ");
                  await db.query(
                    `UPDATE ${sec.table} SET deleted_at = NOW() WHERE parent_id = $1 AND id NOT IN (${notInPlaceholders}) AND deleted_at IS NULL`,
                    [savedRecord.id, ...submittedIds]
                  );
                } else {
                  // User explicitly removed all rows
                  await db.query(
                    `UPDATE ${sec.table} SET deleted_at = NOW() WHERE parent_id = $1 AND deleted_at IS NULL`,
                    [savedRecord.id]
                  );
                }
              } else {
                if (submittedIds.length > 0) {
                  const notInPlaceholders = submittedIds.map((_, i) => `$${i + 2}`).join(", ");
                  await db.query(
                    `DELETE FROM ${sec.table} WHERE parent_id = $1 AND id NOT IN (${notInPlaceholders})`,
                    [savedRecord.id, ...submittedIds]
                  );
                } else {
                  await db.query(`DELETE FROM ${sec.table} WHERE parent_id = $1`, [savedRecord.id]);
                }
              }

              // 2. Process each submitted row: UPDATE existing or INSERT new
              for (const row of rows) {
                if (!row || typeof row !== "object") continue;

                const rowId = row.id || row._id;
                const isExisting =
                  rowId !== undefined && rowId !== null && rowId !== "" && !isNaN(Number(rowId));

                if (isExisting) {
                  // UPDATE existing child row in-place
                  const updateCols = [];
                  const updateVals = [];
                  let uIdx = 1;

                  if (childValidCols.has("updated_by") && userId) {
                    updateCols.push(`"updated_by" = $${uIdx++}`);
                    updateVals.push(userId);
                  }
                  if (childValidCols.has("updated_at")) {
                    updateCols.push(`"updated_at" = NOW()`);
                  }
                  if (childValidCols.has("deleted_at")) {
                    updateCols.push(`"deleted_at" = NULL`);
                  }

                  for (const [k, v] of Object.entries(row)) {
                    if (
                      childValidCols.has(k) &&
                      ![
                        "id",
                        "_id",
                        "parent_id",
                        "created_by",
                        "created_at",
                        "updated_by",
                        "updated_at",
                        "deleted_at",
                      ].includes(k)
                    ) {
                      updateCols.push(`"${k}" = $${uIdx++}`);
                      updateVals.push(
                        typeof v === "object" && v !== null
                          ? JSON.stringify(v)
                          : v === undefined
                          ? null
                          : v
                      );
                    }
                  }

                  if (updateCols.length > 0) {
                    updateVals.push(Number(rowId));
                    updateVals.push(savedRecord.id);
                    await db.query(
                      `UPDATE ${sec.table} SET ${updateCols.join(", ")} WHERE id = $${uIdx++} AND parent_id = $${uIdx}`,
                      updateVals
                    );
                  }
                } else {
                  // INSERT new child row
                  const cCols = ["parent_id"];
                  const cVals = [savedRecord.id];
                  const cPlaceholders = ["$1"];
                  let cpIdx = 2;

                  if (childValidCols.has("created_by") && userId) {
                    cCols.push("created_by");
                    cVals.push(userId);
                    cPlaceholders.push(`$${cpIdx++}`);
                  }
                  if (childValidCols.has("status")) {
                    cCols.push("status");
                    cVals.push(row.status || "active");
                    cPlaceholders.push(`$${cpIdx++}`);
                  }
                  if (childValidCols.has("created_at")) {
                    cCols.push("created_at");
                    cPlaceholders.push("NOW()");
                  }

                  for (const [k, v] of Object.entries(row)) {
                    if (
                      childValidCols.has(k) &&
                      ![
                        "id",
                        "_id",
                        "parent_id",
                        "created_by",
                        "created_at",
                        "updated_by",
                        "updated_at",
                        "deleted_at",
                        "status",
                      ].includes(k)
                    ) {
                      cCols.push(`"${k}"`);
                      cVals.push(
                        typeof v === "object" && v !== null
                          ? JSON.stringify(v)
                          : v === undefined
                          ? null
                          : v
                      );
                      cPlaceholders.push(`$${cpIdx++}`);
                    }
                  }

                  if (cCols.length > 1) {
                    await db.query(
                      `INSERT INTO ${sec.table} (${cCols.join(", ")}) VALUES (${cPlaceholders.join(", ")})`,
                      cVals
                    );
                  }
                }
              }

              // Re-fetch active child rows to update savedRecord
              const freshChildRes = await db.query(
                `SELECT * FROM ${sec.table} WHERE parent_id = $1 AND deleted_at IS NULL ORDER BY id ASC`,
                [savedRecord.id]
              );
              savedRecord[secKey] = freshChildRes.rows;
              if (sec.slug) savedRecord[sec.slug] = freshChildRes.rows;
              if (sec.section_id) savedRecord[sec.section_id] = freshChildRes.rows;
            }
          }
        }
      } catch (err) {
        console.error("[saveNgoProfile] Add-more save error:", err);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      data: savedRecord
    });
  } catch (err) {
    console.error("[saveNgoProfile] Error:", err);
    next(err);
  }
};

/**
 * Get NGO Due Diligence (Latest Version + Record)
 */
const getNgoDueDiligence = async (req, res, next) => {
  try {
    let targetUserId = req.user?.id;
    const formSlug = req.query?.form_slug || "due_diligence";

    const userRoleStr = String(req.user?.role_slug || req.user?.role_name || req.user?.role || "").toLowerCase();
    const isReviewer = Boolean(
      req.user?.isConfigurator ||
      req.user?.role_id === 1 ||
      req.user?.role_id === 2 ||
      ["admin", "configurator", "super_admin", "superadmin", "manager", "approver", "system admin"].some(r => userRoleStr.includes(r))
    );

    if (isReviewer && (req.query?.user_id || req.query?.partner_id || req.query?.parent_id)) {
      if (req.query.user_id) {
        targetUserId = parseInt(req.query.user_id, 10);
      } else {
        const parentId = parseInt(req.query.parent_id || req.query.partner_id, 10);
        const parentSlug = req.query.parent_slug || req.query.parent || req.query.root_slug;

        if (parentSlug && parentId) {
          try {
            // Dynamically lookup the parent form schema in t_form
            const pFormRes = await db.query(
              `SELECT root_entity FROM t_form WHERE slug = $1 LIMIT 1`,
              [parentSlug]
            );
            let parentTable = null;
            let parentPk = "id";

            if (pFormRes.rows.length > 0 && pFormRes.rows[0].root_entity) {
              let re = pFormRes.rows[0].root_entity;
              if (typeof re === "string") {
                try { re = JSON.parse(re); } catch (_) {}
              }
              if (re?.table) parentTable = re.table;
              if (re?.primary_key) parentPk = re.primary_key;
            }

            if (parentTable) {
              const colCheck = await db.query(
                `SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND table_schema = 'public'`,
                [parentTable]
              );
              const pCols = new Set(colCheck.rows.map(r => r.column_name.toLowerCase()));

              const selectCols = [`"${parentPk}"`];
              if (pCols.has("created_by")) selectCols.push(`"created_by"`);
              if (pCols.has("user_id")) selectCols.push(`"user_id"`);
              if (pCols.has("primary_email")) selectCols.push(`"primary_email"`);
              if (pCols.has("email")) selectCols.push(`"email"`);

              const pRes = await db.query(
                `SELECT ${selectCols.join(", ")} FROM "${parentTable}" WHERE "${parentPk}" = $1`,
                [parentId]
              );

              if (pRes.rows.length > 0) {
                const row = pRes.rows[0];
                if (row.created_by) {
                  targetUserId = row.created_by;
                } else if (row.user_id) {
                  targetUserId = row.user_id;
                } else {
                  const emailVal = row.primary_email || row.email;
                  if (emailVal) {
                    const uRes = await db.query(
                      `SELECT id FROM t_users WHERE LOWER(email) = LOWER($1) AND deleted_at IS NULL LIMIT 1`,
                      [emailVal]
                    );
                    if (uRes.rows.length > 0) targetUserId = uRes.rows[0].id;
                  }
                }
              }
            }
          } catch (pErr) {
            console.warn("[getNgoDueDiligence] Parent user lookup notice:", pErr.message);
          }
        }
      }
    }

    // 1. Fetch latest version from t_ngo_due_diligence_versions (always last row details)
    const verRes = await db.query(
      `SELECT * FROM t_ngo_due_diligence_versions
       WHERE user_id = $1 AND form_slug = $2
       ORDER BY version_number DESC LIMIT 1`,
      [targetUserId, formSlug]
    );

    // 2. Count total versions
    const countRes = await db.query(
      `SELECT COUNT(*) as count FROM t_ngo_due_diligence_versions WHERE user_id = $1 AND form_slug = $2`,
      [targetUserId, formSlug]
    );
    const totalVersions = parseInt(countRes.rows[0]?.count || "0", 10);

    const latest = verRes.rows[0] || null;
    let recordPayload = latest?.data || null;
    if (typeof recordPayload === "string") {
      try { recordPayload = JSON.parse(recordPayload); } catch (_) {}
    }
    if (recordPayload && typeof recordPayload === "object") {
      Object.keys(recordPayload).forEach((k) => {
        if (typeof recordPayload[k] === "string") {
          const trimmed = recordPayload[k].trim();
          if ((trimmed.startsWith("[") && trimmed.endsWith("]")) || (trimmed.startsWith("{") && trimmed.endsWith("}"))) {
            try { recordPayload[k] = JSON.parse(trimmed); } catch (_) {}
          }
        }
      });
    }

    let approvalTrack = [];
    if (latest?.approval_track) {
      approvalTrack = typeof latest.approval_track === "string"
        ? JSON.parse(latest.approval_track || "[]")
        : latest.approval_track;
    }

    // 3. Dynamically resolve table name from t_form (no static table names)
    let dynamicTableName = `t_frm_${formSlug}`;
    let primaryKeyCol = "id";

    try {
      const formSchemaRes = await db.query(
        `SELECT root_entity FROM t_form WHERE slug = $1 LIMIT 1`,
        [formSlug]
      );
      if (formSchemaRes.rows.length > 0 && formSchemaRes.rows[0].root_entity) {
        let rootEnt = formSchemaRes.rows[0].root_entity;
        if (typeof rootEnt === "string") {
          try { rootEnt = JSON.parse(rootEnt); } catch (_) {}
        }
        if (rootEnt?.table) {
          dynamicTableName = rootEnt.table;
        }
        if (rootEnt?.primary_key) {
          primaryKeyCol = rootEnt.primary_key;
        }
      }
    } catch (schemaErr) {
      console.warn("[getNgoDueDiligence] Schema lookup notice:", schemaErr.message);
    }

    // Query record ID dynamically from the resolved dynamic form table
    let frmId = null;
    try {
      const colCheck = await db.query(
        `SELECT column_name FROM information_schema.columns 
         WHERE table_name = $1 AND table_schema = 'public'`,
        [dynamicTableName]
      );
      const cols = new Set(colCheck.rows.map(r => r.column_name.toLowerCase()));

      let whereCond = "";
      const whereParams = [];

      if (cols.has("created_by") && targetUserId) {
        whereCond = `WHERE created_by = $1`;
        whereParams.push(targetUserId);
      } else if (cols.has("user_id") && targetUserId) {
        whereCond = `WHERE user_id = $1`;
        whereParams.push(targetUserId);
      } else if (cols.has("partner_id") && req.query?.partner_id) {
        whereCond = `WHERE partner_id = $1`;
        whereParams.push(parseInt(req.query.partner_id, 10));
      }

      if (cols.has("deleted_at")) {
        whereCond += (whereCond ? " AND " : "WHERE ") + "deleted_at IS NULL";
      }

      if (whereCond) {
        const frmRes = await db.query(
          `SELECT "${primaryKeyCol}" as id FROM "${dynamicTableName}" ${whereCond} ORDER BY "${primaryKeyCol}" DESC LIMIT 1`,
          whereParams
        );
        frmId = frmRes.rows[0]?.id || null;
      }
    } catch (tblErr) {
      console.warn("[getNgoDueDiligence] Dynamic table query notice:", tblErr.message);
    }

    const resolvedRecordId = frmId || latest?.id || targetUserId;

    if (recordPayload && typeof recordPayload === "object" && !recordPayload.id) {
      recordPayload.id = resolvedRecordId;
    }

    // 4. Resolve authoritative status from t_workflow_instances or dynamic table
    let authoritativeStatus = latest?.status || "DRAFT";
    try {
      if (frmId) {
        const wfRes = await db.query(
          `SELECT status FROM t_workflow_instances 
           WHERE record_table = $1 AND record_id = $2 
           ORDER BY id DESC LIMIT 1`,
          [dynamicTableName, frmId]
        );
        if (wfRes.rows.length > 0) {
          const wfSt = String(wfRes.rows[0].status || "").toUpperCase();
          if (wfSt === "APPROVED") authoritativeStatus = "APPROVED";
          else if (wfSt === "REJECTED") authoritativeStatus = "REJECTED";
          else if (wfSt === "RESEND") authoritativeStatus = "NEEDS_REVISION";
          else if (wfSt.startsWith("PENDING")) authoritativeStatus = "SENT_FOR_APPROVAL";
          else if (wfSt === "DRAFT") authoritativeStatus = latest?.status || "UNDER_REVIEW";
        } else {
          // Check dynamic table record status directly
          const recRes = await db.query(
            `SELECT status FROM "${dynamicTableName}" WHERE "${primaryKeyCol}" = $1 LIMIT 1`,
            [frmId]
          ).catch(() => ({ rows: [] }));
          const recSt = String(recRes.rows[0]?.status || "").toUpperCase();
          if (recSt === "APPROVED") authoritativeStatus = "APPROVED";
          else if (recSt === "REJECTED") authoritativeStatus = "REJECTED";
        }
      }
    } catch (wfErr) {
      console.warn("[getNgoDueDiligence] Workflow status check notice:", wfErr.message);
    }

    // Auto-heal t_ngo_due_diligence_versions if authoritative status differs
    if (latest && authoritativeStatus && latest.status !== authoritativeStatus) {
      await db.query(
        `UPDATE t_ngo_due_diligence_versions SET status = $1, updated_at = NOW() WHERE id = $2`,
        [authoritativeStatus, latest.id]
      ).catch(() => {});
      latest.status = authoritativeStatus;
    }

    // Fetch full approval track history from t_approval_process_track if available
    if (frmId) {
      try {
        const aptRows = await db.query(
          `SELECT apt_id, apt_accept_step, apt_accept_status, apt_remarks, apt_status_flag,
                  apt_user_id, apt_user_role, apt_created_at
           FROM t_approval_process_track
           WHERE apt_item_id = $1 AND (apt_type = $2 OR apt_type = 'due_diligence' OR apt_type = 'due-diligence')
           ORDER BY apt_created_at ASC`,
          [frmId, formSlug]
        );
        if (aptRows.rows.length > 0) {
          const dbTrack = aptRows.rows.map(r => ({
            id: r.apt_id,
            step: r.apt_accept_step,
            action: r.apt_status_flag || r.apt_accept_status,
            status: r.apt_accept_status,
            remarks: r.apt_remarks,
            performed_by_id: r.apt_user_id,
            performed_by_role: r.apt_user_role,
            timestamp: r.apt_created_at,
            version_number: latest?.version_number || 1,
          }));
          if (dbTrack.length >= approvalTrack.length) {
            approvalTrack = dbTrack;
          }
        }
      } catch (aptErr) {
        console.warn("[getNgoDueDiligence] Approval track lookup notice:", aptErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        form_slug: formSlug,
        record: recordPayload,
        version: latest?.version_number || (latest ? 1 : 0),
        total_versions: totalVersions,
        status: authoritativeStatus || latest?.status || "DRAFT",
        id: resolvedRecordId,
        version_id: latest?.id || null,
        frm_id: frmId,
        created_at: latest?.created_at || null,
        has_record: Boolean(latest),
        approval_track: approvalTrack,
        user_id: targetUserId
      }
    });
  } catch (err) {
    console.error("[getNgoDueDiligence] Error:", err);
    next(err);
  }
};

/**
 * Save NGO Due Diligence (Creates a new incremented Version)
 */
const saveNgoDueDiligence = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const formSlug = req.body?.form_slug || req.query?.form_slug || "due_diligence";
    const changeSummary = req.body?.change_summary || "Due Diligence update";
    const formData = { ...req.body };
    delete formData.form_slug;
    delete formData.change_summary;

    // Automatically parse any stringified JSON fields (like add_more arrays)
    Object.keys(formData).forEach((k) => {
      if (typeof formData[k] === "string") {
        const trimmed = formData[k].trim();
        if ((trimmed.startsWith("[") && trimmed.endsWith("]")) || (trimmed.startsWith("{") && trimmed.endsWith("}"))) {
          try {
            formData[k] = JSON.parse(trimmed);
          } catch (_) {}
        }
      }
    });

    // Guard: While in approval mode (UNDER_REVIEW, SENT_FOR_APPROVAL, PENDING_...), NGO cannot edit.
    // After APPROVED, REJECTED, or NEEDS_REVISION, they can edit again.
    const userRoleStr = String(req.user?.role_slug || req.user?.role_name || req.user?.role || "").toLowerCase();
    const isReviewer = Boolean(
      req.user?.isConfigurator ||
      req.user?.role_id === 1 ||
      req.user?.role_id === 2 ||
      ["admin", "configurator", "super_admin", "superadmin", "manager", "approver", "system admin"].some(r => userRoleStr.includes(r))
    );

    if (!isReviewer) {
      const latestVerCheck = await db.query(
        `SELECT status FROM t_ngo_due_diligence_versions 
         WHERE user_id = $1 AND form_slug = $2 
         ORDER BY version_number DESC LIMIT 1`,
        [userId, formSlug]
      );
      if (latestVerCheck.rows.length > 0) {
        const curStatus = String(latestVerCheck.rows[0].status || "").toUpperCase();
        const isLocked =
          curStatus === "UNDER_REVIEW" ||
          curStatus === "SENT_FOR_APPROVAL" ||
          curStatus.startsWith("PENDING");
        if (isLocked) {
          return res.status(400).json({
            success: false,
            message: "Due Diligence is currently in approval mode (Under Review). You cannot edit it until an approval or revision decision is made by the Admin."
          });
        }
      }
    }

    // 1. Get max version number & latest approval_track for this user & form_slug
    const maxVerRes = await db.query(
      `SELECT version_number, approval_track 
       FROM t_ngo_due_diligence_versions 
       WHERE user_id = $1 AND form_slug = $2
       ORDER BY version_number DESC LIMIT 1`,
      [userId, formSlug]
    );
    const currentMax = parseInt(maxVerRes.rows[0]?.version_number || "0", 10);
    const newVersion = currentMax + 1;

    let previousTrack = [];
    if (maxVerRes.rows[0]?.approval_track) {
      previousTrack = typeof maxVerRes.rows[0].approval_track === "string"
        ? JSON.parse(maxVerRes.rows[0].approval_track || "[]")
        : maxVerRes.rows[0].approval_track;
    }
    if (!Array.isArray(previousTrack)) previousTrack = [];

    const submissionTrackItem = {
      id: `track_${Date.now()}_sub`,
      action: "SUBMITTED",
      status: "UNDER_REVIEW",
      version_number: newVersion,
      performed_by_id: userId,
      performed_by_name: req.user?.name || req.user?.email || "NGO Partner",
      performed_by_role: "NGO Partner",
      remarks: changeSummary || `Submitted Due Diligence Version ${newVersion}`,
      timestamp: new Date().toISOString()
    };
    const updatedTrack = [...previousTrack, submissionTrackItem];

    // 2. Insert new version record with updated approval_track JSON
    const insertVer = await db.query(
      `INSERT INTO t_ngo_due_diligence_versions 
         (user_id, form_slug, version_number, data, status, change_summary, approval_track, created_by, created_at)
       VALUES ($1, $2, $3, $4, 'UNDER_REVIEW', $5, $6, $1, NOW())
       RETURNING *`,
      [userId, formSlug, newVersion, JSON.stringify(formData), changeSummary, JSON.stringify(updatedTrack)]
    );

    // 3. Sync into dynamic table and child sections (dynamically resolved from t_form & t_section)
    let tableName = `t_frm_${String(formSlug).replace(/[^a-zA-Z0-9_]/g, "")}`;
    let rootFormId = null;
    let formSections = [];
    let rootRecordId = null;
    try {
      const fRes = await db.query(
        `SELECT form_id, root_entity FROM t_form WHERE slug = $1 LIMIT 1`,
        [formSlug]
      );
      if (fRes.rows.length > 0 && fRes.rows[0].root_entity) {
        rootFormId = fRes.rows[0].form_id;
        let rootEnt = fRes.rows[0].root_entity;
        if (typeof rootEnt === "string") {
          try { rootEnt = JSON.parse(rootEnt); } catch (_) {}
        }
        if (rootEnt?.table) {
          tableName = rootEnt.table;
        }

        const secRes = await db.query(
          `SELECT * FROM t_section WHERE section_form_id = $1`,
          [rootFormId]
        );
        formSections = secRes.rows || [];
      }
    } catch (_) {}

    try {
      const colRes = await db.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND table_schema = 'public'`,
        [tableName]
      );
      if (colRes.rows.length > 0) {
        const validCols = new Set(colRes.rows.map(c => c.column_name));

        // Auto-resolve parent_id from implementation partner if missing
        let partnerIdVal = formData.parent_id || formData.partner_id || partner_id;
        if (!partnerIdVal && userId) {
          const pRes = await db.query(
            `SELECT id FROM t_frm_implementation_partner WHERE user_id = $1 OR created_by = $1 ORDER BY id DESC LIMIT 1`,
            [userId]
          ).catch(() => ({ rows: [] }));
          partnerIdVal = pRes.rows[0]?.id || null;
        }
        if (partnerIdVal && validCols.has("parent_id") && !formData.parent_id) {
          formData.parent_id = partnerIdVal;
        }

        // Check if root record already exists for this user
        const existingRootRes = await db.query(
          `SELECT id FROM ${tableName} WHERE created_by = $1 ORDER BY id DESC LIMIT 1`,
          [userId]
        ).catch(() => ({ rows: [] }));

        if (existingRootRes.rows.length > 0) {
          rootRecordId = existingRootRes.rows[0].id;
          const updateSets = [];
          const updateVals = [];
          let uIdx = 1;

          for (const [key, val] of Object.entries(formData)) {
            if (validCols.has(key) && key !== "id" && key !== "created_by") {
              updateSets.push(`"${key}" = $${uIdx}`);
              updateVals.push(typeof val === "object" && val !== null ? JSON.stringify(val) : val);
              uIdx++;
            }
          }
          if (validCols.has("version")) {
            updateSets.push(`"version" = $${uIdx}`);
            updateVals.push(newVersion);
            uIdx++;
          }
          if (validCols.has("status")) {
            updateSets.push(`"status" = $${uIdx}`);
            updateVals.push("UNDER_REVIEW");
            uIdx++;
          }
          if (validCols.has("updated_by")) {
            updateSets.push(`"updated_by" = $${uIdx}`);
            updateVals.push(userId);
            uIdx++;
          }
          if (validCols.has("updated_at")) {
            updateSets.push(`"updated_at" = NOW()`);
          }
          if (updateSets.length > 0) {
            updateVals.push(rootRecordId);
            await db.query(
              `UPDATE ${tableName} SET ${updateSets.join(", ")} WHERE id = $${uIdx}`,
              updateVals
            );
          }
        } else {
          const insertCols = [];
          const insertVals = [];
          const placeholders = [];
          let pIdx = 1;

          for (const [key, val] of Object.entries(formData)) {
            if (validCols.has(key) && key !== "id") {
              insertCols.push(`"${key}"`);
              insertVals.push(typeof val === "object" && val !== null ? JSON.stringify(val) : val);
              placeholders.push(`$${pIdx}`);
              pIdx++;
            }
          }
          if (validCols.has("created_by")) {
            insertCols.push(`"created_by"`);
            insertVals.push(userId);
            placeholders.push(`$${pIdx}`);
            pIdx++;
          }
          if (validCols.has("version")) {
            insertCols.push(`"version"`);
            insertVals.push(newVersion);
            placeholders.push(`$${pIdx}`);
            pIdx++;
          }
          if (validCols.has("status")) {
            insertCols.push(`"status"`);
            insertVals.push("UNDER_REVIEW");
            placeholders.push(`$${pIdx}`);
            pIdx++;
          }
          if (insertCols.length > 0) {
            const insRes = await db.query(
              `INSERT INTO ${tableName} (${insertCols.join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING id`,
              insertVals
            );
            rootRecordId = insRes.rows[0]?.id;
          }
        }

        // Sync all child add_more sections (e.g. t_section_2)
        if (rootRecordId && formSections.length > 0) {
          for (const sec of formSections) {
            if (sec.type === "add_more" && sec.table && sec.table !== tableName) {
              const childTable = sec.table;
              const rel = typeof sec.relation === "string" ? JSON.parse(sec.relation || "{}") : (sec.relation || {});
              const fkCol = rel.foreign_key || "parent_id";
              const childRows = formData[sec.slug] || formData[sec.section_id] || [];

              if (Array.isArray(childRows) && childRows.length > 0) {
                const cColRes = await db.query(
                  `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1 AND table_schema = 'public'`,
                  [childTable]
                );
                const cColTypes = {};
                cColRes.rows.forEach(c => { cColTypes[c.column_name] = c.data_type; });
                const cValidCols = new Set(Object.keys(cColTypes));

                // Pre-fetch master options if any field references a master table
                let masterMap = {};
                const masterField = (sec.fields || []).find(f => f.data_source?.table_name || f.data_source?.name);
                if (masterField) {
                  const mTable = masterField.data_source.table_name || `t_frm_${masterField.data_source.name}`;
                  const mRes = await db.query(`SELECT id, type_name FROM ${mTable}`).catch(() => ({ rows: [] }));
                  mRes.rows.forEach(m => {
                    masterMap[String(m.type_name || "").toLowerCase().trim()] = m.id;
                    masterMap[String(m.id)] = m.id;
                  });
                }

                // Delete old rows for this parent record
                await db.query(`DELETE FROM ${childTable} WHERE "${fkCol}" = $1`, [rootRecordId]);

                // Insert child rows
                for (const r of childRows) {
                  const cCols = [`"${fkCol}"`];
                  const cVals = [rootRecordId];
                  const cPlaceholders = ['$1'];
                  let cpIdx = 2;

                  for (const [k, v] of Object.entries(r)) {
                    if (!cValidCols.has(k) || k === "id" || k === fkCol) continue;
                    let processedVal = v;
                    if (cColTypes[k] === "integer") {
                      if (masterMap[String(v || "").toLowerCase().trim()] !== undefined) {
                        processedVal = Number(masterMap[String(v || "").toLowerCase().trim()]);
                      } else if (r.name && masterMap[String(r.name).toLowerCase().trim()] !== undefined) {
                        processedVal = Number(masterMap[String(r.name).toLowerCase().trim()]);
                      } else if (r.type_name && masterMap[String(r.type_name).toLowerCase().trim()] !== undefined) {
                        processedVal = Number(masterMap[String(r.type_name).toLowerCase().trim()]);
                      } else {
                        processedVal = isNaN(Number(v)) ? null : Number(v);
                      }
                    } else if (cColTypes[k] === "date") {
                      if (!v || v === "") processedVal = null;
                      else {
                        try {
                          const d = new Date(v);
                          processedVal = isNaN(d.getTime()) ? null : d.toISOString().split("T")[0];
                        } catch (_) { processedVal = null; }
                      }
                    } else if (typeof v === "object" && v !== null) {
                      processedVal = JSON.stringify(v);
                    }

                    cCols.push(`"${k}"`);
                    cVals.push(processedVal);
                    cPlaceholders.push(`$${cpIdx}`);
                    cpIdx++;
                  }

                  if (cValidCols.has("created_by")) {
                    cCols.push(`"created_by"`);
                    cVals.push(userId);
                    cPlaceholders.push(`$${cpIdx}`);
                    cpIdx++;
                  }

                  await db.query(
                    `INSERT INTO ${childTable} (${cCols.join(", ")}) VALUES (${cPlaceholders.join(", ")})`,
                    cVals
                  );
                }
              }
            }
          }
        }
      }
    } catch (syncErr) {
      console.error("[saveNgoDueDiligence] syncErr:", syncErr.message);
    }

    // 3b. Reset any prior workflow instance for this record to DRAFT so Admin can trigger a fresh approval cycle
    if (rootRecordId) {
      try {
        await db.query(
          `UPDATE t_workflow_instances
              SET status = 'DRAFT',
                  current_step = 0,
                  remarks = $1,
                  updated_at = NOW()
            WHERE (record_table = $2 OR record_table = 't_frm_due_diligence')
              AND (record_id = $3)
              AND deleted_at IS NULL`,
          [`Resubmitted by NGO Partner with Version ${newVersion}`, tableName, rootRecordId]
        );
      } catch (wfResetErr) {
        console.warn("[saveNgoDueDiligence] Workflow reset notice:", wfResetErr.message);
      }
    }

    // 4. Send notification to Admin that NGO submitted/updated Due Diligence
    try {
      const partnerRes = await db.query(
        `SELECT id, name, organization_name FROM t_frm_implementation_partner WHERE created_by = $1 LIMIT 1`,
        [userId]
      ).catch(() => ({ rows: [] }));
      const partnerId = partnerRes.rows[0]?.id || null;
      const ngoName =
        partnerRes.rows[0]?.name ||
        partnerRes.rows[0]?.organization_name ||
        req.user?.name ||
        "NGO Partner";

      const adminQuery = await db.query(
        `SELECT id FROM t_users 
         WHERE (role_id IN (1, 2) OR role_slug IN ('admin', 'superadmin', 'configurator'))
           AND is_active = TRUE AND deleted_at IS NULL`
      );

      const notifTitle = `Due Diligence Submitted — ${ngoName}`;
      const notifMessage = `${ngoName} has submitted Due Diligence (Version ${newVersion}) and is awaiting administrative review/approval.`;
      const notifLink = rootRecordId
        ? `/admin/forms/due_diligence/${rootRecordId}`
        : `/admin/custom-page/dd-form/?form_slug=due_diligence&mode=details&user_id=${userId}&partner_id=${partnerId || ""}&always_last_row=1&enable_approval=1&parent_slug=implementation_partner`;

      const targetRefTable = tableName || "t_frm_due_diligence";
      const targetRefId = rootRecordId || insertVer.rows[0].id;

      for (const admin of adminQuery.rows) {
        await db.query(
          `INSERT INTO t_notifications
             (user_id, title, message, type, link, is_read, ref_table, ref_id, event_key, is_deletable, created_at, updated_at)
           VALUES ($1, $2, $3, 'info', $4, FALSE, $5, $6, 'dd_submitted', TRUE, NOW(), NOW())`,
          [admin.id, notifTitle, notifMessage, notifLink, targetRefTable, targetRefId]
        ).catch((insErr) => {
          console.warn("[saveNgoDueDiligence] Notification insert error:", insErr.message);
        });
      }
    } catch (notifErr) {
      console.warn("[saveNgoDueDiligence] Admin notification dispatch notice:", notifErr.message);
    }

    return res.status(200).json({
      success: true,
      message: `Due Diligence Version ${newVersion} submitted successfully!`,
      data: {
        id: insertVer.rows[0].id,
        version: newVersion,
        total_versions: newVersion,
        status: "UNDER_REVIEW",
        approval_track: updatedTrack,
        record: formData
      }
    });
  } catch (err) {
    console.error("[saveNgoDueDiligence] Error:", err);
    next(err);
  }
};

/**
 * Get All Versions List for Due Diligence
 */
const getNgoDueDiligenceVersions = async (req, res, next) => {
  try {
    let targetUserId = req.user?.id;
    const formSlug = req.query?.form_slug || "due_diligence";

    const userRoleStr = String(req.user?.role_slug || req.user?.role_name || req.user?.role || "").toLowerCase();
    const isReviewer = Boolean(
      req.user?.isConfigurator ||
      req.user?.role_id === 1 ||
      req.user?.role_id === 2 ||
      ["admin", "configurator", "super_admin", "superadmin", "manager", "approver", "system admin"].some(r => userRoleStr.includes(r))
    );

    if (isReviewer && (req.query?.user_id || req.query?.partner_id)) {
      if (req.query.user_id) {
        targetUserId = parseInt(req.query.user_id, 10);
      } else if (req.query.partner_id) {
        const pId = parseInt(req.query.partner_id, 10);
        try {
          const pRes = await db.query(
            `SELECT created_by, primary_email, email FROM t_frm_implementation_partner WHERE id = $1`,
            [pId]
          );
          if (pRes.rows.length > 0) {
            if (pRes.rows[0].created_by) {
              targetUserId = pRes.rows[0].created_by;
            } else {
              const email = pRes.rows[0].primary_email || pRes.rows[0].email;
              if (email) {
                const uRes = await db.query(
                  `SELECT id FROM t_users WHERE LOWER(email) = LOWER($1) AND deleted_at IS NULL LIMIT 1`,
                  [email]
                );
                if (uRes.rows.length > 0) targetUserId = uRes.rows[0].id;
              }
            }
          }
        } catch (_) {}
      }
    }

    const result = await db.query(
      `SELECT v.id, v.version_number, v.status, v.change_summary, v.approval_track, v.created_at, u.name AS created_by_name
       FROM t_ngo_due_diligence_versions v
       LEFT JOIN t_users u ON u.id = v.created_by
       WHERE v.user_id = $1 AND v.form_slug = $2
       ORDER BY v.version_number DESC`,
      [targetUserId, formSlug]
    );

    return res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    console.error("[getNgoDueDiligenceVersions] Error:", err);
    next(err);
  }
};

/**


/**
 * Get Specific Version Snapshot
 */
const getNgoDueDiligenceVersionDetail = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const versionNum = parseInt(req.params.version, 10);
    const formSlug = req.query?.form_slug || "due_diligence";

    const result = await db.query(
      `SELECT * FROM t_ngo_due_diligence_versions 
       WHERE user_id = $1 AND version_number = $2 AND form_slug = $3 
       LIMIT 1`,
      [userId, versionNum, formSlug]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Version snapshot not found" });
    }

    const row = { ...result.rows[0] };
    let rowData = row.data;
    if (typeof rowData === "string") {
      try { rowData = JSON.parse(rowData); } catch (_) {}
    }
    if (rowData && typeof rowData === "object") {
      Object.keys(rowData).forEach((k) => {
        if (typeof rowData[k] === "string") {
          const trimmed = rowData[k].trim();
          if ((trimmed.startsWith("[") && trimmed.endsWith("]")) || (trimmed.startsWith("{") && trimmed.endsWith("}"))) {
            try { rowData[k] = JSON.parse(trimmed); } catch (_) {}
          }
        }
      });
    }
    row.data = rowData;

    return res.status(200).json({
      success: true,
      data: row
    });
  } catch (err) {
    console.error("[getNgoDueDiligenceVersionDetail] Error:", err);
    next(err);
  }
};

/**
 * 0.4 Dedicated NGO Projects API
 * Fetches CSR projects assigned to the logged-in NGO (or all projects if none specifically tagged)
 */
const getNgoProjects = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const userEmail = (req.user?.email || "").trim().toLowerCase();

    // Find linked partner id safely
    let partnerId = null;
    if (userId || userEmail) {
      try {
        const partnerRes = await db.query(
          `SELECT id FROM t_frm_implementation_partner 
           WHERE ($1::int IS NOT NULL AND created_by = $1::int) 
              OR LOWER(COALESCE(primary_email, '')) = $2 
           LIMIT 1`,
          [userId || null, userEmail]
        );
        if (partnerRes.rows.length > 0) {
          partnerId = partnerRes.rows[0].id;
        }
      } catch (err) {
        console.warn("[getNgoProjects] Partner lookup notice:", err.message);
      }
    }

    let query = `
      SELECT p.id, p.project_title, p.project_type, p.project_category,
             p.project_duration, p.tentative_impact, p.tentative_beneficiary_number__direct,
             p.primary_sdg, p.status, p.created_at
      FROM t_frm_project p
    `;
    let params = [];

    if (partnerId) {
      query += `
        WHERE p.id IN (
          SELECT parent_id FROM t_frm_project_implementation_partner WHERE partner = $1
        ) OR ($2::int IS NOT NULL AND p.created_by = $2::int)
      `;
      params = [partnerId, userId || null];
    }

    query += ` ORDER BY p.created_at DESC LIMIT 100`;

    const result = await db.query(query, params);

    return res.status(200).json({
      success: true,
      data: result.rows,
      total: result.rowCount
    });
  } catch (err) {
    console.error("[getNgoProjects] Error:", err);
    next(err);
  }
};

module.exports = {
  approvePartner,
  getNgoRegistrations,
  getNgoRegistrationDetail,
  updateRegistrationStatus,
  getApprovedNgos,
  getMasterCriteria,
  floatRfp,
  getRfpOpportunities,
  getOpenRfps,
  getClosedRfps,
  getMyProposal,
  saveNgoEvaluation,
  submitRfpProposal,
  getSubmittedProposals,
  saveCriteriaScore,
  selectPartner,
  getApprovalTrack,
  getNgoProfileStatus,
  getNgoProfile,
  saveNgoProfile,
  getNgoDueDiligence,
  saveNgoDueDiligence,
  getNgoDueDiligenceVersions,
  getNgoDueDiligenceVersionDetail,
  getNgoProjects
};



