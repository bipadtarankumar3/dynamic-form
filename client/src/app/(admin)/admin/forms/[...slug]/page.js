'use client';

import React, { Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Breadcrumb, Button, Spin } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';

// V2 List View
const DynamicGeneralListViewV2 = dynamic(
  () => import('@/modules/dynamic-form-v2/list-view/general-list-view/DynamicGeneralListViewV2'),
  { ssr: false }
);

// V2 Form View (for record detail pages)
const DynamicFormViewV2 = dynamic(
  () => import('@/modules/dynamic-form-v2/view/DynamicFormViewV2'),
  { ssr: false }
);

function slugToTitle(slug) {
  if (!slug) return '';
  return slug
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function DynamicFormsCatchAllContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const slugSegments = Array.isArray(params?.slug)
    ? params.slug
    : params?.slug
    ? [params.slug]
    : [];

  const queryFormSlug = searchParams?.get('form_slug');

  // If a custom page action was accessed via legacy /admin/forms/... URL, redirect cleanly to dedicated /admin/custom-page/
  React.useEffect(() => {
    if (queryFormSlug || slugSegments.includes('dd-form')) {
      const q = searchParams?.toString();
      const subPath = slugSegments.includes('dd-form') ? 'dd-form' : '';
      router.replace(`/admin/custom-page/${subPath}${q ? `?${q}` : ''}`);
    }
  }, [queryFormSlug, slugSegments, searchParams, router]);

  if (slugSegments.length === 0 || queryFormSlug || slugSegments.includes('dd-form')) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  // Case 1: /admin/forms/[slug] -> Single form list view
  if (slugSegments.length === 1) {
    const formSlug = slugSegments[0];
    return <DynamicGeneralListViewV2 slug={formSlug} />;
  }

  // Case 2: /admin/forms/[slug]/[id] -> Form record detail view
  if (slugSegments.length === 2) {
    const rootSlug = slugSegments[0];
    const secondSegment = slugSegments[1];
    const effectiveFormSlug = queryFormSlug || rootSlug;
    const isNumericId = !isNaN(Number(secondSegment));
    const recordId = isNumericId ? secondSegment : (queryPartnerId || queryUserId || secondSegment);
    const pageTitle = slugToTitle(effectiveFormSlug);

    const breadcrumbItems = [
      {
        title: (
          <span style={{ cursor: 'pointer', color: '#1677ff' }} onClick={() => router.push(`/admin/forms/${rootSlug}`)}>
            {slugToTitle(rootSlug)} List
          </span>
        ),
      },
      { title: `${pageTitle} Details (#${recordId})` },
    ];

    return (
      <div className="home-content">
        <div style={{ padding: '12px 16px 8px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <Button icon={<ArrowLeftOutlined />} type="text" onClick={() => router.push(`/admin/forms/${rootSlug}`)} style={{ fontWeight: 500 }}>
            Back to {slugToTitle(rootSlug)} List
          </Button>
          <Breadcrumb items={breadcrumbItems} />
        </div>
        <DynamicFormViewV2 form_slug={effectiveFormSlug} selectedData={{ id: recordId }} title={pageTitle} enableApproval={true} />
      </div>
    );
  }

  // Odd length (3, 5, 7...): Child form list view
  if (slugSegments.length >= 3 && slugSegments.length % 2 === 1) {
    const rootSlug = slugSegments[0];
    const rootTitle = slugToTitle(rootSlug);
    const targetChildSlug = slugSegments[slugSegments.length - 2];
    const targetParentId = slugSegments[slugSegments.length - 1];
    const targetChildTitle = slugToTitle(targetChildSlug);
    const immediateParentSlug = slugSegments[slugSegments.length - 4] || rootSlug;
    const immediateParentTitle = slugToTitle(immediateParentSlug);

    const breadcrumbItems = [
      { title: (<span style={{ cursor: 'pointer', color: '#1677ff' }} onClick={() => router.push(`/admin/forms/${rootSlug}`)}>{rootTitle} List</span>) },
    ];
    for (let i = 1; i < slugSegments.length - 2; i += 2) {
      const pathUpToLevel = `/admin/forms/` + slugSegments.slice(0, i + 2).join('/');
      const prevSlug = slugSegments[i - 1] || rootSlug;
      breadcrumbItems.push({
        title: (<span style={{ cursor: 'pointer', color: '#1677ff' }} onClick={() => router.push(pathUpToLevel)}>{slugToTitle(slugSegments[i])} List ({slugToTitle(prevSlug)} #{slugSegments[i + 1]})</span>),
      });
    }
    breadcrumbItems.push({ title: `${targetChildTitle} List (${immediateParentTitle} #${targetParentId})` });

    const immediateParentPath = slugSegments.length > 3
      ? `/admin/forms/` + slugSegments.slice(0, slugSegments.length - 2).join('/')
      : `/admin/forms/${rootSlug}`;

    return (
      <div className="home-content">
        <div style={{ padding: '12px 16px 8px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {slugSegments.length > 3 && (
            <Button icon={<ArrowLeftOutlined />} type="primary" ghost onClick={() => router.push(`/admin/forms/${rootSlug}`)} style={{ fontWeight: 600, borderRadius: 6 }}>
              Back to {rootTitle} List
            </Button>
          )}
          <Button icon={<ArrowLeftOutlined />} type="text" onClick={() => router.push(immediateParentPath)} style={{ fontWeight: 500 }}>
            Back to {immediateParentTitle} List
          </Button>
          <Breadcrumb items={breadcrumbItems} />
        </div>
        <DynamicGeneralListViewV2 slug={targetChildSlug} parent_id={targetParentId} parent_slug={immediateParentSlug} />
      </div>
    );
  }

  // Even length (4, 6, 8...): Nested record detail view
  if (slugSegments.length >= 4 && slugSegments.length % 2 === 0) {
    const rootSlug = slugSegments[0];
    const rootTitle = slugToTitle(rootSlug);
    const targetChildSlug = slugSegments[slugSegments.length - 2];
    const recordId = slugSegments[slugSegments.length - 1];
    const targetChildTitle = slugToTitle(targetChildSlug);
    const listPath = `/admin/forms/` + slugSegments.slice(0, slugSegments.length - 1).join('/');

    return (
      <div className="home-content">
        <div style={{ padding: '12px 16px 8px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Button icon={<ArrowLeftOutlined />} type="primary" ghost onClick={() => router.push(`/admin/forms/${rootSlug}`)} style={{ fontWeight: 600, borderRadius: 6 }}>
            Back to {rootTitle} List
          </Button>
          <Button icon={<ArrowLeftOutlined />} type="text" onClick={() => router.push(listPath)} style={{ fontWeight: 500 }}>
            Back to {targetChildTitle} List
          </Button>
        </div>
        <DynamicFormViewV2 form_slug={targetChildSlug} selectedData={{ id: recordId }} title={targetChildTitle} enableApproval={true} />
      </div>
    );
  }

  return null;
}

export default function DynamicFormsCatchAllPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: 48, textAlign: 'center' }}>
          <Spin size="large" />
        </div>
      }
    >
      <DynamicFormsCatchAllContent />
    </Suspense>
  );
}
