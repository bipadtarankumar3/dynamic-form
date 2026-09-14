'use client';

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import authUtils from "@/utils/authUtils";
import { getUser } from "@/context/AuthContext";

export default function ConfiguratorRouteLayout({ children }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    setMounted(true);
    const token = authUtils.getToken();

    if (!token) {
      router.replace("/");
      return;
    }

    try {
      const user = getUser();
      if (user && user.isConfigurator === true) {
        setIsAuthorized(true);
      } else {
        router.replace("/admin/unauthorized");
      }
    } catch (err) {
      authUtils.removeToken();
      router.replace("/");
    } finally {
      setLoading(false);
    }
  }, [router]);

  if (!mounted) return null;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen loader-container">
        <div className="heartbeatloader">
          <div className="loader"></div>
        </div>
      </div>
    );
  }

  if (!isAuthorized) return null;

  return <>{children}</>;
}

export const dynamic = "force-dynamic";
