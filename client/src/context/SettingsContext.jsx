import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { publicHttpClient } from "@/services/api/httpClient";

const SettingsContext = createContext(undefined);

const ServerToast = ({ onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <>
      <style>{`
        @keyframes _st_slideIn {
          from { opacity: 0; transform: translateY(20px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
        @keyframes _st_shrink {
          from { width: 100%; }
          to   { width: 0%; }
        }
        ._st_wrap {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 99999;
          min-width: 300px;
          max-width: 380px;
          background: #1e1e2e;
          border: 1px solid rgba(255,90,90,0.35);
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.45);
          padding: 14px 16px 10px;
          animation: _st_slideIn 0.3s ease forwards;
          font-family: system-ui, -apple-system, sans-serif;
          overflow: hidden;
        }
        ._st_header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 6px;
        }
        ._st_icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: rgba(255,90,90,0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        ._st_title {
          font-size: 13px;
          font-weight: 600;
          color: #ff6b6b;
          flex: 1;
        }
        ._st_close {
          background: none;
          border: none;
          cursor: pointer;
          color: #888;
          font-size: 16px;
          line-height: 1;
          padding: 0 2px;
          transition: color 0.2s;
        }
        ._st_close:hover { color: #ccc; }
        ._st_msg {
          font-size: 12px;
          color: #a0a0b0;
          line-height: 1.5;
          padding-left: 42px;
          margin-bottom: 8px;
        }
        ._st_bar {
          height: 3px;
          border-radius: 2px;
          background: #ff6b6b;
          animation: _st_shrink 5s linear forwards;
        }
      `}</style>
      <div className="_st_wrap" role="alert" aria-live="polite">
        <div className="_st_header">
          <div className="_st_icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff6b6b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 6s4-2 11-2 11 2 11 2"/>
              <path d="M5 10s2.5-1 7-1 7 1 7 1"/>
              <line x1="2" y1="2" x2="22" y2="22"/>
              <path d="M10.7 15.3A2 2 0 0 0 12 16c1.1 0 2-.9 2-2"/>
            </svg>
          </div>
          <span className="_st_title">Server Unreachable</span>
          <button className="_st_close" onClick={onClose} aria-label="Dismiss">✕</button>
        </div>
        <p className="_st_msg">Could not connect to the server. Some features may be limited until the connection is restored.</p>
        <div className="_st_bar" />
      </div>
    </>
  );
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const toastShownRef = useRef(false);

  const fetchSettings = async (overrideSettings) => {
    if (overrideSettings && typeof overrideSettings === "object") {
      setSettings(overrideSettings);
      applyTheme(overrideSettings);
      return;
    }
    try {
      const res = await publicHttpClient.get("/settings", {
        params: { _t: Date.now() },
      });
      if (res.data?.success) {
        setSettings(res.data.settings || {});
        applyTheme(res.data.settings || {});
      }
    } catch (err) {
      if (!toastShownRef.current) {
        toastShownRef.current = true;
        setShowToast(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const applyTheme = (settingsObj) => {
    if (typeof window === "undefined") return;

    // Set page title dynamically
    const title = settingsObj.site_title || settingsObj.site_name || "TechCSR-CSR Product";
    document.title = title;

    // Set favicon dynamically
    if (settingsObj.favicon) {
      let link = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.getElementsByTagName("head")[0].appendChild(link);
      }
      link.href = getSettingUrl(settingsObj.favicon);
    }

    // Set CSS variables for colors on root element
    const root = document.documentElement;
    const primary = settingsObj.primary_color || "#15803d";
    const secondary = settingsObj.secondary_color || "#659327";

    const adjustColorBrightness = (hex, percent) => {
      let col = hex.replace(/^\s*#|\s*$/g, '');
      if (col.length === 3) {
        col = col.replace(/(.)/g, '$1$1');
      }
      let r = parseInt(col.substr(0, 2), 16);
      let g = parseInt(col.substr(2, 2), 16);
      let b = parseInt(col.substr(4, 2), 16);

      r = Math.min(255, Math.max(0, r + (r * percent) / 100));
      g = Math.min(255, Math.max(0, g + (g * percent) / 100));
      b = Math.min(255, Math.max(0, b + (b * percent) / 100));

      const rHex = Math.round(r).toString(16).padStart(2, '0');
      const gHex = Math.round(g).toString(16).padStart(2, '0');
      const bHex = Math.round(b).toString(16).padStart(2, '0');

      return `#${rHex}${gHex}${bHex}`;
    };

    const hexToRgb = (hex) => {
      let col = (hex || "#15803d").replace(/^\s*#|\s*$/g, '');
      if (col.length === 3) {
        col = col.replace(/(.)/g, '$1$1');
      }
      let r = parseInt(col.substr(0, 2), 16) || 0;
      let g = parseInt(col.substr(2, 2), 16) || 0;
      let b = parseInt(col.substr(4, 2), 16) || 0;
      return `${r}, ${g}, ${b}`;
    };

    root.style.setProperty("--primary-color", primary);
    root.style.setProperty("--secondary-color", secondary);
    root.style.setProperty("--primary-color-rgb", hexToRgb(primary));
    root.style.setProperty("--secondary-color-rgb", hexToRgb(secondary));
    root.style.setProperty("--primary-color-dark", adjustColorBrightness(primary, -50));
    root.style.setProperty("--primary-color-light", adjustColorBrightness(primary, 40));
    root.style.setProperty("--secondary-color-dark", adjustColorBrightness(secondary, -40));
    root.style.setProperty("--secondary-color-light", adjustColorBrightness(secondary, 40));

    root.style.setProperty("--primary-gradient", `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`);
    root.style.setProperty("--primary-gradient-hover", `linear-gradient(135deg, ${adjustColorBrightness(primary, -15)} 0%, ${adjustColorBrightness(secondary, -15)} 100%)`);

    const primaryHover = primary.startsWith("#") && primary.length === 7 
      ? `${primary}dd` 
      : primary;
    root.style.setProperty("--primary-hover-color", primaryHover);
  };

  const getSettingUrl = (path) => {
    if (!path) return "";
    if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("data:") || path.startsWith("blob:")) {
      return path;
    }
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
    if (path.startsWith("/assets/")) {
      return `${baseUrl}${path}`;
    }
    const publicApiUrl = process.env.NEXT_PUBLIC_PUBLIC_API_URL || "";
    // Strip trailing '/api/v1' to get base domain path
    const baseDomain = publicApiUrl.replace(/\/api\/v1\/?$/, "");
    return `${baseDomain}${path}`;
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loading, getSettingUrl, refreshSettings: fetchSettings }}>
      {children}
      {showToast && <ServerToast onClose={() => setShowToast(false)} />}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
};
