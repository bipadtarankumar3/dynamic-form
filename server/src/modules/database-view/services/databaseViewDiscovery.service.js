// server/src/modules/database-view/services/databaseViewDiscovery.service.js
// ============================================================
// PostgreSQL Database View Builder — Discovery Service
// Discovers tables, columns, primary keys, foreign key constraints,
// system user relationships, child tables (1:N), and view dependencies.
// ============================================================

const db = require("../../../config/db");

const IDENTIFIER_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]{0,62}$/;

/**
 * Validate PostgreSQL identifier string
 */
function sanitizeIdentifier(name) {
  if (!name || typeof name !== "string") return "";
  const cleaned = name.trim();
  if (!IDENTIFIER_REGEX.test(cleaned)) {
    throw new Error(`Invalid database identifier: "${name}"`);
  }
  return cleaned;
}

/**
 * Get all available database tables in public schema
 */
async function getTables() {
  const sql = `
    SELECT 
      t.table_name,
      t.table_type,
      pg_catalog.obj_description((quote_ident(t.table_schema) || '.' || quote_ident(t.table_name))::regclass::oid, 'pg_class') AS description,
      (
        SELECT COUNT(*)::int 
        FROM information_schema.columns c 
        WHERE c.table_schema = t.table_schema AND c.table_name = t.table_name
      ) AS column_count,
      (
        SELECT COUNT(*)::int
        FROM information_schema.table_constraints tc
        WHERE tc.table_schema = t.table_schema 
          AND tc.table_name = t.table_name 
          AND tc.constraint_type = 'FOREIGN KEY'
      ) AS fk_count
    FROM information_schema.tables t
    WHERE t.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
      AND t.table_name NOT LIKE 'pg_%'
      AND t.table_name NOT LIKE 'sql_%'
      AND t.table_name NOT IN ('app_database_views', 'spatial_ref_sys')
    ORDER BY t.table_name ASC;
  `;
  const result = await db.query(sql);
  return result.rows;
}

/**
 * Get detailed columns for a table
 */
async function getTableColumns(tableName) {
  const safeTable = sanitizeIdentifier(tableName);
  const sql = `
    SELECT 
      c.column_name,
      c.data_type,
      c.is_nullable,
      c.column_default,
      c.character_maximum_length,
      c.numeric_precision,
      col_description((quote_ident(c.table_schema) || '.' || quote_ident(c.table_name))::regclass, c.ordinal_position) AS description,
      CASE WHEN pk.column_name IS NOT NULL THEN TRUE ELSE FALSE END AS is_primary_key
    FROM information_schema.columns c
    LEFT JOIN (
      SELECT kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_schema = 'public'
        AND tc.table_name = $1
    ) pk ON pk.column_name = c.column_name
    WHERE c.table_schema = 'public'
      AND c.table_name = $1
    ORDER BY c.ordinal_position ASC;
  `;
  const result = await db.query(sql, [safeTable]);
  return result.rows;
}

/**
 * Discover full relationship graph for a given base table:
 * 1. MANY_TO_ONE parent tables (Foreign keys pointing from base table to other tables)
 * 2. ONE_TO_MANY child tables (Foreign keys in other tables pointing back to base table)
 * 3. System User relationships (created_by, updated_by)
 * 4. Master tables referenced via dynamic naming or FKs
 */
