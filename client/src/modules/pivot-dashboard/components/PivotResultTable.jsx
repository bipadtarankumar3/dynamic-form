import React, { useState } from 'react';
import { Card, Typography, Space, Empty } from 'antd';
import { DownOutlined, UpOutlined } from '@ant-design/icons';

const { Text } = Typography;

const PivotResultTable = ({ data = [], zones = {} }) => {
  const [open, setOpen] = useState(true);

  if (!open) {
    return (
      <Card
        title="Report Preview"
        extra={
          <Space onClick={() => setOpen(o => !o)} className="cursor-pointer">
            <DownOutlined />
          </Space>
        }
        className="md-preview-card"
      />
    );
  }

  if (data.length === 0) {
    return (
      <Card
        title="Report Preview"
        extra={
          <Space onClick={() => setOpen(o => !o)} className="cursor-pointer">
            <UpOutlined />
          </Space>
        }
        className="md-preview-card"
      >
        <div className="pivot-table-empty">
          <Empty description="No data generated. Click 'Run Report' to see results." />
        </div>
      </Card>
    );
  }

  const rowFields = zones.rows || [];
  const colFields = zones.columns || [];
  const valueFields = zones.values || [];

  const rowKeys = rowFields.map(r => r.type === 'json' ? `${r.id}_value` : r.id);
  const allKeys = Object.keys(data[0] || {});
  const pivotKeys = allKeys.filter(k => k !== 'value_json' && k !== 'pivoted_values' && !rowKeys.includes(k) && !k.startsWith('total_'));

  // Sort pivot columns
  const sortedPivotKeys = [...pivotKeys].sort((a, b) => a.localeCompare(b));

  const numHeaderRows = colFields.length > 0 ? colFields.length + 1 : 1;

  // Build the pivot header cells dynamically by grouping adjacent matching titles
  const getHeaderRowCells = (r) => {
    const cells = [];
    let currentCell = null;

    sortedPivotKeys.forEach((key) => {
      let title = '';
      if (key.startsWith('total_')) {
        if (r === numHeaderRows - 1) {
          title = key.replace(/_/g, ' ').toUpperCase();
        } else {
          title = 'TOTAL ➔';
        }
      } else {
        const parts = key.split(' - ');
        if (r === numHeaderRows - 1) {
          title = parts[parts.length - 1].replace(/_/g, ' ').toUpperCase();
        } else {
          title = parts[r] === 'ZZZZ' ? 'SUB TOTAL' : parts[r];
        }
      }

      let parentPath = '';
      if (!key.startsWith('total_') && r > 0) {
        const parts = key.split(' - ');
        parentPath = parts.slice(0, r).join(' - ');
      }

      const matchKey = parentPath ? `${parentPath} || ${title}` : title;

      if (currentCell && currentCell.matchKey === matchKey) {
        currentCell.colSpan += 1;
      } else {
        if (currentCell) {
          cells.push(currentCell);
        }
        currentCell = {
          title,
          colSpan: 1,
          rowSpan: 1,
          matchKey,
          align: key.startsWith('total_') ? 'right' : 'center'
        };
      }
    });

    if (currentCell) {
      cells.push(currentCell);
    }
    return cells;
  };

  return (
    <Card
      title="Report Preview"
      extra={
        <Space onClick={() => setOpen(o => !o)} className="cursor-pointer">
          <UpOutlined />
        </Space>
      }
      styles={{ body: { padding: 0 } }}
      className="md-preview-card"
    >
      <div className="pivot-table-container">
        <table className="md-html-pivot-table">
          <thead>
            {Array.from({ length: numHeaderRows }).map((_, r) => {
              // Leftmost row dimension cells for this header row
              const rowDimCells = [];
              if (colFields.length > 0) {
                if (r < colFields.length) {
                  rowFields.forEach(rowField => {
                    rowDimCells.push(
                      <th 
                        key={`row-dim-${rowField.id}-${r}`} 
                        className="md-row-dim-header sticky-col align-left"
                      >
                        {colFields[r].label.toUpperCase()} ➔
                      </th>
                    );
                  });
                } else {
                  rowFields.forEach(rowField => {
                    rowDimCells.push(
                      <th 
                        key={`row-dim-${rowField.id}-${r}`} 
                        className="md-row-dim-header sticky-col align-left"
                      >
                        {rowField.label.toUpperCase()} 🠗
                      </th>
                    );
                  });
                }
              } else {
                rowFields.forEach(rowField => {
                  rowDimCells.push(
                    <th 
                      key={`row-dim-${rowField.id}-${r}`} 
                      className="md-row-dim-header sticky-col align-left"
                    >
                      {rowField.label.toUpperCase()}
                    </th>
                  );
                });
              }

              // Pivoted column cells for this header row
              const pivotCells = getHeaderRowCells(r).map((cell, idx) => (
                <th
                  key={`pivot-cell-${r}-${idx}`}
                  colSpan={cell.colSpan}
                  rowSpan={cell.rowSpan}
                  className={`align-${cell.align || 'center'}`}
                >
                  {cell.title}
                </th>
              ));

              return (
                <tr key={`header-row-${r}`}>
                  {rowDimCells}
                  {pivotCells}
                </tr>
              );
            })}
          </thead>
          <tbody>
            {data.map((row, rIdx) => {
              const isGrandTotalRow = rowKeys.some(rk => row[rk] === 'ZZZZ' || row[rk] === 'TOTAL');

              return (
                <tr key={`data-row-${rIdx}`} className={isGrandTotalRow ? 'total-row' : ''}>
                  {/* Row Dimension Values */}
                  {rowKeys.map((rk, colIdx) => {
                    const cellVal = row[rk];
                    const isTotal = cellVal === 'ZZZZ' || cellVal === 'TOTAL';
                    return (
                      <td key={`row-val-${rk}`} className="sticky-col align-left">
                        {isTotal ? (
                          <Text strong className="pivot-total-badge">TOTAL</Text>
                        ) : (
                          cellVal ?? '-'
                        )}
                      </td>
                    );
                  })}

                  {/* Pivoted Column Values */}
                  {sortedPivotKeys.map((pk) => {
                    const val = row[pk];
                    const formatted = typeof val === 'number' ? val.toLocaleString() : (val ?? '');
                    return (
                      <td key={`pivot-val-${pk}`} className="align-right">
                        {formatted}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default PivotResultTable;
