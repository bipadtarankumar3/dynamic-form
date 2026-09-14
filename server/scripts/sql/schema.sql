-- ============================================================
-- CSR Platform Builder — Core Schema
-- Per-Company Database Bootstrap DDL
-- Naming Convention:
--   Tables  : t_{entity}
--   Columns : Clean column names without prefixes
--   Audit   : created_by, updated_by, created_at, updated_at, deleted_at
-- ============================================================

-- ============================================================
-- 1. ROLES
-- ============================================================
CREATE TABLE IF NOT EXISTS t_roles (
  id               SERIAL PRIMARY KEY,
  name             VARCHAR(100)  NOT NULL,
  slug             VARCHAR(100)  UNIQUE NOT NULL,
  is_configurator  BOOLEAN       DEFAULT FALSE,  -- TRUE = Configurator (full config access)
  is_active        BOOLEAN       DEFAULT TRUE,
  description      TEXT,
  created_by       INTEGER       DEFAULT NULL,
  updated_by       INTEGER       DEFAULT NULL,
  created_at       TIMESTAMPTZ   DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ   DEFAULT NULL
);

-- ============================================================
-- 2. USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS t_users (
  id               SERIAL PRIMARY KEY,
  name             VARCHAR(200)  NOT NULL,
  email            VARCHAR(200)  UNIQUE NOT NULL,
  password         TEXT          NOT NULL,
  mobile           VARCHAR(20),
  role_id          INTEGER       REFERENCES t_roles(id),
  role_slug        VARCHAR(100),
  employee_code    VARCHAR(100),
  department       VARCHAR(200),
  designation      VARCHAR(200),
  profile_pic      TEXT,           -- S3 key
  app_token        TEXT,           -- Firebase push token
  is_active        BOOLEAN       DEFAULT TRUE,
  last_login_at    TIMESTAMPTZ   DEFAULT NULL,
  created_by       INTEGER       DEFAULT NULL,
  updated_by       INTEGER       DEFAULT NULL,
  created_at       TIMESTAMPTZ   DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ   DEFAULT NULL
);

-- ============================================================
-- 3. PERSONAL ACCESS TOKENS (JWT session tracking)
-- ============================================================
CREATE TABLE IF NOT EXISTS t_access_tokens (
  id               SERIAL PRIMARY KEY,
  user_id          INTEGER       REFERENCES t_users(id) ON DELETE CASCADE,
  token            TEXT          NOT NULL,
  name             VARCHAR(100)  DEFAULT 'access_token',
  expires_at       TIMESTAMPTZ   DEFAULT NULL,
  created_by       INTEGER       DEFAULT NULL,
  updated_by       INTEGER       DEFAULT NULL,
  created_at       TIMESTAMPTZ   DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ   DEFAULT NULL
);
CREATE INDEX IF NOT EXISTS idx_pat_token ON t_access_tokens(token);
CREATE INDEX IF NOT EXISTS idx_pat_user_id ON t_access_tokens(user_id);

-- ============================================================
-- 4. OTP
-- ============================================================
CREATE TABLE IF NOT EXISTS t_otps (
  id               SERIAL PRIMARY KEY,
  user_id          INTEGER       REFERENCES t_users(id) ON DELETE CASCADE,
  email            VARCHAR(200),
  type             VARCHAR(50),   -- login_verify | forget_password
  value            VARCHAR(10),
  expires_at       TIMESTAMPTZ,
  created_by       INTEGER       DEFAULT NULL,
  updated_by       INTEGER       DEFAULT NULL,
  created_at       TIMESTAMPTZ   DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ   DEFAULT NULL
);

-- ============================================================
-- 5. MODULES (enabled features per company deployment)
-- ============================================================
CREATE TABLE IF NOT EXISTS t_modules (
  id               SERIAL PRIMARY KEY,
  key              VARCHAR(100)  UNIQUE NOT NULL,  -- 'budget', 'proposal', 'project'
  label            VARCHAR(200)  NOT NULL,
  is_active        BOOLEAN       DEFAULT TRUE,
  icon             VARCHAR(100),
  config           JSONB         DEFAULT '{}',
  "order"          INTEGER       DEFAULT 0,
  created_by       INTEGER       DEFAULT NULL,
  updated_by       INTEGER       DEFAULT NULL,
  created_at       TIMESTAMPTZ   DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ   DEFAULT NULL
);

