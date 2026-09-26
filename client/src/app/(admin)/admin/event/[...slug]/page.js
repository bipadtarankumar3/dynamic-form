'use client';

import React, { Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Spin } from 'antd';

// Dedicated dynamic List UI for Volunteering Events
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

// Dedicated modern Full-Page Detail UI for Volunteering Event
const VolunteeringEventDetailPage = dynamic(
  () => import('@/modules/volunteering/VolunteeringEventDetailPage'),
  {
    ssr: false,
    loading: () => (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    ),
  }
);

// Dedicated modern Detail UI for Impact Stories
const VolunteeringStoryDetailPage = dynamic(
  () => import('@/modules/volunteering/VolunteeringStoryDetailPage'),
  {
    ssr: false,
    loading: () => (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    ),
  }
);

// Dedicated modern Static Story List & Blog Editor
const VolunteeringStoryListView = dynamic(
  () => import('@/modules/volunteering/VolunteeringStoryListView'),
  {
    ssr: false,
    loading: () => (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    ),
  }
);

const VolunteeringStoryEditor = dynamic(
  () => import('@/modules/volunteering/components/VolunteeringStoryEditor'),
  {
    ssr: false,
    loading: () => (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    ),
  }
);

// Dynamic FormBuilder Views for other FormBuilder entities
const DynamicGeneralListViewV2 = dynamic(
  () => import('@/modules/dynamic-form-v2/list-view/general-list-view/DynamicGeneralListViewV2'),
  { ssr: false }
);

const DynamicFormViewV2 = dynamic(
  () => import('@/modules/dynamic-form-v2/view/DynamicFormViewV2'),
  { ssr: false }
);

const DynamicAddEditFormV2 = dynamic(
  () => import('@/modules/dynamic-form-v2/add-edit/DynamicAddEditFormV2'),
  { ssr: false }
);

function EventCatchAllContent() {
  const params = useParams();
  const router = useRouter();

  const slugSegments = Array.isArray(params?.slug)
    ? params.slug
    : params?.slug
    ? [params.slug]
    : [];

  const firstSlug = (slugSegments[0] || '').toLowerCase().replace(/-/g, '_');

  // Case A: Dedicated Impact Stories (/admin/event/volunteering-impact-story)
  if (firstSlug === 'volunteering_impact_story' || firstSlug === 'impact_stories' || firstSlug === 'stories') {
    if (slugSegments.length <= 1) {
      return (
        <div className="home-content" style={{ padding: '20px 24px' }}>
          <VolunteeringStoryListView />
        </div>
      );
    }
    if (slugSegments.length === 2) {
      const secondParam = slugSegments[1];
      if (secondParam === 'add' || secondParam === 'write' || secondParam === 'create') {
        return (
          <div className="home-content" style={{ padding: '20px 24px' }}>
            <VolunteeringStoryEditor onSuccess={() => router.push('/admin/event/volunteering-impact-story')} />
          </div>
        );
      }
      return (
        <div className="home-content" style={{ padding: '20px 24px' }}>
          <VolunteeringStoryDetailPage storyId={secondParam} />
        </div>
      );
    }
  }

  // Case B: Dedicated full-page story editor for event: /admin/event/volunteering-event/[id]/story
  if (slugSegments.length === 3 && slugSegments[2] === 'story') {
    const eventId = slugSegments[1];
    return (
      <div className="home-content" style={{ padding: '20px 24px' }}>
        <VolunteeringStoryEditor
          eventId={eventId}
          onSuccess={() => router.push('/admin/event/volunteering-impact-story')}
          onCancel={() => router.back()}
        />
      </div>
    );
  }

  // Case C: /admin/event/[slug] -> List View (e.g. /admin/event/volunteering-event)
  if (slugSegments.length <= 1) {
    return (
      <div className="home-content" style={{ padding: '20px 24px' }}>
        <VolunteeringEventListView />
      </div>
    );
  }

  // Case D: /admin/event/[slug]/[id] -> Modern Full-Page Event Details View
  if (slugSegments.length === 2) {
    const recordId = slugSegments[1];
    return (
      <div className="home-content" style={{ padding: '20px 24px' }}>
        <VolunteeringEventDetailPage eventId={recordId} />
      </div>
    );
  }

  return (
    <div className="home-content" style={{ padding: '20px 24px' }}>
      <VolunteeringEventListView />
    </div>
  );
}

export default function EventCatchAllPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: 48, textAlign: 'center' }}>
          <Spin size="large" />
        </div>
      }
    >
      <EventCatchAllContent />
    </Suspense>
  );
}
