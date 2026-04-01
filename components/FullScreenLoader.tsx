// components/FullScreenLoader.tsx
"use client";

import React from "react";

type Props = {
  text?: string;
};

export default function FullScreenLoader({ text = "Loading…" }: Props) {
  return (
    <div className="fixed inset-0 z-[9999] grid place-items-center bg-white/80 backdrop-blur-sm dark:bg-slate-950/80">
      <div className="flex flex-col items-center gap-4">
        {/* Spinner */}
        <div className="relative h-14 w-14">
          {/* track */}
          <div className="absolute inset-0 rounded-full border-4 border-black/10 dark:border-white/15" />
          {/* spinner */}
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-black animate-spin dark:border-t-white" />
        </div>

        {/* Text */}
        <div className="text-sm font-medium text-black/80 dark:text-white/85">
          {text}
          <span className="inline-flex w-6 justify-start">
            <span className="animate-pulse">.</span>
            <span className="animate-pulse [animation-delay:150ms]">.</span>
            <span className="animate-pulse [animation-delay:300ms]">.</span>
          </span>
        </div>
      </div>
    </div>
  );
}
