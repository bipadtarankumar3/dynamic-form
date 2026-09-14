'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const DashboardBuilderManager = dynamic(
  () => import('@/modules/dashboard-builder/DashboardBuilderManager'),
  { ssr: false }
);

export default function DashboardsPage() {
  return <DashboardBuilderManager />;
}
