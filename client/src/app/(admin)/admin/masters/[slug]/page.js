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

const EventTypeMasterView = dynamic(
  () => import('@/modules/masters/event-type/EventTypeMasterView'),
  { ssr: false }
);

export default function DynamicMasterPage() {
  const params = useParams();
  const slug = params?.slug;

  if (!slug) return null;

  if (slug === 'financial_year' || slug === 'financial-year') {
    return <FinancialYearMasterView slug={slug} />;
  }

  if (slug === 'event_type' || slug === 'event-type') {
    return <DynamicGeneralListViewV2 slug="event_type" />;
  }

  return <DynamicGeneralListViewV2 slug={slug} />;
}


