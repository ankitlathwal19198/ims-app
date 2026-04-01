"use client";

import React, { useEffect, useMemo } from "react";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchSalesOrder } from "@/store/slices/salesOrderSlice";
import { fetchFinishedGoods } from "@/store/slices/finishedGoodsSlice";
import { fetchMaterialReceived } from "@/store/slices/materialReceivedSlice";

export default function DashboardPage() {
  const dispatch = useAppDispatch();
  const so = useAppSelector((s) => s.salesOrder.data);
  const fg = useAppSelector((s) => s.finishedGoods.data);
  const mr = useAppSelector((s) => s.materialReceived.data);

  useEffect(() => {
    dispatch(fetchSalesOrder());
    dispatch(fetchFinishedGoods());
    dispatch(fetchMaterialReceived());
  }, [dispatch]);

  // quick KPIs (same matching principle, simplified)
  const stats = useMemo(() => {
    const nk = (v:any)=>String(v??"").trim().replace(/[^\d]/g,"");
    const toN=(v:any)=>Number(v)||0;
    const mul=(s:any)=>{ const m=/^(\d+)\s*[x×X]\s*\d+/.exec(String(s??"").trim()); return m?Math.max(1,Number(m[1])):1; };

    let ready = 0, shortage = 0, noFG = 0, total = 0;

    for (const r of (Array.isArray(so)?so:[])) {
      total++;
      const m = mul(r.pack_size);
      const plannedBags = toN(r.bags);
      const planned = plannedBags * m;

      const packedBags = (Array.isArray(fg)?fg:[])
        .filter((x)=> nk(x.sales_order_no)===nk(r.sales_order) && nk(x.sales_order_item_no)===nk(r.item_number))
        .reduce((s,x)=> s + toN(x.quantity_packed), 0);

      if (packedBags === 0) noFG++;

      const packed = packedBags * m;
      const bal = planned - packed;
      if (bal <= 0) ready++; else shortage++;
    }

    return { total, ready, shortage, noFG };
  }, [so, fg, mr]);

  const Card = ({ title, value, hint }: any) => (
    <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card-bg))]
                    px-4 py-3 shadow-[var(--shadow-sm)]">
      <div className="text-[12px] font-bold text-[rgb(var(--lynch))]">{title}</div>
      <div className="mt-1 text-[24px] font-extrabold text-[rgb(var(--text))]">{value}</div>
      {hint && <div className="mt-1 text-[12px] text-[rgb(var(--bayoux))]">{hint}</div>}
    </div>
  );

  return (
    <div className="p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[20px] font-extrabold text-[rgb(var(--primary))]">Dashboard</h1>
        <Link
          href="/app/sales-order-wise-data"
          className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card-bg))]
                     px-4 py-2 text-[13px] font-bold hover:bg-[rgb(var(--hover-bg))]"
        >
          Open SO Wise View →
        </Link>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <Card title="Total SO Lines" value={stats.total} />
        <Card title="Ready (Packed ≥ Planned)" value={stats.ready} />
        <Card title="Shortage (Pending)" value={stats.shortage} />
        <Card title="No FG Entry" value={stats.noFG} hint="Packed bags = 0" />
      </div>
    </div>
  );
}
