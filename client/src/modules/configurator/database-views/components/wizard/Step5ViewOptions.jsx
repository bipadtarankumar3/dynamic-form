import React from "react";
import { Card, Input, Button, Select, Row, Col, Checkbox } from "antd";
import { PlusOutlined, DeleteOutlined, FilterOutlined, SortAscendingOutlined, SlidersOutlined, AppstoreOutlined } from "@ant-design/icons";
import "../../database-views.css";

export default function Step5ViewOptions({
  relData,
  filters,
  setFilters,
  sorting,
  setSorting,
  viewOptions,
  setViewOptions,
  viewInfo,
  childConfigs,
}) {
  return (
    <div>
      <h3 className="db-step-title">View Options</h3>
      <p className="db-step-subtitle">
        Set filters, sorting and other display options
      </p>

      <Row gutter={24}>
        <Col span={12}>
          <Card
            title={
              <div className="db-card-header-flex">
                <div className="db-card-header-title">
                  <FilterOutlined style={{ color: "#ffffff", fontSize: 16 }} />
                  <span>Default Filters</span>
                </div>
                <Button
                  type="link"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => setFilters([...filters, { field: (relData.columns[0]?.column_name || ""), operator: "equals", value: "" }])}
                  className="db-btn-link-white"
                >
                  Add Filter
                </Button>
              </div>
            }
            size="small"
            className="db-card-radius"
            style={{ marginBottom: "20px" }}
          >
            {filters.map((f, idx) => (
              <div key={idx} style={{ display: "flex", gap: "8px", marginBottom: "8px", alignItems: "center" }}>
                <Select style={{ width: 150 }} value={f.field} onChange={(val) => { const newF = [...filters]; newF[idx].field = val; setFilters(newF); }} options={relData.columns.map(c => ({ label: c.column_name, value: c.column_name }))} />
                <Select style={{ width: 110 }} value={f.operator} onChange={(val) => { const newF = [...filters]; newF[idx].operator = val; setFilters(newF); }} options={[{ label: "is null", value: "is_null" }, { label: "is not", value: "not_equals" }, { label: "equals", value: "equals" }]} />
                {f.operator !== "is_null" && <Input style={{ width: 110 }} value={f.value} onChange={(e) => { const newF = [...filters]; newF[idx].value = e.target.value; setFilters(newF); }} />}
                <Button icon={<DeleteOutlined />} danger type="text" onClick={() => { const newF = [...filters]; newF.splice(idx, 1); setFilters(newF); }} />
              </div>
            ))}
          </Card>
        </Col>

        <Col span={12}>
          <Card
            title={
              <div className="db-card-header-flex">
                <div className="db-card-header-title">
                  <SortAscendingOutlined style={{ color: "#ffffff", fontSize: 16 }} />
                  <span>Default Sorting</span>
                </div>
                <Button
                  type="link"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => setSorting([...sorting, { field: (relData.columns[0]?.column_name || ""), direction: "DESC" }])}
                  className="db-btn-link-white"
                >
                  Add Sort
                </Button>
              </div>
            }
            size="small"
            className="db-card-radius"
            style={{ marginBottom: "20px" }}
          >
            {sorting.map((s, idx) => (
              <div key={idx} style={{ display: "flex", gap: "8px", marginBottom: "8px", alignItems: "center" }}>
                <Select style={{ flex: 1 }} value={s.field} onChange={(val) => { const newS = [...sorting]; newS[idx].field = val; setSorting(newS); }} options={relData.columns.map(c => ({ label: c.column_name, value: c.column_name }))} />
                <Select style={{ width: 100 }} value={s.direction} onChange={(val) => { const newS = [...sorting]; newS[idx].direction = val; setSorting(newS); }} options={[{ label: "Desc", value: "DESC" }, { label: "Asc", value: "ASC" }]} />
                <Button icon={<DeleteOutlined />} danger type="text" onClick={() => { const newS = [...sorting]; newS.splice(idx, 1); setSorting(newS); }} />
              </div>
            ))}
          </Card>
        </Col>
      </Row>

      <Row gutter={24}>
        <Col span={12}>
          <Card
            title={
              <div className="db-card-header-title">
                <SlidersOutlined style={{ color: "#ffffff", fontSize: 16 }} />
                <span>Page Size</span>
              </div>
            }
            size="small"
            className="db-card-radius"
          >
            <Select value={viewOptions.pageSize} onChange={(val) => setViewOptions({ ...viewOptions, pageSize: val })} options={[{ label: "20", value: 20 }, { label: "50", value: 50 }, { label: "100", value: 100 }]} style={{ width: "100%" }} />
            <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <Checkbox checked={viewOptions.showExport} onChange={(e) => setViewOptions({ ...viewOptions, showExport: e.target.checked })}>Show Export Buttons (Excel, PDF)</Checkbox>
              <Checkbox checked={viewOptions.showCreate} onChange={(e) => setViewOptions({ ...viewOptions, showCreate: e.target.checked })}>Show Create Button*</Checkbox>
              <Checkbox checked={viewOptions.showEdit} onChange={(e) => setViewOptions({ ...viewOptions, showEdit: e.target.checked })}>Show Edit Button</Checkbox>
              <Checkbox checked={viewOptions.showDelete} onChange={(e) => setViewOptions({ ...viewOptions, showDelete: e.target.checked })}>Show Delete Button</Checkbox>
            </div>
          </Card>
        </Col>

        <Col span={12}>
          <Card
            title={
              <div className="db-card-header-title">
                <AppstoreOutlined style={{ color: "#ffffff", fontSize: 16 }} />
                <span>Tab / Section Grouping</span>
              </div>
            }
            size="small"
            className="db-card-radius"
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <Checkbox checked={viewOptions.groupMain} onChange={(e) => setViewOptions({ ...viewOptions, groupMain: e.target.checked })}>{viewInfo.view_name || "Main Details"}</Checkbox>
              {childConfigs.map(ch => (
                <Checkbox key={ch.child_table} checked={viewOptions.groupChild} onChange={(e) => setViewOptions({ ...viewOptions, groupChild: e.target.checked })}>{ch.title || ch.child_table}</Checkbox>
              ))}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
