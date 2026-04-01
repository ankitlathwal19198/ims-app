import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { SalesOrderRow } from "@/types";

type State = {
  data: SalesOrderRow[];
  loading: boolean;
  error: string | null;
  lastFetchedAt: number | null;
};

const initialState: State = {
  data: [],
  loading: false,
  error: null,
  lastFetchedAt: null,
};

export const fetchSalesOrder = createAsyncThunk<SalesOrderRow[]>(
  "salesOrder/fetch",
  async () => {
    const res = await fetch("/api/sales-order", { cache: "no-store" });
    if (!res.ok) throw new Error(`sales-order failed (${res.status})`);
    const json = await res.json();
    // support both: [] or {data:[]}
    const arr = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
    return arr as SalesOrderRow[];
  }
);

const slice = createSlice({
  name: "salesOrder",
  initialState,
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchSalesOrder.pending, (s) => { s.loading = true; s.error = null; });
    b.addCase(fetchSalesOrder.fulfilled, (s, a) => {
      s.loading = false; s.data = a.payload ?? []; s.lastFetchedAt = Date.now();
    });
    b.addCase(fetchSalesOrder.rejected, (s, a) => {
      s.loading = false; s.error = a.error?.message ?? "Failed to load sales orders";
    });
  },
});

export default slice.reducer;
