"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Cpu,
  LogOut,
  FileText,
  MessageSquare,
  LayoutDashboard,
  History,
  Settings,
  Sparkles,
  Menu,
  X,
  User,
} from "lucide-react";
import { signOut, getAuthToken } from "@/lib/authService";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabaseClient";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const token = getAuthToken();
    setIsLoggedIn(!!token);

    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      if (supabase) {
        const { data: authListener } = supabase.auth.onAuthStateChange(
          (event, session) => {
            if (session) {
              localStorage.setItem("access_token", session.access_token);
              localStorage.setItem("refresh_token", session.refresh_token);
              setIsLoggedIn(true);
            } else if (event === "SIGNED_OUT") {
              localStorage.removeItem("access_token");
              localStorage.removeItem("refresh_token");
              setIsLoggedIn(false);
            }
          }
        );

        return () => {
          authListener.subscription.unsubscribe();
        };
      }
    }
  }, [pathname]);

  const handleLogout = async () => {
    await signOut();
    setIsLoggedIn(false);
    setMobileMenuOpen(false);
    router.push("/login");
  };

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Upload Doc", href: "/upload", icon: FileText },
    { name: "AI Chat", href: "/chat", icon: MessageSquare },
    { name: "History", href: "/history", icon: History },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <nav className="border-b border-slate-800 bg-slate-950/90 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="p-1.5 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <Cpu className="w-4 h-4" />
            </div>
            <span className="font-bold text-base tracking-wide text-white">
              DeepRAG <span className="text-indigo-400 font-normal">Lab</span>
            </span>
          </Link>

          {/* Desktop Navigation Feature Links — Always Visible for instant feature access */}
          <div className="hidden lg:flex items-center gap-1.5 text-xs font-medium">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-all ${
                    isActive
                      ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30"
                      : "text-slate-400 hover:text-white hover:bg-slate-900"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          {/* Auth Actions (Compact Buttons) */}
          <div className="hidden sm:flex items-center gap-2">
            {isLoggedIn ? (
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-3 py-1.5 rounded-md text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-900 border border-transparent transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="px-3.5 py-1.5 rounded-md text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3 text-indigo-200" />
                  <span>Get Started</span>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle Button */}
          <div className="flex lg:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-slate-800 bg-slate-950/95 px-4 pt-2 pb-4 space-y-2">
          <div className="grid grid-cols-2 gap-2 pt-1 pb-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${
                    isActive
                      ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30"
                      : "text-slate-300 bg-slate-900/60 hover:bg-slate-800"
                  }`}
                >
                  <Icon className="w-4 h-4 text-indigo-400" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2">
            {isLoggedIn ? (
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-rose-400 bg-rose-500/10 border border-rose-500/20"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 text-center py-2 rounded-lg text-xs font-medium text-slate-300 bg-slate-900 border border-slate-800"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 text-center py-2 rounded-lg text-xs font-semibold bg-indigo-600 text-white shadow-sm"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
