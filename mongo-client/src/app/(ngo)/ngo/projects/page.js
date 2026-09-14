'use client';

import React, { Suspense } from "react";
import dynamic from "next/dynamic";
import { Spin } from "antd";

const NgoProjectsView = dynamic(
  () => import("../../_modules/ngo/projects/NgoProjectsView"),
  {
    ssr: false,
    loading: () => (
      <div style={{ textAlign: "center", padding: "60px 0" }}>
        <Spin size="large" />
        <div style={{ marginTop: 12, color: "#64748b" }}>Loading CSR projects...</div>
      </div>
    ),
  }
);

export default function NgoProjectsPage() {
  return (
    <Suspense
      fallback={
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <Spin size="large" />
          <div style={{ marginTop: 12, color: "#64748b" }}>Loading...</div>
        </div>
      }
    >
      <NgoProjectsView />
    </Suspense>
  );
}
