'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const PivotDashboard = dynamic(() => import('@/modules/pivot-dashboard/PivotDashboard'), { ssr: false });

export default function Page() {
  return <PivotDashboard />;
}