-- ============================================================
-- 6. MENUS (fully configurable sidebar)
-- ============================================================
CREATE TABLE IF NOT EXISTS t_menus (
  id               SERIAL PRIMARY KEY,
  parent_id        INTEGER       REFERENCES t_menus(id),
  label            VARCHAR(200)  NOT NULL,
  icon             VARCHAR(100),
  image            VARCHAR(500),                 -- menu thumbnail/image URL (S3 or relative)
  url              VARCHAR(500),
  "order"          INTEGER       DEFAULT 0,
  is_active        BOOLEAN       DEFAULT TRUE,
  module_key       VARCHAR(100),
  is_configurator  BOOLEAN       DEFAULT FALSE,  -- TRUE = only visible to Configurator
  created_by       INTEGER       DEFAULT NULL,
  updated_by       INTEGER       DEFAULT NULL,
  created_at       TIMESTAMPTZ   DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ   DEFAULT NULL
);

-- ============================================================
-- 7. MENU ROLE PERMISSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS t_menu_role_perms (
  id               SERIAL PRIMARY KEY,
  menu_id          INTEGER       REFERENCES t_menus(id),
  role_id          INTEGER       REFERENCES t_roles(id),
  can_view         BOOLEAN       DEFAULT TRUE,
  created_by       INTEGER       DEFAULT NULL,
  updated_by       INTEGER       DEFAULT NULL,
  created_at       TIMESTAMPTZ   DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ   DEFAULT NULL,
  UNIQUE(menu_id, role_id)
);

-- ============================================================
-- 8. PERMISSIONS (button / action / field / export)
-- ============================================================
CREATE TABLE IF NOT EXISTS t_permissions (
  id               SERIAL PRIMARY KEY,
  key              VARCHAR(200)  UNIQUE NOT NULL,  -- 'budget.export', 'proposal.approve'
  label            VARCHAR(200),
  type             VARCHAR(50)   DEFAULT 'action', -- action | button | export | approval
  module           VARCHAR(100),
  created_by       INTEGER       DEFAULT NULL,
  updated_by       INTEGER       DEFAULT NULL,
  created_at       TIMESTAMPTZ   DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ   DEFAULT NULL
);

-- ============================================================
-- 9. ROLE PERMISSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS t_role_permissions (
  id               SERIAL PRIMARY KEY,
  role_id          INTEGER       REFERENCES t_roles(id),
  permission_id    INTEGER       REFERENCES t_permissions(id),
  created_by       INTEGER       DEFAULT NULL,
  updated_by       INTEGER       DEFAULT NULL,
  created_at       TIMESTAMPTZ   DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ   DEFAULT NULL,
  UNIQUE(role_id, permission_id)
);

-- ============================================================
-- 10. FIELD PERMISSIONS (field-level RBAC)
-- ============================================================
CREATE TABLE IF NOT EXISTS t_field_permissions (
  id               SERIAL PRIMARY KEY,
  role_id          INTEGER       REFERENCES t_roles(id),
  form_slug        VARCHAR(200)  NOT NULL,   -- 'proposals', 'budget', 'frm_custom_xyz'
  field_name       VARCHAR(200)  NOT NULL,
  can_view         BOOLEAN       DEFAULT TRUE,
  can_edit         BOOLEAN       DEFAULT TRUE,
  created_by       INTEGER       DEFAULT NULL,
  updated_by       INTEGER       DEFAULT NULL,
  created_at       TIMESTAMPTZ   DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ   DEFAULT NULL,
  UNIQUE(role_id, form_slug, field_name)
);

