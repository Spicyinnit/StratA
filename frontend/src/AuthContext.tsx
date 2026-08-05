import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { API_BASE, apiFetch } from './api';

type AuthUser = {
  token: string;
  id: number;
  username: string;
};

type MyProfile = {
  tag: string;
  display_name: string;
  bio: string;
  avatar: string | null;
};

type AuthContextType = {
  user: AuthUser | null;
  profile: MyProfile | null;
  refreshProfile: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, password2: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem('auth');
    return saved ? JSON.parse(saved) : null;
  });
  const [profile, setProfile] = useState<MyProfile | null>(null);

  const refreshProfile = useCallback(async () => {
    if (!localStorage.getItem('auth')) return;
    try {
      const r = await apiFetch('/api/profile/me/');
      if (!r.ok) return;
      const d = await r.json();
      setProfile({
        tag: d.tag ?? '',
        display_name: d.display_name ?? '',
        bio: d.bio ?? '',
        avatar: d.avatar ? (d.avatar.startsWith('http') ? d.avatar : API_BASE + d.avatar) : null,
      });
    } catch {
      // dont blow up the app if the profile fetch fails
    }
  }, []);

  // load my profile whenever I'm logged in
  useEffect(() => {
    if (user) refreshProfile();
    else setProfile(null);
  }, [user, refreshProfile]);

  function applyAuth(data: any) {
    const authUser = {
      token: data.token,
      id: data.user_id,
      username: data.username,
    };
    localStorage.setItem('auth', JSON.stringify(authUser));
    setUser(authUser);
  }

  async function login(username: string, password: string) {
    const res = await fetch(`${API_BASE}/api/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    applyAuth(data);
  }

  async function register(username: string, password: string, password2: string) {
    const res = await fetch(`${API_BASE}/api/register/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, password2 }),
    });
    const data = await res.json();
    if (!res.ok) {
      const first = Object.values(data)[0];
      throw new Error(Array.isArray(first) ? first[0] : 'Register failed');
    }
    applyAuth(data);
  }

  function logout() {
    const token = user?.token;
    if (token) {
      fetch(`${API_BASE}/api/logout/`, {
        method: 'POST',
        headers: { Authorization: `Token ${token}` },
      }).catch(() => {});
    }
    localStorage.removeItem('auth');
    setUser(null);
    setProfile(null);
  }

  return (
    <AuthContext.Provider value={{ user, profile, refreshProfile, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}