import React, { useState } from "react";
import { Modal, Button, Tag, message } from "antd";
import { CopyOutlined, CheckOutlined, CodeOutlined } from "@ant-design/icons";

export default function ViewSqlModal({ open, onClose, sqlData }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(sqlData?.sql || "");
    setCopied(true);
    message.success("SQL copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <CodeOutlined style={{ color: "#ffffff" }} />
          <span>SQL Definition: public.{sqlData?.name || ""}</span>
        </div>
      }
      open={open}
      onCancel={onClose}
      width={750}
      centered
      styles={{
        body: { padding: "16px 24px 8px 24px" },
        footer: {
          padding: "14px 24px 16px 24px",
          margin: "12px -24px -20px -24px",
          borderTop: "1px solid #e2e8f0",
          background: "#f8fafc",
          borderRadius: "0 0 8px 8px",
        },
      }}
      footer={
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Tag color="cyan" style={{ borderRadius: 6, fontWeight: 600, fontSize: 11, padding: "2px 8px", margin: 0 }}>
              PostgreSQL View
            </Tag>
            <span style={{ fontSize: 12, color: "#64748b" }}>
              <code>public.{sqlData?.name || ""}</code>
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Button
              key="copy"
              icon={copied ? <CheckOutlined style={{ color: "#16a34a" }} /> : <CopyOutlined />}
              onClick={handleCopy}
              style={{ borderRadius: 8, height: 36, fontWeight: 600 }}
            >
              {copied ? "Copied!" : "Copy SQL"}
            </Button>
            <Button
              key="close"
              type="primary"
              className="conf-create-btn"
              onClick={onClose}
              style={{ borderRadius: 8, height: 36, padding: "0 24px", fontWeight: 600 }}
            >
              Close
            </Button>
          </div>
        </div>
      }
    >
      <pre
        style={{
          background: "#0f172a",
          color: "#38bdf8",
          padding: "16px",
          borderRadius: "8px",
          fontFamily: "Consolas, Monaco, monospace",
          fontSize: "13px",
          maxHeight: "420px",
          overflowY: "auto",
          whiteSpace: "pre-wrap",
          margin: 0,
        }}
      >
        {sqlData?.sql || ""}
      </pre>
    </Modal>
  );
}
