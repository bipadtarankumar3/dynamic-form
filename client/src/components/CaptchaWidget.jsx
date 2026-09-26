import React, { useState, useEffect, useCallback, useRef } from "react";
import { Input, Button, Space, Typography, Tag, Tooltip } from "antd";
import { ReloadOutlined, CheckCircleOutlined, SecurityScanOutlined } from "@ant-design/icons";

const { Text } = Typography;

export default function CaptchaWidget({ onVerify }) {
  const [captchaCode, setCaptchaCode] = useState("");
  const [userInput, setUserInput] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const onVerifyRef = useRef(onVerify);
  useEffect(() => {
    onVerifyRef.current = onVerify;
  }, [onVerify]);

  const generateCaptcha = useCallback(() => {
    const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptchaCode(code);
    setUserInput("");
    setIsVerified(false);
    setErrorMsg("");
    if (onVerifyRef.current) onVerifyRef.current(false);
  }, []);

  useEffect(() => {
    generateCaptcha();
  }, [generateCaptcha]);

  const handleInputChange = (e) => {
    const val = e.target.value.toUpperCase().trim();
    setUserInput(val);

    if (val.length === 6) {
      if (val === captchaCode) {
        setIsVerified(true);
        setErrorMsg("");
        if (onVerifyRef.current) onVerifyRef.current(true);
      } else {
        setIsVerified(false);
        setErrorMsg("Invalid CAPTCHA code. Try again.");
        if (onVerifyRef.current) onVerifyRef.current(false);
      }
    } else {
      setIsVerified(false);
      setErrorMsg("");
      if (onVerifyRef.current) onVerifyRef.current(false);
    }
  };

  return (
    <div
      style={{
        padding: "16px",
        background: "#f8fafc",
        borderRadius: "12px",
        border: isVerified ? "1px solid #22c55e" : "1px solid #e2e8f0",
        marginBottom: "16px",
        transition: "all 0.3s ease"
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <Space size="small">
          <SecurityScanOutlined style={{ color: "#0284c7", fontSize: "18px" }} />
          <Text strong style={{ color: "#0f172a", fontSize: "14px" }}>
            VAPT Security Verification
          </Text>
        </Space>
        {isVerified && (
          <Tag color="success" icon={<CheckCircleOutlined />} style={{ fontWeight: 600 }}>
            CAPTCHA Verified
          </Tag>
        )}
      </div>

      <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
        {/* Styled Visual Captcha Badge */}
        <div
          style={{
            background: "linear-gradient(135deg, #0f172a 0%, #334155 100%)",
            color: "#38bdf8",
            padding: "8px 18px",
            borderRadius: "8px",
            fontFamily: "var(--font-mono, 'Courier New', monospace)",
            fontSize: "20px",
            fontWeight: 800,
            letterSpacing: "5px",
            userSelect: "none",
            boxShadow: "inset 0 2px 4px rgba(0,0,0,0.3)",
            textDecoration: "line-through",
            textDecorationColor: "#94a3b8"
          }}
        >
          {captchaCode}
        </div>

        <Tooltip title="Refresh Security Code">
          <Button icon={<ReloadOutlined />} onClick={generateCaptcha} size="middle" />
        </Tooltip>

        <Input
          placeholder="ENTER 6-CHARACTER CODE"
          maxLength={6}
          value={userInput}
          onChange={handleInputChange}
          style={{
            width: "220px",
            textTransform: "uppercase",
            fontWeight: 600,
            borderColor: isVerified ? "#22c55e" : undefined
          }}
          status={errorMsg ? "error" : ""}
        />
      </div>

      {errorMsg && (
        <Text type="danger" style={{ fontSize: "12px", marginTop: "6px", display: "block" }}>
          {errorMsg}
        </Text>
      )}
    </div>
  );
}
