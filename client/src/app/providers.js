'use client';

import '@ant-design/v5-patch-for-react-19';
import React, { useEffect } from 'react';
import { Provider } from "react-redux";
import { ToastContainer } from "react-toastify";
import { ConfigProvider } from "antd";
import { store } from "../store/store";
import { PermissionProvider } from "../context/PermissionContext";
import { AuthProvider } from "../context/AuthContext";
import { SettingsProvider, useSettings } from "../context/SettingsContext";

// Initialize all pluggable form hooks V2 (must be in a 'use client' file)
import "../modules/dynamic-form-v2/hooks/registerAllFormHooksV2";

// CSS imports (safe for SSR compilation)
import "../assets/css";
import "datatables.net-bs5/css/dataTables.bootstrap5.min.css";
import "datatables.net-fixedheader-dt/css/fixedHeader.dataTables.min.css";
import "datatables.net-fixedcolumns-dt/css/fixedColumns.dataTables.min.css";

function ThemeProviderWrapper({ children }) {
  const { settings } = useSettings();
  const primaryColor = settings?.primary_color || "#15803d";

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: primaryColor,
          borderRadius: 8,
          fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif"
        },
        components: {
          Card: {
            headerBg: "rgba(255, 255, 255, 0.4)",
            boxShadow: "0 4px 18px 0 rgba(31, 38, 135, 0.03)"
          },
          Table: {
            headerBg: "#f8fafc",
            headerColor: "#475569",
            rowHoverBg: "#f0fdf4"
          }
        }
      }}
    >
      {children}
    </ConfigProvider>
  );
}

export default function Providers({ children }) {
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Load jQuery datatables scripts dynamically on the client side
      import("datatables.net-bs5");
      import("datatables.net-buttons-bs5");
      import("datatables.net-select-bs5");
      import("datatables.net-buttons/js/dataTables.buttons");
      import("datatables.net-buttons/js/buttons.html5");
      import("datatables.net-fixedcolumns");
      import("datatables.net-fixedheader");
    }
  }, []);

  return (
    <Provider store={store}>
      <SettingsProvider>
        <ThemeProviderWrapper>
          <PermissionProvider>
            <AuthProvider>
              <ToastContainer />
              {children}
            </AuthProvider>
          </PermissionProvider>
        </ThemeProviderWrapper>
      </SettingsProvider>
    </Provider>
  );
}
