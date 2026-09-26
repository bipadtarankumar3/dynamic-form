'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const SiteSettingsView = dynamic(() => import('@/modules/configurator/settings'), { ssr: false });

export default function Page() {
  return <SiteSettingsView />;
}
