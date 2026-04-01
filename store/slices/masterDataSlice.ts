import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { MasterItem } from "@/types";

type State = {
  data: MasterItem[];
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

export const fetchMasterData = createAsyncThunk<MasterItem[]>(
  "masterData/fetch",
  async () => {
    const res = await fetch("/api/master-data", { cache: "no-store" });
    if (!res.ok) throw new Error(`master-data failed (${res.status})`);
    const json = await res.json();
    if (!Array.isArray(json)) return [];
    return json as MasterItem[];
  }
);

const slice = createSlice({
  name: "masterData",
  initialState,
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchMasterData.pending, (s) => {
      s.loading = true;
      s.error = null;
    });
    b.addCase(fetchMasterData.fulfilled, (s, a) => {
      s.loading = false;
      s.data = a.payload ?? [];
      s.lastFetchedAt = Date.now();
    });
    b.addCase(fetchMasterData.rejected, (s, a) => {
      s.loading = false;
      s.error = a.error?.message ?? "Failed to load master data";
    });
  },
});

export default slice.reducer;
