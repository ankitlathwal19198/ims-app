'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

const STORAGE_KEY = "sidebar_collapsed";

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // read persisted collapsed
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved !== null) setCollapsed(saved === "1");
    } catch {}
  }, []);

  const sbWidth = collapsed ? 76 : 240;

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-[var(--background)]">
      {/* Desktop sidebar column (takes space) */}
      <div
        className="hidden md:block shrink-0 border-r border-[var(--border)] bg-[var(--card-bg)]"
        style={{ width: sbWidth }}
      >
        <Sidebar
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
        />
      </div>

      {/* Main */}
      <div className="relative flex min-w-0 flex-1 flex-col bg-[var(--background)]">
        <div className="flex-none min-w-0">
          <Topbar
          //  onHamburger={() => setMobileOpen(true)}
            />
        </div>

        <div className="flex-1 min-w-0 overflow-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
          <div className="min-w-0 max-w-full">{children}</div>
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      <div className="md:hidden">
        <Sidebar
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
        />
      </div>
    </div>
  );
}
