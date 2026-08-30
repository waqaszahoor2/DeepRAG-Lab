"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Cpu, ArrowRight, AlertCircle, Loader2, ShieldCheck, Database, Eye, EyeOff, Mail, RefreshCw, KeyRound } from "lucide-react";
import { signIn, signInWithGoogle, resendVerificationEmail } from "@/lib/authService";
import { isSupabaseConfigured } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/dashboard";

  const { refreshUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [hasSupabase, setHasSupabase] = useState(false);
  const [showResendBtn, setShowResendBtn] = useState(false);

  useEffect(() => {
    setHasSupabase(isSupabaseConfigured());
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMsg(null);
    setShowResendBtn(false);
    setLoading(true);

    try {
      await signIn(email, password);
      await refreshUser();
      router.push(redirectUrl);
    } catch (err: any) {
      const msg = err.message || "Sign in failed. Please check your credentials.";
      setError(msg);
      if (msg.toLowerCase().includes("email not confirmed")) {
        setShowResendBtn(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;
    setResendLoading(true);
    setInfoMsg(null);
    try {
      await resendVerificationEmail(email);
      setInfoMsg("Verification link resent! Please check your Gmail inbox.");
    } catch (err: any) {
      setError(err.message || "Failed to resend confirmation email.");
    } finally {
      setResendLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotLoading(true);
    setError(null);
    setInfoMsg(null);
    try {
      if (hasSupabase) {
        const { getSupabase } = await import("@/lib/supabaseClient");
        const supabase = getSupabase();
        if (supabase) {
          const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
            redirectTo: `${window.location.origin}/login?reset=true`,
          });
          if (error) throw error;
        }
      }
      setInfoMsg(`Password reset instructions have been sent to ${forgotEmail}. Please check your inbox.`);
      setShowForgotModal(false);
    } catch (err: any) {
      setError(err.message || "Unable to send password reset request.");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err.message || "Google Sign In failed");
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-md p-8 rounded-3xl glass-panel border border-slate-800 shadow-2xl">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="p-3 rounded-2xl bg-indigo-600/20 text-indigo-400 mb-3">
            <Cpu className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white">Welcome Back</h1>
          <p className="text-sm text-slate-400 mt-1">Sign in with your official email or Gmail</p>
          
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-900 border border-slate-800 text-slate-300">
            {hasSupabase ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Supabase Auth Active</span>
              </>
            ) : (
              <>
                <Database className="w-3.5 h-3.5 text-amber-400" />
                <span>Backend API Auth Mode</span>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-rose-200">Authentication Error</p>
              <p className="text-xs text-rose-300/90 mt-0.5 leading-relaxed">{error}</p>
              {showResendBtn && (
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendLoading}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium inline-flex items-center gap-1.5 transition-colors"
                  >
                    {resendLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    <span>Resend Gmail Link</span>
                  </button>
                  <a
                    href="https://mail.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium inline-flex items-center gap-1.5 transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Open Gmail</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {infoMsg && (
          <div className="mb-6 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm flex items-start gap-3">
            <Mail className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <p className="text-xs text-indigo-200 leading-relaxed">{infoMsg}</p>
          </div>
        )}

        {hasSupabase && (
          <div className="mb-6">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading || loading}
              className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white font-medium flex items-center justify-center gap-3 transition-colors shadow-sm disabled:opacity-50"
            >
              {googleLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.1 9 5 12 5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 10.8 0 12.5s.7 2.8 1.9 5.2l3.7-2.9z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.1-6.4-5.2L1.9 17C3.7 20.7 7.5 24 12 24z"
                  />
                </svg>
              )}
              <span>Continue with Google (Gmail)</span>
            </button>

            <div className="relative my-6 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800" />
              </div>
              <span className="relative px-3 bg-slate-950 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Or with email
              </span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              className="w-full px-4 py-3 rounded-xl bg-slate-900/80 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Password
              </label>
              <button
                type="button"
                onClick={() => {
                  setForgotEmail(email);
                  setShowForgotModal(true);
                }}
                className="text-xs text-indigo-400 hover:underline font-medium"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-4 py-3 pr-12 rounded-xl bg-slate-900/80 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors p-1"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50 mt-6"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-sm text-slate-400 mt-8">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-indigo-400 font-medium hover:underline">
            Create account
          </Link>
        </p>
        <Link href="/chat?demo=true" className="mt-4 flex items-center justify-center text-sm font-medium text-indigo-400 hover:text-indigo-300">
          Try the public demo without signing in
        </Link>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-sm p-6 rounded-2xl glass-panel border border-slate-800 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Reset Password</h2>
                <p className="text-xs text-slate-400">Receive a password reset link via email</p>
              </div>
            </div>

            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label htmlFor="forgot-email" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Email Address
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="Enter your registered email"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  {forgotLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Send Reset Link</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
