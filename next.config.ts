import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {},
  turbopack: {
    root: __dirname,
  },

  redirects: async () => [
    {
      source: "/",
      destination: "/app",
      permanent: false,
    },
    {
      source: "/dashboard",
      destination: "/dashboard/sales-order/create-sales-order",
      permanent: false,
    },
  ],

};

export default nextConfig;
