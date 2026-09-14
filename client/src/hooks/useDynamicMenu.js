// client/src/hooks/useDynamicMenu.js
import { useState, useEffect } from "react";
import { privateHttpClient } from "@/services/api/httpClient";
import { useAuth } from "@/context/AuthContext";
import authUtils from "@/utils/authUtils";

/**
 * Hook to load dynamic database-driven sidebar menus.
 */
export const useDynamicMenu = () => {
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    let active = true;

    const fetchMenus = async () => {
      try {
        setLoading(true);
        const response = await privateHttpClient.get("/menus/tree");
        if (active && response.data?.success) {
          setMenus(response.data.data || []);
        }
      } catch (err) {
        if (active) {
          setError(err.message || "Failed to load menus");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    const token = authUtils.getToken();
    if (token) {
      fetchMenus();
    } else {
      setMenus([]);
      setLoading(false);
    }

    return () => {
      active = false;
    };
  }, [authUtils.getToken()]);

  return { menus, loading, error };
};
