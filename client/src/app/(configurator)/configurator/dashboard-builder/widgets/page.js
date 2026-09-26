'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const WidgetManager = dynamic(
  () => import('@/modules/dashboard-builder/WidgetManager'),
  { ssr: false }
);

export default function DashboardWidgetsPage() {
  return <WidgetManager />;
}
