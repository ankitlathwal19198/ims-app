"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { FaArrowLeft, FaCheckCircle, FaExclamationTriangle } from "react-icons/fa";

import { useAppDispatch, useAppSelector } from "@/store/hooks";

import type { MaterialReceivedRow, SalesOrderRow, FinishedGoodsRow } from "@/types";

/** ---------- utils ---------- */
function toNum(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function norm(v: any) {
  return String(v ?? "").trim();
}
function parseMultiplier(packSize: string | undefined): number {
  const s = String(packSize ?? "").trim();
  if (!s) return 1;
  const m = /^(\d+)\s*[x×X]\s*\d+/.exec(s);
  if (m) return Math.max(1, Number(m[1]));
  return 1;
}
function isApproved(v: any) {
  const s = String(v ?? "").trim().toLowerCase();
  return s.includes("approv");
}

/**
 * Flexible date parsing:
 * - ISO
 * - "YYYY-MM-DD"
 * - "MM/DD/YYYY HH:mm:ss" (your approved_timestamp example)
 */
function parseDateFlexible(raw: any): Date | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;

  const d1 = new Date(s);
  if (!Number.isNaN(d1.getTime())) return d1;

  const m1 = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m1) {
    const [, y, mm, dd] = m1;
    const d = new Date(Number(y), Number(mm) - 1, Number(dd));
    if (!Number.isNaN(d.getTime())) return d;
  }

  const m2 = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(s);
  if (m2) {
    const [, MM, DD, YYYY, hh, mi, ss] = m2;
    const d = new Date(
      Number(YYYY),
      Number(MM) - 1,
      Number(DD),
      Number(hh ?? 0),
      Number(mi ?? 0),
      Number(ss ?? 0)
    );
    if (!Number.isNaN(d.getTime())) return d;
  }

  return null;
}

function formatDateShort(d: Date | null) {
  if (!d) return "-";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    .format(d)
    .replace(/,/g, "");
}

function pct(fgQty: number, soQty: number) {
  if (!soQty || soQty <= 0) return 0;
  return (fgQty / soQty) * 100;
}

/** ---------- iOS / SaaS theme helpers ---------- */
const card =
  "rounded-3xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-[#0B0F19]/70 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.06)] dark:shadow-[0_18px_50px_rgba(0,0,0,0.45)]";
const subtleText = "text-black/55 dark:text-white/55";

function balanceBadgeCls(balance: number) {
  if (balance === 0) return "bg-emerald-500/12 border-emerald-500/25 text-emerald-800 dark:text-emerald-200";
  if (balance > 0) return "bg-amber-500/12 border-amber-500/25 text-amber-800 dark:text-amber-200";
  return "bg-violet-500/12 border-violet-500/25 text-violet-800 dark:text-violet-200";
}

function progressCls(p: number) {
  // p can be >100
  if (p >= 100) return "bg-emerald-500/15 border-emerald-500/25";
  if (p >= 66) return "bg-sky-500/15 border-sky-500/25";
  if (p >= 33) return "bg-amber-500/15 border-amber-500/25";
  return "bg-rose-500/10 border-rose-500/20";
}

