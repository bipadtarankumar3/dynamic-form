'use client';

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { Spin } from 'antd';

const FormListViewV2 = dynamic(() => import('@/modules/form-builder-v2/FormListViewV2'), { ssr: false });

export default function Page() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}><Spin size="large" /></div>}>
      <FormListViewV2 />
    </Suspense>
  );
}
