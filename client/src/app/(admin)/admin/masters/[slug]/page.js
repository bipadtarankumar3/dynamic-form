'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { App } from 'antd';

const DynamicGeneralListViewV2 = dynamic(
  () => import('@/modules/dynamic-form-v2/list-view/general-list-view/DynamicGeneralListViewV2'),
  { ssr: false }
);

const FinancialYearMasterView = dynamic(
  () => import('@/modules/masters/financial-year/FinancialYearMasterView'),
  { ssr: false }
);

export default function DynamicMasterPage() {
  const params = useParams();
  const slug = params?.slug;

  if (!slug) return null;

  return <DynamicGeneralListViewV2 slug={slug} />;
}