export default function LiveStockItemPage() {
  const router = useRouter();
  const params = useParams();
  const item_code = norm((params as any)?.item_code);

  const dispatch = useAppDispatch();

  /** ✅ IMPORTANT: selectors must be called in fixed order (no short-circuit) */
  const master = useAppSelector((s) => s.masterData.data);
  const masterLoading = useAppSelector((s) => s.masterData.loading);
  const masterError = useAppSelector((s) => s.masterData.error);

  const received = useAppSelector((s) => s.materialReceived.data);
  const mrLoading = useAppSelector((s) => s.materialReceived.loading);
  const mrError = useAppSelector((s) => s.materialReceived.error);

  const so = useAppSelector((s) => s.salesOrder.data);
  const soLoading = useAppSelector((s) => s.salesOrder.loading);
  const soError = useAppSelector((s) => s.salesOrder.error);

  const fg = useAppSelector((s) => s.finishedGoods.data);
  const fgLoading = useAppSelector((s) => s.finishedGoods.loading);
  const fgError = useAppSelector((s) => s.finishedGoods.error);

  const loading = masterLoading || mrLoading || soLoading || fgLoading;
  const error = masterError || mrError || soError || fgError;

  /** ---------- master item ---------- */
  const masterItem = useMemo(() => {
    const base = Array.isArray(master) ? (master as any[]) : [];
    return base.find((m) => norm(m.item_code) === item_code) ?? null;
  }, [master, item_code]);

  const maxLevel = toNum(masterItem?.max_level ?? 0);
  const description = String(masterItem?.description ?? "").trim() || "-";
  const plantName = String(masterItem?.plant_name ?? "").trim() || "-";

  /** ---------- MR received total for item_code ---------- */
  const receivedRows = useMemo(() => {
    const rows = Array.isArray(received) ? (received as MaterialReceivedRow[]) : [];
    return (rows as any[])
      .filter((r) => norm(r.item_code) === item_code)
      .map((r) => {
        const dt =
          parseDateFlexible(r.s7_act) ||
          parseDateFlexible(r.created_at) ||
          parseDateFlexible(r.unloading_date) ||
          parseDateFlexible(r.bill_date);
        return { ...r, _date: dt?.getTime() ?? 0, _dateStr: formatDateShort(dt) };
      })
      .sort((a, b) => (b._date ?? 0) - (a._date ?? 0));
  }, [received, item_code]);

  const receivedTotal = useMemo(() => {
    return receivedRows.reduce((s: number, r: any) => s + toNum(r.qty_act ?? r.qty_as_per_bill), 0);
  }, [receivedRows]);

  /** ---------- FG index (SO+Item => packed bags sum) ---------- */
  const fgPackedBySoItem = useMemo(() => {
    const map = new Map<string, number>();
    const rows = Array.isArray(fg) ? (fg as FinishedGoodsRow[]) : [];
    for (const r of rows as any[]) {
      const soNo = norm(r.sales_order_no);
      const itemNo = norm(r.sales_order_item_no);
      if (!soNo || !itemNo) continue;
      const key = `${soNo}__${itemNo}`;
      map.set(key, (map.get(key) ?? 0) + toNum(r.quantity_packed));
    }
    return map;
  }, [fg]);

  const fgRowsBySoItem = useMemo(() => {
    const map = new Map<string, any[]>();
    const rows = Array.isArray(fg) ? (fg as FinishedGoodsRow[]) : [];
    for (const r of rows as any[]) {
      const soNo = norm(r.sales_order_no);
      const itemNo = norm(r.sales_order_item_no);
      if (!soNo || !itemNo) continue;
      const key = `${soNo}__${itemNo}`;
      const arr = map.get(key) ?? [];
      arr.push(r);
      map.set(key, arr);
    }
    return map;
  }, [fg]);

  /** ---------- Planned SO lines (Approved only) for this item_code ---------- */
  const plannedLines = useMemo(() => {
    const sales = Array.isArray(so) ? (so as SalesOrderRow[]) : [];
    const out: any[] = [];

    for (const row of sales as any[]) {
      if (!isApproved(row.approved_so)) continue;

      const sales_order = norm(row.sales_order);
      const item_number = norm(row.item_number);
      if (!sales_order || !item_number) continue;

      const multiplier = parseMultiplier(norm(row.pack_size));
      const bags = toNum(row.bags);

      const itemCode = norm(row.item_code);
      const innerCode = norm(row.inner_code);
      const outerCode = norm(row.outer_code);

      const fgKey = `${sales_order}__${item_number}`;
      const packed_bags = fgPackedBySoItem.get(fgKey) ?? 0;

      // ✅ date from so.approved_timestamp -> "30 Dec 2025"
      const dt = parseDateFlexible(row.approved_timestamp) || parseDateFlexible(row.created_at) || null;
      const dateStr = formatDateShort(dt);

      const planned_item_qty = bags * multiplier;
      const planned_inner_qty = bags * multiplier;
      const planned_outer_qty = bags;

      const packed_item_qty = packed_bags * multiplier;
      const packed_inner_qty = packed_bags * multiplier;
      const packed_outer_qty = packed_bags;

      if (itemCode === item_code) {
        out.push({
          _date: dt?.getTime() ?? 0,
          dateStr,
          sales_order,
          item_number,
          role: "ITEM",
          soQty: planned_item_qty,
          fgQty: packed_item_qty,
          balance: planned_item_qty - packed_item_qty,
        });
      }
      if (innerCode === item_code) {
        out.push({
          _date: dt?.getTime() ?? 0,
          dateStr,
          sales_order,
          item_number,
          role: "INNER",
          soQty: planned_inner_qty,
          fgQty: packed_inner_qty,
          balance: planned_inner_qty - packed_inner_qty,
        });
      }
      if (outerCode === item_code) {
        out.push({
          _date: dt?.getTime() ?? 0,
          dateStr,
          sales_order,
          item_number,
          role: "OUTER",
          soQty: planned_outer_qty,
          fgQty: packed_outer_qty,
          balance: planned_outer_qty - packed_outer_qty,
        });
      }
    }

    out.sort((a, b) => (b._date ?? 0) - (a._date ?? 0));
    return out;
  }, [so, item_code, fgPackedBySoItem]);

  /** ---------- FG rows linked to this item_code via planned SO keys ---------- */
  const fgRowsForItem = useMemo(() => {
    const keys = new Set<string>();
    for (const p of plannedLines) {
      keys.add(`${norm(p.sales_order)}__${norm(p.item_number)}`);
    }

    const rows: any[] = [];
    keys.forEach((k) => {
      const list = fgRowsBySoItem.get(k) ?? [];
      for (const r of list as any[]) {
        // ✅ date from fg.timestamp
        const dt = parseDateFlexible(r.timestamp) || parseDateFlexible(r.created_at) || parseDateFlexible(r.updated_at) || null;
        rows.push({ ...r, _date: dt?.getTime() ?? 0, _dateStr: formatDateShort(dt) });
      }
    });

    rows.sort((a, b) => (b._date ?? 0) - (a._date ?? 0));
    return rows;
  }, [plannedLines, fgRowsBySoItem]);

  /** ---------- FG grouped by SO + totals ---------- */
  const fgGrouped = useMemo(() => {
    const map = new Map<string, { so: string; latest: number; total: number; rows: any[] }>();

    for (const r of fgRowsForItem as any[]) {
      const soNo = norm(r.sales_order_no) || "-";
      const cur = map.get(soNo) ?? { so: soNo, latest: 0, total: 0, rows: [] as any[] };

      cur.total += toNum(r.quantity_packed);
      cur.latest = Math.max(cur.latest, toNum(r._date ?? 0));
      cur.rows.push(r);

      map.set(soNo, cur);
    }

    const arr = Array.from(map.values());
    arr.forEach((g) => g.rows.sort((a, b) => (b._date ?? 0) - (a._date ?? 0)));
    arr.sort((a, b) => (b.latest ?? 0) - (a.latest ?? 0));
    return arr;
  }, [fgRowsForItem]);

  /** ---------- Summary bar ---------- */
  const summary = useMemo(() => {
    const plannedReq = plannedLines.reduce((s: number, r: any) => s + toNum(r.soQty), 0);
    const finished = plannedLines.reduce((s: number, r: any) => s + toNum(r.fgQty), 0);

    const plannedRemaining = Math.max(0, plannedReq - finished);
    const unplannedAfter = receivedTotal - plannedRemaining;

    const maxPct = maxLevel > 0 ? Math.round((Math.max(0, unplannedAfter) / maxLevel) * 100) : 0;

    return { plannedReq, finished, plannedRemaining, receivedTotal, unplannedAfter, maxPct };
  }, [plannedLines, receivedTotal, maxLevel]);

  return (
    <div className="p-4 md:p-6">
      <div className="pointer-events-none fixed inset-x-0 -top-24 h-72 bg-gradient-to-b from-black/5 to-transparent dark:from-white/5" />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="flex flex-col gap-3"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <button
              onClick={() => router.push("/app/live-stock")}
              className="inline-flex items-center gap-2 rounded-2xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-white/5 px-3 py-2 text-[13px] font-black hover:bg-black/5 dark:hover:bg-white/10"
            >
              <FaArrowLeft /> Back
            </button>

            <div>
              <div className={`text-[12px] font-bold ${subtleText}`}>Live Stock • Item View</div>
              <h1 className="text-[18px] md:text-[22px] font-black text-black/90 dark:text-white">
                {item_code || "-"}
              </h1>
              <div className="text-[13px] font-semibold text-black/60 dark:text-white/60">
                {description} • {plantName}
              </div>
            </div>
          </div>

          {/* Master Max Level card */}
          <div className={`${card} px-4 py-3`}>
            <div className={`text-[12px] font-bold ${subtleText}`}>Max Level (Master)</div>
            <div className="text-[18px] font-black text-black/90 dark:text-white">{maxLevel || 0}</div>

            <div className="mt-2 flex items-center justify-between gap-2">
              <div>
                <div className={`text-[12px] font-bold ${subtleText}`}>Stock %</div>
                <div className="text-[14px] font-black text-black/80 dark:text-white">{summary.maxPct}%</div>
              </div>

              {summary.unplannedAfter < 0 ? (
                <span className="inline-flex items-center gap-2 rounded-full border border-rose-500/25 bg-rose-500/12 px-3 py-1.5 text-[12px] font-black text-rose-800 dark:text-rose-200">
                  <FaExclamationTriangle className="opacity-90" />
                  Stock Short: {Math.abs(summary.unplannedAfter)}
                </span>
              ) : null}
            </div>
          </div>
        </div>

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

        {/* Summary Bar */}
        {!loading && !error && (
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Received (MR)", value: summary.receivedTotal },
              { label: "Planned Req (SO)", value: summary.plannedReq },
              { label: "Finished (FG)", value: summary.finished },
              { label: "Planned Remaining", value: summary.plannedRemaining },
              { label: "Unplanned After", value: summary.unplannedAfter },
            ].map((k) => (
              <div key={k.label} className={`${card} px-4 py-3`}>
                <div className={`text-[12px] font-bold ${subtleText}`}>{k.label}</div>
                <div className="text-[16px] font-black text-black/90 dark:text-white">{k.value}</div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Tables */}
      {!loading && !error && (
        <div className="mt-3 grid grid-cols-1 xl:grid-cols-3 gap-3">
          {/* Planned SO table */}
          <div className={`${card} p-3 xl:col-span-2`}>
            <div className="mb-2 flex items-center justify-between">
              <div>
                <div className="text-[14px] font-black text-black/90 dark:text-white">Planned SO (Approved)</div>
                <div className={`text-[12px] font-bold ${subtleText}`}>
                  Latest → Oldest (date from approved_timestamp)
                </div>
              </div>
              <div className="text-[12px] font-black text-black/60 dark:text-white/60">Rows: {plannedLines.length}</div>
            </div>

            <div className="overflow-auto max-h-[70vh]">
              <table className="w-full table-auto">
                <thead className="sticky top-0 bg-white/70 dark:bg-[#0B0F19]/70 backdrop-blur-xl">
                  <tr className="border-b border-black/10 dark:border-white/10">
                    {["Date", "SO", "Item#", "Role", "SO Qty", "FG Qty", "FG%", "Bal"].map((h) => (
                      <th key={h} className={`px-2 py-2 text-left text-[12px] font-extrabold ${subtleText} whitespace-nowrap`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {plannedLines.length === 0 ? (
                    <tr>
                      <td colSpan={8} className={`px-2 py-8 text-center text-[13px] ${subtleText}`}>
                        No Approved SO planned rows for this item_code.
                      </td>
                    </tr>
                  ) : (
                    plannedLines.map((r: any, i: number) => {
                      const bal = toNum(r.balance);
                      const isZero = bal === 0;

                      const p = pct(toNum(r.fgQty), toNum(r.soQty));
                      const pClamped = Math.max(0, Math.min(100, p));
                      const isExtra = p > 100;

                      return (
                        <tr
                          key={`${r.sales_order}_${r.item_number}_${r.role}_${i}`}
                          className="border-b border-black/5 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5"
                        >
                          <td className="px-2 py-2 text-[12px] font-bold text-black/60 dark:text-white/60 whitespace-nowrap">
                            {r.dateStr}
                          </td>
                          <td className="px-2 py-2 text-[12px] font-black text-black/90 dark:text-white whitespace-nowrap">
                            {r.sales_order}
                          </td>
                          <td className="px-2 py-2 text-[12px] font-extrabold text-black/70 dark:text-white/80 whitespace-nowrap">
                            {r.item_number}
                          </td>
                          <td className="px-2 py-2 text-[12px] font-black text-black/60 dark:text-white/60 whitespace-nowrap">
                            {r.role}
                          </td>

                          <td className="px-2 py-2 text-right text-[12px] font-black text-black/70 dark:text-white/70 whitespace-nowrap">
                            {r.soQty}
                          </td>
                          <td className="px-2 py-2 text-right text-[12px] font-black text-black/70 dark:text-white/70 whitespace-nowrap">
                            {r.fgQty}
                          </td>

                          {/* ✅ progress mini bar */}
                          <td className="px-2 py-2 whitespace-nowrap">
                            <div className="inline-flex items-center gap-2">
                              <div className={`h-2 w-28 rounded-full border overflow-hidden ${progressCls(p)}`}>
                                <div
                                  className={`h-full ${isExtra ? "bg-violet-500/70" : p >= 100 ? "bg-emerald-500/70" : "bg-black/40 dark:bg-white/40"}`}
                                  style={{ width: `${pClamped}%` }}
                                />
                              </div>
                              <span className="text-[12px] font-black text-black/70 dark:text-white/70">
                                {Math.round(p)}%
                              </span>
                            </div>
                          </td>

                          <td className="px-2 py-2 text-right whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 rounded-2xl border px-2 py-1 text-[12px] font-black ${balanceBadgeCls(bal)}`}>
                              {isZero ? <FaCheckCircle className="text-emerald-600 dark:text-emerald-300" /> : null}
                              {bal}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* FG grouped by SO */}
          <div className={`${card} p-3`}>
            <div className="mb-2 flex items-center justify-between">
              <div>
                <div className="text-[14px] font-black text-black/90 dark:text-white">Finished Goods (Grouped by SO)</div>
                <div className={`text-[12px] font-bold ${subtleText}`}>Latest → Oldest (date from fg.timestamp)</div>
              </div>
              <div className="text-[12px] font-black text-black/60 dark:text-white/60">Groups: {fgGrouped.length}</div>
            </div>

            <div className="overflow-auto max-h-[70vh] space-y-3">
              {fgGrouped.length === 0 ? (
                <div className={`px-2 py-8 text-center text-[13px] ${subtleText}`}>
                  No FG rows linked to approved SO lines for this item_code.
                </div>
              ) : (
                fgGrouped.map((g) => (
                  <div key={g.so} className="rounded-3xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-white/5 overflow-hidden">
                    {/* Group header */}
                    <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-black/10 dark:border-white/10">
                      <div className="text-[12px] font-black text-black/85 dark:text-white">
                        SO: <span className="opacity-90">{g.so}</span>
                      </div>
                      <span className="inline-flex rounded-full border border-violet-500/25 bg-violet-500/12 px-3 py-1 text-[12px] font-black text-violet-800 dark:text-violet-200">
                        Total Packed: {g.total}
                      </span>
                    </div>

                    {/* Rows */}
                    <div className="overflow-auto">
                      <table className="w-full table-auto">
                        <thead className="sticky top-0 bg-transparent">
                          <tr className="border-b border-black/5 dark:border-white/10">
                            {["Date", "Item#", "Qty Packed"].map((h) => (
                              <th key={h} className={`px-2 py-2 text-left text-[12px] font-extrabold ${subtleText} whitespace-nowrap`}>
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {g.rows.map((r: any, i: number) => (
                            <tr key={`${g.so}_${r.sales_order_item_no}_${i}`} className="border-b border-black/5 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5">
                              <td className="px-2 py-2 text-[12px] font-bold text-black/60 dark:text-white/60 whitespace-nowrap">
                                {r._dateStr}
                              </td>
                              <td className="px-2 py-2 text-[12px] font-extrabold text-black/70 dark:text-white/80 whitespace-nowrap">
                                {norm(r.sales_order_item_no)}
                              </td>
                              <td className="px-2 py-2 text-right text-[12px] font-black text-black/80 dark:text-white whitespace-nowrap">
                                {toNum(r.quantity_packed)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))
              )}

              {/* MR quick peek */}
              <div className="rounded-3xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-white/5 p-3">
                <div className="flex items-center justify-between">
                  <div className="text-[13px] font-black text-black/90 dark:text-white">MR Receipts (Latest)</div>
                  <div className="text-[12px] font-black text-black/60 dark:text-white/60">Rows: {receivedRows.length}</div>
                </div>
                <div className={`text-[12px] font-bold ${subtleText}`}>Latest → Oldest</div>

                <div className="mt-2 max-h-56 overflow-auto space-y-2">
                  {receivedRows.length === 0 ? (
                    <div className={`py-4 text-center text-[13px] ${subtleText}`}>No MR rows for this item_code.</div>
                  ) : (
                    receivedRows.slice(0, 12).map((r: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 px-3 py-2">
                        <div className="text-[12px] font-black text-black/70 dark:text-white/75">{r._dateStr}</div>
                        <div className="text-[12px] font-black text-black/85 dark:text-white">{toNum(r.qty_act ?? r.qty_as_per_bill)}</div>
                      </div>
                    ))
                  )}
                  {receivedRows.length > 12 ? (
                    <div className={`text-[12px] font-bold ${subtleText}`}>+ {receivedRows.length - 12} more…</div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
