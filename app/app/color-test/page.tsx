'use client';

import * as React from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'react-hot-toast';
import { useTheme } from 'next-themes';
import { FcGoogle } from 'react-icons/fc';
import { FiMoon, FiSun, FiShield, FiKey } from 'react-icons/fi';

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(' ');
}

export default function LoginPage()
// : JSX.Element
{
    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get('callbackUrl') || '/';

    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => setMounted(true), []);

    const [username, setUsername] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [showPwd, setShowPwd] = React.useState(false);
    const [error, setError] = React.useState<string>('');
    const [loading, setLoading] = React.useState(false);

    const toggleTheme = () => {
        // ✅ next-themes handles html.dark correctly
        setTheme(theme === 'dark' ? 'light' : 'dark');
    };

    const handleLogin = async () => {
        if (!username || !password) {
            toast.error('Please enter username and password');
            setError('Both fields are required');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const res = await signIn('credentials', {
                redirect: false,
                username,
                password,
                callbackUrl,
            });

            if (res?.error) {
                toast.error('Invalid username or password');
                setError('Invalid username or password');
            } else if (res?.ok && res?.url) {
                toast.success('Login successful!');
                router.push(res.url);
            } else {
                toast.error('Something went wrong. Please try again.');
                setError('Something went wrong. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen overflow-hidden bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
            <Toaster position="top-right" toastOptions={{ duration: 1800 }} />

            {/* Background */}
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute -top-24 left-1/2 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-gradient-to-tr from-blue-500/20 via-cyan-400/10 to-indigo-500/20 blur-3xl dark:from-blue-400/15 dark:via-cyan-400/10 dark:to-indigo-400/15" />
                <div className="absolute -bottom-40 right-[-6rem] h-[30rem] w-[30rem] rounded-full bg-gradient-to-tr from-fuchsia-500/10 via-violet-500/10 to-blue-500/10 blur-3xl dark:from-fuchsia-400/10 dark:via-violet-400/10 dark:to-blue-400/10" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.08),transparent_42%),radial-gradient(circle_at_85%_30%,rgba(168,85,247,0.07),transparent_45%),radial-gradient(circle_at_50%_88%,rgba(34,211,238,0.06),transparent_45%)]" />
            </div>

            <main className="relative mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6 py-10">
                <motion.div
                    initial={{ opacity: 0, y: 22, scale: 0.985 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.45 }}
                    className="w-full max-w-md"
                >
                    <div className="rounded-2xl border border-slate-200/70 bg-white/75 p-7 shadow-[0_18px_65px_rgba(15,23,42,0.14)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/60">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="grid h-11 w-11 place-items-center rounded-xl bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900">
                                    <FiShield />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold tracking-tight">HR Exports IMS</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Sign in to continue</p>
                                </div>
                            </div>

                            {/* Theme toggle */}
                            <button
                                type="button"
                                onClick={toggleTheme}
                                disabled={!mounted}
                                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60
                           dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                            >
                                {mounted && theme === 'dark' ? <FiSun /> : <FiMoon />}
                                <span className="hidden sm:inline">
                                    {mounted && theme === 'dark' ? 'Light' : 'Dark'}
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
                                <label htmlFor="username" className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                    Username
                                </label>
                                <input
                                    id="username"
                                    type="text"
                                    autoComplete="username"
                                    value={username}
                                    disabled={loading}
                                    onChange={(e) => {
                                        setUsername(e.target.value);
                                        setError('');
                                    }}
                                    placeholder="Enter your username"
                                    className="h-11 w-full rounded-xl border border-slate-200 bg-white/90 px-3.5 text-sm text-slate-900 shadow-sm outline-none transition
                             focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 disabled:opacity-60
                             dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-400 dark:focus:border-blue-400 dark:focus:ring-blue-400/15"
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
                                        className="h-11 w-full rounded-xl border border-slate-200 bg-white/90 px-3.5 pr-20 text-sm text-slate-900 shadow-sm outline-none transition
                               focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 disabled:opacity-60
                               dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-400 dark:focus:border-blue-400 dark:focus:ring-blue-400/15"
                                    />

                                    <button
                                        type="button"
                                        onClick={() => setShowPwd((s) => !s)}
                                        disabled={loading}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50
                               dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                                    >
                                        {showPwd ? 'Hide' : 'Show'}
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

                            <motion.button
                                type="submit"
                                whileHover={!loading ? { scale: 1.01 } : {}}
                                whileTap={!loading ? { scale: 0.99 } : {}}
                                disabled={loading || !username || !password}
                                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-sm font-semibold text-white shadow-sm transition
                           disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300 disabled:text-slate-600
                           dark:disabled:from-slate-700 dark:disabled:to-slate-700 dark:disabled:text-slate-300"
                            >
                                {loading ? (
                                    <>
                                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                                        Signing in...
                                    </>
                                ) : (
                                    <>
                                        <FiKey />
                                        Get Started
                                    </>
                                )}
                            </motion.button>

                            <div className="flex items-center gap-3 py-1">
                                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent dark:via-white/10" />
                                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Or</span>
                                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent dark:via-white/10" />
                            </div>

                            <button
                                type="button"
                                onClick={() => signIn('google', { callbackUrl })}
                                disabled={loading}
                                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-60
                           dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                            >
                                <FcGoogle size={20} />
                                Continue with Google
                            </button>

                            <p className="pt-1 text-center text-xs text-slate-500 dark:text-slate-400">
                                By continuing, you agree to company security policies.
                            </p>
                        </form>
                    </div>
                </motion.div>
            </main>
        </div>
    );
}
