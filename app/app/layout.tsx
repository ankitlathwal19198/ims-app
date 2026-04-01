import React from 'react';
// import { getGlobalData } from '@/lib/server/globalData';
// import ReduxHydrator from '@/components/ReduxHydrator';
import DashboardShell from '@/components/DashboardShell';
import ReduxProvider from "@/store/Provider";
import GlobalDataLoader from '@/components/GlobalDataLoader';

export const runtime = "nodejs";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {

  console.log("DashboardLayout rendering (server)");

  // const preloaded = await getGlobalData();

  // console.log("PRELOADED KEYS:", Object.keys(preloaded));
  // console.log("PRELOADED salesOrders:", preloaded.salesOrders?.length);

  return (
    // <ReduxHydrator preloaded={preloaded}>

    <DashboardShell>
      <ReduxProvider>
        <GlobalDataLoader />
        {children}
      </ReduxProvider>
    </DashboardShell>
    // </ReduxHydrator>
  );
}
