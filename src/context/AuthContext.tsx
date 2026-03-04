import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

export interface User {
  username: string;
  email: string;
  playerId: string;
  profileId: string;
  createdAt: string;
  devMode: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, email: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  updateDevMode: (value: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function loadOrCreateProfile(username: string, email: string): Promise<User> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

  const res = await fetch(`${supabaseUrl}/functions/v1/profile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'Apikey': supabaseAnonKey,
    },
    body: JSON.stringify({ email, nombre: username }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? 'Profile load failed');
  }

  const data = await res.json();
  return {
    username: data.nombre || username,
    email: data.email,
    playerId: data.player_code,
    profileId: data.id,
    createdAt: data.created_at,
    devMode: data.dev_mode,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('authUser');
    if (!storedUser) return;

    let parsed: Partial<User>;
    try {
      parsed = JSON.parse(storedUser);
    } catch {
      localStorage.removeItem('authUser');
      return;
    }

    const localUser: User = {
      username: parsed.username ?? '',
      email: parsed.email ?? '',
      playerId: parsed.playerId ?? '',
      profileId: parsed.profileId ?? '',
      createdAt: parsed.createdAt ?? new Date().toISOString(),
      devMode: parsed.devMode ?? false,
    };
    setUser(localUser);

    if (localUser.email) {
      supabase
        .from('profiles')
        .select('*')
        .eq('email', localUser.email)
        .maybeSingle()
        .then(({ data }) => {
          if (!data) return;
          const synced: User = {
            username: data.nombre || localUser.username,
            email: data.email,
            playerId: data.player_code,
            profileId: data.id ?? localUser.profileId,
            createdAt: data.created_at,
            devMode: data.dev_mode,
          };
          setUser(synced);
          localStorage.setItem('authUser', JSON.stringify(synced));
        });
    }
  }, []);

  const login = async (username: string, email: string) => {
    const profile = await loadOrCreateProfile(username, email);
    setUser(profile);
    localStorage.setItem('authUser', JSON.stringify(profile));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('authUser');
  };

  const updateDevMode = (value: boolean) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, devMode: value };
      localStorage.setItem('authUser', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, updateDevMode }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
