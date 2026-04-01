import { configureStore } from "@reduxjs/toolkit";
import masterDataReducer from "./slices/masterDataSlice";
import materialReceivedReducer from "./slices/materialReceivedSlice";
import salesOrderReducer from "./slices/salesOrderSlice";
import finishedGoodsReducer from "./slices/finishedGoodsSlice";

export const store = configureStore({
  reducer: {
    masterData: masterDataReducer,
    materialReceived: materialReceivedReducer,
    salesOrder: salesOrderReducer,
    finishedGoods: finishedGoodsReducer,
  },
  devTools: process.env.NODE_ENV !== "production",
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
