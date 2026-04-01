"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { FaSort, FaSortDown, FaSortUp, FaDownload } from "react-icons/fa";

import CustomDropdown from "@/components/CustomDropdown";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchMasterData } from "@/store/slices/masterDataSlice";

type SortDir = "asc" | "desc";
type SortConfig = { key: string; direction: SortDir };

function norm(v: any) {
  return String(v ?? "").trim();
}
function toNum(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function exportCSV(rows: any[], filenameBase = "ims_master") {
  if (!rows?.length) return;
  const keys = Array.from(new Set(rows.flatMap((r) => Object.keys(r)))).sort();
  const esc = (v: any) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [keys.join(","), ...rows.map((r) => keys.map((k) => esc(r[k])).join(","))].join("\r\n");
  const blob = new Blob([lines], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filenameBase}_${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** iOS/SaaS theme helpers */
const card =
  "rounded-3xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-[#0B0F19]/70 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.06)] dark:shadow-[0_18px_50px_rgba(0,0,0,0.45)]";
const softRing =
  "outline-none focus:ring-4 focus:ring-black/10 dark:focus:ring-white/10 focus:border-black/10 dark:focus:border-white/10";
const subtleText = "text-black/55 dark:text-white/55";

function packTypeBadge(type: any) {
  const t = norm(type).toUpperCase();
  switch (t) {
    case "BOPP":
      return "bg-sky-500/12 text-sky-800 dark:text-sky-200 border-sky-500/25";
    case "HDPE":
      return "bg-indigo-500/12 text-indigo-800 dark:text-indigo-200 border-indigo-500/25";
    case "JAR":
      return "bg-emerald-500/12 text-emerald-800 dark:text-emerald-200 border-emerald-500/25";
    case "JUTE BROWN":
      return "bg-amber-600/12 text-amber-900 dark:text-amber-200 border-amber-600/25";
    case "JUTE WHITE":
      return "bg-stone-400/15 text-stone-800 dark:text-stone-200 border-stone-400/25";
    case "KTC BOX":
      return "bg-violet-500/12 text-violet-800 dark:text-violet-200 border-violet-500/25";
    case "NONWOVEN":
      return "bg-teal-500/12 text-teal-800 dark:text-teal-200 border-teal-500/25";
    case "PLASTIC POUCH":
      return "bg-fuchsia-500/12 text-fuchsia-800 dark:text-fuchsia-200 border-fuchsia-500/25";
    default:
      return "bg-slate-500/12 text-slate-800 dark:text-slate-200 border-slate-500/25";
  }
}

const COLUMNS: Array<{ key: string; label: string; align?: "left" | "right"; width?: string; numeric?: boolean }> = [
  { key: "item_code", label: "Item Code", width: "w-[160px]" },
  { key: "description", label: "Description", width: "w-[320px]" },
  { key: "pack_type", label: "Pack Type", width: "w-[140px]" },
  { key: "pack_size", label: "Pack Size", width: "w-[140px]" },
  { key: "unit", label: "Unit", width: "w-[90px]" },
  { key: "brand", label: "Brand", width: "w-[120px]" },
  { key: "design_type", label: "Design Type", width: "w-[170px]" },
  { key: "hsn_code", label: "HSN", width: "w-[120px]" },
  { key: "lead_time", label: "Lead Time", align: "right", width: "w-[120px]", numeric: true },
  { key: "max_level", label: "Max Level", align: "right", width: "w-[130px]", numeric: true },
  { key: "avg_monthly_consumption_normal", label: "Avg Monthly (Normal)", align: "right", width: "w-[190px]", numeric: true },
  { key: "avg_daily_consumption_peak", label: "Avg Daily (Peak)", align: "right", width: "w-[170px]", numeric: true },
  { key: "avg_monthly_consumption_off", label: "Avg Monthly (Off)", align: "right", width: "w-[170px]", numeric: true },
  { key: "safety_factor", label: "Safety", align: "right", width: "w-[130px]", numeric: true },
  { key: "season", label: "Season", width: "w-[140px]" },
];

function getPageItems(current: number, total: number) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const items: Array<number | "..."> = [];
  items.push(1);

  const left = Math.max(2, current - 1);
  const right = Math.min(total - 1, current + 1);

  if (left > 2) items.push("...");

  for (let p = left; p <= right; p++) items.push(p);

  if (right < total - 1) items.push("...");

  items.push(total);
  return items;
}

export default function IMSMasterPage() {
  const dispatch = useAppDispatch();

  const master = useAppSelector((s) => s.masterData.data);
  const loading = useAppSelector((s) => s.masterData.loading);
  const error = useAppSelector((s) => s.masterData.error);

  useEffect(() => {
    dispatch(fetchMasterData());
  }, [dispatch]);

  const rows: any[] = useMemo(() => (Array.isArray(master) ? (master as any[]) : []), [master]);

  /** filters */
  const [search, setSearch] = useState("");
  const [packType, setPackType] = useState("all");
  const [packSize, setPackSize] = useState("all");
  const [unit, setUnit] = useState("all");
  const [brand, setBrand] = useState("all");
  const [designType, setDesignType] = useState("all");

  const [sort, setSort] = useState<SortConfig>({ key: "", direction: "asc" });
  const [rowsPerPage, setRowsPerPage] = useState(30);
  const [page, setPage] = useState(1);

  const unique = useCallback(
    (key: string) => {
      return Array.from(new Set(rows.map((r) => norm(r?.[key])).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
      );
    },
    [rows]
  );

  const packTypes = useMemo(() => unique("pack_type"), [unique]);
  const packSizes = useMemo(() => unique("pack_size"), [unique]);
  const units = useMemo(() => unique("unit"), [unique]);
  const brands = useMemo(() => unique("brand"), [unique]);
  const designTypes = useMemo(() => unique("design_type"), [unique]);

  /** single source of truth: row matcher (search + filters) */
  const matchRow = useCallback(
    (
      r: any,
      overrides?: Partial<{
        pack_type: string;
        pack_size: string;
        unit: string;
        brand: string;
        design_type: string;
      }>
    ) => {
      const q = search.trim().toLowerCase();
      const qOK = q ? Object.values(r).some((v) => String(v ?? "").toLowerCase().includes(q)) : true;

      const pt = overrides?.pack_type ?? packType;
      const ps = overrides?.pack_size ?? packSize;
      const un = overrides?.unit ?? unit;
      const br = overrides?.brand ?? brand;
      const dt = overrides?.design_type ?? designType;

      const ptOK = pt === "all" ? true : norm(r.pack_type).toLowerCase() === pt.toLowerCase();
      const psOK = ps === "all" ? true : norm(r.pack_size).toLowerCase() === ps.toLowerCase();
      const uOK = un === "all" ? true : norm(r.unit).toLowerCase() === un.toLowerCase();
      const bOK = br === "all" ? true : norm(r.brand).toLowerCase() === br.toLowerCase();
      const dtOK = dt === "all" ? true : norm(r.design_type).toLowerCase() === dt.toLowerCase();

      return qOK && ptOK && psOK && uOK && bOK && dtOK;
    },
    [search, packType, packSize, unit, brand, designType]
  );

  const filtered = useMemo(() => rows.filter((r) => matchRow(r)), [rows, matchRow]);

  /** counts per dropdown (computed with all filters EXCEPT current key) */
  const countFor = useCallback(
    (key: "pack_type" | "pack_size" | "unit" | "brand" | "design_type") => {
      const base = rows.filter((r) =>
        matchRow(r, {
          pack_type: key === "pack_type" ? "all" : packType,
          pack_size: key === "pack_size" ? "all" : packSize,
          unit: key === "unit" ? "all" : unit,
          brand: key === "brand" ? "all" : brand,
          design_type: key === "design_type" ? "all" : designType,
        })
      );

      const map = new Map<string, number>();
      for (const r of base) {
        const v = norm(r?.[key]);
        if (!v) continue;
        map.set(v, (map.get(v) ?? 0) + 1);
      }
      return { baseTotal: base.length, map };
    },
    [rows, matchRow, packType, packSize, unit, brand, designType]
  );

  const ptCounts = useMemo(() => countFor("pack_type"), [countFor]);
  const psCounts = useMemo(() => countFor("pack_size"), [countFor]);
  const uCounts = useMemo(() => countFor("unit"), [countFor]);
  const bCounts = useMemo(() => countFor("brand"), [countFor]);
  const dtCounts = useMemo(() => countFor("design_type"), [countFor]);

  const packTypeOptions = useMemo(() => {
    return [
      { label: "All", value: "all", count: ptCounts.baseTotal },
      ...packTypes.map((v) => ({ label: v, value: v, count: ptCounts.map.get(v) ?? 0 })),
    ];
  }, [packTypes, ptCounts]);

  const packSizeOptions = useMemo(() => {
    return [
      { label: "All", value: "all", count: psCounts.baseTotal },
      ...packSizes.map((v) => ({ label: v, value: v, count: psCounts.map.get(v) ?? 0 })),
    ];
  }, [packSizes, psCounts]);

  const unitOptions = useMemo(() => {
    return [
      { label: "All", value: "all", count: uCounts.baseTotal },
      ...units.map((v) => ({ label: v, value: v, count: uCounts.map.get(v) ?? 0 })),
    ];
  }, [units, uCounts]);

  const brandOptions = useMemo(() => {
    return [
      { label: "All", value: "all", count: bCounts.baseTotal },
      ...brands.map((v) => ({ label: v, value: v, count: bCounts.map.get(v) ?? 0 })),
    ];
  }, [brands, bCounts]);

  const designTypeOptions = useMemo(() => {
    return [
      { label: "All", value: "all", count: dtCounts.baseTotal },
      ...designTypes.map((v) => ({ label: v, value: v, count: dtCounts.map.get(v) ?? 0 })),
    ];
  }, [designTypes, dtCounts]);

  const sorted = useMemo(() => {
    if (!sort.key) return filtered;

    const col = COLUMNS.find((c) => c.key === sort.key);
    const dir = sort.direction === "asc" ? 1 : -1;

    return [...filtered].sort((a: any, b: any) => {
      const av = a?.[sort.key];
      const bv = b?.[sort.key];

      if (col?.numeric) return dir * (toNum(av) - toNum(bv));

      return (
        dir *
        String(av ?? "").localeCompare(String(bv ?? ""), undefined, {
          numeric: true,
          sensitivity: "base",
        })
      );
    });
  }, [filtered, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / rowsPerPage));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * rowsPerPage;
  const end = Math.min(sorted.length, start + rowsPerPage);
  const current = useMemo(() => sorted.slice(start, end), [sorted, start, end]);

  const pageItems = useMemo(() => getPageItems(safePage, totalPages), [safePage, totalPages]);

  const handleSort = useCallback((key: string) => {
    setSort((p) => {
      const direction: SortDir = p.key === key && p.direction === "asc" ? "desc" : "asc";
      return { key, direction };
    });
  }, []);

  const sortIcon = (key: string) => {
    if (sort.key !== key) return <FaSort className="opacity-60" />;
    return sort.direction === "asc" ? <FaSortUp /> : <FaSortDown />;
  };

  const resetFilters = () => {
    setSearch("");
    setPackType("all");
    setPackSize("all");
    setUnit("all");
    setBrand("all");
    setDesignType("all");
    setPage(1);
  };

  return (
    <div className="h-[100dvh] overflow-hidden p-4 md:p-6 flex flex-col">
      <div className="pointer-events-none fixed inset-x-0 -top-24 h-72 bg-gradient-to-b from-black/5 to-transparent dark:from-white/5" />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        // className="flex flex-col gap-3 shrink-0"
        className="relative z-30 flex flex-col gap-3 shrink-0"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-black/5 to-black/0 dark:from-white/10 dark:to-white/0 border border-black/5 dark:border-white/10 shadow-[0_14px_30px_rgba(0,0,0,0.06)] dark:shadow-[0_18px_50px_rgba(0,0,0,0.45)]" />
            <div>
              <h1 className="text-[18px] md:text-[22px] font-black tracking-tight text-black/90 dark:text-white">
                IMS Master
              </h1>
              <div className={`text-[12px] font-bold ${subtleText}`}>Master catalog • sortable grid • fast filters</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search item_code, description, pack..."
              className={`h-10 w-[min(520px,92vw)] rounded-2xl border border-black/10 dark:border-white/10
                          bg-white/70 dark:bg-white/5 px-3 text-[14px] font-semibold shadow-[0_10px_24px_rgba(0,0,0,0.06)]
                          text-black/90 dark:text-white placeholder:text-black/35 dark:placeholder:text-white/35 ${softRing}`}
            />

            <button
              onClick={() => exportCSV(sorted, "ims_master")}
              className="h-10 rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5
                         px-3 text-[13px] font-black shadow-[0_10px_24px_rgba(0,0,0,0.06)]
                         hover:bg-black/5 dark:hover:bg-white/10 text-black/90 dark:text-white inline-flex items-center gap-2"
            >
              <FaDownload /> Export CSV
            </button>
          </div>
        </div>

        {/* Filters bar */}
        <div className={`${card} p-3`}>
          <div className="flex flex-wrap items-end gap-2">
            <CustomDropdown
              label="Pack Type"
              value={packType}
              onChange={(v) => {
                setPackType(v);
                setPage(1);
              }}
              options={packTypeOptions}
            // minWidthClassName="min-w-[170px]"
            />

            <CustomDropdown
              label="Pack Size"
              value={packSize}
              onChange={(v) => {
                setPackSize(v);
                setPage(1);
              }}
              options={packSizeOptions}
            // minWidthClassName="min-w-[170px]"
            />

            <CustomDropdown
              label="Unit"
              value={unit}
              onChange={(v) => {
                setUnit(v);
                setPage(1);
              }}
              options={unitOptions}
            // minWidthClassName="min-w-[120px]"
            />

            <CustomDropdown
              label="Brand"
              value={brand}
              onChange={(v) => {
                setBrand(v);
                setPage(1);
              }}
              options={brandOptions}
            // minWidthClassName="min-w-[140px]"
            />

            <CustomDropdown
              label="Design Type"
              value={designType}
              onChange={(v) => {
                setDesignType(v);
                setPage(1);
              }}
              options={designTypeOptions}
            // minWidthClassName="min-w-[190px]"
            />

            <div className="min-w-[110px]">
              <div className={`mb-1 text-[12px] font-bold ${subtleText}`}>Rows</div>
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setPage(1);
                }}
                className={`h-9 w-full rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5
                            px-2 text-[13px] font-bold text-black/80 dark:text-white ${softRing}`}
              >
                {[20, 30, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>

            {/* <CustomDropdown
              label="Rows"
              value={rowsPerPage}
              onChange={(v) => {
                setRowsPerPage(Number(v));
                setPage(1);
              }}
              options={[20, 30, 50, 100].map((n) => ({
                label: n.toString(),
                value: n,
              }))}
              minWidthClassName="min-w-[110px]"
            /> */}

            <div className="flex-1" />

            <button
              onClick={resetFilters}
              className="h-9 rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5
                         px-3 text-[13px] font-black hover:bg-black/5 dark:hover:bg-white/10 text-black/80 dark:text-white"
            >
              Reset
            </button>

            <div className={`text-[12px] font-black ${subtleText} px-2`}>
              Showing <span className="text-black/90 dark:text-white">{sorted.length}</span> items
            </div>
          </div>
        </div>
      </motion.div>

      {/* States + Table region */}
      <div className="relative z-10 mt-3 flex-1 min-h-0">
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

        {!loading && !error && (
          <div className={`${card} overflow-hidden flex flex-col h-full`}>
            {/* Only table scrolls */}
            <div className="flex-1 min-h-0 overflow-auto">
              <table className="w-full table-fixed">
                <thead className="sticky top-0 z-10 bg-white/80 dark:bg-[#0B0F19]/80 backdrop-blur-xl">
                  <tr className="border-b border-black/5 dark:border-white/10">
                    <th className={`px-3 py-3 text-left text-[12px] font-black ${subtleText} whitespace-nowrap w-[60px]`}>#</th>

                    {COLUMNS.map((c) => (
                      <th
                        key={c.key}
                        onClick={() => handleSort(c.key)}
                        className={`px-3 py-3 text-left text-[12px] font-black ${subtleText} cursor-pointer select-none hover:text-black/90 dark:hover:text-white whitespace-nowrap ${c.width ?? ""}`}
                        title="Click to sort"
                      >
                        <span className="inline-flex items-center gap-2 whitespace-nowrap">
                          {c.label} {sortIcon(c.key)}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {current.length === 0 ? (
                    <tr>
                      <td colSpan={COLUMNS.length + 1} className={`px-3 py-10 text-center text-[13px] font-semibold ${subtleText}`}>
                        No results found.
                      </td>
                    </tr>
                  ) : (
                    current.map((r, idx) => (
                      <tr
                        key={`${r.item_code}_${start + idx}`}
                        className="border-b border-black/5 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                      >
                        <td className={`px-3 py-2 text-[13px] ${subtleText} whitespace-nowrap`}>{start + idx + 1}</td>

                        {/* item_code */}
                        <td className="px-3 py-2 whitespace-nowrap">
                          <div className="inline-flex flex-col">
                            <span className="text-[13px] font-black text-black/90 dark:text-white whitespace-nowrap">{norm(r.item_code) || "-"}</span>
                            <span className="text-[11px] font-bold text-black/45 dark:text-white/45 whitespace-nowrap">HSN: {norm(r.hsn_code) || "-"}</span>
                          </div>
                        </td>

                        {/* description */}
                        <td className="px-3 py-2">
                          <div className="font-semibold text-[13px] text-black/85 dark:text-white/90 truncate">{norm(r.description) || "-"}</div>
                        </td>

                        {/* pack_type */}
                        <td className="px-3 py-2 whitespace-nowrap">
                          {norm(r.pack_type) ? (
                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-[12px] font-black ${packTypeBadge(r.pack_type)}`}>
                              {norm(r.pack_type)}
                            </span>
                          ) : (
                            <span className={`text-[12px] font-bold ${subtleText}`}>-</span>
                          )}
                        </td>

                        {/* pack_size */}
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className="inline-flex rounded-2xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-white/5 px-2.5 py-1 text-[12px] font-black text-black/80 dark:text-white">
                            {norm(r.pack_size) || "-"}
                          </span>
                        </td>

                        {/* unit */}
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className="text-[13px] font-black text-black/70 dark:text-white/80">{norm(r.unit) || "-"}</span>
                        </td>

                        {/* brand */}
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className="text-[13px] font-black text-black/70 dark:text-white/80">{norm(r.brand) || "-"}</span>
                        </td>

                        {/* design_type */}
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className="inline-flex rounded-full border border-black/10 dark:border-white/10 bg-white/60 dark:bg-white/5 px-2.5 py-1 text-[12px] font-black text-black/70 dark:text-white/80">
                            {norm(r.design_type) || "-"}
                          </span>
                        </td>

                        {/* hsn_code */}
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className="text-[13px] font-black text-black/60 dark:text-white/70">{norm(r.hsn_code) || "-"}</span>
                        </td>

                        {/* lead_time */}
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          <span className="inline-flex min-w-[72px] justify-center rounded-2xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-white/5 px-2.5 py-1 text-[12px] font-black text-black/75 dark:text-white">
                            {norm(r.lead_time) || "-"}
                          </span>
                        </td>

                        {/* max_level */}
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          <span className="inline-flex min-w-[72px] justify-center rounded-2xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-white/5 px-2.5 py-1 text-[12px] font-black text-black/75 dark:text-white">
                            {norm(r.max_level) || "-"}
                          </span>
                        </td>

                        {/* avg normal */}
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          <span className={`text-[13px] font-black ${subtleText}`}>{norm(r.avg_monthly_consumption_normal) || "-"}</span>
                        </td>

                        {/* avg peak */}
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          <span className={`text-[13px] font-black ${subtleText}`}>{norm(r.avg_daily_consumption_peak) || "-"}</span>
                        </td>

                        {/* avg off */}
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          <span className={`text-[13px] font-black ${subtleText}`}>{norm(r.avg_monthly_consumption_off) || "-"}</span>
                        </td>

                        {/* safety_factor */}
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          <span className={`text-[13px] font-black ${subtleText}`}>{norm(r.safety_factor) || "-"}</span>
                        </td>

                        {/* season */}
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className={`text-[13px] font-black ${subtleText}`}>{norm(r.season) || "-"}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination fixed */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-black/5 dark:border-white/10 px-3 py-3">
              <div className={`text-[13px] font-semibold ${subtleText}`}>
                Showing <span className="font-black text-black/85 dark:text-white">{sorted.length ? start + 1 : 0}</span>–
                <span className="font-black text-black/85 dark:text-white">{end}</span> of{" "}
                <span className="font-black text-black/85 dark:text-white">{sorted.length}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  disabled={safePage <= 1}
                  onClick={() => setPage(1)}
                  className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-white/5
                             px-3 py-2 text-[13px] font-black hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-50
                             text-black/80 dark:text-white"
                >
                  « First
                </button>
                <button
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-white/5
                             px-3 py-2 text-[13px] font-black hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-50
                             text-black/80 dark:text-white"
                >
                  ‹ Prev
                </button>

                {/* Center page numbers (md+) */}
                <div className="mx-2 hidden md:flex items-center gap-1.5">
                  {pageItems.map((it, i) => {
                    if (it === "...") {
                      return (
                        <span key={`dots_${i}`} className={`px-2 text-[13px] font-black ${subtleText}`}>
                          …
                        </span>
                      );
                    }
                    const active = it === safePage;
                    return (
                      <button
                        key={`p_${it}`}
                        onClick={() => setPage(it)}
                        className={`
                          h-9 min-w-[40px] rounded-2xl border
                          ${active
                            ? "border-black/20 dark:border-white/20 bg-black/5 dark:bg-white/10"
                            : "border-black/10 dark:border-white/10 bg-white/60 dark:bg-white/5 hover:bg-black/5 dark:hover:bg-white/10"
                          }
                          px-3 text-[13px] font-black
                          ${active ? "text-black dark:text-white" : "text-black/75 dark:text-white/80"}
                        `}
                        aria-current={active ? "page" : undefined}
                      >
                        {it}
                      </button>
                    );
                  })}
                </div>

                <button
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-white/5
                             px-3 py-2 text-[13px] font-black hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-50
                             text-black/80 dark:text-white"
                >
                  Next ›
                </button>
                <button
                  disabled={safePage >= totalPages}
                  onClick={() => setPage(totalPages)}
                  className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-white/5
                             px-3 py-2 text-[13px] font-black hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-50
                             text-black/80 dark:text-white"
                >
                  Last »
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
