"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FaChevronDown, FaCheck } from "react-icons/fa";

type Option = { label: string; value: string; count?: number };

type Props = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;

  /** visuals */
  minWidthClassName?: string; // e.g. "min-w-[170px]"
  className?: string;

  /** right side counts (e.g. All = total items, others = filtered counts) */
  showCounts?: boolean;
};

const softRing =
  "outline-none focus:ring-4 focus:ring-black/10 dark:focus:ring-white/10 focus:border-black/10 dark:focus:border-white/10";
const subtleText = "text-black/55 dark:text-white/55";

export default function CustomDropdown({
  label,
  value,
  onChange,
  options,
  placeholder = "Select...",
  disabled,
  minWidthClassName = "",
  // minWidthClassName = "min-w-[170px]",

  className = "",
  showCounts = true,
}: Props) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);

  const selected = useMemo(() => options.find((o) => o.value === value), [options, value]);

  // Close on outside click
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!t) return;
      if (btnRef.current?.contains(t)) return;
      if (popRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // ESC to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const handlePick = (v: string) => {
    onChange(v);
    setOpen(false);
    // focus back to button
    requestAnimationFrame(() => btnRef.current?.focus());
  };

  return (
    <div className={`relative inline-block w-fit ${minWidthClassName}`}>
      {label ? <div className={`mb-1 text-[12px] font-bold ${subtleText}`}>{label}</div> : null}

      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((p) => !p)}
        className={`
          h-9 w-fit min-w-[120px] max-w-[min(92vw,520px)]
          rounded-2xl border border-black/10 dark:border-white/10
          bg-white/70 dark:bg-white/5 px-3 text-[13px] font-black
          text-black/80 dark:text-white shadow-[0_10px_24px_rgba(0,0,0,0.06)]
          hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed
          inline-flex items-center justify-between gap-2 ${softRing} ${className}
        `}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {/* selected value show */}
        <span className="whitespace-nowrap">
          {selected?.label ?? selected?.value ?? (value ? value : placeholder)}
        </span>

        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.16 }}
          className="opacity-80"
        >
          <FaChevronDown />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={popRef}
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className={`
              absolute z-[9999] mt-2
              w-max min-w-full max-w-[min(92vw,560px)]
              overflow-hidden rounded-3xl
              border border-black/10 dark:border-white/10
              bg-white/95 dark:bg-[#0B0F19]/95 backdrop-blur-xl
              shadow-[0_18px_45px_rgba(0,0,0,0.14)] dark:shadow-[0_22px_60px_rgba(0,0,0,0.55)]
            `}
            role="listbox"
          >
            <div className="max-h-[320px] overflow-auto p-1.5">
              {options.map((o) => {
                const active = o.value === value;
                return (
                  <button
                    key={`${o.value}`}
                    type="button"
                    onClick={() => handlePick(o.value)}
                    className={`
                      w-full rounded-2xl px-3 py-2 text-left
                      text-[13px] font-black
                      ${active ? "bg-black/5 dark:bg-white/10" : "hover:bg-black/5 dark:hover:bg-white/10"}
                      text-black/85 dark:text-white
                      flex items-center gap-2
                    `}
                  >
                    <span className="w-4 shrink-0 opacity-80">{active ? <FaCheck /> : null}</span>

                    {/* IMPORTANT: remove truncate so full option shows */}
                    <span className="flex-1 whitespace-nowrap">{o.label}</span>

                    {showCounts ? (
                      <span className="shrink-0 rounded-full border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 px-2 py-0.5 text-[11px] font-black text-black/60 dark:text-white/70">
                        {Number.isFinite(o.count as number) ? o.count : "-"}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}