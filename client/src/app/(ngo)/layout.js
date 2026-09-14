'use client';

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import authUtils from "@/utils/authUtils";
import { usePermissions } from "@/context/PermissionContext";
import { privateHttpClient } from "@/services/api/httpClient";
import NgoLayout from "./_components/NgoLayout";
import NgoChangePasswordModal from "./_components/NgoChangePasswordModal";

export default function NgoRootLayout({ children }) {
  const router = useRouter();
  const { setPermissions } = usePermissions();
  
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isFirstLogin, setIsFirstLogin] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    const token = authUtils.getToken();
    const authed = !!token;
    setIsAuthenticated(authed);

    if (!authed) {
      router.replace("/");
      return;
    }

    // UX hint: show modal immediately if flag is already in sessionStorage
    if (typeof window !== "undefined" && sessionStorage.getItem("ngo_is_first_login") === "1") {
      setIsFirstLogin(true);
    }

    // VAPT enforcement: server fires this event via the axios interceptor
    // when it returns 403 FORCE_PASSWORD_CHANGE — catches any bypass attempt
    const handleForcePasswordChange = () => setIsFirstLogin(true);
    window.addEventListener("ngo:force_password_change", handleForcePasswordChange);

    privateHttpClient
      .get("/common/permissions")
      .then((res) => {
        setPermissions(res?.data?.data || {});
      })
      .catch((err) => {
        // VAPT: 403 FORCE_PASSWORD_CHANGE means the user IS authenticated
        // but must change their password first. Do NOT log them out — the
        // axios interceptor has already fired the event & set isFirstLogin=true.
        const isForceChange =
          err?.response?.status === 403 &&
          err?.response?.data?.code === "FORCE_PASSWORD_CHANGE";

        if (!isForceChange) {
          // Genuine auth failure (401, network error, etc.) → logout
          authUtils.removeToken();
          router.replace("/");
        }
        // If isForceChange: do nothing here — modal will block the UI
      })
      .finally(() => {
        setLoading(false);
      });

    return () => {
      window.removeEventListener("ngo:force_password_change", handleForcePasswordChange);
    };
  }, [setPermissions, router]);

  if (!mounted) {
    return null;
  }

  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen loader-container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="heartbeatloader">
          <div className="loader"></div>
        </div>
      </div>
    );
  }

  return (
    <NgoLayout>
      {/* Blocking first-login password change modal for NGO users */}
      {isFirstLogin && (
        <NgoChangePasswordModal onSuccess={() => setIsFirstLogin(false)} />
      )}
      {children}
    </NgoLayout>
  );
}

export const dynamic = "force-dynamic";
