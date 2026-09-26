'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const RbacBuilder = dynamic(() => import('@/modules/configurator/RbacBuilder'), { ssr: false });

export default function Page() {
  return <RbacBuilder />;
}
