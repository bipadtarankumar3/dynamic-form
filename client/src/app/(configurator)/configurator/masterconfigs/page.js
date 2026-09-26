'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const MasterConfigsView = dynamic(() => import('@/modules/configurator/MasterConfigsView'), { ssr: false });

export default function Page() {
  return <MasterConfigsView />;
}
