import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { FinishedGoodsRow } from "@/types";

type State = {
  data: FinishedGoodsRow[];
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

export const fetchFinishedGoods = createAsyncThunk<FinishedGoodsRow[]>(
  "finishedGoods/fetch",
  async () => {
    const res = await fetch("/api/finished-goods", { cache: "no-store" });
    if (!res.ok) throw new Error(`finished-goods failed (${res.status})`);
    const json = await res.json();
    const arr = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
    return arr as FinishedGoodsRow[];
  }
);

const slice = createSlice({
  name: "finishedGoods",
  initialState,
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchFinishedGoods.pending, (s) => { s.loading = true; s.error = null; });
    b.addCase(fetchFinishedGoods.fulfilled, (s, a) => {
      s.loading = false; s.data = a.payload ?? []; s.lastFetchedAt = Date.now();
    });
    b.addCase(fetchFinishedGoods.rejected, (s, a) => {
      s.loading = false; s.error = a.error?.message ?? "Failed to load finished goods";
    });
  },
});

export default slice.reducer;
