import React, { memo, useMemo } from "react";
import { Card, Table, Tag, Image, Empty, Statistic, Row, Col } from "antd";
import { PaperClipOutlined, FileTextOutlined, EyeOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

const AddMoreSectionViewV2 = ({ data = [], section, isActiveKey, allData = {} }) => {
  const isNumericField = (field) => {
    if (field?.type === "number" || field?.type === "currency" || field?.is_numeric === true) {
      return true;
    }
    const name = (field?.db_field || "") + " " + (field?.label || "");
    return /budget|amount|total|cost|price|expense|allocation|fund|qty|quantity|rate/i.test(name);
  };

  const isCurrencyField = (field) => {
    if (field?.type === "currency") return true;
    const name = (field?.db_field || "") + " " + (field?.label || "");
    return /budget|amount|total|cost|price|expense|allocation|fund/i.test(name);
  };

  const getValue = (field, row) => {
    if (field?.type === "date_range" && field?.act_db_field) {
      const start = row[field?.act_db_field?.start];
      const end = row[field?.act_db_field?.end];
      return start && end
        ? `${dayjs(start).format("DD-MM-YYYY")} to ${dayjs(end).format("DD-MM-YYYY")}`
        : "-";
    }

    if (field?.type === "select") {
      const dbField = field?.db_field;

      // Pattern 1: child table format → `${db_field}_label`  (e.g. state_id_label, district_label)
      const directLabelKey = `${dbField}_label`;
      if (row[directLabelKey] !== undefined && row[directLabelKey] !== null) {
        return row[directLabelKey];
      }

      // Pattern 2: parent table format → key ending with `_${db_field}` (e.g. name_state_id)
      const nameKey = Object.keys(row).find(
        (k) => k.endsWith(`_${dbField}`) && k !== dbField
      );
      const parentFieldKey = field?.dependency?.parent_db_field || field?.dependency?.parent || field?.parent_db_field;
      let parentValue = parentFieldKey ? row[parentFieldKey] : null;
      let parentNameKey = parentFieldKey ? Object.keys(row).find(
        (k) => k.endsWith(`_${parentFieldKey}`) && k !== parentFieldKey
      ) : null;
      // also check parent direct label key
      const parentDirectLabel = parentFieldKey ? row[`${parentFieldKey}_label`] : null;
      let parentName = parentDirectLabel || (parentNameKey ? row[parentNameKey] : parentValue);

      if (nameKey && row[nameKey]) {
        const val = row[nameKey];
        if (Array.isArray(val)) {
          return val?.map((v, i) => (
            <Tag key={i} color="blue">{v?.label || v}</Tag>
          ));
        }

        if (parentName && typeof parentName === "string" && parentName !== val) {
          return (
            <span className="flex items-center gap-1 flex-wrap">
              <Tag color="cyan">{parentName}</Tag>
              <span className="text-gray-400 text-xs">›</span>
              <Tag color="purple">{val}</Tag>
            </span>
          );
        }
        return val;
      }

      const rawVal = row[dbField];
      if (field?.options && Array.isArray(field?.options) && rawVal !== undefined && rawVal !== null) {
        const opt = field.options.find((o) => String(o.value) === String(rawVal));
        if (opt) return opt.label;
      }
    }

    const value = row[field?.db_field];
    if (value === null || value === undefined || value === "") return "NA";

    if (
      field?.type === "textarea" &&
      (field?.ui?.is_text_editor || field?.is_text_editor || (typeof value === "string" && /<[a-z][\s\S]*>/i.test(value)))
    ) {
      return (
        <div
          className="rich-text-content border border-slate-200 rounded p-1 bg-slate-50 text-slate-800 text-xs leading-relaxed max-h-32 overflow-y-auto"
          dangerouslySetInnerHTML={{ __html: value }}
        />
      );
    }

    if (field?.db_field === isActiveKey) {
      const isActive = value === 1 || value === true;
      return (
        <Tag color={isActive ? "green" : "red"} style={{ fontWeight: 500 }}>
          {isActive ? "Active" : "Inactive"}
        </Tag>
      );
    }

    if (field?.type === "date") {
      return dayjs(value).format("DD-MM-YYYY");
    }

    if (
      !isNaN(Number(value)) &&
      typeof value !== "boolean" &&
      isNumericField(field)
    ) {
      const num = Number(value);
      return isCurrencyField(field)
        ? `₹${num.toLocaleString("en-IN")}`
        : num.toLocaleString("en-IN");
    }

    if (Array.isArray(value)) {
      return value.map((item, i) => (
        <Tag key={i}>
          {typeof item === "object" ? item?.label : item}
        </Tag>
      ));
    }

    if (typeof value === "object") {
      return value.label || "-";
    }

    return value;
  };

  const cleanPath = (p) => {
    if (!p || typeof p !== "string") return "";
    const pathStr = p.trim();
    if (!pathStr || pathStr === "NA" || pathStr === "[]" || pathStr === "null") return "";

    if (pathStr.startsWith("blob:") || pathStr.startsWith("data:")) {
      return pathStr;
    }

    const apiBaseUrl = process.env.NEXT_PUBLIC_PUBLIC_API_URL || "http://localhost:5001/api/v1";

    if (/^https?:\/\//i.test(pathStr)) {
      return pathStr
        .replace(/\/api\/v1\/static\/uploads\//g, "/api/v1/static/")
        .replace(/\/static\/uploads\//g, "/static/");
    }

    const cleanRel = pathStr.replace(/^\/?(uploads\/|api\/v1\/static\/)?/, "");
    return `${apiBaseUrl}/static/${cleanRel}`;
  };

  const renderFiles = (field, row) => {
    let files = row?.documents?.[field.db_field];
    if (!files || (Array.isArray(files) && files.length === 0) || files === "NA" || files === "[]") {
      files = row?.[field.db_field];
    }
    if (!files || (Array.isArray(files) && files.length === 0) || files === "NA" || files === "[]") {
      files = row?.documents;
    }
    if (!files || (Array.isArray(files) && files.length === 0) || files === "NA" || files === "[]") {
      files = (typeof allData?.documents === "object" && !Array.isArray(allData?.documents) ? allData?.documents?.[field.db_field] : null) ||
              (typeof data?.documents === "object" && !Array.isArray(data?.documents) ? data?.documents?.[field.db_field] : null);
    }
    if (!files || (Array.isArray(files) && files.length === 0) || files === "NA" || files === "[]") {
      files = allData?.[field.db_field] || data?.[field.db_field];
    }
    if (!files || (Array.isArray(files) && files.length === 0) || files === "NA" || files === "[]") {
      files = allData?.documents || data?.documents;
    }

    if (!files || files === "NA" || files === "[]" || files === "null") return "NA";

    if (typeof files === "string") {
      const trimmed = files.trim();
      if (!trimmed || trimmed === "NA" || trimmed === "[]" || trimmed === "null") return "NA";
      if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
        try {
          files = JSON.parse(trimmed);
        } catch (_) {}
      }
    }

    const fileList = (Array.isArray(files) ? files : [files])
      .filter(Boolean)
      .filter((f) => f !== "NA" && f !== "[]" && f !== "null");

    if (fileList.length === 0) return "NA";

    return (
      <div style={{ maxHeight: 140, overflowY: "auto" }}>
        <div className="flex gap-2 flex-wrap items-center">
          {fileList.map((rawItem, i) => {
            let item = rawItem;
            if (typeof item === "string" && (item.startsWith("{") || item.startsWith("["))) {
              try {
                item = JSON.parse(item);
              } catch (_) {}
            }

            const rawPath =
              typeof item === "string"
                ? item
                : item?.file_path || item?.url || item?.thumbUrl || item?.preview || item?.path || "";

            const filePath = cleanPath(rawPath);
            if (!filePath) return null;

            const isDataUrl = rawPath.startsWith("data:");
            const fileName =
              typeof item === "string"
                ? isDataUrl
                  ? "Uploaded File"
                  : item.split("/").pop()?.split("?")[0] || `File ${i + 1}`
                : item?.file_name ||
                  item?.name ||
                  item?.originalname ||
                  (isDataUrl ? "Uploaded File" : rawPath.split("/").pop()?.split("?")[0] || `File ${i + 1}`);

            const key = item?.tdoc_id || item?.uid || i;
            const isImage =
              Boolean(item?.type && String(item.type).startsWith("image/")) ||
              rawPath.startsWith("data:image/") ||
              rawPath.startsWith("blob:") ||
              /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)(\?.*)?$/i.test(rawPath || filePath);

            return (
              <div
                key={key}
                className="flex items-center gap-1.5 p-1 bg-slate-50 border border-slate-200 rounded max-w-full"
                style={{ fontSize: 12 }}
              >
                {isImage ? (
                  <Image
                    src={filePath}
                    alt={fileName}
                    width={36}
                    height={36}
                    style={{ objectFit: "cover", borderRadius: 4 }}
                    preview={{ mask: <span style={{ fontSize: 10 }}>View</span> }}
                  />
                ) : (
                  <PaperClipOutlined style={{ color: "#2563eb", fontSize: 16 }} />
                )}
                <a
                  href={filePath}
                  target="_blank"
                  rel="noreferrer"
                  download={!isDataUrl ? fileName : undefined}
                  className="text-blue-600 hover:text-blue-800 underline max-w-[150px] truncate font-medium"
                  title={fileName}
                  style={{ display: "inline-block" }}
                >
                  {fileName}
                </a>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const visibleFields = useMemo(
    () => section?.fields?.filter((field) => field?.visible !== false) || [],
    [section?.fields]
  );

  const getFieldTotal = (field) => {
    let hasValidNumber = false;
    const total = (data || []).reduce((acc, row) => {
      const val = row[field?.db_field];
      if (val !== null && val !== undefined && val !== "") {
        const num = Number(val);
        if (!isNaN(num)) {
          hasValidNumber = true;
          return acc + num;
        }
      }
      return acc;
    }, 0);

    return hasValidNumber ? total : null;
  };

  const hasNumericColumn = useMemo(
    () => visibleFields.some((field) => getFieldTotal(field) !== null),
    [visibleFields, data]
  );

  const columns = useMemo(() => {
    return [
      {
        title: "#",
        dataIndex: "__index",
        key: "__index",
        width: 60,
        align: "center",
        render: (_, __, index) => index + 1,
      },
      ...visibleFields.map((field) => {
        const isNumeric = isNumericField(field);
        return {
          title: field?.label,
          dataIndex: field?.db_field,
          key: field?.id || field?.db_field,
          align: isNumeric ? "right" : "left",
          render: (_, row) =>
            field?.type === "file" ? renderFiles(field, row) : getValue(field, row),
        };
      }),
    ];
  }, [visibleFields, isActiveKey, allData, data]);

  if (!data?.length) {
    return (
      <Card title={section?.section_label} size="small" className="mb-4 shadow-sm">
        <Empty description="No records found" />
      </Card>
    );
  }

  const displayMode = section?.display_mode || "table";
  const primaryBudgetField = visibleFields.find((f) => isCurrencyField(f));
  const primaryTotalSum = primaryBudgetField ? getFieldTotal(primaryBudgetField) : null;

  return (
    <Card
      title={
        <div className="flex items-center justify-between" style={{ color: "#ffffff" }}>
          <span className="font-bold text-base text-white" style={{ color: "#ffffff" }}>
            {section?.section_label}
          </span>
          <div className="flex items-center gap-2">
            <Tag color="purple" style={{ margin: 0, fontWeight: 600 }}>
              {data.length} {data.length === 1 ? "Entry" : "Entries"}
            </Tag>
            {primaryTotalSum !== null && (
              <Tag color="blue" style={{ margin: 0, fontWeight: 600 }}>
                Total: ₹{primaryTotalSum.toLocaleString("en-IN")}
              </Tag>
            )}
          </div>
        </div>
      }
      size="small"
      className="shadow-sm rounded-lg mb-4 overflow-hidden"
      style={{ border: "1px solid #e2e8f0" }}
      styles={{
        header: {
          background: "var(--primary-gradient, var(--primary-color, #15803d))",
          borderBottom: "none",
          padding: "10px 16px",
        },
      }}
    >
      {displayMode === "stat_widgets" && (
        <div className="mb-4 bg-slate-50 p-3 rounded border border-slate-200">
          <Row gutter={16}>
            <Col span={8}>
              <Statistic title="Total Entries" value={data.length} />
            </Col>
            {visibleFields.filter((f) => isNumericField(f)).slice(0, 2).map((field) => {
              const total = getFieldTotal(field);
              if (total === null) return null;
              const isCurr = isCurrencyField(field);
              return (
                <Col span={8} key={field.db_field}>
                  <Statistic
                    title={`Grand Total (${field.label})`}
                    value={total}
                    prefix={isCurr ? "₹" : ""}
                    groupSeparator=","
                    precision={0}
                  />
                </Col>
              );
            })}
          </Row>
        </div>
      )}

      {displayMode === "cards" ? (
        <div className="flex flex-col gap-3">
          {data.map((row, index) => (
            <Card
              key={index}
              size="small"
              title={`${section?.section_label} #${index + 1}`}
              className="border border-slate-200"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                {visibleFields.map((field) => (
                  <div key={field?.id} className="flex flex-col border-b pb-1">
                    <span className="text-gray-500 font-medium">{field?.label}</span>
                    <span className="font-semibold">
                      {field?.type === "file" ? renderFiles(field, row) : getValue(field, row)}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table
            columns={columns}
            dataSource={data}
            rowKey={(row) => row.id || row.key || row._id || row.primary_key || row.__temp_pk || JSON.stringify(row)}
            pagination={false}
            bordered
            size="small"
            summary={() => {
              if (!hasNumericColumn) return null;

              return (
                <Table.Summary fixed>
                  <Table.Summary.Row style={{ background: "#f8fafc" }}>
                    <Table.Summary.Cell index={0} align="center">
                      <strong className="text-gray-800">Grand Total</strong>
                    </Table.Summary.Cell>
                    {visibleFields.map((field, colIdx) => {
                      const total = getFieldTotal(field);
                      const isCurrency = isCurrencyField(field);
                      const isNumeric = isNumericField(field);

                      return (
                        <Table.Summary.Cell
                          key={field?.id || colIdx}
                          index={colIdx + 1}
                          align={isNumeric ? "right" : "left"}
                        >
                          {total !== null ? (
                            <strong className={isCurrency ? "text-blue-700 text-sm" : "text-gray-900"}>
                              {isCurrency
                                ? `₹${total.toLocaleString("en-IN")}`
                                : total.toLocaleString("en-IN")}
                            </strong>
                          ) : (
                            "-"
                          )}
                        </Table.Summary.Cell>
                      );
                    })}
                  </Table.Summary.Row>
                </Table.Summary>
              );
            }}
          />
        </div>
      )}
    </Card>
  );
};

export default React.memo(AddMoreSectionViewV2);
