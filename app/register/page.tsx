"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Cpu, ArrowRight, AlertCircle, Loader2, CheckCircle2, ShieldCheck, Database, Check, X, Eye, EyeOff } from "lucide-react";
import { signUp, signInWithGoogle, validateStrongPassword } from "@/lib/authService";
import { isSupabaseConfigured } from "@/lib/supabaseClient";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [hasSupabase, setHasSupabase] = useState(false);

  useEffect(() => {
    setHasSupabase(isSupabaseConfigured());

    // Prevent screenshot / print screen keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "PrintScreen" ||
        ((e.ctrlKey || e.metaKey) && (e.key === "p" || e.key === "P")) ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "s" || e.key === "S"))
      ) {
        e.preventDefault();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const passwordStatus = validateStrongPassword(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!passwordStatus.isValid) {
      setError("Please fulfill all strong password requirements before submitting.");
      return;
    }

    setLoading(true);

    try {
      const res = await signUp(email, username, password);
      if (res.emailConfirmationRequired) {
        setSuccessMsg(
          "Account created successfully! Please check your email inbox to confirm your registration before signing in."
        );
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
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
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-md p-8 rounded-3xl glass-panel border border-slate-800 shadow-2xl">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="p-3 rounded-2xl bg-indigo-600/20 text-indigo-400 mb-3">
            <Cpu className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white">Create Account</h1>
          <p className="text-sm text-slate-400 mt-1">Register using your official email or Gmail</p>
          
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
              <p className="font-semibold text-rose-200">Registration Error</p>
              <p className="text-xs text-rose-300/90 mt-0.5 leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-emerald-200">Confirmation Sent</p>
              <p className="text-xs text-emerald-300/90 mt-0.5 leading-relaxed">{successMsg}</p>
            </div>
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
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              className="w-full px-4 py-3 rounded-xl bg-slate-900/80 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <p className="text-[11px] text-slate-500 mt-1">Disposable/temporary emails are automatically blocked.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Username
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Choose a username"
              className="w-full px-4 py-3 rounded-xl bg-slate-900/80 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onCopy={(e) => e.preventDefault()}
                onCut={(e) => e.preventDefault()}
                onContextMenu={(e) => e.preventDefault()}
                onDragStart={(e) => e.preventDefault()}
                placeholder="Enter a strong password"
                className="w-full px-4 py-3 pr-12 rounded-xl bg-slate-900/80 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors select-none"
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

            {/* Password Strength Checklist */}
            {password.length > 0 && (
              <div className="mt-3 p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
                <div className="text-[11px] font-semibold text-slate-400 mb-1">Strong Password Checklist:</div>
                
                <div className="grid grid-cols-2 gap-1 text-[11px]">
                  <div className={`flex items-center gap-1.5 ${passwordStatus.hasMinLength ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {passwordStatus.hasMinLength ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                    <span>8+ characters</span>
                  </div>

                  <div className={`flex items-center gap-1.5 ${passwordStatus.hasUpper ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {passwordStatus.hasUpper ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                    <span>Uppercase (A-Z)</span>
                  </div>

                  <div className={`flex items-center gap-1.5 ${passwordStatus.hasLower ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {passwordStatus.hasLower ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                    <span>Lowercase (a-z)</span>
                  </div>

                  <div className={`flex items-center gap-1.5 ${passwordStatus.hasNumber ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {passwordStatus.hasNumber ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                    <span>Number (0-9)</span>
                  </div>

                  <div className={`col-span-2 flex items-center gap-1.5 ${passwordStatus.hasSpecial ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {passwordStatus.hasSpecial ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                    <span>Special character (!@#$%^&*)</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || googleLoading || (password.length > 0 && !passwordStatus.isValid)}
            className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50 mt-6"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <span>Create Account</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-sm text-slate-400 mt-8">
          Already have an account?{" "}
          <Link href="/login" className="text-indigo-400 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
