"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { FinishedGoodsRow, SOComputedLine } from "@/types";

export default function SoLineModal({
  open,
  onClose,
  line,
  matchedFG,
}: {
  open: boolean;
  onClose: () => void;
  line: SOComputedLine | null;
  matchedFG: FinishedGoodsRow[];
}) {
  return (
    <AnimatePresence>
      {open && line && (
        <motion.div
          className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[2px] p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="mx-auto mt-[8vh] w-[min(980px,96vw)] overflow-hidden rounded-2xl border border-[rgb(var(--border))]
                       bg-[rgb(var(--card-bg))] text-[rgb(var(--text))] shadow-[0_30px_80px_rgba(0,0,0,0.30)]"
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[rgb(var(--border))] px-4 py-3">
              <div className="font-extrabold">
                SO <span className="text-[rgb(var(--primary))]">{line.sales_order}</span> • Item{" "}
                <span className="text-[rgb(var(--primary))]">{line.item_number}</span>
              </div>
              <button
                onClick={onClose}
                className="rounded-xl border border-[rgb(var(--border))] px-3 py-1.5 text-[13px] font-bold hover:bg-[rgb(var(--hover-bg))]"
              >
                Close
              </button>
            </div>

            <div className="grid gap-3 p-4 md:grid-cols-3">
              <div className="rounded-2xl border border-[rgb(var(--border))] p-3">
                <div className="text-[12px] font-bold text-[rgb(var(--lynch))]">Codes</div>
                <div className="mt-2 grid gap-1 text-[13px]">
                  <div><span className="font-bold">Item:</span> {line.item_code}</div>
                  <div><span className="font-bold">Inner:</span> {line.inner_code}</div>
                  <div><span className="font-bold">Outer:</span> {line.outer_code}</div>
                  <div className="mt-1 text-[12px] text-[rgb(var(--bayoux))]">Pack: {line.pack_size} (×{line.multiplier})</div>
                </div>
              </div>

              <div className="rounded-2xl border border-[rgb(var(--border))] p-3">
                <div className="text-[12px] font-bold text-[rgb(var(--lynch))]">SO vs FG</div>
                <div className="mt-2 grid gap-1 text-[13px]">
                  <div><span className="font-bold">SO Bags:</span> {line.planned_bags}</div>
                  <div><span className="font-bold">FG Packed Bags:</span> {line.packed_bags}</div>
                  <div className="mt-2 font-extrabold text-[rgb(var(--primary))]">Balance</div>
                  <div>Item: {line.balance_item_qty}</div>
                  <div>Inner: {line.balance_inner_qty}</div>
                  <div>Outer: {line.balance_outer_qty}</div>
                </div>
              </div>

              <div className="rounded-2xl border border-[rgb(var(--border))] p-3">
                <div className="text-[12px] font-bold text-[rgb(var(--lynch))]">MR Stock Snapshot</div>
                <div className="mt-2 grid gap-1 text-[13px]">
                  <div>MR Item: <span className="font-bold">{line.mr_item_qty}</span></div>
                  <div>MR Inner: <span className="font-bold">{line.mr_inner_qty}</span></div>
                  <div>MR Outer: <span className="font-bold">{line.mr_outer_qty}</span></div>
                  <div className="mt-2 font-extrabold text-[rgb(var(--primary))]">MR Balance (after FG)</div>
                  <div>Item: {line.mr_balance_item}</div>
                  <div>Inner: {line.mr_balance_inner}</div>
                  <div>Outer: {line.mr_balance_outer}</div>
                </div>
              </div>
            </div>

            <div className="border-t border-[rgb(var(--border))] p-4">
              <div className="mb-2 text-[12px] font-extrabold text-[rgb(var(--lynch))]">Matched Finished Goods Rows</div>
              <div className="max-h-[45vh] overflow-auto rounded-xl border border-[rgb(var(--border))]">
                <table className="w-full table-fixed">
                  <thead className="sticky top-0 bg-[rgb(var(--card-bg))]">
                    <tr className="border-b border-[rgb(var(--border))]">
                      <th className="px-3 py-2 text-left text-[12px] font-extrabold text-[rgb(var(--lynch))]">Timestamp</th>
                      <th className="px-3 py-2 text-left text-[12px] font-extrabold text-[rgb(var(--lynch))]">Plant</th>
                      <th className="px-3 py-2 text-left text-[12px] font-extrabold text-[rgb(var(--lynch))]">Qty Packed</th>
                      <th className="px-3 py-2 text-left text-[12px] font-extrabold text-[rgb(var(--lynch))]">Item Code</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matchedFG.length === 0 ? (
                      <tr><td colSpan={4} className="px-3 py-8 text-center text-[13px] text-[rgb(var(--lynch))]">No FG match found.</td></tr>
                    ) : (
                      matchedFG.map((r, i) => (
                        <tr key={i} className="border-b border-[rgb(var(--border))]">
                          <td className="px-3 py-2 text-[13px]">{String(r.timestamp ?? "-")}</td>
                          <td className="px-3 py-2 text-[13px]">{String(r.select_plant_name ?? "-")}</td>
                          <td className="px-3 py-2 text-[13px] font-extrabold">{String(r.quantity_packed ?? 0)}</td>
                          <td className="px-3 py-2 text-[13px]">{String(r.item_code ?? "-")}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
