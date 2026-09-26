'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Spin } from 'antd';

const EmployeeVolunteeringPortal = dynamic(
  () => import('@/modules/volunteering/portal/EmployeeVolunteeringPortal'),
  {
    ssr: false,
    loading: () => (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    ),
  }
);

export default function EmployeePortalPage() {
  return (
    <div className="home-content" style={{ padding: '20px 24px' }}>
      <EmployeeVolunteeringPortal />
    </div>
  );
}
