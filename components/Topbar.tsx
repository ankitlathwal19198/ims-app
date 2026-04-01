"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import { FiBell, FiChevronDown, FiSun, FiMoon, FiSearch, FiCommand } from "react-icons/fi";
import { AiOutlineAppstoreAdd } from "react-icons/ai";
import { BiTransferAlt } from "react-icons/bi";
import { PiWarehouseFill } from "react-icons/pi";

const prefersReduced = () =>
  typeof window !== "undefined" &&
  !!window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function getModKeyLabel() {
  if (typeof window === "undefined") return "Ctrl";
  const platform = navigator?.platform?.toLowerCase?.() ?? "";
  return platform.includes("mac") ? "⌘" : "Ctrl";
}

type Tone = "warn" | "info" | "success";
type Notification = { id: number; title: string; detail: string; time: string; tone: Tone };
type Command = { label: string; href: string };

function cx(...s: (string | false | undefined | null)[]) {
  return s.filter(Boolean).join(" ");
}

export default function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const user = session?.user;

  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [search, setSearch] = useState("");

  const userBtnRef = useRef<HTMLButtonElement | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const notifBtnRef = useRef<HTMLButtonElement | null>(null);
  const notifMenuRef = useRef<HTMLDivElement | null>(null);
  const cmdRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

  const applyTheme = useCallback((t: "light" | "dark") => {
    document.documentElement.classList.toggle("dark", t === "dark");
    // keep your token system compatible too:
    document.documentElement.dataset.theme = t;
  }, []);

  // Theme init (single useEffect)
  useEffect(() => {
    try {
      const saved = (localStorage.getItem("app_theme") as "light" | "dark") || "light";
      setTheme(saved);
      applyTheme(saved);
    } catch {}
  }, [applyTheme]);

  const toggleTheme = useCallback(() => {
    const next: "light" | "dark" = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try { localStorage.setItem("app_theme", next); } catch {}
    applyTheme(next);
  }, [theme, applyTheme]);

  // Breadcrumbs
  const segments = useMemo(() => (pathname || "/").split("/").filter(Boolean), [pathname]);

  const crumbs = useMemo(() => {
    const out: { href: string; label: string; isLast: boolean }[] = [];
    let acc = "";
    segments.forEach((seg, i) => {
      acc += `/${seg}`;
      out.push({
        href: acc,
        label: seg
          .split("-")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(" "),
        isLast: i === segments.length - 1,
      });
    });
    return out;
  }, [segments]);

  // Shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape") {
        setMenuOpen(false);
        setNotifOpen(false);
        setCmdOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = search.trim();
    if (!q) return;
    router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  // Close menus on route change
  useEffect(() => {
    setMenuOpen(false);
    setNotifOpen(false);
    setCmdOpen(false);
  }, [pathname]);

  // Click outside
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node;

      if (userMenuRef.current && !userMenuRef.current.contains(t) && userBtnRef.current && !userBtnRef.current.contains(t)) {
        setMenuOpen(false);
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(t) && notifBtnRef.current && !notifBtnRef.current.contains(t)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const notifications: Notification[] = [
    { id: 1, title: "Stock threshold", detail: "Basmati 1121 below 33% at CHETRAM", time: "2m ago", tone: "warn" },
    { id: 2, title: "New entry", detail: "Planned stock updated for SKU BG-09", time: "23m ago", tone: "info" },
    { id: 3, title: "Finished goods", detail: "PK plant closed 12 crates", time: "1h ago", tone: "success" },
  ];

  const commands: Command[] = [
    { label: "Dashboard", href: "/" },
    { label: "IMS Master", href: "/app/ims" },
    { label: "Live Stock", href: "/app/live-stock" },
    { label: "Stores", href: "/app/stores" },
    { label: "Settings", href: "/app/settings" },
  ];

  const [cmdQuery, setCmdQuery] = useState("");
  const filteredCmd = useMemo(() => {
    const q = cmdQuery.toLowerCase().trim();
    if (!q) return commands;
    return commands.filter((c) => c.label.toLowerCase().includes(q));
  }, [cmdQuery, commands]);

  const motionOK = !prefersReduced();
  const MOD_KEYS = getModKeyLabel();

  if (status === "loading") {
    return (
      <header className="topbar sticky top-0 z-[30]">
        <div className="mx-auto flex h-[var(--topbar-height)] items-center justify-between px-3">
          <div className="h-9 w-[240px] rounded-xl bg-black/5 dark:bg-white/5 animate-pulse" />
          <div className="h-9 w-28 rounded-xl bg-black/5 dark:bg-white/5 animate-pulse" />
        </div>
      </header>
    );
  }

  const dropdownBase =
    "absolute right-0 top-[calc(100%+10px)] z-[60] min-w-[220px] rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card-bg))] p-2.5 text-[rgb(var(--text))] shadow-[var(--shadow-lg)]";

  const iconBtn =
    "relative inline-grid h-9 w-9 place-items-center rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card-bg))] text-[rgb(var(--text))] hover:bg-[rgb(var(--hover-bg))] focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--ring))]";

  return (
    <>
      <motion.header
        className="topbar sticky top-0 z-[30]"
        initial={motionOK ? { y: -10, opacity: 0 } : undefined}
        animate={motionOK ? { y: 0, opacity: 1 } : undefined}
        transition={{ duration: 0.18, ease: "easeOut" }}
      >
        <div className="mx-auto flex h-[var(--topbar-height)] items-center justify-between px-3 md:px-4">
          {/* LEFT */}
          <div className="flex min-w-0 items-center gap-2.5">
            {/* Breadcrumb chip */}
            <nav
              aria-label="Breadcrumb"
              className="hidden sm:flex min-w-0 items-center gap-1.5 whitespace-nowrap text-[12px] text-[rgb(var(--lynch))]"
            >
              <Link
                href="/"
                className="rounded-lg px-2 py-1 hover:bg-[rgb(var(--hover-bg))] hover:text-[rgb(var(--text))]"
              >
                Home
              </Link>

              {crumbs.map(({ href, label, isLast }) => (
                <span key={href} className="inline-flex min-w-0 items-center gap-1.5">
                  <span className="opacity-60">/</span>
                  {isLast ? (
                    <span
                      aria-current="page"
                      className="max-w-[18rem] overflow-hidden text-ellipsis rounded-lg bg-[rgb(var(--primary-light))] px-2 py-1 font-semibold text-[rgb(var(--text))] dark:bg-white/5"
                      title={label}
                    >
                      {label}
                    </span>
                  ) : (
                    <Link
                      href={href}
                      className="rounded-lg px-2 py-1 hover:bg-[rgb(var(--hover-bg))] hover:text-[rgb(var(--text))]"
                    >
                      {label}
                    </Link>
                  )}
                </span>
              ))}
            </nav>
          </div>

          {/* RIGHT */}
          <div className="inline-flex items-center gap-2">
            {/* Search pill */}
            <form onSubmit={onSearchSubmit} role="search" className="relative hidden md:block w-[clamp(240px,28vw,420px)]">
              <FiSearch
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[rgb(var(--bayoux))]"
                aria-hidden
              />
              <input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                aria-label="Search"
                className="h-9 w-full rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card-bg))] pl-9 pr-16 text-[14px] text-[rgb(var(--text))]
                           shadow-[var(--shadow-sm)] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ring))]"
              />
              <span
                className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded-xl border border-[rgb(var(--border))]
                           bg-[rgb(var(--card-bg))] px-2 py-0.5 text-[11px] text-[rgb(var(--lynch))]"
              >
                {MOD_KEYS}+K
              </span>
            </form>

            {/* Quick actions (better chips) */}
            <div className="hidden lg:inline-flex items-center gap-2">
              <Link
                href="/app/ims-master/add"
                className="inline-flex items-center gap-2 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card-bg))] px-3 py-2 text-[13px]
                           text-[rgb(var(--text))] shadow-[var(--shadow-sm)] hover:bg-[rgb(var(--hover-bg))]"
              >
                <AiOutlineAppstoreAdd />
                <span>Add Item</span>
              </Link>

              <Link
                href="/inventory-entry"
                className="inline-flex items-center gap-2 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card-bg))] px-3 py-2 text-[13px]
                           text-[rgb(var(--text))] shadow-[var(--shadow-sm)] hover:bg-[rgb(var(--hover-bg))]"
              >
                <BiTransferAlt />
                <span>In - Out</span>
              </Link>

              <Link
                href="/stores"
                className="inline-flex items-center gap-2 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card-bg))] px-3 py-2 text-[13px]
                           text-[rgb(var(--text))] shadow-[var(--shadow-sm)] hover:bg-[rgb(var(--hover-bg))]"
              >
                <PiWarehouseFill />
                <span>Stores</span>
              </Link>
            </div>

            {/* Theme */}
            <button
              type="button"
              className={iconBtn}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
              onClick={toggleTheme}
              title="Toggle theme"
            >
              <span className="[filter:var(--icon-drop)]">
                {theme === "dark" ? <FiSun /> : <FiMoon />}
              </span>
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                ref={notifBtnRef}
                type="button"
                className={iconBtn}
                aria-haspopup="menu"
                aria-expanded={notifOpen}
                aria-controls="notif-menu"
                onClick={() => setNotifOpen((v) => !v)}
                title="Notifications"
              >
                <FiBell />
                {notifications.length > 0 && (
                  <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[rgb(var(--redPink))] px-1 text-[10px] text-white">
                    {notifications.length}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {notifOpen && (
                  <motion.div
                    id="notif-menu"
                    role="menu"
                    ref={notifMenuRef}
                    className={dropdownBase}
                    initial={motionOK ? { opacity: 0, y: -6, scale: 0.98 } : undefined}
                    animate={motionOK ? { opacity: 1, y: 0, scale: 1 } : undefined}
                    exit={motionOK ? { opacity: 0, y: -6, scale: 0.98 } : undefined}
                    transition={{ duration: 0.16 }}
                  >
                    <div className="flex items-center justify-between px-1 pb-2">
                      <span className="text-[14px] font-extrabold">Notifications</span>
                      <span className="rounded-full border border-[rgb(var(--border))] px-2 py-0.5 text-[12px] text-[rgb(var(--lynch))]">
                        {notifications.length}
                      </span>
                    </div>

                    <ul className="grid max-h-[340px] gap-2 overflow-auto pr-1">
                      {notifications.map((n) => (
                        <li
                          key={n.id}
                          className={cx(
                            "rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card-bg))] p-2.5 shadow-[var(--shadow-sm)]",
                            n.tone === "warn" && "border-l-[3px] border-l-orange-500",
                            n.tone === "info" && "border-l-[3px] border-l-blue-500",
                            n.tone === "success" && "border-l-[3px] border-l-green-600"
                          )}
                        >
                          <div className="text-[13px] font-extrabold">{n.title}</div>
                          <div className="mt-0.5 text-[12px] text-[rgb(var(--lynch))]">{n.detail}</div>
                          <div className="mt-1 text-[11px] text-[rgb(var(--bayoux))]">{n.time}</div>
                        </li>
                      ))}
                    </ul>

                    <div className="pt-2 text-right">
                      <Link href="/notifications" className="text-[12px] font-semibold text-[rgb(var(--primary))] hover:underline">
                        View all
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Command palette */}
            <button
              type="button"
              className={iconBtn}
              onClick={() => setCmdOpen(true)}
              title="Command palette"
              aria-label="Open command palette"
            >
              <FiCommand />
            </button>

            {/* User menu */}
            <div className="relative">
              <button
                ref={userBtnRef}
                type="button"
                className="inline-flex items-center gap-2 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card-bg))] px-2 py-1 pl-1 text-[rgb(var(--text))]
                           shadow-[var(--shadow-sm)] hover:bg-[rgb(var(--hover-bg))] focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--ring))]"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-controls="user-menu"
                onClick={() => setMenuOpen((v) => !v)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={user?.image || "/avatar.png"}
                  alt={user?.name ? `${user.name} avatar` : "User avatar"}
                  className="h-8 w-8 rounded-full object-cover border border-[rgb(var(--border))]"
                />
                <span className="hidden max-w-[160px] overflow-hidden text-ellipsis whitespace-nowrap text-[14px] font-bold md:inline">
                  {user?.name || "User"}
                </span>
                <FiChevronDown className="text-[rgb(var(--lynch))]" />
              </button>

              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    id="user-menu"
                    role="menu"
                    ref={userMenuRef}
                    className={dropdownBase}
                    initial={motionOK ? { opacity: 0, y: -6, scale: 0.98 } : undefined}
                    animate={motionOK ? { opacity: 1, y: 0, scale: 1 } : undefined}
                    exit={motionOK ? { opacity: 0, y: -6, scale: 0.98 } : undefined}
                    transition={{ duration: 0.16 }}
                  >
                    <div className="px-1 py-1.5">
                      <p className="m-0 text-[14px] font-extrabold" title={user?.name ?? ""}>
                        {user?.name || "User"}
                      </p>
                      <p className="m-0 text-[12px] text-[rgb(var(--lynch))]" title={user?.email ?? ""}>
                        {user?.email || "—"}
                      </p>
                    </div>

                    <div className="my-2 h-px bg-[rgb(var(--border))]" />

                    <Link role="menuitem" className="block rounded-xl px-2 py-2 text-[14px] hover:bg-[rgb(var(--hover-bg))]" href="/settings">
                      Profile
                    </Link>
                    <Link role="menuitem" className="block rounded-xl px-2 py-2 text-[14px] hover:bg-[rgb(var(--hover-bg))]" href="/settings">
                      Settings
                    </Link>

                    <div className="my-2 h-px bg-[rgb(var(--border))]" />

                    <button
                      role="menuitem"
                      className="w-full rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--redPink))] px-3 py-2 text-[14px] font-extrabold text-white hover:brightness-95"
                      onClick={() => signOut({ callbackUrl: "/login" })}
                    >
                      Sign Out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Command palette modal */}
      <AnimatePresence>
        {cmdOpen && (
          <motion.div
            className="fixed inset-0 z-[80] grid place-items-start justify-center bg-black/40 pt-[10vh] backdrop-blur-[2px]"
            initial={motionOK ? { opacity: 0 } : undefined}
            animate={motionOK ? { opacity: 1 } : undefined}
            exit={motionOK ? { opacity: 0 } : undefined}
            onClick={() => setCmdOpen(false)}
          >
            <motion.div
              ref={cmdRef}
              role="dialog"
              aria-modal="true"
              aria-label="Command palette"
              className="w-[min(720px,92vw)] rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card-bg))] p-2.5 text-[rgb(var(--text))] shadow-[var(--shadow-xl)]"
              initial={motionOK ? { opacity: 0, y: -10, scale: 0.98 } : undefined}
              animate={motionOK ? { opacity: 1, y: 0, scale: 1 } : undefined}
              exit={motionOK ? { opacity: 0, y: -10, scale: 0.98 } : undefined}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 border-b border-dashed border-[rgb(var(--border))] px-2 py-2">
                <FiCommand />
                <input
                  autoFocus
                  className="flex-1 bg-transparent px-2 py-1 text-[14px] text-[rgb(var(--text))] outline-none"
                  placeholder="Type a command…"
                  value={cmdQuery}
                  onChange={(e) => setCmdQuery(e.target.value)}
                />
              </div>

              <ul className="mt-2 max-h-[52vh] list-none overflow-auto p-0 pr-1">
                {filteredCmd.map((c) => (
                  <li key={c.href}>
                    <Link
                      className="block rounded-xl px-3 py-2.5 text-[14px] hover:bg-[rgb(var(--hover-bg))]"
                      href={c.href}
                      onClick={() => setCmdOpen(false)}
                    >
                      {c.label}
                    </Link>
                  </li>
                ))}
                {filteredCmd.length === 0 && (
                  <li className="px-3 py-3 text-center text-[14px] text-[rgb(var(--lynch))]">No matches</li>
                )}
              </ul>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
