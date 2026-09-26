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
  const queryPartnerId = searchParams?.get('partner_id');
  const queryUserId = searchParams?.get('user_id');

  // If a custom page action was accessed via legacy /admin/forms/... URL, redirect cleanly to dedicated /admin/custom-page/
  React.useEffect(() => {
    if (queryFormSlug || slugSegments.includes('dd-form')) {
      const q = searchParams?.toString();
      const subPath = slugSegments.includes('dd-form') ? 'dd-form' : '';
      router.replace(`/admin/custom-page/${subPath}${q ? `?${q}` : ''}`);
    }
  }, [queryFormSlug, slugSegments, searchParams, router]);

  const isRfpAssessmentRedirect =
    slugSegments.length === 2 &&
    slugSegments[0] === 'request_for_proposal' &&
    !isNaN(Number(slugSegments[1]));

  const isVolunteeringEventDetailRedirect =
    slugSegments.length === 2 &&
    (slugSegments[0] === 'volunteering_event' || slugSegments[0] === 'volunteering-event' || slugSegments[0] === 'volunteering_events') &&
    !isNaN(Number(slugSegments[1]));

  const isVolunteeringEventListRedirect =
    slugSegments.length === 1 &&
    (slugSegments[0] === 'volunteering_event' || slugSegments[0] === 'volunteering-event' || slugSegments[0] === 'volunteering_events');

  React.useEffect(() => {
    if (isRfpAssessmentRedirect) {
      router.replace(`/admin/rfp-assessment/?rfp_id=${slugSegments[1]}`);
    } else if (isVolunteeringEventDetailRedirect) {
      router.replace(`/admin/event/volunteering-event/${slugSegments[1]}`);
    } else if (isVolunteeringEventListRedirect) {
      router.replace(`/admin/event/volunteering-event/`);
    }
  }, [isRfpAssessmentRedirect, isVolunteeringEventDetailRedirect, isVolunteeringEventListRedirect, slugSegments, router]);

  if (isRfpAssessmentRedirect) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <Spin size="large" />
        <div style={{ marginTop: 12, color: '#64748b', fontWeight: 600 }}>Loading RFP Assessment...</div>
      </div>
    );
  }

  if (isVolunteeringEventDetailRedirect || isVolunteeringEventListRedirect) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <Spin size="large" />
        <div style={{ marginTop: 12, color: '#64748b', fontWeight: 600 }}>Loading Volunteering Event...</div>
      </div>
    );
  }

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
    return (
      <div className="home-content" style={{ padding: '20px 24px' }}>
        <DynamicGeneralListViewV2 slug={formSlug} />
      </div>
    );
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
      <div className="home-content" style={{ padding: '20px 24px' }}>
        <div style={{ padding: '0 0 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <Button
            icon={<ArrowLeftOutlined style={{ fontSize: 13 }} />}
            onClick={() => router.push(`/admin/forms/${rootSlug}`)}
            style={{
              fontWeight: 700,
              borderRadius: 10,
              borderColor: '#cbd5e1',
              background: '#ffffff',
              color: '#0f172a',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              height: 36,
              padding: '0 14px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            Back to {slugToTitle(rootSlug)} List
          </Button>
          <Breadcrumb items={breadcrumbItems} style={{ fontSize: 13, fontWeight: 500 }} />
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
      <div className="home-content" style={{ padding: '20px 24px' }}>
        <div style={{ padding: '0 0 16px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <Button
            icon={<ArrowLeftOutlined style={{ fontSize: 13 }} />}
            onClick={() => router.push(immediateParentPath)}
            style={{
              fontWeight: 700,
              borderRadius: 10,
              borderColor: '#cbd5e1',
              background: '#ffffff',
              color: '#0f172a',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              height: 36,
              padding: '0 14px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            Back to {immediateParentTitle} List
          </Button>
          {slugSegments.length > 3 && (
            <Button
              icon={<ArrowLeftOutlined style={{ fontSize: 13 }} />}
              type="text"
              onClick={() => router.push(`/admin/forms/${rootSlug}`)}
              style={{ fontWeight: 600, color: '#475569', height: 36 }}
            >
              Back to {rootTitle} List
            </Button>
          )}
          <Breadcrumb items={breadcrumbItems} style={{ fontSize: 13, fontWeight: 500 }} />
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
      <div className="home-content" style={{ padding: '20px 24px' }}>
        <div style={{ padding: '0 0 16px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <Button
            icon={<ArrowLeftOutlined style={{ fontSize: 13 }} />}
            onClick={() => router.push(listPath)}
            style={{
              fontWeight: 700,
              borderRadius: 10,
              borderColor: '#cbd5e1',
              background: '#ffffff',
              color: '#0f172a',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              height: 36,
              padding: '0 14px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            Back to {targetChildTitle} List
          </Button>
          <Button
            icon={<ArrowLeftOutlined style={{ fontSize: 13 }} />}
            type="text"
            onClick={() => router.push(`/admin/forms/${rootSlug}`)}
            style={{ fontWeight: 600, color: '#475569', height: 36 }}
          >
            Back to {rootTitle} List
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
