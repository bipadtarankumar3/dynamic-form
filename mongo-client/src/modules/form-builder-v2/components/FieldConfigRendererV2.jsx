import React from 'react';
import FieldConfigRenderer from '@/modules/form-builder/FieldConfigRenderer';
import CalculationTabConfigV2 from './field-config/CalculationTabConfigV2';

export default function FieldConfigRendererV2(props) {
  const activeField = props.field || props.activeField;
  if (!activeField) return null;

  const mergedProps = {
    ...props,
    activeField,
    field: activeField,
  };

  // Intercept and use updated CalculationTabConfigV2 for calculation config tab rendering
  if (props.overrideTab === 'calculation') {
    return <CalculationTabConfigV2 {...mergedProps} />;
  }

  return <FieldConfigRenderer {...mergedProps} />;
}
