import React, { useRef, useEffect } from 'react';
import FieldConfigRenderer from '@/modules/form-builder/FieldConfigRenderer';
import CalculationTabConfigV2 from './field-config/CalculationTabConfigV2';

export default function FieldConfigRendererV2(props) {
  const activeField = props.field || props.activeField;
  if (!activeField) return null;

  const fieldRef = useRef(activeField);
  useEffect(() => {
    fieldRef.current = activeField;
  }, [activeField]);

  // Synchronous fallback for updateField(key, value)
  const updateField =
    props.updateField ||
    ((key, value) => {
      const nextField = {
        ...fieldRef.current,
        [key]: value,
      };
      fieldRef.current = nextField;

      if (props.onUpdateField) {
        props.onUpdateField(nextField);
      } else if (props.onUpdateFieldProp) {
        props.onUpdateFieldProp(key, value);
      }
    });

  // Synchronous fallback for updateNested(parent, key, value)
  const updateNested =
    props.updateNested ||
    ((parent, key, value) => {
      const nextField = {
        ...fieldRef.current,
        [parent]: {
          ...(fieldRef.current?.[parent] || {}),
          [key]: value,
        },
      };
      fieldRef.current = nextField;

      if (props.onUpdateField) {
        props.onUpdateField(nextField);
      } else if (props.onUpdateFieldProp) {
        props.onUpdateFieldProp(parent, nextField[parent]);
      }
    });

  // Synchronous fallback for setFields(updater)
  const setFields =
    props.setFields ||
    ((updater) => {
      if (typeof updater === 'function') {
        const updated = updater([fieldRef.current]);
        const found = Array.isArray(updated)
          ? updated.find((f) => f.id === fieldRef.current.id) || updated[0]
          : updated;
        if (found) {
          fieldRef.current = found;
          if (props.onUpdateField) props.onUpdateField(found);
        }
      }
    });

  const mergedProps = {
    ...props,
    activeField,
    field: activeField,
    updateField,
    updateNested,
    setFields,
    allFormFields: props.allFormFields || props.allFields || [],
    errors: props.errors || {},
  };

  // Intercept and use updated CalculationTabConfigV2 for calculation config tab rendering
  if (props.overrideTab === 'calculation') {
    return <CalculationTabConfigV2 {...mergedProps} />;
  }

  return <FieldConfigRenderer {...mergedProps} />;
}
