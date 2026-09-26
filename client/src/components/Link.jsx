'use client';

import React from 'react';
import NextLink from 'next/link';
import { resolveAdminPath } from '@/hooks/useNextRouter';

export const Link = React.forwardRef(({ to, children, ...props }, ref) => {
  const href = to ? resolveAdminPath(to) : '#';
  return (
    <NextLink href={href} ref={ref} {...props}>
      {children}
    </NextLink>
  );
});

Link.displayName = 'Link';

export default Link;
