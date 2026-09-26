'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Breadcrumb, Button } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';

import { useSearchParams } from 'next/navigation';

const DynamicGeneralListViewV2 = dynamic(
  () => import('@/modules/dynamic-form-v2/list-view/general-list-view/DynamicGeneralListViewV2'),
  { ssr: false }
);

const PublicDynamicFormViewV2 = dynamic(
  () => import('@/modules/dynamic-form-v2/public/PublicDynamicFormViewV2'),
  { ssr: false }
);

const DynamicFormViewV2 = dynamic(
  () => import('@/modules/dynamic-form-v2/view/DynamicFormViewV2'),
  { ssr: false }
);

const OpenRfpLists = dynamic(
  () => import('@/app/(ngo)/_modules/ngo/open-rfp/OpenRfpLists'),
  { ssr: false }
);

function slugToTitle(slug) {
  if (!slug) return '';
  return slug
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function PublicDynamicFormsCatchAllPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const slugSegments = Array.isArray(params?.slug)
    ? params.slug
    : params?.slug
    ? [params.slug]
    : [];

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

  if (slugSegments.length === 0) return null;

  if (isRfpAssessmentRedirect) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <div style={{ color: '#64748b', fontWeight: 600 }}>Loading RFP Assessment...</div>
      </div>
    );
  }

  if (isVolunteeringEventDetailRedirect || isVolunteeringEventListRedirect) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <div style={{ color: '#64748b', fontWeight: 600 }}>Loading Volunteering Event...</div>
      </div>
    );
  }

  if (slugSegments.length === 1) {
    const formSlug = slugSegments[0];
    const isFormOnly = searchParams.get('mode') === 'form_only' || searchParams.get('view') === 'form';
    const isCustomPageMode = searchParams.get('mode') === 'custom_page' || searchParams.get('mode') === 'custom_rfp' || formSlug === 'floated_rfp' || formSlug === 'rfp_opportunities';

    if (isFormOnly) {
      return <PublicDynamicFormViewV2 form_slug={formSlug} />;
    }

    const userObj = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
    const isNgoRole = (userObj?.role_slug || userObj?.role || '').toLowerCase() === 'ngo';

    if (isCustomPageMode || (isNgoRole && formSlug === 'rfp_proposal_submission')) {
      return <OpenRfpLists />;
    }

    return <DynamicGeneralListViewV2 slug={formSlug} />;
  }

  if (slugSegments.length === 2) {
    const formSlug  = slugSegments[0];
    const recordId  = slugSegments[1];
    const pageTitle = slugToTitle(formSlug);
    const isCustomPageMode = searchParams.get('mode') === 'custom_page' || searchParams.get('mode') === 'custom_rfp' || recordId === 'floated-rfps' || recordId === 'floated_rfp';

    if (isCustomPageMode) {
      return <OpenRfpLists />;
    }

    const breadcrumbItems = [
      {
        title: (
          <span style={{ cursor: 'pointer', color: '#1677ff' }} onClick={() => router.push(`/admin/forms/${formSlug}`)}>
            {pageTitle} List
          </span>
        ),
      },
      {
        title: `${pageTitle} Details (#${recordId})`,
      },
    ];

    return (
      <div className="home-content" style={{ padding: '20px 24px' }}>
        <div style={{ padding: '0 0 16px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <Button
            icon={<ArrowLeftOutlined style={{ fontSize: 13 }} />}
            onClick={() => router.push(`/admin/forms/${formSlug}`)}
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
            Back to {pageTitle} List
          </Button>
          <Breadcrumb items={breadcrumbItems} style={{ fontSize: 13, fontWeight: 500 }} />
        </div>

        <DynamicFormViewV2
          form_slug={formSlug}
          selectedData={{ id: recordId }}
          title={pageTitle}
        />
      </div>
    );
  }

  // Multi-level nested child forms handler (depth >= 3)
  // Odd length (3, 5, 7...): Child form list view
  if (slugSegments.length >= 3 && slugSegments.length % 2 === 1) {
    const rootSlug = slugSegments[0];
    const rootTitle = slugToTitle(rootSlug);

    const targetChildSlug = slugSegments[slugSegments.length - 2];
    const targetParentId = slugSegments[slugSegments.length - 1];
    const targetChildTitle = slugToTitle(targetChildSlug);

    const immediateParentSlug = slugSegments[slugSegments.length - 4] || rootSlug;
    const immediateParentId = slugSegments[slugSegments.length - 3] || null;
    const immediateParentTitle = slugToTitle(immediateParentSlug);

    // Build breadcrumbs dynamically for all intermediate levels
    const breadcrumbItems = [
      {
        title: (
          <span style={{ cursor: 'pointer', color: '#1677ff' }} onClick={() => router.push(`/admin/forms/${rootSlug}`)}>
            {rootTitle} List
          </span>
        ),
      },
    ];

    for (let i = 1; i < slugSegments.length - 2; i += 2) {
      const childSlugAtLevel = slugSegments[i];
      const parentIdAtLevel = slugSegments[i + 1];
      const levelTitle = slugToTitle(childSlugAtLevel);
      const prevSlug = slugSegments[i - 1] || rootSlug;
      const prevTitle = slugToTitle(prevSlug);
      const pathUpToLevel = `/admin/forms/` + slugSegments.slice(0, i + 2).join('/');

      breadcrumbItems.push({
        title: (
          <span style={{ cursor: 'pointer', color: '#1677ff' }} onClick={() => router.push(pathUpToLevel)}>
            {levelTitle} List ({prevTitle} #{parentIdAtLevel})
          </span>
        ),
      });
    }

    breadcrumbItems.push({
      title: `${targetChildTitle} List (${immediateParentTitle} #${targetParentId})`,
    });

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

        <DynamicGeneralListViewV2
          slug={targetChildSlug}
          parent_id={targetParentId}
          parent_slug={immediateParentSlug}
        />
      </div>
    );
  }

  // Even length (4, 6, 8...): Nested record details view
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

        <DynamicFormViewV2
          form_slug={targetChildSlug}
          selectedData={{ id: recordId }}
          title={targetChildTitle}
        />
      </div>
    );
  }

  return null;
}