async function getTableRelationships(tableName) {
  const safeTable = sanitizeIdentifier(tableName);

  // 1. Get Primary Key
  const pkSql = `
    SELECT kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'PRIMARY KEY'
      AND tc.table_schema = 'public'
      AND tc.table_name = $1
    LIMIT 1;
  `;
  const pkRes = await db.query(pkSql, [safeTable]);
  const primaryKey = pkRes.rows[0]?.column_name || 'id';

  // 2. Base Table Columns
  const columns = await getTableColumns(safeTable);

  // 3. Foreign Keys FROM base table -> Target tables (MANY_TO_ONE / Parent / Master)
  const fkSql = `
    SELECT
      tc.constraint_name,
      kcu.column_name AS source_column,
      ccu.table_name AS target_table,
      ccu.column_name AS target_column
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND tc.table_name = $1;
  `;
  const fkRes = await db.query(fkSql, [safeTable]);
  const foreignKeys = fkRes.rows;

  // 4. Foreign Keys FROM other tables -> Base table (ONE_TO_MANY / Child tables)
  const childFkSql = `
    SELECT
      tc.constraint_name,
      tc.table_name AS child_table,
      kcu.column_name AS child_foreign_key,
      ccu.column_name AS parent_column
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND ccu.table_name = $1
      AND tc.table_name != $1;
  `;
  const childFkRes = await db.query(childFkSql, [safeTable]);
  const childForeignKeys = childFkRes.rows;

  // Build Many-To-One (Parent & Master) Relationships
  const manyToOne = [];
  const processedSourceCols = new Set();

  for (const fk of foreignKeys) {
    if (fk.source_column === 'created_by' || fk.source_column === 'updated_by') continue;
    processedSourceCols.add(fk.source_column);

    const targetCols = await getTableColumns(fk.target_table);
    let relType = 'MANY_TO_ONE';
    let relLabel = 'Parent (Many-to-One)';

    if (fk.source_column === 'parent_id') {
      relType = 'PARENT';
      relLabel = 'Parent (Many-to-One)';
    } else if (fk.target_table.includes('kpi') || fk.target_table.includes('unit') || fk.target_table.includes('master')) {
      relType = 'MASTER';
      relLabel = 'Master (Many-to-One)';
    }

    manyToOne.push({
      key: `${fk.source_column}__${fk.target_table}`,
      relationship_type: relType,
      label: relLabel,
      source_column: fk.source_column,
      target_table: fk.target_table,
      target_column: fk.target_column,
      columns: targetCols,
      is_fk: true
    });
  }

  // Dynamic convention-based detection for columns missing explicit DB FK constraints
  for (const col of columns) {
    if (processedSourceCols.has(col.column_name) || col.column_name === 'created_by' || col.column_name === 'updated_by' || col.is_primary_key) continue;

    let inferredTargetTable = null;
    const colClean = col.column_name.replace(/_id$/, '');
    const candidates = [
      `t_frm_${colClean}`,
      colClean,
      `t_master_${colClean}`,
      `master_${colClean}`
    ];

    if (col.column_name === 'parent_id' && safeTable.startsWith('t_frm_')) {
      const parts = safeTable.split('_');
      if (parts.length > 2) {
        // e.g. t_frm_monitoring -> t_frm_project
        candidates.unshift(parts.slice(0, 3).join('_'));
      }
    }

    for (const cand of candidates) {
      if (cand === safeTable) continue;
      try {
        const checkSql = `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1 LIMIT 1;`;
        const checkRes = await db.query(checkSql, [cand]);
        if (checkRes.rows.length > 0) {
          inferredTargetTable = checkRes.rows[0].table_name;
          break;
        }
      } catch (err) {}
    }

    if (inferredTargetTable) {
      try {
        const targetCols = await getTableColumns(inferredTargetTable);
        if (targetCols.length > 0) {
          manyToOne.push({
            key: `${col.column_name}__${inferredTargetTable}`,
            relationship_type: col.column_name === 'parent_id' ? 'PARENT' : 'MASTER',
            label: col.column_name === 'parent_id' ? 'Parent (Many-to-One)' : 'Master (Many-to-One)',
            source_column: col.column_name,
            target_table: inferredTargetTable,
            target_column: 'id',
            columns: targetCols,
            is_fk: false
          });
        }
      } catch (err) {}
    }
  }

  // Build One-To-Many (Child tables)
  const oneToMany = [];
  const processedChildTables = new Set();

  // Helper to discover Level 2 Sub-Child (Grandchild) tables for a Level 1 child table
  const getSubChildTables = async (childTableName) => {
    const subChildren = [];
    try {
      const subFkSql = `
        SELECT
          tc.table_name AS sub_child_table,
          kcu.column_name AS sub_child_foreign_key,
          ccu.column_name AS parent_column
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
          AND ccu.table_name = $1
          AND tc.table_name != $1
          AND tc.table_name != $2;
      `;
      const subRes = await db.query(subFkSql, [childTableName, safeTable]);
      for (const sRow of subRes.rows) {
        const sCols = await getTableColumns(sRow.sub_child_table);
        subChildren.push({
          child_table: sRow.sub_child_table,
          child_foreign_key: sRow.sub_child_foreign_key,
          parent_column: sRow.parent_column || 'id',
          columns: sCols
        });
      }

      // Convention check for sub-child tables
      const pSubSql = `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name LIKE $1
          AND table_name != $2
          AND table_name != $3;
      `;
      const pSubRes = await db.query(pSubSql, [`${childTableName}_%`, childTableName, safeTable]);
      const existing = new Set(subChildren.map(s => s.child_table));
      for (const row of pSubRes.rows) {
        if (!existing.has(row.table_name)) {
          const sCols = await getTableColumns(row.table_name);
          if (sCols.some(c => c.column_name === 'parent_id' || c.column_name.includes('beneficiary') || c.column_name.endsWith('_id'))) {
            const fkCol = sCols.find(c => c.column_name === 'parent_id' || c.column_name.includes('beneficiary'))?.column_name || 'parent_id';
            subChildren.push({
              child_table: row.table_name,
              child_foreign_key: fkCol,
              parent_column: 'id',
              columns: sCols
            });
          }
        }
      }
    } catch (err) {}
    return subChildren;
  };

  // Helper to discover Master/Parent tables referenced by a Child table (e.g. report_location -> t_frm_unit)
  const getChildMasters = async (childTableName) => {
    const childMasters = [];
    try {
      const fkSql = `
        SELECT
          kcu.column_name AS source_column,
          ccu.table_name AS target_table,
          ccu.column_name AS target_column
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
          AND tc.table_name = $1
          AND ccu.table_name != $1
          AND ccu.table_name != $2;
      `;
      const fkRes = await db.query(fkSql, [childTableName, safeTable]);
      for (const row of fkRes.rows) {
        if (row.source_column === 'created_by' || row.source_column === 'updated_by' || row.source_column === 'parent_id' || row.source_column === 'project_id') continue;
        const targetCols = await getTableColumns(row.target_table);
        childMasters.push({
          source_column: row.source_column,
          target_table: row.target_table,
          target_column: row.target_column || 'id',
          columns: targetCols
        });
      }

      // Convention lookup for missing FK constraints (e.g. state_id -> t_master_state, district_id -> t_master_district)
      const childCols = await getTableColumns(childTableName);
      const existingSourceCols = new Set(childMasters.map(m => m.source_column));
      for (const col of childCols) {
        if (existingSourceCols.has(col.column_name) || col.column_name === 'created_by' || col.column_name === 'updated_by' || col.column_name === 'id' || col.column_name === 'parent_id' || col.column_name === 'project_id') continue;

        const colClean = col.column_name.replace(/_id$/, '');
        const candidates = [
          `t_frm_${colClean}`,
          `t_master_${colClean}`,
          `t_frm_${colClean}_master`,
          `master_${colClean}`,
          `${colClean}_master`,
          colClean
        ];

        let foundTable = null;
        for (const cand of candidates) {
          if (cand === childTableName || cand === safeTable) continue;
          try {
            const checkSql = `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1 LIMIT 1;`;
            const checkRes = await db.query(checkSql, [cand]);
            if (checkRes.rows.length > 0) {
              foundTable = checkRes.rows[0].table_name;
              break;
            }
          } catch (err) {}
        }

        // LIKE fallback if exact candidate table name not found
        if (!foundTable && colClean.length > 2) {
          try {
            const likeSql = `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE $1 AND table_name != $2 AND table_name != $3 LIMIT 1;`;
            const likeRes = await db.query(likeSql, [`%${colClean}%`, childTableName, safeTable]);
            if (likeRes.rows.length > 0) {
              foundTable = likeRes.rows[0].table_name;
            }
          } catch (err) {}
        }

        if (foundTable) {
          try {
            const tCols = await getTableColumns(foundTable);
            if (tCols.length > 0) {
              childMasters.push({
                source_column: col.column_name,
                target_table: foundTable,
                target_column: 'id',
                columns: tCols
              });
            }
          } catch (err) {}
        }
      }
    } catch (err) {}
    return childMasters;
  };

  for (const cfk of childForeignKeys) {
    processedChildTables.add(cfk.child_table);
    const childCols = await getTableColumns(cfk.child_table);
    const subChildren = await getSubChildTables(cfk.child_table);
    const childMasters = await getChildMasters(cfk.child_table);
    oneToMany.push({
      key: `child__${cfk.child_table}`,
      relationship_type: 'ONE_TO_MANY',
      label: 'Child (One-to-Many)',
      child_table: cfk.child_table,
      child_foreign_key: cfk.child_foreign_key,
      parent_column: cfk.parent_column,
      columns: childCols,
      sub_children: subChildren,
      child_masters: childMasters
    });
  }

  // Convention-based detection for child tables (e.g., t_frm_monitoring_activities where parent_id -> t_frm_monitoring.id)
  const potentialChildTablesSql = `
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name LIKE $1
      AND table_name != $2;
  `;
  const pchildRes = await db.query(potentialChildTablesSql, [`${safeTable}_%`, safeTable]);
  for (const row of pchildRes.rows) {
    if (!processedChildTables.has(row.table_name)) {
      try {
        const childCols = await getTableColumns(row.table_name);
        const hasParentId = childCols.some(c => c.column_name === 'parent_id');
        if (hasParentId) {
          const subChildren = await getSubChildTables(row.table_name);
          const childMasters = await getChildMasters(row.table_name);
          oneToMany.push({
            key: `child__${row.table_name}`,
            relationship_type: 'ONE_TO_MANY',
            label: 'Child (One-to-Many)',
            child_table: row.table_name,
            child_foreign_key: 'parent_id',
            parent_column: primaryKey,
            columns: childCols,
            sub_children: subChildren,
            child_masters: childMasters
          });
        }
      } catch (err) {}
    }
  }

  // Build User / Audit Relationships (created_by, updated_by -> users.id)
  const userAudit = [];
  const hasCreatedBy = columns.some(c => c.column_name === 'created_by');
  const hasUpdatedBy = columns.some(c => c.column_name === 'updated_by');

  let userTableColumns = [];
  try {
    userTableColumns = await getTableColumns('users');
  } catch (err) {}

  if (hasCreatedBy && userTableColumns.length > 0) {
    userAudit.push({
      key: 'created_by__users',
      relationship_type: 'SYSTEM_USER',
      label: 'Created By (System User)',
      source_column: 'created_by',
      target_table: 'users',
      target_column: 'id',
      alias_prefix: 'created_by',
      columns: userTableColumns
    });
  }

  if (hasUpdatedBy && userTableColumns.length > 0) {
    userAudit.push({
      key: 'updated_by__users',
      relationship_type: 'SYSTEM_USER',
      label: 'Updated By (System User)',
      source_column: 'updated_by',
      target_table: 'users',
      target_column: 'id',
      alias_prefix: 'updated_by',
      columns: userTableColumns
    });
  }

  return {
    base_table: safeTable,
    primary_key: primaryKey,
    columns,
    many_to_one: manyToOne,
    one_to_many: oneToMany,
    user_audit: userAudit
  };
}

/**
 * Discover PostgreSQL view dependencies using pg_depend / pg_rewrite
 */
async function getViewDependencies(viewName) {
  const safeView = sanitizeIdentifier(viewName);
  const sql = `
    SELECT DISTINCT
      v.relname AS dependent_view,
      ns.nspname AS dependent_schema
    FROM pg_depend d
    JOIN pg_rewrite r ON r.oid = d.objid
    JOIN pg_class v ON v.oid = r.ev_class
    JOIN pg_namespace ns ON ns.oid = v.relnamespace
    JOIN pg_class dep_on ON dep_on.oid = d.refobjid
    JOIN pg_namespace dep_ns ON dep_ns.oid = dep_on.relnamespace
    WHERE dep_on.relname = $1
      AND v.relname != $1
      AND v.relkind = 'v';
  `;
  const result = await db.query(sql, [safeView]);
  return result.rows;
}

module.exports = {
  getTables,
  getTableColumns,
  getTableRelationships,
  getViewDependencies,
  sanitizeIdentifier
};
