"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { FaSort, FaSortDown, FaSortUp, FaTimes } from "react-icons/fa";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useRouter } from "next/navigation";

import type {
  AggregatedStock,
  LiveStockRow,
  MaterialReceivedRow,
  SalesOrderRow,
  FinishedGoodsRow,
  SOComputedLine,
} from "@/types";
import CustomDropdown from "@/components/CustomDropdown";

const ITEMS_PER_PAGE = 10;

const COLUMNS_DISPLAY: { key: keyof LiveStockRow | "age" | "finished_stock_qty"; label: string; align?: "left" | "right" }[] =
  [
    { key: "description", label: "Description" },
    { key: "plant_name", label: "Plant" },
    { key: "max_level", label: "Max Level", align: "right" },
    { key: "unplanned_stock_qty", label: "Unplanned (After Planned)", align: "right" },
    { key: "planned_req_qty", label: "Planned Req (SO)", align: "right" }, // ✅ NEW
    { key: "planned_stock_qty", label: "Planned (Remaining)", align: "right" },
    { key: "finished_stock_qty", label: "Finished (Consumed)", align: "right" }, // ✅ NEW
    { key: "age", label: "Age (Days)", align: "right" },
  ];

type SortConfig = { key: string; direction: "asc" | "desc" };

function toNumber(v: unknown): number {
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
  a.download = `live_stock_${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function parseBestDateMR(row: MaterialReceivedRow): Date | null {
  const candidates = [row.s7_act, row.created_at, row.unloading_date, row.bill_date].filter(Boolean) as string[];
  for (const raw of candidates) {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) return d;

    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
    if (m) {
      const [, y, mm, dd] = m;
      const ddx = new Date(Number(y), Number(mm) - 1, Number(dd));
      if (!Number.isNaN(ddx.getTime())) return ddx;
    }
  }
  return null;
}

function parseBestDateAny(row: any): Date | null {
  const candidates = [
    row?.created_at,
    row?.updated_at,
    row?.date,
    row?.posting_date,
    row?.packing_date,
    row?.s7_act,
    row?.unloading_date,
    row?.bill_date,
  ].filter(Boolean) as string[];
  for (const raw of candidates) {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

function normalizeStatusApprovedOnly(v: any): boolean {
  const s = String(v ?? "").trim().toLowerCase();
  return s.includes("approv");
}

function cellTone(maxLevel: unknown, unplanned: unknown) {
  const max = toNumber(maxLevel);
  const u = toNumber(unplanned);
  if (!max) return { bg: "bg-slate-100 dark:bg-white/5", text: "text-slate-600 dark:text-slate-300" };
  const pct = (u / max) * 100;
  if (pct > 100) return { bg: "bg-purple-50 dark:bg-purple-500/10", text: "text-purple-700 dark:text-purple-200" };
  if (pct > 66) return { bg: "bg-emerald-50 dark:bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-200" };
  if (pct > 33) return { bg: "bg-orange-50 dark:bg-orange-500/10", text: "text-orange-700 dark:text-orange-200" };
  return { bg: "bg-rose-50 dark:bg-rose-500/10", text: "text-rose-700 dark:text-rose-200" };
}

/** ---------- Modal (double click) ---------- */
function ItemDetailsModal({
  open,
  onClose,
  itemCode,
  plannedRows,
  fgRows,
}: {
  open: boolean;
  onClose: () => void;
  itemCode: string;
  plannedRows: any[];
  fgRows: any[];
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-[min(1100px,96vw)] max-h-[85vh] overflow-hidden rounded-3xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-[#0B0F19]/80 backdrop-blur-xl shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
        <div className="flex items-center justify-between gap-3 border-b border-black/10 dark:border-white/10 px-4 py-3">
          <div>
            <div className="text-[13px] font-extrabold text-black/60 dark:text-white/60">Item Code</div>
            <div className="text-[16px] font-black text-black/90 dark:text-white">{itemCode}</div>
            <div className="text-[12px] font-bold text-black/45 dark:text-white/45">Latest → Oldest</div>
          </div>
          <button
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-2xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-white/5 px-3 py-2 text-[13px] font-black hover:bg-black/5 dark:hover:bg-white/10"
          >
            <FaTimes /> Close
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 p-4 overflow-auto max-h-[calc(85vh-60px)]">
          {/* Planned SO */}
          <div className="rounded-3xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-white/5 p-3">
            <div className="mb-2 text-[13px] font-black text-black/80 dark:text-white">Planned SO (Approved)</div>
            <div className="overflow-auto">
              <table className="w-full table-auto">
                <thead className="sticky top-0 bg-transparent">
                  <tr className="border-b border-black/10 dark:border-white/10">
                    <th className="text-left text-[12px] font-extrabold text-black/55 dark:text-white/55 px-2 py-2 whitespace-nowrap">Date</th>
                    <th className="text-left text-[12px] font-extrabold text-black/55 dark:text-white/55 px-2 py-2 whitespace-nowrap">SO</th>
                    <th className="text-left text-[12px] font-extrabold text-black/55 dark:text-white/55 px-2 py-2 whitespace-nowrap">Item#</th>
                    <th className="text-left text-[12px] font-extrabold text-black/55 dark:text-white/55 px-2 py-2 whitespace-nowrap">Role</th>
                    <th className="text-right text-[12px] font-extrabold text-black/55 dark:text-white/55 px-2 py-2 whitespace-nowrap">SO Qty</th>
                    <th className="text-right text-[12px] font-extrabold text-black/55 dark:text-white/55 px-2 py-2 whitespace-nowrap">FG Qty</th>
                    <th className="text-right text-[12px] font-extrabold text-black/55 dark:text-white/55 px-2 py-2 whitespace-nowrap">Bal</th>
                  </tr>
                </thead>
                <tbody>
                  {plannedRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-2 py-6 text-center text-[13px] text-black/45 dark:text-white/45">
                        No planned SO rows for this item.
                      </td>
                    </tr>
                  ) : (
                    plannedRows.map((r, i) => (
                      <tr key={i} className="border-b border-black/5 dark:border-white/10">
                        <td className="px-2 py-2 text-[12px] font-bold text-black/55 dark:text-white/55 whitespace-nowrap">
                          {r.dateStr || "-"}
                        </td>
                        <td className="px-2 py-2 text-[12px] font-black text-black/85 dark:text-white whitespace-nowrap">
                          {r.sales_order}
                        </td>
                        <td className="px-2 py-2 text-[12px] font-black text-black/70 dark:text-white/80 whitespace-nowrap">
                          {r.item_number}
                        </td>
                        <td className="px-2 py-2 text-[12px] font-extrabold text-black/60 dark:text-white/60 whitespace-nowrap">
                          {r.role}
                        </td>
                        <td className="px-2 py-2 text-right text-[12px] font-black text-black/70 dark:text-white/70 whitespace-nowrap">
                          {r.soQty}
                        </td>
                        <td className="px-2 py-2 text-right text-[12px] font-black text-black/70 dark:text-white/70 whitespace-nowrap">
                          {r.fgQty}
                        </td>
                        <td className="px-2 py-2 text-right text-[12px] font-black text-black/80 dark:text-white whitespace-nowrap">
                          {r.balance}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* FG rows */}
          <div className="rounded-3xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-white/5 p-3">
            <div className="mb-2 text-[13px] font-black text-black/80 dark:text-white">Finished Goods Rows</div>
            <div className="overflow-auto">
              <table className="w-full table-auto">
                <thead className="sticky top-0 bg-transparent">
                  <tr className="border-b border-black/10 dark:border-white/10">
                    <th className="text-left text-[12px] font-extrabold text-black/55 dark:text-white/55 px-2 py-2 whitespace-nowrap">Date</th>
                    <th className="text-left text-[12px] font-extrabold text-black/55 dark:text-white/55 px-2 py-2 whitespace-nowrap">SO</th>
                    <th className="text-left text-[12px] font-extrabold text-black/55 dark:text-white/55 px-2 py-2 whitespace-nowrap">Item#</th>
                    <th className="text-right text-[12px] font-extrabold text-black/55 dark:text-white/55 px-2 py-2 whitespace-nowrap">Qty Packed</th>
                  </tr>
                </thead>
                <tbody>
                  {fgRows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-2 py-6 text-center text-[13px] text-black/45 dark:text-white/45">
                        No FG rows for this item.
                      </td>
                    </tr>
                  ) : (
                    fgRows.map((r, i) => (
                      <tr key={i} className="border-b border-black/5 dark:border-white/10">
                        <td className="px-2 py-2 text-[12px] font-bold text-black/55 dark:text-white/55 whitespace-nowrap">
                          {r.dateStr || "-"}
                        </td>
                        <td className="px-2 py-2 text-[12px] font-black text-black/85 dark:text-white whitespace-nowrap">
                          {r.sales_order_no}
                        </td>
                        <td className="px-2 py-2 text-[12px] font-black text-black/70 dark:text-white/80 whitespace-nowrap">
                          {r.sales_order_item_no}
                        </td>
                        <td className="px-2 py-2 text-right text-[12px] font-black text-black/80 dark:text-white whitespace-nowrap">
                          {r.quantity_packed}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LiveStockPage() {
  const dispatch = useAppDispatch();

  const master = useAppSelector((s) => s.masterData.data);
  const masterLoading = useAppSelector((s) => s.masterData.loading);
  const masterError = useAppSelector((s) => s.masterData.error);

  const received = useAppSelector((s) => s.materialReceived.data);
  const recLoading = useAppSelector((s) => s.materialReceived.loading);
  const recError = useAppSelector((s) => s.materialReceived.error);

  // ✅ NEW
  const so = useAppSelector((s) => s.salesOrder.data);
  const soLoading = useAppSelector((s) => s.salesOrder.loading);
  const soError = useAppSelector((s) => s.salesOrder.error);

  const fg = useAppSelector((s) => s.finishedGoods.data);
  const fgLoading = useAppSelector((s) => s.finishedGoods.loading);
  const fgError = useAppSelector((s) => s.finishedGoods.error);
  const router = useRouter();

  /** ---------- aggregate MR (unplanned raw) ---------- */
  const aggregatedStock: AggregatedStock[] = useMemo(() => {
    if (!Array.isArray(received) || received.length === 0) return [];
    const map = new Map<string, AggregatedStock>();
    const now = Date.now();

    for (const r of received as any[]) {
      const item_code = r?.item_code;
      if (!item_code) continue;

      const qty = toNumber(r.qty_act ?? r.qty_as_per_bill);
      const d = parseBestDateMR(r);

      const prev =
        map.get(item_code) ??
        ({
          item_code,
          unplanned_stock_qty: 0,
          planned_stock_qty: 0,
          plant_name: "",
          latestDate: null,
          age: "",
        } satisfies AggregatedStock);

      prev.unplanned_stock_qty += qty;

      if (d && (!prev.latestDate || d > prev.latestDate)) {
        prev.latestDate = d;
        prev.plant_name = r.plant_name ?? prev.plant_name ?? "";
      }

      map.set(item_code, prev);
    }

    return Array.from(map.values()).map((v) => {
      let age = "";
      if (v.latestDate) {
        const days = Math.floor((now - v.latestDate.getTime()) / 86400000);
        age = String(days < 0 ? 0 : days);
      }
      return { ...v, age };
    });
  }, [received]);

  /**
   * ---------- FG packed index (SO+Item → sum qty) ----------
   * ✅ using fg.sales_order_no & fg.sales_order_item_no
   */
  const fgPackedBySoItem = useMemo(() => {
    const map = new Map<string, number>();
    const rows = Array.isArray(fg) ? (fg as FinishedGoodsRow[]) : [];
    for (const r of rows as any[]) {
      const soNo = String(r.sales_order_no ?? "").trim();
      const itemNo = String(r.sales_order_item_no ?? "").trim();
      if (!soNo || !itemNo) continue;
      const key = `${soNo}__${itemNo}`;
      map.set(key, (map.get(key) ?? 0) + toNumber(r.quantity_packed));
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

  /**
   * ---------- Build SO computed lines (Approved only) ----------
   * We need these to aggregate:
   *  - Planned requirement per material code (item/inner/outer)
   *  - Finished consumption per material code (from FG packed)
   */
  const soLines: (SOComputedLine & { approved_so?: string; pack_type?: string })[] = useMemo(() => {
    const sales = Array.isArray(so) ? (so as SalesOrderRow[]) : [];

    return (sales as any[])
      .filter((row) => normalizeStatusApprovedOnly(row.approved_so))
      .map((row) => {
        const sales_order = String(row.sales_order ?? "").trim();
        const item_number = String(row.item_number ?? "").trim();

        const pack_size_raw = String(row.pack_size ?? "").trim();
        const multiplier = parseMultiplier(pack_size_raw);

        const planned_bags = toNumber(row.bags);

        const item_code = normalizeCode(row.item_code) || "";
        const inner_code = normalizeCode(row.inner_code) || "";
        const outer_code = normalizeCode(row.outer_code) || "";

        const fgKey = `${sales_order}__${item_number}`;
        const packed_bags = fgPackedBySoItem.get(fgKey) ?? 0;

        // Planned requirement (same rules)
        const planned_item_qty = planned_bags * multiplier;
        const planned_inner_qty = planned_bags * multiplier;
        const planned_outer_qty = planned_bags;

        // Finished consumption (based on FG packed)
        const packed_item_qty = packed_bags * multiplier;
        const packed_inner_qty = packed_bags * multiplier;
        const packed_outer_qty = packed_bags;

        return {
          sales_order,
          item_number,
          pack_size: pack_size_raw || "-",
          multiplier,

          approved_so: String(row.approved_so ?? "").trim(),
          pack_type: String(row.pack_type ?? "").trim(),

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

          balance_item_qty: planned_item_qty - packed_item_qty,
          balance_inner_qty: planned_inner_qty - packed_inner_qty,
          balance_outer_qty: planned_outer_qty - packed_outer_qty,
        } as any;
      });
  }, [so, fgPackedBySoItem]);

  /**
   * ---------- Aggregate Planned & Finished per MATERIAL CODE ----------
   * plannedReqByCode[code] = sum planned qty (from approved SO)
   * finishedByCode[code] = sum packed/consumed qty (from FG packed)
   */
  const plannedReqByCode = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of soLines as any[]) {
      if (l.item_code) map.set(l.item_code, (map.get(l.item_code) ?? 0) + toNumber(l.planned_item_qty));
      if (l.inner_code) map.set(l.inner_code, (map.get(l.inner_code) ?? 0) + toNumber(l.planned_inner_qty));
      if (l.outer_code) map.set(l.outer_code, (map.get(l.outer_code) ?? 0) + toNumber(l.planned_outer_qty));
    }
    return map;
  }, [soLines]);

  const finishedByCode = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of soLines as any[]) {
      if (l.item_code) map.set(l.item_code, (map.get(l.item_code) ?? 0) + toNumber(l.packed_item_qty));
      if (l.inner_code) map.set(l.inner_code, (map.get(l.inner_code) ?? 0) + toNumber(l.packed_inner_qty));
      if (l.outer_code) map.set(l.outer_code, (map.get(l.outer_code) ?? 0) + toNumber(l.packed_outer_qty));
    }
    return map;
  }, [soLines]);

  /**
   * ✅ REQUIRED LOGIC:
   * 1) planned_remaining = plannedReq - finished
   * 2) unplanned_after = received_unplanned - planned_remaining
   */
  const merged: (LiveStockRow & { finished_stock_qty?: number })[] = useMemo(() => {
    const mrMap = new Map(aggregatedStock.map((x) => [x.item_code, x]));
    const base = Array.isArray(master) ? (master as any[]) : [];

    return base.map((m) => {
      const code = String(m.item_code ?? "").trim();
      const mr = mrMap.get(code);

      const receivedUnplanned = toNumber(mr?.unplanned_stock_qty ?? 0);

      const plannedReq = toNumber(plannedReqByCode.get(code) ?? 0);
      const finished = toNumber(finishedByCode.get(code) ?? 0);

      const plannedRemaining = Math.max(0, plannedReq - finished); // ✅ quantity still needed for SO
      const unplannedAfter = receivedUnplanned - (plannedRemaining + finished); // ✅ material NOT yet assigned to any SO (active or finished)

      return {
        ...m,
        unplanned_stock_qty: unplannedAfter,
        planned_req_qty: plannedReq, // ✅ NEW
        planned_stock_qty: plannedRemaining,
        finished_stock_qty: finished,
        age: mr?.age ?? "",
        plant_name: (mr?.plant_name ?? m.plant_name ?? "") as string,
      };
    });
  }, [master, aggregatedStock, plannedReqByCode, finishedByCode]);

  /** ---------- filters ---------- */
  const [search, setSearch] = useState("");
  const [plantFilter, setPlantFilter] = useState("all");
  const [packTypeFilter, setPackTypeFilter] = useState("all");
  const [packSizeFilter, setPackSizeFilter] = useState("all");
  const [colorRange, setColorRange] = useState<"all" | "over_100" | "66_100" | "33_66" | "below_33">("all");

  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "", direction: "asc" });
  const [rowsPerPage, setRowsPerPage] = useState(ITEMS_PER_PAGE);
  const [currentPage, setCurrentPage] = useState(1);

  const uniquePlants = useMemo(() => {
    return Array.from(new Set(merged.map((x) => (x.plant_name || "").trim()).filter(Boolean))).sort();
  }, [merged]);

  const uniquePackTypes = useMemo(() => {
    return Array.from(new Set(merged.map((x: any) => (x.pack_type || "").trim()).filter(Boolean))).sort();
  }, [merged]);

  const uniquePackSizes = useMemo(() => {
    return Array.from(new Set(merged.map((x: any) => (x.pack_size || "").trim()).filter(Boolean))).sort();
  }, [merged]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return merged.filter((item: any) => {
      const searchOK = q ? Object.values(item).some((v) => String(v ?? "").toLowerCase().includes(q)) : true;

      const plantOK =
        plantFilter === "all" ? true : (item.plant_name || "").toLowerCase() === plantFilter.toLowerCase();
      const ptOK =
        packTypeFilter === "all" ? true : (item.pack_type || "").toLowerCase() === packTypeFilter.toLowerCase();
      const psOK =
        packSizeFilter === "all" ? true : (item.pack_size || "").toLowerCase() === packSizeFilter.toLowerCase();

      const max = toNumber(item.max_level);
      const unplanned = toNumber(item.unplanned_stock_qty);
      const pct = max > 0 ? (unplanned / max) * 100 : null;

      const colorOK = (() => {
        switch (colorRange) {
          case "over_100":
            return pct !== null && pct > 100;
          case "66_100":
            return pct !== null && pct > 66 && pct <= 100;
          case "33_66":
            return pct !== null && pct > 33 && pct <= 66;
          case "below_33":
            return pct !== null && pct <= 33;
          default:
            return true;
        }
      })();

      return searchOK && plantOK && ptOK && psOK && colorOK;
    });
  }, [merged, search, plantFilter, packTypeFilter, packSizeFilter, colorRange]);

  const sorted = useMemo(() => {
    if (!sortConfig.key) return filtered;

    const { key, direction } = sortConfig;
    const dir = direction === "asc" ? 1 : -1;

    return [...filtered].sort((a: any, b: any) => {
      const av = a?.[key];
      const bv = b?.[key];
      const an = Number(av);
      const bn = Number(bv);
      const bothNum = Number.isFinite(an) && Number.isFinite(bn);

      if (bothNum) return dir * (an - bn);
      return dir * String(av ?? "").localeCompare(String(bv ?? ""), undefined, { numeric: true, sensitivity: "base" });
    });
  }, [filtered, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / rowsPerPage));
  const page = Math.min(currentPage, totalPages);
  const startIndex = (page - 1) * rowsPerPage;
  const endIndex = Math.min(sorted.length, startIndex + rowsPerPage);
  const currentItems = useMemo(() => sorted.slice(startIndex, endIndex), [sorted, startIndex, endIndex]);

  const handleSort = useCallback((key: string) => {
    setSortConfig((prev) => {
      const direction = prev.key === key && prev.direction === "asc" ? "desc" : "asc";
      return { key, direction };
    });
  }, []);

  const sortIcon = (key: string) => {
    if (sortConfig.key !== key) return <FaSort className="opacity-60" />;
    return sortConfig.direction === "asc" ? <FaSortUp /> : <FaSortDown />;
  };

  const loading = masterLoading || recLoading || soLoading || fgLoading;
  const error = masterError || recError || soError || fgError;

  const kpiTotal = merged.length;
  const kpiVisible = filtered.length;
  const kpiUnplanned = filtered.reduce((s, o: any) => s + toNumber(o.unplanned_stock_qty), 0);
  const kpiPlannedRemain = filtered.reduce((s, o: any) => s + toNumber(o.planned_stock_qty), 0);
  const kpiFinished = filtered.reduce((s, o: any) => s + toNumber(o.finished_stock_qty), 0);

  /** ---------- DOUBLE CLICK MODAL DATA ---------- */
  const [modalOpen, setModalOpen] = useState(false);
  const [activeItemCode, setActiveItemCode] = useState<string>("");

  const plannedRowsForModal = useMemo(() => {
    if (!activeItemCode) return [];
    const code = activeItemCode;

    const items: any[] = [];
    for (const l of soLines as any[]) {
      const dt = parseBestDateAny(l) || null;
      const dateStr = dt ? dt.toISOString().slice(0, 10) : "";

      if (l.item_code === code) {
        items.push({
          date: dt?.getTime() ?? 0,
          dateStr,
          sales_order: l.sales_order,
          item_number: l.item_number,
          role: "ITEM",
          soQty: toNumber(l.planned_item_qty),
          fgQty: toNumber(l.packed_item_qty),
          balance: toNumber(l.planned_item_qty) - toNumber(l.packed_item_qty),
        });
      }
      if (l.inner_code === code) {
        items.push({
          date: dt?.getTime() ?? 0,
          dateStr,
          sales_order: l.sales_order,
          item_number: l.item_number,
          role: "INNER",
          soQty: toNumber(l.planned_inner_qty),
          fgQty: toNumber(l.packed_inner_qty),
          balance: toNumber(l.planned_inner_qty) - toNumber(l.packed_inner_qty),
        });
      }
      if (l.outer_code === code) {
        items.push({
          date: dt?.getTime() ?? 0,
          dateStr,
          sales_order: l.sales_order,
          item_number: l.item_number,
          role: "OUTER",
          soQty: toNumber(l.planned_outer_qty),
          fgQty: toNumber(l.packed_outer_qty),
          balance: toNumber(l.planned_outer_qty) - toNumber(l.packed_outer_qty),
        });
      }
    }

    // latest -> oldest
    items.sort((a, b) => (b.date ?? 0) - (a.date ?? 0));
    return items;
  }, [activeItemCode, soLines]);

  const fgRowsForModal = useMemo(() => {
    if (!activeItemCode) return [];
    const code = activeItemCode;

    // collect unique SO+Item keys where this code is used in approved SO
    const keys = new Set<string>();
    for (const l of soLines as any[]) {
      if (l.item_code === code || l.inner_code === code || l.outer_code === code) {
        const k = `${String(l.sales_order ?? "").trim()}__${String(l.item_number ?? "").trim()}`;
        keys.add(k);
      }
    }

    const rows: any[] = [];
    keys.forEach((k) => {
      const fgRows = fgRowsBySoItem.get(k) ?? [];
      for (const r of fgRows as any[]) {
        const dt = parseBestDateAny(r) || null;
        rows.push({
          ...r,
          date: dt?.getTime() ?? 0,
          dateStr: dt ? dt.toISOString().slice(0, 10) : "",
        });
      }
    });

    rows.sort((a, b) => (b.date ?? 0) - (a.date ?? 0));
    return rows;
  }, [activeItemCode, soLines, fgRowsBySoItem]);

  return (
    <div className="flex flex-col gap-3 p-4 md:p-5 text-[rgb(var(--text))]">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="flex flex-wrap items-center justify-between gap-3"
      >
        <div className="flex items-center gap-3">
          <h1 className="text-[18px] md:text-[20px] font-extrabold tracking-tight text-[rgb(var(--primary))]">
            Live Stock
          </h1>
          <span className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(255,0,0,.45)] animate-pulse" />
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-[min(360px,92vw)]">
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search item, plant, type..."
              className="h-10 w-full rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card-bg))]
                         px-3 text-[14px] shadow-[var(--shadow-sm)] outline-none
                         focus:ring-2 focus:ring-[rgb(var(--ring))]"
            />
          </div>

          <button
            onClick={() => exportCSV(filtered)}
            className="h-10 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card-bg))]
                       px-3 text-[13px] font-bold shadow-[var(--shadow-sm)]
                       hover:bg-[rgb(var(--hover-bg))]"
          >
            Export CSV
          </button>
        </div>
      </motion.div>

      {/* KPIs */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {[
          { label: "Total Items", value: kpiTotal },
          { label: "Visible", value: kpiVisible },
          { label: "Unplanned (After)", value: kpiUnplanned },
          { label: "Planned (Remain)", value: kpiPlannedRemain },
          { label: "Finished", value: kpiFinished },
        ].map((k) => (
          <div
            key={k.label}
            className="flex items-center gap-2 rounded-2xl border border-[rgb(var(--border))]
                       bg-[rgb(var(--card-bg))] px-3 py-2 text-[13px]
                       shadow-[var(--shadow-sm)]"
          >
            <span className="text-[rgb(var(--lynch))]">{k.label}</span>
            <span className="font-extrabold">{k.value}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      {/* Filters */}
      <div
        className="flex flex-wrap items-end justify-center gap-2 rounded-2xl border border-[rgb(var(--border))]
             bg-[rgb(var(--card-bg))] p-3 shadow-[var(--shadow-sm)]"
      >
        <CustomDropdown
          label="Plant"
          value={plantFilter}
          onChange={(v) => {
            setPlantFilter(String(v));
            setCurrentPage(1);
          }}
          options={[
            { label: "All", value: "all" },
            ...uniquePlants.map((p) => ({ label: p, value: p })),
          ]}
          minWidthClassName="min-w-[160px]"
        />

        <CustomDropdown
          label="Pack Type"
          value={packTypeFilter}
          onChange={(v) => {
            setPackTypeFilter(String(v));
            setCurrentPage(1);
          }}
          options={[
            { label: "All", value: "all" },
            ...uniquePackTypes.map((p) => ({ label: p, value: p })),
          ]}
          minWidthClassName="min-w-[160px]"
        />

        <CustomDropdown
          label="Pack Size"
          value={packSizeFilter}
          onChange={(v) => {
            setPackSizeFilter(String(v));
            setCurrentPage(1);
          }}
          options={[
            { label: "All", value: "all" },
            ...uniquePackSizes.map((p) => ({ label: p, value: p })),
          ]}
          minWidthClassName="min-w-[160px]"
        />

        <CustomDropdown
          label="Stock Level %"
          value={colorRange}
          onChange={(v) => {
            setColorRange(v as any);
            setCurrentPage(1);
          }}
          options={[
            { label: "All", value: "all" },
            { label: "Over 100%", value: "over_100" },
            { label: "66% - 100%", value: "66_100" },
            { label: "33% - 66%", value: "33_66" },
            { label: "Below 33%", value: "below_33" },
          ]}
          minWidthClassName="min-w-[160px]"
        />

        {/* <CustomDropdown
          label="Rows"
          value={rowsPerPage}
          onChange={(v) => {
            setRowsPerPage(Number(v));
            setCurrentPage(1);
          }}
          options={[10, 20, 30, 50, 100].map((n) => ({ label: String(n), value: n }))}
          minWidthClassName="min-w-[96px]"
        /> */}
      </div>


      {/* States */}
      {loading && (
        <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card-bg))] p-4 shadow-[var(--shadow-sm)]">
          <div className="h-4 w-48 animate-pulse rounded bg-black/10 dark:bg-white/10" />
          <div className="mt-3 h-24 w-full animate-pulse rounded bg-black/5 dark:bg-white/5" />
        </div>
      )}

      {error && !loading && (
        <div className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
          {error}
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card-bg))]
                     shadow-[var(--shadow-sm)] overflow-hidden"
        >
          <div className="max-h-[calc(100vh-360px)] overflow-auto">
            <table className="w-full table-fixed">
              <thead className="sticky top-0 z-10 bg-[rgb(var(--card-bg))]">
                <tr className="border-b border-[rgb(var(--border))]">
                  <th className="w-14 px-3 py-3 text-left text-[12px] font-extrabold text-[rgb(var(--lynch))]">#</th>

                  {COLUMNS_DISPLAY.map((col) => (
                    <th
                      key={col.key}
                      onClick={() => handleSort(String(col.key))}
                      className="select-none px-3 py-3 text-left text-[12px] font-extrabold text-[rgb(var(--lynch))]
                                 hover:text-[rgb(var(--text))] cursor-pointer"
                    >
                      <span className="inline-flex items-center gap-2">
                        {col.label} {sortIcon(String(col.key))}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {currentItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan={COLUMNS_DISPLAY.length + 1}
                      className="px-3 py-10 text-center text-[13px] text-[rgb(var(--lynch))]"
                    >
                      No results found.
                    </td>
                  </tr>
                ) : (
                  currentItems.map((item: any, idx) => {
                    const tone = cellTone(item.max_level, item.unplanned_stock_qty);
                    return (
                      <tr
                        key={item.item_code ?? `${startIndex}-${idx}`}
                        onDoubleClick={() => {
                          const code = String(item.item_code ?? "").trim();
                          if (!code) return;
                          router.push(`/app/live-stock/${encodeURIComponent(code)}`);
                        }}

                        className="border-b border-[rgb(var(--border))] hover:bg-[rgb(var(--hover-bg))] transition-colors"
                        title="Double click to view item details"
                      >
                        <td className="px-3 py-2 text-[13px] text-[rgb(var(--lynch))]">{startIndex + idx + 1}</td>

                        <td className={`px-3 py-2 text-[13px] font-semibold ${tone.text}`}>
                          <div className="truncate">{item.description || "-"}</div>
                          <div className="mt-0.5 text-[11px] text-[rgb(var(--bayoux))] truncate">{item.item_code}</div>
                        </td>

                        <td className="px-3 py-2 text-[13px]">
                          <span className={`inline-flex rounded-full px-2 py-1 text-[12px] font-bold ${tone.bg} ${tone.text}`}>
                            {item.plant_name || "-"}
                          </span>
                        </td>

                        <td className="px-3 py-2 text-left text-[13px]">
                          <span className={`inline-flex min-w-[72px] justify-center rounded-xl px-2 py-1 font-extrabold ${tone.bg} ${tone.text}`}>
                            {String(item.max_level ?? "")}
                          </span>
                        </td>

                        <td className="px-3 py-2 text-left text-[13px]">
                          <span className={`inline-flex min-w-[72px] justify-center rounded-xl px-2 py-1 font-extrabold ${tone.bg} ${tone.text}`}>
                            {toNumber(item.unplanned_stock_qty)}
                          </span>
                        </td>

                        <td className="px-3 py-2 text-left text-[13px]">
                          <span className="inline-flex min-w-[72px] justify-center rounded-xl border border-[rgb(var(--border))]
                                           bg-transparent px-2 py-1 font-extrabold text-[rgb(var(--lynch))]">
                            {toNumber(item.planned_req_qty)}
                          </span>
                        </td>

                        <td className="px-3 py-2 text-left text-[13px]">
                          <span className="inline-flex min-w-[72px] justify-center rounded-xl border border-[rgb(var(--border))]
                                           bg-transparent px-2 py-1 font-extrabold text-[rgb(var(--lynch))]">
                            {toNumber(item.planned_stock_qty)}
                          </span>
                        </td>

                        <td className="px-3 py-2 text-left text-[13px]">
                          <span className="inline-flex min-w-[72px] justify-center rounded-xl border border-[rgb(var(--border))]
                                           bg-transparent px-2 py-1 font-extrabold text-[rgb(var(--lynch))]">
                            {toNumber(item.finished_stock_qty)}
                          </span>
                        </td>

                        <td className="px-3 py-2 text-left text-[13px]">
                          <span className={`font-extrabold ${tone.text}`}>{item.age !== "" ? item.age : "-"}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[rgb(var(--border))] px-3 py-3">
            <div className="text-[13px] text-[rgb(var(--lynch))]">
              Showing <span className="font-extrabold">{sorted.length ? startIndex + 1 : 0}</span>–
              <span className="font-extrabold">{endIndex}</span> of{" "}
              <span className="font-extrabold">{sorted.length}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setCurrentPage(1)}
                className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card-bg))]
                           px-3 py-2 text-[13px] font-bold hover:bg-[rgb(var(--hover-bg))] disabled:opacity-50"
              >
                « First
              </button>
              <button
                disabled={page <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card-bg))]
                           px-3 py-2 text-[13px] font-bold hover:bg-[rgb(var(--hover-bg))] disabled:opacity-50"
              >
                ‹ Prev
              </button>
              <div className="text-[13px] font-bold">
                Page <span className="text-[rgb(var(--primary))]">{page}</span> / {totalPages}
              </div>
              <button
                disabled={page >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card-bg))]
                           px-3 py-2 text-[13px] font-bold hover:bg-[rgb(var(--hover-bg))] disabled:opacity-50"
              >
                Next ›
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setCurrentPage(totalPages)}
                className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card-bg))]
                           px-3 py-2 text-[13px] font-bold hover:bg-[rgb(var(--hover-bg))] disabled:opacity-50"
              >
                Last »
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* ✅ Double-click modal */}
      <ItemDetailsModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        itemCode={activeItemCode}
        plannedRows={plannedRowsForModal}
        fgRows={fgRowsForModal}
      />
    </div>
  );
}
