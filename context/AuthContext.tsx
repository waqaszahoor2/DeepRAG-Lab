"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getCurrentUser, signOut, signIn, signUp, AuthResult } from "@/lib/authService";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import AuthRequiredModal from "@/components/AuthRequiredModal";

interface UserProfile {
  id: string;
  email: string;
  username: string;
}

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  loading: boolean;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
  requireAuth: (callback?: () => void) => boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  loading: true,
  refreshUser: async () => {},
  logout: async () => {},
  requireAuth: () => false,
  openAuthModal: () => {},
  closeAuthModal: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Restore Session on App Startup & Listen to Supabase Session Changes
  useEffect(() => {
    async function restoreSession() {
      try {
        const currentUser = await getCurrentUser();
        if (currentUser) {
          setUser({
            id: currentUser.id,
            email: currentUser.email,
            username: currentUser.username || currentUser.email.split("@")[0],
          });
        } else {
          setUser(null);
        }
      } catch (err) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    restoreSession();

    // Listen for Supabase auth changes
    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      if (supabase) {
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (session?.user) {
            setUser({
              id: session.user.id,
              email: session.user.email || "",
              username: session.user.user_metadata?.username || session.user.email?.split("@")[0] || "User",
            });
            localStorage.setItem("access_token", session.access_token);
            localStorage.setItem("refresh_token", session.refresh_token);
            localStorage.setItem("user_email", session.user.email || "");
          } else if (event === "SIGNED_OUT") {
            setUser(null);
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            localStorage.removeItem("user_email");
          }
        });

        return () => {
          authListener.subscription.unsubscribe();
        };
      }
    }
  }, []);

  const refreshUser = async () => {
    const currentUser = await getCurrentUser();
    setUser(currentUser ? {
      id: currentUser.id,
      email: currentUser.email,
      username: currentUser.username || currentUser.email.split("@")[0],
    } : null);
  };

  const handleLogout = async () => {
    await signOut();
    setUser(null);
    setIsAuthModalOpen(false);
    router.push("/login");
  };

  const requireAuth = (callback?: () => void): boolean => {
    if (!user && !loading) {
      setIsAuthModalOpen(true);
      return false;
    }
    if (callback) callback();
    return true;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        refreshUser,
        logout: handleLogout,
        requireAuth,
        openAuthModal: () => setIsAuthModalOpen(true),
        closeAuthModal: () => setIsAuthModalOpen(false),
      }}
    >
      {children}
      <AuthRequiredModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
