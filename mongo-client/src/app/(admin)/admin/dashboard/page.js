'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const Component = dynamic(() => import('@/modules/dashboard/DashboardMain'), { ssr: false });

export default function Page() {
  return <Component />;
}