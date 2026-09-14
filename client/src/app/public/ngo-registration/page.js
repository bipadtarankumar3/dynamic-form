'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PublicNgoRegistrationPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/ngo-registration');
  }, [router]);
  return null;
}
