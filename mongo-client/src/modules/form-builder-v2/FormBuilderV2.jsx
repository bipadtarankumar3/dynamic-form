'use client';

import React, { useState, useEffect } from 'react';
import { App } from 'antd';
import { privateHttpClient } from '@/services/api/httpClient';
import HeaderNavigationV2 from './components/HeaderNavigationV2';
import LeftPaletteV2 from './components/LeftPaletteV2';
import CanvasV2 from './components/CanvasV2';
import InspectorPanelV2 from './components/InspectorPanelV2';
import PreviewModalV2 from './components/PreviewModalV2';
import FormSettingsViewV2 from './components/FormSettingsViewV2';
import { validateFormula } from '@/modules/dynamic-form-v2/add-edit/add-more-section/helper/calculation.helper';
import './styles/form-builder-v2.css';

export const normalizeSchema = (raw) => {
  if (!raw) {
    return {
      title: 'Untitled Form',
      slug: 'untitled_form',
      table_name: 't_untitled_form',
      is_master: false,
      is_editable: false,
      is_draft: true,
      triggers: [],
      sections: [
        {
          id: 'sec_1',
          section_label: 'General Information',
          slug: 'general',
          type: 'general',
          fields: [],
        },
      ],
      actions: [],
      enable_action_tabs: false,
      action_tabs: [],
    };
  }

  const id = raw.id;
  const title = raw.title || raw.name || 'Untitled Form';
  const slug = raw.slug || 'untitled_form';
  const table_name = raw.table_name || `t_frm_${slug}`;
  const is_master = !!raw.is_master;
  const is_draft = raw.is_draft !== undefined ? !!raw.is_draft : true;
  const parent_form_id = raw.parent_form_id;
  const actions = raw.actions || [];
  const modal_size = raw.modal_size || '1400';
  const enable_action_tabs = !!raw.enable_action_tabs;
  const action_tabs = raw.action_tabs || [];
  const triggers = Array.isArray(raw.triggers) ? raw.triggers : [];

  // Parse raw sections
  let rawSections = raw.sections || [];
  if (typeof rawSections === 'string') {
    try {
      rawSections = JSON.parse(rawSections);
    } catch {
      rawSections = [];
    }
  }

  const sections = (Array.isArray(rawSections) ? rawSections : []).map((sec, sIdx) => {
    let fields = sec.fields;
    if (typeof fields === 'string') {
      try {
        fields = JSON.parse(fields);
      } catch {
        fields = [];
      }
    }
    const parsedFields = (Array.isArray(fields) ? fields : []).map((fld, fIdx) => {
      let subFields = fld.fields;
      if (typeof subFields === 'string') {
        try {
          subFields = JSON.parse(subFields);
        } catch {
          subFields = [];
        }
      }
      return {
        ...fld,
        id: fld.id || `fld_${sIdx}_${fIdx}_${Date.now()}`,
        db_field: fld.db_field || fld.column_name || `field_${fIdx + 1}`,
        label: fld.label || fld.db_field || `Field ${fIdx + 1}`,
        type: fld.type || 'text',
        conditions: fld.conditions || { match_type: 'all', rules: [] },
        ui: typeof fld.ui === 'object' && fld.ui !== null ? fld.ui : {},
        validation: typeof fld.validation === 'object' && fld.validation !== null ? fld.validation : {},
        fields: Array.isArray(subFields) ? subFields : undefined,
      };
    });

    return {
      ...sec,
      id: sec.id || sec.section_id || `sec_${sIdx + 1}_${Date.now()}`,
      section_label: sec.section_label || sec.title || `Section ${sIdx + 1}`,
      slug: sec.slug || `section_${sIdx + 1}`,
      type: sec.type || 'general',
      table_name: sec.table_name || sec.table || table_name,
      conditions: sec.conditions || { match_type: 'all', rules: [] },
      fields: parsedFields,
    };
  });

  if (sections.length === 0) {
    sections.push({
      id: `sec_${Date.now()}`,
      section_label: 'General Information',
      slug: 'general',
      type: 'general',
      fields: [],
    });
  }

  let relation_with_parent = raw.relation_with_parent;
  if (typeof relation_with_parent === 'string') {
    try {
      relation_with_parent = JSON.parse(relation_with_parent);
    } catch {
      relation_with_parent = {};
    }
  }

  return {
    ...raw,
    id,
    title,
    name: title,
    slug,
    table_name,
    is_master,
    is_draft,
    parent_form_id,
    relation_with_parent: relation_with_parent || { display_fields: [] },
    actions,
    modal_size,
    enable_action_tabs,
    action_tabs,
    triggers,
    sections,
  };
};

