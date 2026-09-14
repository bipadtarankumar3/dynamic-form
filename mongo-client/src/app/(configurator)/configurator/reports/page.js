'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

// Lazy-load both components (they are large and client-only)
const QueriesList = dynamic(
  () => import('@/modules/dynamic-report/QueriesList'),
  { ssr: false, loading: () => <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading queries…</div> }
);

const QueryBuilder = dynamic(
  () => import('@/modules/dynamic-report/QueryBuilder'),
  { ssr: false, loading: () => <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading builder…</div> }
);

/**
 * Report Builder page
 * ───────────────────
 * Renders QueriesList by default.
 * When the URL has ?view=builder (optionally ?id=<queryId>),
 * it renders QueryBuilder instead — matching the navigation
 * calls already inside QueriesList (navigate('/dynamic-report/builder')).
 *
 * Because this page lives at /configurator/reports, we intercept
 * the ?view=builder search-param to switch views without leaving
 * the configurator layout.
 */
export default function Page() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const view = searchParams.get('view');      // 'builder' | null
  const queryId = searchParams.get('id');     // existing query id (edit mode)

  const showBuilder = view === 'builder';

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {showBuilder
        ? <QueryBuilder queryId={queryId} />
        : <QueriesList />
      }
    </div>
  );
}
