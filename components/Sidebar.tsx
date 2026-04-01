"use client";

import React, { useCallback, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiMenu } from "react-icons/fi";
import { AnimatePresence, motion } from "framer-motion";
import {
  TbLayoutDashboard,
  TbDatabase,
  TbPackages,
  TbArrowsLeftRight,
  TbFileSpreadsheet,
  TbAlertTriangle,
  TbBuildingWarehouse,
  TbSettings,
} from "react-icons/tb";

type ColorKey =
  | "blue"
  | "purple"
  | "teal"
  | "orange"
  | "indigo"
  | "pink"
  | "cyan"
  | "green"
  | "slate";

type RouteItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  color: ColorKey;
};

const sidebarRoutes: RouteItem[] = [
  { href: "/app/", label: "Dashboard", icon: TbLayoutDashboard, color: "blue" },
  { href: "/app/ims-master", label: "IMS Master", icon: TbDatabase, color: "purple" },
  { href: "/app/live-stock", label: "Live Stock", icon: TbPackages, color: "teal" },
  { href: "/app/inventory-entry", label: "In - Out", icon: TbArrowsLeftRight, color: "orange" },
  { href: "/app/inventory-form-responses", label: "Stock entries", icon: TbFileSpreadsheet, color: "indigo" },
  { href: "/app/damage-material-form", label: "Damage", icon: TbAlertTriangle, color: "pink" },
  { href: "/app/damage-material-form-responses", label: "Damage Entries", icon: TbFileSpreadsheet, color: "cyan" },
  { href: "/app/stores", label: "Stores", icon: TbBuildingWarehouse, color: "green" },
  { href: "/app/settings", label: "Settings", icon: TbSettings, color: "slate" },
];

const STORAGE_KEY = "sidebar_collapsed";

function badgeGradient(color: ColorKey) {
  switch (color) {
    case "blue":
      return "linear-gradient(135deg,#60a5fa 0%,#2563eb 100%)";
    case "purple":
      return "linear-gradient(135deg,#a78bfa 0%,#7c3aed 100%)";
    case "indigo":
      return "linear-gradient(135deg,#818cf8 0%,#4f46e5 100%)";
    case "pink":
      return "linear-gradient(135deg,#f472b6 0%,#db2777 100%)";
    case "orange":
      return "linear-gradient(135deg,#fb923c 0%,#ea580c 100%)";
    case "teal":
      return "linear-gradient(135deg,#2dd4bf 0%,#0d9488 100%)";
    case "cyan":
      return "linear-gradient(135deg,#22d3ee 0%,#0891b2 100%)";
    case "green":
      return "linear-gradient(135deg,#86efac 0%,#16a34a 100%)";
    case "slate":
    default:
      return "linear-gradient(135deg,#cbd5e1 0%,#64748b 100%)";
  }
}

