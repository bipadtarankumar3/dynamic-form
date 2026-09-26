'use client';

import React, { Suspense } from "react";
import { Spin } from "antd";
import DdRecordView from "./_components/DdRecordView";

export default function NgoDueDiligencePage() {
  return (
    <Suspense
      fallback={
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
          <Spin size="large" />
        </div>
      }
    >
      <DdRecordView />
    </Suspense>
  );
}
