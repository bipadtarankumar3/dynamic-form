'use client';

import { useRouter, usePathname, useSearchParams as useNextSearchParams, useParams as useNextParams } from 'next/navigation';

const PUBLIC_ROUTES = ['/', '/unauthorized'];

export function resolveAdminPath(to) {
  if (typeof to !== 'string') return to;
  if (!to.startsWith('/')) return to;
  
  const cleanTo = to.split('?')[0].split('#')[0].replace(/\/$/, '') || '/';
  
  if (
    to.startsWith('/admin') ||
    to.startsWith('/configurator') ||
    to.startsWith('/ngo') ||
    to.startsWith('/forms') ||
    to.startsWith('/ngo-registration') ||
    to.startsWith('/public')
  ) {
    return to;
  }
  
  if (PUBLIC_ROUTES.includes(cleanTo)) {
    return to;
  }
  
  return `/admin${to}`;
}

export function useNavigate() {
  const router = useRouter();
  return (to, options) => {
    const resolvedTo = resolveAdminPath(to);
    if (options?.replace) {
      router.replace(resolvedTo);
    } else {
      router.push(resolvedTo);
    }
  };
}

export function useLocation() {
  const pathname = usePathname();
  const searchParams = useNextSearchParams();
  return {
    pathname: pathname || '',
    search: searchParams ? `?${searchParams.toString()}` : '',
    state: null,
  };
}

export function useParams() {
  return useNextParams() || {};
}

export function useSearchParams() {
  const searchParams = useNextSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const setSearchParams = (newParams) => {
    const query = new URLSearchParams(newParams).toString();
    router.push(`${pathname}?${query}`);
  };

  return [searchParams, setSearchParams];
}