function SidebarInner({
  collapsed,
  persistCollapsed,
  onNavigate,
}: {
  collapsed: boolean;
  persistCollapsed: (v: boolean) => void;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const isActive = useCallback((href: string) => pathname === href, [pathname]);

  return (
    <>
      {/* Brand / Collapse */}
      <div className="mb-5 flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-3" title="H.R. Exports" aria-label="H.R. Exports">
          <span className="h-[10px] w-[10px] rounded-full bg-[var(--c-primary)] shadow-[0_0_10px_rgba(0,0,0,0.12)]" />

          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.span
                key="brand"
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.18 }}
                className="whitespace-nowrap text-[18px] font-extrabold tracking-[.3px] text-[var(--c-primary)]"
              >
                H.R. Exports
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Collapse button */}
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => persistCollapsed(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand" : "Collapse"}
          className="inline-grid h-[32px] w-[32px] place-items-center rounded-[12px]
                     border border-[var(--c-border)] bg-[var(--c-card)]
                     text-[var(--c-text)] hover:bg-[var(--c-hover)]
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--ring))]"
        >
          <motion.span
            animate={{ rotate: collapsed ? 135 : -45 }}
            transition={{ type: "spring", stiffness: 520, damping: 28 }}
            className="h-2 w-2 border-b-2 border-r-2 border-[var(--c-text)]"
          />
        </motion.button>
      </div>

      {/* Nav */}
      <nav className="flex flex-col pr-1">
        {sidebarRoutes.map(({ href, label, icon: Icon, color }) => {
          const active = isActive(href);

          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              title={collapsed ? label : undefined}
              className={[
                "group relative grid items-center rounded-[14px] outline-none",
                collapsed
                  ? "grid-cols-[34px] justify-items-center px-2.5 py-3"
                  : "grid-cols-[34px_1fr] gap-4 px-3 py-3",
                "transition-colors duration-200",
                "hover:bg-[var(--c-hover)]",
                active ? "text-[var(--c-primary)]" : "text-[var(--c-text)]",
                "focus-visible:ring-2 focus-visible:ring-[rgb(var(--ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--c-card)]",
              ].join(" ")}
            >
              {/* Active glow background */}
              <AnimatePresence initial={false}>
                {active && (
                  <motion.span
                    aria-hidden
                    className="absolute inset-0 rounded-[14px]"
                    initial={{ opacity: 0, scale: 0.985 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.985 }}
                    transition={{ duration: 0.18 }}
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(var(--primary),0.18), rgba(var(--primary),0.06))",
                      boxShadow: "0 16px 34px rgba(0,0,0,0.10)",
                    }}
                  />
                )}
              </AnimatePresence>

              {/* Active left bar */}
              <motion.span
                aria-hidden
                initial={false}
                animate={{ opacity: active ? 1 : 0, scaleY: active ? 1 : 0.6 }}
                transition={{ duration: 0.18 }}
                className="absolute -left-2 top-2 bottom-2 w-[3px] rounded bg-[var(--c-primary)]"
              />

              {/* Icon badge */}
              <motion.span
                aria-hidden
                whileHover={{ y: -1 }}
                transition={{ type: "spring", stiffness: 420, damping: 24 }}
                style={{ background: badgeGradient(color) }}
                className="relative z-[1] grid h-[34px] w-[34px] place-items-center rounded-[12px]
                           shadow-[0_12px_24px_rgba(0,0,0,0.10)]"
              >
                <span className="text-white">
                  <Icon size={18} />
                </span>
              </motion.span>

              {/* Label */}
              <AnimatePresence initial={false}>
                {!collapsed && (
                  <motion.span
                    key={`${href}-label`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.16 }}
                    className="relative z-[1] whitespace-nowrap font-semibold"
                  >
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>

              {/* Active underline */}
              <motion.span
                aria-hidden
                className="absolute left-3 right-3 bottom-1 h-[2px] rounded-full"
                initial={false}
                animate={{ opacity: active ? 1 : 0, scaleX: active ? 1 : 0.35 }}
                transition={{ duration: 0.18 }}
                style={{
                  background:
                    "linear-gradient(90deg, rgba(var(--primary),0), rgba(var(--primary),0.85), rgba(var(--primary),0))",
                  transformOrigin: "center",
                }}
              />

              {/* Tooltip (collapsed mode, desktop) */}
              {collapsed && (
                <span className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 hidden -translate-y-1/2 md:block">
                  <span
                    className="sidebar-tip rounded-xl border border-[var(--c-border)] bg-[var(--c-card)]
                               px-2.5 py-1.5 text-[12px] font-semibold text-[var(--c-primary)]
                               shadow-[0_14px_40px_rgba(0,0,0,0.16)]"
                  >
                    {label}
                  </span>
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex justify-center border-t border-dashed border-[var(--c-border)] pt-3">
        <span className="text-[12px] text-[var(--c-lynch)]">v1.0.0</span>
      </div>
    </>
  );
}

export default function Sidebar({
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
}: {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
}) {
  const persistCollapsed = useCallback(
    (val: boolean) => {
      setCollapsed(val);
      try {
        localStorage.setItem(STORAGE_KEY, val ? "1" : "0");
      } catch {}
    },
    [setCollapsed]
  );

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) setMobileOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [setMobileOpen]);

  const sbWidth = 240;
  const sbRail = 76;
  const targetW = collapsed ? sbRail : sbWidth;

  return (
    <>
      {/* Hamburger (mobile only) */}
      <motion.button
        aria-label="Toggle navigation"
        onClick={() => setMobileOpen(!mobileOpen)}
        whileTap={{ scale: 0.94 }}
        className="fixed left-4 top-3 z-[70] inline-flex items-center text-[24px] text-[var(--c-primary)] md:hidden"
      >
        <motion.span
          animate={{ rotate: mobileOpen ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 520, damping: 30 }}
          className="inline-flex"
        >
          <FiMenu />
        </motion.span>
      </motion.button>

      {/* Backdrop (mobile) */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="fixed inset-0 z-[60] md:hidden bg-black/40 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Desktop sidebar (animate width) */}
      <motion.aside
        aria-label="Main navigation"
        className="hidden md:flex sticky top-0 h-[100dvh] flex-col
                   bg-[var(--c-card)] text-[var(--c-text)]
                   px-3.5 py-5 border-r border-[var(--c-border)]"
        animate={{ width: targetW }}
        transition={{ type: "spring", stiffness: 420, damping: 34 }}
        style={{
          width: targetW,
          borderColor: "var(--c-border)",
          willChange: "width",
        }}
      >
        <SidebarInner collapsed={collapsed} persistCollapsed={persistCollapsed} />
      </motion.aside>

      {/* Mobile sidebar (slide) */}
      <motion.aside
        aria-label="Mobile navigation"
        className="md:hidden fixed left-0 top-0 bottom-0 z-[65] flex flex-col
                   bg-[var(--c-card)] text-[var(--c-text)]
                   px-3.5 py-5 border-r border-[var(--c-border)]"
        style={{
          width: targetW,
          borderColor: "var(--c-border)",
          willChange: "transform",
        }}
        initial={false}
        animate={{ x: mobileOpen ? 0 : -targetW - 48 }}
        transition={{ type: "spring", stiffness: 420, damping: 36 }}
      >
        <SidebarInner
          collapsed={collapsed}
          persistCollapsed={persistCollapsed}
          onNavigate={() => setMobileOpen(false)}
        />
      </motion.aside>
    </>
  );
}