-- ============================================================
-- 11. MASTER SCHEMAS (dynamic master definitions)
-- ============================================================
CREATE TABLE IF NOT EXISTS t_master_schemas (
  id               SERIAL PRIMARY KEY,
  name             VARCHAR(200)  NOT NULL,
  slug             VARCHAR(200)  UNIQUE NOT NULL,
  label_field      VARCHAR(200)  DEFAULT NULL,   -- which field is the display label
  fields           JSONB         DEFAULT '[]',   -- array of field definitions
  table_name       VARCHAR(200),                 -- auto-generated: t_mst_{slug}
  is_active        BOOLEAN       DEFAULT TRUE,
  allow_search     BOOLEAN       DEFAULT TRUE,
  allow_export     BOOLEAN       DEFAULT TRUE,
  created_by       INTEGER       DEFAULT NULL,
  updated_by       INTEGER       DEFAULT NULL,
  created_at       TIMESTAMPTZ   DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ   DEFAULT NULL
);

-- ============================================================
-- 11b. MASTER CONFIGS (maps dropdown filter columns dynamically)
-- ============================================================
CREATE TABLE IF NOT EXISTS t_master_configs (
  id               SERIAL        PRIMARY KEY,
  slug             VARCHAR(255)  UNIQUE NOT NULL,
  table_name       VARCHAR(255)  NOT NULL,
  primary_key      VARCHAR(255)  NOT NULL,
  label_key        VARCHAR(255)  NOT NULL,
  is_active_key    VARCHAR(255)  DEFAULT NULL,
  foreign_key      VARCHAR(255)  DEFAULT NULL,
  created_at       TIMESTAMP     DEFAULT NOW(),
  updated_at       TIMESTAMP     DEFAULT NOW()
);

INSERT INTO t_master_configs (slug, table_name, primary_key, label_key, is_active_key)
VALUES ('states', 't_frm_state', 'id', 'state_name', 'is_active')
ON CONFLICT (slug) DO NOTHING;




-- Sequences for dynamic form engine
CREATE SEQUENCE IF NOT EXISTS t_form_id_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS t_section_id_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS t_form_group_id_seq START WITH 1 INCREMENT BY 1;

-- ============================================================
-- 12a. FORM MASTER (t_form)
-- ============================================================
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
  is_master              BOOLEAN      DEFAULT FALSE,  -- TRUE = this form is a master/lookup table
  is_active              BOOLEAN      DEFAULT TRUE,
  created_by             INTEGER      DEFAULT 0,
  updated_by             INTEGER      DEFAULT 0,
  created_at             TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at             TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at             TIMESTAMPTZ
);

-- ============================================================
-- 12b. FORM SECTIONS (t_section)
-- ============================================================
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

-- ============================================================
-- 12c. FORM GROUPS (t_form_group)
-- ============================================================
CREATE TABLE IF NOT EXISTS t_form_group (
  tfg_id                 VARCHAR(255) PRIMARY KEY DEFAULT ('tfg' || LPAD(NEXTVAL('t_form_group_id_seq')::TEXT, 10, '0')),
  tfg_slug               VARCHAR(255),
  tfg_from_group_details JSONB,
  tfg_is_active          BOOLEAN      DEFAULT TRUE,
  tfg_created_by         INTEGER      DEFAULT 0,
  tfg_updated_by         INTEGER      DEFAULT 0,
  tfg_created_at         TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  tfg_updated_at         TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  tfg_deleted_at         TIMESTAMPTZ
);

-- ============================================================
-- 13. WORKFLOW DEFINITIONS (approval chain config)
-- ============================================================
CREATE TABLE IF NOT EXISTS t_workflow_defs (
  id               SERIAL PRIMARY KEY,
  name             VARCHAR(200)  NOT NULL,
  slug             VARCHAR(200)  UNIQUE NOT NULL,
  trigger_form     VARCHAR(200),   -- form slug that triggers this workflow
  flow_type        VARCHAR(50)   DEFAULT 'normal', -- 'normal' or 'multi_level'
  has_conditions   BOOLEAN       DEFAULT FALSE,
  is_active        BOOLEAN       DEFAULT TRUE,
  is_draft         BOOLEAN       DEFAULT FALSE,
  conditions       JSONB         DEFAULT '[]'::jsonb,
  initiator_roles  JSONB         DEFAULT '[]'::jsonb,
  steps            JSONB         DEFAULT '[]'::jsonb,
  created_by       INTEGER       DEFAULT NULL,
  updated_by       INTEGER       DEFAULT NULL,
  created_at       TIMESTAMPTZ   DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ   DEFAULT NULL
);

