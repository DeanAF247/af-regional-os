"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Period {
  id: string;
  period_label: string;
  period_date: string;
}

interface PeriodSelectorProps {
  periods: Period[];
  currentLabel: string;
  basePath?: string; // defaults to "/"
}

export default function PeriodSelector({ periods, currentLabel, basePath = "/" }: PeriodSelectorProps) {
  const router      = useRouter();
  const searchParams = useSearchParams();

  const sorted  = [...periods].sort((a, b) => a.period_date.localeCompare(b.period_date));
  const idx     = sorted.findIndex((p) => p.period_label === currentLabel);
  const canPrev = idx > 0;
  const canNext = idx < sorted.length - 1;

  function navigate(label: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", label);
    router.push(`${basePath}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => canPrev && navigate(sorted[idx - 1].period_label)}
        disabled={!canPrev}
        className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#F8FAFC] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
      >
        <ChevronLeft size={16} />
      </button>

      <select
        value={currentLabel}
        onChange={(e) => navigate(e.target.value)}
        className="px-3 py-1.5 bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm font-semibold focus:outline-none focus:border-[#7C3AED] transition-colors cursor-pointer"
      >
        {sorted.map((p) => (
          <option key={p.id} value={p.period_label}>
            {p.period_label}
          </option>
        ))}
      </select>

      <button
        onClick={() => canNext && navigate(sorted[idx + 1].period_label)}
        disabled={!canNext}
        className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#F8FAFC] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
