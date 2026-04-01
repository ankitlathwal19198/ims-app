'use client';

import { useEffect, useMemo, useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'react-hot-toast';
import { FcGoogle } from 'react-icons/fc';
import { FaSpinner, FaEye, FaEyeSlash, FaLock } from 'react-icons/fa';
import { FiMoon, FiSun, FiFileText, FiActivity, FiTruck, FiBarChart2, FiDatabase } from 'react-icons/fi';
import { useTheme } from "next-themes";

export default function LoginClientComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = useMemo(() => searchParams.get('callbackUrl') || '/', [searchParams]);

  const { status } = useSession();

  // Redirect logged-in users away from login page
  useEffect(() => {
    if (status === 'authenticated') router.replace('/');
  }, [status, router]);

  // ---------------- THEME TOGGLE (enterprise) ----------------
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  // ---------------- LOGIN STATE ----------------
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      toast.error('Please enter both username and password');
      setError('Both fields are required');
      return;
    }

    setLoading(true);
    const res = await signIn('credentials', {
      redirect: false,
      username: email,
      password,
      callbackUrl,
    });
    setLoading(false);

    if (res?.error) {
      toast.error('Invalid username or password');
      setError('Invalid username or password');
      return;
    }

    if (res?.ok && res?.url) {
      toast.success('Login successful!');
      router.push(res.url);
      return;
    }

    toast.error('Something went wrong. Please try again.');
  };

  return (
    <div className="relative h-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 1800,
          style: { borderRadius: 12, fontSize: 14 },
        }}
      />

      {/* Background (no scroll) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-28 left-1/2 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-gradient-to-tr from-blue-500/20 via-cyan-400/10 to-indigo-500/20 blur-3xl dark:from-blue-400/15 dark:via-cyan-400/10 dark:to-indigo-400/15" />
        <div className="absolute -bottom-40 right-[-6rem] h-[30rem] w-[30rem] rounded-full bg-gradient-to-tr from-fuchsia-500/10 via-violet-500/10 to-blue-500/10 blur-3xl dark:from-fuchsia-400/10 dark:via-violet-400/10 dark:to-blue-400/10" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.08),transparent_42%),radial-gradient(circle_at_85%_30%,rgba(168,85,247,0.07),transparent_45%),radial-gradient(circle_at_50%_88%,rgba(34,211,238,0.06),transparent_45%)]" />
      </div>

      {/* Split Layout */}
      <div className="relative mx-auto grid h-full max-w-6xl grid-cols-1 gap-10 overflow-hidden px-6 py-12 lg:grid-cols-2 lg:items-center">
        {/* LEFT: Sales Order App context panel (hidden on small screens) */}
        <div className="hidden overflow-hidden lg:block">
          <div className="max-w-lg overflow-hidden">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Sales Order → Production Execution
            </div>

            <h1 className="mt-6 text-4xl font-semibold tracking-tight">
              Create Sales Orders from Office for Plant Production
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
              This system is designed for office teams to raise Sales Orders that drive production planning and
              execution at the plant/factory. Every Sales Order becomes the source of truth for quantities,
              due dates, and dispatch readiness.
            </p>

            <div className="mt-8 grid gap-4">
              <Feature
                icon={<FiFileText />}
                title="Sales Order Control"
                desc="Create and manage Sales Orders with accurate item, quantity, and required dates for manufacturing."
              />
              <Feature
                icon={<FiActivity />}
                title="Production Tracking"
                desc="Track production progress aligned to each Sales Order — from planning to execution and completion."
              />
            </div>

            <div className="mt-8 rounded-2xl border border-slate-200 bg-white/70 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  What this improves
                </p>
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                  <FiBarChart2 />
                  Visibility
                </span>
              </div>

              <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
                Better coordination between office and plant — fewer errors, faster execution, and clearer accountability.
              </p>

              <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-400">
                Tip: Keep SO details accurate (item, quantity, due date). Plant planning depends on it.
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT: Login Card */}
        <motion.div
          className="mx-auto w-full max-w-md overflow-hidden"
          initial={{ opacity: 0, y: 26, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45 }}
        >
          <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white/75 p-7 shadow-[0_18px_65px_rgba(15,23,42,0.14)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/60">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900">
                  <FaLock aria-hidden />
                </div>
                <div>
                  <p className="text-sm font-semibold tracking-tight">Sales Order App</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Sign in to continue
                  </p>
                </div>
              </div>

              {/* Theme Toggle */}
              <button
                type="button"
                onClick={toggleTheme}
                disabled={!mounted}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                aria-label="Toggle theme"
                title="Toggle theme"
              >
                {/* {theme === 'dark' ? <FiSun /> : <FiMoon />}
                <span className="hidden sm:inline">{theme === 'dark' ? 'Light' : 'Dark'}</span> */}
                {mounted && theme === "dark" ? <FiSun /> : <FiMoon />}
                <span className="hidden sm:inline">
                  {mounted && theme === "dark" ? "Light" : "Dark"}
                </span>

              </button>
            </div>

            {/* Form */}
            <form
              className="mt-6 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                handleLogin();
              }}
              autoComplete="on"
            >
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Username
                </label>
                <input
                  id="email"
                  type="text"
                  autoComplete="username"
                  value={email}
                  disabled={loading}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError('');
                  }}
                  placeholder="Enter your username"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white/90 px-3.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-400 dark:focus:border-blue-400 dark:focus:ring-blue-400/15"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Password
                </label>

                <div className="relative">
                  <input
                    id="password"
                    type={showPwd ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    disabled={loading}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError('');
                    }}
                    placeholder="Enter your password"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white/90 px-3.5 pr-11 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-400 dark:focus:border-blue-400 dark:focus:ring-blue-400/15"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPwd((s) => !s)}
                    disabled={loading}
                    aria-label={showPwd ? 'Hide password' : 'Show password'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-60 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                  >
                    {showPwd ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {error ? (
                  <motion.p
                    key={error}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200"
                    role="alert"
                  >
                    {error}
                  </motion.p>
                ) : null}
              </AnimatePresence>

              <div className="flex items-center justify-between">
                <a
                  href="#"
                  tabIndex={loading ? -1 : 0}
                  aria-disabled={loading}
                  className="text-sm font-semibold text-blue-600 transition hover:text-blue-700 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Forgot password?
                </a>

                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Office access only
                </span>
              </div>

              <motion.button
                type="submit"
                whileHover={!loading ? { scale: 1.01 } : {}}
                whileTap={!loading ? { scale: 0.99 } : {}}
                disabled={loading || !email || !password}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300 disabled:text-slate-600 dark:disabled:from-slate-700 dark:disabled:to-slate-700 dark:disabled:text-slate-300"
              >
                {loading ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Get Started'
                )}
              </motion.button>

              {/* Divider */}
              <div className="flex items-center gap-3 py-1">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent dark:via-white/10" />
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Or continue with
                </span>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent dark:via-white/10" />
              </div>

              <button
                type="button"
                onClick={() => signIn('google', { callbackUrl })}
                disabled={loading}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                aria-label="Sign in with Google"
              >
                <FcGoogle size={20} />
                <span>Continue with Google</span>
              </button>

              <p className="pt-1 text-center text-xs text-slate-500 dark:text-slate-400">
                By continuing, you agree to our{' '}
                <span className="font-medium text-slate-700 dark:text-slate-200">Terms</span> and{' '}
                <span className="font-medium text-slate-700 dark:text-slate-200">Privacy Policy</span>.
              </p>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function Feature({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 grid h-10 w-10 place-items-center rounded-xl bg-slate-900/5 text-slate-800 dark:bg-white/10 dark:text-slate-100">
          <span className="text-lg">{icon}</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{desc}</p>
        </div>
      </div>
    </div>
  );
}
