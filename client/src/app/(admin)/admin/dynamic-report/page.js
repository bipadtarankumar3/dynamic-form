'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const Component = dynamic(() => import('@/modules/dynamic-report/QueriesList'), { ssr: false });

export default function Page() {
  return <Component />;
}