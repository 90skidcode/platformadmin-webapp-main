'use client';

import { useState } from 'react';
import { getCookie, setCookie, deleteCookie } from '@/lib/utils/cookies';
import { appConfig } from '@/config';

export interface User {
  id: string;
  phone: string;
  name?: string;
  email?: string;
}

export interface UseAuthReturn {
  user: User | null;
  loading: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

// Load cookies before rendering (React 19 safe)
function loadInitialAuth() {
  try {
    const token = getCookie(appConfig.cookies.names.authToken);
    const userStr = getCookie(appConfig.cookies.names.userData);

    if (token && userStr) {
      return {
        user: JSON.parse(decodeURIComponent(userStr)),
        loading: false
      };
    }
  } catch {}

  return { user: null, loading: false };
}

export function useAuth(): UseAuthReturn {
  const [{ user, loading }, setState] = useState(loadInitialAuth);

  const login = (userData: User, token: string) => {
    setState({ user: userData, loading: false });

    setCookie(appConfig.cookies.names.authToken, token, {
      days: appConfig.cookies.defaultExpiryDays,
    });

    setCookie(
      appConfig.cookies.names.userData,
      encodeURIComponent(JSON.stringify(userData)),
      {
        days: appConfig.cookies.defaultExpiryDays,
      }
    );
  };

  const logout = () => {
    setState({ user: null, loading: false });
    deleteCookie(appConfig.cookies.names.authToken);
    deleteCookie(appConfig.cookies.names.userData);
  };

  return {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
  };
}
