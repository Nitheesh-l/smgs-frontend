import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { fetchJson } from "@/utils/api";
import { toast } from "sonner";


type AppRole = "student" | "faculty" | "admin";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: AppRole;
}

interface AuthContextType {
  user: User | null;
  profile: User | null;
  loading: boolean;
  signIn: (email: string, password: string, role?: string, rollNumber?: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, role: AppRole) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      const stored = localStorage.getItem('auth_user');
      if (stored) {
        try {
          setProfile(JSON.parse(stored));
        } catch (e) {
          console.error('Failed to parse stored auth:', e);
          localStorage.removeItem('auth_user');
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const signIn = async (email: string, password: string, role?: string, rollNumber?: string) => {
    try {
      const body: any = { password };
      
      if (role === "student" && rollNumber) {
        body.roll_number = rollNumber;
        body.role = "student";
      } else {
        body.email = email;
      }

      const { res, data } = await fetchJson('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        return { error: { message: data?.error || 'Sign in failed' } };
      }

      if (data?.user) {
        setProfile(data.user);
        localStorage.setItem('auth_user', JSON.stringify(data.user));
        toast.success('Signed in successfully');
      }
      return {};
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Sign in failed';
      toast.error(msg);
      return { error: { message: msg } };
    }
  };

  const signUp = async (email: string, password: string, fullName: string, role: string) => {
    try {
      const { res, data } = await fetchJson('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, full_name: fullName, role }),
      });

      if (!res.ok) {
        return { error: { message: data?.error || 'Sign up failed' } };
      }

      if (data?.user) {
        setProfile(data.user);
        localStorage.setItem('auth_user', JSON.stringify(data.user));
        toast.success('Account created successfully');
      }
      return {};
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Sign up failed';
      toast.error(msg);
      return { error: { message: msg } };
    }
  };

  const logout = async () => {
    setProfile(null);
    localStorage.removeItem('auth_user');
    toast.success('Logged out');
  };

  const user = profile;

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
