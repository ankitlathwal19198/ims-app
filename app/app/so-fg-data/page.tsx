"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { FaSort, FaSortDown, FaSortUp, FaCheckCircle } from "react-icons/fa";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchSalesOrder } from "@/store/slices/salesOrderSlice";
import { fetchFinishedGoods } from "@/store/slices/finishedGoodsSlice";
import { fetchMaterialReceived } from "@/store/slices/materialReceivedSlice";

import type { FinishedGoodsRow, MaterialReceivedRow, SalesOrderRow, SOComputedLine } from "@/types";
import SoLineModal from "@/components/SoLineModal";

/** ---------- utils ---------- */
function toNum(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function normalizeCode(v: any) {
  return String(v ?? "").trim();
}
function parseMultiplier(packSize: string | undefined): number {
  const s = String(packSize ?? "").trim();
  if (!s) return 1;
  const m = /^(\d+)\s*[x×X]\s*\d+/.exec(s);
  if (m) return Math.max(1, Number(m[1]));
  return 1;
}
function exportCSV(rows: any[]) {
  if (!rows?.length) return;
  const keys = Array.from(new Set(rows.flatMap(Object.keys))).sort();
  const esc = (v: any) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [keys.join(","), ...rows.map((r) => keys.map((k) => esc(r[k])).join(","))].join("\r\n");
  const blob = new Blob([lines], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sales_order_wise_${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

type SortConfig = { key: keyof (SOComputedLine & { approved_so?: string; pack_type?: string }) | ""; direction: "asc" | "desc" };

function normalizeStatus(v: any): "approved" | "other" {
  const s = String(v ?? "").trim().toLowerCase();
  if (s.includes("approv")) return "approved";
  return "other";
}

/** Pack type colors */
const getPackTypeColor = (type?: string) => {
  const t = String(type ?? "").trim().toUpperCase();
  switch (t) {
    case "BOPP":
      return "bg-sky-500/15 text-sky-700 dark:text-sky-200 border-sky-500/30";
    case "HDPE":
      return "bg-indigo-500/15 text-indigo-700 dark:text-indigo-200 border-indigo-500/30";
    case "JAR":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-200 border-emerald-500/30";
    case "JUTE BROWN":
      return "bg-amber-600/15 text-amber-800 dark:text-amber-300 border-amber-600/30";
    case "JUTE WHITE":
      return "bg-stone-400/20 text-stone-700 dark:text-stone-200 border-stone-400/30";
    case "KTC BOX":
      return "bg-violet-500/15 text-violet-700 dark:text-violet-200 border-violet-500/30";
    case "NONWOVEN":
      return "bg-teal-500/15 text-teal-700 dark:text-teal-200 border-teal-500/30";
    case "PLASTIC POUCH":
      return "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-200 border-fuchsia-500/30";
    default:
      return "bg-slate-500/15 text-slate-700 dark:text-slate-200 border-slate-500/30";
  }
};

/** FG completion filter */
type FGFilter = "all" | "partial" | "complete" | "extra";

function fgCompletion(plannedBags: number, packedBags: number): Exclude<FGFilter, "all"> {
  const p = toNum(plannedBags);
  const k = toNum(packedBags);

  if (p <= 0 && k > 0) return "extra";
  if (p <= 0 && k <= 0) return "partial"; // effectively empty/unknown
  if (k === p) return "complete";
  if (k < p) return "partial";
  return "extra";
}

export default function SalesOrderWiseDataPage() {
  const dispatch = useAppDispatch();

  const so = useAppSelector((s) => s.salesOrder.data);
  const soLoading = useAppSelector((s) => s.salesOrder.loading);
  const soError = useAppSelector((s) => s.salesOrder.error);

  const fg = useAppSelector((s) => s.finishedGoods.data);
  const fgLoading = useAppSelector((s) => s.finishedGoods.loading);
  const fgError = useAppSelector((s) => s.finishedGoods.error);

  const mr = useAppSelector((s) => s.materialReceived.data);
  const mrLoading = useAppSelector((s) => s.materialReceived.loading);
  const mrError = useAppSelector((s) => s.materialReceived.error);

  useEffect(() => {
    dispatch(fetchSalesOrder());
    dispatch(fetchFinishedGoods());
    dispatch(fetchMaterialReceived());
  }, [dispatch]);

  const loading = soLoading || fgLoading || mrLoading;
  const error = soError || fgError || mrError;

  /** ---------- iOS / SaaS theme helpers ---------- */
  const card =
    "rounded-3xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-[#0B0F19]/70 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.06)] dark:shadow-[0_18px_50px_rgba(0,0,0,0.45)]";
  const softRing =
    "outline-none focus:ring-4 focus:ring-black/10 dark:focus:ring-white/10 focus:border-black/10 dark:focus:border-white/10";
  const subtleText = "text-[rgb(var(--lynch))] dark:text-white/55";

  /** ---------- MR aggregate by code ---------- */
  const mrByCode = useMemo(() => {
    const map = new Map<string, number>();
    const rows = Array.isArray(mr) ? (mr as MaterialReceivedRow[]) : [];
    for (const r of rows as any[]) {
      const code = normalizeCode(r.item_code);
      if (!code) continue;
      map.set(code, (map.get(code) ?? 0) + toNum(r.qty_act ?? r.qty_as_per_bill));
    }
    return map;
  }, [mr]);

  /**
   * ---------- OPTIMIZED FG INDEX ----------
   * ✅ using fg.sales_order_no & fg.sales_order_item_no (your latest requirement)
   * key = `${sales_order_no}__${sales_order_item_no}`
   */
  const fgPackedBySoItem = useMemo(() => {
    const map = new Map<string, number>();
    const rows = Array.isArray(fg) ? (fg as FinishedGoodsRow[]) : [];
    for (const r of rows as any[]) {
      const soNo = String(r.sales_order_no ?? "").trim();
      const itemNo = String(r.sales_order_item_no ?? "").trim();
      if (!soNo || !itemNo) continue;
      const key = `${soNo}__${itemNo}`;
      map.set(key, (map.get(key) ?? 0) + toNum(r.quantity_packed));
    }
    return map;
  }, [fg]);

  const fgRowsBySoItem = useMemo(() => {
    const map = new Map<string, FinishedGoodsRow[]>();
    const rows = Array.isArray(fg) ? (fg as FinishedGoodsRow[]) : [];
    for (const r of rows as any[]) {
      const soNo = String(r.sales_order_no ?? "").trim();
      const itemNo = String(r.sales_order_item_no ?? "").trim();
      if (!soNo || !itemNo) continue;
      const key = `${soNo}__${itemNo}`;
      const arr = map.get(key) ?? [];
      arr.push(r);
      map.set(key, arr);
    }
    return map;
  }, [fg]);

  /** ---------- computed lines (ONLY APPROVED SO) ---------- */
  const lines = useMemo(() => {
    const sales = Array.isArray(so) ? (so as SalesOrderRow[]) : [];

    return (sales as any[])
      .filter((row) => normalizeStatus(row.approved_so) === "approved") // ✅ remove cancelled/pending totally
      .map((row) => {
        const sales_order = String(row.sales_order ?? "").trim();
        const item_number = String(row.item_number ?? "").trim();

        const pack_size_raw = String(row.pack_size ?? "").trim();
        const pack_type_raw = String(row.pack_type ?? "").trim();
        const multiplier = parseMultiplier(pack_size_raw);

        const planned_bags = toNum(row.bags);

        const item_code = normalizeCode(row.item_code) || "";
        const inner_code = normalizeCode(row.inner_code) || "";
        const outer_code = normalizeCode(row.outer_code) || "";

        const approved_so = String(row.approved_so ?? "").trim();

        const planned_item_qty = planned_bags * multiplier;
        const planned_inner_qty = planned_bags * multiplier;
        const planned_outer_qty = planned_bags;

        const fgKey = `${sales_order}__${item_number}`;
        const packed_bags = fgPackedBySoItem.get(fgKey) ?? 0;

        const packed_item_qty = packed_bags * multiplier;
        const packed_inner_qty = packed_bags * multiplier;
        const packed_outer_qty = packed_bags;

        const balance_item_qty = planned_item_qty - packed_item_qty;
        const balance_inner_qty = planned_inner_qty - packed_inner_qty;
        const balance_outer_qty = planned_outer_qty - packed_outer_qty;

        const mr_item_qty = item_code ? (mrByCode.get(item_code) ?? 0) : 0;
        const mr_inner_qty = inner_code ? (mrByCode.get(inner_code) ?? 0) : 0;
        const mr_outer_qty = outer_code ? (mrByCode.get(outer_code) ?? 0) : 0;

        const mr_balance_item = mr_item_qty - packed_item_qty;
        const mr_balance_inner = mr_inner_qty - packed_inner_qty;
        const mr_balance_outer = mr_outer_qty - packed_outer_qty;

        return {
          sales_order: sales_order || "-",
          item_number: item_number || "-",

          pack_size: pack_size_raw || "-",
          pack_type: pack_type_raw || "",
          multiplier,

          approved_so,

          item_code,
          inner_code,
          outer_code,

          planned_bags,
          planned_item_qty,
          planned_inner_qty,
          planned_outer_qty,

          packed_bags,
          packed_item_qty,
          packed_inner_qty,
          packed_outer_qty,

          balance_item_qty,
          balance_inner_qty,
          balance_outer_qty,

          mr_item_qty,
          mr_inner_qty,
          mr_outer_qty,

          mr_balance_item,
          mr_balance_inner,
          mr_balance_outer,
        } as SOComputedLine & { approved_so?: string; pack_type?: string };
      });
  }, [so, fgPackedBySoItem, mrByCode]);

  /** ---------- UI state ---------- */
  const [search, setSearch] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(30);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortConfig>({ key: "", direction: "asc" });

  // ✅ NEW: FG completion filter capsules
  const [fgFilter, setFgFilter] = useState<FGFilter>("all");

  /** ---------- modal ---------- */
  const [modalOpen, setModalOpen] = useState(false);
  const [activeLine, setActiveLine] = useState<(SOComputedLine & { approved_so?: string; pack_type?: string }) | null>(null);
  const [activeFGRows, setActiveFGRows] = useState<FinishedGoodsRow[]>([]);

  const openModal = (line: any) => {
    const k = `${String(line.sales_order ?? "").trim()}__${String(line.item_number ?? "").trim()}`;
    setActiveLine(line);
    setActiveFGRows(fgRowsBySoItem.get(k) ?? []);
    setModalOpen(true);
  };

  /** ---------- filtering/sorting ---------- */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    let byText = !q
      ? lines
      : lines.filter((r: any) => Object.values(r).some((v) => String(v ?? "").toLowerCase().includes(q)));

    // FG completion filter
    if (fgFilter !== "all") {
      byText = byText.filter((r: any) => fgCompletion(r.planned_bags, r.packed_bags) === fgFilter);
    }

    return byText;
  }, [lines, search, fgFilter]);

  const sorted = useMemo(() => {
    if (!sort.key) return filtered;
    const dir = sort.direction === "asc" ? 1 : -1;
    const key = sort.key;

    return [...filtered].sort((a: any, b: any) => {
      const av = a[key];
      const bv = b[key];
      const an = Number(av);
      const bn = Number(bv);
      const bothNum = Number.isFinite(an) && Number.isFinite(bn);
      if (bothNum) return dir * (an - bn);
      return dir * String(av ?? "").localeCompare(String(bv ?? ""), undefined, { numeric: true, sensitivity: "base" });
    });
  }, [filtered, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / rowsPerPage));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * rowsPerPage;
  const end = Math.min(sorted.length, start + rowsPerPage);
  const current = useMemo(() => sorted.slice(start, end), [sorted, start, end]);

  const handleSort = useCallback((key: any) => {
    setSort((p) => {
      const dir = p.key === key && p.direction === "asc" ? "desc" : "asc";
      return { key, direction: dir };
    });
  }, []);
  const sortIcon = (key: any) => {
    if (sort.key !== key) return <FaSort className="opacity-60" />;
    return sort.direction === "asc" ? <FaSortUp /> : <FaSortDown />;
  };

  /** ---------- pills ---------- */
  const pill = (n: number) => {
    const cls =
      n < 0
        ? "bg-rose-500/10 text-rose-700 dark:text-rose-200 border-rose-500/20"
        : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-200 border-emerald-500/20";
    return `inline-flex w-fit whitespace-nowrap justify-center rounded-2xl border px-2.5 py-1 text-[12px] font-extrabold ${cls}`;
  };

  /** ---------- FG completion capsules ---------- */
  const fgDotCls = (v: FGFilter) => {
    if (v === "complete") return "bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.15)]";
    if (v === "partial") return "bg-amber-500 shadow-[0_0_0_4px_rgba(245,158,11,0.15)]";
    if (v === "extra") return "bg-violet-500 shadow-[0_0_0_4px_rgba(139,92,246,0.15)]";
    return "bg-sky-500 shadow-[0_0_0_4px_rgba(14,165,233,0.15)]";
  };
  const fgCapsuleActiveCls = (v: FGFilter) => {
    if (v === "complete") return "bg-emerald-500/12 border-emerald-500/25 text-emerald-800 dark:text-emerald-200";
    if (v === "partial") return "bg-amber-500/12 border-amber-500/25 text-amber-800 dark:text-amber-200";
    if (v === "extra") return "bg-violet-500/12 border-violet-500/25 text-violet-800 dark:text-violet-200";
    return "bg-sky-500/12 border-sky-500/25 text-sky-800 dark:text-sky-200";
  };

  const FGFilterCapsule = ({ label, value, count }: { label: string; value: FGFilter; count: number }) => {
    const active = fgFilter === value;
    return (
      <button
        type="button"
        onClick={() => {
          setFgFilter(value);
          setPage(1);
        }}
        className={[
          "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] font-extrabold transition-all select-none",
          "backdrop-blur-xl shadow-[0_10px_22px_rgba(0,0,0,0.06)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.45)]",
          active
            ? fgCapsuleActiveCls(value)
            : "bg-white/60 dark:bg-white/5 border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 text-black/70 dark:text-white/70",
        ].join(" ")}
      >
        <span className={`h-2.5 w-2.5 rounded-full ${fgDotCls(value)}`} />
        <span className="whitespace-nowrap">{label}</span>
        <span className="inline-flex min-w-[28px] justify-center rounded-full px-2 py-0.5 text-[12px] font-black bg-black/5 dark:bg-white/10">
          {count}
        </span>
      </button>
    );
  };

  const fgCounts = useMemo(() => {
    const all = lines.length;
    const partial = lines.filter((r: any) => fgCompletion(r.planned_bags, r.packed_bags) === "partial").length;
    const complete = lines.filter((r: any) => fgCompletion(r.planned_bags, r.packed_bags) === "complete").length;
    const extra = lines.filter((r: any) => fgCompletion(r.planned_bags, r.packed_bags) === "extra").length;
    return { all, partial, complete, extra };
  }, [lines]);

  /** ---------- Codes grid ---------- */
  const pct = (fgQty: number, soQty: number) => {
    if (!soQty || soQty <= 0) return 0;
    return Math.max(0, Math.min(100, (fgQty / soQty) * 100));
  };

  const CodesGrid = (r: any) => {
    const itemCode = String(r.item_code ?? "").trim();
    const innerCode = String(r.inner_code ?? "").trim();
    const outerCode = String(r.outer_code ?? "").trim();

    const hasAnyCode = !!(itemCode || innerCode || outerCode);

    const rows = [
      itemCode ? { code: itemCode, soQty: toNum(r.planned_item_qty), fgQty: toNum(r.packed_item_qty) } : null,
      innerCode ? { code: innerCode, soQty: toNum(r.planned_inner_qty), fgQty: toNum(r.packed_inner_qty) } : null,
      outerCode ? { code: outerCode, soQty: toNum(r.planned_outer_qty), fgQty: toNum(r.packed_outer_qty) } : null,
    ].filter(Boolean) as Array<{ code: string; soQty: number; fgQty: number }>;

    if (!hasAnyCode) {
      const soTotal = toNum(r.planned_item_qty) + toNum(r.planned_inner_qty) + toNum(r.planned_outer_qty);
      const fgTotal = toNum(r.packed_item_qty) + toNum(r.packed_inner_qty) + toNum(r.packed_outer_qty);
      const p = pct(fgTotal, soTotal);

      return (
        <div className="inline-flex w-max">
          <div className="inline-flex rounded-2xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-white/5 px-3 py-2 w-max">
            <div className="grid grid-cols-[max-content_max-content_max-content_max-content] gap-x-4 gap-y-1 text-[12px] w-max">
              <span className="font-black text-black/45 dark:text-white/45">—</span>
              <span className="text-right font-extrabold text-black/60 dark:text-white/60 whitespace-nowrap">{soTotal}</span>
              <span className="text-right font-extrabold text-black/60 dark:text-white/60 whitespace-nowrap">{fgTotal}</span>
              <span className="text-right font-black text-black/70 dark:text-white/70 whitespace-nowrap">{p.toFixed(0)}%</span>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="inline-flex w-max">
        <div className="inline-flex rounded-2xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-white/5 px-3 py-2 w-max">
          <div className="grid grid-cols-[max-content_max-content_max-content_max-content] gap-x-4 gap-y-1 text-[12px] w-max">
            <span className="font-black text-black/35 dark:text-white/35">Code</span>
            <span className="text-right font-black text-black/35 dark:text-white/35">SO</span>
            <span className="text-right font-black text-black/35 dark:text-white/35">FG</span>
            <span className="text-right font-black text-black/35 dark:text-white/35">%</span>

            {rows.map((x) => {
              const p = pct(x.fgQty, x.soQty);
              return (
                <React.Fragment key={x.code}>
                  <span className="font-black text-black/85 dark:text-white whitespace-nowrap">{x.code}</span>
                  <span className="text-right font-extrabold text-black/60 dark:text-white/60 whitespace-nowrap">{x.soQty}</span>
                  <span className="text-right font-extrabold text-black/60 dark:text-white/60 whitespace-nowrap">{x.fgQty}</span>
                  <span className="text-right font-black text-black/75 dark:text-white/75 whitespace-nowrap">{p.toFixed(0)}%</span>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-3 p-4 md:p-6">
      <div className="pointer-events-none fixed inset-x-0 -top-24 h-72 bg-gradient-to-b from-black/5 to-transparent dark:from-white/5" />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="flex flex-col gap-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-black/5 to-black/0 dark:from-white/10 dark:to-white/0 border border-black/5 dark:border-white/10 shadow-[0_14px_30px_rgba(0,0,0,0.06)] dark:shadow-[0_18px_50px_rgba(0,0,0,0.45)]" />
            <div>
              <h1 className="text-[18px] md:text-[20px] font-black tracking-tight text-black/90 dark:text-white">
                Sales Order - FG's
              </h1>
              <div className={`text-[12px] font-bold ${subtleText}`}>Approved SO only • FG completion filter</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search SO, item, codes..."
              className={`h-10 w-[min(460px,92vw)] rounded-2xl border border-black/10 dark:border-white/10
                          bg-white/70 dark:bg-white/5 px-3 text-[14px] font-semibold shadow-[0_10px_24px_rgba(0,0,0,0.06)]
                          text-black/90 dark:text-white placeholder:text-black/35 dark:placeholder:text-white/35 ${softRing}`}
            />

            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setPage(1);
              }}
              className={`h-10 rounded-2xl border border-black/10 dark:border-white/10
                          bg-white/70 dark:bg-white/5 px-3 text-[13px] font-extrabold
                          shadow-[0_10px_24px_rgba(0,0,0,0.06)] text-black/90 dark:text-white ${softRing}`}
            >
              {[20, 30, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n} rows
                </option>
              ))}
            </select>

            <button
              onClick={() => exportCSV(filtered)}
              className="h-10 rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5
                         px-3 text-[13px] font-black shadow-[0_10px_24px_rgba(0,0,0,0.06)]
                         hover:bg-black/5 dark:hover:bg-white/10 text-black/90 dark:text-white"
            >
              Export CSV
            </button>
          </div>
        </div>

        {/* ✅ FG completion capsules */}
        <div className="flex flex-wrap items-center gap-2">
          <FGFilterCapsule label="All (Approved)" value="all" count={fgCounts.all} />
          <FGFilterCapsule label="Partial FG" value="partial" count={fgCounts.partial} />
          <FGFilterCapsule label="FG Complete" value="complete" count={fgCounts.complete} />
          <FGFilterCapsule label="Extra FG" value="extra" count={fgCounts.extra} />
        </div>
      </motion.div>

      {/* Loading / Error */}
      {loading && (
        <div className={`${card} p-4`}>
          <div className="h-4 w-48 animate-pulse rounded bg-black/10 dark:bg-white/10" />
          <div className="mt-3 h-24 w-full animate-pulse rounded-2xl bg-black/5 dark:bg-white/5" />
        </div>
      )}

      {error && !loading && (
        <div className="rounded-3xl border border-rose-500/25 bg-rose-500/10 p-4 text-rose-800 dark:text-rose-200">
          {error}
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <div className={`${card} overflow-hidden`}>
          <div className="max-h-[calc(100vh-290px)] overflow-auto">
            <table className="w-full table-auto">
              <thead className="sticky top-0 z-10 bg-white/80 dark:bg-[#0B0F19]/80 backdrop-blur-xl">
                <tr className="border-b border-black/5 dark:border-white/10">
                  <th className={`px-3 py-3 text-left text-[12px] font-black ${subtleText} whitespace-nowrap w-fit`}>#</th>

                  {(
                    [
                      ["sales_order", "SO"],
                      ["item_number", "Item#"],
                      ["approved_so", "SO Status"],
                      ["pack_size", "Packing"],
                      ["item_code", "Codes (SO/FG/%)"],
                      ["planned_bags", "SO Bags"],
                      ["packed_bags", "FG Packed"],
                      ["balance_item_qty", "Bal Item"],
                      ["balance_inner_qty", "Bal Inner"],
                      ["balance_outer_qty", "Bal Outer"],
                      ["mr_balance_item", "MR Bal Item"],
                      ["mr_balance_inner", "MR Bal Inner"],
                      ["mr_balance_outer", "MR Bal Outer"],
                    ] as Array<[any, string]>
                  ).map(([k, label]) => (
                    <th
                      key={String(k)}
                      onClick={() => handleSort(k)}
                      className={`px-3 py-3 text-left text-[12px] font-black ${subtleText}
                                 cursor-pointer select-none hover:text-black/90 dark:hover:text-white whitespace-nowrap w-fit`}
                      title="Click to sort"
                    >
                      <span className="inline-flex items-center gap-2 whitespace-nowrap">
                        {label} {sortIcon(k)}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {current.length === 0 ? (
                  <tr>
                    <td colSpan={13} className={`px-3 py-10 text-center text-[13px] font-semibold ${subtleText}`}>
                      No results found.
                    </td>
                  </tr>
                ) : (
                  current.map((r: any, idx: number) => {
                    const packType = String(r.pack_type ?? "").trim();

                    return (
                      <tr
                        key={`${r.sales_order}_${r.item_number}_${idx}`}
                        onClick={() => openModal(r)}
                        className="border-b border-black/5 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                        title="Click to view details"
                      >
                        <td className={`px-3 py-2 text-[13px] ${subtleText} whitespace-nowrap w-fit`}>{start + idx + 1}</td>

                        <td className="px-3 py-2 text-[13px] font-black text-black/90 dark:text-white whitespace-nowrap w-fit">
                          {r.sales_order}
                        </td>

                        <td className="px-3 py-2 text-[13px] font-extrabold text-black/80 dark:text-white/90 whitespace-nowrap w-fit">
                          {r.item_number}
                        </td>

                        {/* Approved status only */}
                        <td className="px-3 py-2 whitespace-nowrap w-fit">
                          <div className="inline-flex items-center gap-2">
                            <FaCheckCircle className="text-emerald-600 dark:text-emerald-300" />
                            <span className="text-[12px] font-black text-emerald-700 dark:text-emerald-200">
                              {String(r.approved_so).trim() || "Approved"}
                            </span>
                          </div>
                        </td>

                        {/* Packing */}
                        <td className="px-3 py-2 whitespace-nowrap w-fit">
                          <div className="inline-flex flex-col gap-1 rounded-2xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-white/5 px-3 py-2 shadow-[0_10px_20px_rgba(0,0,0,0.05)]">
                            <div className="inline-flex items-center gap-2">
                              <span className="text-[13px] font-black text-black/90 dark:text-white">{r.pack_size}</span>
                              <span className="text-[12px] font-black text-black/40 dark:text-white/40">×{r.multiplier}</span>
                            </div>

                            <div className="inline-flex items-center gap-2">
                              {packType ? (
                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-black border ${getPackTypeColor(packType)}`}>
                                  {packType}
                                </span>
                              ) : (
                                <span className="inline-flex h-[18px]" />
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Codes */}
                        <td className="px-3 py-2 whitespace-nowrap w-fit">{CodesGrid(r)}</td>

                        <td className="px-3 py-2 text-[13px] font-black text-black/80 dark:text-white/90 whitespace-nowrap w-fit">
                          {r.planned_bags}
                        </td>
                        <td className="px-3 py-2 text-[13px] font-black text-black/80 dark:text-white/90 whitespace-nowrap w-fit">
                          {r.packed_bags}
                        </td>

                        <td className="px-3 py-2 whitespace-nowrap w-fit">
                          <span className={pill(r.balance_item_qty)}>{r.balance_item_qty}</span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap w-fit">
                          <span className={pill(r.balance_inner_qty)}>{r.balance_inner_qty}</span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap w-fit">
                          <span className={pill(r.balance_outer_qty)}>{r.balance_outer_qty}</span>
                        </td>

                        <td className="px-3 py-2 whitespace-nowrap w-fit">
                          <span className={pill(r.mr_balance_item)}>{r.mr_balance_item}</span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap w-fit">
                          <span className={pill(r.mr_balance_inner)}>{r.mr_balance_inner}</span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap w-fit">
                          <span className={pill(r.mr_balance_outer)}>{r.mr_balance_outer}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-black/5 dark:border-white/10 px-3 py-3">
            <div className={`text-[13px] font-semibold ${subtleText}`}>
              Showing <span className="font-black text-black/80 dark:text-white">{sorted.length ? start + 1 : 0}</span>–
              <span className="font-black text-black/80 dark:text-white">{end}</span> of{" "}
              <span className="font-black text-black/80 dark:text-white">{sorted.length}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={safePage <= 1}
                onClick={() => setPage(1)}
                className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-white/5 px-3 py-2 text-[13px] font-black hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-50 text-black/80 dark:text-white"
              >
                « First
              </button>
              <button
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-white/5 px-3 py-2 text-[13px] font-black hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-50 text-black/80 dark:text-white"
              >
                ‹ Prev
              </button>
              <div className="text-[13px] font-black text-black/70 dark:text-white/70 whitespace-nowrap">
                Page <span className="text-black dark:text-white">{safePage}</span> / {totalPages}
              </div>
              <button
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-white/5 px-3 py-2 text-[13px] font-black hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-50 text-black/80 dark:text-white"
              >
                Next ›
              </button>
              <button
                disabled={safePage >= totalPages}
                onClick={() => setPage(totalPages)}
                className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-white/5 px-3 py-2 text-[13px] font-black hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-50 text-black/80 dark:text-white"
              >
                Last »
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      <SoLineModal open={modalOpen} onClose={() => setModalOpen(false)} line={activeLine as any} matchedFG={activeFGRows} />
    </div>
  );
}