-- ============================================================
-- 13A. WORKFLOW RULES & MATRIX (child table for path rules)
-- ============================================================
CREATE TABLE IF NOT EXISTS t_workflow_rules (
  id               SERIAL PRIMARY KEY,
  workflow_id      INTEGER       NOT NULL REFERENCES t_workflow_defs(id) ON DELETE CASCADE,
  rule_name        VARCHAR(255)  DEFAULT 'Default Path',
  conditions       JSONB         DEFAULT '[]'::jsonb,   -- match criteria (location, amount, etc.)
  initiator_roles  JSONB         DEFAULT '[]'::jsonb,   -- allowed initiator role IDs [1, 2]
  steps            JSONB         NOT NULL DEFAULT '[]'::jsonb,   -- array of level 1..N approver configs
  order_index      INTEGER       DEFAULT 0,
  is_active        BOOLEAN       DEFAULT TRUE,
  created_by       INTEGER       DEFAULT NULL,
  updated_by       INTEGER       DEFAULT NULL,
  created_at       TIMESTAMPTZ   DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ   DEFAULT NULL
);
CREATE INDEX IF NOT EXISTS idx_wfr_workflow ON t_workflow_rules(workflow_id);

-- ============================================================
-- 14. WORKFLOW INSTANCES (running state machines)
-- ============================================================
CREATE TABLE IF NOT EXISTS t_workflow_instances (
  id                    SERIAL PRIMARY KEY,
  workflow_id           INTEGER       REFERENCES t_workflow_defs(id) ON DELETE SET NULL,
  rule_id               INTEGER       REFERENCES t_workflow_rules(id) ON DELETE SET NULL,
  record_table          VARCHAR(200)  NOT NULL,  -- e.g. 't_frm_project'
  record_id             INTEGER       NOT NULL,
  current_step          INTEGER       DEFAULT 1,
  status                VARCHAR(100)  DEFAULT 'PENDING',
  remarks               TEXT,
  history               JSONB         DEFAULT '[]'::jsonb,  -- [{step, action, by_user_id, actor_name, at, remarks}]
  wfi_step_assignments  JSONB         DEFAULT '[]'::jsonb,  -- [{step, user_id, role_id, role_name}]
  created_by            INTEGER       DEFAULT NULL,
  updated_by            INTEGER       DEFAULT NULL,
  created_at            TIMESTAMPTZ   DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ   DEFAULT NULL
);
CREATE INDEX IF NOT EXISTS idx_wfi_record ON t_workflow_instances(record_table, record_id);

-- ============================================================
-- 14A. APPROVAL PROCESS TRACK (t_approval_process_track)
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS t_approval_process_track_id_seq;

CREATE TABLE IF NOT EXISTS t_approval_process_track (
  apt_id             VARCHAR(255) PRIMARY KEY DEFAULT ('APT'::text || lpad(((nextval('t_approval_process_track_id_seq'::regclass))::character varying)::text, 20, '0'::text)),
  apt_type           VARCHAR(255),
  apt_item_id        INTEGER,
  apt_user_id        INTEGER,
  apt_user_role      VARCHAR(255),
  apt_accept_step    VARCHAR(255),
  apt_remarks        TEXT,
  apt_recipient_role VARCHAR(255),
  apt_recipient_id   INTEGER,
  apt_accept_status  VARCHAR(255),
  apt_status_flag    VARCHAR(255),
  apt_created_at     TIMESTAMPTZ DEFAULT NOW(),
  apt_updated_at     TIMESTAMPTZ DEFAULT NOW(),
  apt_deleted_at     TIMESTAMPTZ DEFAULT NULL,
  apt_created_by     INTEGER DEFAULT NULL,
  apt_updated_by     INTEGER DEFAULT NULL
);
CREATE INDEX IF NOT EXISTS idx_apt_type_item ON t_approval_process_track(apt_type, apt_item_id);

