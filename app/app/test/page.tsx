'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

export default function TestUIPage()
// : JSX.Element
 {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [selected, setSelected] = React.useState<'Today' | 'Week' | 'Month'>('Week');

  React.useEffect(() => setMounted(true), []);
  const isDark = mounted && theme === 'dark';

  return (
    <div className="min-h-screen bg-bg text-text">
      {/* Background gradients */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10
          bg-[radial-gradient(1200px_600px_at_15%_10%,rgba(59,130,246,0.18),transparent_60%),
              radial-gradient(1000px_650px_at_85%_25%,rgba(236,72,153,0.16),transparent_60%),
              radial-gradient(1000px_650px_at_45%_95%,rgba(34,197,94,0.14),transparent_60%)]"
      />

      {/* Topbar */}
      <header className="sticky top-0 z-20 border-b border-border bg-card/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 ring-1 ring-border">
              <span className="text-lg">🧪</span>
            </div>
            <div>
              <p className="text-sm font-semibold leading-4">UI Test Lab</p>
              <p className="text-xs text-subtext">Tailwind v4 + Motion + Theme</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className={cn(
                'inline-flex items-center gap-2 rounded-xl border border-border bg-muted px-3 py-2 text-xs font-semibold text-subtext',
                'hover:bg-muted/70 focus:outline-none focus:ring-2 focus:ring-ring/40'
              )}
            >
              <span className="text-base">{isDark ? '🌙' : '☀️'}</span>
              {isDark ? 'Dark' : 'Light'}
            </motion.button>

            <motion.a
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
              href="/login"
              className="hidden sm:inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white
                hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-ring/40"
            >
              Go to Login
            </motion.a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10">
        {/* Hero */}
        <motion.section
          initial="hidden"
          animate="show"
          variants={stagger}
          className="grid gap-6 lg:grid-cols-2 lg:gap-10"
        >
          <motion.div variants={fadeUp} className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs font-semibold text-subtext">
              <span className="h-2 w-2 rounded-full bg-primary" />
              Enterprise UI readiness check
            </div>

            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              A colorful, meaningful page to verify your
              <span className="text-primary"> Tailwind + Dark Mode</span> setup.
            </h1>

            <p className="max-w-xl text-base leading-7 text-subtext">
              This page includes animated widgets, charts-style bars, activity feed, and CTA blocks.
              If you see gradients, spacing, shadows, and smooth animations — your stack is working.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <motion.button
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.98 }}
                className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white
                  focus:outline-none focus:ring-2 focus:ring-ring/40 hover:opacity-95"
              >
                Run UI Checks
              </motion.button>

              <motion.button
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.98 }}
                className="rounded-xl border border-border bg-card/70 px-5 py-3 text-sm font-semibold text-text
                  hover:bg-muted/70 focus:outline-none focus:ring-2 focus:ring-ring/40"
              >
                View Docs
              </motion.button>

              <div className="flex items-center gap-2 text-xs text-subtext">
                <span className="inline-flex h-6 items-center rounded-full bg-green-500/15 px-2 font-semibold text-green-500">
                  Healthy
                </span>
                <span className="inline-flex h-6 items-center rounded-full bg-blue-500/15 px-2 font-semibold text-blue-500">
                  Fast
                </span>
                <span className="inline-flex h-6 items-center rounded-full bg-pink-500/15 px-2 font-semibold text-pink-500">
                  Modern
                </span>
              </div>
            </div>
          </motion.div>

          {/* Hero Card */}
          <motion.div variants={fadeUp}>
            <div className="rounded-2xl border border-border bg-card/70 p-6 shadow-soft backdrop-blur-md">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold">Operations Snapshot</h2>
                <div className="inline-flex rounded-xl border border-border bg-muted p-1">
                  {(['Today', 'Week', 'Month'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setSelected(t)}
                      className={cn(
                        'rounded-lg px-3 py-1 text-xs font-semibold',
                        selected === t
                          ? 'bg-primary text-white'
                          : 'text-subtext hover:bg-card'
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <StatCard title="Receipts" value="148" delta="+12%" tone="blue" />
                <StatCard title="Dispatch" value="96" delta="+5%" tone="green" />
                <StatCard title="Alerts" value="7" delta="-2" tone="pink" />
              </div>

              <div className="mt-6">
                <p className="text-xs font-semibold text-subtext">Throughput</p>
                <div className="mt-3 space-y-3">
                  <Bar label="Raw Material" value={78} />
                  <Bar label="Packaging" value={62} />
                  <Bar label="Finished Goods" value={49} />
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-border bg-muted/60 p-4">
                <p className="text-sm font-semibold">✅ What you should see</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-subtext">
                  <li>Card glass effect + shadows</li>
                  <li>Dark mode flips colors properly</li>
                  <li>Bars animate smoothly on load</li>
                  <li>Buttons have hover + focus rings</li>
                </ul>
              </div>
            </div>
          </motion.div>
        </motion.section>

        {/* Widgets grid */}
        <motion.section
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
          className="mt-10 grid gap-6 lg:grid-cols-3"
        >
          <motion.div variants={fadeUp} className="rounded-2xl border border-border bg-card/70 p-6 shadow-soft backdrop-blur-md">
            <h3 className="text-sm font-semibold">Activity Feed</h3>
            <p className="mt-1 text-xs text-subtext">Latest operational events</p>

            <div className="mt-4 space-y-3">
              <ActivityItem title="Material received" meta="Dock 2 • 4 mins ago" badge="MR" />
              <ActivityItem title="New item added" meta="RM Master • 18 mins ago" badge="NEW" />
              <ActivityItem title="Low stock warning" meta="Packaging • 1 hour ago" badge="!" />
              <ActivityItem title="Dispatch created" meta="FG • Today" badge="OUT" />
            </div>
          </motion.div>

          <motion.div variants={fadeUp} className="rounded-2xl border border-border bg-card/70 p-6 shadow-soft backdrop-blur-md">
            <h3 className="text-sm font-semibold">Quality Score</h3>
            <p className="mt-1 text-xs text-subtext">Animated gauge-style indicator</p>

            <div className="mt-6 grid place-items-center">
              <motion.div
                initial={{ scale: 0.94, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="relative grid h-40 w-40 place-items-center rounded-full border border-border bg-muted/60"
              >
                <motion.div
                  initial={{ rotate: -90 }}
                  animate={{ rotate: 210 }}
                  transition={{ duration: 1.1, ease: 'easeInOut' }}
                  className="absolute inset-3 rounded-full border-8 border-primary/30"
                />
                <div className="text-center">
                  <p className="text-3xl font-semibold text-text">92</p>
                  <p className="text-xs font-semibold text-subtext">Excellent</p>
                </div>
              </motion.div>
            </div>

            <div className="mt-6 flex items-center justify-between rounded-xl border border-border bg-bg/40 px-4 py-3 text-sm">
              <span className="text-subtext">Incidents</span>
              <span className="font-semibold text-text">2</span>
            </div>
          </motion.div>

          <motion.div variants={fadeUp} className="rounded-2xl border border-border bg-card/70 p-6 shadow-soft backdrop-blur-md">
            <h3 className="text-sm font-semibold">Action Center</h3>
            <p className="mt-1 text-xs text-subtext">Quick actions for testing</p>

            <div className="mt-4 grid gap-3">
              <ActionButton title="Fetch Sheet Data" desc="Calls your API route" />
              <ActionButton title="Append Items" desc="Validates headers + appends rows" />
              <ActionButton title="Material Received" desc="Reusable fetch function" />
            </div>

            <div className="mt-6 rounded-2xl bg-gradient-to-r from-primary/20 via-pink-500/10 to-green-500/10 p-4 ring-1 ring-border">
              <p className="text-sm font-semibold">Tip</p>
              <p className="mt-1 text-sm text-subtext">
                If dark mode looks washed out, confirm you’re using <code className="rounded bg-muted px-1">darkMode: 'class'</code>.
              </p>
            </div>
          </motion.div>
        </motion.section>

        {/* Footer CTA */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="mt-10"
        >
          <div className="rounded-2xl border border-border bg-card/70 p-6 shadow-soft backdrop-blur-md sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold">Looks good?</h3>
                <p className="mt-1 text-sm text-subtext">
                  Next step: integrate this styling into your real dashboard pages.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <motion.a
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  href="/"
                  className="rounded-xl border border-border bg-muted px-5 py-3 text-sm font-semibold text-text
                    hover:bg-muted/70 focus:outline-none focus:ring-2 focus:ring-ring/40"
                >
                  Home
                </motion.a>
                <motion.a
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  href="/login"
                  className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white
                    hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-ring/40"
                >
                  Open Login
                </motion.a>
              </div>
            </div>
          </div>
        </motion.section>
      </main>
    </div>
  );
}

/* ---------- Small UI components ---------- */

function toneClasses(tone: 'blue' | 'green' | 'pink') {
  if (tone === 'blue') return 'text-blue-500 bg-blue-500/15';
  if (tone === 'green') return 'text-green-500 bg-green-500/15';
  return 'text-pink-500 bg-pink-500/15';
}

function StatCard({
  title,
  value,
  delta,
  tone,
}: {
  title: string;
  value: string;
  delta: string;
  tone: 'blue' | 'green' | 'pink';
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="rounded-2xl border border-border bg-bg/40 p-4"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-subtext">{title}</p>
        <span className={cn('rounded-full px-2 py-1 text-xs font-semibold', toneClasses(tone))}>
          {delta}
        </span>
      </div>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </motion.div>
  );
}

function Bar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs font-semibold text-subtext">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="mt-2 h-2.5 w-full rounded-full bg-border/60">
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${value}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: 'easeInOut' }}
          className="h-2.5 rounded-full bg-primary"
        />
      </div>
    </div>
  );
}

function ActivityItem({ title, meta, badge }: { title: string; meta: string; badge: string }) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="flex items-start gap-3 rounded-xl border border-border bg-bg/40 px-4 py-3"
    >
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/15 text-xs font-bold text-primary ring-1 ring-border">
        {badge}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-text">{title}</p>
        <p className="truncate text-xs text-subtext">{meta}</p>
      </div>
    </motion.div>
  );
}

function ActionButton({ title, desc }: { title: string; desc: string }) {
  return (
    <motion.button
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.99 }}
      className="rounded-2xl border border-border bg-bg/40 p-4 text-left
        hover:bg-muted/60 focus:outline-none focus:ring-2 focus:ring-ring/40"
      type="button"
      onClick={() => {
        // Testing click
        // eslint-disable-next-line no-alert
        alert(`${title} clicked ✅`);
      }}
    >
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs text-subtext">{desc}</p>
    </motion.button>
  );
}
