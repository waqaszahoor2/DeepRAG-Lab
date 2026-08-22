"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Cpu, LogOut, FileText, MessageSquare, LayoutDashboard, History, Settings } from "lucide-react";
import { signOut, getAuthToken } from "@/lib/authService";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabaseClient";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Check initial token
    const token = getAuthToken();
    setIsLoggedIn(!!token);

    // Listen to Supabase auth state changes if configured
    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      if (supabase) {
        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
          if (session) {
            localStorage.setItem("access_token", session.access_token);
            localStorage.setItem("refresh_token", session.refresh_token);
            setIsLoggedIn(true);
          } else if (event === "SIGNED_OUT") {
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            setIsLoggedIn(false);
          }
        });

        return () => {
          authListener.subscription.unsubscribe();
        };
      }
    }
  }, [pathname]);

  const handleLogout = async () => {
    await signOut();
    setIsLoggedIn(false);
    router.push("/login");
  };

  return (
    <nav className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <Cpu className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg tracking-wider text-white">
              DeepRAG <span className="text-indigo-400 font-normal">Lab</span>
            </span>
          </Link>

          {isLoggedIn ? (
            <div className="flex items-center gap-6">
              <div className="hidden md:flex items-center gap-4 text-sm font-medium">
                <Link
                  href="/dashboard"
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                    pathname === "/dashboard"
                      ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" /> Dashboard
                </Link>

                <Link
                  href="/upload"
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                    pathname === "/upload"
                      ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                  }`}
                >
                  <FileText className="w-4 h-4" /> Upload
                </Link>

                <Link
                  href="/chat"
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                    pathname === "/chat"
                      ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                  }`}
                >
                  <MessageSquare className="w-4 h-4" /> AI Chat
                </Link>

                <Link
                  href="/history"
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                    pathname === "/history"
                      ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                  }`}
                >
                  <History className="w-4 h-4" /> History
                </Link>

                <Link
                  href="/settings"
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                    pathname === "/settings"
                      ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                  }`}
                >
                  <Settings className="w-4 h-4" /> Settings
                </Link>
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition-colors"
              >
                <LogOut className="w-4 h-4" /> Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 text-sm font-medium rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25 transition-all"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
