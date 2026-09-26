'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const AuditLogList = dynamic(() => import('@/modules/audit/AuditLogList'), { ssr: false });

export default function ConfiguratorAuditLogsPage() {
  return <AuditLogList />;
}
