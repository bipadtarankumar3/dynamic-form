-- ==============================================================================
-- DYNAMIC FORM & SECTION SCHEMA CREATION TEMPLATE
-- Database Tables: public.t_form and public.t_section
-- ==============================================================================
-- Instructions:
-- 1. Replace 'Vendor Master' / 'vendor_master' with your form title & slug.
-- 2. Update root_entity table_name and primary_key.
-- 3. Adjust fields JSON in section 1 (general) and section 2 (add_more).
-- 4. Execute in PostgreSQL / DBeaver / pgAdmin.
-- ==============================================================================

WITH new_form AS (
  -- 1. Insert Master Form Entry (t_form)
  INSERT INTO t_form (
    title,
    slug,
    root_entity,
    context,
    api,
    actions,
    is_active,
    created_by,
    updated_by
  ) VALUES (
    'Vendor Master',
    'vendor_master',
    '{
      "table": "t_vendor",
      "primary_key": "tvnd_id"
    }'::jsonb,
    '{"module": "vendor"}'::jsonb,
    '{}'::jsonb,
    '{}'::jsonb,
    true,
    1,
    1
  )
  RETURNING form_id
),

inserted_general_section AS (
  -- 2. Insert Root General Section (t_section type: 'general')
  INSERT INTO t_section (
    section_form_id,
    section_label,
    type,
    slug,
    "table",
    primary_key,
    relation,
    context,
    fields,
    is_active,
    created_by,
    updated_by
  )
  SELECT 
    new_form.form_id,
    'Vendor General Information',
    'general',
    'vendor_general_info',
    't_vendor',
    'tvnd_id',
    NULL,
    '{}'::jsonb,
    '[
      {
        "id": "tvnd_name",
        "type": "text",
        "label": "Vendor Name",
        "db_field": "tvnd_name",
        "required": true,
        "ui": { "placeholder": "Enter Vendor Name" },
        "messages": { "required": "Vendor Name is required" }
      },
      {
        "id": "tvnd_code",
        "type": "text",
        "label": "Vendor Code",
        "db_field": "tvnd_code",
        "required": true,
        "ui": { "placeholder": "Enter Vendor Code" },
        "messages": { "required": "Vendor Code is required" }
      },
      {
        "id": "tvnd_state_id",
        "type": "select",
        "label": "State",
        "db_field": "tvnd_state_id",
        "required": true,
        "ui": { "placeholder": "Select State" },
        "data_source": {
          "type": "master",
          "name": "states",
          "table_name": "t_state",
          "primary_key": "tst_id",
          "label_key": "tst_state_name"
        },
        "messages": { "required": "State is required" }
      },
      {
        "id": "tvnd_district_id",
        "type": "select",
        "label": "District",
        "db_field": "tvnd_district_id",
        "required": true,
        "ui": { "placeholder": "Select District" },
        "dependency": {
          "parent": "states",
          "parent_db_field": "tvnd_state_id",
          "fetch_on_parent_change": true,
          "clear_on_change": true
        },
        "data_source": {
          "type": "master",
          "name": "districts",
          "table_name": "t_district",
          "primary_key": "tdis_id",
          "label_key": "tdis_district_name",
          "filters": ["tvnd_state_id"]
        },
        "messages": { "required": "District is required" }
      },
      {
        "id": "tvnd_contract_duration",
        "type": "date_range",
        "label": "Contract Period",
        "db_field": "tvnd_contract_duration",
        "data_type": "daterange",
        "required": true,
        "act_db_field": {
          "start": "tvnd_contract_start_date",
          "end": "tvnd_contract_end_date"
        },
        "messages": { "required": "Contract period is required" }
      }
    ]'::jsonb,
    true,
    1,
    1
  FROM new_form
  RETURNING section_id
)

-- 3. Insert Child Repeater Section (t_section type: 'add_more')
INSERT INTO t_section (
  section_form_id,
  section_label,
  type,
  slug,
  "table",
  primary_key,
  relation,
  context,
  fields,
  is_active,
  created_by,
  updated_by
)
SELECT 
  new_form.form_id,
  'Vendor Documents',
  'add_more',
  'vendor_documents',
  't_vendor_doc',
  'tvnddoc_id',
  '{
    "type": "one_to_many",
    "parent_table": "t_vendor",
    "parent_key": "tvnd_id",
    "foreign_key": "tvnddoc_vendor_id"
  }'::jsonb,
  '{}'::jsonb,
  '[
    {
      "id": "tvnddoc_type_id",
      "type": "select",
      "label": "Document Type",
      "db_field": "tvnddoc_type_id",
      "required": true,
      "ui": { "placeholder": "Select Document Type" },
      "data_source": {
        "type": "master",
        "name": "doc_types",
        "table_name": "t_document_type",
        "primary_key": "tdoctyp_id",
        "label_key": "tdoctyp_name"
      },
      "messages": { "required": "Document type is required" }
    },
    {
      "id": "vendor_docs",
      "type": "file",
      "label": "Upload Document",
      "db_field": "vendor_docs",
      "required": true,
      "file": {
        "table": "t_documents",
        "primary_key": "tdoc_id",
        "foreign_key": "final_doc_id",
        "upload_path": "vendor/docs",
        "max_size_mb": 5,
        "allowed_types": [
          "application/pdf",
          "image/jpeg",
          "image/png"
        ]
      },
      "messages": { "required": "Document file is required" }
    }
  ]'::jsonb,
  true,
  1,
  1
FROM new_form;
