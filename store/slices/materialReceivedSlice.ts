import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { MaterialReceivedRow } from "@/types";

type State = {
  data: MaterialReceivedRow[];
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

export const fetchMaterialReceived = createAsyncThunk<MaterialReceivedRow[]>(
  "materialReceived/fetch",
  async () => {
    const res = await fetch("/api/material-received", { cache: "no-store" });
    if (!res.ok) throw new Error(`material-received failed (${res.status})`);
    const json = await res.json();
    if (!Array.isArray(json)) return [];
    return json as MaterialReceivedRow[];
  }
);

const slice = createSlice({
  name: "materialReceived",
  initialState,
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchMaterialReceived.pending, (s) => {
      s.loading = true;
      s.error = null;
    });
    b.addCase(fetchMaterialReceived.fulfilled, (s, a) => {
      s.loading = false;
      s.data = a.payload ?? [];
      s.lastFetchedAt = Date.now();
    });
    b.addCase(fetchMaterialReceived.rejected, (s, a) => {
      s.loading = false;
      s.error = a.error?.message ?? "Failed to load material received";
    });
  },
});

export default slice.reducer;
