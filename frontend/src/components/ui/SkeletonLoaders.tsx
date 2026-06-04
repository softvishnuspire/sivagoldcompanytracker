"use client";

import React from "react";

// Generic Pulse Wrapper
function PulseContainer({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`animate-pulse ${className}`}>{children}</div>;
}

// Card Skeleton
export function CardSkeleton({ count = 1 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, idx) => (
        <PulseContainer
          key={idx}
          className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div className="h-4 w-24 rounded bg-slate-200" />
            <div className="h-8 w-8 rounded-lg bg-amber-100" />
          </div>
          <div className="mt-4">
            <div className="h-8 w-32 rounded bg-slate-300" />
            <div className="mt-2 h-3 w-48 rounded bg-slate-200" />
          </div>
        </PulseContainer>
      ))}
    </>
  );
}

// Table Skeleton
export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <PulseContainer className="w-full overflow-hidden rounded-lg border border-slate-200/80 bg-white">
      <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
        <div className="flex gap-4">
          {Array.from({ length: cols }).map((_, idx) => (
            <div key={idx} className="h-4 flex-1 rounded bg-slate-300" />
          ))}
        </div>
      </div>
      <div className="divide-y divide-slate-100 px-6">
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div key={rowIdx} className="flex gap-4 py-4">
            {Array.from({ length: cols }).map((_, colIdx) => (
              <div key={colIdx} className="h-4 flex-1 rounded bg-slate-200" />
            ))}
          </div>
        ))}
      </div>
    </PulseContainer>
  );
}

// Line Chart Skeleton (Revenue Trend)
export function LineChartSkeleton() {
  return (
    <PulseContainer className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-4 w-36 rounded bg-slate-300 mb-2" />
          <div className="h-3 w-48 rounded bg-slate-200" />
        </div>
        <div className="flex gap-2">
          <div className="h-3 w-12 rounded bg-slate-200" />
          <div className="h-3 w-12 rounded bg-slate-200" />
        </div>
      </div>
      <div className="relative h-60 w-full flex items-end">
        {/* SVG Curve placeholder */}
        <svg className="absolute inset-0 h-full w-full" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M 0 200 Q 50 150 100 180 T 200 100 T 300 120 T 400 40 T 500 80"
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="4"
          />
          <path
            d="M 0 200 Q 50 150 100 180 T 200 100 T 300 120 T 400 40 T 500 80 L 500 240 L 0 240 Z"
            fill="#f8fafc"
          />
        </svg>
        {/* X axis line */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-slate-200" />
        {/* Grids / Labels */}
        <div className="w-full flex justify-between pt-2">
          <div className="h-3 w-8 rounded bg-slate-200" />
          <div className="h-3 w-8 rounded bg-slate-200" />
          <div className="h-3 w-8 rounded bg-slate-200" />
          <div className="h-3 w-8 rounded bg-slate-200" />
          <div className="h-3 w-8 rounded bg-slate-200" />
        </div>
      </div>
    </PulseContainer>
  );
}

// Donut Chart Skeleton (Lead Sources)
export function DonutChartSkeleton() {
  return (
    <PulseContainer className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm flex flex-col items-center">
      <div className="w-full self-start">
        <div className="h-4 w-32 rounded bg-slate-300 mb-2" />
        <div className="h-3 w-24 rounded bg-slate-200" />
      </div>
      <div className="relative my-8 h-40 w-40 flex items-center justify-center">
        {/* Radial Circle */}
        <svg className="h-full w-full -rotate-90">
          <circle
            cx="80"
            cy="80"
            r="60"
            className="stroke-slate-200"
            strokeWidth="20"
            fill="transparent"
          />
          <circle
            cx="80"
            cy="80"
            r="60"
            className="stroke-slate-300"
            strokeWidth="20"
            strokeDasharray="376"
            strokeDashoffset="120"
            fill="transparent"
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <div className="h-6 w-16 rounded bg-slate-300" />
          <div className="h-3 w-10 mt-1 rounded bg-slate-200" />
        </div>
      </div>
      {/* Legend */}
      <div className="w-full grid grid-cols-2 gap-3 mt-2">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-slate-300" />
          <div className="h-3 w-16 rounded bg-slate-200" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-slate-300" />
          <div className="h-3 w-16 rounded bg-slate-200" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-slate-300" />
          <div className="h-3 w-16 rounded bg-slate-200" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-slate-300" />
          <div className="h-3 w-16 rounded bg-slate-200" />
        </div>
      </div>
    </PulseContainer>
  );
}

// Funnel Chart Skeleton (Business Funnel)
export function FunnelChartSkeleton() {
  return (
    <PulseContainer className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
      <div className="h-4 w-36 rounded bg-slate-300 mb-6" />
      <div className="flex flex-col items-center gap-3">
        {/* Tier 1 */}
        <div className="h-10 w-full rounded bg-slate-300 flex items-center justify-center text-xs font-semibold text-slate-400">
          <div className="h-4 w-28 rounded bg-slate-400/30" />
        </div>
        {/* Tier 2 */}
        <div className="h-10 w-[80%] rounded bg-slate-250 bg-slate-200 flex items-center justify-center">
          <div className="h-4 w-24 rounded bg-slate-300/40" />
        </div>
        {/* Tier 3 */}
        <div className="h-10 w-[60%] rounded bg-slate-200 flex items-center justify-center">
          <div className="h-4 w-20 rounded bg-slate-300/40" />
        </div>
        {/* Tier 4 */}
        <div className="h-10 w-[40%] rounded bg-slate-150 bg-slate-100 flex items-center justify-center">
          <div className="h-4 w-16 rounded bg-slate-200/40" />
        </div>
      </div>
    </PulseContainer>
  );
}
