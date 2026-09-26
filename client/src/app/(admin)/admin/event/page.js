'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Spin } from 'antd';

const VolunteeringEventListView = dynamic(
  () => import('@/modules/volunteering/VolunteeringEventListView'),
  {
    ssr: false,
    loading: () => (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    ),
  }
);

export default function EventMainPage() {
  return (
    <div className="home-content" style={{ padding: '20px 24px' }}>
      <VolunteeringEventListView />
    </div>
  );
}
