'use client';

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import authUtils from "@/utils/authUtils";
import { getUser } from "@/context/AuthContext";
import { usePermissions } from "@/context/PermissionContext";
import { privateHttpClient } from "@/services/api/httpClient";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import ConfiguratorLayout from "@/app/(configurator)/configurator/layout";

export default function AdminLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { setPermissions } = usePermissions();
  
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    const token = authUtils.getToken();
    const authed = !!token;
    setIsAuthenticated(authed);

    if (!authed) {
      router.replace("/");
      return;
    }

    privateHttpClient
      .get("/common/permissions")
      .then((res) => {
        setPermissions(res?.data?.data || {});
      })
      .catch(() => {
        authUtils.removeToken();
        router.replace("/");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [setPermissions, router]);

  if (!mounted) {
    return null;
  }

  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen loader-container">
        <div className="heartbeatloader">
          <div className="loader"></div>
        </div>
      </div>
    );
  }

  const user = getUser();
  const isConfigurator =
    user &&
    (user.isConfigurator === true ||
      String(user.role_name || "").toLowerCase().includes("configurator"));

  if (isConfigurator && pathname?.includes("/notification")) {
    return <ConfiguratorLayout>{children}</ConfiguratorLayout>;
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}

export const dynamic = "force-dynamic";
