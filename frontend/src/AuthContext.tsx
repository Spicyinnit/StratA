import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { API_BASE } from './api';

type AuthUser = {
  token: string;
  id: number;
  username: string;
};

type AuthContextType = {
  user: AuthUser | null;
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
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}