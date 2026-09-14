'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const RegisterNGO = dynamic(() => import('@/modules/public/RegisterNGO'), { ssr: false });

export default function NgoRegistrationPage() {
  return <RegisterNGO />;
}
