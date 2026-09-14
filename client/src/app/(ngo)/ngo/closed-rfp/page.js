'use client';

import React, { Suspense } from "react";
import dynamic from "next/dynamic";
import { Spin } from "antd";
import { useSearchParams } from "next/navigation";

const ClosedRfpLists = dynamic(
  () => import("../../_modules/ngo/closed-rfp/ClosedRfpLists"),
  {
    ssr: false,
    loading: () => (
      <div style={{ textAlign: "center", padding: "60px 0" }}>
        <Spin size="large" />
        <div style={{ marginTop: 12, color: "#64748b" }}>Loading closed RFPs &amp; submissions...</div>
      </div>
    ),
  }
);

function NgoClosedRfpContent() {
  const searchParams = useSearchParams();
  const formSlug = searchParams.get("form_slug") || searchParams.get("slug") || "request_for_proposal";

  return (
    <div>
      <ClosedRfpLists formSlug={formSlug} />
    </div>
  );
}

export default function NgoClosedRfpPage() {
  return (
    <Suspense
      fallback={
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <Spin size="large" />
          <div style={{ marginTop: 12, color: "#64748b" }}>Loading Closed RFPs...</div>
        </div>
      }
    >
      <NgoClosedRfpContent />
    </Suspense>
  );
}
