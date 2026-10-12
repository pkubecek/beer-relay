import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { api, clearToken, getToken, setToken, setUnauthorizedHandler } from "./api";

const AuthContext = createContext(null);

const ROLE_LEVEL = { user: 0, organizer: 1, admin: 2 };

export function hasRole(user, role) {
  return !!user && ROLE_LEVEL[user.role] >= ROLE_LEVEL[role];
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!getToken());

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    if (!getToken()) return;
    api
      .me()
      .then(setUser)
      .catch(() => logout())
      .finally(() => setLoading(false));
  }, [logout]);

  const login = useCallback(async (email, password) => {
    const res = await api.login(email, password);
    setToken(res.access_token);
    setUser(res.user);
    return res.user;
  }, []);

  const register = useCallback(async (data) => {
    const res = await api.register(data);
    setToken(res.access_token);
    setUser(res.user);
    return res.user;
  }, []);

  const value = useMemo(() => ({ user, setUser, loading, login, register, logout }), [user, loading, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

export function RequireAuth({ children, role = "user" }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <p className="text-forest-700/60">Načítám…</p>;
  if (!user) {
    return <Navigate to={`/prihlaseni?next=${encodeURIComponent(location.pathname)}`} replace />;
  }
  if (!hasRole(user, role)) {
    return <p className="text-punch">Na tuto stránku nemáš oprávnění.</p>;
  }
  return children;
}
