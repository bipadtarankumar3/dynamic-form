'use client';

import React, { Suspense } from "react";
import dynamic from "next/dynamic";
import { Spin } from "antd";
import { useSearchParams } from "next/navigation";

const OpenRfpLists = dynamic(
  () => import("../../_modules/ngo/open-rfp/OpenRfpLists"),
  {
    ssr: false,
    loading: () => (
      <div style={{ textAlign: "center", padding: "60px 0" }}>
        <Spin size="large" />
        <div style={{ marginTop: 12, color: "#64748b" }}>Loading Open RFP opportunities...</div>
      </div>
    ),
  }
);

function NgoOpenRfpContent() {
  const searchParams = useSearchParams();
  const formSlug = searchParams.get("form_slug") || searchParams.get("slug") || "request_for_proposal";

  return (
    <div>
      <OpenRfpLists formSlug={formSlug} />
    </div>
  );
}

export default function NgoOpenRfpPage() {
  return (
    <Suspense
      fallback={
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <Spin size="large" />
          <div style={{ marginTop: 12, color: "#64748b" }}>Loading Open RFPs...</div>
        </div>
      }
    >
      <NgoOpenRfpContent />
    </Suspense>
  );
}
