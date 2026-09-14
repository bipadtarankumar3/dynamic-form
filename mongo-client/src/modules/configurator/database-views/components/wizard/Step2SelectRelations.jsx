import React from "react";
import { Alert } from "antd";
import RelationshipDiagram from "../../RelationshipDiagram";
import "../../database-views.css";

export default function Step2SelectRelations({
  selectedBaseTable,
  relData,
  selectedRels,
  setSelectedRels,
  handleToggleAllRels,
  activeParentL2,
  setActiveParentL2,
  activeParentL3,
  setActiveParentL3,
  col1Masters,
  setCol1Masters,
  col2Masters,
  setCol2Masters,
  col3Masters,
  setCol3Masters,
  tableCache,
  setTableCache,
  loadingTables,
  fetchTableMetadata
}) {
  return (
    <div>
      <h3 className="db-step-title">Select Relationships</h3>
      <p className="db-step-subtitle">
        Choose the tables you want to include in this view
      </p>

      {!selectedBaseTable ? (
        <Alert type="warning" message="Please select a Base Table in Step 1 first." />
      ) : (
        <RelationshipDiagram
          baseTable={selectedBaseTable}
          baseColumns={relData.columns}
          relationships={relData}
          selectedRels={selectedRels}
          onToggleRel={(key, val) => setSelectedRels(prev => ({ ...prev, [key]: val }))}
          onToggleAllRel={handleToggleAllRels}
          activeParentL2={activeParentL2}
          setActiveParentL2={setActiveParentL2}
          activeParentL3={activeParentL3}
          setActiveParentL3={setActiveParentL3}
          col1Masters={col1Masters}
          setCol1Masters={setCol1Masters}
          col2Masters={col2Masters}
          setCol2Masters={setCol2Masters}
          col3Masters={col3Masters}
          setCol3Masters={setCol3Masters}
          tableCache={tableCache}
          setTableCache={setTableCache}
          loadingTables={loadingTables}
          fetchTableMetadata={fetchTableMetadata}
        />
      )}
    </div>
  );
}