-- ============================================================
-- 15. REPORT DEFINITIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS t_report_definitions (
  id               SERIAL PRIMARY KEY,
  name             VARCHAR(200)  NOT NULL,
  slug             VARCHAR(200)  UNIQUE NOT NULL,
  description      TEXT,
  query_config     JSONB         DEFAULT '{}',  -- {tables, joins, columns, filters, group_by, sort}
  is_active        BOOLEAN       DEFAULT TRUE,
  is_public        BOOLEAN       DEFAULT FALSE, -- accessible to all roles
  created_by       INTEGER       DEFAULT NULL,
  updated_by       INTEGER       DEFAULT NULL,
  created_at       TIMESTAMPTZ   DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ   DEFAULT NULL
);

-- ============================================================
-- 17. NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS t_notifications (
  id               SERIAL PRIMARY KEY,
  user_id          INTEGER       REFERENCES t_users(id),
  title            VARCHAR(300),
  message          TEXT,
  type             VARCHAR(50)   DEFAULT 'info',  -- info|success|warning|error
  link             VARCHAR(500),
  is_read          BOOLEAN       DEFAULT FALSE,
  event_key        VARCHAR(200),
  ref_table        VARCHAR(200),
  ref_id           INTEGER,
  created_by       INTEGER       DEFAULT NULL,
  updated_by       INTEGER       DEFAULT NULL,
  created_at       TIMESTAMPTZ   DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ   DEFAULT NULL
);
CREATE INDEX IF NOT EXISTS idx_ntf_user_id ON t_notifications(user_id);

-- ============================================================
-- 18. NOTIFICATION CONFIGS (event → channel mapping)
-- ============================================================
CREATE TABLE IF NOT EXISTS t_notification_cfgs (
  id               SERIAL PRIMARY KEY,
  event            VARCHAR(200)  UNIQUE NOT NULL,  -- 'proposal_submitted', 'budget_approved'
  label            VARCHAR(200),
  channels         JSONB         DEFAULT '[]',    -- ['email', 'in_app', 'sms', 'whatsapp']
  recipients       JSONB         DEFAULT '[]',    -- ['role:manager', 'user:42']
  email_template   VARCHAR(200),
  is_active        BOOLEAN       DEFAULT TRUE,
  created_by       INTEGER       DEFAULT NULL,
  updated_by       INTEGER       DEFAULT NULL,
  created_at       TIMESTAMPTZ   DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ   DEFAULT NULL
);

