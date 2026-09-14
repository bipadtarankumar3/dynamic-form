'use client';

import React, { Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Breadcrumb, Button, Spin } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';

// V2 List View (for listing mode)
const DynamicGeneralListViewV2 = dynamic(
  () => import('@/modules/dynamic-form-v2/list-view/general-list-view/DynamicGeneralListViewV2'),
  { ssr: false }
);

// V2 Form View (for details mode)
const DynamicFormViewV2 = dynamic(
  () => import('@/modules/dynamic-form-v2/view/DynamicFormViewV2'),
  { ssr: false }
);

// Due Diligence Record View (Specialized DD details & approval tracker)
const DdRecordView = dynamic(
  () => import('@/app/(ngo)/ngo/dd/_components/DdRecordView'),
  { ssr: false }
);

function slugToTitle(slug) {
  if (!slug) return '';
  return slug
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function CustomPageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const slugSegments = Array.isArray(params?.slug)
    ? params.slug
    : params?.slug
    ? [params.slug]
    : [];

  const queryFormSlug = searchParams?.get('form_slug');
  const queryMode = searchParams?.get('mode') || 'details';
  const queryUserId = searchParams?.get('user_id');
  const queryPartnerId = searchParams?.get('partner_id');
  const parentSlug = searchParams?.get('parent_slug') || 'implementation_partner';
  const isAlwaysLastRow = searchParams?.get('always_last_row') === '1' || searchParams?.get('always_last_row') === 'true';
  const enableApproval = searchParams?.get('enable_approval') === '1' || searchParams?.get('enable_approval') === 'true';

  const effectiveFormSlug = queryFormSlug || (slugSegments.includes('dd-form') ? 'due_diligence' : slugSegments[0] || 'due_diligence');
  const parentTitle = slugToTitle(parentSlug);
  const pageTitle = slugToTitle(effectiveFormSlug);

  const isDueDiligence = effectiveFormSlug === 'due_diligence';

  const breadcrumbItems = [
    {
      title: (
        <span
          style={{ cursor: 'pointer', color: '#1677ff' }}
          onClick={() => router.push(`/admin/forms/${parentSlug}`)}
        >
          {parentTitle} List
        </span>
      ),
    },
    {
      title: `${pageTitle} ${queryMode === 'listing' ? 'List' : 'Details'} ${
        queryPartnerId ? `(Partner #${queryPartnerId})` : queryUserId ? `(User #${queryUserId})` : ''
      }`,
    },
  ];

  return (
    <div className="home-content">
      {/* Top Header & Navigation Bar */}
      <div
        style={{
          padding: '14px 20px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          background: '#ffffff',
          borderBottom: '1px solid #f1f5f9',
          marginBottom: 16,
        }}
      >
        <Button
          icon={<ArrowLeftOutlined />}
          type="text"
          onClick={() => router.push(`/admin/forms/${parentSlug}`)}
          style={{ fontWeight: 600, color: '#334155' }}
        >
          Back to {parentTitle} List
        </Button>
        <Breadcrumb items={breadcrumbItems} />
      </div>

      <div style={{ padding: '0 20px 24px' }}>
        {/* 1. Due Diligence Dedicated View */}
        {isDueDiligence ? (
          <DdRecordView />
        ) : queryMode === 'listing' ? (
          /* 2. Generic Listing Mode */
          <DynamicGeneralListViewV2
            slug={effectiveFormSlug}
            parent_id={queryPartnerId || queryUserId}
            parent_slug={parentSlug}
          />
        ) : (
          /* 3. Generic Details Mode (with always_last_row and approval engine) */
          <DynamicFormViewV2
            form_slug={effectiveFormSlug}
            selectedData={{
              partner_id: queryPartnerId,
              user_id: queryUserId,
              always_last_row: isAlwaysLastRow,
            }}
            title={pageTitle}
            enableApproval={enableApproval}
          />
        )}
      </div>
    </div>
  );
}

export default function CustomPageCatchAll() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: 48, textAlign: 'center' }}>
          <Spin size="large" />
        </div>
      }
    >
      <CustomPageContent />
    </Suspense>
  );
}
