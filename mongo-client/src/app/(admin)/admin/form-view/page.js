'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const Component = dynamic(() => import('@/dynamic-form/view/DynamicFormView'), { ssr: false });

export default function Page() {
  return <Component />;
}