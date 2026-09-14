'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const MenuBuilder = dynamic(() => import('@/modules/configurator/menu-builder/MenuBuilder'), { ssr: false });

export default function Page() {
  return <MenuBuilder />;
}
