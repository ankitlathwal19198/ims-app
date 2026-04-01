"use client";

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

import { fetchMasterData } from "@/store/slices/masterDataSlice";
import { fetchMaterialReceived } from "@/store/slices/materialReceivedSlice";
import { fetchSalesOrder } from "@/store/slices/salesOrderSlice";
import { fetchFinishedGoods } from "@/store/slices/finishedGoodsSlice";

export default function GlobalDataLoader() {
  const dispatch = useAppDispatch();

  // Master Data
  const masterLoading = useAppSelector((s) => s.masterData.loading);
  const masterLastFetched = useAppSelector((s) => s.masterData.lastFetchedAt);

  // Material Received
  const receivedLoading = useAppSelector((s) => s.materialReceived.loading);
  const receivedLastFetched = useAppSelector((s) => s.materialReceived.lastFetchedAt);

  // Sales Order
  const soLoading = useAppSelector((s) => s.salesOrder.loading);
  const soLastFetched = useAppSelector((s) => s.salesOrder.lastFetchedAt);

  // Finished Goods
  const fgLoading = useAppSelector((s) => s.finishedGoods.loading);
  const fgLastFetched = useAppSelector((s) => s.finishedGoods.lastFetchedAt);

  useEffect(() => {
    // master
    if (!masterLoading && masterLastFetched === null) {
      dispatch(fetchMasterData() as any);
    }

    // material received
    if (!receivedLoading && receivedLastFetched === null) {
      dispatch(fetchMaterialReceived() as any);
    }

    // sales order
    if (!soLoading && soLastFetched === null) {
      dispatch(fetchSalesOrder() as any);
    }

    // finished goods
    if (!fgLoading && fgLastFetched === null) {
      dispatch(fetchFinishedGoods() as any);
    }
  }, [
    dispatch,
    masterLoading,
    masterLastFetched,
    receivedLoading,
    receivedLastFetched,
    soLoading,
    soLastFetched,
    fgLoading,
    fgLastFetched,
  ]);

  return null;
}
