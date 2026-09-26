'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';

const PublicDynamicFormViewV2 = dynamic(
  () => import('@/modules/dynamic-form-v2/public/PublicDynamicFormViewV2'),
  { ssr: false }
);

export default function DynamicRootSlugPage() {
  const params = useParams();
  const slug = params?.slug;

  if (!slug) return null;

  return <PublicDynamicFormViewV2 form_slug={slug} />;
}
