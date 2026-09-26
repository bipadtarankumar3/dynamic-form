import React, { useEffect, useState } from "react";
import { getCustomDashboards } from "@/services/dashboard-builder-service";
import { getUser } from "@/context/AuthContext";
import DynamicRoleDashboard from "./DynamicRoleDashboard";
import DefaultCsrOverviewDashboard from "./default-dashboard/DefaultCsrOverviewDashboard";
import NgoPartnerDashboard from "./NgoPartnerDashboard";
import { Spin } from "antd";

const DashboardMain = () => {
  const [selectedDashboard, setSelectedDashboard] = useState(null);
  const [loadingDashboard, setLoadingDashboard] = useState(true);

  const user = getUser() || {};

  useEffect(() => {
    // If NGO user, render NGO Portal dashboard directly
    if (user?.role_slug === "ngo" || user?.role?.slug === "ngo") {
      setLoadingDashboard(false);
      return;
    }

    const fetchRoleDashboards = async () => {
      setLoadingDashboard(true);
      try {
        const res = await getCustomDashboards({
          role_id: user.role_id || user.role_slug || "all",
        });

        if (res.data?.status && Array.isArray(res.data.data) && res.data.data.length > 0) {
          const activeDashboards = res.data.data.filter((d) => d.tdb_is_active);

          if (activeDashboards.length > 0) {
            // Find default dashboard or first active configured dashboard
            const defaultDash =
              activeDashboards.find((d) => d.tdb_is_default) || activeDashboards[0];
            setSelectedDashboard(defaultDash);
          } else {
            setSelectedDashboard(null);
          }
        } else {
          // No custom dashboard found from builder -> fallback to default UI
          setSelectedDashboard(null);
        }
      } catch (err) {
        console.warn("Failed to fetch role dashboards, falling back to default:", err);
        setSelectedDashboard(null);
      } finally {
        setLoadingDashboard(false);
      }
    };

    fetchRoleDashboards();
  }, [user.role_id, user.role_slug, user?.role?.slug]);

  if (loadingDashboard) {
    return (
      <div style={{ textAlign: "center", padding: "100px 0" }}>
        <Spin size="large" />
        <div style={{ marginTop: "16px", color: "#64748b" }}>Loading dashboard...</div>
      </div>
    );
  }

  // NGO Partner custom onboarding & due diligence portal
  if (user?.role_slug === "ngo" || user?.role?.slug === "ngo") {
    return <NgoPartnerDashboard user={user} />;
  }

  // If custom dashboard is configured from dashboard-builder for this role:
  if (selectedDashboard) {
    return (
      <DynamicRoleDashboard
        dashboard={selectedDashboard}
        userRoleName={user.role_name}
        userRoleId={user.role_id}
        user={user}
      />
    );
  }

  // Fallback: When no custom dashboard found, display the default CSR overview UI
  return <DefaultCsrOverviewDashboard />;
};

export default DashboardMain;
