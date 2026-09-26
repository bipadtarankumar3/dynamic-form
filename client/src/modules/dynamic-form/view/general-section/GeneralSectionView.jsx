import React, { memo, useMemo } from "react";
import { Descriptions, Image, Tag, Alert } from "antd";
import { PaperClipOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { getDynamicFormHooks } from "../../hooks/dynamicFormHookRegistry";

const GeneralSectionView = ({ section, data, isActiveKey, form_slug }) => {
    const hooks = useMemo(() => getDynamicFormHooks(form_slug), [form_slug]);

    const renderExtraFields = (fieldDbField = null, position = "after") => {
        if (!hooks.getExtraFields) return null;
        return hooks.getExtraFields({
            form_slug,
            mode: "view",
            data,
            sectionSlug: section?.section_id || section?.slug || "general",
            fieldDbField,
            position,
        });
    };
    // Helper to check if field is numeric / financial
    const isNumericField = (field) => {
        if (field?.type === "number" || field?.type === "currency" || field?.is_numeric === true) {
            return true;
        }
        const name = (field?.db_field || "") + " " + (field?.label || "");
        return /budget|amount|total|cost|price|expense|allocation|fund|qty|quantity|rate/i.test(name);
    };

    // Helper to check if field is currency/financial
    const isCurrencyField = (field) => {
        if (field?.type === "currency") return true;
        const name = (field?.db_field || "") + " " + (field?.label || "");
        return /budget|amount|total|cost|price|expense|allocation|fund/i.test(name);
    };

    const cleanPath = (p) => {
        if (!p || typeof p !== "string") return "";
        const pathStr = p.trim();
        if (!pathStr || pathStr === "NA" || pathStr === "[]" || pathStr === "null") return "";

        if (pathStr.startsWith("blob:") || pathStr.startsWith("data:")) {
            return pathStr;
        }

        const apiBaseUrl = process.env.NEXT_PUBLIC_PUBLIC_API_URL || "http://localhost:6003/api/v1";

        if (/^https?:\/\//i.test(pathStr)) {
            return pathStr
                .replace(/\/api\/v1\/static\/uploads\//g, "/api/v1/static/")
                .replace(/\/static\/uploads\//g, "/static/");
        }

        const cleanRel = pathStr.replace(/^\/?(uploads\/)?/, "");
        return `${apiBaseUrl}/static/${cleanRel}`;
    };

    // Get field value safely
    const getValue = (field) => {
        // Date range
        if (field?.type === "date_range" && field?.act_db_field) {
            const start = data[field?.act_db_field?.start];
            const end = data[field?.act_db_field?.end];

            return start && end
                ? `${dayjs(start).format("DD-MM-YYYY")} to ${dayjs(end).format("DD-MM-YYYY")}`
                : "-";
        }

        // Select fields → Parent & Child dependency resolution + *_name_* lookup
        if (field?.type === "select") {
            const nameKey = Object.keys(data || {}).find(
                (key) => key.endsWith(`_${field?.db_field}`) && key !== field?.db_field
            );

            // Parent-Child dependency check
            const parentFieldKey = field?.dependency?.parent_db_field || field?.dependency?.parent || field?.parent_db_field;
            let parentValue = parentFieldKey ? data?.[parentFieldKey] : null;
            let parentNameKey = parentFieldKey ? Object.keys(data || {}).find(
                (k) => k.endsWith(`_${parentFieldKey}`) && k !== parentFieldKey
            ) : null;
            let parentName = parentNameKey ? data?.[parentNameKey] : parentValue;

            if (nameKey && data?.[nameKey]) {
                const nameValue = data[nameKey];

                if (Array.isArray(nameValue)) {
                    return nameValue.map((item, i) => (
                        <Tag key={i} color="blue">{item?.label || item}</Tag>
                    ));
                }

                // If parent exists, display as hierarchy tag
                if (parentName && typeof parentName === "string" && parentName !== nameValue) {
                    return (
                        <span className="flex items-center gap-1 flex-wrap">
                            <Tag color="cyan">{parentName}</Tag>
                            <span className="text-gray-400 text-xs">›</span>
                            <Tag color="purple">{nameValue}</Tag>
                        </span>
                    );
                }

                return nameValue;
            }

            // Static options match for select fields
            const rawVal = data?.[field?.db_field];
            if (field?.options && Array.isArray(field?.options) && rawVal !== undefined && rawVal !== null) {
                const opt = field.options.find((o) => String(o.value) === String(rawVal));
                if (opt) return opt.label;
            }
        }

        const value = data?.[field?.db_field];
        if (value === null || value === undefined || value === "") return "NA";

        // Rich Text / Text Editor HTML content
        if (
            field?.type === "textarea" &&
            (field?.ui?.is_text_editor || field?.is_text_editor || (typeof value === "string" && /<[a-z][\s\S]*>/i.test(value)))
        ) {
            return (
                <div
                    className="rich-text-content border border-slate-200 rounded p-2 bg-slate-50 text-slate-800 text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: value }}
                />
            );
        }

        // Active / Inactive Tag
        if (field?.db_field === isActiveKey) {
            const isActive = value === 1 || value === true;
            return (
                <Tag color={isActive ? "green" : "red"} style={{ fontWeight: 500 }}>
                    {isActive ? "Active" : "Inactive"}
                </Tag>
            );
        }

        // Date
        if (field?.type === "date") {
            return dayjs(value).format("DD-MM-YYYY");
        }

        // Number formatting for numeric/currency fields
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

        if (["point", "multipolygon", "line"].includes(field?.type) || field?.data_type === "json") {
            if (!value) return "-";
            let displayVal = value;
            if (typeof value === "object") {
                displayVal = JSON.stringify(value, null, 2);
            } else if (typeof value === "string") {
                try {
                    displayVal = JSON.stringify(JSON.parse(value), null, 2);
                } catch (_) {}
            }
            return (
                <pre className="text-xs bg-slate-900 text-emerald-400 p-2 rounded font-mono m-0 max-h-36 overflow-auto border border-slate-800">
                    {displayVal}
                </pre>
            );
        }

        // Multiple values
        if (Array.isArray(value)) {
            return value.map((item, i) => {
                if (typeof item === "object") {
                    return <Tag key={i}>{item?.label}</Tag>;
                }
                return <Tag key={i}>{item}</Tag>;
            });
        }

        // Single object (fallback safety)
        if (typeof value === "object") {
            return value?.label || JSON.stringify(value);
        }

        return String(value);
    };

    // Render Files Helper
    const renderFiles = (field) => {
        let files = data?.documents?.[field?.db_field];
        if (!files || (Array.isArray(files) && files.length === 0) || files === "NA" || files === "[]") {
            files = data?.[field?.db_field];
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
            <div
                style={{
                    maxHeight: 140,
                    overflowY: "auto",
                    paddingRight: 4,
                }}
            >
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
                                        key={key}
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
                                    key={key}
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

    const visibleFields = section?.fields?.filter((field) => field?.visible !== false) || [];
    const columnCount = section?.columns || 2;

    const prepareItems = () => {
        const rawItems = [];
        visibleFields.forEach((field) => {
            let item = null;
            if (field?.type === "heading") {
                item = {
                    key: field?.id || field?.db_field || Math.random(),
                    label: null,
                    span: columnCount,
                    children: (
                        <div className="py-1">
                            <h4 className="font-semibold text-slate-800 m-0">{field?.label}</h4>
                            {field?.subtext && <p className="text-xs text-slate-500 m-0 mt-0.5">{field.subtext}</p>}
                        </div>
                    ),
                };
            } else if (field?.type === "note") {
                item = {
                    key: field?.id || field?.db_field || Math.random(),
                    label: null,
                    span: columnCount,
                    children: (
                        <Alert
                            message={field?.label || undefined}
                            description={field?.content}
                            type={["info", "warning", "success", "error"].includes(field?.note_type) ? field?.note_type : "info"}
                            showIcon
                        />
                    ),
                };
            } else if (field?.type === "custom_html") {
                item = {
                    key: field?.id || field?.db_field || Math.random(),
                    label: null,
                    span: columnCount,
                    children: (
                        <div>
                            {field?.label && <div className="font-semibold text-xs text-slate-600 mb-1">{field.label}</div>}
                            <div dangerouslySetInnerHTML={{ __html: field?.html_content || "" }} />
                        </div>
                    ),
                };
            } else {
                let requestedSpan = Number(field?.col_span) || 1;
                if (requestedSpan >= columnCount) requestedSpan = columnCount;
                item = {
                    key: field?.id || field?.db_field || Math.random(),
                    label: field?.label,
                    span: requestedSpan,
                    children: field?.type === "file" ? renderFiles(field) : getValue(field),
                };
            }

            if (item) rawItems.push(item);

            const extraAfter = renderExtraFields(field?.db_field, "after");
            if (extraAfter) {
                rawItems.push({
                    key: `extra_${field?.db_field}`,
                    label: null,
                    span: 1,
                    children: extraAfter,
                });
            }
        });

        const balancedItems = [];
        let currentRowSpan = 0;

        for (let i = 0; i < rawItems.length; i++) {
            const item = { ...rawItems[i] };

            if (item.span >= columnCount) {
                if (currentRowSpan > 0 && balancedItems.length > 0) {
                    balancedItems[balancedItems.length - 1].span += (columnCount - currentRowSpan);
                }
                item.span = columnCount;
                balancedItems.push(item);
                currentRowSpan = 0;
            } else {
                if (currentRowSpan + item.span > columnCount) {
                    if (balancedItems.length > 0) {
                        balancedItems[balancedItems.length - 1].span += (columnCount - currentRowSpan);
                    }
                    currentRowSpan = item.span;
                } else {
                    currentRowSpan += item.span;
                }
                balancedItems.push(item);
            }
        }

        if (currentRowSpan > 0 && currentRowSpan < columnCount && balancedItems.length > 0) {
            balancedItems[balancedItems.length - 1].span += (columnCount - currentRowSpan);
        }

        return balancedItems;
    };

    const descriptionItems = prepareItems();

    return (
        <div className="ant-card ant-card-bordered view-user-modal shadow-sm rounded-lg mb-4 overflow-hidden" style={{ border: "1px solid #e2e8f0" }}>
            <div
                className="ant-card-head"
                style={{
                    background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
                    borderBottom: "none",
                    padding: "10px 16px",
                    minHeight: "auto",
                }}
            >
                <div className="ant-card-head-title font-bold text-base text-white" style={{ color: "#ffffff", margin: 0, fontSize: "14px", fontWeight: 700 }}>
                    {section?.section_label}
                </div>
            </div>

            <Descriptions
                bordered
                column={columnCount}
                size="small"
                items={descriptionItems}
                styles={{
                    label: {
                        fontWeight: 600,
                        background: "#f8fafc",
                        color: "#475569",
                        width: "30%",
                    },
                    content: {
                        color: "#0f172a",
                        background: "#ffffff",
                    },
                }}
            />
        </div>
    );
};

export default memo(GeneralSectionView);