export default function FormBuilderV2({ initialSchema, onBack, onSuccess }) {
  const { message } = App.useApp();
  const [schema, setSchema] = useState(() => normalizeSchema(initialSchema));

  const [activeTab, setActiveTab] = useState('build');
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const [selectedFieldId, setSelectedFieldId] = useState(null);
  const [selectedSubFieldId, setSelectedSubFieldId] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [allFormsList, setAllFormsList] = useState([]);

  /* VS Code-style Layout & Resizing States */
  const [isLeftOpen, setIsLeftOpen] = useState(true);
  const [isRightOpen, setIsRightOpen] = useState(true);
  const [leftWidth, setLeftWidth] = useState(260);
  const [rightWidth, setRightWidth] = useState(380);
  const [isDragging, setIsDragging] = useState(null); // 'left' | 'right' | null

  /* Draggable Splitter Mouse Handlers */
  const handleMouseDownLeft = (e) => {
    e.preventDefault();
    setIsDragging('left');
    const startX = e.clientX;
    const startWidth = leftWidth;

    const handleMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newWidth = Math.min(Math.max(startWidth + deltaX, 180), 450);
      setLeftWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(null);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseDownRight = (e) => {
    e.preventDefault();
    setIsDragging('right');
    const startX = e.clientX;
    const startWidth = rightWidth;

    const handleMouseMove = (moveEvent) => {
      const deltaX = startX - moveEvent.clientX; // Moving mouse left increases right panel width
      const newWidth = Math.min(Math.max(startWidth + deltaX, 260), 650);
      setRightWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(null);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  /* Fetch all forms for parent form selection lookup */
  useEffect(() => {
    const fetchForms = async () => {
      try {
        const res = await privateHttpClient.get('configurator/form-schemas');
        const items = res?.data?.data || res?.data || [];
        setAllFormsList(Array.isArray(items) ? items : []);
      } catch (err) {
        console.error('Failed to fetch forms list for parent selection:', err);
      }
    };
    fetchForms();
  }, []);

  /* Fetch full schema detail when editing an existing form */
  useEffect(() => {
    const schemaId = initialSchema?.fsc_id || initialSchema?.id || initialSchema?.form_id;
    if (schemaId && schemaId !== 'undefined' && schemaId !== 'null') {
      const fetchDetail = async () => {
        try {
          const res = await privateHttpClient.get(`configurator/form-schemas/${schemaId}`);
          if (res?.data?.data) {
            setSchema(normalizeSchema(res.data.data));
          }
        } catch (err) {
          if (err?.response?.status === 404) {
            console.warn(`[FormBuilderV2] Form schema detail for "${schemaId}" returned 404 (not found or deleted). Using provided initial schema.`);
          } else {
            console.error('Failed to fetch full form schema detail:', err);
          }
        }
      };
      fetchDetail();
    }
  }, [initialSchema?.fsc_id, initialSchema?.id, initialSchema?.form_id]);

  /* Computed Helpers */
  const allFields = (schema.sections || []).flatMap((sec) => sec.fields || []);
  const currentSection = schema.sections?.[activeSectionIndex] || schema.sections?.[0];
  const currentField = allFields.find((f) => f.id === selectedFieldId);
  const currentSubField = currentField?.type === 'add_more'
    ? (currentField.fields || []).find((c) => c.id === selectedSubFieldId)
    : null;

  /* Add Section */
  const handleAddSection = () => {
    const newIdx = (schema.sections || []).length + 1;
    const newSection = {
      id: `sec_${Date.now()}`,
      section_label: `Section ${newIdx}`,
      slug: `section_${newIdx}`,
      type: 'general',
      fields: [],
    };
    const updatedSections = [...(schema.sections || []), newSection];
    setSchema({ ...schema, sections: updatedSections });
    setActiveSectionIndex(updatedSections.length - 1);
  };

  /* Delete Section */
  const handleDeleteSection = (secIdx) => {
    const updatedSections = (schema.sections || []).filter((_, idx) => idx !== secIdx);
    setSchema({ ...schema, sections: updatedSections });
    if (activeSectionIndex >= updatedSections.length) {
      setActiveSectionIndex(Math.max(0, updatedSections.length - 1));
    }
  };

  /* Duplicate Section */
  const handleDuplicateSection = (secIdx) => {
    const targetSec = schema.sections?.[secIdx];
    if (!targetSec) return;

    const newId = `sec_${Date.now()}`;
    const clonedFields = (targetSec.fields || []).map((f) => ({
      ...f,
      id: `fld_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      db_field: `${f.db_field}_copy`,
    }));

    const clonedSec = {
      ...targetSec,
      id: newId,
      section_label: `${targetSec.section_label} (Copy)`,
      slug: `${targetSec.slug}_copy`,
      fields: clonedFields,
    };

    const updatedSections = [...schema.sections];
    updatedSections.splice(secIdx + 1, 0, clonedSec);
    setSchema({ ...schema, sections: updatedSections });
    setActiveSectionIndex(secIdx + 1);
  };

  /* Update Section */
  const handleUpdateSection = (updatedSec) => {
    const updatedSections = [...schema.sections];
    updatedSections[activeSectionIndex] = updatedSec;
    setSchema({ ...schema, sections: updatedSections });
  };

  /* Add Field */
  const handleAddField = (fieldTemplate) => {
    const updatedSections = [...(schema.sections || [])];
    if (updatedSections.length === 0) {
      updatedSections.push({
        id: 'sec_1',
        section_label: 'General Information',
        slug: 'general',
        type: 'general',
        fields: [],
      });
    }

    const sec = updatedSections[activeSectionIndex] || updatedSections[0];
    const newFieldId = `fld_${Date.now()}`;

    const newField = {
      ...fieldTemplate,
      id: newFieldId,
      label: fieldTemplate.label || 'New Field',
      db_field: `${fieldTemplate.type}_${Date.now().toString().slice(-4)}`,
      required: false,
      validation: { required: false },
      ui: { ...fieldTemplate.ui },
    };

    sec.fields = [...(sec.fields || []), newField];
    updatedSections[activeSectionIndex] = sec;

    setSchema({ ...schema, sections: updatedSections });
    setSelectedFieldId(newFieldId);
  };

  /* Update Field */
  const handleUpdateField = (updatedField) => {
    const updatedSections = [...schema.sections];
    const sec = updatedSections[activeSectionIndex];
    if (!sec) return;

    const fields = (sec.fields || []).map((f) => (f.id === updatedField.id ? updatedField : f));
    updatedSections[activeSectionIndex] = { ...sec, fields };
    setSchema({ ...schema, sections: updatedSections });
  };

  /* Update Sub-Field of Add-More Table */
  const handleUpdateSubField = (updatedSubField) => {
    if (!currentField || currentField.type !== 'add_more') return;
    const currentCols = currentField.fields || [];
    const updatedCols = currentCols.map((c) => (c.id === updatedSubField.id ? updatedSubField : c));
    handleUpdateField({ ...currentField, fields: updatedCols });
  };

  /* Delete Field */
  const handleDeleteField = (secIdx, fldIdx) => {
    const updatedSections = [...schema.sections];
    const sec = updatedSections[secIdx];
    if (!sec) return;
    const fields = (sec.fields || []).filter((_, idx) => idx !== fldIdx);
    updatedSections[secIdx] = { ...sec, fields };
    setSchema({ ...schema, sections: updatedSections });
    if (selectedFieldId) setSelectedFieldId(null);
  };

  /* Duplicate Field */
  const handleDuplicateField = (secIdx, fldIdx) => {
    const updatedSections = [...schema.sections];
    const sec = updatedSections[secIdx];
    if (!sec || !sec.fields[fldIdx]) return;

    const target = sec.fields[fldIdx];
    const newId = `fld_${Date.now()}`;
    const cloned = {
      ...target,
      id: newId,
      label: `${target.label} (Copy)`,
      db_field: `${target.db_field}_copy`,
    };

    const fields = [...sec.fields];
    fields.splice(fldIdx + 1, 0, cloned);
    updatedSections[secIdx] = { ...sec, fields };
    setSchema({ ...schema, sections: updatedSections });
    setSelectedFieldId(newId);
  };

  /* Add Sub-Column to Add-More Table */
  const handleAddSubColumn = (secIdx, fldIdx) => {
    const updatedSections = [...schema.sections];
    const sec = { ...updatedSections[secIdx] };
    if (!sec || !sec.fields[fldIdx]) return;

    const targetField = { ...sec.fields[fldIdx] };
    const currentSubFields = [...(targetField.fields || [])];
    let colNum = currentSubFields.length + 1;
    let candidateDb = `col_${colNum}`;
    const existingDbs = new Set(currentSubFields.map((f) => f.db_field));
    while (existingDbs.has(candidateDb)) {
      colNum += 1;
      candidateDb = `col_${colNum}`;
    }

    const newSubColumn = {
      id: `sub_${Date.now()}_${colNum}`,
      type: 'text',
      label: `Column ${colNum}`,
      db_field: candidateDb,
      required: false,
      ui: { placeholder: `Enter Column ${colNum}` },
    };

    targetField.fields = [...currentSubFields, newSubColumn];
    sec.fields = sec.fields.map((f, idx) => (idx === fldIdx ? targetField : f));
    updatedSections[secIdx] = sec;

    setSchema({ ...schema, sections: updatedSections });
  };

  /* Delete Sub-Column from Add-More Table */
  const handleDeleteSubColumn = (secIdx, fldIdx, subIdx) => {
    const updatedSections = [...schema.sections];
    const sec = { ...updatedSections[secIdx] };
    if (!sec || !sec.fields[fldIdx]) return;

    const targetField = { ...sec.fields[fldIdx] };
    const currentSubFields = (targetField.fields || []).filter((_, idx) => idx !== subIdx);

    targetField.fields = currentSubFields;
    sec.fields = sec.fields.map((f, idx) => (idx === fldIdx ? targetField : f));
    updatedSections[secIdx] = sec;

    setSchema({ ...schema, sections: updatedSections });
  };

  /* Reorder Field */
  const handleReorderField = (srcSecIdx, srcFldIdx, targetSecIdx, targetFldIdx) => {
    const updatedSections = [...schema.sections];
    const srcSec = { ...updatedSections[srcSecIdx], fields: [...(updatedSections[srcSecIdx].fields || [])] };
    const targetSec = srcSecIdx === targetSecIdx ? srcSec : { ...updatedSections[targetSecIdx], fields: [...(updatedSections[targetSecIdx].fields || [])] };

    const [draggedItem] = srcSec.fields.splice(srcFldIdx, 1);

    if (srcSecIdx === targetSecIdx) {
      srcSec.fields.splice(targetFldIdx, 0, draggedItem);
      updatedSections[srcSecIdx] = srcSec;
    } else {
      targetSec.fields.splice(targetFldIdx, 0, draggedItem);
      updatedSections[srcSecIdx] = srcSec;
      updatedSections[targetSecIdx] = targetSec;
    }

    setSchema({ ...schema, sections: updatedSections });
  };

  /* Reorder Section */
  const handleReorderSection = (srcSecIdx, targetSecIdx) => {
    const updatedSections = [...schema.sections];
    const [draggedSec] = updatedSections.splice(srcSecIdx, 1);
    updatedSections.splice(targetSecIdx, 0, draggedSec);
    setSchema({ ...schema, sections: updatedSections });
    setActiveSectionIndex(targetSecIdx);
  };

  /* Save Draft / Publish Payload */
  const handleSave = async (isDraft = true, overrideUpdates = {}, closeAfter = false) => {
    try {
      const mergedSchema = { ...schema, ...overrideUpdates };

      // Pre-save validation: verify Form Title and Form Slug
      if (!mergedSchema.title || !mergedSchema.title.trim()) {
        message.error(`Form Title is required.`);
        return;
      }
      if (!mergedSchema.slug || !mergedSchema.slug.trim()) {
        message.error(`Form Slug is required.`);
        return;
      }
      if (!/^[a-z_][a-z0-9_]*$/.test(mergedSchema.slug)) {
        message.error(`Form Slug "${mergedSchema.slug}" is invalid. Only lowercase letters, numbers, and underscores are allowed.`);
        return;
      }

      // Pre-save validation: verify every section has valid label, valid unique slug, and sub-table name
      const sections = mergedSchema.sections || [];
      for (let sIdx = 0; sIdx < sections.length; sIdx++) {
        const sec = sections[sIdx];
        if (!sec.section_label || !sec.section_label.trim()) {
          message.error(`Section Label is required. Please check Section #${sIdx + 1}.`);
          setActiveSectionIndex(sIdx);
          setSelectedFieldId(null);
          setIsRightOpen(true);
          return;
        }
        if (!sec.slug || !sec.slug.trim()) {
          message.error(`Section Slug / DB Name is required for "${sec.section_label}".`);
          setActiveSectionIndex(sIdx);
          setSelectedFieldId(null);
          setIsRightOpen(true);
          return;
        }
        if (!/^[a-z_][a-z0-9_]*$/.test(sec.slug)) {
          message.error(`Section Slug "${sec.slug}" is invalid. Only lowercase letters, numbers, and underscores are allowed.`);
          setActiveSectionIndex(sIdx);
          setSelectedFieldId(null);
          setIsRightOpen(true);
          return;
        }
        if (sec.type === 'add_more' && sec.storage_type !== 'jsonb') {
          if (!sec.table_name || !sec.table_name.trim()) {
            message.error(`Sub-Table Name is required for section "${sec.section_label}".`);
            setActiveSectionIndex(sIdx);
            setSelectedFieldId(null);
            setIsRightOpen(true);
            return;
          }
          if (!/^[a-z_][a-z0-9_]*$/.test(sec.table_name)) {
            message.error(`Sub-Table Name "${sec.table_name}" is invalid. Only lowercase letters, numbers, and underscores are allowed.`);
            setActiveSectionIndex(sIdx);
            setSelectedFieldId(null);
            setIsRightOpen(true);
            return;
          }
        }
      }

      // Check duplicate section slugs
      const secSlugMap = {};
      for (let sIdx = 0; sIdx < sections.length; sIdx++) {
        const sec = sections[sIdx];
        const s = (sec.slug || '').toLowerCase();
        if (secSlugMap[s]) {
          message.error(`Duplicate Section Slug "${sec.slug}" found in "${secSlugMap[s].section_label}" and "${sec.section_label}". Every section must have a unique slug.`);
          setActiveSectionIndex(sIdx);
          setSelectedFieldId(null);
          setIsRightOpen(true);
          return;
        }
        secSlugMap[s] = sec;
      }

      // Pre-save validation: verify every field has valid label and unique db_field
      const allFormFields = (mergedSchema.sections || []).flatMap((sec) => sec.fields || []);

      // Require at least 1 field before publishing
      if (!isDraft && allFormFields.length === 0) {
        message.error('At least 1 field is required to publish a form. Please add at least one field from the left palette before publishing.');
        return;
      }

      const emptyLabelField = allFormFields.find((f) => !f.label || !f.label.trim());
      if (emptyLabelField) {
        message.error(`Field Label is required. Please set a label for all fields.`);
        setSelectedFieldId(emptyLabelField.id);
        setIsRightOpen(true);
        return;
      }

      const emptyDbField = allFormFields.find((f) => !f.db_field || !f.db_field.trim());
      if (emptyDbField) {
        message.error(`DB Field Name is required for "${emptyDbField.label || 'Field'}".`);
        setSelectedFieldId(emptyDbField.id);
        setIsRightOpen(true);
        return;
      }

      const invalidDbField = allFormFields.find((f) => !/^[a-z_][a-z0-9_]*$/.test(f.db_field));
      if (invalidDbField) {
        message.error(`DB Field Name "${invalidDbField.db_field}" is invalid. Only lowercase letters, numbers, and underscores are allowed.`);
        setSelectedFieldId(invalidDbField.id);
        setIsRightOpen(true);
        return;
      }

      // Check duplicate Field Labels
      const labelMap = {};
      for (const f of allFormFields) {
        const lbl = (f.label || '').trim().toLowerCase();
        if (lbl) {
          if (labelMap[lbl]) {
            message.error(`Duplicate Field Label "${f.label}" found. Every field must have a unique Field Label.`);
            setSelectedFieldId(f.id);
            setIsRightOpen(true);
            return;
          }
          labelMap[lbl] = f;
        }
      }

      // Check duplicate DB Field Names
      const dbMap = {};
      for (const f of allFormFields) {
        const k = (f.db_field || '').toLowerCase();
        if (dbMap[k]) {
          message.error(`Duplicate DB Field Name "${f.db_field}" found in fields "${dbMap[k].label}" and "${f.label}". Every field must have a unique DB Field Name.`);
          setSelectedFieldId(f.id);
          setIsRightOpen(true);
          return;
        }
        dbMap[k] = f;
      }

      // Check duplicate labels & DB names inside Add-More Table sub-fields
      for (const f of allFormFields) {
        if (f.type === 'add_more' && Array.isArray(f.fields)) {
          const subLabelMap = {};
          const subDbMap = {};
          for (const sub of f.fields) {
            const sLbl = (sub.label || '').trim().toLowerCase();
            if (sLbl) {
              if (subLabelMap[sLbl]) {
                message.error(`Duplicate Sub-Field Label "${sub.label}" in Table "${f.label}". Each column must have a unique label.`);
                setSelectedFieldId(f.id);
                setIsRightOpen(true);
                return;
              }
              subLabelMap[sLbl] = sub;
            }
            const sDb = (sub.db_field || '').trim().toLowerCase();
            if (sDb) {
              if (subDbMap[sDb]) {
                message.error(`Duplicate Sub-Field DB Name "${sub.db_field}" in Table "${f.label}". Each column must have a unique DB Field Name.`);
                setSelectedFieldId(f.id);
                setIsRightOpen(true);
                return;
              }
              subDbMap[sDb] = sub;
            }
          }
        }
      }

      // Check calculated fields have valid formulas
      const numericFieldTokens = allFormFields
        .filter((f) => {
          const isNum =
            f?.type === 'number' ||
            f?.number_type === 'integer' ||
            f?.number_type === 'decimal' ||
            f?.data_type === 'integer' ||
            f?.data_type === 'double precision' ||
            f?.data_type === 'numeric' ||
            f?.data_type === 'decimal' ||
            f?.calculation?.enabled;
          return isNum && f?.db_field;
        })
        .map((f) => f.db_field);

      for (const f of allFormFields) {
        if (f.calculation?.enabled) {
          const allowedTokens = numericFieldTokens.filter((token) => token !== f.db_field);
          const valRes = validateFormula(f.calculation?.formula, allowedTokens);
          if (!valRes.isValid) {
            message.error(`Calculated field "${f.label || f.db_field}": ${valRes.error}`);
            setSelectedFieldId(f.id);
            setIsRightOpen(true);
            return;
          }
        }

        if (f.type === 'add_more' && Array.isArray(f.fields)) {
          const subNumericTokens = f.fields
            .filter((sub) => {
              const isNum =
                sub?.type === 'number' ||
                sub?.number_type === 'integer' ||
                sub?.number_type === 'decimal' ||
                sub?.data_type === 'integer' ||
                sub?.data_type === 'double precision' ||
                sub?.data_type === 'numeric' ||
                sub?.data_type === 'decimal' ||
                sub?.calculation?.enabled;
              return isNum && sub?.db_field;
            })
            .map((sub) => sub.db_field);

          for (const sub of f.fields) {
            if (sub.calculation?.enabled) {
              const allowedSubTokens = subNumericTokens.filter((token) => token !== sub.db_field);
              const subValRes = validateFormula(sub.calculation?.formula, allowedSubTokens);
              if (!subValRes.isValid) {
                message.error(`Table "${f.label || 'Add-More'}" column "${sub.label || sub.db_field}": ${subValRes.error}`);
                setSelectedFieldId(f.id);
                setIsRightOpen(true);
                return;
              }
            }
          }
        }
      }

      setSaving(true);
      const payload = {
        ...mergedSchema,
        name: mergedSchema.title || mergedSchema.name,
        title: mergedSchema.title || mergedSchema.name,
        slug: mergedSchema.slug,
        table_name: mergedSchema.table_name,
        is_master: !!mergedSchema.is_master,
        is_draft: isDraft,
        parent_form_id: mergedSchema.parent_form_id || null,
        sections: mergedSchema.sections || [],
        actions: mergedSchema.actions || [],
        enable_action_tabs: mergedSchema.enable_action_tabs !== undefined ? mergedSchema.enable_action_tabs : false,
        action_tabs: mergedSchema.action_tabs || [],
        table_columns: mergedSchema.table_columns || [],
        triggers: mergedSchema.triggers || [],
        enable_approval: mergedSchema.enable_approval !== undefined ? mergedSchema.enable_approval : false,
        relation_with_parent: mergedSchema.relation_with_parent || null,
        view_name: mergedSchema.view_name || undefined,
        view_slug: mergedSchema.view_slug || undefined,
      };

      const schemaId = schema.id;
      let saveRes;
      if (schemaId) {
        saveRes = await privateHttpClient.put(`configurator/form-schemas/${schemaId}`, payload);
      } else {
        saveRes = await privateHttpClient.post('configurator/form-schemas', payload);
      }

      const returnedData = saveRes?.data?.data;
      const updatedSchemaState = {
        ...mergedSchema,
        id: returnedData?.id || schemaId || mergedSchema.id,
        is_draft: isDraft,
        relation_with_parent: returnedData?.relation_with_parent !== undefined ? returnedData.relation_with_parent : mergedSchema.relation_with_parent,
      };
      setSchema(updatedSchemaState);
      message.success(`Form ${isDraft ? 'saved as draft' : 'published'} & database triggers synced!`);
      if (closeAfter && onSuccess) onSuccess();
    } catch (err) {
      console.error('Error saving form:', err);
      message.error(`Failed to ${isDraft ? 'save' : 'publish'} form schema`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fb-v2-container">
      {/* Header Navigation Toolbar */}
      <HeaderNavigationV2
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        formTitle={schema.title}
        isDraft={schema.is_draft !== false}
        onBack={onBack}
        onPreview={() => setPreviewOpen(true)}
        onSaveDraft={() => handleSave(true, {}, false)}
        onPublish={() => handleSave(false, {}, false)}
        saving={saving}
        isLeftOpen={isLeftOpen}
        onToggleLeft={() => setIsLeftOpen((prev) => !prev)}
        isRightOpen={isRightOpen}
        onToggleRight={() => setIsRightOpen((prev) => !prev)}
      />

      {activeTab === 'settings' ? (
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <FormSettingsViewV2
            schema={schema}
            onUpdateSchema={(updates) => setSchema((prev) => ({ ...prev, ...updates }))}
            onSaveForm={(isDraft, updates) => handleSave(isDraft, updates, false)}
            allFields={allFields}
            allFormsList={allFormsList}
          />
        </div>
      ) : (
        <div className={`fb-v2-body ${isDragging ? 'is-resizing' : ''}`}>
          {/* Left Palette Sidebar */}
          {isLeftOpen && (
            <LeftPaletteV2
              width={leftWidth}
              onAddField={handleAddField}
              onCollapse={() => setIsLeftOpen(false)}
            />
          )}

          {/* Left Draggable Resizer Splitter */}
          {isLeftOpen && (
            <div
              className={`fb-v2-resizer left ${isDragging === 'left' ? 'is-active' : ''}`}
              onMouseDown={handleMouseDownLeft}
              onDoubleClick={() => setLeftWidth(260)}
              title="Drag to resize left sidebar (Double-click to reset)"
            >
              <div className="fb-v2-resizer-line" />
            </div>
          )}

          {/* Center Canvas */}
          <CanvasV2
            sections={schema.sections || []}
            activeSectionIndex={activeSectionIndex}
            setActiveSectionIndex={setActiveSectionIndex}
            selectedFieldId={selectedFieldId}
            setSelectedFieldId={(fieldId) => {
              setSelectedFieldId(fieldId);
              setSelectedSubFieldId(null);
            }}
            selectedSubFieldId={selectedSubFieldId}
            setSelectedSubFieldId={setSelectedSubFieldId}
            onAddSection={handleAddSection}
            onDeleteSection={handleDeleteSection}
            onDuplicateSection={handleDuplicateSection}
            onDeleteField={handleDeleteField}
            onDuplicateField={handleDuplicateField}
            onReorderField={handleReorderField}
            onReorderSection={handleReorderSection}
            onAddSubColumn={handleAddSubColumn}
            onDeleteSubColumn={handleDeleteSubColumn}
          />

          {/* Right Draggable Resizer Splitter */}
          {isRightOpen && (
            <div
              className={`fb-v2-resizer right ${isDragging === 'right' ? 'is-active' : ''}`}
              onMouseDown={handleMouseDownRight}
              onDoubleClick={() => setRightWidth(380)}
              title="Drag to resize inspector panel (Double-click to reset)"
            >
              <div className="fb-v2-resizer-line" />
            </div>
          )}

          {/* Right Inspector Sidebar */}
          {isRightOpen && (
            <InspectorPanelV2
              width={rightWidth}
              onCollapse={() => setIsRightOpen(false)}
              selectedField={currentField}
              onUpdateField={handleUpdateField}
              selectedSubField={currentSubField}
              onUpdateSubField={handleUpdateSubField}
              onSelectSubField={(colId) => setSelectedSubFieldId(colId)}
              onClearSubFieldSelection={() => setSelectedSubFieldId(null)}
              selectedSection={currentSection}
              onUpdateSection={handleUpdateSection}
              formMeta={schema}
              onUpdateFormMeta={(meta) => setSchema({ ...schema, ...meta })}
              allFields={allFields}
              allFormsList={allFormsList}
            />
          )}
        </div>
      )}

      <PreviewModalV2
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        schema={schema}
        allFormsList={allFormsList}
      />
    </div>
  );
}
