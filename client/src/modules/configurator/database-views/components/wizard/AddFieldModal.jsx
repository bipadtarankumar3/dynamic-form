import React from "react";
import { Modal, Select } from "antd";
import "../../database-views.css";

export default function AddFieldModal({
  open,
  onOk,
  onCancel,
  currentActiveChild,
  selectedFieldToAdd,
  setSelectedFieldToAdd,
}) {
  return (
    <Modal
      title={`Add Field to ${currentActiveChild?.title || 'Child Table'}`}
      open={open}
      onOk={onOk}
      onCancel={onCancel}
      okText="Add Field"
    >
      <div className="db-modal-padding">
        <label className="db-modal-label">Select Column</label>
        <Select
          showSearch
          className="db-full-width"
          placeholder="Type to search and select a column..."
          value={selectedFieldToAdd || undefined}
          onChange={(val) => setSelectedFieldToAdd(val)}
          optionFilterProp="label"
          filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
          options={[
            ...((currentActiveChild?.all_columns || [])
              .filter(c => !(currentActiveChild?.fields || []).some(f => f.field === c.column_name && (!f.source_table || f.source_table === currentActiveChild?.child_table)))
              .map(c => ({
                key: `col_${c.column_name}`,
                label: `${c.column_name} (${c.data_type})`,
                value: `col__${c.column_name}`
              }))),
            ...((currentActiveChild?.child_masters || []).flatMap(cm =>
              (cm.columns || [])
                .filter(cmc => !(currentActiveChild?.fields || []).some(f => f.field === cmc.column_name && f.source_table === cm.target_table))
                .map(cmc => ({
                  key: `master_${cm.source_column}_${cm.target_table}_${cmc.column_name}`,
                  label: `${cmc.column_name} [Master: ${cm.target_table} via ${cm.source_column}]`,
                  value: `master__${cm.source_column}__${cm.target_table}__${cmc.column_name}`
                }))
            ))
          ]}
        />
      </div>
    </Modal>
  );
}
