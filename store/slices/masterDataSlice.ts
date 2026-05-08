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

export const addMasterItem = createAsyncThunk<MasterItem, any>(
  "masterData/add",
  async (item) => {
    const res = await fetch("/api/master-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [item] }),
    });
    if (!res.ok) throw new Error(`Failed to save item (${res.status})`);
    return item as MasterItem;
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
    b.addCase(addMasterItem.pending, (s) => {
      s.loading = true;
      s.error = null;
    });
    b.addCase(addMasterItem.fulfilled, (s, a) => {
      s.loading = false;
      s.data = [a.payload, ...s.data];
    });
    b.addCase(addMasterItem.rejected, (s, a) => {
      s.loading = false;
      s.error = a.error?.message ?? "Failed to save item";
    });
  },
});

export default slice.reducer;
