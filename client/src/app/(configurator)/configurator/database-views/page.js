'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const DatabaseViewsListView = dynamic(
  () => import('@/modules/configurator/database-views/DatabaseViewsListView'),
  { ssr: false }
);

export default function DatabaseViewsPage() {
  return <DatabaseViewsListView />;
}
