// types.ts

export type MasterItem = {
  item_code: string;
  description: string;
  hsn_code?: string;
  pack_size?: string;
  pack_type?: string;
  unit?: string;
  brand?: string;
  design_type?: string;
  avg_monthly_consumption_normal?: string;
  avg_daily_consumption_peak?: string;
  avg_monthly_consumption_off?: string;
  lead_time?: string;
  safety_factor?: string;
  season?: string;
  max_level?: string | number;
  plant_name?: string;
};

export type MaterialReceivedRow = {
  row_id: string;
  indent_no?: string;
  indent_ino?: string;
  po_no?: string;
  plant_name?: string;

  s7_act?: string;       // "2026-02-13 15:57:06"
  created_at?: string;   // "2026-02-13 15:57:06"
  bill_date?: string;    // "2026-02-09"
  unloading_date?: string;

  item_code: string;

  qty_act?: string | number; // "1130"
  qty_as_per_bill?: string | number;

  per_bag_wt?: string | number;
  tot_gross_wt?: string | number;

  qc_pack_key?: string;
  qc_json?: string;

  bill_no?: string;
  bill_copy_urls?: string;
  bill_amount?: string | number;

  checked_by?: string;
  remarks?: string;

  vehicle_no?: string;

  item_front_image_urls?: string;
  item_back_image_urls?: string;

  updated_at?: string;
};

export type AggregatedStock = {
  item_code: string;
  unplanned_stock_qty: number;
  planned_stock_qty: number; // (future-ready) right now 0
  plant_name: string;
  latestDate: Date | null;
  age: string; // days as string
};

export type LiveStockRow = MasterItem & {
  unplanned_stock_qty: number;
  planned_req_qty: number;
  planned_stock_qty: number;
  plant_name: string;
  age: string;
};

export type SalesOrderRow = {
  sales_order: string;
  item_number: string;
  timestamp?: string;

  bags?: string | number;
  plant?: string;
  pack_size?: string; // e.g. "4×10 KG" / "1×50 KG"
  pack_type?: string;
  packing?: string;

  item_code?: string;
  inner_code?: string;
  outer_code?: string;

  brand?: string;
  description?: string;
  buyer?: string;
  quality?: string;
  rice_category?: string;
  shipment_month?: string;

  // keep rest as optional string-any
  [k: string]: any;
};

export type FinishedGoodsRow = {
  timestamp?: string; // "13/02/2026 14:34:52"
  sales_order_no: string;
  sales_order_item_no: string;

  quantity_packed?: string | number;

  select_plant_name?: string;
  packing_size?: string;
  packing_type?: string;

  item_code?: string;
  inner_code?: string;
  outer_code?: string;

  [k: string]: any;
};

// Aggregations
export type CodeStock = {
  code: string;
  receivedQty: number; // from material-received
};

export type SOComputedLine = {
  sales_order: string;
  item_number: string;

  pack_size: string;
  multiplier: number;

  item_code: string;
  inner_code: string;
  outer_code: string;

  planned_bags: number;
  planned_item_qty: number;
  planned_inner_qty: number;
  planned_outer_qty: number;

  packed_bags: number; // from finished goods
  packed_item_qty: number;
  packed_inner_qty: number;
  packed_outer_qty: number;

  balance_item_qty: number;
  balance_inner_qty: number;
  balance_outer_qty: number;

  // optional inventory view from material-received
  mr_item_qty: number;
  mr_inner_qty: number;
  mr_outer_qty: number;

  mr_balance_item: number;  // mr - packed (consumed)
  mr_balance_inner: number;
  mr_balance_outer: number;
};