-- ============================================================
-- 19. AUDIT LOGS (append-only — no soft delete columns)
-- ============================================================
CREATE TABLE IF NOT EXISTS t_audit_logs (
  id               SERIAL PRIMARY KEY,
  user_id          INTEGER,
  user_email       VARCHAR(200),
  user_name        VARCHAR(200),
  role_slug        VARCHAR(100),
  action           VARCHAR(50)   NOT NULL,  -- CREATE|UPDATE|DELETE|LOGIN|LOGOUT|EXPORT
  table_name       VARCHAR(200),
  record_id        VARCHAR(200),
  old_value        JSONB,
  new_value        JSONB,
  ip_address       VARCHAR(50),
  browser          TEXT,
  endpoint         VARCHAR(500),
  created_at       TIMESTAMPTZ   DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_aud_user_id ON t_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_aud_action ON t_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_aud_created_at ON t_audit_logs(created_at DESC);

-- ============================================================
-- 20. SETTINGS (key-value company config)
-- ============================================================
CREATE TABLE IF NOT EXISTS t_settings (
  id               SERIAL PRIMARY KEY,
  key              VARCHAR(200)  UNIQUE NOT NULL,
  value            TEXT,
  type             VARCHAR(50)   DEFAULT 'string', -- string|number|boolean|json
  "group"          VARCHAR(100)  DEFAULT 'general',
  label            VARCHAR(200),
  description      TEXT,
  created_by       INTEGER       DEFAULT NULL,
  updated_by       INTEGER       DEFAULT NULL,
  created_at       TIMESTAMPTZ   DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ   DEFAULT NULL
);

-- ============================================================
-- 21. DOCUMENTS (file metadata & optional S3 details)
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS t_documents_id_seq;

CREATE TABLE IF NOT EXISTS public.t_documents (
  tdoc_id            VARCHAR(255) PRIMARY KEY DEFAULT ('tdoc'::text || lpad(((nextval('t_documents_id_seq'::regclass))::character varying)::text, 10, '0'::text)),
  final_doc_id       INTEGER,
  doc_title          TEXT,
  doc_type           TEXT,
  file_path          TEXT,
  file_name          TEXT,
  file_original_path TEXT,
  remarks            TEXT,
  doc_ext            VARCHAR(255),
  doc_purpose        VARCHAR(255),
  s3_key             TEXT,
  s3_bucket          VARCHAR(255),
  created_by         INTEGER DEFAULT 0,
  updated_by         INTEGER DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at         TIMESTAMPTZ DEFAULT NULL
);

-- ============================================================
-- 22. FINANCIAL YEARS
-- ============================================================
CREATE TABLE IF NOT EXISTS t_financial_years (
  id               SERIAL PRIMARY KEY,
  code             VARCHAR(20)   UNIQUE NOT NULL,  -- '2024-25'
  start_date       DATE          NOT NULL,
  end_date         DATE          NOT NULL,
  is_active        BOOLEAN       DEFAULT FALSE,
  is_current       BOOLEAN       DEFAULT FALSE,
  created_by       INTEGER       DEFAULT NULL,
  updated_by       INTEGER       DEFAULT NULL,
  created_at       TIMESTAMPTZ   DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ   DEFAULT NULL
);

-- ============================================================
-- 23. CUSTOM DASHBOARD WIDGETS (t_custom_dashboard_widgets)
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS t_custom_dashboard_widgets_id_seq;

CREATE TABLE IF NOT EXISTS public.t_custom_dashboard_widgets
(
    tcdw_id CHARACTER VARYING(255) PRIMARY KEY DEFAULT ('tcdw'::text || lpad((nextval('t_custom_dashboard_widgets_id_seq'::regclass))::text, 10, '0'::text)),
    tcdw_title CHARACTER VARYING(255),
    tcdw_table_name CHARACTER VARYING(255),
    tcdw_configuration JSONB,
    tcdw_chart_type CHARACTER VARYING(50),
    tcdw_is_active BOOLEAN DEFAULT TRUE,
    tcdw_order INTEGER DEFAULT 0,
    tcdw_created_by INTEGER DEFAULT 0,
    tcdw_updated_by INTEGER DEFAULT 0,
    tcdw_created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    tcdw_updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    tcdw_deleted_at TIMESTAMPTZ
);

-- ============================================================
-- 24. IN-APP NOTIFICATIONS (t_notifications)
-- ============================================================
CREATE TABLE IF NOT EXISTS t_notifications (
  id               SERIAL PRIMARY KEY,
  user_id          INTEGER REFERENCES t_users(id) ON DELETE CASCADE,
  title            VARCHAR(255)  NOT NULL,
  message          TEXT          NOT NULL,
  type             VARCHAR(50)   DEFAULT 'info',   -- info|success|warning|error
  link             VARCHAR(500),
  is_read          BOOLEAN       DEFAULT FALSE,
  event_key        VARCHAR(100),
  ref_table        VARCHAR(200),
  ref_id           INTEGER,
  is_deletable     BOOLEAN       DEFAULT FALSE,
  status_flag      VARCHAR(50),
  created_by       INTEGER,
  updated_by       INTEGER,
  created_at       TIMESTAMPTZ   DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ   DEFAULT NULL
);

-- Safe column additions for pre-existing t_notifications tables
ALTER TABLE t_notifications ADD COLUMN IF NOT EXISTS event_key VARCHAR(100);
ALTER TABLE t_notifications ADD COLUMN IF NOT EXISTS ref_table VARCHAR(200);
ALTER TABLE t_notifications ADD COLUMN IF NOT EXISTS ref_id INTEGER;
ALTER TABLE t_notifications ADD COLUMN IF NOT EXISTS is_deletable BOOLEAN DEFAULT FALSE;
ALTER TABLE t_notifications ADD COLUMN IF NOT EXISTS status_flag VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_notif_user_id ON t_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_is_read ON t_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notif_is_deletable ON t_notifications(is_deletable);



