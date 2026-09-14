import { jwtDecode } from "jwt-decode";
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { publicHttpClient } from "@/services/api/httpClient";
import { getUserProfileAPI } from "@/services/user-service";
import authUtils from "@/utils/authUtils";

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const refreshUserProfile = useCallback(async () => {
    const token = authUtils.getToken();
    if (!token) {
      setUserProfile(null);
      return;
    }
    try {
      setProfileLoading(true);
      const res = await getUserProfileAPI();
      if (res.data?.success && res.data?.data) {
        setUserProfile(res.data.data);
      }
    } catch (err) {
      // ignore network/auth error
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = authUtils.getToken();
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUser(decoded);
      } catch (e) {}
      refreshUserProfile();
    }
  }, [refreshUserProfile]);

  const login = async (credentials) => {    
    const response = await publicHttpClient.post("/auth/login", credentials);
    const { token, user } = response.data;
    authUtils.saveToken(token);
    setUser(user);
    await refreshUserProfile();
  };

  const logout = () => {
    authUtils.removeToken();
    setUser(null);
    setUserProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        setUserProfile,
        refreshUserProfile,
        profileLoading,
        login,
        logout,
        getUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const getUser = () => {
  const accessToken = authUtils.getToken();
  if (accessToken) {
    return jwtDecode(accessToken);
  } else {
    return {};
  }
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

